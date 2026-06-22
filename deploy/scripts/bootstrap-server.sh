#!/usr/bin/env bash

set -euo pipefail

REPO_URL="${1:-git@github.com:TaroCats/alires.git}"
DEPLOY_PATH="${2:-/opt/alires}"
DEPLOY_REF="${3:-main}"
DEPLOY_USER="${SUDO_USER:-$USER}"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This bootstrap script currently supports Debian or Ubuntu only."
  exit 1
fi

echo "[1/6] Installing base packages"
sudo apt-get update
sudo apt-get install -y ca-certificates curl git gnupg lsb-release

if ! command -v docker >/dev/null 2>&1; then
  echo "[2/6] Installing Docker Engine and Compose plugin"
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "[3/6] Enabling Docker service"
sudo systemctl enable --now docker
sudo usermod -aG docker "${DEPLOY_USER}" || true

echo "[4/6] Preparing deploy directory"
sudo mkdir -p "${DEPLOY_PATH}"
sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_PATH}"

if [ ! -d "${DEPLOY_PATH}/.git" ]; then
  echo "[5/6] Cloning repository"
  git clone "${REPO_URL}" "${DEPLOY_PATH}"
fi

echo "[6/6] Checking out deployment ref"
git -C "${DEPLOY_PATH}" fetch --all --tags origin
git -C "${DEPLOY_PATH}" checkout "${DEPLOY_REF}"
if git -C "${DEPLOY_PATH}" show-ref --verify --quiet "refs/heads/${DEPLOY_REF}"; then
  git -C "${DEPLOY_PATH}" pull --ff-only origin "${DEPLOY_REF}"
fi

mkdir -p "${DEPLOY_PATH}/data"

if [ ! -f "${DEPLOY_PATH}/.env" ] && [ -f "${DEPLOY_PATH}/.env.example" ]; then
  cp "${DEPLOY_PATH}/.env.example" "${DEPLOY_PATH}/.env"
  echo "Created ${DEPLOY_PATH}/.env from .env.example, please edit it before deployment."
fi

echo "Bootstrap completed."
echo "Next steps:"
echo "  1. Edit ${DEPLOY_PATH}/.env"
echo "  2. Run: cd ${DEPLOY_PATH} && docker compose up -d"
