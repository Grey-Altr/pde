#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/system.md"

check() { if grep -q "$1" "$SKILL"; then ((PASS++)); else echo "FAIL: $2"; ((FAIL++)); fi; }

check "analogous-warm" "Missing analogous-warm harmony entry"
check "analogous-cool" "Missing analogous-cool harmony entry"
check "complementary" "Missing complementary harmony entry"
check "split-warm" "Missing split-warm harmony entry"
check "split-cool" "Missing split-cool harmony entry"
check "triadic-a" "Missing triadic-a harmony entry"
check "triadic-b" "Missing triadic-b harmony entry"
check "oklch" "Missing oklch in harmony color values"
check '\$description' 'Missing $description with harmony rationale text'
check "color.harmony\|color\.harmony" "Missing color.harmony block in DTCG JSON"
check "H + 180\|H+180\|180" "Missing complementary hue rotation documentation"
check "H ± 30\|H+30\|H-30\|analogous" "Missing analogous hue rotation documentation"

echo "SYS-03 harmony palettes: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
