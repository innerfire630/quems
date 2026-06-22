import type { ReactNode } from 'react';
import { OfficerSidebar } from '@/components/layout/OfficerSidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function OfficerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <OfficerSidebar />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
