#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0

PROJ_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
FIXTURE_ROOT="${PROJ_ROOT}/.planning/pressure-test"

check() {
  if grep -qE "$1" "$2"; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $3"
    FAIL=$((FAIL+1))
  fi
}

check_exists() {
  if [ -f "$1" ]; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $2"
    FAIL=$((FAIL+1))
  fi
}

# 1. fixture-greenfield/design/design-manifest.json exists
check_exists "${FIXTURE_ROOT}/fixture-greenfield/design/design-manifest.json" "fixture-greenfield/design/design-manifest.json does not exist"

# 2. fixture-partial/design/design-manifest.json exists
check_exists "${FIXTURE_ROOT}/fixture-partial/design/design-manifest.json" "fixture-partial/design/design-manifest.json does not exist"

# 3. fixture-rerun/design/design-manifest.json exists
check_exists "${FIXTURE_ROOT}/fixture-rerun/design/design-manifest.json" "fixture-rerun/design/design-manifest.json does not exist"

# 4. Greenfield manifest has hasDesignSystem: false (all flags false — fresh state)
check '"hasDesignSystem": false' "${FIXTURE_ROOT}/fixture-greenfield/design/design-manifest.json" "fixture-greenfield manifest missing hasDesignSystem: false (not greenfield state)"

# 5. Partial manifest has hasDesignSystem: true (stages 1-7 done)
check '"hasDesignSystem": true' "${FIXTURE_ROOT}/fixture-partial/design/design-manifest.json" "fixture-partial manifest missing hasDesignSystem: true (stages 1-7 not marked complete)"

# 6. Rerun manifest has hasHandoff: true (all 13 stages complete)
check '"hasHandoff": true' "${FIXTURE_ROOT}/fixture-rerun/design/design-manifest.json" "fixture-rerun manifest missing hasHandoff: true (not all stages complete)"

echo "PRES-04: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
