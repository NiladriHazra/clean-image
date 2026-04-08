#!/bin/bash
set -euxo pipefail

export HOME=/root
export BUN_INSTALL=/root/.bun
export PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export NODE_OPTIONS=--max-old-space-size=768

cd /opt/clean-image
git fetch origin main
git checkout main
git pull --ff-only origin main

cd /opt/clean-image/web
bun install
bun run build
systemctl restart clean-image

curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1/api/dependencies
