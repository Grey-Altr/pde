#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
SKILL="workflows/handoff.md"

check() {
  if grep -qE "$1" "$SKILL"; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $2"
    FAIL=$((FAIL+1))
  fi
}

# 1. motionTrigger prop pattern
check "motionTrigger" "motionTrigger prop not found in handoff.md"

# 2. motionDuration prop pattern
check "motionDuration" "motionDuration prop not found in handoff.md"

# 3. motionEasing prop pattern
check "motionEasing" "motionEasing prop not found in handoff.md"

# 4. respectReducedMotion prop pattern
check "respectReducedMotion" "respectReducedMotion prop not found in handoff.md"

# 5. @references/motion-design.md in required_reading
check "@references/motion-design" "@references/motion-design.md not found in handoff.md required_reading"

echo "HAND-01 motion_spec: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
