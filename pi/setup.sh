#!/usr/bin/env bash
set -euo pipefail

# This script changes users, permissions, and systemd services.
# Those are admin operations, so run it with sudo.
if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this with sudo: sudo bash pi/setup.sh" >&2
  exit 1
fi

# Use the Axiom folder that contains this script.
# This lets the project live anywhere, including ~/Desktop/axiom.
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUN="$(command -v bun)"

# The agent runs as this restricted user.
# It is a service account, not a login account.
id axiom >/dev/null 2>&1 || useradd --system --user-group --shell /usr/sbin/nologin axiom

# These are the only places the running agent should write.
mkdir -p "${APP_DIR}/.axiom" "${APP_DIR}/modules/writable"
chown -R axiom:axiom "${APP_DIR}/.axiom" "${APP_DIR}/modules/writable"

# The running agent must not be able to edit trusted ingress/core code.
chmod -R go-w "${APP_DIR}/modules/readonly"

# systemd keeps Telegram running in the background and restarts it on crash.
cat >/etc/systemd/system/axiom-telegram.service <<EOF
[Unit]
Description=Axiom Telegram ingress
After=network-online.target
Wants=network-online.target

[Service]
User=axiom
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${BUN} ${APP_DIR}/modules/readonly/telegram/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Tell systemd about the service and make it start on boot.
systemctl daemon-reload
systemctl enable axiom-telegram

echo "Done. Start it with:"
echo "  sudo systemctl start axiom-telegram"
