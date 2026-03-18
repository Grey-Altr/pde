#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/wireframe.md"

check() { if grep -q "$1" "$SKILL"; then PASS=$((PASS+1)); else echo "FAIL: $2"; FAIL=$((FAIL+1)); fi; }

check "Visual weight distribution" "Missing visual weight distribution section"
check "1st =\|1st=" "Missing 1st priority annotation"
check "2nd =\|2nd=" "Missing 2nd priority annotation"
check "3rd =\|3rd=" "Missing 3rd priority annotation"
check "CTA =" "Missing CTA annotation in weight distribution"
check "Reading axis:" "Missing reading axis annotation"
check "F-pattern\|Z-pattern" "Missing F-pattern or Z-pattern reading axis type"
check "size\|contrast\|position\|isolation" "Missing weight factor explanation"

echo "WIRE-02 visual weight: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
