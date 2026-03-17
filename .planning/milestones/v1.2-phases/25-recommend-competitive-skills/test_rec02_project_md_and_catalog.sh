#!/usr/bin/env bash
# REC-02 — Recommend workflow PROJECT.md hard-require and inline MCP catalog test
#
# Requirement: workflows/recommend.md Step 2 reads PROJECT.md (hard-require);
# inline MCP catalog exists with at least 7 categories.
#
# Test type: structural / smoke
# Run: bash .planning/phases/25-recommend-competitive-skills/test_rec02_project_md_and_catalog.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WF_FILE="$REPO_ROOT/workflows/recommend.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 — $2"); }

echo ""
echo "[workflows/recommend.md — file readable]"

if [[ ! -r "$WF_FILE" ]]; then
  fail "workflows/recommend.md — file readable" "Cannot read: $WF_FILE"
  echo "────────────────────────────────────────────────────────────"
  echo "REC-02 PROJECT.md hard-require and inline catalog: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "workflows/recommend.md — file readable"

# ── Step 2 reads PROJECT.md as hard requirement ───────────────────────────────
echo ""
echo "[workflows/recommend.md — Step 2 PROJECT.md hard-require]"

# Step 2 heading must exist
if grep -qE "^### Step 2/7:" "$WF_FILE"; then
  pass "workflows/recommend.md — Step 2/7 heading exists"
else
  fail "workflows/recommend.md — Step 2/7 heading exists" \
    "No '### Step 2/7:' heading found"
fi

# PROJECT.md must be mentioned within Step 2 content
if grep -qF "PROJECT.md" "$WF_FILE"; then
  pass "workflows/recommend.md — PROJECT.md referenced in workflow"
else
  fail "workflows/recommend.md — PROJECT.md referenced in workflow" \
    "PROJECT.md not found in file"
fi

# The HARD requirement must be stated — look for HALT instruction in context of PROJECT.md
if grep -qiE "(HALT|hard.require|hard requirement)" "$WF_FILE"; then
  pass "workflows/recommend.md — HALT / hard requirement directive present for PROJECT.md"
else
  fail "workflows/recommend.md — HALT / hard requirement directive present for PROJECT.md" \
    "No HALT or 'hard requirement' phrase found in file"
fi

# context_routing table must declare PROJECT.md as HARD
if grep -qE "PROJECT\.md.*HARD" "$WF_FILE"; then
  pass "workflows/recommend.md — context_routing marks PROJECT.md as HARD"
else
  fail "workflows/recommend.md — context_routing marks PROJECT.md as HARD" \
    "No 'PROJECT.md.*HARD' pattern found (context_routing table)"
fi

# ── Inline MCP catalog — 7 categories ────────────────────────────────────────
echo ""
echo "[workflows/recommend.md — inline MCP catalog categories]"

# The catalog must be present — look for the CATEGORY headings
catalog_count=$(grep -cE "^\*\*CATEGORY [0-9]+:" "$WF_FILE" || true)

if [[ "$catalog_count" -ge 7 ]]; then
  pass "workflows/recommend.md — inline catalog contains at least 7 CATEGORY blocks (found $catalog_count)"
else
  fail "workflows/recommend.md — inline catalog contains at least 7 CATEGORY blocks (found $catalog_count)" \
    "Expected >= 7 '**CATEGORY N:' headings; found $catalog_count"
fi

# Spot-check the 7 canonical category labels that the plan specifies
EXPECTED_CATEGORIES=(
  "AI"
  "Design"
  "Code Quality"
  "Data"
  "Deployment"
  "Research"
  "Collaboration"
)

for cat in "${EXPECTED_CATEGORIES[@]}"; do
  if grep -qiF "$cat" "$WF_FILE"; then
    pass "workflows/recommend.md — catalog mentions category '$cat'"
  else
    fail "workflows/recommend.md — catalog mentions category '$cat'" \
      "Category label not found in file"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "REC-02 PROJECT.md hard-require and inline catalog: $total tests — $PASS passed, $FAIL failed"

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
