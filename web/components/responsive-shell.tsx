'use client';

import { useEffect, useState } from 'react';
import { XpDesktop } from '@/components/xp-desktop';
import { KitKatMobile } from '@/components/kitkat-mobile';

export function ResponsiveShell() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!mounted) return null;

  return isMobile ? <KitKatMobile /> : <XpDesktop />;
}
