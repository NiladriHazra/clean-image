import { resolve, extname, join } from 'node:path';
import { access, mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function cleanPath(raw) {
  let p = raw.trim();
  p = p.replace(/^['"`]|['"`]$/g, '');
  p = p.replace(/\\(?=[ ()'])/g, '');
  return p;
}

function copyToClipboard(text) {
  try {
    if (platform() === 'darwin') {
      execSync(`printf '%s' ${JSON.stringify(text)} | pbcopy`);
    } else if (platform() === 'linux') {
      execSync(`printf '%s' ${JSON.stringify(text)} | xclip -selection clipboard`);
    }
    return true;
  } catch {
    return false;
  }
}

const CLI_HOSTS = [
  {
    name: 'Claude Code',
    value: 'claude',
    skillDir: join(homedir(), '.claude', 'commands'),
    skillFile: 'clean-image.md',
    cmd: 'claude',
    usage: '/clean-image',
    description: 'Anthropic\'s CLI for Claude',
  },
  {
    name: 'Codex CLI',
    value: 'codex',
    skillDir: join(homedir(), '.codex'),
    skillFile: 'instructions.md',
    cmd: 'codex',
    usage: '"clean this image"',
    description: 'OpenAI\'s coding CLI',
  },
  {
    name: 'OpenCode',
    value: 'opencode',
    skillDir: join(homedir(), '.opencode', 'commands'),
    skillFile: 'clean-image.md',
    cmd: 'opencode',
    usage: '/clean-image',
    description: 'Open-source AI coding CLI',
  },
];

async function installSkill(host, chalk, ora) {
  const skillSource = join(__dirname, '..', '.claude', 'commands', 'clean-image.md');
  const spinner = ora({ text: `Installing for ${host.name}...`, color: 'cyan' }).start();

  try {
    await mkdir(host.skillDir, { recursive: true });

    if (host.value === 'codex') {
      const skillContent = await readFile(skillSource, 'utf-8');
      const codexPath = join(host.skillDir, host.skillFile);
      let existing = '';
      try { existing = await readFile(codexPath, 'utf-8'); } catch {}

      if (existing.includes('clean-image')) {
        spinner.succeed(chalk.green(`${host.name} — already installed`));
        return;
      }

      await writeFile(codexPath, existing + `\n\n---\n\n# clean-image\n\n${skillContent}`);
    } else {
      await copyFile(skillSource, join(host.skillDir, host.skillFile));
    }

    spinner.succeed(chalk.green(`${host.name} — installed`));
  } catch (err) {
    spinner.fail(chalk.red(`${host.name} — ${err.message}`));
  }
}

export async function runTUI() {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const inquirer = (await import('inquirer')).default;
  const { checkDeps, cleanImage, getMetadataCount, getFileSize } = await import('./cleaner.js');

  // Header
  console.log('');
  console.log(chalk.magenta('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.magenta('  ║') + chalk.bold.white('  clean-image                              ') + chalk.magenta('║'));
  console.log(chalk.magenta('  ║') + chalk.dim('  Strip AI metadata. Four passes. Zero trace.') + chalk.magenta('║'));
  console.log(chalk.magenta('  ╚══════════════════════════════════════════╝'));
  console.log('');

  // Main menu
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What do you want to do?',
    choices: [
      { name: `${chalk.bold.green('▸ Clean an image')}        ${chalk.dim('strip AI metadata now')}`, value: 'clean' },
      { name: `${chalk.bold.cyan('▸ Install CLI skill')}     ${chalk.dim('add to your AI coding CLI')}`, value: 'install' },
    ]
  }]);

  // ─────────────────────────────────────────
  // INSTALL FLOW
  // ─────────────────────────────────────────
  if (action === 'install') {
    console.log('');
    const { cli } = await inquirer.prompt([{
      type: 'list',
      name: 'cli',
      message: 'Which CLI do you use?',
      choices: [
        ...CLI_HOSTS.map(h => ({
          name: `  ${chalk.bold(h.name)}${' '.repeat(16 - h.name.length)}${chalk.dim(h.description)}`,
          value: h.value,
        })),
        new inquirer.Separator(),
        { name: `  ${chalk.bold('All of them')}     ${chalk.dim('install everywhere')}`, value: 'all' },
      ]
    }]);

    console.log('');

    if (cli === 'all') {
      for (const host of CLI_HOSTS) {
        await installSkill(host, chalk, ora);
      }
    } else {
      const host = CLI_HOSTS.find(h => h.value === cli);
      await installSkill(host, chalk, ora);
    }

    // Determine which CLI to launch
    let hostToLaunch;
    if (cli === 'all') {
      console.log('');
      const { pick } = await inquirer.prompt([{
        type: 'list',
        name: 'pick',
        message: 'Open a CLI now?',
        choices: [
          ...CLI_HOSTS.map(h => ({
            name: `  ${chalk.bold(h.name)}${' '.repeat(16 - h.name.length)}${chalk.dim(h.cmd)}`,
            value: h.value,
          })),
          new inquirer.Separator(),
          { name: `  ${chalk.dim('Skip — I\'ll open it myself')}`, value: 'skip' },
        ]
      }]);
      if (pick === 'skip') {
        console.log('');
        console.log(chalk.dim('  Type /clean-image in your CLI to use it.'));
        console.log('');
        return;
      }
      hostToLaunch = CLI_HOSTS.find(h => h.value === pick);
    } else {
      hostToLaunch = CLI_HOSTS.find(h => h.value === cli);
    }

    // Check if CLI is installed
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const exec = promisify(execFile);

    try {
      await exec('which', [hostToLaunch.cmd]);
    } catch {
      console.log('');
      console.log(chalk.red(`  ${hostToLaunch.cmd} not found on PATH.`));
      console.log(chalk.dim(`  Install ${hostToLaunch.name} first, then run clean-image again.`));
      console.log('');
      return;
    }

    // Copy /clean-image to clipboard, then open the CLI clean
    const copied = copyToClipboard(hostToLaunch.usage);
    console.log('');
    if (copied) {
      console.log(chalk.green(`  ✓ ${chalk.bold(hostToLaunch.usage)} copied to clipboard`));
      console.log(chalk.dim(`  Just paste it in ${hostToLaunch.name} to start cleaning.`));
    } else {
      console.log(chalk.dim(`  Type ${chalk.bold(hostToLaunch.usage)} in ${hostToLaunch.name} to start.`));
    }
    console.log(chalk.dim(`  Opening ${hostToLaunch.name}...\n`));

    // Launch CLI with no args — user pastes /clean-image themselves
    const { spawn } = await import('node:child_process');
    const child = spawn(hostToLaunch.cmd, [], { stdio: 'inherit' });
    child.on('close', () => process.exit(0));
    return;
  }

  // ─────────────────────────────────────────
  // CLEAN FLOW
  // ─────────────────────────────────────────

  // Check deps
  const spinner = ora({ text: 'Checking dependencies...', color: 'cyan' }).start();
  const missing = await checkDeps();
  if (missing.length > 0) {
    spinner.fail(chalk.red(`Missing: ${missing.join(', ')}`));
    console.log(chalk.dim(`\n  brew install ${missing.join(' ')}\n`));
    process.exit(1);
  }
  spinner.succeed(chalk.green('Dependencies OK'));
  console.log('');

  // Find images in cwd
  const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.tif', '.bmp', '.avif'];
  let images = [];
  try {
    const { readdirSync } = await import('node:fs');
    images = readdirSync(process.cwd())
      .filter(f => imageExts.includes(extname(f).toLowerCase()))
      .sort();
  } catch {}

  // Select image
  let inputPath;
  if (images.length > 0) {
    const { source } = await inquirer.prompt([{
      type: 'list',
      name: 'source',
      message: 'Pick an image:',
      choices: [
        ...images.map(f => ({ name: `  ${f}`, value: f })),
        new inquirer.Separator(),
        { name: `  ${chalk.dim('Drag & drop or type a path...')}`, value: '__manual__' }
      ]
    }]);

    if (source === '__manual__') {
      inputPath = await askForPath(inquirer);
    } else {
      inputPath = resolve(source);
    }
  } else {
    console.log(chalk.dim('  No images found in current directory.\n'));
    inputPath = await askForPath(inquirer);
  }

  // Select mode
  const { mode } = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: 'Mode:',
    choices: [
      { name: `  ${chalk.bold('Standard')}      ${chalk.dim('4-pass strip + re-encode')}`, value: 'standard' },
      { name: `  ${chalk.bold('Aggressive')}    ${chalk.dim('+ blur to defeat pixel fingerprints')}`, value: 'aggressive' },
      { name: `  ${chalk.bold('Strip only')}    ${chalk.dim('metadata only, no re-encoding')}`, value: 'strip' },
    ]
  }]);

  // Select quality
  let quality = 92;
  if (mode !== 'strip') {
    const { q } = await inquirer.prompt([{
      type: 'list',
      name: 'q',
      message: 'Quality:',
      choices: [
        { name: `  ${chalk.bold('95')}  ${chalk.dim('highest quality')}`, value: 95 },
        { name: `  ${chalk.bold('92')}  ${chalk.dim('recommended')}`, value: 92 },
        { name: `  ${chalk.bold('85')}  ${chalk.dim('good balance')}`, value: 85 },
        { name: `  ${chalk.bold('75')}  ${chalk.dim('smaller file')}`, value: 75 },
      ],
      default: 1,
    }]);
    quality = q;
  }

  // Run cleaning
  console.log('');
  const cleanSpinner = ora({ text: 'Starting...', color: 'magenta' }).start();
  const inputSize = await getFileSize(inputPath);
  const inputMeta = await getMetadataCount(inputPath);

  try {
    const outPath = await cleanImage(inputPath, {
      quality,
      aggressive: mode === 'aggressive',
      stripOnly: mode === 'strip',
      onProgress: (msg) => { cleanSpinner.text = msg; },
    });

    const outputSize = await getFileSize(outPath);
    const outputMeta = await getMetadataCount(outPath);
    cleanSpinner.succeed(chalk.green('Done!'));

    // Results
    const modeLabel = mode === 'aggressive' ? 'aggressive' : mode === 'strip' ? 'strip-only' : 'standard';
    const savedPct = Math.round((1 - outputSize / inputSize) * 100);
    const metaRemoved = inputMeta - outputMeta;

    console.log('');
    console.log(chalk.magenta('  ┌──────────────────────────────────────────┐'));
    console.log(chalk.magenta('  │') + chalk.bold.white(' Results') + ' '.repeat(34) + chalk.magenta('│'));
    console.log(chalk.magenta('  ├──────────────────────────────────────────┤'));
    console.log(chalk.magenta('  │') + ` Mode:       ${chalk.cyan(modeLabel)}`.padEnd(51) + chalk.magenta('│'));
    console.log(chalk.magenta('  │') + ` Size:       ${Math.round(inputSize / 1024)} KB → ${chalk.green(Math.round(outputSize / 1024) + ' KB')} ${chalk.dim(`(${savedPct > 0 ? '-' : '+'}${Math.abs(savedPct)}%)`)}`.padEnd(60) + chalk.magenta('│'));
    console.log(chalk.magenta('  │') + ` Metadata:   ${inputMeta} → ${chalk.green(outputMeta + ' fields')} ${chalk.dim(`(${metaRemoved} removed)`)}`.padEnd(60) + chalk.magenta('│'));
    console.log(chalk.magenta('  │') + ` Output:     ${chalk.white(outPath)}`.padEnd(51) + chalk.magenta('│'));
    console.log(chalk.magenta('  └──────────────────────────────────────────┘'));
    console.log('');
  } catch (err) {
    cleanSpinner.fail(chalk.red('Failed'));
    console.error(chalk.red(`\n  ${err.message}\n`));
    process.exit(1);
  }
}

async function askForPath(inquirer) {
  const { path } = await inquirer.prompt([{
    type: 'input',
    name: 'path',
    message: 'Image path (drag & drop a file here):',
    filter: (val) => cleanPath(val),
    validate: async (raw) => {
      const val = cleanPath(raw);
      if (!val) return 'Drop an image file here or type a path';
      try {
        await access(resolve(val));
        return true;
      } catch {
        return `File not found: ${val}`;
      }
    }
  }]);
  return resolve(cleanPath(path));
}
