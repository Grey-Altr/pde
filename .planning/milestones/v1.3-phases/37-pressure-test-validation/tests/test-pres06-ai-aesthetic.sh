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

# 1. Workflow contains VISUAL-HOOK concept-specific interaction check
check "VISUAL-HOOK" "${WORKFLOW}" "workflows/pressure-test.md missing VISUAL-HOOK concept-specific interaction check"

# 2. Workflow contains asymmetry check (intentional asymmetry — case insensitive via regex)
check "[Aa]symmetr" "${WORKFLOW}" "workflows/pressure-test.md missing asymmetry check (intentional asymmetry avoidance)"

# 3. Workflow contains color check (OKLCH, generic color, or palette detection)
check "OKLCH|color.*generic|palette|color.*check" "${WORKFLOW}" "workflows/pressure-test.md missing color check (OKLCH / non-generic palette)"

# 4. Workflow contains motion choreography check
check "choreograph|motion.*stagger|stagger.*motion|entrance.*order|motion.*order" "${WORKFLOW}" "workflows/pressure-test.md missing motion choreography check (custom entrance order)"

echo "PRES-06: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
