import { NESTUGE_URL } from "@/lib/access";

export default function Paywall({ context }: { context: "search" | "meal" }) {
  return (
    <div className="verdict-pop overflow-hidden rounded-2xl border-2 border-brand/25 bg-white text-left shadow-[0_16px_40px_-18px_rgba(12,45,77,0.4)]">
      <div className="bg-gradient-to-r from-brand to-leaf px-6 py-4">
        <p className="text-sm font-bold text-white">
          {context === "search"
            ? "You have used your 3 free checks."
            : "The Meal Builder is a member feature."}
        </p>
      </div>

      <div className="p-6">
        <h3 className="font-display text-xl font-bold text-ink">
          Keep every answer, and every fix, for less than N50 a day.
        </h3>
        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
          <li className="flex gap-2">
            <span className="text-leaf">✓</span> Unlimited checks on all 143
            Nigerian foods, growing monthly
          </li>
          <li className="flex gap-2">
            <span className="text-leaf">✓</span> The full Meal Builder: build
            your plate, get the fix that turns it green
          </li>
          <li className="flex gap-2">
            <span className="text-leaf">✓</span> Portion, pairing, and how-often
            guidance on every single food
          </li>
          <li className="flex gap-2">
            <span className="text-leaf">✓</span> 7 days free. Cancel any time
            before the trial ends and pay nothing
          </li>
        </ul>

        <a
          href={NESTUGE_URL}
          className="mt-6 block rounded-full bg-brand px-6 py-3.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(27,95,170,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
        >
          Start my 7-day free trial
        </a>
        <p className="mt-3 text-center text-xs text-ink-soft">
          Then N1,500 a month. Cancel any time.
        </p>
        <p className="mt-4 text-center text-xs text-ink-soft">
          Already a member?{" "}
          <a href="/unlock" className="font-semibold text-brand hover:underline">
            Enter your access code
          </a>
        </p>
      </div>
    </div>
  );
}
