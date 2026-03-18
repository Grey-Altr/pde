#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0

PROJ_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

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

# 1. commands/pressure-test.md exists
check_exists "${PROJ_ROOT}/commands/pressure-test.md" "commands/pressure-test.md does not exist"

# 2. Command contains correct frontmatter name
check "name: pde:pressure-test" "${PROJ_ROOT}/commands/pressure-test.md" "commands/pressure-test.md missing 'name: pde:pressure-test' frontmatter"

# 3. Command references the workflow
check "@workflows/pressure-test.md" "${PROJ_ROOT}/commands/pressure-test.md" "commands/pressure-test.md missing '@workflows/pressure-test.md' reference"

# 4. workflows/pressure-test.md exists
check_exists "${PROJ_ROOT}/workflows/pressure-test.md" "workflows/pressure-test.md does not exist"

# 5. Workflow contains PRT skill code reference
check "PRT" "${PROJ_ROOT}/workflows/pressure-test.md" "workflows/pressure-test.md missing PRT skill code reference"

echo "PRES-01: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
