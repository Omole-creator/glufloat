"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Phone, Pill, Scale, Send, UserRound, Droplet } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import MonthReport, { type ReportViewer } from "@/components/MonthReport";
import SugarTrend from "@/components/SugarTrend";
import { watMonth, type PatientProfile } from "@/lib/patientRecord";
import type { Hba1c } from "@/lib/hba1c";
import { formatBoth, formatMgdl, type Reading } from "@/lib/glucose";
import { ACTIVITY_LABEL, CONDITION_LABEL, bmi, bmiCategory, type ActivityLevel, type Condition } from "@/lib/tdee";
import { GOAL_LABEL, type Goal } from "@/lib/personalization";
import { MED_TYPE_OPTIONS } from "@/lib/personalizationProfile";

const BMI_WORD = { underweight: "Underweight", normal: "Healthy weight", overweight: "Overweight", obese: "Obese" } as const;
const MED_TIME = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as Record<string, string>;

function monthKey(d: Date): string {
  const wat = new Date(d.getTime() + 3600000);
  return `${wat.getUTCFullYear()}-${String(wat.getUTCMonth() + 1).padStart(2, "0")}`;
}
function shiftMonth(ym: string, by: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}
function niceDate(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Everything a doctor or dietitian needs to judge one patient, on one page:
 * who they are (age, weight, conditions, medicine), their sugar tests over the
 * last 90 days, HbA1c and weight over time, and the month report the patient
 * hands over themselves, read-only. Numbers are shown as they are: the
 * clinician judges, GluFloat does not.
 */
export default function PatientDetail({
  patientId,
  hid,
  name,
  phone,
  whatsapp,
  profile,
  hba1cs,
  weights,
  weightLine,
  readings,
  colleagues,
}: {
  patientId: string;
  hid: string | null;
  name: string;
  phone: string;
  whatsapp: string | null;
  profile: PatientProfile;
  hba1cs: Hba1c[];
  weights: { kg: number; at: string }[];
  weightLine: string | null;
  readings: Reading[];
  colleagues: { name: string; role: string; whatsapp: string }[];
}) {
  const thisMonth = monthKey(new Date());
  const [ym, setYm] = useState(thisMonth);

  const viewer: ReportViewer = useMemo(
    () => ({
      name,
      // The same Nigerian-time rule the server uses: "1 to 12 October 2026".
      period: watMonth(ym).label,
      monthLabel: monthLabel(ym),
      key: ym,
      load: async () => {
        const qs = new URLSearchParams({ month: ym });
        if (hid) qs.set("hid", hid);
        const res = await fetch(`/api/hospital/patients/${patientId}/report?${qs}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        return {
          items: res.ok ? j.items ?? [] : [],
          loose: res.ok ? j.loose ?? [] : [],
          hba1c: res.ok ? j.hba1c ?? null : null,
          weightLine: res.ok ? j.weightLine ?? null : null,
        };
      },
    }),
    [ym, hid, name, patientId],
  );

  const b = profile.weightKg && profile.heightCm ? bmi(profile.weightKg, profile.heightCm) : null;
  const stats = useMemo(() => {
    if (readings.length === 0) return null;
    const v = readings.map((r) => r.mgdl);
    const avg = v.reduce((a, x) => a + x, 0) / v.length;
    return { n: v.length, avg, low: Math.min(...v), high: Math.max(...v) };
  }, [readings]);

  const medDoses =
    profile.medDosesPerDay === null
      ? "Not given"
      : profile.medDosesPerDay === 0
        ? "Takes no diabetes medicine"
        : `${profile.medDosesPerDay} ${profile.medDosesPerDay === 1 ? "time" : "times"} a day`;
  const medTypes = profile.medTypes
    .map((t) => MED_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t)
    .join(", ");

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="text-right font-semibold text-ink">{v}</dd>
    </div>
  );
  const Card = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</span>
        <h2 className="font-display text-base font-bold text-ink">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );

  return (
    <div className="mt-5 space-y-6">
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink hover:border-brand">
          <Phone className="h-4 w-4" /> Call {phone}
        </a>
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:brightness-95"
          >
            WhatsApp {name.split(/\s+/)[0]}
          </a>
        )}
      </div>

      {colleagues.length > 0 && (
        <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5">
          <h2 className="font-display text-base font-bold text-ink">Pass this patient to a colleague</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Think a dietitian or doctor should see {name.split(/\s+/)[0]}? Send them this record on WhatsApp.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {colleagues.map((c) => (
              <a
                key={c.whatsapp + c.name}
                href={`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(
                  `Hello ${c.name}, please look at ${name}'s record on GluFloat. I think you can help them.
${SITE_URL}/hospital/patients/${patientId}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink hover:border-[#25D366]"
              >
                <Send className="h-4 w-4 text-[#1DA851]" />
                {c.name}
                <span className="font-normal text-ink-soft">({c.role === "doctor" ? "doctor" : "dietitian"})</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="About" icon={<UserRound className="h-4 w-4" />}>
          <dl className="divide-y divide-[#f0f3f7]">
            <Row k="Sex" v={profile.sex ? profile.sex[0].toUpperCase() + profile.sex.slice(1) : "Not given"} />
            <Row k="Age" v={profile.ageYears ? `${profile.ageYears} years` : "Not given"} />
            <Row k="Activity" v={profile.activityLevel ? ACTIVITY_LABEL[profile.activityLevel as ActivityLevel] ?? profile.activityLevel : "Not given"} />
            <Row k="Goals" v={profile.goals.length ? profile.goals.map((g) => GOAL_LABEL[g as Goal] ?? g).join(", ") : "Not given"} />
            <Row
              k="Other conditions"
              v={profile.conditions.length ? profile.conditions.map((c) => CONDITION_LABEL[c as Condition] ?? c).join(", ") : "None given"}
            />
          </dl>
        </Card>

        <Card title="Medicine" icon={<Pill className="h-4 w-4" />}>
          <dl className="divide-y divide-[#f0f3f7]">
            <Row k="How often" v={medDoses} />
            {profile.medDosesPerDay ? (
              <>
                <Row k="When" v={profile.medTimes.length ? profile.medTimes.map((t) => MED_TIME[t] ?? t).join(", ") : "Not given"} />
                <Row
                  k="With food"
                  v={profile.medRelation === "before" ? "Before eating" : profile.medRelation === "after" ? "With or after eating" : "Not given"}
                />
                <Row k="Which" v={medTypes || "Not given"} />
              </>
            ) : null}
          </dl>
        </Card>

        <Card title="Weight" icon={<Scale className="h-4 w-4" />}>
          <dl className="divide-y divide-[#f0f3f7]">
            <Row k="Weight" v={profile.weightKg ? `${profile.weightKg} kg` : "Not given"} />
            <Row k="Height" v={profile.heightCm ? `${profile.heightCm} cm` : "Not given"} />
            <Row k="BMI" v={b ? `${b.toFixed(1)}, ${BMI_WORD[bmiCategory(b)]}` : "Not given"} />
          </dl>
          {weightLine && <p className="mt-3 rounded-xl bg-verdict-yellow/15 px-3 py-2 text-sm text-ink">{weightLine}</p>}
          {weights.length > 1 && (
            <ul className="mt-3 space-y-1 text-xs text-ink-soft">
              {weights.slice(-6).reverse().map((w) => (
                <li key={w.at} className="flex justify-between">
                  <span>{niceDate(w.at)}</span>
                  <span className="font-semibold text-ink">{w.kg} kg</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Droplet className="h-4 w-4" />
            </span>
            <h2 className="font-display text-base font-bold text-ink">Sugar tests, last 90 days</h2>
          </div>
          {hba1cs.length > 0 && (
            <p className="text-sm text-ink">
              HbA1c: <span className="font-bold">{hba1cs[0].percent}%</span>{" "}
              <span className="text-ink-soft">({niceDate(hba1cs[0].testedOn)})</span>
            </p>
          )}
        </div>
        {stats ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Tests", String(stats.n)],
                ["Average", formatMgdl(Math.round(stats.avg))],
                ["Lowest", formatMgdl(stats.low)],
                ["Highest", formatMgdl(stats.high)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-mist/60 px-3 py-2.5">
                  <p className="text-xs text-ink-soft">{k}</p>
                  <p className="font-display text-lg font-bold text-ink">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Every test, before and after meals together. Latest: {formatBoth(readings[readings.length - 1].mgdl)}.
            </p>
            {readings.length >= 2 && (
              <div className="mt-4">
                <SugarTrend points={readings} title="Every sugar test, last 90 days" span="in the last 90 days" />
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">No sugar tests saved in the last 90 days.</p>
        )}
        {hba1cs.length > 1 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/50">Earlier HbA1c</p>
            <ul className="mt-1.5 flex flex-wrap gap-2 text-sm">
              {hba1cs.slice(1, 8).map((h) => (
                <li key={h.id} className="rounded-full bg-mist/70 px-3 py-1 text-ink">
                  <span className="font-semibold">{h.percent}%</span> <span className="text-ink-soft">{niceDate(h.testedOn)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">Month report</h2>
          <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-[#e3e9f1]">
            <button
              onClick={() => setYm((m) => shiftMonth(m, -1))}
              aria-label="Month before"
              className="rounded-full p-1.5 text-ink-soft hover:bg-mist hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-32 text-center text-sm font-bold text-ink">{monthLabel(ym)}</span>
            <button
              onClick={() => setYm((m) => shiftMonth(m, 1))}
              disabled={ym >= thisMonth}
              aria-label="Next month"
              className="rounded-full p-1.5 text-ink-soft hover:bg-mist hover:text-ink disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <MonthReport open onToggle={() => {}} viewer={viewer} />
      </div>
    </div>
  );
}
