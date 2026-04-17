#!/usr/bin/env bash
set -euo pipefail

if command -v bun >/dev/null 2>&1; then
  BUN_BIN="$(command -v bun)"
elif [ -x "${HOME}/.bun/bin/bun" ]; then
  BUN_BIN="${HOME}/.bun/bin/bun"
else
  echo "bun not found. Install Bun or add it to PATH." >&2
  exit 127
fi

exec "${BUN_BIN}" "$@"
