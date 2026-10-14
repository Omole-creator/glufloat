import { NextResponse } from "next/server";
import { parseReading } from "@/lib/glucose";
import { TARGET_MAX, TARGET_MIN, validTarget } from "@/lib/safetyFlag";
import { newToken, restoreCarried, seatsUsed, staffContext, type PatientRow } from "@/lib/hospitalServer";
import { normalizePhone } from "@/lib/phone";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import { extendAccess, isPractice } from "@/lib/hospitalPlans";
import { practiceRuleFoodIds } from "@/lib/nextMeal";

const RULE_FOODS = new Set(practiceRuleFoodIds());
const NOTE_MAX = 300;
const RULES_MAX = 30;

export const dynamic = "force-dynamic";

const MAX_AT_ONCE = 500;

/**
 * Add patients (one, or many pasted at once). Hospital admins only.
 *
 * A patient added here has no account yet: they are 'invited', with their own
 * link, until they join on their phone. The admin must tick "These patients
 * agreed to join" (founder's decision: the hospital tells its patients; the
 * tick records that it did).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await staffContext(String(body.hid ?? "") || null);
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (ctx.staff.role !== "admin") return NextResponse.json({ error: "Only the hospital admin can add patients." }, { status: 403 });
  if (body.confirmed !== true)
    return NextResponse.json({ error: "Please tick the box to say these patients agreed to join." }, { status: 400 });

  const list = (Array.isArray(body.patients) ? body.patients : []).slice(0, MAX_AT_ONCE) as {
    name?: string;
    phone?: string;
    email?: string;
  }[];
  if (list.length === 0) return NextResponse.json({ error: "Add at least one patient." }, { status: 400 });

  const added: string[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    const name = String(p.name ?? "").trim().slice(0, 120);
    const phone = normalizePhone(String(p.phone ?? ""));
    const emailRaw = String(p.email ?? "").trim().toLowerCase();
    const email = emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) && !isPhoneLoginEmail(emailRaw) ? emailRaw : null;
    if (!name) {
      skipped.push({ name: phone || "(no name)", reason: "No name" });
      continue;
    }
    if (phone.length < 10) {
      skipped.push({ name, reason: "Phone number is not complete" });
      continue;
    }
    if (seen.has(phone)) {
      skipped.push({ name, reason: "Same phone number twice in this list" });
      continue;
    }
    seen.add(phone);
    const { error } = await ctx.admin.from("hospital_patients").insert({
      hospital_id: ctx.hospital.id,
      name,
      phone,
      email,
      status: "invited",
      invite_token: newToken(),
      confirmed: true,
      added_by: ctx.user.id,
    });
    if (error) {
      skipped.push({
        name,
        reason: /duplicate|unique/i.test(error.message) ? "Already on your list" : "Could not be added",
      });
    } else added.push(name);
  }
  return NextResponse.json({ ok: true, added: added.length, skipped });
}

/**
 * Change one patient: remove them, move them in from the waiting list, or set
 * a new password for a patient who logs in with their phone and forgot it.
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await staffContext(String(body.hid ?? "") || null);
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const id = String(body.id ?? "");
  const { data } = await ctx.admin
    .from("hospital_patients")
    .select("*")
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "We could not find this patient." }, { status: 404 });
  const p = data as PatientRow;
  const action = String(body.action ?? "");

  // Clinical actions any doctor, dietitian or admin at the hospital may take
  // (clinician-flags-schema.sql, #29). Everything below them is admin-only.
  if (action === "target" || action === "seen") {
    if (p.status !== "active") return NextResponse.json({ error: "This patient is not using one of your places." }, { status: 409 });
    let update: Record<string, unknown>;
    if (action === "target") {
      // Empty = back to the default. A number may be typed in mg/dL or mmol/L.
      const raw = String(body.target ?? "").trim();
      const parsed = raw ? parseReading(raw) : null;
      const mgdl = parsed ? Math.round(parsed.mgdl) : null;
      if (raw && (mgdl === null || validTarget(mgdl) === null)) {
        return NextResponse.json({ error: `Type a number between ${TARGET_MIN} and ${TARGET_MAX} mg/dL (4.4 to 13.9 mmol/L).` }, { status: 400 });
      }
      update = { before_target_mgdl: mgdl };
    } else {
      update = { safety_seen_at: new Date().toISOString(), safety_seen_by: ctx.staff.name };
    }
    const { error } = await ctx.admin.from("hospital_patients").update(update).eq("id", p.id);
    if (error) return NextResponse.json({ error: "This is not ready yet. Please try again later." }, { status: 503 });
    return NextResponse.json({ ok: true, ...update });
  }

  if (ctx.staff.role !== "admin") return NextResponse.json({ error: "Only the hospital admin can do this." }, { status: 403 });

  // A dietitian's note and food rules for this patient (GluFloat for
  // dietitians, supabase/practice-rules-schema.sql). Only real foods the
  // blue card or the extras can serve are kept; a food cannot be both left
  // out and eaten more (left out wins).
  if (action === "rules") {
    if (!isPractice(ctx.hospital)) return NextResponse.json({ error: "This is for dietitians." }, { status: 403 });
    const clean = (v: unknown) =>
      [...new Set((Array.isArray(v) ? v : []).map(String).filter((id) => RULE_FOODS.has(id)))].slice(0, RULES_MAX);
    const avoid = clean(body.avoid);
    const prefer = clean(body.prefer).filter((id) => !avoid.includes(id));
    const note = String(body.note ?? "").trim().slice(0, NOTE_MAX) || null;
    const { error } = await ctx.admin
      .from("hospital_patients")
      .update({ dietitian_note: note, avoid_food_ids: avoid, prefer_food_ids: prefer, rules_updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) return NextResponse.json({ error: "This is not ready yet. Please try again later." }, { status: 503 });
    return NextResponse.json({ ok: true, note, avoid, prefer });
  }

  if (action === "remove") {
    await ctx.admin
      .from("hospital_patients")
      .update({ status: "removed", removed_at: new Date().toISOString(), invite_token: null })
      .eq("id", p.id);
    await restoreCarried(ctx.admin, p);
    return NextResponse.json({ ok: true });
  }

  if (action === "activate") {
    if (p.status !== "waiting") return NextResponse.json({ error: "This patient is not waiting." }, { status: 400 });
    if ((await seatsUsed(ctx.admin, ctx.hospital.id)) >= ctx.hospital.seats)
      return NextResponse.json({ error: "Every place on your plan is in use. Remove a patient, or ask GluFloat for a bigger plan." }, { status: 409 });
    await ctx.admin.from("hospital_patients").update({ status: "active" }).eq("id", p.id);
    // Their 30 days start now (patient-paid-schema.sql); its own write, so a
    // database without the column still gives the place.
    if (!p.paid_until) await ctx.admin.from("hospital_patients").update({ paid_until: new Date(Date.now() + 30 * 86400000).toISOString() }).eq("id", p.id);
    return NextResponse.json({ ok: true });
  }

  // The patient paid their dietitian or hospital (outside GluFloat). Months
  // are added after whatever time is left. A paused patient is resumed, if a
  // place is free.
  // Founder's rules (2026-10-13), so a pause can never make free days:
  //  - pause FREEZES the countdown: the time left is saved (paused_left_ms);
  //  - unpause gives back exactly that saved time, no more, however many
  //    times it happens;
  //  - recording a payment adds exactly the months paid, on top of the time
  //    left (the saved time, for a paused patient), and unpauses them.
  const freePlace = async () => (await seatsUsed(ctx.admin, ctx.hospital.id)) < ctx.hospital.seats;
  const FULL = "Every place on your plan is in use. Pause or remove a patient first, or choose a bigger plan.";
  /** Time left on a paused patient's countdown, frozen at the moment of the pause. */
  const savedMs = () =>
    p.paused_left_ms != null ? Math.max(0, Number(p.paused_left_ms)) : p.paid_until ? Math.max(0, new Date(p.paid_until).getTime() - Date.now()) : 0;

  if (action === "paid") {
    const months = Number(body.months);
    if (![1, 3, 6, 12].includes(months)) return NextResponse.json({ error: "Choose 1, 3, 6 or 12 months." }, { status: 400 });
    if (p.status !== "active" && p.status !== "paused") return NextResponse.json({ error: "This patient is not using a place." }, { status: 400 });
    if (p.status === "paused" && !(await freePlace())) return NextResponse.json({ error: FULL }, { status: 409 });
    // Active: after the time left (or from today if overdue). Paused: after the saved time.
    const from = p.status === "paused" ? new Date(Date.now() + savedMs()).toISOString() : (p.paid_until ?? null);
    const until = extendAccess(from, months);
    const { error } = await ctx.admin
      .from("hospital_patients")
      .update({ paid_until: until.toISOString(), status: "active", paused_left_ms: null })
      .eq("id", p.id);
    if (error) return NextResponse.json({ error: "This is not ready yet. Please try again later." }, { status: 503 });
    return NextResponse.json({ ok: true, paidUntil: until.toISOString() });
  }

  // Could not renew yet, or paused by mistake: kept on the list (notes,
  // rules, history), not covered, not using a place, the countdown frozen.
  // Any paid days of their own come back to them.
  if (action === "pause") {
    if (p.status !== "active") return NextResponse.json({ error: "Only a patient using GluFloat can be paused." }, { status: 400 });
    const left = p.paid_until ? Math.max(0, new Date(p.paid_until).getTime() - Date.now()) : 0;
    const { error } = await ctx.admin.from("hospital_patients").update({ status: "paused", paused_left_ms: left }).eq("id", p.id);
    if (error) return NextResponse.json({ error: "This is not ready yet. Please try again later." }, { status: 503 });
    await restoreCarried(ctx.admin, p);
    return NextResponse.json({ ok: true });
  }

  // Unpause with no payment: exactly the time that was left when paused.
  // A patient paused because payment was due comes back still due.
  if (action === "unpause") {
    if (p.status !== "paused") return NextResponse.json({ error: "This patient is not paused." }, { status: 400 });
    if (!(await freePlace())) return NextResponse.json({ error: FULL }, { status: 409 });
    const until = new Date(Date.now() + savedMs());
    const { error } = await ctx.admin
      .from("hospital_patients")
      .update({ status: "active", paid_until: until.toISOString(), paused_left_ms: null })
      .eq("id", p.id);
    if (error) return NextResponse.json({ error: "This is not ready yet. Please try again later." }, { status: 503 });
    return NextResponse.json({ ok: true, paidUntil: until.toISOString() });
  }

  if (action === "reset_password") {
    const password = String(body.password ?? "");
    if (password.length < 6) return NextResponse.json({ error: "The new password needs 6 or more letters or numbers." }, { status: 400 });
    if (!p.user_id || p.status === "removed") return NextResponse.json({ error: "This patient has not joined yet." }, { status: 400 });
    const { data: u } = await ctx.admin.auth.admin.getUserById(p.user_id);
    // Only phone-login accounts. A patient with their own email resets it
    // themselves; a hospital must never be able to take over a personal account.
    if (!isPhoneLoginEmail(u.user?.email))
      return NextResponse.json({ error: "This patient logs in with their email. They can use “Forgot your password?” on the login page." }, { status: 400 });
    const { error } = await ctx.admin.auth.admin.updateUserById(p.user_id, { password });
    if (error) return NextResponse.json({ error: "We could not change it just now. Please try again." }, { status: 503 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
