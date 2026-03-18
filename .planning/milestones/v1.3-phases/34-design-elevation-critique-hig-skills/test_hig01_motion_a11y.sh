#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
check() { if grep -qi "$1" "$2"; then PASS=$((PASS+1)); else echo "FAIL: $3"; FAIL=$((FAIL+1)); fi; }

FILE="workflows/hig.md"

check "motion-design.md" "$FILE" "motion-design.md not in required_reading"
check "prefers-reduced-motion" "$FILE" "Missing prefers-reduced-motion check"
check "[Vv]estibular" "$FILE" "Missing vestibular trigger catalogue"
check "parallax.scroll\|parallax-scroll" "$FILE" "Missing parallax-scroll vestibular pattern"
check "large.scale.transform\|large-scale-transform" "$FILE" "Missing large-scale-transform vestibular pattern"
check "WCAG 2.3.3\|2\.3\.3" "$FILE" "Missing WCAG 2.3.3 AAA reference"
check "WCAG 2.2.2\|2\.2\.2" "$FILE" "Missing WCAG 2.2.2 Level A reference"
check "[Vv]estibular.safe\|vestibular-safe" "$FILE" "Missing vestibular-safe alternative requirement"

echo "HIG-01: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
