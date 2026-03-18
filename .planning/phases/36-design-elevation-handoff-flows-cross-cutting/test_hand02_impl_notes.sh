#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
SKILL="workflows/handoff.md"

check() {
  if grep -qE "$1" "$SKILL"; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $2"
    FAIL=$((FAIL+1))
  fi
}

# 1. Implementation Notes section header pattern
check "Implementation Notes" "Implementation Notes section not found in handoff.md"

# 2. VISUAL-HOOK reference (connecting to upstream mockup convention)
check "VISUAL-HOOK" "VISUAL-HOOK reference not found in handoff.md"

# 3. Recommended Approach table column header
check "Recommended Approach" "Recommended Approach column header not found in handoff.md"

echo "HAND-02 impl_notes: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
