#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/system.md"

check() { if grep -q "$1" "$SKILL"; then ((PASS++)); else echo "FAIL: $2"; ((FAIL++)); fi; }

check 'data-density="compact"' 'Missing data-density="compact" CSS selector'
check 'data-density="cozy"' 'Missing data-density="cozy" CSS selector'
check 'spacing-component-gap\|--spacing-component-gap' "Missing --spacing-component-gap semantic token"
check 'spacing-section-gap\|--spacing-section-gap' "Missing --spacing-section-gap semantic token"
check 'spacing-content-gap\|--spacing-content-gap' "Missing --spacing-content-gap semantic token"
check 'optical\|optical adjustment\|optical correction' "Missing optical adjustment documentation text"
check 'compact\|cozy\|density' "Missing density context documentation"
check 'IBM Carbon\|compact.*cozy\|cozy.*compact' "Missing density context system reference"

echo "SYS-05 density spacing: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
