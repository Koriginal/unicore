#!/usr/bin/env bash
# set -e  # 暂时关闭全局报错退出，改用手动错误处理，方便打印诊断信息

# UniCore Bootstrapper (GitHub Edition)
# Used for one-liner installation: curl -fsSL <URL> | bash

REPO="Koriginal/unicore"
GITHUB_API="https://api.github.com/repos/${REPO}/releases/latest"

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

# Prepare curl headers
CURL_OPTS=("-sSL" "-H" "User-Agent: UniCore-Installer")
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "[bootstrap] Using GITHUB_TOKEN for authentication..."
  CURL_OPTS+=("-H" "Authorization: token ${GITHUB_TOKEN}")
fi

TMP_API_JSON=$(mktemp)
trap 'rm -f "${TMP_API_JSON}"' EXIT

# 执行请求，不使用 -f 方便看到错误 body
HTTP_STATUS=$(curl "${CURL_OPTS[@]}" -w "%{http_code}" "${GITHUB_API}" -o "${TMP_API_JSON}")

if [[ "${HTTP_STATUS}" != "200" ]]; then
  echo "Error: GitHub API request failed with HTTP ${HTTP_STATUS}" >&2
  echo "URL: ${GITHUB_API}" >&2
  if [[ "${HTTP_STATUS}" == "403" ]]; then
    echo "Hint: You might be rate-limited. Try 'export GITHUB_TOKEN=your_token' first." >&2
  fi
  cat "${TMP_API_JSON}" >&2
  exit 1
fi

VERSION=$(grep -oE '"tag_name":"[^"]+"' "${TMP_API_JSON}" | head -1 | cut -d'"' -f4 || true)

if [[ -z "${VERSION}" ]]; then
  echo "Error: Could not determine latest version from API response." >&2
  exit 1
fi

# Remove 'v' prefix if present for filename construction
CLEAN_VERSION="${VERSION#v}"
TARBALL="unicore-${CLEAN_VERSION}-${OS}-${ARCH}.tar.gz"

# Extract the browser_download_url for the matching tarball
DOWNLOAD_URL=$(grep -oE '"browser_download_url":"[^"]+'${TARBALL}'"' "${TMP_API_JSON}" | head -1 | cut -d'"' -f4 || true)

if [[ -z "${DOWNLOAD_URL}" ]]; then
  echo "[bootstrap] Warning: Could not find exact asset in release metadata, trying fallback URL..."
  DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${TARBALL}"
fi

echo "[bootstrap] Target Version: ${VERSION}"
echo "[bootstrap] Downloading ${TARBALL}..."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT
cd "${TMP_DIR}"

if ! curl "${CURL_OPTS[@]}" "${DOWNLOAD_URL}" -o "${TARBALL}"; then
  echo "Error: Failed to download ${TARBALL} from ${DOWNLOAD_URL}" >&2
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

# Add uninstaller link for convenience
ln -sfn "${TARGET_DIR}/bin/unicore-uninstall" "${BIN_DIR}/unicore-uninstall" || true

echo
echo "Successfully installed UniCore!"
echo "Location: ${TARGET_DIR}"
echo "Binary:   ${BIN_DIR}/unicore"
echo
echo "IMPORTANT: Please ensure ${BIN_DIR} is in your PATH."
echo "If not, add this to your .zshrc or .bashrc:"
echo '  export PATH="$HOME/.local/bin:$PATH"'
echo
echo "Run 'unicore' to get started!"
