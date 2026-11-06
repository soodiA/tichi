#!/bin/bash
# Origin mode for when a CDN fronts tichikids.ir and terminates TLS: nginx serves HTTP on :80 and ufw lets
# ONLY the CDN edge addresses reach it. (Use setup-tls.sh instead if the domain points straight at this VM.)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
EDGES="${CDN_EDGES:-95.156.253.236 95.156.253.237 95.156.253.225}"
sudo cp "$HERE/nginx-tichi-cdn.conf" /etc/nginx/sites-available/tichi
sudo ln -sf /etc/nginx/sites-available/tichi /etc/nginx/sites-enabled/tichi
sudo nginx -t
sudo systemctl reload nginx
for ip in $EDGES; do sudo ufw allow from "$ip" to any port 80 proto tcp comment "tichi CDN edge"; done
sudo ufw status
