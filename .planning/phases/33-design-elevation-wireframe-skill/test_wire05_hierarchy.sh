#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/wireframe.md"

check() { if grep -q "$1" "$SKILL"; then PASS=$((PASS+1)); else echo "FAIL: $2"; FAIL=$((FAIL+1)); fi; }

check "Content hierarchy" "Missing content hierarchy section"
check "CONTENT_HIERARCHY\|content.*hierarchy.*table\|Content hierarchy:" "Missing content hierarchy format"
check "Desktop 1440px:" "Missing desktop 1440px hierarchy annotation"
check "Tablet 768px:" "Missing tablet 768px hierarchy annotation"
check "Mobile 375px:" "Missing mobile 375px hierarchy annotation"
check "1st =\|1st=" "Missing 1st attention priority"
check "2nd =\|2nd=" "Missing 2nd attention priority"
check "CTA =\|CTA=" "Missing CTA priority annotation"

echo "WIRE-05 hierarchy: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
