#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
SKILL="workflows/flows.md"

# 1. Transition annotation vocabulary present (case-insensitive, OR)
if grep -qiE "slide-right|slide-left|slide-up|slide-down|morph|shared-element" "$SKILL"; then
  PASS=$((PASS+1))
else
  echo "FAIL: Transition annotation vocabulary (slide/fade/morph/shared-element) not found in flows.md"
  FAIL=$((FAIL+1))
fi

# 2. Transition annotation instruction present (case-insensitive)
if grep -qiE "transition annotation|visual mechanism|visual transition" "$SKILL"; then
  PASS=$((PASS+1))
else
  echo "FAIL: Transition annotation instruction not found in flows.md"
  FAIL=$((FAIL+1))
fi

echo "FLOW-01 transitions: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
