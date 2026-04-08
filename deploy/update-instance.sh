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

healthy=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health; then
    healthy=1
    break
  fi

  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  systemctl --no-pager --full status clean-image || true
  exit 1
fi

curl -fsS http://127.0.0.1/api/dependencies
