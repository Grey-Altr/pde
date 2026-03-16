#!/usr/bin/env bash
# Phase 20 — Nyquist gap-fill tests / ORC-01, ORC-02, ORC-03
# Run from project root: bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh

set -euo pipefail

PASS=0
FAIL=0
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WORKFLOW="$ROOT/workflows/build.md"
COMMAND="$ROOT/commands/build.md"

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

# ─── ORC-01: Orchestrator reads state and sequences stages ───────────────────
echo ""
echo "=== ORC-01: build orchestrator reads designCoverage and sequences 7 stages ==="

# workflows/build.md must exist
if [[ -f "$WORKFLOW" ]]; then pass "workflows/build.md exists"; else fail "workflows/build.md not found at $WORKFLOW"; fi

# File must be at least 200 lines
if [[ -f "$WORKFLOW" ]]; then
  LINE_COUNT=$(wc -l < "$WORKFLOW" | tr -d ' ')
  if [[ "$LINE_COUNT" -ge 200 ]]; then
    pass "workflows/build.md has $LINE_COUNT lines (>= 200)"
  else
    fail "workflows/build.md has only $LINE_COUNT lines (< 200)"
  fi
else
  fail "workflows/build.md line count check skipped (file missing)"
fi

# All 7 stage headers must be present — test for each individually
for STAGE in "Stage 1/7" "Stage 2/7" "Stage 3/7" "Stage 4/7" "Stage 5/7" "Stage 6/7" "Stage 7/7"; do
  if [[ -f "$WORKFLOW" ]] && grep -q "$STAGE" "$WORKFLOW"; then
    pass "contains '$STAGE'"
  else
    fail "missing '$STAGE'"
  fi
done

# References coverage-check for state reading
if [[ -f "$WORKFLOW" ]] && grep -q "coverage-check" "$WORKFLOW"; then
  pass "references coverage-check for state reading"
else
  fail "missing coverage-check reference"
fi

# References BRF-brief-v for brief existence check (Glob pattern, not hasBrief)
if [[ -f "$WORKFLOW" ]] && grep -q "BRF-brief-v" "$WORKFLOW"; then
  pass "references BRF-brief-v for brief existence check"
else
  fail "missing BRF-brief-v reference"
fi

# Does NOT contain hasBrief string (removed in Phase 15.1)
if [[ -f "$WORKFLOW" ]] && ! grep -q "hasBrief" "$WORKFLOW"; then
  pass "does NOT contain hasBrief (correctly uses Glob check)"
else
  fail "found hasBrief reference (must use Glob on BRF-brief-v*.md instead)"
fi

# References config.json for mode check
if [[ -f "$WORKFLOW" ]] && grep -q "config.json" "$WORKFLOW"; then
  pass "references config.json for mode check"
else
  fail "missing config.json reference"
fi

# References AskUserQuestion for interactive gates
if [[ -f "$WORKFLOW" ]] && grep -q "AskUserQuestion" "$WORKFLOW"; then
  pass "references AskUserQuestion for interactive gates"
else
  fail "missing AskUserQuestion reference"
fi

# ─── ORC-02: Command stub and delegation ─────────────────────────────────────
echo ""
echo "=== ORC-02: commands/build.md exists and delegates to workflows/build.md ==="

# All 7 skill command files must exist
for SKILL_CMD in "commands/brief.md" "commands/system.md" "commands/flows.md" "commands/wireframe.md" "commands/critique.md" "commands/iterate.md" "commands/handoff.md"; do
  if [[ -f "$ROOT/$SKILL_CMD" ]]; then
    pass "$SKILL_CMD exists"
  else
    fail "$SKILL_CMD not found"
  fi
done

# commands/build.md must exist
if [[ -f "$COMMAND" ]]; then pass "commands/build.md exists"; else fail "commands/build.md not found at $COMMAND"; fi

# commands/build.md references @workflows/build.md
if [[ -f "$COMMAND" ]] && grep -q "@workflows/build.md" "$COMMAND"; then
  pass "commands/build.md delegates to @workflows/build.md"
else
  fail "commands/build.md missing @workflows/build.md delegation"
fi

# ─── ORC-03: Orchestrator is read-only — sets no coverage flags ──────────────
echo ""
echo "=== ORC-03: orchestrator contains zero skill logic, no coverage writes ==="

# workflows/build.md does NOT contain manifest-set-top-level
if [[ -f "$WORKFLOW" ]] && ! grep -q "manifest-set-top-level" "$WORKFLOW"; then
  pass "does NOT contain manifest-set-top-level (orchestrator sets no coverage flags)"
else
  fail "found manifest-set-top-level in orchestrator (must not set coverage flags)"
fi

# workflows/build.md does NOT contain designCoverage write patterns
if [[ -f "$WORKFLOW" ]] && ! grep -qE "designCoverage\s*=" "$WORKFLOW"; then
  pass "does NOT contain designCoverage assignment pattern"
else
  fail "found designCoverage assignment in orchestrator (read-only)"
fi

# Contains exactly 7 Skill(skill="pde: invocations (one per stage)
if [[ -f "$WORKFLOW" ]]; then
  SKILL_COUNT=$(grep -c 'Skill(skill="pde:' "$WORKFLOW" || true)
  if [[ "$SKILL_COUNT" -eq 7 ]]; then
    pass "contains exactly 7 Skill(skill=\"pde:...\") invocations"
  else
    fail "expected 7 Skill(skill=\"pde:...\") invocations, found $SKILL_COUNT"
  fi
else
  fail "Skill count check skipped (file missing)"
fi

# Does NOT contain Task( invocations (must use Skill, not Task — per #686)
if [[ -f "$WORKFLOW" ]] && ! grep -q "Task(" "$WORKFLOW"; then
  pass "does NOT contain Task() invocations (correctly uses Skill())"
else
  fail "found Task() invocation in orchestrator (must use Skill() only)"
fi

# Each of the 7 skill names appears in a Skill() call
for SKILL in "pde:brief" "pde:system" "pde:flows" "pde:wireframe" "pde:critique" "pde:iterate" "pde:handoff"; do
  if [[ -f "$WORKFLOW" ]] && grep -q "Skill(skill=\"${SKILL}\"" "$WORKFLOW"; then
    pass "Skill(skill=\"${SKILL}\") present"
  else
    fail "missing Skill(skill=\"${SKILL}\") invocation"
  fi
done

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
echo ""

if [[ "$FAIL" -eq 0 ]]; then
  echo "ALL TESTS PASSED"
  exit 0
else
  echo "SOME TESTS FAILED"
  exit 1
fi
