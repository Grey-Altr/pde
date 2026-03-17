# Phase 28: Build Orchestrator Expansion - Research

**Researched:** 2026-03-17
**Domain:** Markdown-based workflow orchestration, design pipeline stage management
**Confidence:** HIGH

## Summary

Phase 28 is a mechanical expansion of a well-established internal pattern. The current `workflows/build.md` is a 7-stage thin orchestrator; this phase expands it to 13 stages by prepending 4 pre-brief research stages (recommend, competitive, opportunity, ideate) and inserting 2 post-iterate quality stages (mockup, hig) before handoff. All six new skills exist, are individually tested, and follow the same Skill() invocation pattern as the existing seven.

The two non-trivial additions are: (1) dynamic stage counting — no hardcoded `7` or `13` anywhere in messages, all counts derived from the stage list at runtime — and (2) the `--from` flag for mid-pipeline entry, which requires argument parsing logic new to this orchestrator but already established in `workflows/autonomous.md`.

The brief completion check retains its Glob-based approach (no coverage flag). The ideation stage adds a second Glob check (`IDT-ideation-v*.md`) per the CONTEXT.md specification. All other new stages use their respective coverage flags directly from the `coverage-check` JSON output.

**Primary recommendation:** Write the stage list as a structured data table at the top of the `<process>` block; derive all stage counts, skip logic, and display labels from that table. Follow the autonomous.md `--from` flag parsing pattern exactly.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Stage ordering locked: recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff
- `--from {stage_name}` skips all preceding stages without completion checks; invalid stage name errors with valid stage list
- Stage list defined as structured data at top of workflow; count derived at runtime (BUILD-02 compliance)
- Flat stage table in completion messaging (1/13 through 13/13); no grouping
- Coverage flag mapping:
  - hasRecommendations → recommend
  - hasCompetitive → competitive
  - hasOpportunity → opportunity
  - hasIdeation → ideate (also check Glob for IDT artifact)
  - hasMockup → mockup
  - hasHigAudit → hig
  - Brief: Glob BRF-brief-v*.md (unchanged)
  - hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasIterate, hasHandoff unchanged
- PASSTHROUGH_ARGS: --quick, --verbose, --force only
- HIG runs full standalone (not --light) when invoked from build pipeline
- Orchestrator is strictly read-only (no coverage writes)
- Must use Skill() not Task() for all invocations (Issue #686)
- Coverage read once at startup, never re-read mid-pipeline
- hasIterate defaults to false if absent

### Claude's Discretion

- Internal variable naming and code organization within the workflow file
- Exact wording of stage transition messages
- Whether to add a `--to` flag (stop after a specific stage) in addition to `--from`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUILD-01 | `/pde:build --dry-run` displays exactly 13 stages in correct order | Stage list architecture section covers this; all 13 skill commands verified to exist |
| BUILD-02 | Stage count in all messages derived from stage list at runtime, not hardcoded | Data-driven stage list pattern documented; eliminates all literal `7` and `13` references |
| BUILD-03 | User can start at any named stage via `--from`; preceding stages skipped without error | `--from` flag parsing pattern from autonomous.md documented; string-based stage name matching specified |
| BUILD-04 | After complete pipeline run, all 13 coverage flags in design-manifest.json are true | Read-once coverage pattern + each skill owning its own flag; no orchestrator writes needed |
</phase_requirements>

---

## Standard Stack

### Core
| Component | Version/Source | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| `workflows/build.md` | Current file | Orchestrator being modified | All patterns carry forward directly |
| `bin/pde-tools.cjs design coverage-check` | Existing binary | Returns `manifest.designCoverage` JSON | Returns object directly; absent fields are absent (no normalization) |
| `bin/pde-tools.cjs design ensure-dirs` | Existing binary | Creates all design directories including `ux/mockups/` | Extended in Phase 24 to include new dirs |
| `Skill()` invocation | Claude Code API | Flat skill invocation without agent nesting | Issue #686 mandates this over Task() |

### All 13 Skill Commands (Verified to Exist)
| Stage | Skill | Coverage Check | Artifact Path |
|-------|-------|---------------|--------------|
| 1 | `/pde:recommend` | `hasRecommendations` (coverage-check JSON) | `.planning/design/strategy/REC-recommendations-v*.md` |
| 2 | `/pde:competitive` | `hasCompetitive` (coverage-check JSON) | `.planning/design/strategy/CMP-competitive-v*.md` |
| 3 | `/pde:opportunity` | `hasOpportunity` (coverage-check JSON) | `.planning/design/strategy/OPP-opportunity-v*.md` |
| 4 | `/pde:ideate` | `hasIdeation` (coverage-check JSON) + Glob `IDT-ideation-v*.md` | `.planning/design/strategy/IDT-ideation-v*.md` |
| 5 | `/pde:brief` | Glob `BRF-brief-v*.md` only (no coverage flag) | `.planning/design/strategy/BRF-brief-v*.md` |
| 6 | `/pde:system` | `hasDesignSystem` (coverage-check JSON) | `.planning/design/visual/SYS-system-v*.md` |
| 7 | `/pde:flows` | `hasFlows` (coverage-check JSON) | `.planning/design/ux/FLW-flows-v*.md` |
| 8 | `/pde:wireframe` | `hasWireframes` (coverage-check JSON) | `.planning/design/ux/wireframes/WFR-*.html` |
| 9 | `/pde:critique` | `hasCritique` (coverage-check JSON) | `.planning/design/review/CRT-critique-v*.md` |
| 10 | `/pde:iterate` | `hasIterate` (default false if absent) | `.planning/design/review/ITR-iterate-v*.md` |
| 11 | `/pde:mockup` | `hasMockup` (coverage-check JSON) | `.planning/design/ux/mockups/mockup-*.html` |
| 12 | `/pde:hig` | `hasHigAudit` (coverage-check JSON) | `.planning/design/review/HIG-audit-v*.md` |
| 13 | `/pde:handoff` | `hasHandoff` (coverage-check JSON) | `.planning/design/handoff/HND-handoff-spec-v*.md` |

**Coverage-check JSON canonical field order** (verified from `bin/lib/design.cjs` and all skill workflows):
```
hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate,
hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit,
hasRecommendations
```

Note: `hasBrief` is NOT in `designCoverage` — brief completion is tracked via `artifacts.BRF` presence, checked via Glob.

---

## Architecture Patterns

### Pattern 1: Data-Driven Stage List (BUILD-02 Compliance)

**What:** Define all stage metadata as a structured table at the top of the `<process>` block. All counts, skip checks, and display strings are computed from the list rather than written as literals.

**When to use:** Required. Eliminates hardcoded `7` and `13` from all orchestrator messages.

**Implementation approach:**

```
STAGES (ordered list, defined once):
  Index | Name          | Skill          | Check Method  | Check Field/Glob
  1     | recommend     | pde:recommend  | coverage      | hasRecommendations
  2     | competitive   | pde:competitive| coverage      | hasCompetitive
  3     | opportunity   | pde:opportunity| coverage      | hasOpportunity
  4     | ideate        | pde:ideate     | coverage+glob | hasIdeation + IDT-ideation-v*.md
  5     | brief         | pde:brief      | glob          | BRF-brief-v*.md
  6     | system        | pde:system     | coverage      | hasDesignSystem
  7     | flows         | pde:flows      | coverage      | hasFlows
  8     | wireframe     | pde:wireframe  | coverage      | hasWireframes
  9     | critique      | pde:critique   | coverage      | hasCritique
  10    | iterate       | pde:iterate    | coverage      | hasIterate (default false)
  11    | mockup        | pde:mockup     | coverage      | hasMockup
  12    | hig           | pde:hig        | coverage      | hasHigAudit
  13    | handoff       | pde:handoff    | coverage      | hasHandoff

TOTAL = count(STAGES)  -- used everywhere instead of literal "13"
```

Stage display format: `Stage {N}/{TOTAL}: /pde:{skill} — {status}`

### Pattern 2: --from Flag Parsing (Mid-Pipeline Entry)

**What:** Parse `--from {stage_name}` from `$ARGUMENTS`. Match against stage names from the STAGES list. All stages before the match are treated as "skip without checking completion."

**Precedent:** `workflows/autonomous.md` implements `--from N` (numeric) using grep + awk. The build orchestrator uses stage names (strings), so matching is against the STAGES list name field.

**Implementation approach:**

```bash
FROM_STAGE=""
if echo "$ARGUMENTS" | grep -qE '\-\-from\s+\S+'; then
  FROM_STAGE=$(echo "$ARGUMENTS" | grep -oE '\-\-from\s+\S+' | awk '{print $2}')
fi
```

Validation at startup (before coverage-check):
```
IF FROM_STAGE is set:
  Find index of FROM_STAGE in STAGES list (case-insensitive match)
  IF not found:
    HALT with error: "Unknown stage '{FROM_STAGE}'. Valid stages: recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff"
  SET FROM_INDEX = matched stage index
```

During stage execution (Step 3):
```
FOR each stage at index N:
  IF FROM_INDEX is set AND N < FROM_INDEX:
    Display: "Stage {N}/{TOTAL}: /pde:{skill} — skipped (--from {FROM_STAGE})"
    Continue (no completion check, no Skill() invocation)
  ELSE:
    Apply normal complete/pending logic
```

**Key difference from autonomous.md:** The autonomous orchestrator uses numeric phase numbers; build uses string stage names. The validation step (error on unknown stage name) is new and required by the CONTEXT.md decision.

### Pattern 3: Dual Completion Check for Ideate Stage

**What:** Stage 4 (ideate) is complete when BOTH `hasIdeation == true` in coverage-check AND a `IDT-ideation-v*.md` file exists. This mirrors the brief stage's Glob-only approach, extended with a flag check.

**Implementation approach:**

```
IDEATE_DONE = (COV.hasIdeation == true) AND (Glob(".planning/design/strategy/IDT-ideation-v*.md") returns at least one file)
```

If only the flag is set (no artifact), treat as pending. If only the artifact exists (no flag), treat as pending. Both must be true.

**Why both?** The CONTEXT.md decision specifies "hasIdeation flag + Glob on IDT-ideation-v*.md" — defensive double check protects against partial runs.

### Pattern 4: Step Count in Process Steps (Self-Referential)

**What:** The orchestrator's own "Step N/4" process labels remain as-is (these are orchestrator meta-steps, not pipeline stages). Only the pipeline stage display messages use the dynamic TOTAL from the STAGES list.

**Distinction:**
- "Step 1/4: Initialized" — orchestrator's own 4-step process (static, stays 4)
- "Stage 1/13: /pde:recommend — pending" — pipeline stages (dynamic TOTAL from STAGES list)

### Anti-Patterns to Avoid

- **Hardcoded stage count:** NEVER write `13` or `7` as a literal in any pipeline stage message. Every stage count display must reference `TOTAL` (the computed length of STAGES).
- **Task() invocation:** NEVER use Task tool for skill invocation (Issue #686 — nested agent freeze). Only Skill().
- **Coverage writes:** NEVER call `manifest-set-top-level` or any manifest mutation from the orchestrator. Read-only.
- **Re-reading coverage mid-pipeline:** Read once in Step 2, never again. Re-reading causes false-complete on current run.
- **Missing `hasIterate` default:** `hasIterate` may be absent from coverage-check output (added at runtime by /pde:iterate). Always default to `false` if absent.
- **Mode flag passthrough:** NEVER pass `--yolo` or `--interactive` to sub-skills. PASSTHROUGH_ARGS is --quick, --verbose, --force only.
- **Skipping stages out of order:** Process stages 1→13 sequentially. Even if a later stage is complete, evaluate each in order.
- **`--dry-run` in PASSTHROUGH_ARGS:** --dry-run is orchestrator-only. Must not be forwarded to sub-skills.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coverage state | Custom tracking variables | `pde-tools.cjs design coverage-check` | Single source of truth; skills write to it |
| Directory creation | mkdir calls | `pde-tools.cjs design ensure-dirs` | Extended in Phase 24 to include all new dirs |
| Skill execution | Bash subprocess or Task() | `Skill()` flat invocation | Task() causes Issue #686 freezes |
| Stage completion persistence | Orchestrator state files | `designCoverage` in `design-manifest.json` | Already the crash recovery mechanism |

---

## Common Pitfalls

### Pitfall 1: Hardcoded Stage Count in Messages
**What goes wrong:** Typing `"All 13 stages complete"` or `"Stage 1/13"` directly in the workflow prose. Phase 24-27 expansions already happened once (7→13); future expansions would require manual search-replace.
**Why it happens:** Most natural way to write stage messages.
**How to avoid:** Define TOTAL = len(STAGES) once; reference TOTAL in every count display. The style guide confirms `Step N/M` format where M is computed.
**Warning signs:** Any literal digit in a stage progress message.

### Pitfall 2: Missing FROM_STAGE Validation
**What goes wrong:** User passes `--from wirefame` (typo). Without validation, the `--from` filter never matches and the orchestrator runs all stages silently.
**Why it happens:** Grep-based argument parsing succeeds regardless of whether the stage name is valid.
**How to avoid:** After parsing FROM_STAGE, immediately look it up in the STAGES list. If not found, halt with error listing all valid names.
**Warning signs:** FROM_STAGE set but no matching entry — must be caught before coverage-check.

### Pitfall 3: Brief Stage Still Checked via Coverage Flag
**What goes wrong:** Checking `hasBrief` in the coverage-check JSON (which doesn't exist — removed in Phase 15.1). Stage always appears pending.
**Why it happens:** Logical expectation that brief, like other stages, has a coverage flag.
**How to avoid:** Brief stage completion is ALWAYS Glob on `.planning/design/strategy/BRF-brief-v*.md`. This is unchanged from the v1.1 orchestrator. Anti-pattern 3 in existing build.md explicitly calls this out.
**Warning signs:** Any reference to `hasBrief` in the new orchestrator.

### Pitfall 4: HIG Invoked in --light Mode
**What goes wrong:** Passing `--light` to `/pde:hig` when invoked from the build pipeline. Light mode is only for critique delegation; it returns inline findings without writing `HIG-audit-v*.md` or setting `hasHigAudit`.
**Why it happens:** hig.md has a prominent `--light` flag and critique uses it; confusion about which mode the pipeline should use.
**How to avoid:** Stage 12 invokes `Skill(skill="pde:hig", args="${PASSTHROUGH_ARGS}")` with no additional flags. HIG defaults to full mode when `--light` is absent. CONTEXT.md explicitly states "HIG runs as full standalone (not --light) when invoked from build pipeline."
**Warning signs:** Any stage 12 invocation that includes `--light`.

### Pitfall 5: Ideate Stage Marked Complete on Flag Alone
**What goes wrong:** Checking only `hasIdeation == true` and skipping the Glob check. If `/pde:recommend` or another skill sets the flag partially, the stage appears complete without an IDT artifact.
**Why it happens:** All other coverage-flag stages only need the flag.
**How to avoid:** Stage 4 requires BOTH the flag AND a Glob match. See Pattern 3.
**Warning signs:** Ideate check logic that reads only from COV without a Glob call.

### Pitfall 6: `--from` Skips Stages Mid-Step Rather Than Pre-Step
**What goes wrong:** Checking FROM_INDEX after coverage-check and after building the stage status table. Skipped stages then appear in the table as "pending" before being skipped during execution, creating confusing dry-run output.
**How to avoid:** During --dry-run table display and during step 3 execution, apply the FROM_STAGE filter consistently. Skipped-by-`--from` stages should display a distinct status in the table: `skipped (--from)` vs `complete` vs `pending`.

---

## Code Examples

Verified patterns from existing codebase:

### Coverage-Check Read Pattern (from build.md, verified)
```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```
Parse JSON. Extract fields. Any field absent from the JSON defaults to `false`.

### --from Argument Parsing (from autonomous.md, adapted for string stage names)
```bash
FROM_STAGE=""
if echo "$ARGUMENTS" | grep -qE '\-\-from\s+\S+'; then
  FROM_STAGE=$(echo "$ARGUMENTS" | grep -oE '\-\-from\s+\S+' | awk '{print $2}')
fi
```

### Brief Completion Check (from build.md, unchanged)
Use Glob tool on `.planning/design/strategy/BRF-brief-v*.md`. If any file found, BRIEF_DONE = true.

### Skill Invocation Pattern (from build.md, scaled to 13 stages)
```
Skill(skill="pde:recommend", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:competitive", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:opportunity", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:ideate", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:brief", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:system", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:flows", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:wireframe", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:critique", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:iterate", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:mockup", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:hig", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:handoff", args="${PASSTHROUGH_ARGS}")
```
Note: `pde:hig` receives no `--light` flag; PASSTHROUGH_ARGS contains only --quick/--verbose/--force.

### Verification Gate Pattern (from build.md, scaled to 13 stages)
The gate message template scales naturally: `Stage {N}/{TOTAL} (/pde:{skill}) complete. Continue to Stage {N+1}/{TOTAL} (/pde:{next_skill})?`

Yolo advance message: `[{MODE}] Advancing to Stage {N+1}/{TOTAL}...`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| 7-stage pipeline (brief→handoff) | 13-stage pipeline (recommend→handoff) | Phase 28 | Pre-brief research layer + post-iterate quality gate added |
| Hardcoded `7` in all messages | Dynamic TOTAL from stage list | Phase 28 | Future pipeline expansions require no message text changes |
| No mid-pipeline entry | `--from {stage_name}` flag | Phase 28 | Users can resume at any named stage after partial runs |
| Fixed stage count | Data-driven STAGES list | Phase 28 | Single definition point for all stage metadata |

---

## Open Questions

1. **`--to` flag (stop after named stage)**
   - What we know: CONTEXT.md marks this as Claude's discretion
   - What's unclear: Whether users need this for the v1.2 milestone use cases
   - Recommendation: Skip for now. `--from` covers the most important resume scenario. `--to` can be added in a subsequent phase if needed. Adds implementation complexity without a clear v1.2 user story.

2. **Dry-run display for `--from` + `--dry-run` combined**
   - What we know: Both flags are valid independently; no explicit spec for combined behavior
   - What's unclear: Whether skipped-by-`--from` stages should appear in dry-run table
   - Recommendation: Show all 13 stages in the table with a third status: `skipped (--from)` for pre-FROM stages, `complete` or `pending` for at/after FROM stages. This makes the combined invocation maximally informative.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — workflow files are markdown; validation is behavioral |
| Config file | N/A |
| Quick run command | `/pde:build --dry-run` (manual) |
| Full suite command | Full pipeline run on a project with known state |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUILD-01 | `--dry-run` displays 13 stages in correct order | manual-smoke | `/pde:build --dry-run` | ❌ Wave 0 (manual) |
| BUILD-02 | No hardcoded numeric literals in stage messages | code-review | Grep for digit literals in stage display lines | ❌ Wave 0 (review) |
| BUILD-03 | `--from wireframe` skips stages 1-7 without error | manual-smoke | `/pde:build --from wireframe --dry-run` | ❌ Wave 0 (manual) |
| BUILD-04 | All 13 flags true after complete pipeline | integration | Full pipeline run + `pde-tools.cjs design coverage-check` | ❌ Wave 0 (integration) |

Note: BUILD-02 can be partially automated via grep on the completed workflow file to verify no bare digit matches the stage count pattern. BUILD-01 and BUILD-03 are inherently manual (require Claude Code execution environment).

### Sampling Rate
- **Per task commit:** Code review (grep for hardcoded digits in stage messages)
- **Per wave merge:** Manual dry-run smoke test
- **Phase gate:** `--dry-run` output verified before `/pde:verify-work`

### Wave 0 Gaps
- [ ] Manual test script or checklist for BUILD-01/BUILD-03 verification
- [ ] Grep pattern to detect hardcoded stage count literals: `grep -E "Stage [0-9]+/[0-9]+" workflows/build.md`

---

## Sources

### Primary (HIGH confidence)
- `workflows/build.md` — Current 7-stage orchestrator; all patterns, anti-patterns, crash recovery documented inline
- `bin/lib/design.cjs` lines 296-302 — `cmdCoverageCheck` returns `manifest.designCoverage` directly; absent fields are absent in output (no normalization)
- `workflows/recommend.md`, `competitive.md`, `opportunity.md`, `ideate.md`, `mockup.md`, `hig.md` — Coverage flag names, pass-through-all JSON pattern, and Skill() invocation confirmed in each workflow's final step
- `workflows/autonomous.md` lines 19-26 — `--from N` argument parsing pattern (grep + awk); adapted for string stage names
- `.planning/phases/28-build-orchestrator-expansion/28-CONTEXT.md` — All locked decisions, coverage flag mapping, PASSTHROUGH_ARGS scope

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Confirms Phase 24 pass-through-all pattern and Phase 20 Skill() over Task() decision
- `.planning/PROJECT.md` — Key Decisions table confirms read-only orchestrator, pass-through-all coverage, hasIterate default-false decisions

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Stage list and coverage flags: HIGH — verified by reading each skill workflow directly
- `--from` flag parsing: HIGH — pattern exists in autonomous.md; adaptation is straightforward
- Dynamic stage counting: HIGH — no existing mechanism required; pure workflow authoring pattern
- `hasIterate` default-false: HIGH — explicitly documented in build.md anti-patterns and STATE.md
- Brief Glob-only check: HIGH — explicitly documented in build.md anti-patterns section

**Research date:** 2026-03-17
**Valid until:** Stable (no external dependencies; internal codebase only) — valid until any skill workflow changes its coverage flag name
