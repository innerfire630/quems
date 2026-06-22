import { Badge } from '@/components/ui/badge';

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <h1 className="text-4xl font-bold text-foreground">Security Officer Screen</h1>
      <p className="mt-4 text-lg text-muted-foreground">Monitor counters and handle escalations</p>
      <div className="mt-8">
        <Badge variant="destructive">Implemented in Phase 4</Badge>
      </div>
    </div>
  );
}
