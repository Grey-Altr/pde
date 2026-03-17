#!/usr/bin/env bash
# INFRA-02 — Manifest schema coverage flags test
#
# Requirement: templates/design-manifest.json contains exactly 13 has* coverage
# flags in the designCoverage block, in canonical order, all defaulting to false.
# hasBrief must be absent (tracked via artifacts.BRF, not a coverage flag).
#
# Expected canonical order:
#   hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique,
#   hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity,
#   hasMockup, hasHigAudit, hasRecommendations
#
# Test type: structural / smoke
# Run: bash .planning/phases/24-schema-migration-infrastructure/test_infra02_manifest_schema.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MANIFEST="$REPO_ROOT/templates/design-manifest.json"

EXPECTED_FIELDS=(
  "hasDesignSystem"
  "hasWireframes"
  "hasFlows"
  "hasHardwareSpec"
  "hasCritique"
  "hasIterate"
  "hasHandoff"
  "hasIdeation"
  "hasCompetitive"
  "hasOpportunity"
  "hasMockup"
  "hasHigAudit"
  "hasRecommendations"
)

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 — $2"); }

echo "[templates/design-manifest.json]"
echo ""

# File must exist and be readable
if [[ ! -r "$MANIFEST" ]]; then
  fail "manifest file readable" "Cannot read: $MANIFEST"
  echo "────────────────────────────────────────────────────────────"
  echo "INFRA-02 Manifest schema: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "manifest file readable"

# Must be valid JSON (node is available for JSON parsing)
if ! node -e "JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'))" 2>/dev/null; then
  fail "manifest is valid JSON" "JSON.parse failed"
  echo "────────────────────────────────────────────────────────────"
  total=$((PASS + FAIL))
  echo "INFRA-02 Manifest schema: $total tests — $PASS passed, $FAIL failed"
  exit 1
fi
pass "manifest is valid JSON"

# designCoverage block must exist
has_coverage=$(node -e "
  const m = JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'));
  console.log(m.designCoverage && typeof m.designCoverage === 'object' ? 'yes' : 'no');
")
if [[ "$has_coverage" != "yes" ]]; then
  fail "designCoverage block exists and is an object" "Got: $has_coverage"
  echo "────────────────────────────────────────────────────────────"
  total=$((PASS + FAIL))
  echo "INFRA-02 Manifest schema: $total tests — $PASS passed, $FAIL failed"
  exit 1
fi
pass "designCoverage block exists and is an object"

# Count actual has* fields in designCoverage
actual_count=$(node -e "
  const m = JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'));
  const keys = Object.keys(m.designCoverage).filter(k => k.startsWith('has'));
  console.log(keys.length);
")

if [[ "$actual_count" -eq 13 ]]; then
  pass "designCoverage contains exactly 13 has* flags (found $actual_count)"
else
  actual_fields=$(node -e "
    const m = JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'));
    const keys = Object.keys(m.designCoverage).filter(k => k.startsWith('has'));
    console.log(keys.join(', '));
  ")
  fail "designCoverage contains exactly 13 has* flags (found $actual_count)" "Actual: $actual_fields"
fi

# Every expected field must be present
for field in "${EXPECTED_FIELDS[@]}"; do
  present=$(node -e "
    const m = JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'));
    console.log(Object.prototype.hasOwnProperty.call(m.designCoverage, '$field') ? 'yes' : 'no');
  ")
  if [[ "$present" == "yes" ]]; then
    pass "designCoverage has field \"$field\""
  else
    fail "designCoverage has field \"$field\"" "Field missing from designCoverage block"
  fi
done

# hasBrief must be absent (forbidden field)
has_brief=$(node -e "
  const m = JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'));
  console.log(Object.prototype.hasOwnProperty.call(m.designCoverage, 'hasBrief') ? 'yes' : 'no');
")
if [[ "$has_brief" == "no" ]]; then
  pass "designCoverage does NOT contain forbidden field \"hasBrief\""
else
  fail "designCoverage does NOT contain forbidden field \"hasBrief\"" "hasBrief must be absent (tracked via artifacts.BRF)"
fi

# All has* fields must default to boolean false
bad_defaults=$(node -e "
  const m = JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'));
  const bad = Object.keys(m.designCoverage)
    .filter(k => k.startsWith('has') && m.designCoverage[k] !== false);
  console.log(bad.length > 0 ? bad.join(', ') : '');
")
if [[ -z "$bad_defaults" ]]; then
  pass "all has* fields default to false"
else
  fail "all has* fields default to false" "Non-false defaults: $bad_defaults"
fi

# Canonical field order — fields must appear in the exact expected sequence
order_ok=$(node -e "
  const m = JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'));
  const actual = Object.keys(m.designCoverage).filter(k => k.startsWith('has'));
  const expected = $(printf '%s\n' "${EXPECTED_FIELDS[@]}" | node -e "
    const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\n');
    process.stdout.write(JSON.stringify(lines));
  ");
  let ok = true;
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) { ok = false; break; }
  }
  console.log(ok ? 'yes' : 'no: actual=' + actual.join(','));
")
if [[ "$order_ok" == "yes" ]]; then
  pass "designCoverage fields appear in canonical order"
else
  fail "designCoverage fields appear in canonical order" "$order_ok"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "INFRA-02 Manifest schema: $total tests — $PASS passed, $FAIL failed"

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
