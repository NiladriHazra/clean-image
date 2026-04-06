#!/usr/bin/env node

import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const VERSION = '1.0.0';

async function ensureInputExists(inputPath, chalk) {
  try {
    await access(inputPath);
  } catch {
    console.error(chalk.red(`\n  File not found: ${inputPath}\n`));
    process.exit(1);
  }
}

async function ensureDependencies(checkDeps, installDeps, ora, chalk) {
  const missing = await checkDeps();
  if (missing.length === 0) {
    return;
  }

  const spinner = ora({ text: `Installing ${missing.join(', ')}...`, color: 'cyan' }).start();
  const result = await installDeps(missing, {
    onProgress: (message) => {
      spinner.text = message;
    },
  });

  if (!result.success) {
    spinner.fail(chalk.red(`Auto-install failed: ${result.error}`));
    console.error(chalk.dim(`  Install manually: brew install ${missing.join(' ')}\n`));
    process.exit(1);
  }

  spinner.succeed(chalk.green(`Installed ${missing.join(', ')}`));
}

function printSummary(chalk, inputSize, inputMeta, outputSize, outputMeta, outPath) {
  console.log('');
  console.log(`  ${chalk.dim('Input:')}  ${Math.round(inputSize / 1024)} KB ${chalk.dim('|')} ${inputMeta} metadata fields`);
  console.log(`  ${chalk.dim('Output:')} ${chalk.green(`${Math.round(outputSize / 1024)} KB`)} ${chalk.dim('|')} ${chalk.green(`${outputMeta} metadata fields`)}`);
  console.log(`  ${chalk.dim('Saved:')}  ${chalk.cyan(outPath)}`);
  console.log('');
}

async function cleanFromCli(input, options, services) {
  const {
    chalk,
    ora,
    cleanImage,
    checkDeps,
    getMetadataCount,
    getFileSize,
    installDeps,
  } = services;
  const inputPath = resolve(input);

  await ensureInputExists(inputPath, chalk);
  await ensureDependencies(checkDeps, installDeps, ora, chalk);

  const spinner = ora({ color: 'magenta' }).start();
  const inputSize = await getFileSize(inputPath);
  const inputMeta = await getMetadataCount(inputPath);

  try {
    const outPath = await cleanImage(inputPath, {
      quality: parseInt(options.quality, 10),
      aggressive: options.aggressive || false,
      stripOnly: options.stripOnly || false,
      output: options.output ? resolve(options.output) : null,
      onProgress: (message) => {
        spinner.text = message;
      },
    });

    const outputSize = await getFileSize(outPath);
    const outputMeta = await getMetadataCount(outPath);

    spinner.succeed(chalk.green('Cleaned!'));
    printSummary(chalk, inputSize, inputMeta, outputSize, outputMeta, outPath);
  } catch (error) {
    spinner.fail(chalk.red('Failed'));
    console.error(chalk.red(`\n  ${error.message}\n`));
    process.exit(1);
  }
}

async function main() {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const { Command } = await import('commander');
  const {
    cleanImage,
    checkDeps,
    getMetadataCount,
    getFileSize,
    installDeps,
  } = await import('../src/cleaner.js');
  const { runTUI } = await import('../src/tui.js');

  const program = new Command();

  program
    .name('clean-image')
    .description('Strip AI detection metadata from images. Zero evidence.')
    .version(VERSION)
    .argument('[input]', 'Input image file')
    .option('-q, --quality <number>', 'JPEG quality 1-100', '92')
    .option('-s, --strip-only', 'Only strip metadata, no re-encoding')
    .option('-a, --aggressive', 'Gaussian blur + full pipeline for pixel fingerprint defeat')
    .option('-o, --output <file>', 'Output file path')
    .action(async (input, options) => {
      if (!input) {
        await runTUI();
        return;
      }

      await cleanFromCli(input, options, {
        chalk,
        ora,
        cleanImage,
        checkDeps,
        getMetadataCount,
        getFileSize,
        installDeps,
      });
    });

  await program.parseAsync();
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
