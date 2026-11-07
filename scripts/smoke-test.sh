#!/usr/bin/env bash
set -euo pipefail
API="$1"
WEB="$2"

check() {
  for i in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "$1" || true)
    if [ "$code" = "200" ]; then echo "OK $1"; return 0; fi
    echo "waiting ($i/30) $1 -> $code"
    sleep 10
  done
  echo "FAILED $1"
  return 1
}

check "$API/health"
check "$WEB"
echo "Smoke test passed"
