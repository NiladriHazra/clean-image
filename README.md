<p align="center">
  <img src="https://img.shields.io/npm/v/clean-image?style=flat-square&color=ff8c00" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/clean-image?style=flat-square&color=ff3300" alt="downloads" />
  <img src="https://img.shields.io/badge/license-MIT-ffde00?style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D16-green?style=flat-square" alt="node" />
</p>

<h1 align="center">
  <br>
  clean-image
  <br>
</h1>

<h4 align="center">Strip every trace of AI from your images. One command. Zero evidence.</h4>

<p align="center">
  <a href="#install">Install</a> &nbsp;&bull;&nbsp;
  <a href="#usage">Usage</a> &nbsp;&bull;&nbsp;
  <a href="#the-pipeline">How it works</a> &nbsp;&bull;&nbsp;
  <a href="#cli-skills">CLI Skills</a> &nbsp;&bull;&nbsp;
  <a href="#api">API</a>
</p>

<br>

<table>
<tr>
<td>

### The problem

Every AI image generator embeds invisible fingerprints into your images. EXIF tags, XMP markers, C2PA Content Credentials, PNG text chunks, pixel-level signatures. Platforms like Twitter/X, Facebook, and Adobe read these markers and **label your images as AI-generated**.

Existing tools only strip *some* metadata. A single leftover `APP1` marker or a C2PA manifest buried in a JFIF segment is enough to flag you.

### The solution

**clean-image** does not just strip metadata. It **destroys and rebuilds** the image from the ground up. Four-pass pipeline. Two re-encodes. Two nuclear strips. Nothing survives.

`ExifTool alone` misses embedded C2PA manifests and PNG text chunks.
`FFmpeg alone` misses residual XMP and IPTC tags.
`Online tools` re-compress at garbage quality and keep your images.

**clean-image runs all four passes because no single tool catches everything.**

</td>
</tr>
</table>

<br>

<br>

## What it kills

| Metadata | Embedded by | Detected by | Killed? |
|:---|:---|:---|:---:|
| EXIF (software, AI tool tags) | All generators | Most platforms | **Yes** |
| XMP (`ai:generative`, creator tools) | Adobe, Midjourney | Twitter/X, Facebook | **Yes** |
| IPTC (`digitalSourceType`) | News tools, Adobe | AP, Reuters | **Yes** |
| C2PA / Content Credentials | Adobe, OpenAI, Google | Twitter/X, Adobe CAI | **Yes** |
| PNG text chunks (prompt, params) | ComfyUI, A1111, SD | Detection tools | **Yes** |
| ICC color profiles | Various | Forensic tools | **Yes** |
| JFIF / APP markers | JPEG encoders | Forensic tools | **Yes** |
| Pixel-level AI fingerprints | Generators | Advanced detection | **Yes**\* |

<sub>\* Aggressive mode only: applies imperceptible gaussian blur (σ=0.3)</sub>

<br>

## Install

```bash
npm install -g clean-image
```

Or run without installing:

```bash
npx clean-image
```

<details>
<summary><strong>System dependencies</strong> (required)</summary>

<br>

| Platform | Command |
|:---|:---|
| macOS | `brew install exiftool ffmpeg` |
| Ubuntu / Debian | `sudo apt install exiftool ffmpeg` |
| Arch | `sudo pacman -S perl-image-exiftool ffmpeg` |
| Windows (WSL) | `sudo apt install exiftool ffmpeg` |

</details>

<br>

## Usage

### Interactive TUI

Run with no arguments to launch the interactive terminal UI:

```bash
clean-image
```

```
    ██████╗██╗     ███████╗ █████╗ ███╗   ██╗
   ██╔════╝██║     ██╔════╝██╔══██╗████╗  ██║
   ██║     ██║     █████╗  ███████║██╔██╗ ██║
   ██║     ██║     ██╔══╝  ██╔══██║██║╚██╗██║
   ╚██████╗███████╗███████╗██║  ██║██║ ╚████║
    ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
    ██╗███╗   ███╗ █████╗  ██████╗ ███████╗
    ██║████╗ ████║██╔══██╗██╔════╝ ██╔════╝
    ██║██╔████╔██║███████║██║  ███╗█████╗
    ██║██║╚██╔╝██║██╔══██║██║   ██║██╔══╝
    ██║██║ ╚═╝ ██║██║  ██║╚██████╔╝███████╗
    ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝

    Strip AI metadata. Four passes. Zero trace.

  ? What do you want to do?
  ❯ ● Clean an image       : strip AI metadata now
    ● Install CLI skill    : add to Claude / Codex / OpenCode
```

Features:
- **Auto-detects images** in your current directory
- **Drag & drop** any image file into the terminal
- **Choose mode**: Standard, Aggressive, or Strip-only
- **Pick quality**: 95, 92, 85, or 75
- **Before/after report**: file size, metadata count, % reduction

### Direct CLI

```bash
# Basic: clean any image
clean-image photo.png

# Aggressive: defeats pixel-level fingerprinting
clean-image -a photo.png

# Custom quality
clean-image -q 85 photo.webp

# Custom output path
clean-image photo.png -o clean.jpg

# Strip metadata only: no re-encoding
clean-image -s photo.jpg
```

### See it work

```
$ clean-image -a ai-artwork.png

  ⠸ Pass 1/4 — FFmpeg re-encode
  ⠸ Pass 2/4 — ExifTool nuclear strip
  ⠸ Pass 3/4 — FFmpeg re-encode #2
  ⠸ Pass 4/4 — ExifTool final strip
  ✓ Done!

    RESULTS
    Mode       aggressive
    Size       2847 KB → 1923 KB (-32%)
    Metadata   43 fields → 5 fields (38 stripped)
    Output     ./ai-artwork-clean.jpg

    ✓ Zero AI fingerprints remain.
```

<br>

## The pipeline

1. **Pass 1: FFmpeg re-encode**
   Re-encodes with `-map_metadata -1` and `+bitexact` flags. In aggressive mode it also applies a tiny gaussian blur to break pixel fingerprints.

2. **Pass 2: ExifTool nuclear strip**
   Runs `-all=` to remove XMP, IPTC, residual EXIF, and other metadata FFmpeg can leave behind.

3. **Pass 3: FFmpeg re-encode #2**
   Rebuilds the output again from the stripped intermediate file to remove lingering APP markers and container-level residue.

4. **Pass 4: ExifTool final strip**
   Performs a final metadata wipe on the finished output.

Result: a clean JPEG with zero AI fingerprints.

<br>

## Options

| Flag | Description | Default |
|:---|:---|:---|
| `-q, --quality <n>` | JPEG quality (1-100) | `92` |
| `-s, --strip-only` | Strip metadata only, no re-encoding | `false` |
| `-a, --aggressive` | Gaussian blur (σ=0.3) + full pipeline | `false` |
| `-o, --output <file>` | Output file path | `<input>-clean.jpg` |
| `-h, --help` | Show help | — |
| `-V, --version` | Show version | — |
| *(no args)* | Launch interactive TUI | — |

<br>

## Modes

| Mode | Flag | What it does | Use when |
|:---|:---|:---|:---|
| **Standard** | *(default)* | 4-pass strip + re-encode | Most use cases |
| **Aggressive** | `-a` | Standard + imperceptible blur (σ=0.3) | Pixel-level detection is a concern |
| **Strip only** | `-s` | Metadata removal, no re-encoding | You need exact pixel preservation |
| **Interactive** | *(no args)* | Full TUI with guided prompts | First time using the tool |

<br>

## CLI Skills

clean-image installs as a slash command in your AI coding CLI. Run the TUI and select **"Install CLI skill"**, or install manually:

### Claude Code

```bash
cp .claude/commands/clean-image.md ~/.claude/commands/
```
Then use `/clean-image` inside Claude Code.

### Codex CLI

The skill auto-appends to `~/.codex/instructions.md` via the installer.

### OpenCode

```bash
cp .claude/commands/clean-image.md ~/.opencode/commands/
```
Then use `/clean-image` inside OpenCode.

### One-step install for all CLIs

```bash
npx clean-image   # → select "Install CLI skill" → "All of them"
```

<br>

## API

Use clean-image programmatically in your Node.js projects:

```js
import { cleanImage, checkDeps } from 'clean-image';

// Check system dependencies
const missing = await checkDeps();
if (missing.length) {
  console.error(`Missing: ${missing.join(', ')}`);
  process.exit(1);
}

// Clean an image
const output = await cleanImage('input.png', {
  quality: 92,           // JPEG quality (1-100)
  aggressive: true,      // Enable pixel-level cleaning
  stripOnly: false,      // Set true to skip re-encoding
  output: 'clean.jpg',   // Custom output path (optional)
  onProgress: (msg) => console.log(msg),
});

console.log(`Cleaned: ${output}`);
```

<br>

## How it compares

| Tool | Strips EXIF | Strips XMP | Strips C2PA | Re-encodes | Pixel cleaning | CLI + TUI |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| ExifTool | Yes | Yes | No | No | No | CLI only |
| ImageMagick | Partial | Partial | No | Yes | No | CLI only |
| Online tools | Varies | Varies | Varies | Yes | No | Web only |
| **clean-image** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Both** |

<br>

## Requirements

- **Node.js** >= 16
- **exiftool**: metadata manipulation
- **ffmpeg**: image re-encoding

<br>

## License

MIT

---

<p align="center">
  <strong>What you create is yours. clean-image makes sure it stays that way.</strong>
</p>
