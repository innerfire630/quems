import { PlaceholderPage } from '@/components/shared/PlaceholderPage';

interface PageProps {
  params: Promise<{ counterId: string }>;
}

export default async function OfficerCounterPage({ params }: PageProps) {
  const { counterId } = await params;
  return (
    <PlaceholderPage
      title="Officer Dashboard"
      description={`Officer-facing serving dashboard with call/recall/no-show actions. (Counter ID: ${counterId})`}
      implementedIn="Phase 4"
    />
  );
}
