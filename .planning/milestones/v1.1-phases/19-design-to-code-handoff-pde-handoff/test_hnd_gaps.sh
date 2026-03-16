#!/usr/bin/env bash
# Phase 19 — Nyquist gap-fill tests
# HND-01, HND-02, HND-03
# Run from project root: bash .planning/phases/19-design-to-code-handoff-pde-handoff/test_hnd_gaps.sh

set -euo pipefail

PASS=0
FAIL=0
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WORKFLOW="$ROOT/workflows/handoff.md"
COMMAND="$ROOT/commands/handoff.md"

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

# ─── HND-01: Artifact synthesis and output spec ──────────────────────────────
echo ""
echo "=== HND-01: handoff synthesizes upstream artifacts into HND-handoff-spec-v{N}.md ==="

# workflows/handoff.md must exist
if [[ -f "$WORKFLOW" ]]; then pass "workflows/handoff.md exists"; else fail "workflows/handoff.md not found at $WORKFLOW"; fi

# File must be at least 400 lines
LINE_COUNT=$(wc -l < "$WORKFLOW" | tr -d ' ')
if [[ "$LINE_COUNT" -ge 400 ]]; then
  pass "workflows/handoff.md has $LINE_COUNT lines (>= 400)"
else
  fail "workflows/handoff.md has only $LINE_COUNT lines (< 400)"
fi

# All 7 step headers must be present — test for each individually
for STEP in "Step 1/7" "Step 2/7" "Step 3/7" "Step 4/7" "Step 5/7" "Step 6/7" "Step 7/7"; do
  if grep -q "$STEP" "$WORKFLOW"; then
    pass "contains '$STEP'"
  else
    fail "missing '$STEP'"
  fi
done

# Discovers all 7 upstream artifact types
for ARTIFACT_PATTERN in \
  "BRF-brief-v" \
  "FLW-flows-v" \
  "FLW-screen-inventory" \
  "WFR-" \
  "tokens.css" \
  "CRT-critique-v" \
  "ITR-changelog-v"
do
  if grep -q "$ARTIFACT_PATTERN" "$WORKFLOW"; then
    pass "discovers upstream artifact pattern: $ARTIFACT_PATTERN"
  else
    fail "missing upstream artifact pattern: $ARTIFACT_PATTERN"
  fi
done

# Writes HND-handoff-spec-v{N}.md output
if grep -q "HND-handoff-spec-v" "$WORKFLOW"; then
  pass "references HND-handoff-spec-v{N}.md output"
else
  fail "missing HND-handoff-spec-v{N}.md output reference"
fi

# commands/handoff.md delegates to workflow
if [[ -f "$COMMAND" ]]; then pass "commands/handoff.md exists"; else fail "commands/handoff.md not found at $COMMAND"; fi

if grep -q "@workflows/handoff.md" "$COMMAND"; then
  pass "commands/handoff.md delegates to @workflows/handoff.md"
else
  fail "commands/handoff.md missing @workflows/handoff.md delegation"
fi

if grep -q "ARGUMENTS" "$COMMAND"; then
  pass "commands/handoff.md passes \$ARGUMENTS to workflow"
else
  fail "commands/handoff.md missing \$ARGUMENTS pass-through"
fi

# No stale stub content
if ! grep -q "PDE v2" "$COMMAND" && ! grep -q "PDE v2" "$WORKFLOW"; then
  pass "no stale 'PDE v2' references in either file"
else
  fail "found stale 'PDE v2' reference"
fi

if ! grep -q "mockup" "$COMMAND" && ! grep -q "mockup" "$WORKFLOW"; then
  pass "no 'mockup' references in either file"
else
  fail "found stale 'mockup' reference"
fi

# templates/handoff-spec.md referenced as output scaffold
if grep -q "templates/handoff-spec.md" "$WORKFLOW"; then
  pass "workflow references templates/handoff-spec.md as output scaffold"
else
  fail "missing templates/handoff-spec.md scaffold reference"
fi

# ─── HND-02: TypeScript interface-only output (HND-types-v{N}.ts) ────────────
echo ""
echo "=== HND-02: handoff produces component APIs with TypeScript interfaces ==="

# Workflow references HND-types-v{N}.ts output
if grep -q "HND-types-v" "$WORKFLOW"; then
  pass "workflow references HND-types-v{N}.ts output"
else
  fail "missing HND-types-v{N}.ts output reference"
fi

# Interface-only TypeScript: must prohibit non-interface constructs
if grep -q "NO.*import" "$WORKFLOW" || grep -q "NO \`import\`" "$WORKFLOW" || grep -q "no.*import" "$WORKFLOW"; then
  pass "workflow prohibits import statements in types file"
else
  fail "workflow does not explicitly prohibit import statements in types file"
fi

if grep -q "NO.*export default\|NO \`export default\`\|no.*export default" "$WORKFLOW"; then
  pass "workflow prohibits export default in types file"
else
  fail "workflow does not explicitly prohibit 'export default' in types file"
fi

if grep -q "NO.*const\|NO \`const\`" "$WORKFLOW"; then
  pass "workflow prohibits const declarations in types file"
else
  fail "workflow does not explicitly prohibit const in types file"
fi

# Must describe interface generation — only interface/type declarations
if grep -q "interface {Name}" "$WORKFLOW" || grep -q "export interface" "$WORKFLOW"; then
  pass "workflow specifies export interface declarations for types output"
else
  fail "workflow missing export interface specification for types output"
fi

# ANNOTATION parsing for interface shapes
if grep -q "ANNOTATION:" "$WORKFLOW" || grep -q "<!-- ANNOTATION" "$WORKFLOW"; then
  pass "workflow parses ANNOTATION comments for interface shapes"
else
  fail "workflow missing ANNOTATION parsing for TypeScript interface shapes"
fi

# Section headers as box-drawing comments
if grep -q "─── " "$WORKFLOW"; then
  pass "workflow specifies box-drawing comment section headers for types file"
else
  fail "workflow missing box-drawing section header specification"
fi

# JSDoc requirement for interfaces
if grep -q "JSDoc" "$WORKFLOW"; then
  pass "workflow requires JSDoc comments on interface fields"
else
  fail "workflow missing JSDoc requirement for interface fields"
fi

# mcp__sequential-thinking__* in commands/handoff.md allowed-tools
if grep -q "mcp__sequential-thinking__\*" "$COMMAND"; then
  pass "commands/handoff.md includes mcp__sequential-thinking__* in allowed-tools"
else
  fail "commands/handoff.md missing mcp__sequential-thinking__* in allowed-tools"
fi

# ─── HND-03: STACK.md hard dependency ────────────────────────────────────────
echo ""
echo "=== HND-03: handoff reads STACK.md for technology alignment ==="

# STACK.md hard dependency check present
if grep -q "STACK.md" "$WORKFLOW"; then
  pass "workflow references STACK.md"
else
  fail "workflow does not reference STACK.md"
fi

# Exact halt message: "Error: No STACK.md found"
if grep -q "Error: No STACK.md found" "$WORKFLOW"; then
  pass "workflow contains exact halt message 'Error: No STACK.md found'"
else
  fail "workflow missing exact halt message 'Error: No STACK.md found at .planning/research/STACK.md.'"
fi

# HALT instruction must follow the error message
if grep -q "HALT" "$WORKFLOW"; then
  pass "workflow uses HALT instruction on STACK.md absence"
else
  fail "workflow missing HALT instruction on STACK.md absence"
fi

# Recovery message includes path
if grep -q "planning/research/STACK.md" "$WORKFLOW"; then
  pass "halt message includes full path .planning/research/STACK.md"
else
  fail "halt message missing full path .planning/research/STACK.md"
fi

# Framework detection logic — semantic reasoning mentioned
if grep -q "semantic reasoning\|semantic" "$WORKFLOW"; then
  pass "workflow specifies semantic reasoning for framework detection"
else
  fail "workflow missing semantic reasoning specification for framework detection"
fi

# Framework names React, Vue, Svelte mentioned for detection
for FW in "React" "Vue" "Svelte"; do
  if grep -q "$FW" "$WORKFLOW"; then
    pass "workflow handles framework detection for $FW"
  else
    fail "workflow missing framework detection for $FW"
  fi
done

# TypeScript detection described
if grep -q "TypeScript detection\|TYPESCRIPT" "$WORKFLOW"; then
  pass "workflow includes TypeScript detection logic"
else
  fail "workflow missing TypeScript detection logic"
fi

# STACK.md content drives output — framework used in stub generation
if grep -q "FRAMEWORK\|framework" "$WORKFLOW"; then
  pass "workflow uses detected FRAMEWORK for output generation"
else
  fail "workflow missing FRAMEWORK usage for output alignment"
fi

# Argument-hint in commands/handoff.md includes all major flags
for FLAG in "quick" "dry-run" "force"; do
  if grep -qe "\-\-${FLAG}" "$COMMAND"; then
    pass "commands/handoff.md argument-hint includes --$FLAG"
  else
    fail "commands/handoff.md argument-hint missing --$FLAG"
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
