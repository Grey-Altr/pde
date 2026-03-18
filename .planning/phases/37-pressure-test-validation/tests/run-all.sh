#!/usr/bin/env bash
# Full test suite — runs all 6 PRES-0* Nyquist test scripts sequentially.
# Exits 0 only if all pass. Use after workflow (Plan 02) is created to validate PRES-02/03/05/06.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL_PASS=0
TOTAL_FAIL=0
SCRIPTS_RUN=0

run_test() {
  local script="$1"
  echo "--- Running: $(basename ${script}) ---"
  if bash "${script}"; then
    TOTAL_PASS=$((TOTAL_PASS+1))
  else
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi
  SCRIPTS_RUN=$((SCRIPTS_RUN+1))
  echo ""
}

run_test "${DIR}/test-pres01-command.sh"
run_test "${DIR}/test-pres02-compliance.sh"
run_test "${DIR}/test-pres03-rubric.sh"
run_test "${DIR}/test-pres04-fixtures.sh"
run_test "${DIR}/test-pres05-report.sh"
run_test "${DIR}/test-pres06-ai-aesthetic.sh"

echo "=============================="
echo "run-all: $SCRIPTS_RUN scripts run"
echo "  Passed: $TOTAL_PASS"
echo "  Failed: $TOTAL_FAIL"
echo "=============================="
[ "$TOTAL_FAIL" -eq 0 ]
