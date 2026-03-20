# Phase 50: Readiness Gate — Research

**Researched:** 2026-03-19
**Domain:** PDE pre-execution validation — plan consistency checking, PASS/CONCERNS/FAIL gate, executor blocking
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VRFY-03 | /pde:check-readiness command (or execute-phase pre-flight) runs PO-style checklist validating PROJECT.md + REQUIREMENTS.md + PLAN.md consistency; produces PASS/CONCERNS/FAIL | Existing command pattern (commands/execute-phase.md, commands/verify-phase.md), workflow file pattern (workflows/reconcile-phase.md), existing validate/consistency CLI subcommand stub in pde-tools.cjs; PLAN.md frontmatter schema known from Phase 48 |
| VRFY-04 | Execute-phase blocks on readiness gate FAIL result; CONCERNS proceeds with warning; PASS proceeds normally | execute-phase.md initialize step is the injection point; HALT gate mechanism from Phase 49 is the reuse pattern; AskUserQuestion for CONCERNS acknowledgment |
</phase_requirements>

---

## Summary

Phase 50 creates a pre-execution readiness gate that validates plan quality and consistency before any code changes. It introduces three coordinated artifacts: a new command (`commands/check-readiness.md`), a new workflow (`workflows/check-readiness.md`), and an integration hook in `workflows/execute-phase.md` that reads the last readiness result and blocks on FAIL.

The architecture mirrors Phase 49's HALT gate pattern exactly: a markdown-instructed agent does the validation, writes a result file (READINESS.md) to the phase directory, and the execute-phase orchestrator reads that file to decide whether to proceed. The PASS/CONCERNS/FAIL classification follows a simple severity-first rule identical to Phase 49's reconciliation status precedence. No new npm dependencies are needed.

The checklist items for VRFY-03 are deliberately left to be defined during planning ("draft as acceptance criteria during Phase 50 planning" — STATE.md Blockers section). Research has identified the structural categories: presence checks (required sections exist), consistency checks (requirement IDs in plan match REQUIREMENTS.md), and format checks (AC-N IDs follow the Phase 48 schema). The STATE.md blocker is resolved by this research: these three categories, applied with a specific severity mapping, produce the PASS/CONCERNS/FAIL classification.

**Primary recommendation:** Implement Phase 50 as two plans in one wave: Plan 01 creates the check-readiness command and workflow; Plan 02 hooks readiness result into execute-phase.md and documents the gate's behavior. This mirrors the Phase 49 split (reconcile-phase workflow vs HALT gates) that produced clean, independently-testable artifacts.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs` | Built-in (Node 20+) | Read PLAN.md, REQUIREMENTS.md, PROJECT.md for validation; write READINESS.md | Already used throughout bin/lib/*.cjs |
| Node.js `path` | Built-in | Path resolution for phase-scoped READINESS.md output | Already used throughout |
| `bin/lib/frontmatter.cjs` | existing | Extract PLAN.md frontmatter: phase, plan, requirements[], must_haves | Already imported by sharding.cjs, verify.cjs, commands.cjs; `extractFrontmatter()` already handles PLAN.md format |
| `bin/lib/sharding.cjs` | existing | `extractTaskBlocks()`, `extractField()`, `extractPlanAcBlock()` for reading PLAN.md task structure | Already exports these functions; reduces hand-rolled regex work to zero |
| `bin/pde-tools.cjs` | existing | CLI dispatch: new `readiness` subcommand follows existing switch-case pattern | All commands live in pde-tools.cjs dispatch; adding `case 'readiness':` is the established pattern |
| `AskUserQuestion` tool | Claude Code built-in | CONCERNS acknowledgment in execute-phase.md — presents warning, waits for user to proceed | Already in execute-phase.md's allowed-tools list |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bin/lib/roadmap.cjs` | existing | Get phase requirements from ROADMAP.md to cross-reference against PLAN.md `requirements:` field | Already parses ROADMAP.md; provides `getPhase()` which returns requirements array |
| `bin/lib/verify.cjs` | existing | Reference for consistency check patterns — already implements `cmdVerifyPlanStructure`, `cmdVerifyPhaseCompleteness` | Do not re-implement existing checks; check what `verify plan-structure` already catches |
| `bin/lib/reconciliation.cjs` | existing | Reference for severity-precedence pattern — Phase 49's status precedence algorithm is identical to PASS/CONCERNS/FAIL classification logic | Reuse the precedence pattern, not the reconciliation code itself |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `workflows/check-readiness.md` workflow file | Inline validation in the command file | Workflow file keeps validation logic isolated and testable; command file stays thin (like execute-phase.md which just calls the workflow). Inline would bloat the command file and make testing harder. |
| READINESS.md in phase directory | Readiness result in .planning/root | Phase directory is correct — readiness is per-phase, collocated with PLAN.md. Same convention as RECONCILIATION.md (Phase 49). |
| Agent-based validation (LLM reads files) | Node.js script-based validation (deterministic) | Both approaches are viable. Agent-based is simpler to implement but adds LLM indeterminism to a gate that should be deterministic. Hybrid: Node.js script for structural checks (presence, format), agent for semantic checks (does the plan make sense given requirements). This matches PDE's existing pattern — verify.cjs does structural checks, pde-verifier agent does goal-achievement checks. |
| Blocking execute-phase with an error | Blocking with AskUserQuestion | AskUserQuestion is the right tool — it presents context and waits for user acknowledgment. A hard error would be too rigid for CONCERNS. For FAIL, either a hard error OR AskUserQuestion with forced 'abort' is acceptable; AskUserQuestion is more user-friendly. |

**Installation:** No new npm packages. All implementation uses existing Node.js built-ins and PDE's existing infrastructure.

---

## Architecture Patterns

### Recommended Project Structure (Phase 50 additions)

```
commands/
└── check-readiness.md      # NEW — /pde:check-readiness command entry point

workflows/
└── check-readiness.md      # NEW — readiness validation workflow

bin/lib/
└── readiness.cjs           # NEW — structural validation logic (Node.js)

tests/
└── phase-50/
    ├── readiness-checks.test.mjs    # NEW — unit tests for structural checks
    └── readiness-report.test.mjs   # NEW — unit tests for READINESS.md format

.planning/phases/50-readiness-gate/
└── (READINESS.md files are generated per-phase during /pde:execute-phase,
    not in this directory — they live in the target phase directory)
```

Three existing files modified:
- `workflows/execute-phase.md` — add readiness gate check in `initialize` step
- `bin/pde-tools.cjs` — add `case 'readiness':` dispatch
- `workflows/execute-phase.md` — CONCERNS acknowledgment in the gate

### Pattern 1: Command Entry Point (commands/check-readiness.md)

**What:** A command file that routes to the workflow. This is the pattern all PDE commands use.

**When to use:** Every PDE command follows this exact pattern. Do not deviate.

**Example (from existing commands/execute-phase.md):**
```markdown
---
name: pde:check-readiness
description: Validate phase readiness — checks PROJECT.md, REQUIREMENTS.md, and PLAN.md consistency before execution
argument-hint: "[phase-number]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Execute the /pde:check-readiness workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/check-readiness.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/check-readiness.md.
Pass any $ARGUMENTS to the workflow process.
</process>
```

Note: No `AskUserQuestion` needed in the standalone command — this is a read-only analysis command. `AskUserQuestion` is only needed in execute-phase.md for the CONCERNS acknowledgment gate.

### Pattern 2: Readiness Workflow (workflows/check-readiness.md)

**What:** A workflow file the check-readiness agent follows to run checks and write READINESS.md.

**Structure (mirrors reconcile-phase.md exactly):**
```
<purpose>
Validate plan readiness before phase execution. Produces READINESS.md with PASS, CONCERNS, or FAIL.
</purpose>

<required_reading>
Read STATE.md and project-context.md (if exists) before any operation.
</required_reading>

<process>
<step name="load_context"> — init, find phase, resolve PLAN.md paths
<step name="run_structural_checks"> — Node.js script via pde-tools CLI
<step name="run_semantic_checks"> — agent reads PLAN.md and cross-checks
<step name="classify_result"> — severity-first precedence → PASS/CONCERNS/FAIL
<step name="write_readiness_md"> — write .planning/phases/{phase}/{phase_num}-READINESS.md
<step name="report_result"> — print result to user
</process>
```

### Pattern 3: The Checklist (Core Algorithm)

This is the key design decision STATE.md identified as "not yet defined." Based on analysis of VRFY-03's requirement and the existing plan schema (Phases 47, 48, 49), here is the complete checklist:

**Category A: Presence Checks (structural, deterministic — Node.js)**

| Check ID | What | Severity if Failed |
|----------|------|--------------------|
| A1 | PLAN.md exists in phase directory | FAIL |
| A2 | PLAN.md frontmatter contains `phase` field | FAIL |
| A3 | PLAN.md frontmatter contains `requirements` field (array, non-empty) | CONCERNS |
| A4 | PLAN.md contains `<objective>` block | FAIL |
| A5 | PLAN.md contains `<acceptance_criteria>` block before `<tasks>` (Phase 48 schema) | CONCERNS |
| A6 | PLAN.md contains `<tasks>` block with at least one `<task>` | FAIL |
| A7 | Each `<task>` contains `<name>`, `<files>`, `<action>`, `<acceptance_criteria>` fields | FAIL |
| A8 | Each `<task>` contains `<ac_refs>` field (Phase 48) | CONCERNS |
| A9 | PLAN.md frontmatter `must_haves.truths` array exists and is non-empty | CONCERNS |
| A10 | PROJECT.md exists at `.planning/PROJECT.md` | CONCERNS |
| A11 | REQUIREMENTS.md exists at `.planning/REQUIREMENTS.md` | CONCERNS |

**Category B: Consistency Checks (cross-document, deterministic — Node.js)**

| Check ID | What | Severity if Failed |
|----------|------|--------------------|
| B1 | Every requirement ID in PLAN.md `requirements:` field exists in REQUIREMENTS.md | FAIL |
| B2 | Every AC-N in plan-level `<acceptance_criteria>` block is referenced by at least one task's `<ac_refs>` | CONCERNS |
| B3 | No orphaned `<ac_refs>` — every AC-N referenced in tasks exists in plan-level AC block | CONCERNS |
| B4 | PLAN.md `phase` frontmatter field matches the directory name pattern (e.g., `49-reconciliation-halt-checkpoints`) | CONCERNS |
| B5 | Requirement IDs in PLAN.md are not already marked `[x]` complete in REQUIREMENTS.md | CONCERNS |

**Category C: Semantic Checks (agent-evaluated)**

| Check ID | What | Severity if Failed |
|----------|------|--------------------|
| C1 | Plan objective is specific enough to be verifiable (not "improve the codebase") | CONCERNS |
| C2 | Task files lists reference real paths that exist or are being created (not references to phantom files) | CONCERNS |
| C3 | Plan-level ACs are BDD Given/When/Then format — observable outcomes, not subjective statements | CONCERNS |

Note: Category C checks are CONCERNS only (never FAIL) because they are judgment calls. Category A and B checks are deterministic and can produce FAIL.

**Severity-first classification (identical to Phase 49 status precedence):**
```
1. FAIL   — if ANY Category A check with severity=FAIL fails
           OR if ANY Category B check with severity=FAIL fails
2. CONCERNS — if no FAIL, but ANY check with severity=CONCERNS fails
3. PASS   — all checks pass
```

### Pattern 4: READINESS.md Schema

**Location:** `.planning/phases/{padded_phase}-{phase_slug}/{phase_num}-READINESS.md`

**Format (mirrors RECONCILIATION.md):**
```markdown
---
phase: {phase-slug}
generated: {ISO-timestamp}
result: pass | concerns | fail
checks_run: {N}
checks_failed: {N}
---

# Phase {X}: Readiness Report

**Generated:** {timestamp}
**Phase:** {phase_number} — {phase_name}
**Result:** PASS | CONCERNS | FAIL

## Structural Checks

| Check | Status | Details |
|-------|--------|---------|
| A1: PLAN.md exists | PASS | {phase_dir}/{phase_num}-01-PLAN.md |
| A5: AC block present | CONCERNS | No plan-level <acceptance_criteria> block found |
| ...

## Consistency Checks

| Check | Status | Details |
|-------|--------|---------|
| B1: Requirements mapped | PASS | VRFY-03, VRFY-04 — both found in REQUIREMENTS.md |
| B2: AC coverage | CONCERNS | AC-3 defined in plan but not referenced by any task |
| ...

## Semantic Checks

| Check | Status | Details |
|-------|--------|---------|
| C1: Objective specificity | PASS | Objective describes concrete deliverables |
| ...

## Executor Handoff

Result: {PASS | CONCERNS | FAIL}
Checks failed: {count}
FAIL checks: {list of check IDs, or "none"}
CONCERNS checks: {list of check IDs, or "none"}

{If PASS: "All readiness checks passed. Execute phase when ready."}
{If CONCERNS: "Readiness concerns found. Review before executing. Executor will surface these warnings."}
{If FAIL: "Phase is NOT ready to execute. Fix the listed issues before proceeding."}
```

### Pattern 5: Execute-Phase Integration (Gate Hook)

**Injection point:** The `initialize` step of `workflows/execute-phase.md`, after the init bash block and before the `handle_branching` step. This positioning ensures the gate fires before any branch creation or execution begins.

**Integration logic:**
```
After the init bash block in <step name="initialize">:

1. Check for existing READINESS.md:
```bash
READINESS_FILE=$(ls "{phase_dir}"/*-READINESS.md 2>/dev/null | head -1)
```

2. If READINESS_FILE exists, read its result:
```bash
READINESS_RESULT=$(grep "^result:" "$READINESS_FILE" 2>/dev/null | cut -d: -f2 | tr -d ' ')
READINESS_GENERATED=$(grep "^generated:" "$READINESS_FILE" 2>/dev/null | cut -d: -f2 | tr -d ' ')
```

3. Apply gate logic:
- If READINESS_RESULT is "fail": HALT — do not proceed. Display:
  ```
  HALT: Readiness Gate FAIL
  Phase: {phase_number} — {phase_name}
  Readiness report: {READINESS_FILE}

  The last readiness check found critical issues. Fix them before executing.
  Run /pde:check-readiness {phase_number} to see the current status.

  To override (not recommended): delete {READINESS_FILE} and re-run execute-phase.
  ```
  Exit without spawning any executors.

- If READINESS_RESULT is "concerns": Present warning via AskUserQuestion:
  ```
  WARNING: Readiness Gate CONCERNS
  Phase: {phase_number} — {phase_name}
  The readiness check found concerns (non-blocking). Review them before continuing.
  Run: cat {READINESS_FILE}

  Type 'proceed' to execute with these concerns, or 'abort' to fix them first.
  ```
  Wait for user. If 'abort': exit. If 'proceed': continue normally with concerns logged.

- If READINESS_RESULT is "pass": proceed silently (no friction).

- If READINESS_FILE does not exist: proceed normally with no gate check.
  (The gate is opt-in: you run /pde:check-readiness first, then execute.)
```

**Key design decision: gate is opt-in, not mandatory.** If no READINESS.md exists, execute-phase runs normally. This preserves existing behavior for users who haven't adopted the readiness gate yet, and prevents breaking the workflow for quick tasks where checking readiness is overhead. VRFY-04 says "blocks on FAIL" — it does not say "requires readiness check before executing." The FAIL block only applies when a prior READINESS.md exists.

### Pattern 6: Node.js Readiness Checker (bin/lib/readiness.cjs)

**What:** A CommonJS module that runs structural and consistency checks on PLAN.md files. Called from pde-tools.cjs `case 'readiness':`.

**Why a separate .cjs module:** All structural checks in PDE are in bin/lib/ modules. The verify.cjs module is the precedent — it runs programmatic checks on plan artifacts. readiness.cjs follows the same pattern.

**Core functions:**
```javascript
// Source: Pattern mirrors verify.cjs and reconciliation.cjs structure

/**
 * Run all structural checks on a PLAN.md file.
 * @param {string} cwd
 * @param {string} planPath - relative path to PLAN.md
 * @param {string} requirementsPath - relative path to REQUIREMENTS.md
 * @returns {{ checks: CheckResult[], hasFail: boolean, hasConcerns: boolean }}
 */
function runStructuralChecks(cwd, planPath, requirementsPath) {
  // Category A: presence checks
  // Category B: consistency checks
}

/**
 * Classify overall result from check results.
 * @param {CheckResult[]} checks
 * @returns {'pass' | 'concerns' | 'fail'}
 */
function classifyResult(checks) {
  if (checks.some(c => c.severity === 'fail' && !c.passed)) return 'fail';
  if (checks.some(c => c.severity === 'concerns' && !c.passed)) return 'concerns';
  return 'pass';
}

/**
 * Write READINESS.md to phase directory.
 * @param {string} phaseDir
 * @param {string} phaseNumber
 * @param {string} phaseName
 * @param {CheckResult[]} checks
 * @param {string} result
 */
function writeReadinessMd(phaseDir, phaseNumber, phaseName, checks, result) {
  // Write to {phaseDir}/{phaseNumber}-READINESS.md
}
```

**Check result shape:**
```javascript
{
  id: 'A1',           // check identifier
  description: 'PLAN.md exists in phase directory',
  passed: true,       // boolean
  severity: 'fail',   // 'fail' | 'concerns'
  details: 'Found: .planning/phases/50-readiness-gate/50-01-PLAN.md'
}
```

### Pattern 7: pde-tools.cjs Dispatch Addition

**What:** A new `case 'readiness':` in pde-tools.cjs that dispatches to readiness.cjs.

**Format (follows existing pattern precisely):**
```javascript
case 'readiness': {
  const subcommand = args[1];
  const readiness = require('./lib/readiness.cjs');
  if (subcommand === 'check') {
    const phaseArg = args[2];
    const planFile = args[3]; // optional: specific PLAN.md path
    readiness.cmdReadinessCheck(cwd, phaseArg, planFile, raw);
  } else if (subcommand === 'result') {
    // Read existing READINESS.md and return result
    const phaseArg = args[2];
    readiness.cmdReadinessResult(cwd, phaseArg, raw);
  } else {
    error('Unknown readiness subcommand. Available: check, result');
  }
  break;
}
```

The `readiness result` subcommand is what execute-phase.md calls to read existing READINESS.md. It returns `{ result: 'pass' | 'concerns' | 'fail', file: 'path/to/READINESS.md' }` or `{ result: 'none', file: null }` if no READINESS.md exists.

### Anti-Patterns to Avoid

- **Mandatory gate (no READINESS.md = FAIL):** Blocking execute-phase when no READINESS.md exists would break all existing workflows and force users to always run check-readiness first. The gate must be opt-in.
- **Re-reading PLAN.md in execute-phase orchestrator:** The orchestrator is already lean (passes paths only to executors). Reading PLAN.md for validation in the orchestrator would bloat its context. Use `pde-tools.cjs readiness result` to read the pre-computed READINESS.md instead.
- **Hard-coding checklist items in execute-phase.md:** The checklist belongs in the readiness workflow and readiness.cjs, not in execute-phase.md. Execute-phase only reads the result.
- **CONCERNS blocking without user acknowledgment:** CONCERNS must proceed after a visible warning. Silently ignoring concerns OR blocking entirely both violate VRFY-04. Use AskUserQuestion for CONCERNS — same pattern as Phase 49's post-task HALT.
- **Override mechanism via `--force` flag:** Providing a `--force` flag encourages bypassing the gate. Instead, override by deleting the READINESS.md file (this is intentional friction — it forces the user to re-run the check, not ignore it).
- **One READINESS.md per plan (not per phase):** Readiness is a phase-level concept. Run it against all plans in the phase. One READINESS.md per phase, not one per plan.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PLAN.md frontmatter extraction | Custom frontmatter regex | `extractFrontmatter()` from `bin/lib/frontmatter.cjs` | Already handles all PDE frontmatter edge cases (YAML, arrays, multiline values) |
| Task block extraction | Custom XML regex | `extractTaskBlocks()`, `extractField()` from `bin/lib/sharding.cjs` | Already handles nested tags, multiline content, attribute variations |
| AC block extraction | Custom regex for `<acceptance_criteria>` | `extractPlanAcBlock()` from `bin/lib/sharding.cjs` | Already handles the critical disambiguation: plan-level vs per-task AC blocks |
| Requirement ID lookup in REQUIREMENTS.md | Custom markdown parser | Simple line-by-line regex: `/-\s*\[[ x]\]\s*\*\*([A-Z]+-\d+)\*/` | REQUIREMENTS.md has a consistent checkbox format; no general parser needed |
| Result precedence logic | Custom if/else chain | Follow the exact pattern in `reconciliation.cjs` determine_status step | Same severity-first precedence; use same pattern for consistency |
| READINESS.md writing | Template string concat | Follow `write_reconciliation_md` step in `reconcile-phase.md` | Same file format, same writing pattern, same phase-directory convention |
| Command file structure | Custom command format | Copy from `commands/execute-phase.md` with different name/description | Every PDE command is this thin wrapper; do not deviate |
| Workflow file structure | Custom format | Copy structure from `workflows/reconcile-phase.md` | All PDE workflows follow: `<purpose>`, `<required_reading>`, `<process>` with named steps |

**Key insight:** Phase 50 is primarily wiring existing infrastructure in a new combination. The extraction, parsing, and CLI dispatch infrastructure is already built. The new work is: (1) the specific checklist items and their severity mappings, (2) the READINESS.md schema, and (3) the gate hook in execute-phase.md.

---

## Common Pitfalls

### Pitfall 1: Gate Fires on Non-Existent READINESS.md

**What goes wrong:** execute-phase.md checks for READINESS.md with `ls *-READINESS.md` — if the file doesn't exist, `ls` returns an error. The orchestrator incorrectly interprets the non-zero exit code as a FAIL state.

**Why it happens:** Shell `ls` exits non-zero when no files match. If the gate logic doesn't handle the empty case separately, it conflates "no gate result" with "gate failed."

**How to avoid:** Always use `ls 2>/dev/null` and check if the result is empty before reading the file:
```bash
READINESS_FILE=$(ls "{phase_dir}"/*-READINESS.md 2>/dev/null | head -1)
if [ -z "$READINESS_FILE" ]; then
  # No READINESS.md — gate not yet run, proceed normally
  READINESS_RESULT="none"
fi
```

**Warning signs:** Users report execute-phase blocking even though they never ran check-readiness.

### Pitfall 2: AC Block Disambiguation Failure

**What goes wrong:** readiness.cjs tries to find the plan-level `<acceptance_criteria>` block but matches a per-task `<acceptance_criteria>` instead. Check A5 falsely passes, and Check B2 (AC coverage) operates on the wrong data.

**Why it happens:** Per-task `<acceptance_criteria>` uses the same tag name as the plan-level block. Simple regex without positional constraint matches the wrong block.

**How to avoid:** Use `extractPlanAcBlock()` from sharding.cjs — it slices content before `<tasks>` before matching. Never implement a custom regex for this case.
```javascript
// CORRECT — uses sharding.cjs helper
const { extractPlanAcBlock } = require('./sharding.cjs');
const planAcBlock = extractPlanAcBlock(planContent);

// WRONG — matches the first <acceptance_criteria> regardless of position
const planAcBlock = planContent.match(/<acceptance_criteria>([\s\S]*?)<\/acceptance_criteria>/i)?.[1];
```

**Warning signs:** Check A5 always PASS even when plan has no plan-level AC block; Check B2 reports incorrect AC coverage.

### Pitfall 3: Multi-Plan Phases and Check Scope

**What goes wrong:** A phase has three PLAN.md files (e.g., 50-01-PLAN.md, 50-02-PLAN.md, 50-03-PLAN.md). The readiness check runs only against the first plan. Plans 2 and 3 have missing `<acceptance_criteria>` blocks, but the check reports PASS.

**Why it happens:** `ls *-PLAN.md | head -1` only finds one plan. The multi-plan case is the common case in v0.6 phases.

**How to avoid:** Run checks against ALL PLAN.md files in the phase directory. Aggregate results with severity-first logic across all plans:
```javascript
const planFiles = fs.readdirSync(phaseDir)
  .filter(f => f.endsWith('-PLAN.md'))
  .sort();

const allChecks = [];
for (const planFile of planFiles) {
  const planChecks = runStructuralChecks(cwd, planFile, requirementsPath);
  allChecks.push(...planChecks);
}

const result = classifyResult(allChecks);
```

**Warning signs:** PASS reported for a phase with 3 plans but only one was actually validated.

### Pitfall 4: CONCERNS Bypassed Silently in Auto/Yolo Mode

**What goes wrong:** In yolo/auto mode, `AskUserQuestion` for CONCERNS is either skipped or auto-approved without surfacing the warning to the user. The user never sees the concerns.

**Why it happens:** Auto-mode in execute-phase.md auto-approves `human-verify` checkpoints. If the CONCERNS gate is implemented as a `human-verify` checkpoint rather than an `AskUserQuestion` directly in the initialize step, it gets auto-approved in yolo mode.

**How to avoid:** The CONCERNS acknowledgment must use `AskUserQuestion` directly in the initialize step, NOT the checkpoint mechanism. The Phase 49 risk:high HALT gates use this pattern — they fire in the orchestrator's initialize/execution flow, not as checkpoint plan types. This ensures the warning is always visible to the user, even in yolo mode.

**Warning signs:** In yolo mode, execute-phase proceeds without showing CONCERNS warning.

### Pitfall 5: Requirements Check Against Wrong REQUIREMENTS.md Section

**What goes wrong:** Check B1 validates requirement IDs by searching all of REQUIREMENTS.md. It finds `VRFY-03` in the "Future Requirements" section (if any exist there), marks it as PASS, but the requirement is actually deferred and shouldn't be in the current PLAN.md.

**Why it happens:** REQUIREMENTS.md has both active and future/deferred requirements. A simple grep finds both.

**How to avoid:** Check B1 should validate against the versioned requirements section only (e.g., `## v0.6 Requirements`), not the `## Future Requirements` section. Parse the section header and stop reading at the next `##` that indicates a different version or "Future."

Simpler approach: check that the requirement is NOT in the `Out of Scope` table AND is marked as `[ ]` or `[x]` (i.e., it's a legitimate active requirement, regardless of completion status). Requirements in `## Future Requirements` use `**PARTY-01**:` format without checkboxes — this distinguishes them structurally.

**Warning signs:** Check B1 passes for requirement IDs that appear only in "Future Requirements."

### Pitfall 6: Stale READINESS.md After Plan Revision

**What goes wrong:** User runs `/pde:check-readiness 50` → PASS → revises PLAN.md → runs `/pde:execute-phase 50`. The gate reads the stale READINESS.md (from before the revision) and proceeds with PASS. The revised plan has a new FAIL-level issue.

**Why it happens:** READINESS.md is written once and not invalidated when PLAN.md changes.

**How to avoid:** In the gate check within execute-phase.md, compare the modification time of READINESS.md against the modification time of the newest PLAN.md in the phase:
```bash
READINESS_MTIME=$(stat -f "%m" "$READINESS_FILE" 2>/dev/null || stat -c "%Y" "$READINESS_FILE" 2>/dev/null)
NEWEST_PLAN=$(ls -t "{phase_dir}"/*-PLAN.md 2>/dev/null | head -1)
PLAN_MTIME=$(stat -f "%m" "$NEWEST_PLAN" 2>/dev/null || stat -c "%Y" "$NEWEST_PLAN" 2>/dev/null)

if [ "$PLAN_MTIME" -gt "$READINESS_MTIME" ]; then
  echo "WARNING: READINESS.md is stale — PLAN.md was modified after readiness check ran."
  echo "  Run /pde:check-readiness {phase_number} to refresh."
fi
```

This surfaces a warning (CONCERNS-level) but does not block — the user may have intentionally revised the plan with minor changes.

### Pitfall 7: Readiness Check Runs Against Wrong Phase

**What goes wrong:** `/pde:check-readiness` is invoked without a phase argument. It defaults to the "current phase" from STATE.md. But STATE.md shows phase 49 as the last completed phase, while the user wants to check phase 50.

**Why it happens:** Default phase detection reads `phase` from STATE.md frontmatter, which tracks the last executed phase, not the next-to-plan phase.

**How to avoid:** When no phase argument is provided, detect the next unplanned phase from ROADMAP.md (same logic as plan-phase.md uses). If that's ambiguous, ask the user which phase to check rather than defaulting to STATE.md's current phase.

**Warning signs:** User runs check-readiness and sees "Phase 49: PASS" when they expected phase 50.

---

## Code Examples

Verified patterns from direct codebase inspection:

### Extract All PLAN.md Files in a Phase Directory
```bash
# Source: workflows/verify-phase.md + workflows/reconcile-phase.md pattern
ls "{phase_dir}"/*-PLAN.md 2>/dev/null | sort
```

### Extract Frontmatter Requirements Array (Node.js)
```javascript
// Source: bin/lib/frontmatter.cjs extractFrontmatter() pattern
const { extractFrontmatter } = require('./frontmatter.cjs');
const content = fs.readFileSync(planPath, 'utf-8');
const fm = extractFrontmatter(content);

// fm.requirements is an array like ['VRFY-03', 'VRFY-04']
const requirementIds = fm.requirements || [];
```

### Check Requirement ID in REQUIREMENTS.md (Node.js)
```javascript
// Source: REQUIREMENTS.md format — checkboxes: - [x] **VRFY-03**: ...
// Simple regex, no general parser needed
function requirementExists(requirementsContent, reqId) {
  // Match: - [ ] **VRFY-03**: or - [x] **VRFY-03**:
  const pattern = new RegExp(`\\*\\*${reqId}\\*\\*`, 'i');
  return pattern.test(requirementsContent);
}

// Check that it's not in Future Requirements:
function requirementIsActive(requirementsContent, reqId) {
  // Find the section that contains the reqId
  const lines = requirementsContent.split('\n');
  let inFuture = false;
  for (const line of lines) {
    if (/^## Future Requirements/.test(line)) inFuture = true;
    if (/^## v\d/.test(line)) inFuture = false; // back in versioned section
    if (new RegExp(`\\*\\*${reqId}\\*\\*`).test(line) && !inFuture) return true;
  }
  return false;
}
```

### Extract Plan-Level AC Block (reuse existing helper)
```javascript
// Source: bin/lib/sharding.cjs extractPlanAcBlock() — already implemented in Phase 48
const { extractPlanAcBlock, extractTaskBlocks, extractField } = require('./sharding.cjs');

const planContent = fs.readFileSync(planPath, 'utf-8');
const planAcBlock = extractPlanAcBlock(planContent);  // returns '' if absent
const taskBlocks = extractTaskBlocks(planContent);

// Check each task has ac_refs
for (const block of taskBlocks) {
  const acRefs = extractField(block.inner, 'ac_refs');
  if (!acRefs) {
    // Check A8: task missing ac_refs
  }
}
```

### AC Coverage Check (B2 and B3)
```javascript
// Source: Phase 48 research — plan-checker validates AC coverage
function checkAcCoverage(planAcBlock, taskBlocks) {
  // Extract AC-N IDs from plan-level block
  const planAcIds = [...planAcBlock.matchAll(/\*\*AC-(\d+)\*\*:/g)].map(m => `AC-${m[1]}`);

  // Extract all ac_refs from tasks
  const { extractField } = require('./sharding.cjs');
  const referencedAcIds = new Set();
  for (const block of taskBlocks) {
    const acRefs = extractField(block.inner, 'ac_refs');
    if (acRefs) {
      acRefs.split(',').map(s => s.trim()).forEach(id => referencedAcIds.add(id));
    }
  }

  // B2: orphaned plan ACs (defined but not referenced)
  const orphanedAcs = planAcIds.filter(id => !referencedAcIds.has(id));
  // B3: ghost ac_refs (referenced but not defined)
  const ghostAcRefs = [...referencedAcIds].filter(id => !planAcIds.includes(id));

  return { orphanedAcs, ghostAcRefs };
}
```

### READINESS.md Staleness Check in execute-phase.md
```bash
# Source: Phase 46 research — staleness check pattern from project-context.md
READINESS_FILE=$(ls "{phase_dir}"/*-READINESS.md 2>/dev/null | head -1)
if [ -n "$READINESS_FILE" ]; then
  NEWEST_PLAN=$(ls -t "{phase_dir}"/*-PLAN.md 2>/dev/null | head -1)
  if [ -n "$NEWEST_PLAN" ]; then
    R_MTIME=$(stat -f "%m" "$READINESS_FILE" 2>/dev/null || stat -c "%Y" "$READINESS_FILE" 2>/dev/null)
    P_MTIME=$(stat -f "%m" "$NEWEST_PLAN" 2>/dev/null || stat -c "%Y" "$NEWEST_PLAN" 2>/dev/null)
    if [ "$P_MTIME" -gt "$R_MTIME" ]; then
      echo "Warning: READINESS.md may be stale — PLAN.md modified more recently. Run /pde:check-readiness ${PHASE_NUMBER} to refresh."
    fi
  fi
  READINESS_RESULT=$(grep "^result:" "$READINESS_FILE" | cut -d: -f2 | tr -d ' ')
fi
```

### Gate Logic in execute-phase.md initialize Step
```
# After the staleness check above, in <step name="initialize">:

if [ "$READINESS_RESULT" = "fail" ]; then
  # HALT — do not proceed
  echo "HALT: Readiness Gate FAIL"
  echo "Phase: {phase_number} — {phase_name}"
  echo "Report: $READINESS_FILE"
  echo ""
  echo "Run /pde:check-readiness {phase_number} to see issues."
  echo "Fix them and re-run check-readiness before executing."
  exit 1

elif [ "$READINESS_RESULT" = "concerns" ]; then
  # AskUserQuestion — surface warning, wait for user
  AskUserQuestion(
    "WARNING: Readiness Gate CONCERNS\n\nPhase: {phase_number} — {phase_name}\n\nThe last readiness check found concerns (non-blocking issues).\nSee: $READINESS_FILE\n\nType 'proceed' to execute anyway, or 'abort' to fix them first.",
    options=["proceed", "abort"]
  )
  # If user says 'abort': exit
  # If user says 'proceed': continue (no further friction)
fi

# PASS or no READINESS.md: continue normally
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No pre-execution validation — execute-phase runs immediately | READINESS.md gate checks plan consistency before any code changes | Phase 50 (v0.6) | Catches plan-level issues (missing ACs, unmapped requirements, phantom files) before they propagate into execution failures |
| Verifier runs post-execution to catch plan-goal mismatch | Readiness gate runs pre-execution for structural/consistency checks; verifier still runs post-execution for goal-achievement | Phase 50 (v0.6) | Two verification layers: pre-execution structural + post-execution behavioral |
| Plan checker (pde-plan-checker) verifies plans during planning | Readiness gate re-verifies at execution time after possible revisions | Phase 50 (v0.6) | Gap is covered: plans can be revised between planning and execution; readiness gate catches regressions |
| execute-phase always proceeds without user confirmation | execute-phase checks for READINESS.md and blocks on FAIL, warns on CONCERNS | Phase 50 (v0.6) | Users have a control point before destructive execution begins |

**Related existing infrastructure (unchanged by Phase 50):**
- `bin/pde-tools.cjs validate consistency` — checks phase numbering and disk/roadmap sync (not plan content); separate concern from readiness
- `bin/pde-tools.cjs verify plan-structure` — verifies structural requirements of PLAN.md; overlaps with readiness but runs during planning, not pre-execution. Readiness.cjs should call verify.cjs functions where applicable rather than re-implementing them.
- Phase 49 HALT gates — fire during execution for specific high-risk tasks; readiness gate fires before any execution begins

---

## Open Questions

1. **Should readiness.cjs reuse verify.cjs's existing `cmdVerifyPlanStructure`?**
   - What we know: `bin/pde-tools.cjs verify plan-structure` already exists and performs structural validation of PLAN.md files.
   - What's unclear: What exactly does it check, and does it overlap with the readiness checklist? (verify.cjs was not fully read — only the function signatures were seen.)
   - Recommendation: Read `verify.cjs` during Plan 01 implementation. If `cmdVerifyPlanStructure` already covers checks A1-A9, import it rather than re-implementing. If it's too coarse (returns pass/fail without per-check detail), readiness.cjs may need its own implementation with finer granularity.

2. **What is the relationship between check-readiness and the plan-checker agent?**
   - What we know: `pde-plan-checker` runs during `plan-phase.md` and validates AC coverage, deep_work_rules compliance, and quality gates. Readiness gate runs at execute time.
   - What's unclear: Is there value in re-running the plan-checker's semantic checks as part of /pde:check-readiness, or should readiness focus on purely structural/consistency checks and leave semantic validation to the plan-checker?
   - Recommendation: Readiness focuses on structural + consistency (Categories A and B above). Category C semantic checks are a stretch goal. If the plan-phase.md plan-checker already ran and the plan passed, re-running semantic checks at execute time adds friction. The key value of readiness is catching issues that occur between planning and execution (requirement additions, plan edits, format regressions).

3. **The CONCERNS threshold: how many CONCERNS before FAIL?**
   - What we know: VRFY-03 defines three states: PASS, CONCERNS, FAIL. No threshold is specified.
   - What's unclear: Should 5 CONCERNS automatically escalate to FAIL? Or is CONCERNS always just CONCERNS regardless of count?
   - Recommendation: No automatic escalation. CONCERNS is CONCERNS regardless of count. If any single check would be FAIL-severity, it's FAIL. The count of CONCERNS is informational (reported in READINESS.md). Escalation based on count would be arbitrary and unpredictable.

4. **READINESS.md naming: per-plan or per-phase?**
   - What we know: RECONCILIATION.md is per-phase (one file: `{phase_num}-RECONCILIATION.md`). Plans are named `{phase_num}-{plan_num}-PLAN.md`.
   - What's unclear: Is readiness per-plan or per-phase? The requirement says "validates PROJECT.md + REQUIREMENTS.md + the current PLAN.md" — this implies per-plan.
   - Recommendation: Per-phase (one READINESS.md per phase, named `{phase_num}-READINESS.md`), but checks run against all plans in the phase. This matches RECONCILIATION.md's convention and keeps the execute-phase gate simple (one file to read, not N files). If the user wants per-plan detail, they can read the READINESS.md body.

---

## Validation Architecture

`.planning/config.json` has `workflow.nyquist_validation: true`. Section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | None — tests run directly with `node --test {file}` |
| Quick run command | `node --test tests/phase-50/*.test.mjs` |
| Full suite command | `node --test tests/phase-50/*.test.mjs && node --test tests/phase-49/*.test.mjs && node --test tests/phase-48/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VRFY-03 | `runStructuralChecks()` returns FAIL when PLAN.md missing A1 | unit | `node --test tests/phase-50/readiness-checks.test.mjs` | ❌ Wave 0 |
| VRFY-03 | `runStructuralChecks()` returns CONCERNS when ac_refs missing (A8) | unit | `node --test tests/phase-50/readiness-checks.test.mjs` | ❌ Wave 0 |
| VRFY-03 | `runStructuralChecks()` returns FAIL when requirement ID not in REQUIREMENTS.md (B1) | unit | `node --test tests/phase-50/readiness-checks.test.mjs` | ❌ Wave 0 |
| VRFY-03 | `classifyResult()` returns 'fail' when any check has severity=fail and passed=false | unit | `node --test tests/phase-50/readiness-checks.test.mjs` | ❌ Wave 0 |
| VRFY-03 | `classifyResult()` returns 'concerns' when no fail checks but concerns exist | unit | `node --test tests/phase-50/readiness-checks.test.mjs` | ❌ Wave 0 |
| VRFY-03 | `classifyResult()` returns 'pass' when all checks pass | unit | `node --test tests/phase-50/readiness-checks.test.mjs` | ❌ Wave 0 |
| VRFY-03 | READINESS.md written with correct frontmatter (result, phase, generated, checks_run) | unit | `node --test tests/phase-50/readiness-report.test.mjs` | ❌ Wave 0 |
| VRFY-03 | READINESS.md contains Structural Checks, Consistency Checks, Executor Handoff sections | unit | `node --test tests/phase-50/readiness-report.test.mjs` | ❌ Wave 0 |
| VRFY-03 | commands/check-readiness.md exists with correct frontmatter (name, description, allowed-tools) | smoke | `node --test tests/phase-50/readiness-report.test.mjs` | ❌ Wave 0 |
| VRFY-04 | execute-phase.md contains readiness gate bash block (`READINESS_RESULT`) | smoke | `node --test tests/phase-50/readiness-report.test.mjs` | ❌ Wave 0 |
| VRFY-04 | execute-phase.md contains HALT message for FAIL result | smoke | `node --test tests/phase-50/readiness-report.test.mjs` | ❌ Wave 0 |
| VRFY-04 | Phase 49 tests still pass (regression) | regression | `node --test tests/phase-49/reconciliation.test.mjs` | Existing |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-50/readiness-checks.test.mjs`
- **Per wave merge:** `node --test tests/phase-50/*.test.mjs && node --test tests/phase-49/*.test.mjs`
- **Phase gate:** `node --test tests/` (full suite green) before `/pde:verify-work 50`

### Wave 0 Gaps

- [ ] `tests/phase-50/readiness-checks.test.mjs` — covers VRFY-03: structural checks (A1-A11), consistency checks (B1-B5), classifyResult() severity precedence, multi-plan aggregation, AC coverage checks using synthetic PLAN.md fixtures
- [ ] `tests/phase-50/readiness-report.test.mjs` — covers VRFY-03: READINESS.md format (frontmatter, sections, check table rows); VRFY-04: smoke tests that commands/check-readiness.md and execute-phase.md gate strings exist on disk
- [ ] `tests/phase-50/` directory must be created (Wave 0 task)

*(Framework install not needed — `node --test` is built-in, same as Phase 46-49)*

---

## Sources

### Primary (HIGH confidence)

- `workflows/execute-phase.md` (PDE, full file read, 2026-03-19) — initialize step, reconcile_phase step, verify_phase_goal step, HALT gate pattern from Phase 49 Mode A
- `workflows/reconcile-phase.md` (PDE, full file read, 2026-03-19) — canonical pattern for phase-level workflow: step structure, READINESS.md naming convention, write pattern
- `commands/execute-phase.md` (PDE, full file read, 2026-03-19) — canonical pattern for PDE command files: frontmatter, allowed-tools, thin wrapper structure
- `commands/verify-phase.md` (PDE, full file read, 2026-03-19) — same canonical command pattern
- `bin/lib/sharding.cjs` (PDE, partial read, 2026-03-19) — `extractTaskBlocks()`, `extractField()`, `hasTddTasks()` function signatures and implementations
- `bin/lib/frontmatter.cjs` (PDE, referenced, 2026-03-19) — `extractFrontmatter()` usage in verify.cjs and sharding.cjs; handles all frontmatter cases
- `bin/lib/reconciliation.cjs` (PDE, partial read, 2026-03-19) — three-tier severity precedence pattern; `toSlug()`, `normalizeTaskName()` patterns
- `bin/lib/verify.cjs` (PDE, partial read, 2026-03-19) — `cmdVerifySummary()` structural check pattern; confirms check-result shape
- `bin/pde-tools.cjs` (PDE, grep, 2026-03-19) — `case 'readiness':` is empty (not yet implemented); existing switch-case pattern confirmed; `case 'validate':` exists with `consistency` and `health` subcommands
- `.planning/REQUIREMENTS.md` (PDE, full read, 2026-03-19) — VRFY-03 and VRFY-04 exact definitions and success criteria
- `.planning/STATE.md` (PDE, full read, 2026-03-19) — known blocker: "PASS/CONCERNS/FAIL checklist items not yet defined"
- `.planning/phases/49-reconciliation-halt-checkpoints/49-02-PLAN.md` (PDE, full read, 2026-03-19) — HALT gate implementation pattern, AskUserQuestion usage, Mode A vs Mode B gate placement
- `.planning/phases/46-methodology-foundation/46-RESEARCH.md` (PDE, full read, 2026-03-19) — zero-new-dependency rule, Node.js built-in patterns, codebase conventions
- `.planning/phases/48-ac-first-planning/48-RESEARCH.md` (PDE, full read, 2026-03-19) — AC-N schema, `extractPlanAcBlock()` disambiguation, plan-level vs per-task AC block distinction
- `bin/lib/commands.cjs` (PDE, partial read, 2026-03-19) — `cmdVerifyPathExists()` pattern; confirms no existing readiness logic

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` Phase 50 section (PDE, grep, 2026-03-19) — confirmed Phase 50 success criteria (4 criteria matching VRFY-03 and VRFY-04)
- Phase 49 VERIFICATION.md (PDE, grep context, 2026-03-19) — confirmed Phase 49 shipped the HALT gate and reconciliation patterns used as models here

### Tertiary (LOW confidence)

- None — all findings are grounded in direct codebase inspection.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all tooling is PDE's existing Node.js built-in stack; no new tech; every library cited was confirmed via direct file inspection
- Architecture: HIGH — patterns derived directly from reconcile-phase.md (new workflow pattern), execute-phase.md (gate injection point), Phase 49 HALT gates (acknowledgment pattern), and Phase 48 AC extraction (reuse targets)
- Pitfalls: HIGH — each pitfall derived from tracing the specific code paths that would execute (ls 2>/dev/null handling, extractPlanAcBlock disambiguation, multi-plan iteration, yolo-mode AskUserQuestion bypass)
- Checklist items: MEDIUM — Categories A and B are HIGH (derived from existing PLAN.md schema confirmed in Phases 47-49); Category C is MEDIUM (semantic judgment calls, defined conservatively as CONCERNS-only)
- Validation architecture: HIGH — same test framework and patterns as Phases 46-49

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days — stable domain; all implementation targets internal PDE framework files with no external dependencies that could change)
