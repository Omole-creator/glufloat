import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Glufloat",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="The serious part"
      title="Privacy Policy"
      updated="Last updated: 2 July 2026. Written to follow the Nigeria Data Protection Act 2023 (NDPA). GluFloat is the data controller."
    >
      <h2>1. Who we are</h2>
      <p>
        Glufloat is run by GluFloat, based in Lagos State, Nigeria. For any
        privacy question, contact us at glufloat@gmail.com.
      </p>

      <h2>2. What we collect</h2>
      <p>
        The current version of Glufloat is built to collect as little as
        possible:
      </p>
      <ul>
        <li>
          Checkout details (name, email, payment) are collected and processed
          by our checkout partner, Paystack, and their payment providers. We
          receive confirmation of your membership, not your full card number.
        </li>
        <li>
          Foods you search and meals you build stay on your own device. We do
          not store them on our servers in this version.
        </li>
        <li>
          Basic, anonymous usage information may be collected to keep the site
          working and improve it.
        </li>
      </ul>

      <h2>3. Sensitive (health) information</h2>
      <p>
        Using a diabetes food guide can hint at your health status, which
        counts as sensitive personal data under the NDPA. We treat this with
        extra care:
      </p>
      <ul>
        <li>We only use it to give you the food guidance you asked for.</li>
        <li>We never sell it.</li>
        <li>You can clear it from your device at any time.</li>
      </ul>

      <h2>4. Why we use your information</h2>
      <ul>
        <li>To give you the service you signed up for (contract).</li>
        <li>To take payment for your subscription (contract).</li>
        <li>
          To keep the app safe and working, and to improve it (legitimate
          interest).
        </li>
        <li>To meet our legal duties in Nigeria (legal obligation).</li>
      </ul>

      <h2>5. We do not sell your data</h2>
      <p>
        We do not sell your personal information to anyone. We only share it
        where needed: with our checkout partner to process your subscription,
        with trusted service providers who help us run the app (for example
        hosting), and with authorities if the law requires us to.
      </p>

      <h2>6. Where your data is kept</h2>
      <p>
        Data may be stored or processed on servers inside or outside Nigeria.
        When data leaves Nigeria, we take the steps required by the NDPA to
        make sure it stays protected.
      </p>

      <h2>7. How long we keep it</h2>
      <p>
        We keep information for as long as your membership is active, and for
        a reasonable period after, to meet legal, tax, and accounting duties.
        When it is no longer needed, we delete or anonymise it.
      </p>

      <h2>8. Your rights under the NDPA</h2>
      <ul>
        <li>Ask what data we hold about you and get a copy.</li>
        <li>Correct data that is wrong.</li>
        <li>Ask us to delete your data.</li>
        <li>Withdraw your consent at any time.</li>
        <li>Object to certain uses of your data.</li>
        <li>
          Complain to the Nigeria Data Protection Commission (NDPC) if you are
          not satisfied.
        </li>
      </ul>
      <p>
        To use any of these rights, contact us at glufloat@gmail.com. We will
        respond within the time the NDPA requires.
      </p>

      <h2>9. Children</h2>
      <p>
        Glufloat is not made for children under 18. We do not knowingly
        collect data from children. If you believe a child has given us data,
        contact us and we will delete it.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy. If we make an important change, we will
        tell you on the site or by email. The &ldquo;last updated&rdquo; date
        at the top shows the latest version.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions or requests: glufloat@gmail.com / Lagos State,
        Nigeria. You may also contact the Nigeria Data Protection Commission
        (NDPC).
      </p>
    </LegalShell>
  );
}
