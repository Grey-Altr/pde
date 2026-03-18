#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
SKILL="workflows/mockup.md"

check() {
  if grep -qE "$1" "$SKILL"; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $2"
    FAIL=$((FAIL+1))
  fi
}

# 1. will-change hint
check 'will-change' "will-change hint not found in skill"

# 2. GPU compositing reference
check 'GPU|gpu|composited|GPU-composited|GPU composit' "GPU compositing reference not found in skill"

# 3. Safe animation properties (transform and opacity)
check 'transform.*opacity|opacity.*transform' "Safe animation properties (transform + opacity) not documented in skill"

# 4. Layout thrashing warning
check 'layout.*thrash|layout-thrash|reflow|layout recalc' "Layout-thrashing warning not found in skill"

# 5. Forbidden properties (width/height animation)
check 'width.*height.*NEVER|NEVER.*animate.*width|avoid.*animat.*width|width.*NEVER|NEVER.*width' "Forbidden properties (width/height animation) not documented in skill"

# 6. 60fps performance target or jank reference
check '60fps|60 fps|sixty frames|jank' "60fps performance target or jank reference not found in skill"

echo "MOCK-07 performance: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
