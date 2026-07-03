import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Medical Disclaimer | Glufloat",
};

export default function DisclaimerPage() {
  return (
    <LegalShell
      eyebrow="The serious part"
      title="Medical Disclaimer"
      updated="Please read this before you use Glufloat."
    >
      <p>
        Glufloat gives you general information about food. It is here to help
        you make easier choices about what to eat. It is not medical advice.
      </p>

      <h2>What Glufloat does</h2>
      <ul>
        <li>
          It shows you whether a food or meal is a good, fair, or poor choice
          for a person living with diabetes, whether Type 1 or Type 2.
        </li>
        <li>
          It suggests how to change a meal, like the portion size or what to
          eat with it, so it is gentler on your blood sugar.
        </li>
        <li>
          All of this is general guidance based on common knowledge about food
          and blood sugar.
        </li>
      </ul>

      <h2>What Glufloat does NOT do</h2>
      <ul>
        <li>It does not diagnose diabetes or any other condition.</li>
        <li>It does not treat, cure, or reverse diabetes.</li>
        <li>
          It does not replace your doctor, your nurse, your pharmacist, or
          your dietitian.
        </li>
        <li>It does not tell you to start, stop, or change any medicine.</li>
        <li>
          It does not know your personal medical history, your test results,
          or your other health conditions.
        </li>
      </ul>

      <h2>Always do this</h2>
      <ul>
        <li>
          Talk to your doctor or a qualified health worker before you make big
          changes to how you eat.
        </li>
        <li>
          Keep taking your medicine exactly as your doctor told you, unless
          your doctor says otherwise.
        </li>
        <li>Keep checking your blood sugar the way your doctor advised.</li>
        <li>
          If you feel unwell, dizzy, very weak, or your blood sugar is very
          high or very low, treat it as an emergency and get medical help at
          once. Do not wait to check the app.
        </li>
      </ul>

      <h2>Our promise and our limit</h2>
      <p>
        We work hard to keep the food information correct and useful, and a
        qualified dietitian helps us review it. Even so, food affects every
        person differently, and we cannot promise the guidance will be right
        for your own body. You use Glufloat at your own choice. To the extent
        the law allows, [COMPANY NAME] is not responsible for any loss or harm
        that comes from relying on the app instead of professional medical
        care.
      </p>
      <p>
        By tapping &ldquo;I understand&rdquo; in the app you agree that you
        have read this and that you will use Glufloat as general food
        information only.
      </p>
    </LegalShell>
  );
}
