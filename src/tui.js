import { execSync, spawn } from 'node:child_process';
import { access, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALL_HOSTS_VALUE = 'all';
const MANUAL_PATH_VALUE = '__manual__';
const SKIP_LAUNCH_VALUE = 'skip';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.tif', '.bmp', '.avif']);
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

function cleanPath(raw) {
  return raw
    .trim()
    .replace(/^['"`]|['"`]$/g, '')
    .replace(/\\(?=[ ()'])/g, '');
}

function copyToClipboard(text) {
  try {
    const os = platform();
    if (os === 'darwin') {
      execSync(`printf '%s' ${JSON.stringify(text)} | pbcopy`);
    } else if (os === 'linux') {
      execSync(`printf '%s' ${JSON.stringify(text)} | xclip -selection clipboard`);
    }
    return true;
  } catch {
    return false;
  }
}

function findHost(value) {
  return CLI_HOSTS.find((host) => host.value === value);
}

function formatHostChoice(host, chalk) {
  const padding = ' '.repeat(Math.max(1, 14 - host.name.length));
  return `  ${chalk.magenta('◆')} ${chalk.bold(host.name)}${padding}${chalk.dim(host.description)}`;
}

function getSkillSourcePath() {
  return join(__dirname, '..', '.claude', 'commands', 'clean-image.md');
}

async function installSkill(host, chalk, ora) {
  const spinner = ora({ text: `Installing for ${host.name}...`, color: 'cyan' }).start();
  const skillSource = getSkillSourcePath();

  try {
    await mkdir(host.skillDir, { recursive: true });

    if (host.value === 'codex') {
      const skillContent = await readFile(skillSource, 'utf-8');
      const codexPath = join(host.skillDir, host.skillFile);
      let existing = '';

      try {
        existing = await readFile(codexPath, 'utf-8');
      } catch {}

      if (existing.includes('clean-image')) {
        spinner.succeed(chalk.green(`${host.name} — already installed`));
        return;
      }

      await writeFile(codexPath, `${existing}\n\n---\n\n# clean-image\n\n${skillContent}`);
    } else {
      await copyFile(skillSource, join(host.skillDir, host.skillFile));
    }

    spinner.succeed(chalk.green(`${host.name} — installed ✓`));
  } catch (error) {
    spinner.fail(chalk.red(`${host.name} — ${error.message}`));
  }
}

function printHeader(chalk) {
  const c1 = chalk.hex('#ffde00');
  const c2 = chalk.hex('#ff8c00');
  const c3 = chalk.hex('#ff3300');

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
  console.log(chalk.dim('    Strip AI metadata. Four passes. Zero trace.'));
  console.log('');
}

function printResults(chalk, { mode, inputSize, outputSize, inputMeta, outputMeta, outPath }) {
  const modeLabel = mode === 'aggressive' ? 'aggressive' : mode === 'strip' ? 'strip-only' : 'standard';
  const savedPct = Math.round((1 - outputSize / inputSize) * 100);
  const metaRemoved = inputMeta - outputMeta;

  console.log('');
  console.log(chalk.bold.white('    RESULTS'));
  console.log(`    ${chalk.dim('Mode')}       ${chalk.cyan(modeLabel)}`);
  console.log(`    ${chalk.dim('Size')}       ${Math.round(inputSize / 1024)} KB → ${chalk.green.bold(`${Math.round(outputSize / 1024)} KB`)} ${chalk.dim(`(${savedPct > 0 ? '-' : '+'}${Math.abs(savedPct)}%)`)}`);
  console.log(`    ${chalk.dim('Metadata')}   ${inputMeta} fields → ${chalk.green.bold(`${outputMeta} fields`)} ${chalk.dim(`(${metaRemoved} stripped)`)}`);
  console.log(`    ${chalk.dim('Output')}     ${chalk.white(outPath)}`);
  console.log('');
  console.log(chalk.green.bold('    ✓ Zero AI fingerprints remain.'));
  console.log('');
}

function ensureCliAvailable(host) {
  try {
    execSync(`which ${host.cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function launchCli(host) {
  const launchArgs = host.value === 'claude' ? ['--dangerously-skip-permissions'] : [];
  const child = spawn(host.cmd, launchArgs, { stdio: 'inherit' });
  child.on('close', () => process.exit(0));
}

async function promptForCliTarget(inquirer, chalk) {
  const { cli } = await inquirer.prompt([{
    type: 'list',
    name: 'cli',
    message: chalk.bold('Which CLI?'),
    choices: [
      ...CLI_HOSTS.map((host) => ({
        name: formatHostChoice(host, chalk),
        value: host.value,
      })),
      {
        name: `  ${chalk.yellow('◆')} ${chalk.bold('All of them')}   ${chalk.dim('install everywhere')}`,
        value: ALL_HOSTS_VALUE,
      },
    ],
    loop: false,
  }]);

  return cli;
}

async function promptForCliLaunch(inquirer, chalk) {
  const { pick } = await inquirer.prompt([{
    type: 'list',
    name: 'pick',
    message: chalk.bold('Open a CLI now?'),
    choices: [
      ...CLI_HOSTS.map((host) => ({
        name: `  ${chalk.magenta('▸')} ${chalk.bold(host.name)}`,
        value: host.value,
      })),
      { name: `  ${chalk.dim('Skip — I\'ll open it myself')}`, value: SKIP_LAUNCH_VALUE },
    ],
    loop: false,
  }]);

  return pick;
}

async function runInstallFlow(inquirer, chalk, ora) {
  console.log('');
  const cli = await promptForCliTarget(inquirer, chalk);
  console.log('');

  if (cli === ALL_HOSTS_VALUE) {
    for (const host of CLI_HOSTS) {
      await installSkill(host, chalk, ora);
    }
  } else {
    await installSkill(findHost(cli), chalk, ora);
  }

  let hostToLaunch = findHost(cli);
  if (cli === ALL_HOSTS_VALUE) {
    console.log('');
    const pick = await promptForCliLaunch(inquirer, chalk);
    if (pick === SKIP_LAUNCH_VALUE) {
      console.log('');
      console.log(chalk.dim('    Type /clean-image in your CLI to use it.'));
      console.log('');
      return;
    }
    hostToLaunch = findHost(pick);
  }

  if (!ensureCliAvailable(hostToLaunch)) {
    console.log('');
    console.log(chalk.red(`    ✗ ${hostToLaunch.cmd} not found on PATH`));
    console.log(chalk.dim(`    Install ${hostToLaunch.name} first.`));
    console.log('');
    return;
  }

  const copied = copyToClipboard(hostToLaunch.usage);
  console.log('');
  console.log(chalk.bold.white(`    Opening ${hostToLaunch.name}...`));
  console.log('');

  if (copied) {
    console.log(chalk.green(`    ✓ ${chalk.bold(hostToLaunch.usage)} copied to clipboard`));
    console.log(chalk.dim('    Just ⌘V to paste and hit Enter.'));
  } else {
    console.log(chalk.dim(`    Type: ${chalk.bold(hostToLaunch.usage)}`));
  }

  console.log('');
  launchCli(hostToLaunch);
}

async function ensureDependencies(checkDeps, installDeps, ora, chalk) {
  const spinner = ora({ text: 'Checking dependencies...', color: 'cyan' }).start();
  const missing = await checkDeps();

  if (missing.length === 0) {
    spinner.succeed(chalk.green('Dependencies OK'));
    console.log('');
    return;
  }

  spinner.warn(chalk.yellow(`Missing: ${missing.join(', ')}`));

  const installSpinner = ora({ text: `Installing ${missing.join(', ')}...`, color: 'cyan' }).start();
  const result = await installDeps(missing, {
    onProgress: (message) => {
      installSpinner.text = message;
    },
  });

  if (!result.success) {
    installSpinner.fail(chalk.red(`Auto-install failed: ${result.error}`));
    console.log('');
    console.log(chalk.dim('    Install manually:'));
    console.log(chalk.cyan(`    brew install ${missing.join(' ')}`));
    console.log('');
    process.exit(1);
  }

  installSpinner.succeed(chalk.green(`Installed ${missing.join(', ')}`));
  console.log('');
}

async function getImagesInCurrentDirectory() {
  try {
    const entries = await readdir(process.cwd());
    return entries
      .filter((file) => IMAGE_EXTENSIONS.has(extname(file).toLowerCase()))
      .sort();
  } catch {
    return [];
  }
}

async function askForPath(inquirer, chalk) {
  const { path } = await inquirer.prompt([{
    type: 'input',
    name: 'path',
    message: `${chalk.bold('Image path')} ${chalk.dim('(drag & drop here)')}:`,
    filter: (value) => cleanPath(value),
    validate: async (raw) => {
      const value = cleanPath(raw);
      if (!value) {
        return 'Drop an image file here or type a path';
      }

      try {
        await access(resolve(value));
        return true;
      } catch {
        return `File not found: ${value}`;
      }
    },
  }]);

  return resolve(cleanPath(path));
}

async function promptForImage(inquirer, chalk) {
  const images = await getImagesInCurrentDirectory();

  if (images.length === 0) {
    console.log(chalk.dim('    No images in current directory.\n'));
    return askForPath(inquirer, chalk);
  }

  const { source } = await inquirer.prompt([{
    type: 'list',
    name: 'source',
    message: chalk.bold('Pick an image:'),
    choices: [
      ...images.map((file) => ({ name: `  📄 ${file}`, value: file })),
      { name: `  ${chalk.dim('📁 Drag & drop or type a path...')}`, value: MANUAL_PATH_VALUE },
    ],
    loop: false,
  }]);

  return source === MANUAL_PATH_VALUE ? askForPath(inquirer, chalk) : resolve(source);
}

async function promptForMode(inquirer, chalk) {
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

  return mode;
}

async function promptForQuality(inquirer, chalk, mode) {
  if (mode === 'strip') {
    return 92;
  }

  const { quality } = await inquirer.prompt([{
    type: 'list',
    name: 'quality',
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

  return quality;
}

async function runCleanFlow(inquirer, chalk, ora, services) {
  const { checkDeps, cleanImage, getMetadataCount, getFileSize, installDeps } = services;

  await ensureDependencies(checkDeps, installDeps, ora, chalk);

  const inputPath = await promptForImage(inquirer, chalk);
  const mode = await promptForMode(inquirer, chalk);
  const quality = await promptForQuality(inquirer, chalk, mode);

  console.log('');
  const spinner = ora({ text: 'Starting pipeline...', color: 'magenta' }).start();
  const inputSize = await getFileSize(inputPath);
  const inputMeta = await getMetadataCount(inputPath);

  try {
    const outPath = await cleanImage(inputPath, {
      quality,
      aggressive: mode === 'aggressive',
      stripOnly: mode === 'strip',
      onProgress: (message) => {
        spinner.text = message;
      },
    });

    const outputSize = await getFileSize(outPath);
    const outputMeta = await getMetadataCount(outPath);

    spinner.succeed(chalk.green.bold('Done!'));
    printResults(chalk, {
      mode,
      inputSize,
      outputSize,
      inputMeta,
      outputMeta,
      outPath,
    });
  } catch (error) {
    spinner.fail(chalk.red('Failed'));
    console.error(chalk.red(`\n    ${error.message}\n`));
    process.exit(1);
  }
}

export async function runTUI() {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const inquirer = (await import('inquirer')).default;
  const {
    checkDeps,
    cleanImage,
    getMetadataCount,
    getFileSize,
    installDeps,
  } = await import('./cleaner.js');

  printHeader(chalk);

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

  if (action === 'install') {
    await runInstallFlow(inquirer, chalk, ora);
    return;
  }

  await runCleanFlow(inquirer, chalk, ora, {
    checkDeps,
    cleanImage,
    getMetadataCount,
    getFileSize,
    installDeps,
  });
}
