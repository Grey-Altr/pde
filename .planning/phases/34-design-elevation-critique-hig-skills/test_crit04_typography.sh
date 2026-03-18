#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
check() { if grep -qi "$1" "$2"; then PASS=$((PASS+1)); else echo "FAIL: $3"; FAIL=$((FAIL+1)); fi; }

FILE="workflows/critique.md"

check "composition-typography.md" "$FILE" "composition-typography.md not in required_reading"
check "Vox.ATypI\|vox.atypi" "$FILE" "Missing Vox-ATypI classification reference"
check "[Tt]ypography [Pp]airing" "$FILE" "Missing typography pairing assessment section"
check "size.only\|size-only" "$FILE" "Missing size-only differentiation check"
check "classification contrast\|classification.contrast" "$FILE" "Missing classification contrast check"

echo "CRIT-04: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
