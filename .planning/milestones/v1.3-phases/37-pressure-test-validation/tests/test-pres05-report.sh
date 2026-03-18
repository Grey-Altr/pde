#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0

PROJ_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
WORKFLOW="${PROJ_ROOT}/workflows/pressure-test.md"

check() {
  if grep -qE "$1" "$2"; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $3"
    FAIL=$((FAIL+1))
  fi
}

# 1. Workflow references pressure-test-report.md (output path)
check "pressure-test-report.md" "${WORKFLOW}" "workflows/pressure-test.md missing 'pressure-test-report.md' output path"

# 2. Workflow contains Tier 1 or Process Compliance section
check "Tier 1|Process Compliance" "${WORKFLOW}" "workflows/pressure-test.md missing Tier 1 / Process Compliance section"

# 3. Workflow contains Tier 2 or Design Quality section
check "Tier 2|Design Quality" "${WORKFLOW}" "workflows/pressure-test.md missing Tier 2 / Design Quality section"

# 4. Workflow references PASS result label for per-check output
check "PASS" "${WORKFLOW}" "workflows/pressure-test.md missing PASS result label"

# 5. Workflow references FAIL result label for per-check output
check "FAIL" "${WORKFLOW}" "workflows/pressure-test.md missing FAIL result label"

echo "PRES-05: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
