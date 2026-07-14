// =============================================================================
// src/hooks/use-tab-alert.ts — Browser tab alert (favicon + title flash)
// =============================================================================
// Flashes the favicon and prepends the page title when there are unread
// alerts and the tab is not focused. Restores both when the tab becomes
// visible again. Used by the counter dashboard for new-ticket alerts.
// =============================================================================
'use client';

import { useEffect, useRef } from 'react';

const TICK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#ef4444"/><text x="16" y="23" text-anchor="middle" font-size="20" font-weight="bold" fill="white">!</text></svg>`;

export function useTabAlert(alertCount: number, baseTitle: string) {
  const countRef = useRef(alertCount);
  useEffect(() => {
    countRef.current = alertCount;
  });

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitle = useRef<string>('');
  const flashState = useRef(false);
  const linkRef = useRef<HTMLLinkElement | null>(null);

  // Capture original title once
  useEffect(() => {
    originalTitle.current = document.title;
  }, []);

  function getOrCreateLink(): HTMLLinkElement {
    if (linkRef.current && document.head.contains(linkRef.current)) return linkRef.current;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    linkRef.current = link;
    return link;
  }

  function startFlash() {
    if (tickRef.current) return;
    const link = getOrCreateLink();
    tickRef.current = setInterval(() => {
      flashState.current = !flashState.current;
      if (flashState.current) {
        link.href = `data:image/svg+xml,${encodeURIComponent(TICK_SVG)}`;
        document.title = `(${countRef.current}) New Ticket!`;
      } else {
        link.removeAttribute('href');
        document.title = '⚠️ Action Required';
      }
    }, 1000);
  }

  function stopFlash() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    flashState.current = false;
    if (linkRef.current) {
      linkRef.current.remove();
      linkRef.current = null;
    }
    document.title = originalTitle.current || baseTitle;
  }

  // Always flash when count > 0; stop only when count resets to 0
  useEffect(() => {
    if (alertCount > 0) {
      // Only start if not already flashing — interval reads countRef.current
      if (!tickRef.current) startFlash();
    } else {
      stopFlash();
    }

    return () => {
      // Don't stop flash on cleanup — only when count explicitly goes to 0
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertCount, baseTitle]);

  // Stop flash when tab regains focus (user acknowledged)
  useEffect(() => {
    function handleFocus() {
      if (countRef.current <= 0) stopFlash();
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTitle]);
}
