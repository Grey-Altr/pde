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

# 1. Spring overshoot cubic-bezier value
check "cubic-bezier\(0\.34, 1\.56" "Spring overshoot cubic-bezier(0.34, 1.56 not found in skill"

# 2. Spring token name
check "ease-spring" "ease-spring token name not found in skill"

# 3. GSAP elastic or spring reference
check "elastic|spring physics|Spring physics" "No elastic/spring physics GSAP reference found in skill"

# 4. GSAP CDN reference
check "gsap" "GSAP CDN reference not found in skill"

# 5. ScrollTrigger plugin
check "ScrollTrigger" "ScrollTrigger plugin reference not found in skill"

# 6. CDN jsDelivr URL
check "cdn\.jsdelivr\.net/npm/gsap" "GSAP CDN jsDelivr URL not found in skill"

# 7. Instruction to use spring physics (not generic easing)
check "NOT linear|not.*linear|spring physics|NOT generic|not.*ease-only|spring.*not" "No instruction to avoid generic/linear easing (spring physics directive) found"

# 8. Motion token reference
check -- "--duration-micro|--duration-fast" "Motion duration tokens (--duration-micro or --duration-fast) not found in skill"

echo "MOCK-01 spring_physics: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
