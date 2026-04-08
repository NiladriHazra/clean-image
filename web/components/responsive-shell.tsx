'use client';

import { useSyncExternalStore } from 'react';
import { XpDesktop } from '@/components/xp-desktop';
import { KitKatMobile } from '@/components/kitkat-mobile';

const MOBILE_QUERY = '(max-width: 640px)';

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  const handler = () => onStoreChange();

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function ResponsiveShell() {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return isMobile ? <KitKatMobile /> : <XpDesktop />;
}
