"use client";

import { useEffect, useState } from "react";
import CodeBox, { CodeAdded } from "./CodeBox";
import { checkCode, linkCode, saveTypedCode } from "@/lib/creatorClient";

/**
 * On sign-up: the green line when they came through a creator's link, or the
 * folded "Have a code?" for someone who heard a code in a video. A typed code
 * is kept on this device and tied to the account when /app first opens, so
 * the sign-up form and its database trigger did not change.
 */
export default function SignupCode() {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => setCode(linkCode()), []);
  if (code) return <CodeAdded code={code} text="You get 20% off your first 3 months after your free week." />;
  return (
    <div className="text-center">
      <CodeBox
        onAdd={async (typed) => {
          const real = await checkCode(typed);
          if (!real) return "We could not find that code. Please check the spelling.";
          saveTypedCode(real);
          setCode(real);
          return null;
        }}
      />
    </div>
  );
}
