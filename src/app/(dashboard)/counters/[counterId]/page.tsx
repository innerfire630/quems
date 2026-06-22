import { PlaceholderPage } from '@/components/shared/PlaceholderPage';

interface PageProps {
  params: Promise<{ counterId: string }>;
}

export default async function CounterDetailPage({ params }: PageProps) {
  const { counterId } = await params;
  return (
    <PlaceholderPage
      title="Counter Details"
      description={`Counter information and service assignments. (ID: ${counterId})`}
      implementedIn="2.1.2"
    />
  );
}
