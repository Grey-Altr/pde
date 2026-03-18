#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/wireframe.md"

check() { if grep -q "$1" "$SKILL"; then PASS=$((PASS+1)); else echo "FAIL: $2"; FAIL=$((FAIL+1)); fi; }

check "375" "Missing mobile 375px viewport"
check "768" "Missing tablet 768px viewport"
check "1440\|1024" "Missing desktop viewport"
check "Viewport strategies\|VIEWPORT_STRATEGIES" "Missing viewport strategies section"
check "Desktop.*1440\|Desktop 1440" "Missing desktop 1440 strategy annotation"
check "Tablet.*768\|Tablet 768" "Missing tablet 768 strategy annotation"
check "Mobile.*375\|Mobile 375" "Missing mobile 375 strategy annotation"
check "DISTINCT\|distinct\|recompos" "Missing distinct/recomposition instruction"
check "@media.*(min-width.*768\|min-width: 768)" "Missing 768px media query"
check "@media.*(min-width.*1024\|min-width: 1024)" "Missing 1024px media query"

echo "WIRE-04 viewport: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
