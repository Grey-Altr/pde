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

# 1. @supports guard for animation-timeline
check "@supports.*animation-timeline|@supports \(animation-timeline" "@supports (animation-timeline: ...) guard not found in skill"

# 2. animation-timeline property with view() or scroll()
check "animation-timeline.*view\(\)|animation-timeline.*scroll\(\)|animation-timeline: view|animation-timeline: scroll" "animation-timeline: view() or scroll() not found in skill"

# 3. animation-range property
check "animation-range" "animation-range property not found in skill"

# 4. opacity: 0 only inside @supports (Firefox fallback pattern)
check "@supports.*opacity.*0|opacity.*0.*@supports|opacity: 0.*inside.*@supports|Set to 0 ONLY inside" "opacity: 0 inside @supports pattern not documented in skill"

# 5. Firefox fallback mention
check "[Ff]irefox|fallback" "Firefox fallback mention not found in skill"

# 6. reveal-on-scroll or section-reveal class name
check "reveal-on-scroll|scroll-reveal|section-reveal" "Scroll reveal class name not found in skill"

# 7. @supports labeled MANDATORY
check "MANDATORY|mandatory.*@supports|@supports.*mandatory|mandatory.*guard" "@supports guard labeled MANDATORY not found in skill"

echo "MOCK-02 scroll_driven: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
