# clean-image

`clean-image` is organized as two top-level apps:

- `cli/` contains the original Node.js CLI and TUI workflow
- `web/` contains the Next.js app and local processing routes

The web UI follows the Vercel-inspired design system in `web/DESIGN.md`.

## Architecture

### `cli/`

- Entry point: `cli/bin/cli.js`
- Runtime: Node.js
- Includes:
  - command-line image cleaning
  - interactive TUI flow
  - dependency checks and optional install helpers

### `web/`

- Framework: Next.js 16 App Router
- Structure: official `create-next-app` layout
- Feature UI: `web/features/clean-image/components/`
- Shared client contracts: `web/lib/clean-image/`
- Server processing pipeline: `web/lib/server/cleaner/`
- Responsibilities:
  - Upload UX
  - Mode and quality controls
  - Runtime health and dependency checks
  - Same-origin route handlers for processing and downloads
  - Local file cleaning pipeline

The Next.js pipeline preserves the original behavior:

1. FFmpeg re-encode
2. ExifTool strip
3. FFmpeg re-encode
4. ExifTool final strip

`strip-only` mode removes metadata without re-encoding.

## Local development

### 1. Install dependencies

```bash
npm install --prefix cli
bun install --cwd web
```

### 2. Start the app

```bash
bun --cwd web dev
```

Default URL:

```text
http://127.0.0.1:3000
```

## Commands

```bash
npm --prefix cli start
bun --cwd web dev
bun --cwd web build
bun --cwd web lint
```

## System dependencies

The Next.js processing routes require:

- `ffmpeg`
- `exiftool`

macOS:

```bash
brew install ffmpeg exiftool
```

Ubuntu / Debian:

```bash
sudo apt-get install -y ffmpeg libimage-exiftool-perl
```

## Notes

- `cli/` and `web/` now coexist again.
- `web/app/api/health`, `web/app/api/dependencies`, `web/app/api/clean`, and `web/app/api/download/[artifactId]` are the runtime endpoints.
