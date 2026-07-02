// =============================================================================
// _client.tsx — Client wrapper for the officer counter stub page (2.3.2)
// =============================================================================
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import TicketActionPanel from '@/components/counter/ticket-action-panel';
import type { TicketDetail } from '@/types/ticket.types';

interface ClientProps {
  ticket: TicketDetail | null;
  counterId: string;
  officerOnDuty: boolean;
}

export default function TicketActionPanelClient({ ticket, counterId, officerOnDuty }: ClientProps) {
  const router = useRouter();

  const handleActionComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <TicketActionPanel
      ticket={ticket}
      counterId={counterId}
      officerOnDuty={officerOnDuty}
      hasNextTicket={false}
      onActionComplete={handleActionComplete}
    />
  );
}
