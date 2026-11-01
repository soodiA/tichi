#!/bin/bash
# Idempotent baseline hardening for the Tichi VM (Ubuntu 24.04). Run as a sudoer.
# Only 22 is opened here; 80/443 are opened by deploy/setup-proxy.sh once TLS is configured.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -qq
sudo apt-get install -y -qq ufw fail2ban unattended-upgrades ca-certificates curl gnupg

# SSH: keys only, no root login. Written as a drop-in so the distro file stays untouched.
sudo tee /etc/ssh/sshd_config.d/00-hardening.conf >/dev/null <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
MaxAuthTries 3
X11Forwarding no
CONF
sudo sshd -t
sudo systemctl reload ssh

# Firewall: default deny in, allow SSH.
sudo ufw --force reset >/dev/null
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw --force enable

# fail2ban: sshd jail
sudo tee /etc/fail2ban/jail.d/sshd.local >/dev/null <<'CONF'
[sshd]
enabled = true
maxretry = 4
findtime = 10m
bantime = 1h
CONF
sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban

# Automatic security updates
echo 'APT::Periodic::Update-Package-Lists "1"; APT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null
