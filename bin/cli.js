#!/usr/bin/env node

import { resolve } from 'node:path';
import { access } from 'node:fs/promises';

async function main() {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const { Command } = await import('commander');
  const { cleanImage, checkDeps, getMetadataCount, getFileSize } = await import('../src/cleaner.js');
  const { runTUI } = await import('../src/tui.js');

  const program = new Command();

  program
    .name('clean-image')
    .description('Strip AI detection metadata from images. Zero evidence.')
    .version('1.0.0')
    .argument('[input]', 'Input image file')
    .option('-q, --quality <number>', 'JPEG quality 1-100', '92')
    .option('-s, --strip-only', 'Only strip metadata, no re-encoding')
    .option('-a, --aggressive', 'Gaussian blur + full pipeline for pixel fingerprint defeat')
    .option('-o, --output <file>', 'Output file path')
    .action(async (input, opts) => {
      // No input = launch TUI
      if (!input) {
        await runTUI();
        return;
      }

      const inputPath = resolve(input);

      // Verify file exists
      try {
        await access(inputPath);
      } catch {
        console.error(chalk.red(`\n  File not found: ${inputPath}\n`));
        process.exit(1);
      }

      // Check deps
      const missing = await checkDeps();
      if (missing.length > 0) {
        console.error(chalk.red(`\n  Missing dependencies: ${missing.join(', ')}`));
        console.error(chalk.dim(`  Install with: brew install ${missing.join(' ')}\n`));
        process.exit(1);
      }

      // Run
      const spinner = ora({ color: 'magenta' }).start();
      const inputSize = await getFileSize(inputPath);
      const inputMeta = await getMetadataCount(inputPath);

      try {
        const outPath = await cleanImage(inputPath, {
          quality: parseInt(opts.quality, 10),
          aggressive: opts.aggressive || false,
          stripOnly: opts.stripOnly || false,
          output: opts.output ? resolve(opts.output) : null,
          onProgress: (msg) => { spinner.text = msg; },
        });

        const outputSize = await getFileSize(outPath);
        const outputMeta = await getMetadataCount(outPath);

        spinner.succeed(chalk.green('Cleaned!'));
        console.log('');
        console.log(`  ${chalk.dim('Input:')}  ${Math.round(inputSize / 1024)} KB ${chalk.dim('|')} ${inputMeta} metadata fields`);
        console.log(`  ${chalk.dim('Output:')} ${chalk.green(Math.round(outputSize / 1024) + ' KB')} ${chalk.dim('|')} ${chalk.green(outputMeta + ' metadata fields')}`);
        console.log(`  ${chalk.dim('Saved:')}  ${chalk.cyan(outPath)}`);
        console.log('');
      } catch (err) {
        spinner.fail(chalk.red('Failed'));
        console.error(chalk.red(`\n  ${err.message}\n`));
        process.exit(1);
      }
    });

  program.parse();
}

main();
