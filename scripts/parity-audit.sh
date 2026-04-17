#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

OUTPUT_DIR="${ROOT_DIR}/artifacts"
OUTPUT_FILE="${OUTPUT_DIR}/parity-audit.txt"
mkdir -p "${OUTPUT_DIR}"

count_matches() {
  local pattern="$1"
  shift
  local paths=("$@")

  if rg -n --no-heading -g '!**/*.map' "${pattern}" "${paths[@]}" >/tmp/unicore_parity_rg.out 2>/dev/null; then
    wc -l </tmp/unicore_parity_rg.out | tr -d ' '
  else
    echo 0
  fi
}

list_matches() {
  local pattern="$1"
  shift
  local paths=("$@")

  if rg -n --no-heading -g '!**/*.map' "${pattern}" "${paths[@]}" 2>/dev/null; then
    return 0
  fi
  return 1
}

hidden_stub_count="$(count_matches "name:\\s*['\\\"]stub['\\\"]" src/commands)"
public_stub_desc_count="$(count_matches "description:\\s*['\\\"][^'\\\"]*\\(stub\\)" src/commands)"
offline_unavailable_count="$(count_matches "unavailable in this offline rebuild" src/commands)"

{
  echo "UniCore Parity Audit"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo
  echo "hidden_stub_commands=${hidden_stub_count}"
  echo "public_stub_descriptions=${public_stub_desc_count}"
  echo "offline_unavailable_messages=${offline_unavailable_count}"
  echo

  echo "[hidden stub command matches]"
  list_matches "name:\\s*['\\\"]stub['\\\"]" src/commands || true
  echo
  echo "[public stub description matches]"
  list_matches "description:\\s*['\\\"][^'\\\"]*\\(stub\\)" src/commands || true
  echo
  echo "[offline unavailable message matches]"
  list_matches "unavailable in this offline rebuild" src/commands || true
} >"${OUTPUT_FILE}"

echo "[parity] hidden_stub_commands=${hidden_stub_count}"
echo "[parity] public_stub_descriptions=${public_stub_desc_count}"
echo "[parity] offline_unavailable_messages=${offline_unavailable_count}"
echo "[parity] report=${OUTPUT_FILE}"

if [[ "${public_stub_desc_count}" -gt 0 ]]; then
  echo "[parity] FAILED: public command stubs detected (see ${OUTPUT_FILE})" >&2
  exit 1
fi

if [[ "${offline_unavailable_count}" -gt 0 ]]; then
  echo "[parity] FAILED: public command offline-unavailable messages detected (see ${OUTPUT_FILE})" >&2
  exit 1
fi

echo "[parity] passed"
