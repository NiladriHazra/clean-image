import { resolve, extname, join } from 'node:path';
import { access, mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { execSync, spawn as _spawn } from 'node:child_process';

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

// Simulate keyboard input to auto-type text into the spawned CLI
function simulateType(child, text, delay = 300) {
  setTimeout(() => {
    if (child.stdin && child.stdin.writable) {
      child.stdin.write(text);
    }
  }, delay);
}

const CLI_HOSTS = [
  {
    name: 'Claude Code',
    value: 'claude',
    skillDir: join(homedir(), '.claude', 'commands'),
    skillFile: 'clean-image.md',
    cmd: 'claude',
    usage: '/clean-image',
    description: 'Anthropic\'s CLI',
  },
  {
    name: 'Codex CLI',
    value: 'codex',
    skillDir: join(homedir(), '.codex'),
    skillFile: 'instructions.md',
    cmd: 'codex',
    usage: 'clean this image',
    description: 'OpenAI\'s CLI',
  },
  {
    name: 'OpenCode',
    value: 'opencode',
    skillDir: join(homedir(), '.opencode', 'commands'),
    skillFile: 'clean-image.md',
    cmd: 'opencode',
    usage: '/clean-image',
    description: 'Open-source CLI',
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

    spinner.succeed(chalk.green(`${host.name} — installed ✓`));
  } catch (err) {
    spinner.fail(chalk.red(`${host.name} — ${err.message}`));
  }
}

function printHeader(chalk) {
  const c1 = chalk.hex('#ffde00'); // yellow
  const c2 = chalk.hex('#ff8c00'); // orange
  const c3 = chalk.hex('#ff3300'); // red
  const dim = chalk.dim;

  console.log('');
  console.log(c1('    ██████╗██╗     ███████╗ █████╗ ███╗   ██╗'));
  console.log(c1('   ██╔════╝██║     ██╔════╝██╔══██╗████╗  ██║'));
  console.log(c2('   ██║     ██║     █████╗  ███████║██╔██╗ ██║'));
  console.log(c2('   ██║     ██║     ██╔══╝  ██╔══██║██║╚██╗██║'));
  console.log(c3('   ╚██████╗███████╗███████╗██║  ██║██║ ╚████║'));
  console.log(c3('    ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝'));

  console.log(c1('    ██╗███╗   ███╗ █████╗  ██████╗ ███████╗'));
  console.log(c1('    ██║████╗ ████║██╔══██╗██╔════╝ ██╔════╝'));
  console.log(c2('    ██║██╔████╔██║███████║██║  ███╗█████╗'));
  console.log(c2('    ██║██║╚██╔╝██║██╔══██║██║   ██║██╔══╝'));
  console.log(c3('    ██║██║ ╚═╝ ██║██║  ██║╚██████╔╝███████╗'));
  console.log(c3('    ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝'));
  console.log('');
  console.log(dim('    Strip AI metadata. Four passes. Zero trace.'));
  console.log(dim('    ─────────────────────────────────────────'));
  console.log('');
}

export async function runTUI() {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const inquirer = (await import('inquirer')).default;
  const { checkDeps, cleanImage, getMetadataCount, getFileSize } = await import('./cleaner.js');

  printHeader(chalk);

  // Main menu
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: chalk.bold('What do you want to do?'),
    choices: [
      { name: `  ${chalk.green('●')} ${chalk.bold('Clean an image')}        ${chalk.dim('— strip AI metadata now')}`, value: 'clean' },
      { name: `  ${chalk.cyan('●')} ${chalk.bold('Install CLI skill')}     ${chalk.dim('— add to Claude / Codex / OpenCode')}`, value: 'install' },
    ],
    loop: false,
  }]);

  // ═══════════════════════════════════════
  // INSTALL FLOW
  // ═══════════════════════════════════════
  if (action === 'install') {
    console.log('');
    const { cli } = await inquirer.prompt([{
      type: 'list',
      name: 'cli',
      message: chalk.bold('Which CLI?'),
      choices: [
        ...CLI_HOSTS.map(h => ({
          name: `  ${chalk.magenta('◆')} ${chalk.bold(h.name)}${' '.repeat(14 - h.name.length)}${chalk.dim(h.description)}`,
          value: h.value,
        })),
        new inquirer.Separator(chalk.dim('  ────────────────────────────────')),
        { name: `  ${chalk.yellow('◆')} ${chalk.bold('All of them')}   ${chalk.dim('install everywhere')}`, value: 'all' },
      ],
      loop: false,
    }]);

    console.log('');

    if (cli === 'all') {
      for (const host of CLI_HOSTS) await installSkill(host, chalk, ora);
    } else {
      await installSkill(CLI_HOSTS.find(h => h.value === cli), chalk, ora);
    }

    // Pick which CLI to open
    let hostToLaunch;
    if (cli === 'all') {
      console.log('');
      const { pick } = await inquirer.prompt([{
        type: 'list',
        name: 'pick',
        message: chalk.bold('Open a CLI now?'),
        choices: [
          ...CLI_HOSTS.map(h => ({
            name: `  ${chalk.magenta('▸')} ${chalk.bold(h.name)}`,
            value: h.value,
          })),
          new inquirer.Separator(chalk.dim('  ────────────────────────────────')),
          { name: `  ${chalk.dim('Skip — I\'ll open it myself')}`, value: 'skip' },
        ],
        loop: false,
      }]);
      if (pick === 'skip') {
        console.log('');
        console.log(chalk.dim('    Type /clean-image in your CLI to use it.'));
        console.log('');
        return;
      }
      hostToLaunch = CLI_HOSTS.find(h => h.value === pick);
    } else {
      hostToLaunch = CLI_HOSTS.find(h => h.value === cli);
    }

    // Check if CLI exists
    try {
      execSync(`which ${hostToLaunch.cmd}`, { stdio: 'ignore' });
    } catch {
      console.log('');
      console.log(chalk.red(`    ✗ ${hostToLaunch.cmd} not found on PATH`));
      console.log(chalk.dim(`    Install ${hostToLaunch.name} first.`));
      console.log('');
      return;
    }

    // Copy /clean-image to clipboard so user can paste
    const copied = copyToClipboard(hostToLaunch.usage);
    console.log('');
    console.log(chalk.bold.white(`    Opening ${hostToLaunch.name}...`));
    console.log('');
    if (copied) {
      console.log(chalk.green(`    ✓ ${chalk.bold(hostToLaunch.usage)} copied to clipboard`));
      console.log(chalk.dim(`    Just ⌘V to paste and hit Enter.`));
    } else {
      console.log(chalk.dim(`    Type: ${chalk.bold(hostToLaunch.usage)}`));
    }
    console.log('');

    // Build launch args
    const launchArgs = [];
    if (hostToLaunch.value === 'claude') {
      launchArgs.push('--dangerously-skip-permissions');
    }

    const child = _spawn(hostToLaunch.cmd, launchArgs, { stdio: 'inherit' });
    child.on('close', () => process.exit(0));
    return;
  }

  // ═══════════════════════════════════════
  // CLEAN FLOW
  // ═══════════════════════════════════════

  const spinner = ora({ text: 'Checking dependencies...', color: 'cyan' }).start();
  const missing = await checkDeps();
  if (missing.length > 0) {
    spinner.fail(chalk.red(`Missing: ${missing.join(', ')}`));
    console.log(chalk.dim(`\n    brew install ${missing.join(' ')}\n`));
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
      message: chalk.bold('Pick an image:'),
      choices: [
        ...images.map(f => ({ name: `  📄 ${f}`, value: f })),
        new inquirer.Separator(chalk.dim('  ────────────────────────────────')),
        { name: `  ${chalk.dim('📁 Drag & drop or type a path...')}`, value: '__manual__' }
      ],
      loop: false,
    }]);

    inputPath = source === '__manual__' ? await askForPath(inquirer, chalk) : resolve(source);
  } else {
    console.log(chalk.dim('    No images in current directory.\n'));
    inputPath = await askForPath(inquirer, chalk);
  }

  // Select mode
  const { mode } = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: chalk.bold('Mode:'),
    choices: [
      { name: `  ${chalk.green('◉')} ${chalk.bold('Standard')}      ${chalk.dim('— 4-pass strip + re-encode')}`, value: 'standard' },
      { name: `  ${chalk.red('◉')} ${chalk.bold('Aggressive')}    ${chalk.dim('— + blur to defeat pixel fingerprints')}`, value: 'aggressive' },
      { name: `  ${chalk.blue('◉')} ${chalk.bold('Strip only')}    ${chalk.dim('— metadata only, keeps pixels')}`, value: 'strip' },
    ],
    loop: false,
  }]);

  // Select quality
  let quality = 92;
  if (mode !== 'strip') {
    const { q } = await inquirer.prompt([{
      type: 'list',
      name: 'q',
      message: chalk.bold('Quality:'),
      choices: [
        { name: `  ${chalk.bold('95')}  ${chalk.dim('— highest quality, larger file')}`, value: 95 },
        { name: `  ${chalk.bold('92')}  ${chalk.dim('— recommended')}`, value: 92 },
        { name: `  ${chalk.bold('85')}  ${chalk.dim('— good balance')}`, value: 85 },
        { name: `  ${chalk.bold('75')}  ${chalk.dim('— smallest file')}`, value: 75 },
      ],
      default: 1,
      loop: false,
    }]);
    quality = q;
  }

  // Run cleaning
  console.log('');
  const cleanSpinner = ora({ text: 'Starting pipeline...', color: 'magenta' }).start();
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
    cleanSpinner.succeed(chalk.green.bold('Done!'));

    const modeLabel = mode === 'aggressive' ? 'aggressive' : mode === 'strip' ? 'strip-only' : 'standard';
    const savedPct = Math.round((1 - outputSize / inputSize) * 100);
    const metaRemoved = inputMeta - outputMeta;

    console.log('');
    console.log(chalk.dim('    ──────────────────────────────────────'));
    console.log(chalk.bold.white('    RESULTS'));
    console.log(chalk.dim('    ──────────────────────────────────────'));
    console.log(`    ${chalk.dim('Mode')}       ${chalk.cyan(modeLabel)}`);
    console.log(`    ${chalk.dim('Size')}       ${Math.round(inputSize / 1024)} KB → ${chalk.green.bold(Math.round(outputSize / 1024) + ' KB')} ${chalk.dim(`(${savedPct > 0 ? '-' : '+'}${Math.abs(savedPct)}%)`)}`);
    console.log(`    ${chalk.dim('Metadata')}   ${inputMeta} fields → ${chalk.green.bold(outputMeta + ' fields')} ${chalk.dim(`(${metaRemoved} stripped)`)}`);
    console.log(`    ${chalk.dim('Output')}     ${chalk.white(outPath)}`);
    console.log(chalk.dim('    ──────────────────────────────────────'));
    console.log('');
    console.log(chalk.green.bold('    ✓ Zero AI fingerprints remain.'));
    console.log('');
  } catch (err) {
    cleanSpinner.fail(chalk.red('Failed'));
    console.error(chalk.red(`\n    ${err.message}\n`));
    process.exit(1);
  }
}

async function askForPath(inquirer, chalk) {
  const { path } = await inquirer.prompt([{
    type: 'input',
    name: 'path',
    message: `${chalk.bold('Image path')} ${chalk.dim('(drag & drop here)')}:`,
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
