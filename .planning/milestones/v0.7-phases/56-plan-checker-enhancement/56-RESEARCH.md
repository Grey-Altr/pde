# Phase 56: Plan Checker Enhancement - Research

**Researched:** 2026-03-20
**Domain:** Static analysis passes in plan-checker agent, dependency graph analysis, BDD acceptance criteria generation, declaration-time integration verification
**Confidence:** HIGH

## Summary

Phase 56 extends `pde-plan-checker` with three new analysis passes that all run during the plan-checking step of `plan-phase.md`. The three passes are:

1. **Cross-phase dependency detection** (DEPS-01 through DEPS-06): Reads ROADMAP.md to find inter-phase dependencies and checks whether any task in the current phase's plan depends on work that is not yet built (wrong phase order, missing prerequisite, or unbuilt upstream artifact).

2. **Edge case surfacing** (EDGE-01 through EDGE-06): Analyzes PLAN.md task descriptions to identify uncovered error paths, empty states, and boundary conditions. Findings are always CONCERNS (never FAIL) and are capped at 5-8 per plan. HIGH severity findings generate BDD acceptance criteria candidates that the user must approve before appending.

3. **Declaration-time integration verification, Mode A** (INTG-01, INTG-03, INTG-05, INTG-06): Reads `<context>` @-references in PLAN.md files, checks whether the referenced files exist, flags orphan exports and name mismatches declared in plan tasks, and skips `# TOOL_MAP_PREREGISTERED` entries. Writes INTEGRATION-CHECK.md.

All three passes run inside the existing `pde-plan-checker` agent — the same agent spawn that already loads PLAN.md. No new agent is needed. The three passes produce three new artifacts: DEPENDENCY-GAPS.md, EDGE-CASES.md (surfaced as CONCERNS in readiness loop), and INTEGRATION-CHECK.md. The planner sees edge case findings in the revision loop but cannot be FAILed by them.

The architectural decision (from STATE.md) is explicit: "Three new plan-checker analysis passes (dependency, edge case, integration Mode A) share one agent spawn because all read PLAN.md." This is the primary constraint shaping the implementation.

**Primary recommendation:** Add three new dimensions (Dimension 9: Cross-Phase Dependencies, Dimension 10: Edge Cases, Dimension 11: Integration Mode A) to the pde-plan-checker agent, following the same issue-struct + dimension-output pattern as the existing 8 dimensions. Each new dimension writes its artifact file using the Bash Write tool call already available to the checker.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPS-01 | Pre-execution dependency checker reads ROADMAP.md phase graph and PLAN.md task declarations to detect dependencies on unbuilt work | roadmap.cjs `cmdRoadmapAnalyze` already returns `depends_on` and `disk_status` per phase; checker can call `pde-tools.cjs roadmap analyze` to get the graph in < 1 second |
| DEPS-02 | Dependency checker produces DEPENDENCY-GAPS.md with gap table (phase, task, dependency type, resolution options) | New artifact file; pattern follows READINESS.md and INTEGRATION-CHECK.md — YAML frontmatter + markdown table, written by the checker |
| DEPS-03 | Each detected gap includes structured fix proposals (reorder phases, add stub task, add prerequisite task) | Three canonical fix proposal types; checker encodes them as resolution_options in the gap table |
| DEPS-04 | Dependency checker completes in under 10 seconds regardless of milestone size | roadmap analyze is a pure file-read (no subprocess spawning), always < 1s; DEPS-06 scope bound (current + 1 upstream phase) prevents O(n) scan of full milestone |
| DEPS-05 | Dependency findings integrate into readiness gate as CONCERNS (missing but non-critical) or FAIL (missing and blocking) | Checker returns structured CONCERNS/FAIL findings via the existing issue_structure format; orchestrator already handles both levels |
| DEPS-06 | Scope is bounded to current phase + 1 upstream phase to prevent scope explosion | Explicit scope constraint; checker reads ROADMAP.md to identify the direct `depends_on` phase(s) only, does not recurse to transitive deps |
| EDGE-01 | Edge case analyzer reads PLAN.md and task shards to surface uncovered error paths, empty states, and boundary conditions | LLM reasoning pass — same strategy as RVAL-01 claim extraction; no regex can reliably identify error paths in natural-language task descriptions |
| EDGE-02 | Edge cases categorized by severity (HIGH / MEDIUM / LOW) with each referencing a specific plan element (file, function, state field) | Severity classification + element reference enforced by output schema; checker fills both fields or does not emit the finding |
| EDGE-03 | Output capped at 5-8 high-relevance findings per plan — no generic noise | Hard cap enforced by output instructions: if LLM reasoning surfaces more than 8, apply relevance filter (must reference specific plan element, must be actionable) |
| EDGE-04 | Edge case findings are always CONCERNS in readiness gate, never FAIL | Checker hardcodes severity="concerns" for all edge case findings; no code path sets severity="fail" for EDGE dimension |
| EDGE-05 | For HIGH severity edge cases, analyzer generates BDD-format acceptance criteria candidates | AC candidates generated inline by LLM reasoning; formatted as Given/When/Then per existing BDD convention in PLAN.md |
| EDGE-06 | User approves which generated ACs to append to PLAN.md before they are added | Interactive approval gate in plan-phase.md orchestrator after checker returns HIGH-severity ACs; orchestrator prompts user, writes approved ACs only |
| INTG-01 | Declaration-time verification (Mode A) detects orphan exports, name mismatches, and @-reference file existence in plan declarations | Plan `<context>` blocks contain `@path` lines; checker extracts paths, checks file existence, scans task `<files>` declarations for referenced names against actual exports |
| INTG-03 | TOOL_MAP pre-registration allowlist prevents false positives on intentionally pre-registered entries | `# TOOL_MAP_PREREGISTERED` annotation already committed to mcp-bridge.cjs in Phase 54; checker reads the annotation and excludes annotated entries from orphan detection |
| INTG-05 | Integration check scope is strictly bounded to files named in plan `<context>` @-references — never a full codebase scan | Explicit scope constraint; checker extracts @-references, builds allowlist, only inspects files in that allowlist |
| INTG-06 | INTEGRATION-CHECK.md produced with check table (task, reference, check type, result) | New artifact file; YAML frontmatter + markdown table, written by the checker alongside DEPENDENCY-GAPS.md |
</phase_requirements>

## Standard Stack

### Core

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| `pde-plan-checker` agent | `.claude/agents/pde-plan-checker.md` | Host for three new analysis dimensions | STATE.md architectural decision: all three passes share one agent spawn |
| `pde-tools.cjs roadmap analyze` | `bin/pde-tools.cjs` | Returns `depends_on` + `disk_status` per phase | Already exists; returns JSON with depends_on and disk_status per phase |
| Read, Bash, Glob, Grep | Claude built-ins | File existence, content inspection, @-reference resolution | Same tools already in pde-plan-checker allowed_tools |
| YAML frontmatter + markdown tables | New artifact files | Consistent artifact format for DEPENDENCY-GAPS.md and INTEGRATION-CHECK.md | All PDE artifact files (READINESS.md, RESEARCH-VALIDATION.md) use same pattern |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `bin/lib/roadmap.cjs` | existing | `cmdRoadmapAnalyze` parses depends_on + disk_status | Checker calls via pde-tools.cjs CLI; no direct require |
| `bin/lib/mcp-bridge.cjs` | existing | TOOL_MAP_PREREGISTERED annotation | Checker reads this file to find pre-registered entries when scanning for orphan exports |
| LLM reasoning | Claude model | Edge case identification (EDGE-01) and BDD AC generation (EDGE-05) | No regex can identify error paths in natural-language task descriptions |
| `plan-phase.md` orchestrator | existing | Interactive AC approval gate (EDGE-06) | Orchestrator handles the user-prompt-and-approve loop after checker returns |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single agent spawn (existing pde-plan-checker) | New dedicated dependency/edge/intg agents | STATE.md architectural decision explicitly chose shared spawn to avoid context cost; do not override |
| LLM reasoning for edge case detection | Regex pattern matching | Regex cannot handle the variety of task description styles; LLM reasoning matches pde-research-validator precedent |
| Write artifact files from checker agent | Return artifact_content strings | Checker already has Write via Bash (Read, Bash, Glob, Grep tools); writing from agent is correct for a non-read-only agent |

**Installation:** None required. No new npm packages. All tools are Claude built-ins or existing PDE CLI.

## Architecture Patterns

### How the Three New Passes Fit Into pde-plan-checker

The existing checker has 8 dimensions (Requirement Coverage, Task Completeness, Dependency Correctness, Key Links, Scope Sanity, Verification Derivation, Context Compliance, Nyquist Compliance). The three new passes become Dimensions 9, 10, and 11, following the same pattern:

```
## Dimension 9: Cross-Phase Dependencies
## Dimension 10: Edge Cases
## Dimension 11: Integration Mode A
```

Each dimension follows the existing structure:
1. **Question:** What is being verified?
2. **Process:** Step-by-step how to check it
3. **Output:** Issue format + artifact file written
4. **Severity rules:** When FAIL vs CONCERNS vs info

### Recommended Agent Structure Addition

```
pde-plan-checker.md
  ... (existing dimensions 1-8) ...

  ## Dimension 9: Cross-Phase Dependencies
  ├── Extract depends_on from ROADMAP.md for current phase
  ├── Call: pde-tools.cjs roadmap analyze → get disk_status per phase
  ├── For each depends_on phase: check disk_status === 'complete'
  ├── Flag gaps with resolution_options: [reorder, add_stub, add_prerequisite]
  └── Write: DEPENDENCY-GAPS.md

  ## Dimension 10: Edge Cases
  ├── LLM reasoning pass over task <action> and <acceptance_criteria> blocks
  ├── Identify: uncovered error paths, empty states, boundary conditions
  ├── Classify: severity (HIGH/MEDIUM/LOW) + specific plan element reference
  ├── Cap at 5-8 findings; return BDD AC candidates for HIGH findings
  └── Write: EDGE-CASES.md (findings only; AC approval happens in orchestrator)

  ## Dimension 11: Integration Mode A
  ├── Extract @-references from <context> blocks in each PLAN.md
  ├── Check file existence for each @-referenced path
  ├── For .cjs files: scan declared exports vs task <files> references
  ├── Skip TOOL_MAP_PREREGISTERED entries (read from mcp-bridge.cjs)
  └── Write: INTEGRATION-CHECK.md
```

### Pattern 1: Roadmap Dependency Graph Traversal

**What:** Read ROADMAP.md phase graph to identify upstream dependencies, check disk_status to determine if they are built.

**When to use:** DEPS-01, DEPS-04, DEPS-06 — must complete in under 10 seconds and must be bounded to direct deps only.

**Example:**
```bash
# Source: bin/lib/roadmap.cjs cmdRoadmapAnalyze — verified by direct read
ROADMAP_JSON=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" roadmap analyze --raw)
# Returns phases array with: { number, name, depends_on, disk_status, ... }
#
# DEPS-06: scope bounded to current phase's direct depends_on
# Do NOT recurse to transitive dependencies
CURRENT_DEPENDS=$(echo "$ROADMAP_JSON" | jq -r '.phases[] | select(.number == "56") | .depends_on')
# CURRENT_DEPENDS = "Phase 54" (or null if no deps)
#
# For each dep phase, check disk_status:
# 'complete' → no gap
# anything else → DEPENDENCY GAP
```

**Resolution option taxonomy (DEPS-03):**
```
resolution_options:
  - type: "reorder"    # Move current phase after dep phase in roadmap
  - type: "add_stub"   # Add stub task in current phase that scaffolds the dep
  - type: "add_prerequisite"  # Explicitly add dep phase before this one
```

### Pattern 2: Edge Case LLM Reasoning Pass

**What:** Read all task `<action>` and `<acceptance_criteria>` blocks, reason about what error conditions, empty states, and boundary conditions are not addressed.

**When to use:** EDGE-01 through EDGE-06 — always a reasoning pass, never a regex scan.

**Cap enforcement:**
```
Step 1: Identify all candidate edge cases via reasoning
Step 2: Filter to those that reference a SPECIFIC plan element
         (file path, function name, state field name — not a generic category)
Step 3: Rank by severity (HIGH > MEDIUM > LOW)
Step 4: Take top 5-8
Step 5: For HIGH severity items, generate BDD AC candidates:
  Given [precondition from task context]
  When [action from task or adjacent task]
  Then [expected behavior that is currently unspecified]
```

**Severity classification:**
```
HIGH:   Missing error handling for a state transition that can visibly fail
        Missing validation for an input that could corrupt state
        Missing rollback for a multi-step write operation
MEDIUM: Missing empty-state UI handling
        Missing rate limit / retry logic
        Missing auth check on a write path
LOW:    Missing logging
        Missing optional validation (advisory only)
        Performance edge case with no correctness impact
```

### Pattern 3: @-Reference Extraction and Mode A Integration Checks

**What:** Parse `<context>` blocks in PLAN.md files to extract `@path` lines. Check file existence and declared exports vs. task references.

**Example @-reference format (verified from 55-01-PLAN.md):**
```
<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/55-research-validation-agent/55-RESEARCH.md
</context>
```

**Extraction:**
```bash
# Extract @-references from PLAN.md context blocks
grep -E "^@" "${PLAN_FILE}" | sed 's/^@//'
# Returns: .planning/PROJECT.md, .planning/ROADMAP.md, etc.

# Check file existence for each
for ref in $REFS; do
  test -f "${PROJECT_ROOT}/${ref}" && echo "EXISTS: $ref" || echo "MISSING: $ref"
done
```

**TOOL_MAP_PREREGISTERED filter (INTG-03):**
```bash
# Read mcp-bridge.cjs, find entries annotated with TOOL_MAP_PREREGISTERED
grep "TOOL_MAP_PREREGISTERED" bin/lib/mcp-bridge.cjs
# Returns: 'github:update-pr': ...,  // TOOL_MAP_PREREGISTERED
#          'github:search-issues': ..., // TOOL_MAP_PREREGISTERED
# These entries are EXCLUDED from orphan detection
```

**Scope bound (INTG-05):** Only inspect files explicitly listed in `<context>` @-references. Never glob the full codebase.

### Pattern 4: New Artifact File Format

Both DEPENDENCY-GAPS.md and INTEGRATION-CHECK.md follow the established PDE artifact format: YAML frontmatter + markdown content.

**DEPENDENCY-GAPS.md format:**
```markdown
---
phase: 56-plan-checker-enhancement
generated: "2026-03-20T..."
result: pass | concerns | fail
gap_count: N
---

# Phase 56: Dependency Gaps

**Generated:** {timestamp}
**Result:** {PASS | CONCERNS | FAIL}
**Gaps found:** N

## Gap Table

| Phase | Dependency | Status | Resolution Options |
|-------|------------|--------|-------------------|
| 56 | Phase 54 | complete | — |

## Resolution Details

(only present when gaps exist)
```

**INTEGRATION-CHECK.md format (INTG-06):**
```markdown
---
phase: 56-plan-checker-enhancement
generated: "2026-03-20T..."
result: pass | concerns | fail
checks_run: N
issues_found: N
---

# Phase 56: Integration Check

**Generated:** {timestamp}
**Mode:** A (declaration-time)
**Result:** {PASS | CONCERNS | FAIL}

## Check Table

| Task | Reference | Check Type | Result | Details |
|------|-----------|------------|--------|---------|
| Task 1 | @.planning/STATE.md | file_exists | PASS | — |
| Task 2 | mcp-bridge.cjs export foo | orphan_export | CONCERNS | No consumer found in task declarations |
```

### Pattern 5: Interactive AC Approval Gate (EDGE-06)

The plan-phase.md orchestrator (not the checker agent) handles EDGE-06's user approval loop.

**Flow:**
1. Checker returns findings with `high_severity_acs` field in its structured result
2. Orchestrator detects `high_severity_acs` in checker output
3. Orchestrator displays AC candidates to user with approval prompt
4. User selects which ACs to accept (checkbox-style or Y/N per AC)
5. Orchestrator appends approved ACs to the relevant PLAN.md `<acceptance_criteria>` block
6. Checker is NOT re-invoked just for the AC append — this is an additive operation, not a revision

**Checker return structure (new fields):**
```json
{
  "status": "ISSUES_FOUND | PASSED",
  "edge_cases": [
    {
      "severity": "HIGH",
      "plan_element": "bin/lib/readiness.cjs:writeReadinessMd()",
      "description": "No error handling if phase directory is not writable",
      "bdd_candidates": [
        "Given the phase directory has restricted write permissions When the checker writes READINESS.md Then an informative error is surfaced rather than a silent crash"
      ]
    }
  ],
  "dependency_gaps": [...],
  "integration_issues": [...]
}
```

### Anti-Patterns to Avoid

- **Giving edge case findings FAIL severity:** EDGE-04 is absolute — edge findings are CONCERNS only. No edge finding should ever set severity="fail" in the issue_structure.
- **Scanning beyond @-referenced files for INTG-01:** INTG-05 is strict scope control. The checker reads ONLY files listed in `<context>` @-references. Never grep the whole codebase.
- **Recursing into transitive dependencies for DEPS-06:** Only check direct `depends_on` from the current phase entry in ROADMAP.md. Transitive dependencies would violate DEPS-06 and cause O(n) runtime.
- **Emitting more than 8 edge case findings:** EDGE-03 hard cap. Apply relevance filter: finding must reference a specific plan element (not a generic category like "error handling"), must be actionable (user can write an AC for it), must be specific enough to produce a BDD scenario.
- **Flagging TOOL_MAP_PREREGISTERED entries as orphan exports:** INTG-03 requires the allowlist. Read the annotation before running orphan detection.
- **Re-running the full checker after AC append:** The AC approval loop in plan-phase.md appends ACs and does NOT trigger a new checker iteration. The checker has already passed; AC append is additive-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phase dependency graph | Parse ROADMAP.md manually with regex | `pde-tools.cjs roadmap analyze` | Already parses depends_on + disk_status per phase; returns clean JSON |
| @-reference extraction | Custom PLAN.md parser | `grep -E "^@"` inside `<context>` blocks | Context blocks follow consistent format; one grep extracts all refs |
| Edge case identification | Regex patterns for error keywords | LLM reasoning pass | Natural-language task descriptions require semantic understanding; RVAL-01 established this precedent |
| TOOL_MAP_PREREGISTERED detection | Hardcoded list of pre-registered entries | Read from mcp-bridge.cjs annotation | The annotation is the source of truth; hardcoding creates drift |
| BDD AC formatting | Custom template | Existing Given/When/Then convention from readiness.cjs plan-level ACs | Already established in check-readiness.md semantic check C3 |

**Key insight:** The dependency graph, @-reference parsing, and TOOL_MAP_PREREGISTERED annotation are all already in the codebase. The new passes are composition problems, not infrastructure problems.

## Common Pitfalls

### Pitfall 1: Edge Case Findings Becoming FAILs in Revision Loop

**What goes wrong:** Checker emits edge case findings with severity="blocker" or severity="fail", causing the planner to enter a mandatory revision loop that can never complete (since edge cases are always discoverable).

**Why it happens:** The existing issue_structure has "blocker" as the most severe level. A developer adding the edge case dimension might naturally use "blocker" for HIGH severity findings.

**How to avoid:** EDGE-04 is absolute. The edge case dimension must hardcode `severity: "concerns"` for ALL findings regardless of the finding's severity classification (HIGH/MEDIUM/LOW describes the edge case risk, not the checker issue severity). HIGH/MEDIUM/LOW is stored in the finding payload, not in the checker issue severity.

**Warning signs:** Plan revision loop iterating more than once because of edge case findings. HIGH edge case finding appears in "### Blockers (must fix)" section of ISSUES FOUND output.

### Pitfall 2: TOOL_MAP Orphan Detection on Pre-Registered Entries

**What goes wrong:** Integration checker flags `github:update-pr` and `github:search-issues` as orphan exports because no task in the current phase consumes them, generating false CONCERNS that confuse the planner.

**Why it happens:** Phase 54 added `# TOOL_MAP_PREREGISTERED` annotations to exactly these two entries precisely to prevent this. The checker must read the annotation before running orphan detection.

**How to avoid:** Step 1 of the integration dimension: read `bin/lib/mcp-bridge.cjs`, extract all entries annotated with `# TOOL_MAP_PREREGISTERED`, build an exclusion set. Run orphan detection only on non-excluded TOOL_MAP entries.

**Warning signs:** INTEGRATION-CHECK.md lists github:update-pr or github:search-issues as orphan exports.

### Pitfall 3: Dependency Analysis Exceeds 10 Seconds

**What goes wrong:** Checker scans all phases in the roadmap recursively (transitive dep resolution), causing execution to slow on milestones with 20+ phases.

**Why it happens:** "Check if dependencies are built" might be interpreted as "recursively verify the full transitive closure is built."

**How to avoid:** DEPS-06 is explicit: scope bounded to current phase + 1 upstream phase. The checker reads the current phase's `depends_on`, resolves disk_status for those exact phases only, and stops. No recursion. `roadmap analyze` itself runs in under 200ms on any reasonable ROADMAP.md.

**Warning signs:** Checker taking more than 3 seconds. DEPENDENCY-GAPS.md lists phases not in the current phase's direct depends_on.

### Pitfall 4: AC Approval Loop Triggers Full Checker Re-Run

**What goes wrong:** After the user approves ACs in EDGE-06, plan-phase.md sends the updated PLAN.md back through the full revision loop, causing the checker to run again, find new edge cases, generate new AC candidates, and enter an infinite loop.

**Why it happens:** The existing revision loop is triggered by any planner change. An AC append by the orchestrator is a planner-equivalent change in the current flow.

**How to avoid:** The AC approval step must be implemented OUTSIDE the revision loop — either after the loop exits, or as a separate post-loop step that writes to PLAN.md directly via the orchestrator (not via the planner). The checker must not be re-spawned after an AC-only append.

**Warning signs:** User is shown the same AC approval prompt twice for the same finding.

### Pitfall 5: Integration Scope Creep (Full Codebase Scan)

**What goes wrong:** The integration checker, looking for orphan exports, scans all .cjs files in bin/lib/ rather than only the files referenced in @-context lines.

**Why it happens:** "Find orphan exports" sounds like a codebase-wide operation.

**How to avoid:** INTG-05 is strict: the allowlist is ONLY files named in plan `<context>` @-references. The checker builds the allowlist first, then restricts all file operations to that list. Any file not in the @-references list is completely off-limits.

**Warning signs:** INTEGRATION-CHECK.md contains checks for files not listed in any `<context>` block of the phase's plans.

### Pitfall 6: Edge Case Findings Without Specific Plan Element Reference

**What goes wrong:** Checker emits an edge case finding like "error handling not covered" with no reference to a specific file, function, or state field. This is generic noise that the planner cannot act on.

**Why it happens:** LLM reasoning without tight output schema enforcement generates generic findings.

**How to avoid:** EDGE-02 requires that EVERY finding reference a specific plan element. If the finding can only reference "the plan in general," it fails the relevance filter and must be dropped. The output schema enforces: `plan_element` field is required, must match a pattern like `path/to/file.ext`, `function_name()`, or `state.field_name`.

**Warning signs:** Edge case finding's `plan_element` is "general" or empty. Finding describes a category ("error handling") rather than a specific location.

## Code Examples

### roadmap analyze output structure (verified by direct read of roadmap.cjs)

```javascript
// Source: bin/lib/roadmap.cjs cmdRoadmapAnalyze
// Returns phases array with these fields per phase:
{
  "phases": [
    {
      "number": "54",
      "name": "Tech Debt Closure",
      "goal": "All 7 known v0.6 tech debt items resolved...",
      "depends_on": null,  // or "Phase 54" / "Phase 55, Phase 56"
      "plan_count": 3,
      "summary_count": 3,
      "has_context": false,
      "has_research": true,
      "disk_status": "complete",  // complete | partial | planned | researched | discussed | empty | no_directory
      "roadmap_complete": true
    }
  ],
  "current_phase": { ... },
  "next_phase": { ... }
}
```

The `depends_on` field is a raw string from ROADMAP.md (e.g., "Phase 54" or "Phase 55, Phase 56"). The checker must parse it to extract phase numbers.

### @-reference extraction from PLAN.md context blocks

```bash
# Source: verified from .planning/phases/55-research-validation-agent/55-01-PLAN.md
# Context block format:
# <context>
# @.planning/PROJECT.md
# @.planning/ROADMAP.md
# @/absolute/path/to/file.md  (absolute paths also appear)
# </context>

# Extract @-references:
REFS=$(awk '/<context>/,/<\/context>/' "${PLAN_FILE}" | grep -E "^@" | sed 's/^@//')

# Normalize to absolute paths:
for ref in $REFS; do
  if [[ "$ref" == /* ]]; then
    echo "$ref"  # already absolute
  else
    echo "${PROJECT_ROOT}/${ref}"  # relative to project root
  fi
done
```

### TOOL_MAP_PREREGISTERED allowlist extraction

```bash
# Source: bin/lib/mcp-bridge.cjs lines 90, 93 — verified by direct read
# 'github:update-pr':     '...',  // TOOL_MAP_PREREGISTERED
# 'github:search-issues': '...',  // TOOL_MAP_PREREGISTERED

# Extract pre-registered tool names:
grep "TOOL_MAP_PREREGISTERED" bin/lib/mcp-bridge.cjs | \
  grep -oE "'[^']+'" | head -1 | tr -d "'"
# Returns: github:update-pr, github:search-issues
```

### Issue structure for new dimensions (follows existing pattern)

```yaml
# DEPS dimension — gap found, blocking
issue:
  plan: "56-01"
  dimension: "cross_phase_dependencies"
  severity: "blocker"           # Can be blocker or concerns
  description: "Plan depends on Phase 54 output but Phase 54 disk_status=planned"
  gap:
    phase: "54"
    dependency_type: "direct"
    upstream_status: "planned"
  resolution_options:
    - type: "reorder"
      description: "Execute Phase 54 before Phase 56"
    - type: "add_stub"
      description: "Add stub task in Phase 56 Wave 0 that scaffolds Phase 54 output"
    - type: "add_prerequisite"
      description: "Mark Phase 56 as depending on Phase 54 in ROADMAP.md"

# EDGE dimension — always CONCERNS, never blocker
issue:
  plan: "56-01"
  dimension: "edge_cases"
  severity: "concerns"          # ALWAYS concerns — never blocker
  description: "No error handling when DEPENDENCY-GAPS.md write fails"
  finding:
    severity_level: "HIGH"      # HIGH/MEDIUM/LOW describes the edge case risk
    plan_element: "bin/lib/readiness.cjs:writeReadinessMd()"
    category: "error_path"
    bdd_candidates:
      - "Given the phase directory is read-only When the checker writes DEPENDENCY-GAPS.md Then a clear error message is surfaced and the checker exits non-zero"

# INTG dimension — Mode A, CONCERNS for orphan
issue:
  plan: "56-01"
  dimension: "integration_mode_a"
  severity: "concerns"
  description: "Export 'cmdFoo' declared in task files but no consumer found in @-referenced files"
  reference: "@bin/lib/foo.cjs"
  check_type: "orphan_export"
  declared_name: "cmdFoo"
```

### DEPENDENCY-GAPS.md artifact structure

```markdown
---
phase: 56-plan-checker-enhancement
generated: "2026-03-20T00:00:00.000Z"
result: pass
gap_count: 0
---

# Phase 56: Dependency Gaps

**Generated:** 2026-03-20T00:00:00.000Z
**Result:** PASS
**Gaps found:** 0

## Dependency Check

| Upstream Phase | Status | Blocking |
|----------------|--------|---------|
| Phase 54 | complete | No |

No dependency gaps detected.
```

### INTEGRATION-CHECK.md artifact structure (INTG-06)

```markdown
---
phase: 56-plan-checker-enhancement
generated: "2026-03-20T00:00:00.000Z"
mode: A
result: pass
checks_run: 4
issues_found: 0
---

# Phase 56: Integration Check (Mode A)

**Generated:** 2026-03-20T00:00:00.000Z
**Mode:** A — Declaration-time
**Result:** PASS

## Check Table

| Task | Reference | Check Type | Result | Details |
|------|-----------|------------|--------|---------|
| Task 1 | @.planning/STATE.md | file_exists | PASS | — |
| Task 1 | @bin/lib/mcp-bridge.cjs | file_exists | PASS | — |
| Task 1 | github:update-pr | tool_map_orphan | SKIPPED | TOOL_MAP_PREREGISTERED |
| Task 2 | @bin/lib/readiness.cjs | orphan_export | PASS | All declared exports consumed |
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plan checker verifies plans but not cross-phase dep order | Dependency analysis pass in checker flags pre-execution gaps | Phase 56 (new) | Planner sees DEPENDENCY-GAPS.md before execution, not after a failed run |
| Edge cases discovered during execution (late feedback) | Edge cases surfaced at planning time as CONCERNS | Phase 56 (new) | User can add BDD ACs before execution rather than discovering gaps post-execution |
| @-references in plans are untested until executor tries to read them | Declaration-time check verifies @-referenced files exist | Phase 56 (new) | Broken @-references caught before executor context is burned |
| TOOL_MAP_PREREGISTERED annotation added in Phase 54 but no consumer | Integration checker reads annotation to suppress false positives | Phase 56 (new) | DEBT-06 and INTG-03 are paired: annotation + checker consumer |

**Deprecated/outdated:**
- Nothing deprecated. Phase 56 is additive to the existing plan-checker.

## Open Questions

1. **How does plan-phase.md orchestrator surface the AC approval gate for EDGE-06?**
   - What we know: Checker returns `high_severity_acs` in its return structure; orchestrator handles the display and approval loop
   - What's unclear: Whether the approval loop is a Task() spawn (new sub-agent) or an inline display in the orchestrator; the orchestrator already has Read/Write access to PLAN.md
   - Recommendation: Inline display in orchestrator is simpler and lower context cost; the orchestrator already has the context to write approved ACs directly using Edit tool

2. **What disk_status values count as "not yet built" for DEPS-01?**
   - What we know: roadmap.cjs returns: complete, partial, planned, researched, discussed, empty, no_directory
   - What's unclear: Should "partial" (some plans complete, some not) be a FAIL gap or CONCERNS gap?
   - Recommendation: "complete" = no gap; "partial" = CONCERNS gap (partially done, may have what's needed); all others (planned/researched/discussed/empty/no_directory) = FAIL gap (nothing built yet). Document this in DEPENDENCY-GAPS.md result field.

3. **Does EDGE-05's BDD candidate generation run unconditionally or only when HIGH findings exist?**
   - What we know: EDGE-05 says "for HIGH severity edge cases, analyzer generates BDD-format acceptance criteria candidates"
   - What's unclear: Whether the BDD generation is a second LLM pass or inline with edge case identification
   - Recommendation: Inline — when the LLM identifies a HIGH severity finding, it generates the BDD candidates in the same reasoning pass. This avoids a second agent call and matches the flow of claim extraction + tier classification in pde-research-validator.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None (pde-plan-checker is a markdown agent file; no unit test runner) |
| Config file | none |
| Quick run command | `grep "Dimension 9\|cross_phase_dep" ~/.claude/agents/pde-plan-checker.md` |
| Full suite command | Manual: run plan-phase against a test phase; inspect DEPENDENCY-GAPS.md, EDGE-CASES.md, INTEGRATION-CHECK.md |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPS-01 | Checker reads ROADMAP.md phase graph | smoke | `grep "roadmap analyze\|Dimension 9\|cross_phase" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| DEPS-02 | DEPENDENCY-GAPS.md produced | smoke | `test -f .planning/phases/56*/56-DEPENDENCY-GAPS.md && echo PASS` | ❌ Wave 0 |
| DEPS-03 | Gap entries include resolution_options | smoke | `grep "reorder\|add_stub\|add_prerequisite" .planning/phases/56*/56-DEPENDENCY-GAPS.md` | ❌ Wave 0 |
| DEPS-04 | Completes in < 10 seconds | smoke | `time node bin/pde-tools.cjs roadmap analyze --raw \| wc -l` (roadmap analyze < 1s) | ✅ existing |
| DEPS-05 | Findings in readiness gate as CONCERNS or FAIL | smoke | `grep "cross_phase_dep" ~/.claude/agents/pde-plan-checker.md \| grep "severity"` | ❌ Wave 0 |
| DEPS-06 | Scope bounded to direct deps only | smoke | `grep "DEPS-06\|transitive\|direct.*dep" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| EDGE-01 | Edge case analyzer reads task blocks | smoke | `grep "Dimension 10\|edge.case\|error.path\|boundary" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| EDGE-02 | Findings reference specific plan elements | smoke | `grep "plan_element\|file.*function\|state.field" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| EDGE-03 | Cap at 5-8 findings | smoke | `grep "5-8\|cap.*find\|find.*cap" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| EDGE-04 | All edge findings are CONCERNS | smoke | `grep -A5 "edge_cases" ~/.claude/agents/pde-plan-checker.md \| grep "severity.*concerns"` | ❌ Wave 0 |
| EDGE-05 | HIGH findings generate BDD candidates | smoke | `grep "bdd_candidates\|BDD.*HIGH\|HIGH.*BDD" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| EDGE-06 | User approves ACs before append | smoke | `grep "EDGE-06\|approval\|approve.*AC\|AC.*approve" workflows/plan-phase.md` | ❌ Wave 0 |
| INTG-01 | Mode A detects orphan exports and @-ref existence | smoke | `grep "Dimension 11\|Mode A\|orphan_export\|@-ref" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| INTG-03 | TOOL_MAP_PREREGISTERED entries skipped | smoke | `grep "TOOL_MAP_PREREGISTERED" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| INTG-05 | Scope bounded to @-referenced files | smoke | `grep "INTG-05\|context.*@\|@-reference.*scope\|bounded" ~/.claude/agents/pde-plan-checker.md` | ❌ Wave 0 |
| INTG-06 | INTEGRATION-CHECK.md produced | smoke | `test -f .planning/phases/56*/56-INTEGRATION-CHECK.md && echo PASS` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `grep` the modified agent/workflow file for the specific pattern added
- **Per wave merge:** Manual smoke test: run plan-phase on a test phase that has a known dep gap and verify DEPENDENCY-GAPS.md appears
- **Phase gate:** All 16 phase requirements TRUE before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `~/.claude/agents/pde-plan-checker.md` update — adds Dimensions 9, 10, 11; covers DEPS-01 through DEPS-06, EDGE-01 through EDGE-06, INTG-01, INTG-03, INTG-05
- [ ] `templates/dependency-gaps.md` — DEPENDENCY-GAPS.md output template; covers DEPS-02
- [ ] `templates/integration-check.md` — INTEGRATION-CHECK.md output template; covers INTG-06
- [ ] `workflows/plan-phase.md` update — AC approval gate step; covers EDGE-06

*Note: INTEGRATION-CHECK.md output (INTG-06) is written by the checker agent, not the orchestrator, because the checker has Bash write access (unlike pde-research-validator). The orchestrator handles only the AC approval gate (EDGE-06).*

## Sources

### Primary (HIGH confidence)

- Direct file read: `~/.claude/agents/pde-plan-checker.md` — existing 8 dimensions, issue_structure format, verification_process, tool set
- Direct file read: `bin/lib/roadmap.cjs` — cmdRoadmapAnalyze, depends_on parsing, disk_status values
- Direct file read: `bin/lib/readiness.cjs` — classifyResult (PASS/CONCERNS/FAIL precedence), writeReadinessMd pattern, check ID system (A1-A11, B1-B3)
- Direct file read: `workflows/plan-phase.md` — checker spawn at Step 10, revision loop (max 3 iterations), checker prompt structure
- Direct file read: `bin/lib/mcp-bridge.cjs` — TOOL_MAP, TOOL_MAP_PREREGISTERED annotation (lines 90, 93)
- Direct file read: `.planning/phases/55-research-validation-agent/55-01-PLAN.md` — @-reference format in `<context>` blocks
- Direct file read: `.planning/REQUIREMENTS.md` — authoritative DEPS-01 through INTG-06 definitions
- Direct file read: `.planning/STATE.md` — v0.7 architectural decision: "three new plan-checker analysis passes share one agent spawn"

### Secondary (MEDIUM confidence)

- Direct file read: `agents/pde-research-validator.md` — LLM reasoning pass pattern (edge case detection mirrors claim extraction approach)
- Direct file read: `workflows/check-readiness.md` — semantic checks C1-C3 pattern (CONCERNS-only findings precedent)
- Direct file read: `templates/research-validation.md` — artifact file template format (YAML frontmatter + tables)

### Tertiary (LOW confidence)

- None. All findings are from direct codebase reads.

## Metadata

**Confidence breakdown:**
- Existing plan-checker structure: HIGH — direct read of pde-plan-checker.md confirmed 8 dimensions, issue format, tool set
- roadmap.cjs dependency graph API: HIGH — direct read confirmed cmdRoadmapAnalyze returns depends_on + disk_status
- @-reference extraction pattern: HIGH — direct read of 55-01-PLAN.md confirmed `@path` format inside `<context>` blocks
- TOOL_MAP_PREREGISTERED annotation: HIGH — direct read of mcp-bridge.cjs lines 90, 93 confirmed annotation exists at both entries
- Edge case LLM pass: MEDIUM — approach follows pde-research-validator precedent (LLM extraction); no prior example of edge case detection in PDE
- EDGE-06 AC approval gate: MEDIUM — flow inferred from REQUIREMENTS.md; implementation detail (inline vs. Task() spawn) is an open question
- Performance guarantee (DEPS-04 < 10s): HIGH — roadmap analyze is pure file-read; verified by inspecting cmdRoadmapAnalyze (no subprocess, no network)

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable codebase, no external dependencies)
