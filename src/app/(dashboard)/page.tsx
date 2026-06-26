import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardHomePage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Welcome, {session.user.name}</h1>
      <p className="mt-2 text-muted-foreground">
        Dashboard overview widgets are implemented in Phase 1.3.3 and Phase 5.
      </p>
    </div>
  );
}
