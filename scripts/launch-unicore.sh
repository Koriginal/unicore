#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET_DIR="${1:-}"
CONFIG_FILE="${UNICORE_GLOBAL_CONFIG:-$HOME/.unicore.json}"

if [[ -z "$TARGET_DIR" && -f "$CONFIG_FILE" ]]; then
  if command -v bun >/dev/null 2>&1; then
    TARGET_DIR="$(
      bun -e '
        import { readFileSync } from "fs";
        const p = process.argv[1];
        try {
          const raw = readFileSync(p, "utf8");
          const cfg = JSON.parse(raw);
          const item = cfg?.recentProjects?.[0];
          if (item?.path) process.stdout.write(String(item.path));
        } catch {}
      ' "$CONFIG_FILE" 2>/dev/null || true
    )"
  fi
fi

if [[ -n "$TARGET_DIR" && -d "$TARGET_DIR" ]]; then
  cd "$TARGET_DIR"
else
  cd "$REPO_ROOT"
fi

if [[ -x "$REPO_ROOT/scripts/bunw.sh" && -f "$REPO_ROOT/package.json" ]]; then
  exec "$REPO_ROOT/scripts/bunw.sh" run start
fi

exec unicore

