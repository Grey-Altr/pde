#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
check() { if grep -qi "$1" "$2"; then PASS=$((PASS+1)); else echo "FAIL: $3"; FAIL=$((FAIL+1)); fi; }

FILE="workflows/critique.md"

check "quality-standards.md" "$FILE" "quality-standards.md not in required_reading"
check "Awwwards dimension" "$FILE" "Missing Awwwards dimension mapping instruction"
check "Design.*40\|Design (40" "$FILE" "Missing Design dimension weight (40%)"
check "Usability.*30\|Usability (30" "$FILE" "Missing Usability dimension weight (30%)"
check "Creativity.*20\|Creativity (20" "$FILE" "Missing Creativity dimension weight (20%)"
check "Content.*10\|Content (10" "$FILE" "Missing Content dimension weight (10%)"
check "Score impact" "$FILE" "Missing score impact instruction in dimension mapping"

echo "CRIT-01: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
