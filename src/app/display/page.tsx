// =============================================================================
// src/app/display/page.tsx — Main display board page (3.2.1)
// =============================================================================
// Public server component. Reads boardId from searchParams, fetches the
// snapshot, and renders the client-side DisplayPageClient.
// =============================================================================

import { getDisplaySnapshot } from '@/lib/display-snapshot';
import { DisplayPageClient } from '@/components/display/display-page-client';
import { getSystemBrand } from '@/lib/cached-data';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DisplayPageProps {
  searchParams: Promise<{ boardId?: string }>;
}

export default async function DisplayPage({ searchParams }: DisplayPageProps) {
  const { boardId } = await searchParams;
  const [snapshot, brand, themeSetting, marqueeSetting] = await Promise.all([
    getDisplaySnapshot(boardId ?? null),
    getSystemBrand(),
    prisma.systemSetting.findUnique({ where: { key: 'display.theme' } }),
    prisma.systemSetting.findUnique({ where: { key: 'display.marquee_message' } }),
  ]);

  const displayTheme = themeSetting?.value ?? 'dark';
  const marqueeMessage = marqueeSetting?.value || null;

  return <DisplayPageClient initialSnapshot={snapshot} boardId={boardId ?? null} systemName={brand.name} brandLogo={brand.logoUrl} displayTheme={displayTheme} marqueeMessage={marqueeMessage} />;
}
