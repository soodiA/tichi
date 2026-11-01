#!/bin/bash
# Build the frontend with pnpm inside a node container (no Node on the host). Output: ./dist
# Registry mirror because registry.npmjs.org is unreachable from this network.
set -euo pipefail
cd "$(dirname "$0")/.."
sudo docker run --rm -u "$(id -u):$(id -g)" \
  -e HOME=/tmp -e COREPACK_HOME=/tmp/corepack -e COREPACK_NPM_REGISTRY=https://npm.cloudinative.com \
  -e npm_config_registry=https://npm.cloudinative.com/ \
  -e VITE_BASE_PATH=/ -e VITE_API_URL="${VITE_API_URL:-}" \
  -v "$PWD":/app -v tichi-pnpm-store:/pnpm-store -w /app node:22-alpine \
  sh -c 'mkdir -p /tmp/bin && corepack enable --install-directory /tmp/bin && export PATH=/tmp/bin:$PATH && corepack prepare "$(node -p "require(\"./package.json\").packageManager")" --activate && pnpm config set store-dir /pnpm-store && pnpm install --frozen-lockfile --ignore-scripts && pnpm build'
