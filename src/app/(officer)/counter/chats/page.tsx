// =============================================================================
// src/app/(officer)/counter/chats/page.tsx — Counter Manager Chats
// =============================================================================
// Server component that renders the chat dashboard for counter officers.
// Shows active chats and archived chats with real-time messaging.
// =============================================================================

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PERMISSION_CHAT_READ } from '@/lib/permissions';
import { ChatsDashboardClient } from './_components/chats-dashboard-client';

export default async function ChatsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions: string[] = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_CHAT_READ)) {
    redirect('/?error=forbidden');
  }

  return <ChatsDashboardClient />;
}
