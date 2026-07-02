'use client';

// =============================================================================
// FieldInfo — inline info icon with hover tooltip for form fields
// Uses a portal so the tooltip is never clipped by overflow-hidden parents.
// =============================================================================

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface FieldInfoProps {
  text: string;
}

export function FieldInfo({ text }: FieldInfoProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const tooltip =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[9999] w-56 -translate-x-1/2 -translate-y-full rounded-md bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-md ring-1 ring-foreground/10"
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex shrink-0 cursor-help align-middle"
        onMouseEnter={() => {
          updatePosition();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
      >
        <Info className="size-3.5 text-muted-foreground" />
      </span>
      {tooltip}
    </>
  );
}
