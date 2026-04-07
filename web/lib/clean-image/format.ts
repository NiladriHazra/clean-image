import type { CleanMode } from '@/lib/clean-image/contracts';

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const formatMode = (mode: CleanMode) =>
  mode === 'strip-only' ? 'Strip only'
    : mode === 'aggressive' ? 'Aggressive'
    : 'Standard';

export const formatPercent = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
