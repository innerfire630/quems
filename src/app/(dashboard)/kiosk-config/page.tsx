// =============================================================================
// /kiosk-config — Kiosk configuration listing
// =============================================================================
// Lists all KioskConfig records with their current settings.
// SUPER_ADMIN only (system:configure).
// =============================================================================

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function KioskConfigPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const permissions: string[] = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SYSTEM_CONFIGURE)) {
    redirect('/?error=forbidden');
  }

  const configs = await prisma.kioskConfig.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Kiosk Configuration</h1>
      <p className="mt-2 text-muted-foreground">
        Manage self-service kiosk instances. Each kiosk can have its own welcome message, auto-reset
        timeout, restricted services, and printer settings.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{config.name}</CardTitle>
                <div className="flex gap-1.5">
                  {config.isDefault && <Badge>Default</Badge>}
                  <Badge variant={config.isActive ? 'outline' : 'secondary'}>
                    {config.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs text-muted-foreground w-32">Auto-reset</TableCell>
                    <TableCell className="text-sm">{config.autoResetSeconds}s</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs text-muted-foreground">Show Wait</TableCell>
                    <TableCell className="text-sm">
                      {config.showEstimatedWait ? 'Yes' : 'No'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs text-muted-foreground">Printer</TableCell>
                    <TableCell className="text-sm font-mono">{config.printerName ?? '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs text-muted-foreground">Welcome</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {config.welcomeMessage ?? '—'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs text-muted-foreground">Footer</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {config.footerMessage ?? '—'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {configs.length === 0 && (
          <p className="col-span-2 py-12 text-center text-muted-foreground">
            No kiosk configurations found. Run the seed script or create one via the database.
          </p>
        )}
      </div>
    </div>
  );
}
