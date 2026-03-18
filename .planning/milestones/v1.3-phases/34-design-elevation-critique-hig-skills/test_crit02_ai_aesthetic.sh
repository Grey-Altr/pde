#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
check() { if grep -qi "$1" "$2"; then PASS=$((PASS+1)); else echo "FAIL: $3"; FAIL=$((FAIL+1)); fi; }

FILE="workflows/critique.md"

check "AI [Aa]esthetic" "$FILE" "Missing AI aesthetic detection section"
check "generic.gradient\|generic-gradient" "$FILE" "Missing generic-gradient flag name"
check "hero-pattern-1\|hero.pattern" "$FILE" "Missing hero-pattern-1 flag name"
check "single.neutral.font\|single-neutral-font" "$FILE" "Missing single-neutral-font flag name"
check "uniform.radius\|uniform-radius" "$FILE" "Missing uniform-radius flag name"
check "[Rr]emediation" "$FILE" "Missing remediation instruction requirement"

echo "CRIT-02: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
