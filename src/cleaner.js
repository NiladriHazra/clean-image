import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat, copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename, extname } from 'node:path';

const exec = promisify(execFile);

export async function checkDeps() {
  const missing = [];
  for (const dep of ['exiftool', 'ffmpeg']) {
    try {
      await exec('which', [dep]);
    } catch {
      missing.push(dep);
    }
  }
  return missing;
}

export async function getMetadataCount(filePath) {
  try {
    const { stdout } = await exec('exiftool', [filePath]);
    return stdout.trim().split('\n').length;
  } catch {
    return 0;
  }
}

export async function getFileSize(filePath) {
  const s = await stat(filePath);
  return s.size;
}

function ffmpegQuality(quality) {
  return Math.round((100 - quality) * 31 / 100 + 1);
}

export async function cleanImage(input, options = {}) {
  const {
    quality = 92,
    aggressive = false,
    stripOnly = false,
    output = null,
    onProgress = () => {},
  } = options;

  const ext = extname(input);
  const base = basename(input, ext);
  const dir = join(input, '..');

  let outPath = output;
  if (!outPath) {
    outPath = stripOnly
      ? join(dir, `${base}-clean${ext}`)
      : join(dir, `${base}-clean.jpg`);
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'clean-image-'));
  const tmpFile = join(tmpDir, 'pass1.jpg');
  const q = ffmpegQuality(quality);

  try {
    if (stripOnly) {
      // Just copy and strip
      onProgress('Copying image...');
      await copyFile(input, outPath);

      onProgress('Stripping metadata...');
      await exec('exiftool', ['-all=', '-overwrite_original', '-quiet', outPath]);
    } else {
      // Pass 1: FFmpeg re-encode
      onProgress('Pass 1/4 — FFmpeg re-encode');
      const ffmpegArgs = ['-y', '-i', input];
      if (aggressive) {
        ffmpegArgs.push('-vf', 'gblur=sigma=0.3');
      }
      ffmpegArgs.push(
        '-q:v', String(q),
        '-map_metadata', '-1',
        '-fflags', '+bitexact',
        '-flags:v', '+bitexact',
        tmpFile
      );
      await exec('ffmpeg', ffmpegArgs, { stdio: 'pipe' });

      // Pass 2: ExifTool nuclear strip
      onProgress('Pass 2/4 — ExifTool nuclear strip');
      await exec('exiftool', ['-all=', '-overwrite_original', '-quiet', tmpFile]);

      // Pass 3: FFmpeg re-encode #2
      onProgress('Pass 3/4 — FFmpeg re-encode #2');
      await exec('ffmpeg', [
        '-y', '-i', tmpFile,
        '-q:v', String(q),
        '-map_metadata', '-1',
        '-fflags', '+bitexact',
        '-flags:v', '+bitexact',
        outPath
      ], { stdio: 'pipe' });

      // Pass 4: ExifTool final strip
      onProgress('Pass 4/4 — ExifTool final strip');
      await exec('exiftool', ['-all=', '-overwrite_original', '-quiet', outPath]);
    }

    return outPath;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
