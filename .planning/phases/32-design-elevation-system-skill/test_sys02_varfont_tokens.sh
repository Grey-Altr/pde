#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0; SKILL="workflows/system.md"

check() { if grep -q "$1" "$SKILL"; then PASS=$((PASS+1)); else echo "FAIL: $2"; FAIL=$((FAIL+1)); fi; }

check "wght" "Missing wght axis token"
check '"min": 100' "Missing wght axis range minimum (100)"
check '"max": 900' "Missing wght axis range maximum (900)"
check "wdth" "Missing wdth axis token"
check '"min": 75' "Missing wdth axis range minimum (75)"
check '"max": 125' "Missing wdth axis range maximum (125)"
check "opsz" "Missing opsz axis token"
check "caption" "Missing opsz caption range"
check '"min": 6' "Missing opsz caption min (6)"
check '"min": 12' "Missing opsz body min (12)"
check '"min": 24' "Missing opsz display min (24)"
check 'font\.variable\|font.variable' "Missing font.variable in DTCG JSON block"
check "font-variation-settings\|font-weight" "Missing font-variation-settings or font-weight animation reference"
check "animated" "Missing animated target value on axis token"
check "v-fonts.com" "Missing v-fonts.com verification reference"

echo "SYS-02 variable font tokens: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
