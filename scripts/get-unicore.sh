#!/usr/bin/env bash
set -euo pipefail

# UniCore Bootstrapper (GitHub Edition)
# Used for one-liner installation: curl -fsSL <URL> | bash

REPO="Koriginal/unicore"
VERSION="latest"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Normalize architecture names
case "${ARCH}" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
esac

echo "[bootstrap] UniCore Installer"
echo "[bootstrap] Detected Platform: ${OS}-${ARCH}"

# 1. Fetch latest version and download URL from GitHub API
echo "[bootstrap] Fetching latest release info from GitHub..."
RELEASE_DATA=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")
VERSION=$(echo "${RELEASE_DATA}" | grep -oE '"tag_name":"[^"]+"' | head -1 | cut -d'"' -f4)

if [[ -z "${VERSION}" ]]; then
  echo "Error: Failed to fetch latest version from GitHub." >&2
  exit 1
fi

TARBALL="unicore-${VERSION#v}-${OS}-${ARCH}.tar.gz"
DOWNLOAD_URL=$(echo "${RELEASE_DATA}" | grep -oE '"browser_download_url":"[^"]+'${TARBALL}'"' | head -1 | cut -d'"' -f4 || true)

if [[ -z "${DOWNLOAD_URL}" ]]; then
  # Fallback: try to construct URL if grep failed
  DOWNLOAD_URL="https://github.com/Koriginal/unicore/releases/download/${VERSION}/${TARBALL}"
fi

echo "[bootstrap] Target Version: ${VERSION}"
echo "[bootstrap] Downloading ${TARBALL}..."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

cd "${TMP_DIR}"

if ! curl -fsSL "${DOWNLOAD_URL}" -o "${TARBALL}"; then
  echo "Error: Failed to download from ${DOWNLOAD_URL}" >&2
  exit 1
fi

echo "[bootstrap] Extracting..."
tar -xzf "${TARBALL}"
PKG_DIR="$(find . -mindepth 1 -maxdepth 1 -type d | head -n 1)"

INSTALL_ROOT="${HOME}/.unicore/releases"
TARGET_DIR="${INSTALL_ROOT}/$(basename "${PKG_DIR}")"
BIN_DIR="${HOME}/.local/bin"

echo "[bootstrap] Installing to ${TARGET_DIR}"
mkdir -p "${INSTALL_ROOT}" "${BIN_DIR}"
rm -rf "${TARGET_DIR}"
cp -R "${PKG_DIR}" "${TARGET_DIR}"

echo "[bootstrap] Linking ${BIN_DIR}/unicore"
ln -sfn "${TARGET_DIR}/bin/unicore" "${BIN_DIR}/unicore"
chmod +x "${TARGET_DIR}/bin/unicore"

echo
echo "Successfully installed UniCore!"
echo "Location: ${TARGET_DIR}"
echo "Binary:   ${BIN_DIR}/unicore"
echo
echo "If 'unicore' command is not found, please add ~/.local/bin to your PATH:"
echo '  export PATH="$HOME/.local/bin:$PATH"'
echo
echo "Run 'unicore' to get started, or '/setup' for first-time configuration."
