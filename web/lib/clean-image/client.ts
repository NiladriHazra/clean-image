import type {
  ApiErrorResponse,
  CleanMode,
  CleanResult,
  DependenciesResponse,
  HealthResponse,
  RuntimeStatus,
} from '@/lib/clean-image/contracts';

type CleanImageInput = {
  file: File;
  mode: CleanMode;
  quality: number;
};

export async function fetchRuntimeStatus(signal?: AbortSignal): Promise<RuntimeStatus> {
  try {
    const [healthResponse, dependenciesResponse] = await Promise.all([
      fetch('/api/health', { cache: 'no-store', signal }),
      fetch('/api/dependencies', { cache: 'no-store', signal }),
    ]);

    const healthPayload = (await healthResponse.json()) as HealthResponse | ApiErrorResponse;
    const dependenciesPayload = (await dependenciesResponse.json()) as DependenciesResponse | ApiErrorResponse;

    return {
      available: healthResponse.ok && 'ok' in healthPayload && healthPayload.ok,
      missingDependencies:
        dependenciesResponse.ok && 'missing' in dependenciesPayload
          ? dependenciesPayload.missing
          : [],
    };
  } catch {
    return {
      available: false,
      missingDependencies: [],
    };
  }
}

export async function submitCleanRequest({
  file,
  mode,
  quality,
}: CleanImageInput): Promise<CleanResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  formData.append('quality', String(quality));

  const response = await fetch('/api/clean', {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json()) as CleanResult | ApiErrorResponse;

  if (!response.ok || !('artifactId' in payload)) {
    throw new Error(
      'error' in payload ? payload.error : 'The image could not be processed.',
    );
  }

  return payload;
}

export async function fetchArtifactPreview(downloadUrl: string) {
  const response = await fetch(downloadUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('The cleaned image is ready, but the preview could not be loaded.');
  }

  return response.blob();
}
