#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

export UNICORE_CODE_OFFLINE="${UNICORE_CODE_OFFLINE:-1}"
export DISABLE_AUTOUPDATER="${DISABLE_AUTOUPDATER:-1}"
export UNICORE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="${UNICORE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:-1}"

# Backward-compat migration:
# Old builds defaulted config dir to project-local .unicore-runtime.
# If user did not explicitly set UNICORE_CONFIG_DIR, migrate settings once
# to the standard persistent location ~/.unicore.
if [[ -z "${UNICORE_CONFIG_DIR:-}" ]]; then
  LEGACY_CONFIG_DIR="${ROOT_DIR}/.unicore-runtime"
  TARGET_CONFIG_DIR="${HOME}/.unicore"
  if [[ -f "${LEGACY_CONFIG_DIR}/settings.json" && ! -f "${TARGET_CONFIG_DIR}/settings.json" ]]; then
    mkdir -p "${TARGET_CONFIG_DIR}"
    cp "${LEGACY_CONFIG_DIR}/settings.json" "${TARGET_CONFIG_DIR}/settings.json"
    echo "[UniCore] migrated legacy config: .unicore-runtime/settings.json -> ~/.unicore/settings.json"
  fi
fi

DO_BUILD=0
if [[ "${1:-}" == "--build" ]]; then
  DO_BUILD=1
  shift
fi

if [[ ! -t 1 ]]; then
  cat >&2 <<'MSG'
[UniCore] 当前终端不是交互式 TTY，无法显示完整界面。
[UniCore] 请在本地终端直接运行，或先检查：./scripts/bunw.sh -e "console.log('stdout.isTTY=', process.stdout.isTTY)"
MSG
  exit 1
fi

if [[ "$DO_BUILD" == "1" ]]; then
  echo "[UniCore] building..."
  ./scripts/bunw.sh run build
fi

echo "[UniCore] launching interactive UI..."
echo "[UniCore] tip: 看到 \"❯\" 输入行表示已启动；输入 /help 查看命令。"

exec ./scripts/bunw.sh dist/cli.js "$@"
