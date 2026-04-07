export const APP_NAME = 'clean-image';
export const APP_VERSION = '0.1.0';
export const MIN_QUALITY = 72;
export const MAX_QUALITY = 100;
export const DEFAULT_QUALITY = 92;
export const CLEAN_MODES = ['standard', 'aggressive', 'strip-only'] as const;

export type CleanMode = (typeof CLEAN_MODES)[number];

export type HealthResponse = {
  ok: boolean;
  service: string;
  version: string;
};

export type DependenciesResponse = {
  ok: boolean;
  missing: string[];
};

export type ApiErrorResponse = {
  error: string;
};

export type CleanResult = {
  artifactId: string;
  cleanedMetadataFields: number;
  cleanedSize: number;
  contentType: string;
  downloadUrl: string;
  inputFilename: string;
  metadataRemoved: number;
  mode: CleanMode;
  originalMetadataFields: number;
  originalSize: number;
  outputFilename: string;
  quality: number;
  sizeDeltaPercent: number;
};

export type RuntimeStatus = {
  available: boolean;
  missingDependencies: string[];
};

export const isCleanMode = (value: unknown): value is CleanMode =>
  typeof value === 'string' && CLEAN_MODES.includes(value as CleanMode);
