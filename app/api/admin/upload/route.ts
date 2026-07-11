import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Upload a cover image to the public `blog` bucket and hand back its URL.
 *
 * Admin-only, and it checks the real MIME type rather than trusting the file
 * name, so "shell.php.jpg" cannot smuggle anything into a public bucket.
 */
export async function POST(request: Request) {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No picture was sent." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "That file is not a picture. Use a JPG, PNG or WebP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That picture is too big. Keep it under 5MB." },
      { status: 400 },
    );
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("blog")
    .upload(name, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = admin.storage.from("blog").getPublicUrl(name);
  return NextResponse.json({ url: data.publicUrl });
}
