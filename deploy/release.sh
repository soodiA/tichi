#!/bin/bash
# Deploy one release on the VM. Called by the GitHub Actions workflow (and usable by hand).
#   release.sh <version> <dist-dir>        e.g. release.sh v1.0.42 ./dist
# - frontend: copied to /srv/tichi/releases/<version>, /srv/tichi/web switched atomically
# - backend:  image tichi-api:<version> built from ../backend, compose recreated with it
# - smoke check afterwards; on failure the previous version is restored and the script exits 1
set -euo pipefail

VERSION=${1:?version}; DIST=${2:?dist dir}
HERE=$(cd "$(dirname "$0")" && pwd)
DATA=/srv/tichi
ENVF=$DATA/.env
REL=$DATA/releases
[[ $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.]+)?$ ]] || { echo "bad version $VERSION"; exit 2; }
[ -f "$DIST/index.html" ] || { echo "$DIST/index.html missing"; exit 2; }

PREV_VERSION=$(grep ^TICHI_VERSION= $ENVF | cut -d= -f2)
PREV_WEB=$(readlink $DATA/web 2>/dev/null || true)
compose() { sudo docker compose -f "$HERE/compose.yml" --env-file $ENVF "$@"; }
setver() { sed -i "s|^TICHI_VERSION=.*|TICHI_VERSION=$1|" $ENVF; }

rollback() {
  echo "!! smoke check failed, rolling back to ${PREV_VERSION}" >&2
  [ -n "$PREV_WEB" ] && ln -sfn "$PREV_WEB" $DATA/web.new && mv -Tf $DATA/web.new $DATA/web
  setver "$PREV_VERSION"
  compose up -d --no-build api || true
  rm -rf "$REL/$VERSION"
  sudo docker rmi "tichi-api:$VERSION" >/dev/null 2>&1 || true
}

# 1. frontend into its own versioned folder
rm -rf "$REL/$VERSION"; mkdir -p "$REL/$VERSION"
cp -a "$DIST/." "$REL/$VERSION/"
echo "$VERSION" > "$REL/$VERSION/version.txt"

# 2. backend image, tagged with the version
setver "$VERSION"
TICHI_VERSION=$VERSION compose build api
compose up -d db
compose up -d --no-build api

# 3. wait for health, then flip the web root atomically
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:8080/healthz >/dev/null 2>&1 && break; sleep 1; [ $i = 30 ] && { rollback; exit 1; }; done
ln -sfn "$REL/$VERSION" $DATA/web.new && mv -Tf $DATA/web.new $DATA/web

# 4. smoke: API serves a non-empty curriculum and the new frontend is what nginx serves
units=$(curl -fsS http://127.0.0.1:8080/api/v1/curriculum | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["units"]))' 2>/dev/null || echo 0)
web=$(curl -fsS http://127.0.0.1:8081/version.txt 2>/dev/null || echo none)
if [ "$units" -lt 1 ] || [ "$web" != "$VERSION" ]; then echo "units=$units web=$web want=$VERSION" >&2; rollback; exit 1; fi

# 5. prune: keep the 5 newest release folders and image tags
ls -1dt $REL/*/ | tail -n +6 | xargs -r rm -rf
sudo docker images tichi-api --format '{{.Tag}} {{.CreatedAt}}' | sort -k2 -r | awk 'NR>5{print $1}' | grep -v "^$VERSION$" | xargs -r -I{} sudo docker rmi tichi-api:{} >/dev/null 2>&1 || true
echo "deployed $VERSION (units=$units)"
