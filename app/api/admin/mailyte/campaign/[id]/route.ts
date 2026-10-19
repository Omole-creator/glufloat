import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { deleteCampaign, getCampaignForEdit, mailyteConfigured } from "@/lib/mailyte";
import { hideCampaign } from "@/lib/hiddenCampaigns";

export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_-]{1,80}$/;

/** One sent email, as a copy for the composer (/admin/email "Edit"). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!mailyteConfigured()) return NextResponse.json({ error: "Mailyte is not connected." }, { status: 503 });
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  try {
    const c = await getCampaignForEdit(id);
    if (!c) return NextResponse.json({ error: "Could not load this email from Mailyte." }, { status: 404 });
    return NextResponse.json(c);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not reach Mailyte." }, { status: 502 });
  }
}

/** Remove a sent email from the list. It does not unsend it. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!mailyteConfigured()) return NextResponse.json({ error: "Mailyte is not connected." }, { status: 503 });
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  try {
    // Mailyte refuses to delete a campaign that has already gone out, so a
    // sent email is taken off GluFloat's list instead.
    if (await deleteCampaign(id)) return NextResponse.json({ ok: true });
    if (await hideCampaign(id)) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "It did not delete. Try again." }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not reach Mailyte." }, { status: 502 });
  }
}
