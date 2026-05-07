#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [[ "${IDP_PODMAN_CLEAN:-}" == "1" ]]; then
  podman system prune -f
fi

podman-compose down --remove-orphans
podman-compose build
podman-compose up -d

