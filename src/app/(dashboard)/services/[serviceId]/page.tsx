import { PlaceholderPage } from '@/components/shared/PlaceholderPage';

interface PageProps {
  params: Promise<{ serviceId: string }>;
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { serviceId } = await params;
  return (
    <PlaceholderPage
      title="Service Details"
      description={`Service configuration and counters. (ID: ${serviceId})`}
      implementedIn="2.1.1"
    />
  );
}
