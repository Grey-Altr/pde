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

# 1. Workflow contains coverage-check invocation (pde-tools)
check "coverage-check" "${WORKFLOW}" "workflows/pressure-test.md missing 'coverage-check' pde-tools invocation"

# 2. Workflow references hasDesignSystem coverage flag
check "hasDesignSystem" "${WORKFLOW}" "workflows/pressure-test.md missing 'hasDesignSystem' coverage flag reference"

# 3. Workflow references hasHandoff (last coverage flag)
check "hasHandoff" "${WORKFLOW}" "workflows/pressure-test.md missing 'hasHandoff' coverage flag reference"

# 4. Workflow references BRF-brief-v pattern (brief Glob-only check — no hasBrief flag)
check "BRF-brief-v" "${WORKFLOW}" "workflows/pressure-test.md missing 'BRF-brief-v' brief Glob-only check"

# 5. Workflow handles hasIterate with nullish coalescing (hasIterate absent from older manifests)
check "hasIterate.*false|\?\? false" "${WORKFLOW}" "workflows/pressure-test.md missing nullish coalescing for hasIterate"

echo "PRES-02: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
