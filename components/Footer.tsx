import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-mist">
      {/* About band */}
      <div className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-leaf-deep">About GluFloat</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-ink">
              Helping people eat well, without giving up the food they love.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              GluFloat is a digital health startup helping people living with
              diabetes make better food choices without giving up the meals
              they love. We provide practical, culturally relevant guidance
              that simplifies diabetes nutrition, empowering users to manage
              their blood sugar with confidence through easy-to-understand
              tools, education, and technology.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-leaf-deep">
              About the founder
            </p>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row">
              <Image
                src="/img/founder.jpg"
                alt="Omole Usuangbon, founder of GluFloat"
                width={112}
                height={128}
                className="h-32 w-28 shrink-0 rounded-2xl object-cover shadow-md"
              />
              <p className="text-[15px] leading-relaxed text-ink-soft">
                Omole Usuangbon is a pharmacist, entrepreneur, and founder of
                GluFloat. Drawing on his pharmacy background and passion for
                digital health, he created GluFloat to make diabetes nutrition
                simple and practical for Africans. He is also the founder of
                JobMingle, a career development platform that has helped
                thousands of people access digital skills and employment
                opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>

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
              <li><Link className="hover:text-brand" href="/#demo">Try a food</Link></li>
              <li><Link className="hover:text-brand" href="/#pricing">Price</Link></li>
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
