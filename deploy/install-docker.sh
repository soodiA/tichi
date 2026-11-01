#!/bin/bash
# Idempotent Docker CE install (official apt repo) + data dirs. Run as a sudoer.
set -euo pipefail
sudo install -m 0755 -d /etc/apt/keyrings
[ -f /etc/apt/keyrings/docker.asc ] || sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
# Persistent data lives in plain host folders (bind mounts), never in docker volumes.
sudo mkdir -p /srv/tichi/{postgres,audio,web,backups,releases}
sudo chown -R ubuntu:ubuntu /srv/tichi

# docker.io returns 403 from this network; pull Hub images through the cloudinative mirror.
echo '{"registry-mirrors":["https://docker.cloudinative.com"]}' | sudo tee /etc/docker/daemon.json >/dev/null
sudo systemctl restart docker
