// =============================================================================
// src/components/kiosk/print-ticket.tsx — Printable ticket template (2.2.3)
// =============================================================================
// Pure presentational component that renders the ticket for thermal printing.
// Rendered inside a hidden iframe by SilentPrintTrigger. Does NOT use
// Tailwind — uses plain CSS classes defined in print.css.
// =============================================================================

import type { IssuedTicketResponse } from '@/types/ticket.types';
import type { LoadedKioskConfig } from '@/lib/kiosk-config';

interface PrintTicketProps {
  ticket: IssuedTicketResponse;
  kioskConfig: LoadedKioskConfig;
  businessLogoUrl?: string;
}

function formatIssuedAt(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PrintTicket({ ticket, kioskConfig, businessLogoUrl }: PrintTicketProps) {
  const paperClass = kioskConfig.paperWidth === '58MM' ? 'ticket ticket--58mm' : 'ticket';

  return (
    <div className={paperClass}>
      {/* Logo */}
      {businessLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="logo" src={businessLogoUrl} alt="Logo" />
      )}

      {/* Welcome */}
      <div className="ticket-label">{kioskConfig.welcomeMessage ?? 'Welcome!'}</div>

      {/* Ticket Number */}
      <div className="ticket-label">Your number</div>
      <div className="ticket-number">{ticket.ticketNumber}</div>

      <div className="divider" />

      {/* Service */}
      <div className="service-name">{ticket.serviceName}</div>

      {/* Estimated Wait */}
      {kioskConfig.showEstimatedWait && ticket.estimatedWaitMinutes !== null && (
        <div className="estimated-wait">Estimated wait: ~{ticket.estimatedWaitMinutes} min</div>
      )}

      {/* Footer */}
      <div className="footer-text">{kioskConfig.footerMessage ?? 'Please wait to be called.'}</div>

      <div className="divider" />

      {/* Metadata */}
      <div className="metadata">Issued: {formatIssuedAt(ticket.issuedAt)}</div>
      <div className="metadata">Position: {ticket.waitPosition}</div>

      {/* QR placeholder (future) */}
      <div className="qr-placeholder" />
    </div>
  );
}
