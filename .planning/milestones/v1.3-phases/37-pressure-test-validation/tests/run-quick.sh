#!/usr/bin/env bash
# Quick structural checks — command existence and fixture state only.
# Runs test-pres01 and test-pres04. Completes in seconds without needing the workflow file.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL_PASS=0
TOTAL_FAIL=0
SCRIPTS_RUN=0

run_test() {
  local script="$1"
  if bash "${script}"; then
    TOTAL_PASS=$((TOTAL_PASS+1))
  else
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi
  SCRIPTS_RUN=$((SCRIPTS_RUN+1))
}

run_test "${DIR}/test-pres01-command.sh"
run_test "${DIR}/test-pres04-fixtures.sh"

echo ""
echo "run-quick: $SCRIPTS_RUN scripts, $TOTAL_PASS passed, $TOTAL_FAIL failed"
[ "$TOTAL_FAIL" -eq 0 ]
