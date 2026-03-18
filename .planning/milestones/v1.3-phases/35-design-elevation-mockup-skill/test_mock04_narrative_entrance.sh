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

# 1. narrative or reading order instruction
check 'narrative|reading order' "Narrative/reading order instruction not found in skill"

# 2. stagger from start (not random/center)
check "stagger.*from.*start|from.*start.*stagger|from: 'start'|from: \"start\"" "Stagger from: 'start' direction not found in skill"

# 3. GSAP timeline for sequencing
check 'gsap\.timeline|gsap.timeline|Timeline' "GSAP timeline reference not found in skill"

# 4. autoAlpha for FOUC prevention
check 'autoAlpha|auto-alpha|autoalpha' "autoAlpha (FOUC prevention) not found in skill"

# 5. Content order: eyebrow/headline/body/CTA sequence
check 'eyebrow.*headline|headline.*body.*CTA|reading sequence|hero-eyebrow|hero-headline' "Content reading sequence (eyebrow/headline/body/CTA) not found in skill"

# 6. Anti-pattern: random stagger flagged
check "stagger.*random|from.*random|ANTI.*random|ANTI-PATTERN.*random|never.*from.*random|NEVER.*random" "Anti-pattern (random stagger) not flagged in skill"

echo "MOCK-04 narrative_entrance: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
