import type { Metadata } from "next";
import DeleteAccount from "./DeleteAccount";

export const metadata: Metadata = {
  title: "Delete my account",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DeleteAccount />;
}
