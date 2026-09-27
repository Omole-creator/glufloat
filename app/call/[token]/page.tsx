import type { Metadata } from "next";
import CustomerCall from "./CustomerCall";

// A private link for one person. Never in search results.
export const metadata: Metadata = {
  title: "Your call with GluFloat",
  robots: { index: false, follow: false },
};

export default async function CallPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CustomerCall token={token} />;
}
