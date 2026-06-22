import { Badge } from '@/components/ui/badge';

export default function KioskPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-card p-8">
      <h1 className="text-4xl font-bold text-foreground">Self-Service Kiosk</h1>
      <p className="mt-4 text-lg text-muted-foreground">Take a ticket and join the queue</p>
      <div className="mt-8">
        <Badge variant="outline">Implemented in Phase 2</Badge>
      </div>
    </div>
  );
}
