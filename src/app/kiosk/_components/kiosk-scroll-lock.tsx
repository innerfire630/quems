'use client';

// =============================================================================
// KioskScrollLock — Permanently locks body scroll on kiosk pages
// =============================================================================
// The kiosk is a full-screen touch interface. The body must NEVER scroll,
// even when dialogs open. This component applies scroll lock on mount and
// removes it on unmount (when navigating away from /kiosk).
// =============================================================================

import { useEffect } from 'react';

export function KioskScrollLock() {
  useEffect(() => {
    const body = document.body;
    const prevOverscroll = body.style.overscrollBehavior;

    // Prevent scroll chaining — body won't scroll when kiosk content is scrolled
    body.style.overscrollBehavior = 'none';

    // Prevent touch bounce on the body
    const preventTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.kiosk-scrollable') || target.closest('[data-slot="dialog-content"]')) {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });

    return () => {
      body.style.overscrollBehavior = prevOverscroll;
      document.removeEventListener('touchmove', preventTouch);
    };
  }, []);

  return null;
}
