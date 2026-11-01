#!/bin/bash
# Obtain the Let's Encrypt certificate (HTTP-01, webroot) and switch nginx to the TLS vhost,
# then open exactly 80 and 443 in ufw. Requires tichikids.ir to resolve to this VM first.
set -euo pipefail
DOM=tichikids.ir
HERE=$(cd "$(dirname "$0")" && pwd)
MYIP=$(curl -fsS https://api.ipify.org)
RES=$(dig +short A $DOM @1.1.1.1 | sort | tr '\n' ' ')
[ "$RES" = "$MYIP " ] || { echo "DNS check failed: $DOM -> '$RES' but this VM is $MYIP. Fix the A record first." >&2; exit 1; }

sudo apt-get install -y -qq certbot
sudo mkdir -p /var/www/acme
# temporary port-80-only vhost to answer the challenge
sudo tee /etc/nginx/sites-available/tichi-acme >/dev/null <<CONF
server { listen 80; server_name $DOM www.$DOM; location /.well-known/acme-challenge/ { root /var/www/acme; } location / { return 404; } }
CONF
sudo ln -sf /etc/nginx/sites-available/tichi-acme /etc/nginx/sites-enabled/tichi-acme
sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow 80/tcp
sudo certbot certonly --webroot -w /var/www/acme -d $DOM --non-interactive --agree-tos -m "${LE_EMAIL:?set LE_EMAIL}" --deploy-hook "systemctl reload nginx"
sudo rm -f /etc/nginx/sites-enabled/tichi-acme /etc/nginx/sites-available/tichi-acme
sudo cp "$HERE/nginx-tichi-tls.conf" /etc/nginx/sites-available/tichi
sudo sed -i 's/server_name tichikids.ir www.tichikids.ir;/server_name tichikids.ir;/' /etc/nginx/sites-available/tichi
sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow 443/tcp
sudo certbot renew --dry-run
echo "TLS live on https://$DOM"
