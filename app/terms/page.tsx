import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Use | Glufloat",
  alternates: { canonical: "/terms" },
};

/*
 * The founder's legal text. Rewritten 2026-11-18 at his request, so it says
 * what the site does today. If the date below changes, change LEGAL_UPDATED
 * in app/sitemap.ts too. Prices here must match lib/pricing.ts.
 */
export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="The serious part"
      title="Terms of Use"
      updated="Last updated: 18 November 2026. These terms are between you and Glufloat (&quot;we&quot;, &quot;us&quot;)."
    >
      <p>
        By making an account or using the app, you agree to these terms. If
        you do not agree, please do not use Glufloat.
      </p>

      <h2>1. Who can use Glufloat</h2>
      <ul>
        <li>
          You must be at least 18 years old, or have a parent or guardian
          agree on your behalf.
        </li>
        <li>
          You must give correct information when you sign up and keep your
          password private.
        </li>
        <li>You are responsible for what happens under your account.</li>
      </ul>

      <h2>2. What Glufloat is</h2>
      <p>
        Glufloat is a food guide for people living with diabetes, built around
        Nigerian food. It picks your breakfast, lunch and dinner, shows you how
        much to eat, tells you how a food or meal is likely to affect your
        sugar, keeps your sugar tests, and makes a report for your doctor.
      </p>
      <p>
        It gives general food guidance. As the Medical Disclaimer explains, it
        is not medical advice and does not replace your doctor or your
        medicine. Keep taking your medicine the way your doctor told you.
      </p>

      <h2>3. Free trial</h2>
      <p>
        New users get 7 days free. You do not need a card, and nothing is
        charged during the trial. When the 7 days end, you need a paid plan to
        keep using Glufloat.
      </p>

      <h2>4. Plans and prices</h2>
      <ul>
        <li>Glufloat (Basic): N1,500 a month, or N14,400 a year.</li>
        <li>Glufloat Plus: N2,500 a month, or N24,000 a year.</li>
        <li>Glufloat Premium: N4,500 a month, or N43,200 a year.</li>
      </ul>
      <p>
        These are the prices on the day above. If a price changes, we will
        show the new price before you pay. Payment is taken by Paystack. We do
        not store your card details.
      </p>
      <ul>
        <li>
          Each payment gives you 30 days (365 days for a yearly plan). If you
          pay before your time runs out, the new days are added to the days you
          have left.
        </li>
        <li>
          Plans do not renew by themselves. Nothing is taken from your card
          without you paying again. We remind you in the app when your time is
          nearly up.
        </li>
        <li>
          If you came through a creator&apos;s or a pharmacy&apos;s link or
          code, you get 20% off your first 3 monthly payments.
        </li>
        <li>
          If you invite a friend and they pay for the first time, you get 5
          free days, once for each friend.
        </li>
      </ul>

      <h2>5. If a hospital, dietitian or doctor brought you</h2>
      <ul>
        <li>
          If your hospital pays for your Glufloat, you get every Premium
          feature for as long as the hospital covers you. The hospital decides
          this, not you.
        </li>
        <li>
          If you joined a dietitian on Glufloat, you pay the monthly price they
          set, inside the app. When your paid month ends, you need to pay that
          price again to keep using it.
        </li>
        <li>
          If you joined through a doctor, you can choose Glufloat Premium when
          your free trial ends.
        </li>
        <li>
          If you leave, or your hospital stops covering you, any days you had
          paid for yourself before joining are given back to you.
        </li>
      </ul>

      <h2>6. Chatting with a dietitian or your care team</h2>
      <p>
        Premium members, and patients of a hospital, dietitian or doctor on
        Glufloat, can send messages inside the app. Replies come from real
        people and can take time. The chat is not for emergencies. If you feel
        very unwell, or your sugar is very high or very low, call your doctor
        or go to the nearest hospital straight away.
      </p>

      <h2>7. Your sugar tests</h2>
      <p>
        Glufloat keeps your sugar test numbers and shows them back to you and
        your doctor. It does not diagnose anything. If a number worries you,
        speak to your doctor.
      </p>

      <h2>8. Stopping and refunds</h2>
      <ul>
        <li>
          There is nothing to cancel. If you do not want to continue, simply
          do not pay again. You keep access until the days you paid for run
          out.
        </li>
        <li>
          Because this is a digital service you can use straight away, payments
          are generally not refundable, except where Nigerian law requires a
          refund.
        </li>
        <li>
          You can delete your account at any time from the menu. This removes
          your record for good, and any paid days you have left are lost and
          not refunded.
        </li>
      </ul>

      <h2>9. Fair use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Copy, resell, or share the app&apos;s food list, meals or content
          without our written permission.
        </li>
        <li>Try to break, hack, or overload the app.</li>
        <li>Share your account with other people or sell access to it.</li>
        <li>Use the app to harm others or to break any Nigerian law.</li>
        <li>
          Present the app&apos;s guidance as professional medical advice when
          sharing it with others.
        </li>
      </ul>

      <h2>10. Our content</h2>
      <p>
        The Glufloat name, logo, design, food list, meals, photos and blog
        belong to Glufloat. You may use them only inside the app for your own
        personal use. Everything else is reserved.
      </p>

      <h2>11. Changes to the app and these terms</h2>
      <p>
        We may improve, change, or remove features over time. We may also
        update these terms. If we make an important change, we will let you
        know in the app or by email. If you keep using Glufloat after a
        change, that means you accept the new terms.
      </p>

      <h2>12. Ending your access</h2>
      <p>
        We may suspend or close your account if you break these terms or
        misuse the app. You may close your account at any time.
      </p>

      <h2>13. Our responsibility</h2>
      <p>
        We build Glufloat with care, but we cannot promise it will always be
        perfect, available, or free of mistakes. To the extent the law allows,
        Glufloat is not liable for any loss that comes from using the app,
        including any health outcome, since the app is general food guidance
        and not medical care. Nothing in these terms removes any right you have
        that cannot be removed under Nigerian law.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These terms follow the laws of the Federal Republic of Nigeria. Any
        dispute will be handled by the courts of Nigeria.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these terms: glufloat@gmail.com, support@glufloat.com,
        0904 874 4395, 11 Idris Ogunlaja Drive, Majek, Lagos, Nigeria.
      </p>
    </LegalShell>
  );
}
