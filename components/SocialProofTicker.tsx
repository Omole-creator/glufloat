"use client";

import { useEffect, useState } from "react";
import { currentMeal, localDayKey, type NamedMeal } from "@/lib/mealtime";

/**
 * The thin scrolling bar at the very top of the home page and /app.
 *
 * It shows lines like "3,481 diabetics have eaten jollof for lunch today." to
 * make the platform feel busy. The numbers are made up on the device (there is
 * no real cross-user count and none is fetched), always in the thousands. The
 * food changes with the meal (breakfast / lunch / dinner) and with the day, so a
 * returning person does not see the same line every day, and the number opens
 * low each meal and drifts up through it, so it reads like live activity.
 *
 * All of it is worked out on the phone from the Nigerian clock (WAT, GMT+1), the
 * same clock the meal card uses. No server, no cost. Reuses the .marquee CSS in
 * app/globals.css (scrolls right to left, pauses on hover, off under
 * prefers-reduced-motion).
 */

// Recognisable everyday plates, one set per meal. Hand-written display strings
// (already clean), same as the MARQUEE_FOODS list on the landing page.
const FOODS: Record<NamedMeal, string[]> = {
  breakfast: [
    "pap",
    "akara",
    "moi moi",
    "oats",
    "bread and egg",
    "akamu",
    "custard",
    "yam and egg",
    "tea and bread",
    "okpa",
  ],
  lunch: [
    "jollof rice",
    "eba and egusi",
    "pounded yam",
    "white rice and stew",
    "amala",
    "fried rice",
    "ofada rice",
    "beans and plantain",
    "semo and soup",
    "spaghetti",
  ],
  dinner: [
    "yam and egg sauce",
    "beans",
    "boiled plantain",
    "rice and stew",
    "eba and okra",
    "pepper soup",
    "moi moi",
    "amala and ewedu",
    "roasted plantain",
    "jollof rice",
  ],
};

const LINES_SHOWN = 3;

// FNV-1a 32-bit, same little hash the meal planner uses, so the pick is stable
// within a day and different the next.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MEAL_START_HOUR: Record<NamedMeal, number> = {
  breakfast: 0,
  lunch: 11,
  dinner: 17,
};

// Nigerian seconds since the current meal band began, so the number opens low
// each meal and rises through it.
function secondsIntoMeal(meal: NamedMeal, now: Date): number {
  const wat = new Date(now.getTime() + 60 * 60 * 1000);
  const sinceMidnight =
    wat.getUTCHours() * 3600 + wat.getUTCMinutes() * 60 + wat.getUTCSeconds();
  return Math.max(0, sinceMidnight - MEAL_START_HOUR[meal] * 3600);
}

function buildLines(now: Date): string[] {
  const meal = currentMeal(now);
  const day = localDayKey(now);
  const list = FOODS[meal];

  // Pick the day's foods by ordering the list by a per-day hash and taking the
  // first few: stable within the day, a different set the next day and each meal.
  const foods = list
    .map((food, i) => ({ food, k: hash(`${meal}#${day}#${i}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, LINES_SHOWN)
    .map((x) => x.food);

  const drift = Math.floor(secondsIntoMeal(meal, now) / 8);

  return foods.map((food) => {
    const base = 1000 + (hash(`${meal}#${day}#${food}`) % 3000);
    const n = Math.min(base + drift, 9999);
    return `${n.toLocaleString("en-US")} diabetics have eaten ${food} for ${meal} today.`;
  });
}

export default function SocialProofTicker() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    // Fill after mount so the server (UTC clock) and the client never disagree
    // on a second-sensitive number during hydration.
    const refresh = () => setLines(buildLines(new Date()));
    refresh();
    // Re-read every 30s: the number drifts up, and the food set + wording swap
    // at the meal boundary and at Nigerian midnight.
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="marquee fixed inset-x-0 top-0 z-[60] h-8 overflow-hidden bg-brand text-white">
      <div className="marquee-track flex h-8 w-max items-center gap-10">
        {[...lines, ...lines].map((line, i) => (
          <span
            key={i}
            aria-hidden={i >= lines.length}
            className="whitespace-nowrap text-xs font-semibold tracking-tight text-white/95"
          >
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
