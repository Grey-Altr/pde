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

# 1. aria-busy (loading state hook)
check 'aria-busy' "aria-busy loading state hook not found in skill"

# 2. aria-disabled (disabled state hook)
check 'aria-disabled' "aria-disabled disabled state hook not found in skill"

# 3. aria-invalid or is-error (error state hook)
check 'aria-invalid|is-error' "aria-invalid or is-error error state hook not found in skill"

# 4. :hover state
check ':hover' ":hover state not found in skill"

# 5. :focus-visible state
check ':focus-visible' ":focus-visible state not found in skill"

# 6. :active state
check ':active' ":active state not found in skill"

# 7. loading state section label
check '[Ll]oading.*state|loading state|LOADING' "Loading state section not found in skill"

# 8. All 7 states referenced together
check 'seven.*state|7.*state|all 7|default.*hover.*focus.*active.*loading.*disabled.*error|7 states' "All 7 interaction states not referenced together in skill"

# 9. shimmer loading animation
check 'shimmer|loading-shimmer|btn-shimmer' "Shimmer loading animation not found in skill"

echo "MOCK-03 interaction_states: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
