#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

VERSION="$("${ROOT_DIR}/scripts/bunw.sh" -e "const p=require('./package.json'); console.log(p.version)")"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
DIST_DIR="${ROOT_DIR}/dist"
OUT_DIR="${ROOT_DIR}/artifacts"
PKG_NAME="unicore-${VERSION}-${PLATFORM}-${ARCH}"
STAGE_DIR="${OUT_DIR}/${PKG_NAME}"
ARCHIVE_PATH="${OUT_DIR}/${PKG_NAME}.tar.gz"
CHECKSUM_PATH="${ARCHIVE_PATH}.sha256"

echo "[package] build"
"${ROOT_DIR}/scripts/bunw.sh" run build

echo "[package] stage ${STAGE_DIR}"
rm -rf "${STAGE_DIR}"
mkdir -p "${STAGE_DIR}/bin"

cp -R "${DIST_DIR}" "${STAGE_DIR}/dist"
cp -R "${ROOT_DIR}/node_modules" "${STAGE_DIR}/node_modules"

# Prune devDependencies from stage to reduce package size
echo "[package] pruning stage node_modules"
rm -rf "${STAGE_DIR}/node_modules/typescript" \
       "${STAGE_DIR}/node_modules/@types" \
       "${STAGE_DIR}/node_modules/bun-types" \
       "${STAGE_DIR}/node_modules/.cache" \
       "${STAGE_DIR}/node_modules/.bin/tsc" \
       "${STAGE_DIR}/node_modules/.bin/tsserver"

cp "${ROOT_DIR}/bun.lock" "${STAGE_DIR}/bun.lock"
cp "${ROOT_DIR}/README.md" "${STAGE_DIR}/README.md"
cp "${ROOT_DIR}/package.json" "${STAGE_DIR}/package.json"

cp "${ROOT_DIR}/scripts/uninstall-unicore.sh" "${STAGE_DIR}/bin/unicore-uninstall"
chmod +x "${STAGE_DIR}/bin/unicore-uninstall"

cat > "${STAGE_DIR}/bin/unicore" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

SOURCE="${BASH_SOURCE[0]}"
while [ -h "${SOURCE}" ]; do
  DIR="$(cd -P "$(dirname "${SOURCE}")" && pwd)"
  SOURCE="$(readlink "${SOURCE}")"
  [[ "${SOURCE}" != /* ]] && SOURCE="${DIR}/${SOURCE}"
done
SCRIPT_DIR="$(cd -P "$(dirname "${SOURCE}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if command -v bun >/dev/null 2>&1; then
  BUN_BIN="$(command -v bun)"
elif [ -x "${HOME}/.bun/bin/bun" ]; then
  BUN_BIN="${HOME}/.bun/bin/bun"
else
  echo "bun not found. Install Bun from https://bun.sh first." >&2
  exit 127
fi

exec "${BUN_BIN}" "${ROOT_DIR}/dist/cli.js" "$@"
EOF

chmod +x "${STAGE_DIR}/bin/unicore"

echo "[package] archive ${ARCHIVE_PATH}"
mkdir -p "${OUT_DIR}"
tar -czf "${ARCHIVE_PATH}" -C "${OUT_DIR}" "${PKG_NAME}"

echo "[package] checksum ${CHECKSUM_PATH}"
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${ARCHIVE_PATH}" > "${CHECKSUM_PATH}"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${ARCHIVE_PATH}" > "${CHECKSUM_PATH}"
else
  echo "[package] warning: no sha256 tool found, checksum not generated" >&2
fi

echo "[package] done: ${ARCHIVE_PATH}"

# GitHub Release Integration
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  REPO="${GITHUB_REPO:-Koriginal/unicore}"
  TAG="v${VERSION}"
  echo "[package] uploading to GitHub Release ${TAG} for ${REPO}..."
  
  # Create Release (ignoring error if it exists)
  RELEASE_ID=$(curl -s -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/${REPO}/releases" \
    -d "{\"tag_name\":\"${TAG}\",\"name\":\"UniCore ${VERSION}\",\"draft\":false,\"prerelease\":false}" \
    | grep -m 1 "id" | tr -cd '[:digit:]' || true)

  if [[ -z "${RELEASE_ID}" ]]; then
    RELEASE_ID=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
      "https://api.github.com/repos/${REPO}/releases/tags/${TAG}" \
      | grep -m 1 "id" | tr -cd '[:digit:]' || true)
  fi

  if [[ -n "${RELEASE_ID}" ]]; then
    echo "[package] uploading ${PKG_NAME}.tar.gz to release ${RELEASE_ID}..."
    curl -H "Authorization: token ${GITHUB_TOKEN}" \
         -H "Content-Type: application/gzip" \
         --data-binary @"${ARCHIVE_PATH}" \
         "https://uploads.github.com/repos/${REPO}/releases/${RELEASE_ID}/assets?name=${PKG_NAME}.tar.gz"
    echo "[package] GitHub upload complete"
  else
    echo "[package] error: failed to create or find GitHub release"
  fi
fi
