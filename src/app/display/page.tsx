import { Badge } from '@/components/ui/badge';

export default function DisplayBoardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8 text-zinc-100">
      <h1 className="text-5xl font-black tracking-tight">Main Display Board</h1>
      <p className="mt-4 text-lg text-zinc-400">Real-time queue status and ticket announcements</p>
      <div className="mt-8">
        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
          Implemented in Phase 3
        </Badge>
      </div>
    </div>
  );
}
