import { PlaceholderPage } from '@/components/shared/PlaceholderPage';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  return (
    <PlaceholderPage
      title="Edit User"
      description={`Edit user details, status, and role assignments. (ID: ${userId})`}
      implementedIn="1.3.3"
    />
  );
}
