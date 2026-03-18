#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/wireframe.md"

check() { if grep -q "$1" "$SKILL"; then PASS=$((PASS+1)); else echo "FAIL: $2"; FAIL=$((FAIL+1)); fi; }

check "Asymmetry\|asymmetry" "Missing asymmetry section"
check "ASYMMETRY_AXIS\|Asymmetry.*horizontal\|Asymmetry.*vertical" "Missing asymmetry axis documentation"
check "ASYMMETRY_RATIONALE\|asymmetry.*rationale\|Asymmetry.*:" "Missing asymmetry rationale format"
check "break.*symmetry\|breaks symmetry\|intentional.*asymmetry" "Missing intentional symmetry breaking instruction"
check "at least one axis" "Missing requirement for at least one axis break"

echo "WIRE-03 asymmetry: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
