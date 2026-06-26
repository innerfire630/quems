// =============================================================================
// src/app/(auth)/login/loading.tsx — Loading skeleton for the login page
// =============================================================================

export default function LoginLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-10 w-full rounded-md bg-muted" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-12 rounded bg-muted" />
        <div className="h-10 w-full rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-10 w-full rounded-md bg-muted" />
      </div>
      <div className="h-10 w-full rounded-md bg-muted" />
    </div>
  );
}
