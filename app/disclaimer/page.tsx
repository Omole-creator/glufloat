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
      updated="Please read this before using GluFloat."
    >
      <p>
        GluFloat provides guidance on food choices for people living with
        diabetes. It is designed to help you make informed decisions about what
        to eat. It is not a substitute for medical advice.
      </p>

      <h2>What GluFloat Does</h2>
      <ul>
        <li>
          Shows you whether a food or meal is a good, fair, or poor choice for
          someone living with Type 1 or Type 2 diabetes.
        </li>
        <li>
          Shows you how to improve a meal, such as adjusting the portion size or
          pairing it with other foods to reduce its impact on your blood sugar.
        </li>
        <li>
          Provides guidance based on established knowledge of nutrition and
          blood sugar management.
        </li>
      </ul>

      <h2>What GluFloat Does Not Do</h2>
      <ul>
        <li>It does not diagnose diabetes or any other medical condition.</li>
        <li>It does not treat, cure, or reverse diabetes.</li>
        <li>
          It does not replace your doctor, nurse, pharmacist, or dietitian.
        </li>
        <li>
          It does not tell you to start, stop, or change any medication.
        </li>
        <li>
          It does not have access to your personal medical history, laboratory
          results, or other health conditions.
        </li>
      </ul>

      <h2>Always Do This</h2>
      <ul>
        <li>
          Continue taking your medication exactly as prescribed by your doctor
          unless your doctor advises otherwise.
        </li>
        <li>
          Continue checking your blood sugar as recommended by your healthcare
          provider.
        </li>
        <li>
          If you feel unwell, dizzy, very weak, or if your blood sugar is
          extremely high or low, treat it as a medical emergency and seek
          immediate medical attention. Do not wait to check the app.
        </li>
      </ul>

      <h2>Our Promise and Our Limits</h2>
      <p>
        We work hard to ensure the information in GluFloat is accurate,
        practical, and useful. However, every person&apos;s body responds to
        food differently, so we cannot guarantee that our guidance will be
        appropriate for everyone.
      </p>
      <p>
        To understand how a meal affects your body, check your blood sugar about
        2 hours after eating. This will help you confirm whether the meal and
        portion worked well for your diabetes.
      </p>
    </LegalShell>
  );
}
