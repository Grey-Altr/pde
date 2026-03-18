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

check_exists() {
  if [ -f "$1" ]; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $2"
    FAIL=$((FAIL+1))
  fi
}

# 1. Workflow references pde-pressure-test-evaluator agent
check "pde-pressure-test-evaluator" "${WORKFLOW}" "workflows/pressure-test.md missing 'pde-pressure-test-evaluator' agent reference"

# 2. Workflow uses Task() invocation pattern for spawning the evaluator agent
check "Task\(" "${WORKFLOW}" "workflows/pressure-test.md missing Task() invocation pattern for evaluator agent"

# 3. Workflow references quality-standards.md (rubric reference)
check "quality-standards.md" "${WORKFLOW}" "workflows/pressure-test.md missing 'quality-standards.md' rubric reference"

# 4. agents/pde-pressure-test-evaluator.md exists
check_exists "${PROJ_ROOT}/agents/pde-pressure-test-evaluator.md" "agents/pde-pressure-test-evaluator.md does not exist"

# 5. Agent file contains quality-standards.md as required reading
check "quality-standards.md" "${PROJ_ROOT}/agents/pde-pressure-test-evaluator.md" "agents/pde-pressure-test-evaluator.md missing 'quality-standards.md' required reading"

echo "PRES-03: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
