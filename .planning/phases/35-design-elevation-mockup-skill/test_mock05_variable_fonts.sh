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

# 1. font-variation-settings property
check 'font-variation-settings' "font-variation-settings property not found in skill"

# 2. wght axis or font-weight animation
check "wght|font-weight.*animation|weight.*animation|weight.*axis|wght@" "Weight axis (wght) animation reference not found in skill"

# 3. opsz or optical size
check "opsz|optical.*size|font-optical-sizing" "Optical size (opsz) reference not found in skill"

# 4. wdth or width axis
check "wdth|width.*axis" "Width axis (wdth) reference not found in skill"

# 5. Google Fonts CDN reference
check "fonts\.googleapis\.com/css2|Google Fonts|google fonts" "Google Fonts CDN reference not found in skill"

# 6. variable font term used
check "[Vv]ariable [Ff]ont|Variable Font|variable font" "Variable font term not used in skill"

echo "MOCK-05 variable_fonts: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
