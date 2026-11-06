"use client";

import { useEffect, useState } from "react";
import { PERSONALIZATION_CHANGED, readPersonalizationProfile } from "@/lib/personalizationProfile";

/** This person's nut allergy answer (lib/nutAllergy.ts), kept up to date with My details. */
export function useNutAllergies(): string[] | null {
  const [list, setList] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    const read = () =>
      readPersonalizationProfile()
        .then((p) => {
          if (live) setList(p.nutAllergies);
        })
        .catch(() => undefined);
    void read();
    window.addEventListener(PERSONALIZATION_CHANGED, read);
    return () => {
      live = false;
      window.removeEventListener(PERSONALIZATION_CHANGED, read);
    };
  }, []);
  return list;
}
