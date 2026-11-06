#!/bin/bash
# Air-gap dry run on the server: a throwaway copy of the stack (db + api) on a Docker network with NO egress
# (`docker network create --internal`), plus an nginx container serving a built frontend. Production is not
# touched: separate containers, separate data dir, read-only mount of the audio folder, DB cloned with pg_dump.
#   up   <dist-dir>   start the isolated stack on 127.0.0.1:18082 and prove db/api cannot reach the internet
#   down              remove everything it created
# Then, from anywhere with Playwright:  ssh -L 18082:127.0.0.1:18082 <vm>  and
#   AIRGAP=1 BASE_URL=http://127.0.0.1:18082 ADMIN_KEY=$(ssh <vm> cat /tmp/tichi-airgap.adminkey) node e2e/smoke.mjs
#
# Does NOT prove: that the *browser* is offline (e2e/smoke.mjs with AIRGAP=1 does that by refusing to resolve
# any non-local host and failing on any request that leaves the origin), nor that the nginx container
# (the published port needs a normal bridge) has no egress - it is stock nginx and only serves static files and proxies.
set -euo pipefail
P=tichi-airgap
cmd=${1:-}
case "$cmd" in
down)
  sudo docker rm -f $P-nginx $P-api $P-db >/dev/null 2>&1 || true
  sudo docker network rm $P-int >/dev/null 2>&1 || true
  rm -f /tmp/$P.adminkey /tmp/$P-nginx.conf; echo "removed"; exit 0;;
up) ;;
*) echo "usage: $0 up <dist-dir> | down"; exit 2;;
esac
DIST=$(readlink -f "${2:?dist dir required}")
[ -f "$DIST/index.html" ] || { echo "no index.html in $DIST"; exit 1; }
"$0" down >/dev/null
ADMIN=$(openssl rand -hex 12); TOKEN=$(openssl rand -hex 24); PW=$(openssl rand -hex 12)
umask 077; echo -n "$ADMIN" > /tmp/$P.adminkey; umask 022
sudo docker network create --internal $P-int >/dev/null
sudo docker run -d --name $P-db --network $P-int -e POSTGRES_USER=tichi -e POSTGRES_PASSWORD=$PW -e POSTGRES_DB=tichi postgres:16-alpine >/dev/null
for i in $(seq 1 40); do sudo docker exec $P-db pg_isready -h 127.0.0.1 -U tichi -d tichi >/dev/null 2>&1 && break; sleep 1; done
# clone production data (read-only dump) so the curriculum is real
sudo docker exec tichi-db-1 pg_dump -U tichi -d tichi --no-owner | sudo docker exec -i $P-db psql -q -U tichi -d tichi >/dev/null
IMG=$(sudo docker inspect -f '{{.Config.Image}}' tichi-api-1)
sudo docker run -d --name $P-api --network $P-int --network-alias api -v /srv/tichi/audio:/data/audio:ro \
  -e DATABASE_URL="postgres://tichi:$PW@$P-db:5432/tichi?sslmode=disable" -e LISTEN_ADDR=0.0.0.0:8080 -e AUDIO_DIR=/data/audio \
  -e TOKEN_SECRET=$TOKEN -e ADMIN_KEY=$ADMIN -e PUBLIC_URL=http://127.0.0.1:18082 "$IMG" >/dev/null
cat > /tmp/$P-nginx.conf <<'N'
server {
  listen 80; root /usr/share/nginx/html; client_max_body_size 25m;
  location /api/ { proxy_pass http://api:8080; proxy_set_header Host $host; }
  location /audio/ { proxy_pass http://api:8080; }
  location = /healthz { proxy_pass http://api:8080; }
  location / { try_files $uri /index.html; }
}
N
sudo docker create --name $P-nginx --network $P-int -p 127.0.0.1:18082:80 \
  -v "$DIST":/usr/share/nginx/html:ro -v /tmp/$P-nginx.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine >/dev/null
sudo docker network connect bridge $P-nginx   # published port needs a normal bridge; api/db stay internal-only
sudo docker start $P-nginx >/dev/null
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:18082/healthz >/dev/null 2>&1 && break; sleep 1; done
echo "== egress proof (must fail)"
for c in $P-api $P-db; do
  if sudo docker exec $c wget -q -T 4 -O /dev/null http://1.1.1.1/ 2>/dev/null; then echo "FAIL: $c reached the internet"; exit 1; else echo "ok: $c has no egress"; fi
done
curl -fsS http://127.0.0.1:18082/healthz && echo " <- stack up on 127.0.0.1:18082; admin key in /tmp/$P.adminkey"
