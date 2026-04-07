import { randomUUID } from 'node:crypto';
import { copyFile, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';

import type { CleanMode } from '@/lib/clean-image/contracts';
import { DEFAULT_QUALITY } from '@/lib/clean-image/contracts';
import { persistArtifact } from '@/lib/server/cleaner/artifacts';
import { runCommand } from '@/lib/server/cleaner/commands';

const STRIP_ARGS = ['-all=', '-overwrite_original', '-quiet'] as const;
const TEMP_FILE_NAME = 'pass1.jpg';

type ProcessImageInput = {
  mode: CleanMode;
  quality: number;
};

export async function processUploadedImage(
  file: File,
  { mode, quality }: ProcessImageInput,
) {
  const scratchDirectory = await mkdtemp(join(tmpdir(), 'clean-image-next-'));
  const inputExtension = normalizeExtension(file.name, file.type);
  const inputFilePath = join(scratchDirectory, `input${inputExtension}`);
  const pass1FilePath = join(scratchDirectory, TEMP_FILE_NAME);
  const outputExtension = mode === 'strip-only' ? inputExtension : '.jpg';
  const outputFilename = buildOutputFilename(file.name, outputExtension);
  const outputFilePath = join(scratchDirectory, outputFilename);

  try {
    await writeFile(inputFilePath, Buffer.from(await file.arrayBuffer()));

    const originalSize = await getFileSize(inputFilePath);
    const originalMetadataFields = await getMetadataCount(inputFilePath);

    if (mode === 'strip-only') {
      await copyFile(inputFilePath, outputFilePath);
      await stripMetadata(outputFilePath);
    } else {
      await reencodeImage(inputFilePath, pass1FilePath, quality, mode === 'aggressive');
      await stripMetadata(pass1FilePath);
      await reencodeImage(pass1FilePath, outputFilePath, quality, false);
      await stripMetadata(outputFilePath);
    }

    const cleanedSize = await getFileSize(outputFilePath);
    const cleanedMetadataFields = await getMetadataCount(outputFilePath);
    const artifactId = randomUUID();
    const contentType = resolveContentType(file.type, outputExtension, mode);

    await persistArtifact({
      artifactId,
      contentType,
      extension: outputExtension,
      fileName: outputFilename,
      sourcePath: outputFilePath,
    });

    return {
      artifactId,
      cleanedMetadataFields,
      cleanedSize,
      contentType,
      inputFilename: file.name,
      mode,
      originalMetadataFields,
      originalSize,
      outputFilename,
      quality: clampQuality(quality),
    };
  } finally {
    await rm(scratchDirectory, { recursive: true, force: true }).catch(() => {});
  }
}

async function getMetadataCount(filePath: string) {
  try {
    const { stdout } = await runCommand('exiftool', [filePath]);

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .length;
  } catch {
    return 0;
  }
}

async function getFileSize(filePath: string) {
  return (await stat(filePath)).size;
}

async function stripMetadata(filePath: string) {
  await runCommand('exiftool', [...STRIP_ARGS, filePath]);
}

async function reencodeImage(
  inputPath: string,
  outputPath: string,
  quality: number,
  aggressive: boolean,
) {
  const args = ['-y', '-i', inputPath];

  if (aggressive) {
    args.push('-vf', 'gblur=sigma=0.3');
  }

  args.push(
    '-q:v',
    String(ffmpegQuality(quality)),
    '-map_metadata',
    '-1',
    '-fflags',
    '+bitexact',
    '-flags:v',
    '+bitexact',
    outputPath,
  );

  await runCommand('ffmpeg', args);
}

function ffmpegQuality(quality: number) {
  return Math.round(((100 - clampQuality(quality)) * 31) / 100 + 1);
}

function clampQuality(quality: number) {
  if (Number.isNaN(quality)) {
    return DEFAULT_QUALITY;
  }

  return Math.max(1, Math.min(100, quality));
}

function buildOutputFilename(inputName: string, outputExtension: string) {
  const baseName = basename(inputName, extname(inputName)) || 'image';
  return `${baseName}-clean${outputExtension}`;
}

function normalizeExtension(fileName: string, mimeType: string) {
  const extension = extname(fileName).toLowerCase();

  if (extension) {
    return extension;
  }

  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/avif') return '.avif';
  if (mimeType === 'image/jpeg') return '.jpg';
  return '.img';
}

function resolveContentType(inputType: string, outputExtension: string, mode: CleanMode) {
  if (mode !== 'strip-only') {
    return 'image/jpeg';
  }

  if (inputType.startsWith('image/')) {
    return inputType;
  }

  if (outputExtension === '.png') return 'image/png';
  if (outputExtension === '.webp') return 'image/webp';
  if (outputExtension === '.avif') return 'image/avif';
  if (outputExtension === '.jpg' || outputExtension === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}
