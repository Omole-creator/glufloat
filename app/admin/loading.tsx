import DashboardSkeleton from "@/components/DashboardSkeleton";

/** Shown at once when any admin link is tapped (see DashboardSkeleton). */
export default function Loading() {
  return <DashboardSkeleton sidebarWidth="w-60" />;
}
