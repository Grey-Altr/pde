#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
check() { if grep -qi "$1" "$2"; then PASS=$((PASS+1)); else echo "FAIL: $3"; FAIL=$((FAIL+1)); fi; }

FILE="workflows/hig.md"

check "touch.*target.*motion\|[Mm]otion.*[Ss]tate" "$FILE" "Missing touch target motion state section"
check "scale.*0\|scale(0)" "$FILE" "Missing scale(0) entrance animation risk pattern"
check "24.*24\|24x24" "$FILE" "Missing 24x24 minimum during transition (already exists but verify context)"
check "off.screen.*slide\|slide.in" "$FILE" "Missing off-screen slide-in risk pattern"
check "opacity.*0\|opacity: 0" "$FILE" "Missing opacity:0 acceptable pattern note"

echo "HIG-03: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
