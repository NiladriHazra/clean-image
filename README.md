# clean-image

CLI tool to strip AI detection metadata from images and convert to clean JPEGs.

Removes all EXIF, XMP, IPTC, C2PA/Content Credentials, and other metadata that platforms like Twitter/X use to detect and label AI-generated images.

## Install

```bash
# Install dependencies
brew install exiftool ffmpeg

# Option 1: Clone and symlink
git clone https://github.com/YOUR_USERNAME/clean-image.git
chmod +x clean-image/clean-image
ln -s "$(pwd)/clean-image/clean-image" /usr/local/bin/clean-image

# Option 2: Just download the script
curl -o /usr/local/bin/clean-image https://raw.githubusercontent.com/YOUR_USERNAME/clean-image/main/clean-image
chmod +x /usr/local/bin/clean-image
```

## Usage

```bash
# Basic: convert to clean JPEG
clean-image photo.png

# Specify output
clean-image photo.png output.jpg

# Lower quality (smaller file)
clean-image -q 85 photo.webp

# Aggressive mode (also disrupts pixel-level fingerprinting)
clean-image -a photo.png

# Just strip metadata without re-encoding
clean-image -s photo.jpg
```

## What it removes

| Metadata Type | Used By | Removed? |
|---|---|---|
| EXIF (software, AI tool) | Most platforms | Yes |
| XMP (Adobe AI tags) | Twitter/X, Facebook | Yes |
| IPTC (digital source type) | News platforms | Yes |
| C2PA / Content Credentials | Twitter/X, Adobe | Yes |
| PNG text chunks (SD params) | Detection tools | Yes |
| ICC profiles | - | Yes |

## How it works

1. **Re-encodes** the image through ffmpeg (strips most metadata and changes pixel structure)
2. **Nuclear strip** with exiftool (catches anything ffmpeg missed)
3. **Second re-encode** to ensure clean JPEG structure (removes residual APP markers)
4. **Final strip** for paranoia

The aggressive mode (`-a`) also applies an imperceptible gaussian blur (sigma=0.3) to disrupt pixel-level AI fingerprinting.

## Dependencies

- [exiftool](https://exiftool.org/) - metadata manipulation
- [ffmpeg](https://ffmpeg.org/) - image re-encoding

## License

MIT
