// =============================================================================
// src/hooks/use-scroll-lock.ts — Body scroll lock hook
// =============================================================================
// Prevents background scrolling when a modal/dialog is open.
// =============================================================================

'use client';

import { useEffect } from 'react';

const LOCK_CLASS = 'scroll-locked';

/**
 * Locks body scroll when active is true.
 * Uses position:fixed trick to fully prevent all scrolling,
 * preserving scroll position for when the lock is released.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const scrollY = window.scrollY;

    html.classList.add(LOCK_CLASS);
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Block touch events on the overlay (not inside dialog content)
    const preventTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-slot="dialog-content"]')) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });

    return () => {
      html.classList.remove(LOCK_CLASS);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.removeEventListener('touchmove', preventTouch);
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
