# clean-image

**Strip every trace of AI from your images. One command. Zero evidence.**

---

> "The best metadata is no metadata."

---

## The problem

Every AI image generator — Midjourney, DALL-E, Stable Diffusion, Flux, Adobe Firefly — embeds invisible fingerprints into your images. EXIF tags, XMP markers, C2PA Content Credentials, PNG text chunks, ICC profiles, pixel-level signatures. Platforms like Twitter/X, Facebook, and Adobe's Content Authenticity Initiative read these markers and **label your images as AI-generated**.

Existing tools strip *some* metadata. They miss the rest. A single leftover `APP1` marker or a C2PA manifest buried in a JFIF segment is enough to flag you.

**clean-image** doesn't just strip metadata. It **destroys and rebuilds** the image from the ground up. Four-pass pipeline. Two re-encodes. Two nuclear strips. Nothing survives.

## What it kills

| Metadata Type | Embedded By | Detected By | Removed |
|---|---|---|---|
| EXIF (software, AI tool tags) | All generators | Most platforms | **Yes** |
| XMP (Adobe AI tags, `ai:generative`) | Adobe, Midjourney | Twitter/X, Facebook | **Yes** |
| IPTC (`digitalSourceType`) | News tools, Adobe | News platforms, AP | **Yes** |
| C2PA / Content Credentials | Adobe, OpenAI, Google | Twitter/X, Adobe CAI | **Yes** |
| PNG text chunks (parameters, prompt) | ComfyUI, A1111, SD | Detection tools | **Yes** |
| ICC color profiles | Various | Forensic tools | **Yes** |
| JFIF/APP markers | JPEG encoders | Forensic tools | **Yes** |
| Pixel-level AI fingerprints | Generators | Advanced detection | **Yes** (aggressive mode) |

## Install

```bash
npm install -g clean-image
```

Or run it directly without installing:

```bash
npx clean-image
```

**System dependencies** (required):

```bash
# macOS
brew install exiftool ffmpeg

# Ubuntu/Debian
sudo apt install exiftool ffmpeg

# Arch
sudo pacman -S perl-image-exiftool ffmpeg
```

## Usage

### Interactive TUI

Just run it with no arguments — you get a full interactive terminal UI:

```bash
clean-image
```

```
  clean-image
  Strip AI metadata from images. Zero evidence.

  ✓ Dependencies OK

  ? Select image or enter path:
  ❯ ai-art.png
    photo.webp
    render.jpg
    ──────────
    Enter path manually...

  ? Cleaning mode:
  ❯ Standard      — 4-pass strip + re-encode
    Aggressive    — + gaussian blur to defeat pixel fingerprints
    Strip only    — metadata removal, no re-encoding

  ? JPEG quality:
    95  — highest quality, larger file
  ❯ 92  — recommended
    85  — good balance
    75  — smaller file

  ⠋ Pass 3/4 — FFmpeg re-encode #2

  ✓ Cleaned!

  ┌─────────────────────────────────────────┐
  │  Results                                │
  ├─────────────────────────────────────────┤
  │  Mode:     standard                     │
  │  Input:    2847 KB | 43 metadata fields │
  │  Output:   1923 KB | 5 metadata fields  │
  │  Saved to: ./ai-art-clean.jpg           │
  └─────────────────────────────────────────┘
```

### Direct CLI

```bash
# Basic — convert any image to a clean JPEG
clean-image photo.png

# Specify output path
clean-image photo.png -o output.jpg

# Lower quality for smaller file size
clean-image -q 85 photo.webp

# Aggressive mode — also defeats pixel-level AI fingerprinting
clean-image -a photo.png

# Strip metadata only — no re-encoding, keeps original format
clean-image -s photo.jpg
```

### Programmatic

```js
import { cleanImage, checkDeps } from 'clean-image';

// Check dependencies
const missing = await checkDeps();
if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`);

// Clean an image
const outputPath = await cleanImage('input.png', {
  quality: 92,
  aggressive: true,
  onProgress: (msg) => console.log(msg),
});
```

## The pipeline

clean-image doesn't do one thing — it does **four things**, because no single tool catches everything:

```
Input Image
    │
    ▼
┌─────────────────────────────────┐
│  Pass 1: FFmpeg Re-encode       │  Strips most metadata by default.
│  -map_metadata -1               │  Changes pixel structure.
│  +bitexact flags                │  Destroys C2PA manifests.
│  (+ gaussian blur in -a mode)   │  Defeats pixel fingerprints.
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Pass 2: ExifTool Nuclear Strip │  Catches everything FFmpeg missed.
│  -all= -overwrite_original      │  XMP, IPTC, residual EXIF.
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Pass 3: FFmpeg Re-encode #2    │  Clean JPEG structure from scratch.
│  Same flags as Pass 1           │  Removes residual APP markers.
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Pass 4: ExifTool Final Strip   │  Paranoia pass.
│  -all= -overwrite_original      │  If anything survived, it's gone now.
└─────────────────────────────────┘
    │
    ▼
Clean JPEG — zero AI fingerprints
```

## Options

| Flag | Description | Default |
|---|---|---|
| `-q, --quality <n>` | JPEG quality (1-100) | `92` |
| `-s, --strip-only` | Strip metadata only, no re-encoding | `false` |
| `-a, --aggressive` | Gaussian blur (σ=0.3) + full pipeline | `false` |
| `-o, --output <file>` | Output file path | `<input>-clean.jpg` |
| `-h, --help` | Show help | — |
| `-V, --version` | Show version | — |
| *(no args)* | Launch interactive TUI | — |

## Modes

| Mode | Command | What it does | Best for |
|---|---|---|---|
| **Standard** | `clean-image photo.png` | 4-pass strip + re-encode | Most use cases |
| **Aggressive** | `clean-image -a photo.png` | Standard + imperceptible blur (σ=0.3) | Defeating pixel-level detection |
| **Strip only** | `clean-image -s photo.jpg` | Metadata removal, no re-encoding | Exact pixel preservation |
| **Interactive** | `clean-image` | Full TUI with prompts | When you want guidance |

## Claude Code skill

clean-image ships as a Claude Code slash command:

```
/clean-image photo.png
/clean-image -a --quality 85 photo.webp
```

Install the skill:

```bash
# From the repo
cp .claude/commands/clean-image.md ~/.claude/commands/

# Or just clone and it works in-project
git clone https://github.com/NiladriHazra/clean-image.git
```

## License

MIT

---

**If your images are getting flagged, they shouldn't be.** What you create is yours. clean-image makes sure it stays that way.
