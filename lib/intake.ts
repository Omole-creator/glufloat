"use client";

import { createClient } from "@/lib/supabase/client";
import type { Verdict } from "./types";

/**
 * How often a food should be eaten, by its colour (which follows its GI):
 *   green  (low GI)    ~ up to 15 times a week (about twice a day)
 *   yellow (medium GI) ~ 2 to 3 times a week
 *   red    (high GI)   ~ about once a month
 *
 * We watch what each person has actually EATEN (their "I ate this" log) across
 * the day, the week and the month, and warn BEFORE they break the rule, e.g. a
 * high-sugar food in the morning and another in the afternoon. This is a house
 * rule awaiting dietitian sign-off, like the per-food frequency in
 * docs/EVIDENCE.md; it is a safety nudge, never a hard block.
 */
export const WEEKLY_CAP = { green: 15, yellow: 3 } as const;
export const MONTHLY_CAP = { red: 1 } as const;

/** More than this many fast-sugar foods in one week is worth saying out loud. */
export const WEEKLY_RED_LIMIT = 3;

export interface Intake {
  redToday: number;
  redThisWeek: number;
  redThisMonth: number;
  yellowThisWeek: number;
  greenThisWeek: number;
}

const EMPTY: Intake = {
  redToday: 0,
  redThisWeek: 0,
  redThisMonth: 0,
  yellowThisWeek: 0,
  greenThisWeek: 0,
};

/** A date shifted into Nigerian time (WAT, GMT+1) so day/month boundaries match
 *  the rest of the app. Read its UTC fields after the shift. */
function wat(ms: number): Date {
  return new Date(ms + 60 * 60 * 1000);
}
function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/** Count what the person has eaten, by colour, for today / this week / this
 *  month (all in Nigerian time). Empty on any failure. */
export async function getIntake(): Promise<Intake> {
  try {
    const sb = createClient();
    const since = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await sb
      .from("meal_checks")
      .select("verdict,checked_at")
      .gte("checked_at", since);

    const nowWat = wat(Date.now());
    const todayK = dayKey(nowWat);
    const curMonth = nowWat.getUTCMonth();
    const curYear = nowWat.getUTCFullYear();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const out: Intake = { ...EMPTY };
    for (const r of data ?? []) {
      const ms = new Date(r.checked_at as string).getTime();
      const w = wat(ms);
      const isToday = dayKey(w) === todayK;
      const isThisMonth =
        w.getUTCMonth() === curMonth && w.getUTCFullYear() === curYear;
      const isThisWeek = ms >= weekAgo;
      if (r.verdict === "red") {
        if (isToday) out.redToday += 1;
        if (isThisWeek) out.redThisWeek += 1;
        if (isThisMonth) out.redThisMonth += 1;
      } else if (r.verdict === "yellow") {
        if (isThisWeek) out.yellowThisWeek += 1;
      } else if (r.verdict === "green") {
        if (isThisWeek) out.greenThisWeek += 1;
      }
    }
    return out;
  } catch {
    return EMPTY;
  }
}

export interface IntakeWarn {
  level: "red" | "yellow";
  title: string;
  text: string;
}

/**
 * Given what a person has already eaten and the colour of the food they are
 * about to eat, return a warning if it would break the rule. The already-eaten
 * counts do not include this food (they have not eaten it yet), so "redToday >= 1"
 * means "you have ALREADY had one today, and this would be the second".
 */
export function intakeWarning(
  intake: Intake,
  verdict: Verdict,
): IntakeWarn | null {
  if (verdict === "red") {
    if (intake.redToday >= 1) {
      return {
        level: "red",
        title: "Careful: two fast-sugar foods in one day",
        text: "You already ate a food that raises your sugar fast today. Eating another one today can push your sugar too high. Best to skip it.",
      };
    }
    /**
     * The founder's second in-house rule: more than 3 in a week is too many.
     *
     * With the monthly cap at 1 this is usually reached through the same-day
     * rule above first, so it rarely fires on its own today. It is written out
     * anyway, because the monthly number is one of the ones still waiting on a
     * dietitian's signature (docs/EVIDENCE.md §8). If that number loosens, this
     * rule has to already be here, not remembered later.
     */
    if (intake.redThisWeek >= WEEKLY_RED_LIMIT) {
      return {
        level: "red",
        title: `That is ${intake.redThisWeek} fast-sugar foods this week`,
        text: "Foods that raise your sugar fast are best kept to about once a month. You have had several this week already, so another one now can keep your sugar high. Best to skip it.",
      };
    }
    if (intake.redThisMonth >= MONTHLY_CAP.red) {
      return {
        level: "red",
        title: "You have had one of these this month",
        text: "Foods that raise sugar fast are best kept to about once a month, and you have already had one. Best to skip it this time.",
      };
    }
  }
  if (verdict === "yellow" && intake.yellowThisWeek >= WEEKLY_CAP.yellow) {
    return {
      level: "yellow",
      title: "That is a lot this week",
      text: `You have already had this kind of food ${intake.yellowThisWeek} times this week. Two or three a week is enough. Try a green meal instead.`,
    };
  }
  return null;
}
