// =============================================================================
// src/app/(dashboard)/loading.tsx — Loading skeleton for the dashboard
// =============================================================================

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-background animate-pulse">
      {/* Sidebar skeleton */}
      <aside className="w-64 border-r border-border bg-card p-4">
        <div className="space-y-3">
          <div className="h-5 w-24 rounded bg-muted" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-full rounded-md bg-muted" />
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar skeleton */}
        <header className="flex h-16 items-center justify-end border-b border-border bg-card px-6">
          <div className="flex items-center gap-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="size-8 rounded-full bg-muted" />
          </div>
        </header>

        {/* Content skeleton */}
        <main className="flex-1 p-6">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="mt-4 grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-lg bg-muted" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
