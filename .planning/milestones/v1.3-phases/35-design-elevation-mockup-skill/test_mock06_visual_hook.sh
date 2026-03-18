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

# 1. VISUAL-HOOK naming convention marker
check 'VISUAL-HOOK' "VISUAL-HOOK naming convention marker not found in skill"

# 2. concept-specific instruction
check 'concept-specific|concept specific' "concept-specific instruction not found in skill"

# 3. hook must be named
check 'named.*hook|hook.*named|identified by name|named by comment|named.*comment' "Named hook requirement not found in skill"

# 4. anti-pattern: generic hooks forbidden
check 'generic.*NOT|not.*generic|NOT a generic|generic.*forbidden|NOT generic|avoid.*generic' "Anti-pattern (generic hooks) not flagged in skill"

# 5. uniqueness requirement
check 'unique.*project|project.*unique|distinctive|concept-specific.*interaction|unique.*interaction' "Uniqueness/concept-specificity requirement not found in skill"

echo "MOCK-06 visual_hook: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
