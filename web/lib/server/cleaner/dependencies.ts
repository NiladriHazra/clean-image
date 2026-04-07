import { commandExists } from '@/lib/server/cleaner/commands';

const REQUIRED_DEPENDENCIES = ['exiftool', 'ffmpeg'] as const;

export async function checkDependencies() {
  const missing: string[] = [];

  for (const dependency of REQUIRED_DEPENDENCIES) {
    if (await commandExists(dependency)) {
      continue;
    }

    missing.push(dependency);
  }

  return missing;
}
