#!/bin/bash
# Tichi backup: pg_dump + audio files -> zip -> 45 MB parts -> Telegram. Intended to run daily from
# cron; it only does the work when the last successful backup is >= 3 days old (a plain "*/3" cron
# day-of-month would restart at every month change).
#   backup.sh           normal run (honours the 3-day gate)
#   backup.sh --force   ignore the gate
#   backup.sh --no-upload  build the archive but do not send it (used for tests)
set -euo pipefail
umask 077

DATA=/srv/tichi
OUT=$DATA/backups
STAMP=$OUT/.last-success
KEEP=3
PART_MB=45
set -a; [ -f $DATA/.env ] && . $DATA/.env; [ -f $DATA/backup.env ] && . $DATA/backup.env; set +a

FORCE=0; UPLOAD=1
for a in "$@"; do case $a in --force) FORCE=1;; --no-upload) UPLOAD=0;; esac; done

now=$(date +%s)
if [ $FORCE = 0 ] && [ -f "$STAMP" ] && [ $((now - $(cat "$STAMP"))) -lt $((3*86400 - 3600)) ]; then
  echo "last backup is younger than 3 days, nothing to do"; exit 0
fi

tg() { # tg <method> <curl args...>
  local m=$1; shift
  curl -sS --max-time 600 "https://api.telegram.org/bot${BOT_TOKEN}/$m" "$@"
}

ts=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$OUT"; chmod 700 "$OUT"
work=$(mktemp -d "$OUT/.work.XXXXXX")
trap 'rm -rf "$work"' EXIT

# 1. consistent DB dump (custom format; restore with pg_restore)
docker exec tichi-db-1 pg_dump -U tichi -d tichi -Fc > "$work/tichi-db.dump"
[ -s "$work/tichi-db.dump" ] || { echo "empty dump"; exit 1; }

# 2. static content: uploaded audio/images + the currently deployed web build (small)
tar -C $DATA -cf "$work/tichi-files.tar" audio
[ -L $DATA/web ] && tar -C $DATA -chf "$work/tichi-web.tar" web

# 3. one zip, then split for Telegram's 50 MB bot limit
cat > "$work/MANIFEST.txt" <<M
tichi backup $ts
host: $(hostname)
version: ${TICHI_VERSION:-unknown}
db rows: profiles=$(docker exec tichi-db-1 psql -U tichi -d tichi -Atc 'select count(*) from profiles') questions=$(docker exec tichi-db-1 psql -U tichi -d tichi -Atc 'select count(*) from questions')
audio files: $(find $DATA/audio -type f | wc -l)
restore: unzip, then deploy/restore.sh <dump> <files.tar>
M
zip="$OUT/tichi-backup-$ts.zip"
( cd "$work" && zip -q -0 "$zip" MANIFEST.txt tichi-db.dump tichi-files.tar $( [ -f tichi-web.tar ] && echo tichi-web.tar ) )
sha256sum "$zip" > "$zip.sha256"
size=$(stat -c %s "$zip")
echo "created $zip ($size bytes)"

# 4. upload
if [ $UPLOAD = 1 ]; then
  : "${BOT_TOKEN:?BOT_TOKEN missing in $DATA/backup.env}" "${CHAT_ID:?CHAT_ID missing in $DATA/backup.env}"
  parts=("$zip")
  if [ "$size" -gt $((PART_MB*1024*1024)) ]; then
    split -b ${PART_MB}M -d "$zip" "$zip.part"
    parts=("$zip".part??)
  fi
  n=${#parts[@]}; i=0
  for p in "${parts[@]}"; do
    i=$((i+1))
    resp=$(tg sendDocument -F chat_id="$CHAT_ID" -F document=@"$p" -F caption="Tichi backup $ts — part $i/$n ($(du -h "$p" | cut -f1))")
    echo "$resp" | grep -q '"ok":true' || { echo "telegram upload failed: $resp" >&2; exit 1; }
  done
  [ "$n" -gt 1 ] && tg sendMessage -d chat_id="$CHAT_ID" --data-urlencode "text=Tichi backup $ts: $n parts. Join with: cat tichi-backup-$ts.zip.part* > tichi-backup-$ts.zip   (sha256: $(cut -d' ' -f1 "$zip.sha256"))" >/dev/null
  rm -f "$zip".part??
fi

date +%s > "$STAMP"
# keep the newest $KEEP archives on disk
ls -1t "$OUT"/tichi-backup-*.zip 2>/dev/null | tail -n +$((KEEP+1)) | while read -r f; do rm -f "$f" "$f.sha256"; done
echo "backup ok"
