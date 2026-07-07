import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Use | Glufloat",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="The serious part"
      title="Terms of Use"
      updated="Last updated: 2 July 2026. These terms are between you and GluFloat (&quot;we&quot;, &quot;us&quot;)."
    >
      <p>
        By subscribing or using the app, you agree to these terms. If you do
        not agree, please do not use Glufloat.
      </p>

      <h2>1. Who can use Glufloat</h2>
      <ul>
        <li>
          You must be at least 18 years old, or have a parent or guardian
          agree on your behalf.
        </li>
        <li>
          You must give correct information when you sign up and keep your
          login details private.
        </li>
        <li>You are responsible for what happens under your account.</li>
      </ul>

      <h2>2. What Glufloat is</h2>
      <p>
        Glufloat is a food-information app for people living with diabetes
        (Type 1 and Type 2), starting with Nigeria. It gives general guidance
        on foods and meals. As explained in the Medical Disclaimer, it is not
        medical advice and does not replace your doctor.
      </p>

      <h2>3. Trial, subscription, and payment</h2>
      <ul>
        <li>
          New users get a 3-day free trial with full access on their device.
          No payment details are collected for the trial, and nothing is
          charged during it.
        </li>
        <li>
          When the trial ends, continued access requires a paid subscription
          of N1,500 per month, unless we clearly show a different price
          before you pay.
        </li>
        <li>
          A paid subscription renews automatically each month until you
          cancel.
        </li>
        <li>
          Payment is collected through our checkout partner (Nestuge). We do
          not store your full card details ourselves.
        </li>
        <li>
          If a renewal payment fails, we may pause your access until payment
          succeeds.
        </li>
      </ul>

      <h2>4. Cancelling and refunds</h2>
      <ul>
        <li>
          You can cancel any time from your Nestuge account. Your access
          continues until the end of the period you already paid for.
        </li>
        <li>
          Because this is a digital service you use straight away, payments
          are generally not refundable, except where Nigerian law requires a
          refund.
        </li>
      </ul>

      <h2>5. Fair use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Copy, resell, or share the app&apos;s food database or content
          without our written permission.
        </li>
        <li>Try to break, hack, or overload the app.</li>
        <li>Use the app to harm others or to break any Nigerian law.</li>
        <li>
          Present the app&apos;s guidance as professional medical advice when
          sharing it with others.
        </li>
      </ul>

      <h2>6. Our content</h2>
      <p>
        The Glufloat name, logo, design, and food database belong to
        GluFloat. You may use them only inside the app for your own personal use.
        Everything else is reserved.
      </p>

      <h2>7. Changes to the app and these terms</h2>
      <p>
        We may improve, change, or remove features over time. We may also
        update these terms. If we make an important change, we will let you
        know in the app or by email. If you keep using Glufloat after a
        change, that means you accept the new terms.
      </p>

      <h2>8. Ending your access</h2>
      <p>
        We may suspend or close your account if you break these terms or
        misuse the app. You may close your account at any time.
      </p>

      <h2>9. Our responsibility</h2>
      <p>
        We provide Glufloat with care, but we cannot promise it will always be
        perfect, available, or error-free. To the extent the law allows,
        GluFloat is not liable for any loss that comes from using the
        app, including any health outcome, since the app is general
        information and not medical care. Nothing in these terms removes any
        right you have that cannot be removed under Nigerian law.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms follow the laws of the Federal Republic of Nigeria. Any
        dispute will be handled by the courts of Nigeria.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms: glufloat@gmail.com / 0904 874 4395 /
        Lagos State, Nigeria.
      </p>
    </LegalShell>
  );
}
