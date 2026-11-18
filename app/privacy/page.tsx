import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Glufloat",
  alternates: { canonical: "/privacy" },
};

/*
 * The founder's legal text. Rewritten 2026-11-18 at his request, so it says
 * what the site does today. If the date below changes, change LEGAL_UPDATED
 * in app/sitemap.ts too.
 */
export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="The serious part"
      title="Privacy Policy"
      updated="Last updated: 18 November 2026. Written to follow the Nigeria Data Protection Act 2023 (NDPA). Glufloat is the data controller."
    >
      <h2>1. Who we are</h2>
      <p>
        Glufloat is run from 11 Idris Ogunlaja Drive, Majek, Lagos, Nigeria.
        For any privacy question, write to glufloat@gmail.com or
        support@glufloat.com, or call 0904 874 4395.
      </p>

      <h2>2. What we collect</h2>
      <p>We only ask for what we need to pick your meals and keep your record.</p>
      <ul>
        <li>
          Your account: your name, email, phone number, and whether you have
          diabetes, care for someone who does, or are a health worker. Your
          password is kept in a scrambled form we cannot read. If your hospital
          signed you up with only a phone number, we use that number to log you
          in.
        </li>
        <li>
          My details, if you fill them in: your sex, age, weight, height, how
          active you are, your goals, other health conditions (high blood
          pressure, high cholesterol, kidney problems), any nut allergy, the
          swallows you eat, and how and when you take your diabetes medicine.
          We keep each new weight you save, so you and your doctor can see how
          it changes.
        </li>
        <li>
          Your food record: the meals and foods you tell us you ate, how much,
          and when. Searching a food or checking a meal is not saved as
          something you ate. Only &ldquo;I ate this&rdquo; is.
        </li>
        <li>
          Your sugar tests and HbA1c results, if you save them, with the time
          and the meal they go with. We ask your permission the first time you
          save a sugar test.
        </li>
        <li>
          Your chats with a dietitian, doctor or care team inside Glufloat, and
          any notes your care team writes for you.
        </li>
        <li>
          How you use the app: for example, which meal we showed you, whether
          you opened it or asked for another, and which buttons you tap. This
          helps us pick better meals and fix what is not working.
        </li>
        <li>
          Payments: Paystack takes your payment. We receive the amount, the
          date, your email and a payment number. We never see or keep your full
          card number.
        </li>
        <li>
          Meal reminders: if you turn them on, your phone gives us an address
          to send them to. It is removed when your phone stops accepting them,
          or when you delete your account.
        </li>
      </ul>

      <h2>3. Links, codes and who told you about us</h2>
      <p>
        Many people find Glufloat through a friend, a creator, a pharmacy, a
        doctor or one of our field reps. When you open their link or scan their
        QR code, a small cookie on your phone remembers who sent you, so the
        right person gets the credit and you get any discount that comes with
        it.
      </p>
      <p>
        We also count how many phones open each link. Each phone is counted
        once. We do not keep your name, location or IP address for this. The
        person who sent you sees only numbers and money, such as &ldquo;12
        people signed up, 4 paid&rdquo;. They never see your name, your meals
        or your sugar tests.
      </p>

      <h2>4. How we count blog readers</h2>
      <p>
        We count how many people open each blog post, how many read to the end,
        and how many go on to make an account. Your browser makes up a random
        number for itself, so if you open the same post five times we count one
        person, not five. It is not your name, email or address. If you later
        make an account, we note the first post you landed on.
      </p>

      <h2>5. Website statistics and cookies</h2>
      <p>
        On the live site we use Vercel Analytics and Google Analytics (through
        Google Tag Manager) to see how many people visit, which pages they
        open and where they came from. Google Analytics uses cookies to do
        this. These numbers come to us as totals, not as named people.
      </p>
      <p>
        Your browser also keeps a few small settings for Glufloat, such as
        which tab you were on or whether you closed a message. You can clear
        these at any time in your browser settings.
      </p>

      <h2>6. Your health information</h2>
      <p>
        Your sugar tests, weight, medicines, health conditions and the fact
        that you use a diabetes app are sensitive personal data under the NDPA.
        We treat them with extra care:
      </p>
      <ul>
        <li>We use them to pick your meals and build your report.</li>
        <li>We never sell them and never use them for adverts.</li>
        <li>
          We will not use your health records to train a computer model without
          asking you first. Saying no will not change your service.
        </li>
        <li>You can delete any meal or sugar test from your report.</li>
      </ul>

      <h2>7. Who can see your record</h2>
      <ul>
        <li>You.</li>
        <li>
          Anyone you send your doctor&apos;s report to. When you share it, you
          choose who gets it.
        </li>
        <li>
          If you joined through a hospital, a dietitian or a doctor on
          Glufloat: their doctors, dietitians and staff can see your details,
          meals, sugar tests, weight, HbA1c, report and chat, so they can look
          after you. A doctor sees your record only while you are on a free
          trial or a paid plan.
        </li>
        <li>
          If you are on Glufloat Premium: the Glufloat dietitian you chat with
          sees your chat.
        </li>
        <li>
          A small number of Glufloat staff, only when needed to run the service
          or help you. Our own dashboards show totals, not your meals or sugar
          numbers.
        </li>
      </ul>

      <h2>8. Why we use your information</h2>
      <ul>
        <li>To give you the service you signed up for (contract).</li>
        <li>To take payment for your plan (contract).</li>
        <li>
          To keep your sugar tests and health details, with your permission
          (consent).
        </li>
        <li>
          To keep the app safe and working, and to improve it (legitimate
          interest).
        </li>
        <li>To meet our legal duties in Nigeria (legal obligation).</li>
      </ul>

      <h2>9. Emails from us</h2>
      <p>
        We send emails about Glufloat, such as news, tips and changes to your
        plan. Every email has a &ldquo;Stop these emails&rdquo; link. Once you
        use it, we stop.
      </p>

      <h2>10. Companies that help us</h2>
      <p>
        We do not sell your personal information to anyone. We share it only
        with companies that help us run Glufloat, and only what they need:
      </p>
      <ul>
        <li>Supabase, which stores our database.</li>
        <li>Vercel, which runs the website.</li>
        <li>Paystack, which takes payments.</li>
        <li>Mailyte, which sends our emails.</li>
        <li>Google, for website statistics.</li>
        <li>
          Your phone&apos;s notification service (Google, Apple or Mozilla), to
          deliver meal reminders you turned on.
        </li>
      </ul>
      <p>We also share information with the authorities if the law requires us to.</p>

      <h2>11. Where your data is kept</h2>
      <p>
        Our database is in London, in the United Kingdom, and the companies
        above may handle data in other countries too. When data leaves Nigeria,
        we take the steps the NDPA requires to keep it protected.
      </p>

      <h2>12. How we keep it safe</h2>
      <p>
        Your connection to Glufloat is encrypted, passwords are scrambled, and
        each person can only reach their own record unless they are part of
        your care team. No system is perfect, but we work to keep your
        information safe and will tell you if something goes wrong that
        affects you.
      </p>

      <h2>13. How long we keep it</h2>
      <p>
        We keep your information while you have an account. You can delete your
        account at any time from the menu (&ldquo;Delete my account&rdquo;).
        This removes your login, your details, your meals, your sugar tests,
        your chats and your reminders straight away, and it cannot be undone.
        We keep payment records for tax and accounting, but with your name and
        email taken off.
      </p>

      <h2>14. Your rights under the NDPA</h2>
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
        To use any of these rights, write to glufloat@gmail.com. We will reply
        within the time the NDPA requires.
      </p>

      <h2>15. Children</h2>
      <p>
        Glufloat is not made for children under 18. We do not knowingly
        collect data from children. If you believe a child has given us data,
        contact us and we will delete it.
      </p>

      <h2>16. Changes to this policy</h2>
      <p>
        We may update this policy as Glufloat changes. If we make an important
        change, we will tell you on the site or by email. The &ldquo;last
        updated&rdquo; date at the top shows the latest version.
      </p>

      <h2>17. Contact</h2>
      <p>
        Privacy questions or requests: glufloat@gmail.com, support@glufloat.com,
        0904 874 4395, 11 Idris Ogunlaja Drive, Majek, Lagos, Nigeria. You may
        also contact the Nigeria Data Protection Commission (NDPC).
      </p>
    </LegalShell>
  );
}
