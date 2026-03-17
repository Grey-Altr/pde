#!/usr/bin/env bash
# COMP-01 — Competitive command delegation and workflow structure test
#
# Requirement: commands/competitive.md exists and delegates to @workflows/competitive.md;
# workflows/competitive.md has all required v1.2 sections (purpose, skill_code,
# context_routing, required_reading, flags, process, output);
# coverage flag write present with hasCompetitive:true in 13-field JSON.
#
# Test type: structural / smoke
# Run: bash .planning/phases/25-recommend-competitive-skills/test_comp01_command_and_workflow_structure.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CMD_FILE="$REPO_ROOT/commands/competitive.md"
WF_FILE="$REPO_ROOT/workflows/competitive.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 — $2"); }

# ── commands/competitive.md ───────────────────────────────────────────────────
echo ""
echo "[commands/competitive.md]"

if [[ ! -r "$CMD_FILE" ]]; then
  fail "commands/competitive.md — file readable" "Cannot read: $CMD_FILE"
else
  pass "commands/competitive.md — file readable"

  if grep -qF "@workflows/competitive.md" "$CMD_FILE"; then
    pass "commands/competitive.md — delegates to @workflows/competitive.md"
  else
    fail "commands/competitive.md — delegates to @workflows/competitive.md" \
      "@workflows/competitive.md not found in file"
  fi

  if grep -qF "@references/skill-style-guide.md" "$CMD_FILE"; then
    pass "commands/competitive.md — references skill-style-guide.md"
  else
    fail "commands/competitive.md — references skill-style-guide.md" \
      "@references/skill-style-guide.md not found in file"
  fi
fi

# ── workflows/competitive.md — file exists ────────────────────────────────────
echo ""
echo "[workflows/competitive.md — existence]"

if [[ ! -r "$WF_FILE" ]]; then
  fail "workflows/competitive.md — file readable" "Cannot read: $WF_FILE"
  echo ""
  echo "────────────────────────────────────────────────────────────"
  total=$((PASS + FAIL))
  echo "COMP-01 Command & workflow structure: $total tests — $PASS passed, $FAIL failed"
  exit 1
fi
pass "workflows/competitive.md — file readable"

# ── workflows/competitive.md — required v1.2 sections ────────────────────────
echo ""
echo "[workflows/competitive.md — required sections]"

REQUIRED_SECTIONS=(
  "<purpose>"
  "<skill_code>"
  "<context_routing>"
  "<required_reading>"
  "<flags>"
  "<process>"
  "<output>"
)

for section in "${REQUIRED_SECTIONS[@]}"; do
  if grep -qF "$section" "$WF_FILE"; then
    pass "workflows/competitive.md — contains section $section"
  else
    fail "workflows/competitive.md — contains section $section" \
      "Section tag not found in file"
  fi
done

# ── workflows/competitive.md — 7 pipeline steps ───────────────────────────────
echo ""
echo "[workflows/competitive.md — 7-step pipeline]"

step_count=$(grep -cE "^### Step [0-9]+/7:" "$WF_FILE" || true)

if [[ "$step_count" -eq 7 ]]; then
  pass "workflows/competitive.md — contains exactly 7 pipeline steps (Step N/7:)"
else
  fail "workflows/competitive.md — contains exactly 7 pipeline steps (Step N/7:)" \
    "Found $step_count step headings matching '### Step N/7:'"
fi

# ── workflows/competitive.md — coverage flag: coverage-check read ─────────────
echo ""
echo "[workflows/competitive.md — coverage flag write]"

if grep -qF "coverage-check" "$WF_FILE"; then
  pass "workflows/competitive.md — contains coverage-check read before flag write"
else
  fail "workflows/competitive.md — contains coverage-check read before flag write" \
    "coverage-check not found in file"
fi

# Extract the manifest-set-top-level designCoverage command line
cmd_line="$(awk '
  /manifest-set-top-level/ && /designCoverage/ {
    line = $0
    while (sub(/\\[[:space:]]*$/, "", line)) {
      if ((getline next_line) > 0) line = line next_line
    }
    print line
    found = 1
  }
  END { if (!found) print "" }
' "$WF_FILE")"

if [[ -z "$cmd_line" ]]; then
  fail "workflows/competitive.md — contains manifest-set-top-level designCoverage command" \
    "No matching line found"
else
  pass "workflows/competitive.md — contains manifest-set-top-level designCoverage command"

  # Check hasCompetitive:true is present in the JSON
  if echo "$cmd_line" | grep -qF '"hasCompetitive":true'; then
    pass "workflows/competitive.md — manifest-set-top-level sets hasCompetitive:true"
  else
    fail "workflows/competitive.md — manifest-set-top-level sets hasCompetitive:true" \
      "\"hasCompetitive\":true not found in command line: $(echo "$cmd_line" | cut -c1-300)"
  fi

  # All 13 canonical fields must be present in the JSON command
  REQUIRED_FIELDS=(
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

  for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$cmd_line" | grep -qF "\"$field\""; then
      pass "workflows/competitive.md — 13-field JSON contains \"$field\""
    else
      fail "workflows/competitive.md — 13-field JSON contains \"$field\"" \
        "Field absent from: $(echo "$cmd_line" | cut -c1-200)"
    fi
  done
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "COMP-01 Command & workflow structure: $total tests — $PASS passed, $FAIL failed"

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
