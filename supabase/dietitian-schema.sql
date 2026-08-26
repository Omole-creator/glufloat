-- In-house dietitian WhatsApp routing, for the N4,500 "dietitian" tier only.
-- Run once in the Supabase SQL editor, after personalization-schema.sql (see
-- supabase/SETUP.md for the full order).
--
-- Design, and why it is built this way:
--  * Assignment is STICKY per user (first touch wins, same principle as the
--    partner referral cookie): once assigned, a person always reaches the same
--    dietitian, never bounced around on a later message.
--  * Assignment is EVEN, using a real Postgres sequence (`dietitian_rr_seq`).
--    A sequence's nextval() is guaranteed unique and race-free across
--    concurrent callers by Postgres itself — a naive "count existing rows,
--    then insert" would let two people signing up at the same instant both
--    compute the same rotation slot. This is the one place in the whole build
--    where a subtle concurrency bug could silently misassign people, so it
--    gets the strongest guarantee Postgres has, not a hand-rolled count.
--  * Entitlement is checked INSIDE the function, not just in the app's UI. A
--    client-side gate is only a convenience; someone calling the RPC directly
--    without paying must still be refused, exactly like every other
--    money-relevant check in this codebase (never trust the client alone).
--  * Numbers are plug-and-play: all 3 seed rows point at the same placeholder
--    number today. Swapping in the real 2nd and 3rd numbers later is a
--    two-row UPDATE, no code change.

-- 1. The dietitians ------------------------------------------------------------
create table if not exists public.inhouse_dietitians (
  id             uuid primary key default gen_random_uuid(),
  -- Order they were added, and the round-robin's rotation order.
  seq            integer generated always as identity,
  name           text not null,
  whatsapp_number text not null,   -- international form, no leading 0 (e.g. 2348132097317)
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Seed 3 rows. All point at the same placeholder number for now — update
-- whatsapp_number on rows 2 and 3 once the real numbers are known:
--   update public.inhouse_dietitians set whatsapp_number = '234...' where seq = 2;
--   update public.inhouse_dietitians set whatsapp_number = '234...' where seq = 3;
insert into public.inhouse_dietitians (name, whatsapp_number)
select * from (values
  ('Dietitian 1', '2348132097317'),
  ('Dietitian 2', '2348132097317'),
  ('Dietitian 3', '2348132097317')
) as seed(name, whatsapp_number)
where not exists (select 1 from public.inhouse_dietitians);

-- 2. Sticky assignment ---------------------------------------------------------
create table if not exists public.dietitian_assignments (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  dietitian_id uuid not null references public.inhouse_dietitians (id),
  assigned_at  timestamptz not null default now()
);

-- 3. The atomic, entitlement-checked round-robin -------------------------------
create sequence if not exists public.dietitian_rr_seq;

create or replace function public.assign_dietitian(p_user_id uuid)
returns table(dietitian_id uuid, dietitian_name text, whatsapp_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_count       integer;
  v_pos         integer;
  v_dietitian   uuid;
  v_entitled    boolean;
begin
  -- Already assigned: return the existing one, never reassign.
  return query
    select d.id, d.name, d.whatsapp_number
    from public.dietitian_assignments a
    join public.inhouse_dietitians d on d.id = a.dietitian_id
    where a.user_id = p_user_id;
  if found then
    return;
  end if;

  -- Server-side entitlement check. The UI already gates on tier = 'dietitian',
  -- but this function must not trust that: it is the last line of defence
  -- against someone calling it without having paid for the dietitian tier.
  select exists (
    select 1 from public.subscriptions
     where user_id = p_user_id
       and tier = 'dietitian'
       and status in ('active', 'non-renewing')
       and current_period_end > now()
  ) into v_entitled;

  if not v_entitled then
    return; -- empty result; the caller shows nothing rather than an error
  end if;

  select count(*) into v_count from public.inhouse_dietitians where active;
  if v_count = 0 then
    return;
  end if;

  -- nextval() is atomic and unique across concurrent callers by Postgres's own
  -- guarantee, so two people assigned at the same instant cannot collide.
  v_pos := (nextval('public.dietitian_rr_seq') - 1) % v_count;

  select id into v_dietitian
    from public.inhouse_dietitians
   where active
   order by seq
  offset v_pos limit 1;

  insert into public.dietitian_assignments (user_id, dietitian_id)
  values (p_user_id, v_dietitian)
  on conflict (user_id) do nothing;

  return query
    select d.id, d.name, d.whatsapp_number
    from public.dietitian_assignments a
    join public.inhouse_dietitians d on d.id = a.dietitian_id
    where a.user_id = p_user_id;
end;
$$;

revoke all on function public.assign_dietitian(uuid) from public;
grant execute on function public.assign_dietitian(uuid) to authenticated;

-- 4. Row Level Security ---------------------------------------------------------
-- No client policies: every read/write goes through the security-definer
-- function above (same shape as earn_commission in partners-schema.sql), or
-- through the admin service-role key for managing the dietitian list.
alter table public.inhouse_dietitians  enable row level security;
alter table public.dietitian_assignments enable row level security;
