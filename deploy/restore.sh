#!/bin/bash
# Restore a Tichi backup. usage: restore.sh <tichi-db.dump> <tichi-files.tar> [target-db]
# Restores into target-db (default: tichi) — DROPS and recreates its contents — and unpacks audio/ into /srv/tichi.
set -euo pipefail
DUMP=${1:?dump file}; FILES=${2:?files tar}; DB=${3:-tichi}
docker exec -i tichi-db-1 psql -U tichi -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DB\"" -c "CREATE DATABASE \"$DB\""
docker exec -i tichi-db-1 pg_restore -U tichi -d "$DB" --no-owner < "$DUMP"
if [ "$DB" = tichi ]; then tar -C /srv/tichi -xf "$FILES"; fi
echo "restored db=$DB"
