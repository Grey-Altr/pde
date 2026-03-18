#!/usr/bin/env bash
# QUAL-02 — Motion design reference content test
#
# Requirement: references/motion-design.md exists with GSAP 3.14 CDN patterns,
# spring physics at 3 levels, mandatory @supports scroll-driven guard, and
# variable font axis animation patterns.
#
# Test type: content / smoke
# Run: bash .planning/phases/29-quality-infrastructure/test_qual02_motion_design_reference.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TARGET="$REPO_ROOT/references/motion-design.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[references/motion-design.md — QUAL-02]"
echo ""

# File must be readable
if [[ ! -r "$TARGET" ]]; then
  fail "references/motion-design.md readable" "Cannot read: $TARGET"
  echo "────────────────────────────────────────────────────────────"
  echo "QUAL-02 Motion design reference: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "references/motion-design.md readable"

echo ""
echo "[GSAP 3.14]"

# GSAP 3.14 CDN URL present
if grep -qF "gsap@3.14" "$TARGET"; then
  pass "GSAP 3.14 CDN URL present (gsap@3.14)"
else
  fail "GSAP 3.14 CDN URL present (gsap@3.14)" "String 'gsap@3.14' not found"
fi

# ScrollTrigger registration present
if grep -qF "ScrollTrigger" "$TARGET"; then
  pass "ScrollTrigger plugin referenced"
else
  fail "ScrollTrigger plugin referenced" "String 'ScrollTrigger' not found"
fi

echo ""
echo "[Spring physics — 3 levels]"

# Level 1: cubic-bezier single-overshoot spring
if grep -qF "cubic-bezier(0.34, 1.56" "$TARGET"; then
  pass "Spring Level 1: cubic-bezier single-overshoot spring present"
else
  fail "Spring Level 1: cubic-bezier single-overshoot spring present" \
    "cubic-bezier(0.34, 1.56...) not found"
fi

# Level 2: CSS linear() multi-bounce spring
if grep -qE "linear\(" "$TARGET"; then
  pass "Spring Level 2: CSS linear() multi-bounce spring present"
else
  fail "Spring Level 2: CSS linear() multi-bounce spring present" \
    "linear() function not found"
fi

# Level 3: GSAP elastic or physics-based spring
if grep -qE "elastic|GSAP.*spring|spring.*GSAP|GSAP.*physics" "$TARGET"; then
  pass "Spring Level 3: GSAP elastic/physics spring referenced"
else
  fail "Spring Level 3: GSAP elastic/physics spring referenced" \
    "No GSAP elastic or physics spring reference found"
fi

echo ""
echo "[@supports scroll-driven animation guard]"

# @supports guard present
if grep -qF "@supports" "$TARGET"; then
  pass "@supports guard present for scroll-driven animations"
else
  fail "@supports guard present for scroll-driven animations" \
    "@supports not found in file"
fi

# MANDATORY label on the @supports guard
if grep -qF "MANDATORY" "$TARGET"; then
  pass "@supports guard labeled MANDATORY"
else
  fail "@supports guard labeled MANDATORY" \
    "Word 'MANDATORY' not found — guard must be labeled mandatory, not optional"
fi

# animation-timeline: scroll() referenced
if grep -qF "animation-timeline" "$TARGET"; then
  pass "animation-timeline scroll() pattern present"
else
  fail "animation-timeline scroll() pattern present" \
    "animation-timeline not found in file"
fi

echo ""
echo "[Variable font axis animation]"

# Variable font section present
if grep -qiE "variable font|font-variation|font-weight.*transition|wght|wdth" "$TARGET"; then
  pass "Variable font axis animation patterns present"
else
  fail "Variable font axis animation patterns present" \
    "No variable font animation content found (font-variation, wght, wdth)"
fi

# Specific axis examples (weight is the most common)
if grep -qE "font-weight|font-variation-settings" "$TARGET"; then
  pass "font-weight or font-variation-settings animation present"
else
  fail "font-weight or font-variation-settings animation present" \
    "Neither font-weight nor font-variation-settings found"
fi

echo ""
echo "[Reference file anatomy]"

# Header block required fields
for field in "Version:" "Scope:" "Ownership:" "Boundary:"; do
  if grep -q "$field" "$TARGET"; then
    pass "Header block contains $field"
  else
    fail "Header block contains $field" "'$field' not found"
  fi
done

# Citations section
if grep -qiE "## Citations|Citations" "$TARGET"; then
  pass "Citations section present"
else
  fail "Citations section present" "No Citations section heading found"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "QUAL-02 Motion design reference: $total tests — $PASS passed, $FAIL failed"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Failures:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
else
  echo "All pass."
  exit 0
fi
