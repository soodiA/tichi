#!/bin/bash
# Register this VM as the GitHub Actions self-hosted runner for soodiA/tichi (label: tichi).
# usage: GH_TOKEN=<PAT with repo admin> ./setup-runner.sh
# The PAT is only used to fetch a short-lived registration token and is never written to disk.
set -euo pipefail
REPO=soodiA/tichi
: "${GH_TOKEN:?set GH_TOKEN}"
VER=${RUNNER_VERSION:-2.329.0}
sudo install -d -o ubuntu -g ubuntu /srv/tichi/runner
cd /srv/tichi/runner
if [ ! -x ./config.sh ]; then
  curl -fsSL -o r.tgz "https://github.com/actions/runner/releases/download/v${VER}/actions-runner-linux-x64-${VER}.tar.gz"
  tar xzf r.tgz && rm r.tgz
fi
TOKEN=$(curl -fsS -X POST -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/actions/runners/registration-token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
./config.sh --unattended --url "https://github.com/$REPO" --token "$TOKEN" --name tichiweb --labels tichi --replace
sudo ./svc.sh install ubuntu
sudo ./svc.sh start
sudo ./svc.sh status | head -5
