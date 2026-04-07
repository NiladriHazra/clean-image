import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ARTIFACT_TTL_MS = 30 * 60 * 1000;

type StoredArtifact = {
  contentType: string;
  expiresAt: number;
  fileName: string;
  filePath: string;
};

declare global {
  var __cleanImageArtifacts: Map<string, StoredArtifact> | undefined;
}

type PersistArtifactInput = {
  artifactId: string;
  contentType: string;
  extension: string;
  fileName: string;
  sourcePath: string;
};

export async function persistArtifact({
  artifactId,
  contentType,
  extension,
  fileName,
  sourcePath,
}: PersistArtifactInput) {
  pruneArtifacts();

  const artifactsDirectory = await ensureArtifactsDirectory();
  const filePath = join(artifactsDirectory, `${artifactId}${extension}`);

  await copyFile(sourcePath, filePath);

  getArtifactStore().set(artifactId, {
    contentType,
    expiresAt: Date.now() + ARTIFACT_TTL_MS,
    fileName,
    filePath,
  });
}

export async function readArtifact(artifactId: string) {
  pruneArtifacts();

  const artifact = getArtifactStore().get(artifactId);

  if (!artifact) {
    return null;
  }

  return {
    artifact,
    body: await readFile(artifact.filePath),
  };
}

function getArtifactStore() {
  if (!globalThis.__cleanImageArtifacts) {
    globalThis.__cleanImageArtifacts = new Map();
  }

  return globalThis.__cleanImageArtifacts;
}

async function ensureArtifactsDirectory() {
  const artifactsDirectory = join(tmpdir(), 'clean-image-next-artifacts');
  await mkdir(artifactsDirectory, { recursive: true });
  return artifactsDirectory;
}

function pruneArtifacts() {
  const now = Date.now();
  const artifactStore = getArtifactStore();

  for (const [artifactId, artifact] of artifactStore.entries()) {
    if (artifact.expiresAt > now) {
      continue;
    }

    artifactStore.delete(artifactId);
    void rm(artifact.filePath, { force: true }).catch(() => {});
  }
}
