import { execFile, execSync } from 'node:child_process';
import { copyFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const REQUIRED_DEPENDENCIES = ['exiftool', 'ffmpeg'];
const STRIP_ARGS = ['-all=', '-overwrite_original', '-quiet'];
const TEMP_FILE_NAME = 'pass1.jpg';
const DEFAULT_OPTIONS = {
  quality: 92,
  aggressive: false,
  stripOnly: false,
  output: null,
  onProgress: () => {},
};
const PACKAGE_MANAGERS = ['brew', 'apt-get', 'pacman', 'dnf', 'apk'];
const PACKAGE_ALIASES = {
  exiftool: {
    'apt-get': 'libimage-exiftool-perl',
    pacman: 'perl-image-exiftool',
    dnf: 'perl-Image-ExifTool',
    apk: 'exiftool',
  },
};

function hasCommand(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resolvePackages(dependencies, manager) {
  return dependencies.map((dependency) => PACKAGE_ALIASES[dependency]?.[manager] ?? dependency);
}

function buildInstallCommand(manager, dependencies) {
  const packages = resolvePackages(dependencies, manager).join(' ');

  switch (manager) {
    case 'brew':
      return `brew install ${packages}`;
    case 'apt-get':
      return `sudo apt-get install -y ${packages}`;
    case 'pacman':
      return `sudo pacman -S --noconfirm ${packages}`;
    case 'dnf':
      return `sudo dnf install -y ${packages}`;
    case 'apk':
      return `sudo apk add ${packages}`;
    default:
      return null;
  }
}

function detectPackageManager() {
  return PACKAGE_MANAGERS.find((manager) => hasCommand(manager)) ?? null;
}

export async function checkDeps() {
  const missing = [];

  for (const dependency of REQUIRED_DEPENDENCIES) {
    try {
      await exec('which', [dependency]);
    } catch {
      missing.push(dependency);
    }
  }

  return missing;
}

export async function installDeps(missing, { onProgress = DEFAULT_OPTIONS.onProgress } = {}) {
  const manager = detectPackageManager();
  if (!manager) {
    return { success: false, error: 'No supported package manager found (brew, apt, pacman, dnf, apk)' };
  }

  const installCommand = buildInstallCommand(manager, missing);
  onProgress(`Installing ${missing.join(', ')} via ${manager}...`);

  try {
    execSync(installCommand, { stdio: 'pipe' });

    const stillMissing = await checkDeps();
    if (stillMissing.length > 0) {
      return { success: false, error: `Still missing after install: ${stillMissing.join(', ')}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `${manager} failed: ${error.message}` };
  }
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
  return (await stat(filePath)).size;
}

function ffmpegQuality(quality) {
  return Math.round((100 - quality) * 31 / 100 + 1);
}

function getOutputPath(input, output, stripOnly) {
  if (output) {
    return output;
  }

  const ext = extname(input);
  const base = basename(input, ext);
  const directory = dirname(input);

  return join(directory, stripOnly ? `${base}-clean${ext}` : `${base}-clean.jpg`);
}

function createFfmpegArgs(input, output, quality, aggressive) {
  const args = ['-y', '-i', input];

  if (aggressive) {
    args.push('-vf', 'gblur=sigma=0.3');
  }

  args.push(
    '-q:v', String(ffmpegQuality(quality)),
    '-map_metadata', '-1',
    '-fflags', '+bitexact',
    '-flags:v', '+bitexact',
    output
  );

  return args;
}

async function stripMetadata(filePath) {
  await exec('exiftool', [...STRIP_ARGS, filePath]);
}

async function reencodeImage(input, output, quality, aggressive = false) {
  await exec('ffmpeg', createFfmpegArgs(input, output, quality, aggressive));
}

export async function cleanImage(input, options = {}) {
  const { quality, aggressive, stripOnly, output, onProgress } = { ...DEFAULT_OPTIONS, ...options };
  const outPath = getOutputPath(input, output, stripOnly);
  const tmpDir = await mkdtemp(join(tmpdir(), 'clean-image-'));
  const tmpFile = join(tmpDir, TEMP_FILE_NAME);

  try {
    if (stripOnly) {
      onProgress('Copying image...');
      await copyFile(input, outPath);

      onProgress('Stripping metadata...');
      await stripMetadata(outPath);
    } else {
      onProgress('Pass 1/4 — FFmpeg re-encode');
      await reencodeImage(input, tmpFile, quality, aggressive);

      onProgress('Pass 2/4 — ExifTool nuclear strip');
      await stripMetadata(tmpFile);

      onProgress('Pass 3/4 — FFmpeg re-encode #2');
      await reencodeImage(tmpFile, outPath, quality);

      onProgress('Pass 4/4 — ExifTool final strip');
      await stripMetadata(outPath);
    }

    return outPath;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
