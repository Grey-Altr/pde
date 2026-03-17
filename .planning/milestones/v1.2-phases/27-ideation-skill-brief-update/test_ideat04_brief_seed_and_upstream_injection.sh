#!/usr/bin/env bash
# IDEAT-04 — Brief Seed section + brief.md upstream context injection structural test
#
# Requirement: workflows/ideate.md has "## Brief Seed" section with 9 required
# fields matching templates/brief-seed.md schema; workflows/brief.md Sub-step 2c
# contains Glob probes for IDT-ideation-v*.md, CMP-competitive-v*.md,
# OPP-opportunity-v*.md; brief.md Step 5 enrichment block references IDT_CONTEXT.
#
# Test type: structural / smoke
# Run: bash .planning/phases/27-ideation-skill-brief-update/test_ideat04_brief_seed_and_upstream_injection.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

WORKFLOW_FILE="$REPO_ROOT/workflows/ideate.md"
BRIEF_FILE="$REPO_ROOT/workflows/brief.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

# ── workflows/ideate.md — ## Brief Seed section ───────────────────────────────

echo ""
echo "[workflows/ideate.md — ## Brief Seed section]"

if [[ ! -r "$WORKFLOW_FILE" ]]; then
  fail "workflows/ideate.md exists and is readable" "Cannot read: $WORKFLOW_FILE"
else
  pass "workflows/ideate.md exists and is readable"

  if grep -qiF '## Brief Seed' "$WORKFLOW_FILE"; then
    pass "workflows/ideate.md has '## Brief Seed' section heading"
  else
    fail "workflows/ideate.md has '## Brief Seed' section heading" "Pattern '## Brief Seed' not found"
  fi

  # 9 required fields from templates/brief-seed.md schema
  BRIEF_SEED_FIELDS=(
    "Problem Statement"
    "Product Type"
    "Platform"
    "Target Users"
    "Scope Boundaries"
    "Constraints"
    "Key Decisions"
    "Risk Register"
    "Next Steps"
  )

  for field in "${BRIEF_SEED_FIELDS[@]}"; do
    if grep -qiF "### $field" "$WORKFLOW_FILE"; then
      pass "Brief Seed section contains field: ### $field"
    else
      fail "Brief Seed section contains field: ### $field" "Pattern '### $field' not found in $WORKFLOW_FILE"
    fi
  done
fi

# ── workflows/brief.md — Sub-step 2c Glob probes ─────────────────────────────

echo ""
echo "[workflows/brief.md — Sub-step 2c upstream context injection]"

if [[ ! -r "$BRIEF_FILE" ]]; then
  fail "workflows/brief.md exists and is readable" "Cannot read: $BRIEF_FILE"
else
  pass "workflows/brief.md exists and is readable"

  # Sub-step 2c heading present
  if grep -qiF 'Sub-step 2c' "$BRIEF_FILE"; then
    pass "workflows/brief.md has 'Sub-step 2c' upstream context injection block"
  else
    fail "workflows/brief.md has 'Sub-step 2c' upstream context injection block" "Pattern 'Sub-step 2c' not found"
  fi

  # Glob probes for all three artifact patterns
  GLOB_PATTERNS=(
    "IDT-ideation-v*.md"
    "CMP-competitive-v*.md"
    "OPP-opportunity-v*.md"
  )

  for pattern in "${GLOB_PATTERNS[@]}"; do
    if grep -qF "$pattern" "$BRIEF_FILE"; then
      pass "Sub-step 2c has Glob probe for: $pattern"
    else
      fail "Sub-step 2c has Glob probe for: $pattern" "Pattern '$pattern' not found in $BRIEF_FILE"
    fi
  done

  # Null-context fallthrough declarations (graceful degradation)
  NULL_CONTEXT_VARS=(
    "IDT_CONTEXT = null"
    "CMP_CONTEXT = null"
    "OPP_CONTEXT = null"
  )

  for var in "${NULL_CONTEXT_VARS[@]}"; do
    if grep -qiF "$var" "$BRIEF_FILE"; then
      pass "Sub-step 2c sets $var on artifact miss (graceful degradation)"
    else
      fail "Sub-step 2c sets $var on artifact miss (graceful degradation)" "Pattern '$var' not found in $BRIEF_FILE"
    fi
  done

  # All probes are soft — never halt (graceful degradation declaration)
  if grep -qiE 'all soft.*never halt|never halt' "$BRIEF_FILE"; then
    pass "Sub-step 2c probes are declared soft — never halt"
  else
    fail "Sub-step 2c probes are declared soft — never halt" "No 'all soft' or 'never halt' declaration found"
  fi
fi

# ── workflows/brief.md — Step 5 enrichment references IDT_CONTEXT ────────────

echo ""
echo "[workflows/brief.md — Step 5 enrichment IDT_CONTEXT reference]"

if [[ -r "$BRIEF_FILE" ]]; then
  if grep -qF 'IDT_CONTEXT' "$BRIEF_FILE"; then
    pass "workflows/brief.md Step 5 enrichment references IDT_CONTEXT"
  else
    fail "workflows/brief.md Step 5 enrichment references IDT_CONTEXT" "Pattern 'IDT_CONTEXT' not found in $BRIEF_FILE"
  fi

  # Brief Seed supersedes PROJECT.md (IDT Brief Seed primacy rule)
  if grep -qiE 'supersedes|IDT Brief Seed.*supersedes|supersedes.*PROJECT' "$BRIEF_FILE"; then
    pass "workflows/brief.md states IDT Brief Seed supersedes PROJECT.md when both exist"
  else
    fail "workflows/brief.md states IDT Brief Seed supersedes PROJECT.md when both exist" "No 'supersedes' primacy rule found for IDT Brief Seed"
  fi

  # Upstream context enrichment section heading or label
  if grep -qiE 'Upstream context enrichment|upstream context' "$BRIEF_FILE"; then
    pass "workflows/brief.md has upstream context enrichment guidance in Step 5"
  else
    fail "workflows/brief.md has upstream context enrichment guidance in Step 5" "No 'upstream context enrichment' label found"
  fi

  # Summary table Upstream context row
  if grep -qiE 'Upstream context' "$BRIEF_FILE"; then
    pass "workflows/brief.md Summary table has Upstream context row"
  else
    fail "workflows/brief.md Summary table has Upstream context row" "No 'Upstream context' row found in $BRIEF_FILE"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "IDEAT-04 Brief Seed + upstream injection: $total tests -- $PASS passed, $FAIL failed"

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
