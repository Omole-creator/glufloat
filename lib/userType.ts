/**
 * Who a person is: someone with diabetes, a health worker, or a family member
 * caring for someone. Asked once at sign-up, stored on `profiles.user_type`.
 *
 * It is a label for the numbers and the mailing list, nothing more. It does NOT
 * change what anybody sees inside the app.
 *
 * The three values here must match the check constraint in
 * `supabase/user-type-schema.sql`. Add a fourth here without adding it there and
 * every sign-up of that kind fails at the database.
 *
 * `null` is a real, expected state: every account made before this question
 * existed has no answer, and is never guessed into a group.
 */
export const USER_TYPES = ["diabetic", "health_pro", "caregiver"] as const;

export type UserType = (typeof USER_TYPES)[number];

/** What the person picking it reads on the sign-up form. The founder's words. */
export const SIGNUP_CHOICES: { value: UserType; label: string }[] = [
  { value: "diabetic", label: "I have diabetes" },
  { value: "health_pro", label: "Health professional" },
  { value: "caregiver", label: "Family member (caregiver)" },
];

/** What you read in the admin. Short, because it sits in a table cell. */
export const TYPE_LABEL: Record<UserType, string> = {
  diabetic: "Diabetic",
  health_pro: "Health professional",
  caregiver: "Family member",
};

/** The label for anybody, including the old accounts that never answered. */
export function typeLabel(t: string | null | undefined): string {
  return t && isUserType(t) ? TYPE_LABEL[t] : "Not set";
}

export function isUserType(t: unknown): t is UserType {
  return typeof t === "string" && (USER_TYPES as readonly string[]).includes(t);
}

/** The groups the admin screen shows, in order, "none" being the old accounts. */
export const GROUPS = ["all", ...USER_TYPES, "none"] as const;
export type Group = (typeof GROUPS)[number];

export function isGroup(g: unknown): g is Group {
  return typeof g === "string" && (GROUPS as readonly string[]).includes(g);
}

export function groupLabel(g: Group): string {
  if (g === "all") return "Everyone";
  if (g === "none") return "Not set";
  return TYPE_LABEL[g];
}

/** Does this person belong in that group? One rule, used by the screen and the file. */
export function inGroup(userType: string | null | undefined, g: Group): boolean {
  if (g === "all") return true;
  if (g === "none") return !isUserType(userType);
  return userType === g;
}
