#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Install UniCore release tarball to ~/.unicore/releases and link ~/.local/bin/unicore

Usage:
  ./scripts/install-release.sh --from /path/to/unicore-<version>-<platform>-<arch>.tar.gz
  ./scripts/install-release.sh --from https://example.com/unicore-<version>-<platform>-<arch>.tar.gz
  ./scripts/install-release.sh --from <archive> --sha256 <expected-sha256>
EOF
}

SRC=""
EXPECTED_SHA256=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from)
      SRC="${2:-}"
      shift 2
      ;;
    --sha256)
      EXPECTED_SHA256="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "${SRC}" ]]; then
  echo "--from is required" >&2
  usage
  exit 2
fi

if [[ -n "${EXPECTED_SHA256}" ]]; then
  EXPECTED_SHA256="$(echo "${EXPECTED_SHA256}" | tr '[:upper:]' '[:lower:]')"
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

ARCHIVE_PATH="${TMP_DIR}/unicore.tar.gz"
CHECKSUM_PATH="${ARCHIVE_PATH}.sha256"
if [[ "${SRC}" =~ ^https?:// ]]; then
  echo "[install] download ${SRC}"
  curl -fsSL "${SRC}" -o "${ARCHIVE_PATH}"
  curl -fsSL "${SRC}.sha256" -o "${CHECKSUM_PATH}" || true
else
  echo "[install] use local archive ${SRC}"
  cp "${SRC}" "${ARCHIVE_PATH}"
  if [[ -f "${SRC}.sha256" ]]; then
    cp "${SRC}.sha256" "${CHECKSUM_PATH}"
  fi
fi

actual_sha256() {
  local file="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${file}" | awk '{print $1}'
    return 0
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${file}" | awk '{print $1}'
    return 0
  fi
  return 1
}

if [[ -z "${EXPECTED_SHA256}" && -f "${CHECKSUM_PATH}" ]]; then
  EXPECTED_SHA256="$(awk '{print tolower($1)}' "${CHECKSUM_PATH}")"
fi

if [[ -n "${EXPECTED_SHA256}" ]]; then
  if ! ACTUAL_SHA256="$(actual_sha256 "${ARCHIVE_PATH}")"; then
    echo "No sha256 tool found for checksum verification." >&2
    exit 1
  fi
  ACTUAL_SHA256="$(echo "${ACTUAL_SHA256}" | tr '[:upper:]' '[:lower:]')"
  if [[ "${ACTUAL_SHA256}" != "${EXPECTED_SHA256}" ]]; then
    echo "Checksum mismatch." >&2
    echo "Expected: ${EXPECTED_SHA256}" >&2
    echo "Actual:   ${ACTUAL_SHA256}" >&2
    exit 1
  fi
  echo "[install] checksum verified"
fi

echo "[install] extract"
tar -xzf "${ARCHIVE_PATH}" -C "${TMP_DIR}"
PKG_DIR="$(find "${TMP_DIR}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [[ -z "${PKG_DIR}" ]]; then
  echo "Failed to locate extracted package directory." >&2
  exit 1
fi

PKG_NAME="$(basename "${PKG_DIR}")"
INSTALL_ROOT="${HOME}/.unicore/releases"
TARGET_DIR="${INSTALL_ROOT}/${PKG_NAME}"
BIN_DIR="${HOME}/.local/bin"

echo "[install] install to ${TARGET_DIR}"
mkdir -p "${INSTALL_ROOT}" "${BIN_DIR}"
rm -rf "${TARGET_DIR}"
cp -R "${PKG_DIR}" "${TARGET_DIR}"

echo "[install] link ${BIN_DIR}/unicore"
ln -sfn "${TARGET_DIR}/bin/unicore" "${BIN_DIR}/unicore"
chmod +x "${TARGET_DIR}/bin/unicore"

echo
echo "Installed: ${TARGET_DIR}"
echo "Linked:    ${BIN_DIR}/unicore"
echo
echo "If 'unicore' is not found, add ~/.local/bin to PATH:"
echo '  export PATH="$HOME/.local/bin:$PATH"'
