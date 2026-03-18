#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
check() { if grep -qi "$1" "$2"; then PASS=$((PASS+1)); else echo "FAIL: $3"; FAIL=$((FAIL+1)); fi; }

FILE="workflows/critique.md"

check "[Mm]otion [Cc]horeography" "$FILE" "Missing motion choreography assessment section"
check "[Hh]ierarchical sequencing" "$FILE" "Missing hierarchical sequencing criterion"
check "[Ff]unctional trigger" "$FILE" "Missing functional trigger criterion"
check "[Ss]patial continuity" "$FILE" "Missing spatial continuity criterion"
check "[Tt]emporal narrative" "$FILE" "Missing temporal narrative criterion"
check "purposeful\|decorative" "$FILE" "Missing purposeful/decorative verdict instruction"

echo "CRIT-03: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
