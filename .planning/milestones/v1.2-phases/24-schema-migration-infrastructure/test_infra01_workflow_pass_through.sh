#!/usr/bin/env bash
# INFRA-01 — Pass-through-all pattern structural test
#
# Requirement: All 6 v1.1 workflow files (system.md, flows.md, wireframe.md,
# critique.md, iterate.md, handoff.md) each contain all 13 coverage field names
# in their manifest-set-top-level designCoverage JSON command.
#
# Test type: structural / smoke
# Run: bash .planning/phases/24-schema-migration-infrastructure/test_infra01_workflow_pass_through.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

WORKFLOW_FILES=(
  "workflows/system.md"
  "workflows/flows.md"
  "workflows/wireframe.md"
  "workflows/critique.md"
  "workflows/iterate.md"
  "workflows/handoff.md"
)

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

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 — $2"); }

for rel in "${WORKFLOW_FILES[@]}"; do
  file="$REPO_ROOT/$rel"
  name="$(basename "$rel")"
  echo ""
  echo "[$name]"

  # File must exist and be readable
  if [[ ! -r "$file" ]]; then
    fail "$name — file readable" "Cannot read: $file"
    continue
  fi
  pass "$name — file readable"

  # Extract the manifest-set-top-level designCoverage command line(s).
  # Some files use backslash continuation — join continuation lines before checking.
  cmd_line="$(awk '
    /manifest-set-top-level/ && /designCoverage/ {
      line = $0
      # strip trailing backslash and append next line if present
      while (sub(/\\[[:space:]]*$/, "", line)) {
        if ((getline next_line) > 0) line = line next_line
      }
      print line
      found = 1
    }
    END { if (!found) print "" }
  ' "$file")"

  if [[ -z "$cmd_line" ]]; then
    fail "$name — contains manifest-set-top-level designCoverage command" "No matching line found"
    continue
  fi
  pass "$name — contains manifest-set-top-level designCoverage command"

  # Every required field must appear in the command line
  for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$cmd_line" | grep -qF "\"$field\""; then
      pass "$name — JSON contains \"$field\""
    else
      fail "$name — JSON contains \"$field\"" "Field absent from: $(echo "$cmd_line" | cut -c1-200)"
    fi
  done
done

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "INFRA-01 Pass-through-all: $total tests — $PASS passed, $FAIL failed"

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
