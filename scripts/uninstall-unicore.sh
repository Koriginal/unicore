#!/usr/bin/env bash
set -euo pipefail

# UniCore Uninstallation Script
# Removes the binary link, release files, and optionally user data.

BIN_LINK="${HOME}/.local/bin/unicore"
RELEASE_ROOT="${HOME}/.unicore/releases"
CONFIG_DIR="${HOME}/.unicore"

PURGE=false
if [[ "${1:-}" == "--purge" ]]; then
  PURGE=true
fi

echo "[uninstall] Removing binary link: ${BIN_LINK}"
rm -f "${BIN_LINK}"

if [ -d "${RELEASE_ROOT}" ]; then
  echo "[uninstall] Removing release artifacts: ${RELEASE_ROOT}"
  rm -rf "${RELEASE_ROOT}"
fi

if [ "${PURGE}" = true ]; then
  if [ -d "${CONFIG_DIR}" ]; then
    echo "[uninstall] Purging all UniCore data: ${CONFIG_DIR}"
    rm -rf "${CONFIG_DIR}"
  fi
else
  echo "[uninstall] Keeping configuration directory: ${CONFIG_DIR}"
  echo "            (Run with --purge to remove it)"
fi

echo "[uninstall] Done."
