#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/system.md"

check() { if grep -q "$1" "$SKILL"; then ((PASS++)); else echo "FAIL: $2"; ((FAIL++)); fi; }

check "duration-micro" "Missing micro duration step (100ms)"
check "duration-fast" "Missing fast duration step (200ms)"
check "duration-standard" "Missing standard duration step (300ms)"
check "duration-slow" "Missing slow duration step (500ms)"
check "duration-dramatic" "Missing dramatic duration step (800ms)"
check 'easing-spring\|ease-spring' "Missing spring easing curve"
check 'stagger-sm\|delay-stagger-sm' "Missing small stagger delay token"
check 'stagger-md\|delay-stagger-md' "Missing medium stagger delay token"
check 'stagger-lg\|delay-stagger-lg' "Missing large stagger delay token"
check '"value": 100, "unit": "ms"' 'Duration not in DTCG 2025.10 object format'
check '\$extensions' 'Missing $extensions for spring linear() value'
check 'linear(0' "Missing linear() multi-bounce spring value"
check '"transition"' "Missing DTCG transition composite type"

echo "SYS-01 motion tokens: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
