#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0

check_file() {
  local pattern="$1"
  local file="$2"
  local msg="$3"
  if grep -qE "$pattern" "$file"; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $msg"
    FAIL=$((FAIL+1))
  fi
}

# 1. workflows/system.md has @references/ in required_reading
check_file "@references/" "workflows/system.md" "system.md missing @references/ include in required_reading"

# 2. workflows/wireframe.md has @references/ in required_reading
check_file "@references/" "workflows/wireframe.md" "wireframe.md missing @references/ include in required_reading"

# 3. workflows/critique.md has @references/ in required_reading
check_file "@references/" "workflows/critique.md" "critique.md missing @references/ include in required_reading"

# 4. workflows/hig.md has @references/ in required_reading
check_file "@references/" "workflows/hig.md" "hig.md missing @references/ include in required_reading"

# 5. workflows/mockup.md has @references/ in required_reading
check_file "@references/" "workflows/mockup.md" "mockup.md missing @references/ include in required_reading"

# 6. workflows/handoff.md has @references/ in required_reading
check_file "@references/" "workflows/handoff.md" "handoff.md missing @references/ include in required_reading"

# 7. workflows/flows.md has @references/ in required_reading
check_file "@references/" "workflows/flows.md" "flows.md missing @references/ include in required_reading"

echo "CROSS-01 includes: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
