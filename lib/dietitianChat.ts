"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * The in-house dietitian a person is assigned to, via the sticky, atomic
 * round-robin in supabase/dietitian-schema.sql (assign_dietitian). Dietitian
 * tier only — the function itself refuses anyone who is not entitled, so this
 * is safe to call optimistically from the UI.
 */
export interface AssignedDietitian {
  name: string;
  whatsappNumber: string;
}

export async function getAssignedDietitian(): Promise<AssignedDietitian | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.rpc("assign_dietitian", { p_user_id: user.id });
    if (error || !data || data.length === 0) return null;
    const row = data[0];
    return { name: row.dietitian_name as string, whatsappNumber: row.whatsapp_number as string };
  } catch {
    return null;
  }
}
