#!/bin/bash
# Air-gap guard: fail if the source or the built frontend references a host outside the allowlist.
# usage: deploy/check-no-external.sh [dist-dir]   (run from the repo root; dist is optional)
#
# Does NOT protect against: URLs assembled at runtime from pieces, hosts reached through browser built-ins
# (Web Speech recognition in Chrome sends audio to Google), or fetches added via a dependency's own code
# paths that are not visible as literal URLs. The air-gap dry run (deploy/airgap-dry-run.sh) covers those
# by blocking egress and watching real requests.
set -euo pipefail
DIST="${1:-}"
# Hosts that appear only as XML namespaces, links inside library error/help text, or doc comments.
# They are never fetched by the app. Add a host here only after reading where it is used.
ALLOW='^(www\.w3\.org|reactjs\.org|reactrouter\.com|tailwindcss\.com|bit\.ly|tinyurl\.com|github\.com|localhost|127\.0\.0\.1)$'
fail=0

echo "== source: banned hosts"
if grep -rInE "fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|supabase\.(co|in)|googletagmanager|google-analytics|sentry\.io" \
     src index.html public vite.config.ts 2>/dev/null | grep -v -E '^\S+:[0-9]+:\s*(//|\*|/\*)'; then
  echo "FAIL: banned external host in source"; fail=1
fi

if [ -n "$DIST" ]; then
  echo "== dist: external URLs ($DIST)"
  hosts=$(grep -rhoIE --include='*.js' --include='*.css' --include='*.html' --include='*.webmanifest' --include='*.json' \
          "(https?:)?//[A-Za-z0-9.-]+\.[A-Za-z]{2,}" "$DIST" | sed -E 's#^(https?:)?//##' | sort -u)
  bad=$(echo "$hosts" | grep -v -E "$ALLOW" || true)
  if [ -n "$bad" ]; then echo "FAIL: non-allowlisted hosts in dist:"; echo "$bad"; fail=1; fi
  # fonts must be shipped, not fetched
  n=$(find "$DIST" -name 'vazirmatn-*.woff2' | wc -l)
  [ "$n" -ge 12 ] || { echo "FAIL: expected >=12 bundled Vazirmatn woff2 files, found $n"; fail=1; }
fi
[ "$fail" -eq 0 ] && echo "OK: no external hosts"
exit $fail
