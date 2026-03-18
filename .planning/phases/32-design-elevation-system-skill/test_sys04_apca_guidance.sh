#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/system.md"

check() { if grep -q "$1" "$SKILL"; then PASS=$((PASS+1)); else echo "FAIL: $2"; FAIL=$((FAIL+1)); fi; }

check '|Lc|' "Missing |Lc| notation in text color token descriptions"
check 'APCA Contrast Guidance\|APCA contrast\|APCA Lc' "Missing APCA contrast guidance CSS comment block"
check 'Lc' "Missing Lc threshold values at type scale steps"
check 'text-primary' "Missing text-primary with Lc annotation"
check 'text-secondary' "Missing text-secondary with Lc annotation"
check 'myndex.com/APCA\|myndex.com' "Missing myndex.com/APCA calculator reference"
check 'APCA' "Missing APCA mention in skill"
check '0.98G\|APCA-W3\|0\.98G' "Missing APCA version reference (0.98G)"

echo "SYS-04 APCA guidance: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
