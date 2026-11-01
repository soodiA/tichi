#!/bin/bash
# Idempotent nginx install + Tichi proxy snippet + the HTTP test vhost (127.0.0.1:8081 only).
# setup-tls.sh later swaps in the public TLS vhost.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx
# On this image the temp dirs came up owned by "nobody" while workers run as www-data, so any
# upload larger than the in-memory buffer (16 KB) failed with a 500 (open() ... Permission denied).
sudo chown -R www-data:root /var/lib/nginx/body /var/lib/nginx/proxy /var/lib/nginx/fastcgi /var/lib/nginx/uwsgi /var/lib/nginx/scgi 2>/dev/null || true
sudo mkdir -p /etc/nginx/snippets
sudo cp "$HERE/nginx-snippet-proxy.conf" /etc/nginx/snippets/tichi-proxy.conf
sudo cp "$HERE/nginx-tichi.conf" /etc/nginx/sites-available/tichi
sudo ln -sf /etc/nginx/sites-available/tichi /etc/nginx/sites-enabled/tichi
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
