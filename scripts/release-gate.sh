#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[gate] build"
./scripts/bunw.sh run build

echo "[gate] smoke:offline"
./scripts/bunw.sh run smoke:offline

echo "[gate] parity:audit"
./scripts/bunw.sh run parity:audit

echo "[gate] package:release"
./scripts/bunw.sh run package:release

LATEST_ARCHIVE="$(ls -t artifacts/unicore-*.tar.gz | head -n 1)"
if [[ -z "${LATEST_ARCHIVE}" ]]; then
  echo "[gate] no release archive found in artifacts/" >&2
  exit 1
fi

echo "[gate] install dry-run in temp HOME"
TMP_HOME="$(mktemp -d)"
trap 'rm -rf "${TMP_HOME}"' EXIT
HOME="${TMP_HOME}" ./scripts/install-release.sh --from "${LATEST_ARCHIVE}"
"${TMP_HOME}/.local/bin/unicore" --version >/dev/null

echo "[gate] passed"
