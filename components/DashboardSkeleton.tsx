/**
 * What a dashboard page shows the instant a link is tapped, while the server
 * gets its data (used by app/hospital/loading.tsx and app/admin/loading.tsx).
 *
 * Why it exists: in Next 16 a dynamic page with no loading.tsx is not
 * prefetched, so a tap waited for the server with nothing happening on
 * screen, which reads as "the button did not work". With it, the frame
 * (sidebar, header, bottom bar) is prefetched and appears at once.
 * Same shapes and colours as the real frames, so nothing jumps.
 */
export default function DashboardSkeleton({ bottomBar = false, sidebarWidth = "w-64" }: { bottomBar?: boolean; sidebarWidth?: string }) {
  const pad = sidebarWidth === "w-60" ? "lg:pl-60" : "lg:pl-64";
  return (
    <div className="min-h-screen bg-[#f2f5f9]" aria-busy="true">
      <span className="sr-only">Loading</span>
      <aside className={`fixed inset-y-0 left-0 z-30 hidden ${sidebarWidth} flex-col gap-3 bg-[#0b2e59] px-4 py-5 lg:flex`}>
        <div className="h-10 w-32 rounded-xl bg-white/10" />
        <div className="mt-6 h-16 rounded-2xl bg-white/[0.07]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 rounded-xl bg-white/[0.06]" />
        ))}
      </aside>
      <header className="sticky top-0 z-30 h-14 bg-[#0b2e59] lg:hidden" />
      <main className={pad}>
        <div className="mx-auto max-w-6xl animate-pulse px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-9">
          <div className="h-8 w-48 rounded-lg bg-ink/10" />
          <div className="mt-2 h-4 w-64 max-w-full rounded bg-ink/[0.07]" />
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-[#e3e9f1] bg-white" />
            ))}
          </div>
          <div className="mt-6 h-72 rounded-2xl border border-[#e3e9f1] bg-white" />
        </div>
      </main>
      {bottomBar && <div className="fixed inset-x-0 bottom-0 z-40 h-[68px] border-t border-line bg-white/95 lg:hidden" />}
    </div>
  );
}
