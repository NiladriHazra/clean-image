#!/bin/bash
exec > >(tee /var/log/clean-image-user-data.log | logger -t clean-image-user-data -s 2>/dev/console) 2>&1
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive
export HOME=/root

if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update -y
apt-get install -y ca-certificates curl ffmpeg git libimage-exiftool-perl nginx unzip

curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL=/root/.bun
export PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export NODE_OPTIONS=--max-old-space-size=768

rm -rf /opt/clean-image
git clone --depth 1 https://github.com/NiladriHazra/clean-image.git /opt/clean-image

cd /opt/clean-image/web
bun install
bun run build

cat > /etc/systemd/system/clean-image.service <<'EOF'
[Unit]
Description=clean-image web app
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/clean-image/web
Environment=HOME=/root
Environment=PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PORT=3000
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=768
ExecStart=/root/.bun/bin/bun run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nginx/sites-available/clean-image <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/clean-image /etc/nginx/sites-enabled/clean-image
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl daemon-reload
systemctl enable clean-image nginx
systemctl restart nginx
systemctl restart clean-image

until curl -fsS http://127.0.0.1:3000/api/health; do
  sleep 2
done

curl -fsS http://127.0.0.1:3000/api/dependencies
curl -fsS http://127.0.0.1/api/health
