#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export UNICORE_CODE_OFFLINE=1
export DISABLE_AUTOUPDATER=1
export UNICORE_CONFIG_DIR=.unicore-runtime

echo "[smoke] build"
./scripts/bunw.sh run build >/tmp/unicore-smoke-build.log 2>&1 || {
  cat /tmp/unicore-smoke-build.log
  exit 1
}

echo "[smoke] help"
./scripts/bunw.sh dist/cli.js --help >/tmp/unicore-smoke-help.log 2>&1 || {
  cat /tmp/unicore-smoke-help.log
  exit 1
}

echo "[smoke] version"
./scripts/bunw.sh dist/cli.js --version >/tmp/unicore-smoke-version.log 2>&1 || {
  cat /tmp/unicore-smoke-version.log
  exit 1
}

echo "[smoke] passed"
