// =============================================================================
// src/components/security/unread-indicator.tsx — Unread count badge (4.3.3)
// =============================================================================

interface UnreadIndicatorProps {
  count: number;
}

export function UnreadIndicator({ count }: UnreadIndicatorProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : String(count);

  return (
    <span
      className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold animate-pulse motion-reduce:animate-none"
      role="status"
      aria-label={`${count} unread broadcasts`}
    >
      {displayCount}
    </span>
  );
}
