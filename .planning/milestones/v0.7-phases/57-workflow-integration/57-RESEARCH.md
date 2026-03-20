# Phase 57: Workflow Integration - Research

**Researched:** 2026-03-19
**Domain:** Orchestrator wiring, conditional agent spawning, readiness gate augmentation, Node.js check extension
**Confidence:** HIGH

## Summary

Phase 57 wires the Phase 55 and Phase 56 artifacts into the two workflow files that control the pipeline transition points. There are four concrete changes across three files: `plan-phase.md` (orchestrator), `check-readiness.md` (readiness workflow), and `bin/lib/readiness.cjs` (structural checker). All artifacts from Phase 55/56 are real, complete, and match the formats documented here — confirmed by direct file reads.

The research for this phase is exceptionally high confidence because the entire implementation surface was built in prior phases and is readable on disk. The only unknowns are the exact integration point positions, which are documented below with exact context from source reads.

**Primary recommendation:** Make four surgical changes: (1) insert a new Step 5.7 research validation gate in `plan-phase.md` between Step 5 (Handle Research) and Step 5.5 (Create Validation Strategy); (2) add a `run_integration_checks` step to `check-readiness.md` after semantic checks; (3) add B4 and B5 check IDs to `readiness.cjs`; (4) augment the `run_integration_checks` step to consume and surface findings from DEPENDENCY-GAPS.md, EDGE-CASES.md, INTEGRATION-CHECK.md, and RESEARCH-VALIDATION.md.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RVAL-07 | Research validation wired into plan-phase.md as automatic step — runs when research exists and no validation artifact is present | plan-phase.md Step 5 already has `has_research` flag from init; detection uses `ls "${PHASE_DIR}"/*-RESEARCH-VALIDATION.md` shell glob; init.cjs does NOT emit has_research_validation — shell glob is required |
| RVAL-08 | plan-phase blocks on `contradicted_count > 0` with user choice prompt; surfaces `unverifiable_count > 0` as non-blocking CONCERNS | agent returns JSON with `summary.contradicted_count` and `summary.unverifiable_count`; AskUserQuestion pattern already established in Steps 4, 5.6, 6, 7.5 of plan-phase.md |
| WIRE-01 | plan-phase.md enhanced with research validation step between research detection and planner spawn | Step 5 (Handle Research) and Step 5.5 (Create Validation Strategy) are adjacent; new Step 5.7 inserts between them; decimal step numbering already used (5.5, 5.6, 7.5, 9.5, 11.5) |
| WIRE-02 | check-readiness.md enhanced with `run_integration_checks` step after semantic checks (Mode B codebase-time verification) | check-readiness.md currently has four steps: load_context, run_structural_checks, run_semantic_checks, report_result; new step inserts after run_semantic_checks |
| WIRE-03 | readiness.cjs enhanced with B4 (file existence) and B5 (orphan export) check IDs — additive to existing A1-A11, B1-B3 | readiness.cjs exports runStructuralChecks with B1-B3 pattern; B4/B5 follow same pattern; need cwd for file existence checks |
| WIRE-04 | All new verification artifacts consumed by readiness gate in unified READINESS.md output | run_integration_checks reads artifact frontmatter, appends section to READINESS.md using read-modify-write pattern already established in run_semantic_checks |
| INTG-02 | Codebase-time verification (Mode B) in readiness gate verifies function signatures, module exports, pde-tools.cjs command availability for @-referenced files | Mode B runs at check-readiness time; scoped to @-referenced files (same allowlist as Mode A); uses Read + Grep to verify actual exports match declarations |
| INTG-04 | Readiness gate gains B4 (file existence) and B5 (orphan export) check IDs — additive to existing A1-A11, B1-B3 | readiness.cjs currently stops at B3; B4 and B5 extend consistency checks |
</phase_requirements>

## Standard Stack

### Core

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| `plan-phase.md` | `workflows/plan-phase.md` AND `~/.claude/pde-os/engines/gsd/workflows/plan-phase.md` | Primary orchestrator to modify | Both copies must be updated; Phase 56 Plan 02 modified the system copy directly |
| `check-readiness.md` | `workflows/check-readiness.md` AND `commands/check-readiness.md` | Readiness workflow to modify | Two copies exist; verify both and update both |
| `readiness.cjs` | `bin/lib/readiness.cjs` | Node.js structural checker to extend | 525 lines; current exports: runStructuralChecks, classifyResult, writeReadinessMd, cmdReadinessCheck, cmdReadinessResult |
| `pde-research-validator` | `agents/pde-research-validator.md` | Agent spawned from plan-phase Step 5.7 | Already built in Phase 55; returns JSON with summary.contradicted_count, summary.unverifiable_count, artifact_content |
| `AskUserQuestion` | Claude built-in | Gate user choice when contradicted_count > 0 | Already used in Steps 4, 5.6, 6, 7.5 of plan-phase.md |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `extractFrontmatter` | from frontmatter.cjs | Parse result fields from RESEARCH-VALIDATION.md | Already imported and used in readiness.cjs |
| `pde-tools.cjs commit` | existing | Commit RESEARCH-VALIDATION.md artifact | Same pattern as Step 5.5 VALIDATION.md commit |
| `lib/ui/render.cjs` banner | existing | Display step banner before agent spawn | Used in every agent-spawning step of plan-phase.md |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shell glob for RESEARCH-VALIDATION.md detection | Add has_research_validation to init.cjs | Shell glob avoids touching init.cjs; init.cjs change would be cleaner but adds scope beyond Phase 57 requirements |
| Appending to READINESS.md in check-readiness.md workflow | Extending writeReadinessMd in Node.js | Workflow-level appending is correct: artifact findings are semantic concerns, not structural checks; keep separation of concern |
| Optional cwd param in runStructuralChecks | Use process.cwd() globally | Optional param is safer; process.cwd() may differ in test contexts |

**Installation:** No new npm packages. All wiring is prose/workflow changes and JavaScript additions within existing files.

## Architecture Patterns

### How the Four Changes Compose

```
plan-phase.md flow (with Step 5.7 added):
  Step 5: Handle Research
    has_research=true AND RESEARCH-VALIDATION.md absent?
    ↓ YES
  [NEW] Step 5.7: Research Validation Gate
    ├─ display banner "VALIDATING RESEARCH"
    ├─ spawn pde-research-validator
    ├─ orchestrator writes artifact_content to disk (agent is READ-ONLY)
    ├─ IF summary.contradicted_count > 0 → AskUserQuestion (block or proceed)
    └─ IF summary.unverifiable_count > 0 → display concern, continue
    ↓
  Step 5.5: Create Validation Strategy (unchanged)
  Step 5.6: UI Design Contract Gate (unchanged)
  ...

check-readiness.md flow (with run_integration_checks added):
  load_context
  run_structural_checks  (runs readiness.cjs — writes READINESS.md with A1-A11, B1-B5)
  run_semantic_checks    (appends C1-C3 section to READINESS.md)
  [NEW] run_integration_checks
    ├─ reads RESEARCH-VALIDATION.md frontmatter (result, contradicted_count, unverifiable_count)
    ├─ reads DEPENDENCY-GAPS.md frontmatter (result, gap_count)
    ├─ reads EDGE-CASES.md frontmatter (finding_count, high_count)
    ├─ reads INTEGRATION-CHECK.md frontmatter (result, issues_found)
    ├─ runs Mode B codebase-time verification (function signature / export checks)
    └─ appends "## Verification Artifacts" section to READINESS.md
  report_result (reads final READINESS.md, displays result)
```

### Pattern 1: Step 5.7 Insertion Point in plan-phase.md

The step numbers adjacent to the insertion point are:
- Step 5 ends with: "**If RESEARCH.md missing OR `--research` flag:** ... Handle Researcher Return"
- Step 5.5 begins with: "Skip if `nyquist_validation_enabled` is false..."
- Step 5.6 is the UI Design Contract Gate

Step 5.7 (Research Validation Gate) inserts between Step 5 and Step 5.5.

**Skip conditions for Step 5.7** (mirror Step 5 skip conditions):
- `--gaps` flag active
- `--skip-research` flag active
- `research_enabled` is false (from init)
- `has_research` is false (no RESEARCH.md exists)
- RESEARCH-VALIDATION.md already present in phase directory

**Detection (shell glob, not init.cjs):**
```bash
RV_ARTIFACT=$(ls "${PHASE_DIR}"/*-RESEARCH-VALIDATION.md 2>/dev/null | head -1)
```

**Spawn prompt structure:**
The orchestrator passes two required fields to pde-research-validator:
- `research_file_path` — path to the RESEARCH.md file
- `validated_at_phase` — current phase number

**Post-spawn orchestrator responsibilities:**
1. Parse JSON return from agent
2. Extract `artifact_content` string
3. Write to `${PHASE_DIR}/${padded_phase}-RESEARCH-VALIDATION.md` using Write tool
4. Commit with `pde-tools.cjs commit`
5. Parse `summary.contradicted_count` and `summary.unverifiable_count`
6. Branch on counts

**Blocking gate (RVAL-08):**
```
IF summary.contradicted_count > 0:
  AskUserQuestion:
  - header: "Research Validation: FAIL"
  - question: "Research validation found {N} contradicted claims. Plans built on contradicted claims risk incorrect implementation."
  - options:
    - "View contradictions and fix research" → display RESEARCH-VALIDATION.md contents, exit
    - "Proceed anyway" → continue to Step 5.5

ELIF summary.unverifiable_count > 0:
  Display non-blocking warning: "{N} unverifiable claims will appear as CONCERNS in READINESS.md."
  Continue to Step 5.5
```

### Pattern 2: run_integration_checks Step Structure

**READINESS.md append section format:**
```markdown
## Verification Artifacts

| Artifact | Result | Key Metric | Notes |
|----------|--------|------------|-------|
| RESEARCH-VALIDATION.md | PASS/CONCERNS/FAIL | {contradicted}/{unverifiable} claims | present / absent |
| DEPENDENCY-GAPS.md | PASS/CONCERNS/FAIL | {gap_count} gaps | present / absent |
| EDGE-CASES.md | CONCERNS | {finding_count} findings ({high_count} HIGH) | present / absent |
| INTEGRATION-CHECK.md | PASS/CONCERNS | {issues_found} issues | present / absent |

## Mode B: Codebase-Time Verification

| File | Check | Status | Notes |
|------|-------|--------|-------|
| @{path} | function_signature | PASS/CONCERNS | {function} found/not found |
| @{path} | module_export | PASS/CONCERNS | {export} verified/missing |
```

**Severity mapping for READINESS.md overall result update:**
- RESEARCH-VALIDATION.md result=FAIL (contradicted_count > 0) → update READINESS.md result to 'fail'
- DEPENDENCY-GAPS.md result=fail → update READINESS.md result to 'concerns' (not fail — dependency gaps are actionable, not blocking)
- EDGE-CASES.md → always CONCERNS (per EDGE-04 decision)
- INTEGRATION-CHECK.md issues_found > 0 → update to 'concerns'
- Mode B findings → CONCERNS

**Read-modify-write pattern (same as run_semantic_checks):**
1. Read current READINESS.md
2. Append new sections
3. If overall result needs updating, edit frontmatter `result:` field
4. Re-write using Edit or Write tool

### Pattern 3: B4 and B5 in readiness.cjs

B4 and B5 require file system access, so `runStructuralChecks` needs `cwd`:

```javascript
// Signature change: add optional cwd parameter
function runStructuralChecks(planContent, requirementsContent, planFileName, cwd = process.cwd()) {
```

The caller `cmdReadinessCheck` already has `cwd` and passes it to `writeReadinessMd` — extend to also pass to `runStructuralChecks`.

**B4 implementation approach:**
- Extract `<context>...</context>` blocks from planContent
- Find lines starting with `@`, strip the `@` prefix
- For each relative path, check `fs.existsSync(path.join(cwd, ref))`
- severity: 'concerns' (not 'fail' — missing files are worth flagging but don't block execution)

**B5 implementation approach:**
- For each @-reference that is a code file (.cjs, .ts, .js, .mjs) and exists on disk
- Extract exported names via regex: `exports\.(\w+)` and `export\s+(?:function|const|class)\s+(\w+)`
- Check if any export name appears in task `<files>` or `<action>` content
- If a file has exports and NONE appear in tasks → flag as orphan
- severity: 'concerns'

**Important:** B4/B5 are in the `runStructuralChecks` function which runs per-plan. The existing B1-B3 checks are gated inside `if (requirementsContent)`. B4 and B5 can run unconditionally (they only need planContent and cwd).

### Anti-Patterns to Avoid

- **Spawning pde-research-validator inside the revision loop:** Step 5.7 runs ONCE before planners spawn. Never invoke it in Steps 10-12.
- **Having the agent write RESEARCH-VALIDATION.md:** The agent definition explicitly prohibits Write/Edit. The orchestrator must write `artifact_content` to disk.
- **Making artifact findings FAIL-severity in READINESS.md:** Only RESEARCH-VALIDATION.md with `contradicted_count > 0` is FAIL. DEPENDENCY-GAPS.md, EDGE-CASES.md, INTEGRATION-CHECK.md are always CONCERNS.
- **Running Step 5.7 when RESEARCH-VALIDATION.md already exists:** Check for artifact presence first. The step is idempotent only if it skips when the artifact is present — never re-validate unnecessarily.
- **Forgetting to update the READINESS.md frontmatter `result:` field:** Both run_semantic_checks and run_integration_checks must update frontmatter if they find issues — the report_result step reads frontmatter, not the markdown body.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | Custom regex parser | `extractFrontmatter` from frontmatter.cjs | Already imported and used in readiness.cjs |
| Artifact file detection | Custom directory scan | Shell glob `ls "${PHASE_DIR}"/*-ARTIFACT.md 2>/dev/null \| head -1` | Same pattern used for VALIDATION.md detection in Steps 5.5 and 7.5 of plan-phase.md |
| User choice gate | Custom display | `AskUserQuestion` built-in | Used in 4+ places in plan-phase.md with identical structure |
| Banner display | Custom output | `node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" banner "..."` | Used before every agent spawn in plan-phase.md |
| Git commit | Custom shell call | `pde-tools.cjs commit "docs(...)" --files ...` | Standard commit mechanism throughout all orchestrators |

**Key insight:** Phase 57 is wiring existing components together. Every mechanism required already exists in the codebase and is used in adjacent steps of the same files being modified.

## Common Pitfalls

### Pitfall 1: Both workflow file copies must be updated
**What goes wrong:** The project has `workflows/plan-phase.md` and `commands/plan-phase.md`. The GSD system has `~/.claude/pde-os/engines/gsd/workflows/plan-phase.md`. Phase 56 Plan 02 modified `~/.claude/pde-os/engines/gsd/workflows/plan-phase.md` directly — not the project copy.
**Why it happens:** PDE maintains synchronized copies. The system copy is what Claude actually executes for `/pde:plan-phase`.
**How to avoid:** Read both before writing. Update both. Check whether `commands/plan-phase.md` is identical to `workflows/plan-phase.md`.
**Warning signs:** Step 5.7 works in manual test but not when invoked via `/pde:plan-phase`.

### Pitfall 2: init.cjs does NOT emit has_research_validation
**What goes wrong:** Implementation assumes `has_research_validation` field comes from INIT JSON. Confirmed by reading `bin/lib/init.cjs` lines 118-139: the file detection loop finds CONTEXT.md, RESEARCH.md, VERIFICATION.md, UAT.md but NOT RESEARCH-VALIDATION.md.
**Why it happens:** RESEARCH-VALIDATION.md naming convention was established in Phase 55 after init.cjs was written.
**How to avoid:** Detect the artifact via shell glob in Step 5.7:
```bash
RV_ARTIFACT=$(ls "${PHASE_DIR}"/*-RESEARCH-VALIDATION.md 2>/dev/null | head -1)
```
If `RV_ARTIFACT` is empty, spawn the validator.
**Warning signs:** Step 5.7 always spawning the validator even when RESEARCH-VALIDATION.md already exists.

### Pitfall 3: runStructuralChecks signature change must be backward compatible
**What goes wrong:** B4/B5 need `cwd` to resolve @-reference relative paths. Adding `cwd` as a required fourth parameter breaks existing callers.
**Why it happens:** The function was designed without file-system-dependent checks.
**How to avoid:** Add `cwd = process.cwd()` as optional fourth parameter. Existing callers without `cwd` continue to work. `cmdReadinessCheck` already has `cwd` — it should pass it explicitly.
**Warning signs:** Test or other callers of `runStructuralChecks` that fail after the change.

### Pitfall 4: RESEARCH-VALIDATION.md written by orchestrator, not agent
**What goes wrong:** Executor attempts to have pde-research-validator use its Write tool. The agent definition states: "NEVER write any file — not via Write tool, not via Edit tool, not via Bash redirection or heredoc."
**Why it happens:** Confusion about agent vs orchestrator responsibilities (RVAL-05 constraint).
**How to avoid:** After the agent returns its JSON block, the orchestrator (plan-phase.md) extracts `artifact_content` and writes it using the Write tool. This is explicitly described in the Phase 55 Plan 02 task (lines 77-114 of 55-02-PLAN.md).
**Warning signs:** Agent returning error about not being allowed to write files.

### Pitfall 5: Step ordering — 5.7 before 5.5, not after
**What goes wrong:** Research validation is placed AFTER Step 5.5 (Validation Strategy creation). The VALIDATION.md creation step reads RESEARCH.md. If research is contradicted, the VALIDATION.md created from it is also suspect.
**Why it happens:** Step numbering ambiguity — 5.7 could be read as "after 5.6".
**How to avoid:** Step 5.7 should be placed BETWEEN Step 5 (Handle Research) and Step 5.5 (Create Validation Strategy). Research validation runs first so that if it fails, the user can exit before VALIDATION.md is created from potentially bad research.
**Warning signs:** VALIDATION.md being created even when contradicted_count > 0 and user chose to exit.

### Pitfall 6: read_integration_checks must handle absent artifact files gracefully
**What goes wrong:** `run_integration_checks` crashes or produces errors when DEPENDENCY-GAPS.md, EDGE-CASES.md, or INTEGRATION-CHECK.md don't exist (e.g., first run before plan-checker has run).
**Why it happens:** These artifacts are produced by pde-plan-checker, which runs inside plan-phase.md. When check-readiness.md is invoked directly without going through plan-phase.md, the artifacts may not exist.
**How to avoid:** Check each artifact file with `ls ... 2>/dev/null | head -1` before attempting to read it. If absent, report "not present" in the Verification Artifacts table (not an error).
**Warning signs:** check-readiness.md failing with file-not-found errors when run on a phase that skipped the plan-checker.

## Code Examples

Verified patterns from actual source files:

### Artifact detection (from plan-phase.md Step 7.5)
```bash
# Source: workflows/plan-phase.md Step 7.5
VALIDATION_EXISTS=$(ls "${PHASE_DIR}"/*-VALIDATION.md 2>/dev/null | head -1)
```
Same pattern for RESEARCH-VALIDATION.md:
```bash
RV_ARTIFACT=$(ls "${PHASE_DIR}"/*-RESEARCH-VALIDATION.md 2>/dev/null | head -1)
```

### AskUserQuestion gate (from plan-phase.md Step 5.6)
```markdown
# Source: workflows/plan-phase.md Step 5.6
Use AskUserQuestion:
- header: "UI Design Contract"
- question: "Phase {N} has frontend indicators but no UI-SPEC.md. Generate a design contract before planning?"
- options:
  - "Generate UI-SPEC first" → Display: "Run /pde:ui-phase {N} then re-run /pde:plan-phase {N}". Exit workflow.
  - "Continue without UI-SPEC" → Continue to step 6.
  - "Not a frontend phase" → Continue to step 6.
```

### pde-research-validator return format (from agents/pde-research-validator.md)
```json
{
  "status": "COMPLETE",
  "validated_at_phase": "57",
  "summary": {
    "total_claims": 9,
    "verified_count": 6,
    "unverifiable_count": 2,
    "contradicted_count": 1,
    "result": "FAIL"
  },
  "artifact_content": "---\nphase: 57-workflow-integration\n..."
}
```

### RESEARCH-VALIDATION.md frontmatter (from 54-RESEARCH-VALIDATION.md — real artifact)
```yaml
---
phase: 54-tech-debt-closure
research_file: .planning/phases/54-tech-debt-closure/54-RESEARCH.md
validated_at_phase: 55
validated_at: 2026-03-20T03:49:00Z
total_claims: 9
verified_count: 3
unverifiable_count: 1
contradicted_count: 5
result: FAIL
---
```

### DEPENDENCY-GAPS.md frontmatter (from pde-plan-checker.md Dimension 9)
```yaml
---
phase: {phase-slug}
generated: "{ISO timestamp}"
result: {pass | concerns | fail}
gap_count: {N}
---
```

### EDGE-CASES.md frontmatter (from pde-plan-checker.md Dimension 10)
```yaml
---
phase: {phase-slug}
generated: "{ISO timestamp}"
finding_count: {N}
high_count: {N}
has_bdd_candidates: {true | false}
---
```

### INTEGRATION-CHECK.md frontmatter (from pde-plan-checker.md Dimension 11)
```yaml
---
phase: {phase-slug}
generated: "{ISO timestamp}"
mode: A
result: {pass | concerns | fail}
checks_run: {N}
issues_found: {N}
---
```

### B-check pattern (from readiness.cjs B1, lines 178-204)
```javascript
// Source: bin/lib/readiness.cjs
const b1Passed = unmappedIds.length === 0;
checks.push({
  id: 'B1',
  description: 'All frontmatter requirement IDs exist in active REQUIREMENTS.md section',
  passed: b1Passed,
  severity: 'fail',
  details: b1Passed ? '' : `${planFileName}: requirement IDs not found: ${unmappedIds.join(', ')}`,
});
```
B4 and B5 follow this exact pattern with `severity: 'concerns'`.

### Banner + commit pattern (from plan-phase.md Step 5.5)
```bash
# Source: workflows/plan-phase.md Step 5.5
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" banner "RESEARCHING PHASE {X}"
# ...after agent returns...
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "docs(phase-${PHASE}): add validation strategy"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No research validation | pde-research-validator produces RESEARCH-VALIDATION.md | Phase 55 complete | Artifact exists but requires manual invocation |
| No dependency/edge/integration checks | Dimensions 9, 10, 11 in pde-plan-checker | Phase 56 complete | Artifacts produced during plan-phase but not consumed by readiness gate |
| check-readiness has A1-A11, B1-B3, C1-C3 | Same, plus B4, B5, Mode B, artifact summary | Phase 57 (pending) | Unified READINESS.md with full pipeline signal |
| Validation runs only when manually invoked | Validation automatic at plan-phase transition | Phase 57 (pending) | No more manual validation steps |

**Deprecated/outdated:**
- Nothing deprecated. Phase 57 is purely additive.

## Open Questions

1. **Which plan-phase.md copy is authoritative for active execution?**
   - What we know: Project copy at `workflows/plan-phase.md` and system copy at `~/.claude/pde-os/engines/gsd/workflows/plan-phase.md` both exist. Phase 56 Plan 02 explicitly modified the system copy.
   - What's unclear: Whether `commands/plan-phase.md` is a symlink or an independent copy.
   - Recommendation: At task execution time, read both and update both.

2. **Should B4/B5 be inside or outside the `if (requirementsContent)` guard?**
   - What we know: B1-B3 require requirementsContent because they cross-reference REQUIREMENTS.md. B4/B5 only need planContent and cwd.
   - Recommendation: Place B4/B5 OUTSIDE the `if (requirementsContent)` guard — they should run even if REQUIREMENTS.md is not available.

3. **Should Step 5.7 also fire on re-runs when `--research` flag is passed?**
   - What we know: `--research` flag forces re-running research even if RESEARCH.md exists. This would produce a new RESEARCH.md, making the old RESEARCH-VALIDATION.md stale.
   - Recommendation: If `--research` flag is active AND a new RESEARCH.md was just written, delete the old RESEARCH-VALIDATION.md (if any) before Step 5.7 runs, so the validation gate correctly spawns for the fresh research.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | grep-based acceptance criteria (PDE convention — no test runner) |
| Config file | none |
| Quick run command | `node bin/pde-tools.cjs readiness check 57` |
| Full suite command | `grep "5.7\|Research Validation Gate" workflows/plan-phase.md && grep "run_integration_checks" workflows/check-readiness.md && grep "'B4'" bin/lib/readiness.cjs && grep "'B5'" bin/lib/readiness.cjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RVAL-07 | plan-phase spawns validator when RESEARCH.md present and RESEARCH-VALIDATION.md absent | unit | `grep "RESEARCH-VALIDATION\|pde-research-validator" workflows/plan-phase.md` | ❌ Wave 0 |
| RVAL-08 | contradicted_count > 0 blocks; unverifiable > 0 surfaces as CONCERNS | unit | `grep "contradicted_count\|unverifiable_count" workflows/plan-phase.md` | ❌ Wave 0 |
| WIRE-01 | Step 5.7 exists between Step 5 and Step 5.5 in plan-phase.md | unit | `grep "5\.7\|Research Validation" workflows/plan-phase.md` | ❌ Wave 0 |
| WIRE-02 | run_integration_checks step exists in check-readiness.md | unit | `grep "run_integration_checks\|Integration Findings\|Verification Artifacts" workflows/check-readiness.md` | ❌ Wave 0 |
| WIRE-03 | B4 and B5 check IDs in runStructuralChecks | unit | `grep "id: 'B4'\|id: 'B5'" bin/lib/readiness.cjs` | ❌ Wave 0 |
| WIRE-04 | READINESS.md includes section referencing all four artifact files | integration | `grep "Verification Artifacts\|RESEARCH-VALIDATION\|DEPENDENCY-GAPS" .planning/phases/57-workflow-integration/57-READINESS.md` | ❌ Wave 0 |
| INTG-02 | Mode B codebase-time verification documented in check-readiness.md | unit | `grep "Mode B\|codebase.time\|function.signature" workflows/check-readiness.md` | ❌ Wave 0 |
| INTG-04 | B4 file existence and B5 orphan export added | unit | same as WIRE-03 | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node bin/pde-tools.cjs readiness check 57`
- **Per wave merge:** full suite command above
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
None — all verification is grep-based against modified files. No new test infrastructure needed.

## Sources

### Primary (HIGH confidence)
- Direct file read: `workflows/plan-phase.md` (complete step flow: Steps 5, 5.5, 5.6, 5.7 insertion points confirmed)
- Direct file read: `workflows/check-readiness.md` (all four steps, semantic check pattern confirmed)
- Direct file read: `agents/pde-research-validator.md` (complete agent definition, return format, RVAL-05 write-constraint)
- Direct file read: `~/.claude/agents/pde-plan-checker.md` (Dimensions 9, 10, 11 artifact formats confirmed)
- Direct file read: `bin/lib/readiness.cjs` (A1-A11, B1-B3 implementation, runStructuralChecks signature, writeReadinessMd function)
- Direct file read: `bin/lib/init.cjs` (lines 118-139 — confirmed has_research_validation NOT emitted)

### Secondary (MEDIUM confidence)
- Direct file read: `.planning/phases/54-tech-debt-closure/54-RESEARCH-VALIDATION.md` (real artifact confirming frontmatter format)
- Direct file read: `.planning/phases/56-plan-checker-enhancement/56-01-PLAN.md`, `56-02-PLAN.md`, `56-03-PLAN.md` (confirmed Dimension 9/10/11 formats)
- Direct file read: `.planning/config.json` (nyquist_validation: true confirmed for this project)

### Tertiary (LOW confidence)
- None — all claims verified by direct file reads.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly, no assumptions
- Architecture: HIGH — integration points confirmed by reading actual source
- Pitfalls: HIGH — each pitfall derived from direct code evidence (init.cjs gap confirmed, write-constraint confirmed from agent definition, step ordering confirmed from plan-phase.md)

**Research date:** 2026-03-19
**Valid until:** Stable until any of workflows/plan-phase.md, workflows/check-readiness.md, bin/lib/readiness.cjs, or agents/pde-research-validator.md are modified
