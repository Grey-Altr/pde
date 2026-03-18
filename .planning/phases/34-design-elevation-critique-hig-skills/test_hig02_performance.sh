#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0
check() { if grep -qi "$1" "$2"; then PASS=$((PASS+1)); else echo "FAIL: $3"; FAIL=$((FAIL+1)); fi; }

FILE="workflows/hig.md"

check "GPU.composited\|gpu.composited" "$FILE" "Missing GPU-composited property reference"
check "layout.reflow\|layout reflow" "$FILE" "Missing layout reflow property identification"
check "transform.*opacity\|opacity.*transform" "$FILE" "Missing transform/opacity as safe properties"
check "width.*height\|margin.*padding" "$FILE" "Missing width/height/margin/padding as reflow properties"
check "will-change" "$FILE" "Missing will-change audit guidance"
check "Animation Performance" "$FILE" "Missing Animation Performance section header"

echo "HIG-02: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
