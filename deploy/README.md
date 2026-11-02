# Tichi — server runbook

Everything runs on one VM (`tichiweb`, Ubuntu 24.04). Public entry is nginx only; Postgres and the Go API
listen on 127.0.0.1. All persistent data are plain folders under `/srv/tichi` (bind mounts), so
`docker system prune` / `docker volume prune` cannot touch them.

| Path | What |
|---|---|
| `/srv/tichi/postgres` | Postgres data directory |
| `/srv/tichi/audio` | uploaded/recorded audio + images (served at `/audio/...`) |
| `/srv/tichi/releases/<version>` | built frontends, `/srv/tichi/web` points at the live one |
| `/srv/tichi/backups` | local copies of the last 3 backups (0700) |
| `/srv/tichi/.env` | secrets (0600): `POSTGRES_PASSWORD`, `TOKEN_SECRET`, `ADMIN_KEY`, `PUBLIC_URL`, `TICHI_VERSION`, `CORS_ORIGINS` |
| `/srv/tichi/backup.env` | `BOT_TOKEN`, `CHAT_ID` for the Telegram backup upload (0600) |

## Pieces (all scripts idempotent, in this folder)
1. `harden.sh` — SSH keys only, ufw (22 only), fail2ban, unattended upgrades.
2. `install-docker.sh` — Docker CE + registry mirror (Docker Hub is blocked from this network) + data dirs.
3. `setup-nginx.sh` — nginx + proxy snippet + local test vhost (`127.0.0.1:8081`).
4. `setup-tls.sh` — Let's Encrypt (webroot) for `tichikids.ir`, switches to `nginx-tichi-tls.conf`, opens 80 and 443. Refuses to run until DNS points at this VM.
5. `setup-runner.sh` — registers the GitHub Actions self-hosted runner (label `tichi`).
6. `compose.yml` — db + api.   `release.sh` — versioned deploy with automatic rollback.
7. `backup.sh` / `restore.sh` / `cron-tichi-backup` — pg_dump + audio + web → zip → Telegram every 3 days.
8. `ci-test.sh` (backend tests on a throwaway Postgres), `build-web.sh` (pnpm build in a node container).

## Deploy flow
Push to `main` → `.github/workflows/deploy.yml` on the VM runner: backend tests → `pnpm` build →
`release.sh vMAJOR.MINOR.RUN` → health + smoke check (rolls back to the previous version on failure) → git tag
`vMAJOR.MINOR.RUN`. `MAJOR.MINOR` lives in `deploy/VERSION`; `RUN` is the workflow run number.
Manual rollback: `ln -sfn /srv/tichi/releases/<old> /srv/tichi/web`, set `TICHI_VERSION=<old>` in `.env`,
`docker compose -f deploy/compose.yml --env-file /srv/tichi/.env up -d --no-build api`.

## Backup / restore
`sudo /srv/tichi/bin/backup.sh --force` makes a zip now (add `--no-upload` to skip Telegram).
Restore drill: unzip, then `restore.sh tichi-db.dump tichi-files.tar [target-db]` (a target db other than
`tichi` restores only the database, which is how it was rehearsed).

## Cut-over from Supabase (do in this order)
1. DNS: `tichikids.ir` A record → this VM; run `setup-tls.sh`.
2. Set `PUBLIC_URL=https://tichikids.ir` and `CORS_ORIGINS=https://soodia.github.io` in `/srv/tichi/.env`, redeploy api.
3. Announce a short freeze (kids' progress made on the old app after the import is NOT carried over).
4. Run the importer: `tichi-import -mode all` with `SUPABASE_DB_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`, `PUBLIC_URL`.
5. Build the GitHub Pages app with `VITE_API_URL=https://tichikids.ir` (base `/tichi/`) and publish it, so devices that
   installed the old PWA update to the new client; `https://tichikids.ir` serves the same app from this VM.
6. Keep Supabase running (read-only use) until the owner confirms; only then retire it.


## CDN origin mode (current)
The CDN fronting tichikids.ir terminates TLS and fetches from this VM over plain HTTP :80. Run `deploy/setup-cdn-origin.sh` (nginx `nginx-tichi-cdn.conf`; ufw allows :80 only from the CDN edges 95.156.253.236/237). The CDN->origin hop is unencrypted. `setup-tls.sh` is only for pointing the domain straight at the VM.
