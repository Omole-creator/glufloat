import DashboardSkeleton from "@/components/DashboardSkeleton";

/** Shown at once when any dashboard link is tapped (see DashboardSkeleton). */
export default function Loading() {
  return <DashboardSkeleton bottomBar />;
}
