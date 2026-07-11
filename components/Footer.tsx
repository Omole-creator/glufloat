import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-mist">
      {/* links */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Image src="/logo-mark.png" alt="Glufloat" width={34} height={34} />
              <span className="font-display text-lg font-bold tracking-tight">
                <span className="text-brand">GLU</span>
                <span className="text-leaf">FLOAT</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              Clear answers on Nigerian food for people living with diabetes.
              Green, yellow, or red, and always the fix.
            </p>
          </div>

          <div className="text-sm">
            <p className="font-display font-semibold text-ink">Explore</p>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li><Link className="hover:text-brand" href="/#how">How it works</Link></li>
              <li><Link className="hover:text-brand" href="/#demo">Try it free</Link></li>
              <li><Link className="hover:text-brand" href="/#pricing">Price</Link></li>
              <li><Link className="hover:text-brand" href="/blog">Blog</Link></li>
              <li><Link className="hover:text-brand" href="/about">About us</Link></li>
              <li><Link className="hover:text-brand" href="/app">Open the app</Link></li>
            </ul>
          </div>

          <div className="text-sm">
            <p className="font-display font-semibold text-ink">The serious part</p>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li><Link className="hover:text-brand" href="/disclaimer">Medical disclaimer</Link></li>
              <li><Link className="hover:text-brand" href="/terms">Terms of use</Link></li>
              <li><Link className="hover:text-brand" href="/privacy">Privacy policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="text-xs leading-relaxed text-ink-soft">
            Glufloat gives general food information for people living with
            diabetes. It is not medical advice, and it does not diagnose,
            treat, or cure any condition.
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            © 2026 GluFloat. Lagos State, Nigeria.
          </p>
        </div>
      </div>
    </footer>
  );
}
