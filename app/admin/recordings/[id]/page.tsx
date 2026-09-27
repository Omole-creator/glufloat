import { isAdmin } from "@/lib/recordings";
import AdminLogin from "../../AdminLogin";
import AdminShell from "../../AdminShell";
import CallRoom from "./CallRoom";

export const dynamic = "force-dynamic";

export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { id } = await params;
  return (
    <AdminShell title="Call" width="max-w-4xl">
      <CallRoom id={id} />
    </AdminShell>
  );
}
