-- Partner-reserved dietitian routing. Run once in the Supabase SQL editor,
-- AFTER dietitian-schema.sql and partners-schema.sql (both already run — see
-- supabase/SETUP.md for the full order). Idempotent: safe to paste again.
--
-- What this does: a partner (dietitian/nurse/etc, identified by their own
-- referral code, e.g. "angela14" -> glufloat.com/r/angela14) can have her own
-- dedicated in-house dietitian, instead of her referred patients landing on
-- whichever of the 3 generic round-robin dietitians comes up next. This is
-- for a person who refers patients into the Dietitian tier (N4,500) and
-- wants THEM routed to a specific dietitian (herself, or a colleague she
-- trusts) rather than a stranger.
--
-- Design:
--  * `inhouse_dietitians.reserved_for_partner_code` (nullable) marks a
--    dietitian as belonging to exactly one partner's referred people. A
--    reserved dietitian is EXCLUDED from the general round-robin pool (the
--    existing 3 generic dietitians are untouched, still round-robin as
--    before) — she is reachable only through that one partner's link.
--  * `assign_dietitian()` is extended, not replaced with new logic: it
--    still does everything it did before (sticky, entitlement-checked,
--    atomic round-robin) for everyone else. The ONE new branch: before
--    falling into the round-robin, it checks whether the caller's own
--    `profiles.partner_id` points at a partner whose `code` matches a
--    reserved dietitian, and if so, assigns that dietitian directly instead.
--  * Same entitlement rule as before, unchanged: still requires an active
--    `subscriptions.tier = 'dietitian'` row, checked server-side inside the
--    function, never trusted from the client. A partner's own referred
--    person who has NOT paid for the dietitian tier gets nothing, exactly
--    like everyone else.

-- 1. The reservation column -----------------------------------------------------
alter table public.inhouse_dietitians
  add column if not exists reserved_for_partner_code text references public.partners (code);

-- 2. Angela's dedicated dietitian (08135602947) ----------------------------------
-- International form, no leading 0 (matches every other whatsapp_number row).
insert into public.inhouse_dietitians (name, whatsapp_number, reserved_for_partner_code)
select 'Dtn Angela Chinele', '2348135602947', 'angela14'
where not exists (
  select 1 from public.inhouse_dietitians where reserved_for_partner_code = 'angela14'
);

-- 3. assign_dietitian(), extended -------------------------------------------------
create or replace function public.assign_dietitian(p_user_id uuid)
returns table(dietitian_id uuid, dietitian_name text, whatsapp_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_count       integer;
  v_pos         integer;
  v_dietitian   uuid;
  v_entitled    boolean;
  v_reserved    uuid;
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

  -- Server-side entitlement check, unchanged: this function is the last line
  -- of defence against someone calling it without having paid for the
  -- dietitian tier, whether or not they came through a partner's link.
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

  -- NEW: if this person came through a partner who has her own reserved
  -- dietitian, route them straight to her instead of the round-robin.
  select d.id into v_reserved
    from public.profiles p
    join public.partners pt on pt.id = p.partner_id
    join public.inhouse_dietitians d
      on d.reserved_for_partner_code = pt.code and d.active
   where p.id = p_user_id;

  if v_reserved is not null then
    insert into public.dietitian_assignments (user_id, dietitian_id)
    values (p_user_id, v_reserved)
    on conflict (user_id) do nothing;

    return query
      select d.id, d.name, d.whatsapp_number
      from public.dietitian_assignments a
      join public.inhouse_dietitians d on d.id = a.dietitian_id
      where a.user_id = p_user_id;
    return;
  end if;

  -- Existing general round-robin, now excluding any partner-reserved
  -- dietitian from the shared pool (she is reachable only through her own
  -- partner's link, never handed to an unrelated person by chance).
  select count(*) into v_count
    from public.inhouse_dietitians
   where active and reserved_for_partner_code is null;
  if v_count = 0 then
    return;
  end if;

  -- nextval() is atomic and unique across concurrent callers by Postgres's own
  -- guarantee, so two people assigned at the same instant cannot collide.
  v_pos := (nextval('public.dietitian_rr_seq') - 1) % v_count;

  select id into v_dietitian
    from public.inhouse_dietitians
   where active and reserved_for_partner_code is null
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

-- 4. One-off: pin demooo@glufloat.com to Angela's dietitian too -----------------
-- A demo/preview account, not a real angela14 referral — this bypasses the
-- entitlement/partner check above on purpose so the founder can preview the
-- exact WhatsApp pairing without needing a real angela14-referred test
-- account. Overrides any assignment that account already has (sticky
-- assignment is a real-subscriber protection; a designated demo account is
-- fine to repoint). Does nothing if that email has no profile yet.
insert into public.dietitian_assignments (user_id, dietitian_id)
select p.id, d.id
  from public.profiles p, public.inhouse_dietitians d
 where p.email = 'demooo@glufloat.com'
   and d.reserved_for_partner_code = 'angela14'
on conflict (user_id) do update set dietitian_id = excluded.dietitian_id;
