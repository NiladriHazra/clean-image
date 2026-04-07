import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export async function commandExists(command: string) {
  try {
    await exec('which', [command]);
    return true;
  } catch {
    return false;
  }
}

export async function runCommand(program: string, args: readonly string[]) {
  try {
    return await exec(program, args);
  } catch (error) {
    throw new Error(`${program} failed: ${extractCommandError(error)}`);
  }
}

function extractCommandError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'Unknown process failure';
  }

  const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : '';
  const stdout = 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '';

  return stderr.trim().split('\n').at(-1)
    ?? stdout.trim().split('\n').at(-1)
    ?? 'Unknown process failure';
}
