#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/system.md"

check() { if grep -q "$1" "$SKILL"; then ((PASS++)); else echo "FAIL: $2"; ((FAIL++)); fi; }

check 'Type Pairing\|Type pairings\|type pairing' "Missing Type Pairing section heading"
check 'Playfair' "Missing Playfair Display pairing entry"
check 'EB Garamond\|EB_Garamond\|Garamond' "Missing EB Garamond pairing entry"
check 'Fraunces' "Missing Fraunces pairing entry"
check 'classification contrast\|Classification contrast' "Missing classification contrast rationale text"
check 'humanist serif\|humanist-serif' "Missing humanist serif classification terminology"
check 'humanist sans\|humanist-sans' "Missing humanist sans classification terminology"
check 'APCA\|Lc' "Missing APCA note in pairing recommendations"
check 'Inter' "Missing Inter font pairing reference"

echo "SYS-06 type pairings: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
