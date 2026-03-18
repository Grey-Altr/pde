#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/wireframe.md"

check() { if grep -q "$1" "$SKILL"; then PASS=$((PASS+1)); else echo "FAIL: $2"; FAIL=$((FAIL+1)); fi; }

check "composition-typography.md" "composition-typography.md not in required_reading"
check "pde-grid--12-column" "Missing 12-column grid CSS class"
check "pde-grid--asymmetric" "Missing asymmetric grid CSS class"
check "pde-grid--golden-ratio" "Missing golden-ratio grid CSS class"
check "pde-grid--modular" "Missing modular grid CSS class"
check "Grid system:" "Missing Grid system annotation format"
check "GRID_RATIONALE\|grid.*rationale\|Grid.*rationale" "Missing grid rationale documentation"
check "grid-template-columns.*repeat(12" "Missing 12-column CSS implementation"
check "grid-template-columns.*7fr 5fr\|grid-template-columns: 7fr 5fr" "Missing asymmetric 7:5 CSS"
check "grid-template-columns.*61.8fr 38.2fr" "Missing golden ratio CSS"

echo "WIRE-01 grid systems: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
