import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';

interface DashboardHomePageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function DashboardHomePage({ searchParams }: DashboardHomePageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Welcome, {session.user.name}</h1>
      <p className="mt-2 text-muted-foreground">
        Dashboard overview widgets are implemented in Phase 1.3.3 and Phase 5.
      </p>

      {params.error === 'forbidden' && (
        <Alert variant="destructive" className="mt-6">
          <ShieldX className="size-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access that page. Contact your administrator if you
            believe this is an error.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Your Roles</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {session.user.roles.length > 0 ? (
              session.user.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {role}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No roles assigned</span>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Permissions</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {session.user.permissions.length}
          </p>
        </div>
      </div>
    </div>
  );
}
