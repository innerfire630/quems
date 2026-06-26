// =============================================================================
// src/app/display/page.tsx — Main display board page (3.2.1)
// =============================================================================
// Public server component. Reads boardId from searchParams, fetches the
// snapshot, and renders the client-side DisplayPageClient.
// =============================================================================

import { getDisplaySnapshot } from '@/lib/display-snapshot';
import { DisplayPageClient } from '@/components/display/display-page-client';

interface DisplayPageProps {
  searchParams: Promise<{ boardId?: string }>;
}

export default async function DisplayPage({ searchParams }: DisplayPageProps) {
  const { boardId } = await searchParams;
  const snapshot = await getDisplaySnapshot(boardId ?? null);

  return <DisplayPageClient initialSnapshot={snapshot} boardId={boardId ?? null} />;
}
