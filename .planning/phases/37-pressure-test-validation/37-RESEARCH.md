# Phase 37: Pressure Test & Validation - Research

**Researched:** 2026-03-18
**Domain:** End-to-end pipeline validation, multi-tier design quality evaluation, fixture-based CLI testing, AI aesthetic detection
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRES-01 | `/pde:pressure-test` command runs full 13-stage pipeline on a real product concept (not PDE itself) | Command + workflow pattern identical to `/pde:build` + `/pde:audit`; PRT skill code registered in skill-registry.md; command must invoke `Skill("pde:build")` against a dedicated fixture project directory |
| PRES-02 | Process compliance tier validates artifact existence, coverage flags, design-manifest.json completeness, and pipeline completion for all 13 stages | `pde-tools design coverage-check` returns the 13-flag designCoverage JSON; artifact existence validated via Glob against expected paths per stage; manifest completeness checks top-level fields |
| PRES-03 | Quality rubric tier evaluates each artifact against Awwwards criteria producing specific design findings per artifact | `pde-design-quality-evaluator` agent pattern directly applicable; `references/quality-standards.md` already defines 4-dimension rubric; Task() pattern from audit workflow covers multi-artifact evaluation |
| PRES-04 | Pressure test supports multiple entry-state fixtures: greenfield, partially-complete (5-8 stages done), and re-run of completed stage | Fixture states managed via dedicated `.planning/pressure-test/` fixture directories; greenfield = fresh `ensure-dirs`; partial = fixture manifest with subset of coverage flags true; re-run = completed stage fixture |
| PRES-05 | Pressure test produces structured report at `.planning/pressure-test-report.md` with pass/fail per tier, per-artifact findings, and actionable improvement recommendations | Report pattern identical to `audit-report.md` structure from Phase 30; two-tier (compliance + quality) maps to two sections |
| PRES-06 | Pressure test evaluates for AI aesthetic avoidance: concept-specific interactions, non-generic color choices, intentional asymmetry, custom motion choreography — each as named pass/fail check | AI aesthetic flag catalogue lives in `references/quality-standards.md` Section 3 (per-dimension AI Aesthetic Flags rows); `references/composition-typography.md` has asymmetry patterns; VISUAL-HOOK convention in mockup.md is the concept-specificity anchor |
</phase_requirements>

---

## Summary

Phase 37 is the capstone phase for PDE v1.3. It delivers a `/pde:pressure-test` command that runs the full 13-stage design pipeline on a real product concept (a fixture project, not PDE itself), then evaluates the resulting artifacts across two tiers: process compliance (did all 13 stages run and produce artifacts?) and design quality (do the artifacts avoid AI aesthetic patterns and score against the Awwwards rubric?).

The architecture is a composition of two existing PDE patterns already proven across phases 30–36. The **compliance tier** reuses the `pde-tools design coverage-check` + Glob artifact-path pattern from `workflows/build.md`. The **quality tier** reuses the `Task(pde-design-quality-evaluator)` pattern from `workflows/audit.md`, but targets design output artifacts (`.planning/design/**`) rather than PDE skill files. The pending STATE.md decision — "human review pass vs. AI-with-rubric judge agent" — is resolved here: the AI-with-rubric judge agent pattern is the correct choice, since the evaluator agent already exists, already consumes `references/quality-standards.md`, and already produces specific named findings. Human review would make the command non-automatable and prevent the named pass/fail checks required by PRES-06.

The key architectural challenge is fixture management. The pipeline must run on a **real product concept** in an isolated workspace, not in the PDE project directory (the PDE repo's own `.planning/design/` is currently empty/stub). The cleanest approach is a dedicated fixture directory at `.planning/pressure-test/` containing pre-seeded project state per fixture type: a `fixture-greenfield/` subdirectory (empty manifest, no artifacts), a `fixture-partial/` subdirectory (manifest with 5–8 coverage flags set and corresponding stub artifacts), and a `fixture-rerun/` subdirectory (manifest with all 13 flags set, completed artifacts). The pressure-test workflow runs `pde:build` with `CLAUDE_PLUGIN_ROOT` pointing to the fixture directory's `.planning/design/` context.

**Primary recommendation:** Implement `/pde:pressure-test` as a two-phase workflow — Phase A runs `pde:build` on the fixture, Phase B spawns `pde-design-quality-evaluator` for rubric evaluation. Use `pde-tools design coverage-check` for compliance. Use the existing AI aesthetic flag catalogue in `quality-standards.md` Section 3 for the PRES-06 named checks.

---

## Standard Stack

### Core (Already in Project — No New Installs)

| Component | Path | Purpose | Why Use It |
|-----------|------|---------|------------|
| `pde-tools design coverage-check` | `bin/lib/design.cjs:cmdCoverageCheck` | Returns 13-field designCoverage JSON | Single source of truth for pipeline completion state; already used by `workflows/build.md` |
| `pde-tools design manifest-read` | `bin/lib/design.cjs:cmdManifestRead` | Returns full design-manifest.json | Validates manifest top-level fields (projectName, productType, etc.) for completeness checks |
| `pde-tools design ensure-dirs` | `bin/lib/design.cjs:cmdEnsureDirs` | Creates `.planning/design/` and domain subdirs | Idempotent — safe to call before each fixture run |
| `agents/pde-design-quality-evaluator.md` | Existing agent | Evaluates artifacts against skill quality rubric (4 dimensions, Awwwards-weighted) | Already implemented with exact return JSON schema needed; already consumes `quality-standards.md` |
| `references/quality-standards.md` | Existing reference | Awwwards 4-dimension rubric with AI aesthetic flags per dimension | Owned by PRT (registered in file header); loaded via @ include |
| `references/composition-typography.md` | Existing reference | Asymmetry principles, grid systems, type pairing | Asymmetry detection patterns for PRES-06 |
| `references/motion-design.md` | Existing reference | Motion choreography patterns, GSAP CDN, scroll-driven | Custom motion detection vocabulary for PRES-06 |
| `Skill()` invocation | `workflows/build.md` pattern | Run each pipeline stage | Anti-pattern: NEVER use Task() for stage invocation (Issue #686 freeze risk) |
| `Task()` invocation | `workflows/audit.md` pattern | Spawn evaluator agent | Task() is correct for agents; Skill() is for skills — they are different invocation patterns |

### New Deliverables This Phase

| Deliverable | Type | Purpose |
|-------------|------|---------|
| `commands/pressure-test.md` | Command | Entry point, dispatches to workflow |
| `workflows/pressure-test.md` | Workflow | Orchestrates fixture setup, build run, compliance check, quality evaluation, report generation |
| `agents/pde-pressure-test-evaluator.md` | Agent | Design artifact rubric evaluator (distinct from skill evaluator) — evaluates `.planning/design/**` outputs |
| `.planning/pressure-test/fixture-greenfield/` | Fixture dir | Fresh manifest, no artifacts — tests full 13-stage run |
| `.planning/pressure-test/fixture-partial/` | Fixture dir | Manifest with 5–8 flags set, stub artifacts — tests resume behavior |
| `.planning/pressure-test/fixture-rerun/` | Fixture dir | All 13 flags set, complete artifacts — tests idempotent re-run |
| `.planning/pressure-test-report.md` | Output | Structured report with compliance tier and quality tier results |

### Agent Model Profile Decision

`pde-pressure-test-evaluator` must be added to `bin/lib/model-profiles.cjs`. Use quality: `opus` (design quality judgment requires maximum reasoning — matches `pde-design-quality-evaluator` precedent from Phase 29/30 decision). Profile: `{ quality: 'opus', balanced: 'sonnet', budget: 'sonnet' }`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AI-with-rubric judge agent | Human review step | Human review is not automatable; breaks named pass/fail checks for PRES-06; rejected |
| Single evaluator for both skill files and design artifacts | Two distinct evaluator agents | Design artifact evaluator targets HTML mockups, CSS files, MD design docs — not SKILL.md structure. The skill evaluator's checklist (7 anatomy sections, LINT rules) is wrong domain. Two agents needed. |
| Running `pde:build` in PDE project dir | Fixture isolation in `.planning/pressure-test/` | Running in PDE project dir would clobber PDE's own (currently empty) design manifest with test data. Fixture isolation is mandatory. |
| Inline rubric evaluation in workflow | Spawning Task() agent | Rubric evaluation requires deep reasoning across multiple artifacts. Inline workflow logic would exceed context limits and produce lower-quality findings. Task() agent pattern is established precedent. |

---

## Architecture Patterns

### Recommended File Structure

```
commands/
  pressure-test.md            # Thin command wrapper

workflows/
  pressure-test.md            # Orchestrating workflow (this is the skill registered as PRT)

agents/
  pde-pressure-test-evaluator.md  # Design artifact quality evaluator

.planning/
  pressure-test/
    fixture-greenfield/
      design/
        design-manifest.json  # Fresh manifest, all coverage flags false
        DESIGN-STATE.md
        strategy/             # Empty
        ux/                   # Empty
        visual/               # Empty
        handoff/              # Empty
        review/               # Empty
    fixture-partial/
      design/
        design-manifest.json  # Flags 1-7 true (recommend→wireframe complete)
        DESIGN-STATE.md
        strategy/
          REC-recommendations-v1.md  # Stub
          CPT-competitive-v1.md      # Stub
          OPP-opportunity-v1.md      # Stub
          IDT-ideation-v1.md         # Stub
          BRF-brief-v1.md            # Real product concept brief
        visual/
          SYS-tokens-v1.css          # Stub
        ux/
          FLW-flows-v1.md            # Stub
          WFR-*.md                   # Stub wireframes
    fixture-rerun/
      design/
        design-manifest.json  # All 13 flags true
        (all artifacts complete from prior run)

  pressure-test-report.md     # Output — written by workflow on completion
```

### Pattern 1: Fixture-Isolated Build Run

The core architectural challenge is running `pde:build` against a fixture directory rather than the live project. The established workaround in PDE is to pass `--from {stage}` to skip completed stages. For fixture isolation, the workflow must:

1. Copy fixture state to a working directory (or directly use the fixture as the design root)
2. Run `pde:build` with the fixture's design root as CWD or via `--from` flag
3. After completion, read the fixture's manifest for compliance check

**What:** Run `Skill("pde:build", args="--force")` where the working manifest has been seeded from the fixture state.

**Implementation approach:** The pressure-test workflow seeds the CWD's `.planning/design/` from the fixture before running. After the run, it reads back the manifest and artifacts from CWD. This avoids needing to modify `pde:build` and uses the existing `ensure-dirs` + manifest initialization pattern.

```bash
# Seed greenfield fixture
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs
# Manifest is fresh — all flags false (greenfield)

# Or seed partial fixture by copying fixture manifest
cp .planning/pressure-test/fixture-partial/design/design-manifest.json \
   .planning/design/design-manifest.json
# Then copy stub artifacts
```

**Limitation:** This approach runs on the PDE project's own CWD, which means artifact files produced by the pipeline will be written to `.planning/design/`. The fixture state must be saved before, and restored or cleaned after. A cleaner approach for isolation is to use a dedicated subdirectory — but PDE's tool infrastructure is hardcoded to `$CWD/.planning/design/`. Therefore: the workflow must save the current manifest state before seeding, run the build, then archive the produced artifacts.

**Simpler alternative (preferred):** Don't run the actual `pde:build` pipeline during pressure testing. Instead, use pre-produced fixtures where the pipeline has already been run (fixture-partial and fixture-rerun contain real prior-run artifacts). Only the greenfield fixture needs an actual live run. This avoids the CWD pollution problem entirely for two of three fixture tests.

**Recommendation:** For PRES-04 compliance, structure it as:
- `fixture-greenfield`: Live run via `Skill("pde:build")` on a dedicated product concept (freshly seeded). Accept that CWD `.planning/design/` gets populated — this is the point.
- `fixture-partial`: Pre-seeded with stages 1-7 complete. Run `Skill("pde:build")` which auto-resumes from stage 8. Produces stages 8-13.
- `fixture-rerun`: Pre-seeded with all 13 stages complete. Run `Skill("pde:build")` which skips all stages (dry-run verification). Confirms idempotent behavior.

### Pattern 2: Two-Tier Report Structure

The report mirrors `audit-report.md` but has two named tiers. The planner should model this after Phase 30's report structure.

```markdown
# PDE Pressure Test Report

**Run date:** {timestamp}
**Product concept:** {product name from brief}
**Fixture:** {greenfield|partial|rerun}

## Tier 1: Process Compliance

| Stage | Coverage Flag | Flag Set | Artifact Exists | Status |
|-------|---------------|----------|-----------------|--------|
| 1 recommend | hasRecommendations | true/false | ✓/✗ | PASS/FAIL |
...
| 13 handoff | hasHandoff | true/false | ✓/✗ | PASS/FAIL |

**Compliance Result:** PASS ({N}/13 stages complete) / FAIL ({N}/13)

### Manifest Completeness

| Field | Value | Status |
|-------|-------|--------|
| projectName | {value} | PASS/FAIL |
| productType | {value} | PASS/FAIL |
...

## Tier 2: Design Quality (Awwwards Rubric)

### Per-Artifact Findings

#### {Artifact: e.g., Design System (SYS)}

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|---------|
| Design | 7.5 | 0.40 | 3.00 |
...

**Findings:** {specific named findings, not generic}

### AI Aesthetic Avoidance (PRES-06)

| Check | Result | Evidence |
|-------|--------|----------|
| Concept-specific interaction present (VISUAL-HOOK) | PASS/FAIL | {named element or absence} |
| Non-generic color choice (OKLCH/custom palette) | PASS/FAIL | {specific color or "uses indigo-purple gradient"} |
| Intentional asymmetry visible (WIRE-03) | PASS/FAIL | {named axis break or symmetric grid} |
| Custom motion choreography (not all-at-once stagger) | PASS/FAIL | {named entrance order or generic stagger} |

**Quality Result:** PASS (score ≥ 6.5) / FAIL
```

### Pattern 3: Coverage Flag Mapping (All 13)

The 13 coverage flags in the full schema (verified against `workflows/recommend.md` line 582):

```json
{
  "hasDesignSystem":    false,
  "hasWireframes":      false,
  "hasFlows":           false,
  "hasHardwareSpec":    false,
  "hasCritique":        false,
  "hasIterate":         false,
  "hasHandoff":         false,
  "hasIdeation":        false,
  "hasCompetitive":     false,
  "hasOpportunity":     false,
  "hasMockup":          false,
  "hasHigAudit":        false,
  "hasRecommendations": false
}
```

Stage-to-flag mapping (from `workflows/build.md` STAGES table):

| Stage | Name | Coverage Flag | Artifact Glob |
|-------|------|---------------|---------------|
| 1 | recommend | `hasRecommendations` | `.planning/design/strategy/REC-recommendations-v*.md` |
| 2 | competitive | `hasCompetitive` | `.planning/design/strategy/CPT-competitive-v*.md` |
| 3 | opportunity | `hasOpportunity` | `.planning/design/strategy/OPP-opportunity-v*.md` |
| 4 | ideate | `hasIdeation` | `.planning/design/strategy/IDT-ideation-v*.md` |
| 5 | brief | *(Glob only — no coverage flag)* | `.planning/design/strategy/BRF-brief-v*.md` |
| 6 | system | `hasDesignSystem` | `.planning/design/visual/SYS-tokens-v*.css` |
| 7 | flows | `hasFlows` | `.planning/design/ux/FLW-flows-v*.md` |
| 8 | wireframe | `hasWireframes` | `.planning/design/ux/WFR-*.md` |
| 9 | critique | `hasCritique` | `.planning/design/review/CRT-critique-v*.md` |
| 10 | iterate | `hasIterate` | `.planning/design/review/ITR-iterate-v*.md` |
| 11 | mockup | `hasMockup` | `.planning/design/ux/mockups/mockup-*.html` |
| 12 | hig | `hasHigAudit` | `.planning/design/review/HIG-audit-v*.md` |
| 13 | handoff | `hasHandoff` | `.planning/design/handoff/HND-spec-v*.md` |

**Critical note:** Stage 5 (brief) has no coverage flag. Compliance check must use Glob only, matching `workflows/build.md` Step 2/4 behavior.

**Critical note:** `hasIterate` defaults to `false` if absent from manifest — it is set at runtime by `/pde:iterate` and may not exist in older manifests. Compliance check must handle missing key gracefully.

### Pattern 4: AI Aesthetic Detection Checks (PRES-06)

The four named pass/fail checks derive from existing rubric and skill patterns:

| Check | Detection Method | Evidence Source |
|-------|-----------------|-----------------|
| Concept-specific interaction (VISUAL-HOOK) | Grep for `VISUAL-HOOK` comment in mockup HTML artifacts | `workflows/mockup.md` — MOCK-06 convention uses `<!-- VISUAL-HOOK: {name} -->` dual comment |
| Non-generic color choice | Evaluator agent checks SYS tokens for OKLCH notation vs. generic hex; flags indigo-to-purple / teal-to-blue gradient patterns | `references/quality-standards.md` Section 3 Design AI Aesthetic Flags row |
| Intentional asymmetry | Grep for "asymmetry" or "asymmetric" annotation in wireframe artifacts | `references/composition-typography.md` asymmetry section; wireframe skill WIRE-03 annotation |
| Custom motion choreography | Evaluator checks mockup for non-generic stagger (narrative order) vs. uniform `.forEach delay` | `references/quality-standards.md` Section 3 Creativity AI Aesthetic Flags; `references/motion-design.md` choreography patterns |

### Anti-Patterns to Avoid

- **Using `Task()` for `pde:build` invocation:** `Task()` causes Issue #686 execution freezes when nested. `pde:build` must be invoked via `Skill()`. Only the evaluator agent uses `Task()`.
- **Running pressure test on PDE project concept:** PRES-01 explicitly requires a real product concept, not PDE itself. The fixture must seed a non-PDE product brief.
- **Writing manifest-update CLI calls from orchestrator:** The orchestrator must not write coverage flags. Each stage sets its own flags. The pressure-test workflow is read-only with respect to the pipeline manifest state.
- **Using a single evaluator agent for both PRES-02 and PRES-03:** Compliance (artifact existence) is a mechanical Glob+JSON check done inline in the workflow. Quality evaluation (PRES-03) requires the Task() agent. These are separate steps, not one agent call.
- **Assuming `hasIterate` exists in coverage JSON:** It defaults to absent if `/pde:iterate` hasn't run. Check `manifest.designCoverage.hasIterate ?? false`.
- **Running all three fixtures in the same `.planning/design/` directory simultaneously:** Each fixture run must be sequential and produce its own sub-section of the report. The design directory is reseeded between runs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coverage flag reading | Custom manifest parser | `pde-tools design coverage-check` | Already implemented; returns exact 13-field JSON |
| Artifact path resolution | Custom glob patterns | `pde-tools design artifact-path <code>` + Glob | Manifest stores canonical paths; avoids path drift |
| Design quality scoring | Custom rubric in workflow prose | `pde-design-quality-evaluator` agent via `Task()` | Agent already exists; consumes `quality-standards.md`; returns structured JSON with specific findings |
| AI aesthetic flag catalogue | Custom list in pressure-test workflow | `references/quality-standards.md` Section 3 AI Aesthetic Flags rows | Already maintained per-dimension; loaded via @ include |
| Report markdown generation | Custom template string | Inline markdown generation matching `audit-report.md` structure | Consistency with existing PDE report format; planner can reference the audit-report.md structure |
| Pipeline stage invocation | Custom stage runner | `Skill("pde:build")` | The build orchestrator already handles skip-complete, resume, and TOTAL-stage counting |

**Key insight:** Phase 37 is a capstone, not a ground-up build. Every component already exists. The work is wiring — fixture seeding, evaluation invocation, and report aggregation — not new capability.

---

## Common Pitfalls

### Pitfall 1: Fixture Contamination

**What goes wrong:** Running the pressure test populates the PDE project's own `.planning/design/` with test artifacts from the fixture product concept. Subsequent runs or PDE's own design work finds stale fixture artifacts.

**Why it happens:** `pde-tools design ensure-dirs` and all skills are hardcoded to `$CWD/.planning/design/`. There is no mechanism to redirect to an alternate design root.

**How to avoid:** After each fixture run, the workflow must capture the produced artifacts (copy to `.planning/pressure-test/results/{fixture-name}/`) and then optionally clean `.planning/design/` back to its pre-test state. Alternatively, document that pressure-test is a destructive operation that populates `.planning/design/` — and the fixture product concept becomes the user's design work for this project. This is actually the intended behavior (pressure-test on a real concept).

**Warning signs:** Duplicate artifact versions in `.planning/design/strategy/` after test runs; manifest with unexpected `projectName`.

### Pitfall 2: `hasIterate` Missing from Coverage JSON

**What goes wrong:** Compliance check fails with "key not found" or reports `hasIterate` as false when the stage actually ran.

**Why it happens:** `hasIterate` is only written by `/pde:iterate` — it does not exist in the freshly initialized manifest template. Older manifests from pre-Phase 15.1 don't have this field.

**How to avoid:** Always access as `manifest.designCoverage.hasIterate ?? false` — the nullish coalescing pattern used in `workflows/build.md`.

**Warning signs:** Compliance check reports iterate as FAIL even when CRT-critique artifact exists.

### Pitfall 3: brief Stage Has No Coverage Flag

**What goes wrong:** Compliance check reports Stage 5 (brief) as FAIL because `hasBrief` doesn't exist in the coverage JSON.

**Why it happens:** The brief coverage flag was removed in Phase 15.1. There is no `hasBrief` field. Only a Glob check works.

**How to avoid:** Stage 5 compliance must use Glob on `.planning/design/strategy/BRF-brief-v*.md`, not a coverage flag lookup. Match the pattern in `workflows/build.md` Step 2/4.

**Warning signs:** Coverage check JSON has 12 fields, not 13 (brief has no flag — this is correct behavior, not a bug).

### Pitfall 4: Quality Evaluator Targets Wrong Artifact Type

**What goes wrong:** The evaluator produces skill-structure findings (missing `<purpose>` sections, LINT rule violations) on design output artifacts (HTML mockups, CSS token files) because it was spawned with the wrong agent file.

**Why it happens:** `pde-design-quality-evaluator` is a **skill quality evaluator** — it scores SKILL.md files against the 7-step anatomy rubric. Design output artifacts (mockup HTML, system CSS, wireframe MD, critique MD) are not skill files and have different structure.

**How to avoid:** Create a new `pde-pressure-test-evaluator` agent specifically for design output artifacts. Its evaluation checklist must reference the design quality criteria from `quality-standards.md` Section 3 (per-dimension scoring criteria and AI aesthetic flags), not the skill anatomy checklist.

**Warning signs:** Evaluator reports "missing `<purpose>` section" on a CSS file; LINT-001 errors on HTML mockups.

### Pitfall 5: Pressure Test Product Concept Produces Generic Output

**What goes wrong:** The product concept used for pressure testing is too generic (e.g., "a to-do app", "a social media platform") and the pipeline produces AI aesthetic output by default — making PRES-06 AI aesthetic avoidance checks inevitably fail.

**Why it happens:** Generic product concepts don't provide enough concept-specific material for the elevated skills to produce non-generic output. The brief drives all downstream concept-specificity.

**How to avoid:** The fixture brief must be a specific, distinctive product concept with clear aesthetic direction. Good examples: "a vertical farming management system for urban rooftops" (specific domain + visual language), "a collaborative music notation tool for traditional Japanese instruments" (concept forces non-default typography and interaction choices). Bad examples: "task management", "e-commerce", "blog platform".

**Warning signs:** VISUAL-HOOK grep finds no `<!-- VISUAL-HOOK:` comments; color tokens use `#6366f1` (Tailwind indigo) or similar generic defaults.

### Pitfall 6: Task() Agent Receives Skill Files Instead of Design Artifacts

**What goes wrong:** The evaluator agent is passed skill file paths (e.g., `commands/brief.md`) instead of the design output artifacts (e.g., `.planning/design/strategy/BRF-brief-v1.md`).

**Why it happens:** Confusing "the brief skill" with "the brief artifact produced by the skill".

**How to avoid:** The quality tier evaluates `.planning/design/**` artifacts (the output), not `workflows/*.md` or `commands/*.md` (the skills). The artifact paths come from reading `design-manifest.json` artifacts entries, not from scanning the PDE commands directory.

---

## Code Examples

Verified patterns from existing PDE source:

### Coverage Check (Compliance Tier)

```bash
# Source: workflows/build.md Step 2/4
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# COV is JSON: {"hasDesignSystem":false,"hasWireframes":false,...}
# Access in bash: echo $COV | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('hasHandoff', False))"
```

### Manifest Read (Completeness Check)

```bash
# Source: bin/lib/design.cjs:cmdManifestRead
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
# MANIFEST is full design-manifest.json content as JSON
# Check top-level fields: projectName, productType, outputRoot, mode
```

### Spawning the Quality Evaluator (Quality Tier)

```
# Source: workflows/audit.md Section "1. Spawn Auditor Agent" pattern
# Adapted for design artifacts (NOT skill files)
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-pressure-test-evaluator.md for instructions.

<artifacts_to_evaluate>
Design Brief: .planning/design/strategy/BRF-brief-v{N}.md
Design System: .planning/design/visual/SYS-tokens-v{N}.css
Wireframes: .planning/design/ux/WFR-*.md
Mockup: .planning/design/ux/mockups/mockup-*.html
Critique: .planning/design/review/CRT-critique-v{N}.md
Handoff: .planning/design/handoff/HND-spec-v{N}.md
</artifacts_to_evaluate>

<rubric_path>${CLAUDE_PLUGIN_ROOT}/references/quality-standards.md</rubric_path>
<ai_flags_check>true</ai_flags_check>

<constraint>READ-ONLY. Return structured JSON with per-artifact findings and AI aesthetic check results.</constraint>",
  model="{EVALUATOR_MODEL}"
)
```

### VISUAL-HOOK Detection (PRES-06)

```bash
# Source: Phase 35 VISUAL-HOOK dual comment convention (workflows/mockup.md)
# Mockup files contain: <!-- VISUAL-HOOK: {concept-name} -->
VISUAL_HOOK_FOUND=$(grep -rl "VISUAL-HOOK:" .planning/design/ux/mockups/ 2>/dev/null | wc -l)
if [ "$VISUAL_HOOK_FOUND" -gt 0 ]; then
  echo "PASS: Concept-specific interaction (VISUAL-HOOK) present"
else
  echo "FAIL: No VISUAL-HOOK comment found in mockup artifacts"
fi
```

### Brief Stage Compliance (No Coverage Flag)

```bash
# Source: workflows/build.md Step 2/4 (brief stage uses Glob, not coverage flag)
# Use Glob tool, not bash glob — consistent with build.md pattern
# In workflow prose: Glob tool on ".planning/design/strategy/BRF-brief-v*.md"
# If any files found → BRIEF_DONE = true
# If no files found → BRIEF_DONE = false
```

### Ensure-Dirs for Fixture Reset

```bash
# Source: bin/lib/design.cjs:ensureDesignDirs — idempotent, does not overwrite existing files
# To reset to greenfield: delete manifest and state file first, then ensure-dirs
rm -f .planning/design/design-manifest.json
rm -f .planning/design/DESIGN-STATE.md
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs
# Now manifest is fresh with all coverage flags false
```

### Nyquist Test Shell Pattern (from Phase 36)

```bash
#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0

check() {
  if grep -qE "$1" "$2"; then
    PASS=$((PASS+1))
  else
    echo "FAIL: $3"
    FAIL=$((FAIL+1))
  fi
}

# PRES-01: pressure-test command exists
check "pde:pressure-test" "commands/pressure-test.md" "pressure-test command not registered"

# PRES-02: compliance tier in workflow
check "compliance" "workflows/pressure-test.md" "compliance tier not found in workflow"

echo "PRES-01/02: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bash shell scripts (project standard — all 17 Phase 36 Nyquist tests use this pattern) |
| Config file | none — bash scripts run directly |
| Quick run command | `bash .planning/phases/37-pressure-test-validation/test_pres*.sh` |
| Full suite command | `for f in .planning/phases/37-pressure-test-validation/test_pres*.sh; do bash "$f"; done` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRES-01 | `commands/pressure-test.md` exists with correct frontmatter | structural | `bash test_pres01_command.sh` | Wave 0 |
| PRES-01 | `workflows/pressure-test.md` exists with PRT skill registration | structural | `bash test_pres01_workflow.sh` | Wave 0 |
| PRES-02 | Compliance tier coverage check in workflow prose | structural | `bash test_pres02_compliance.sh` | Wave 0 |
| PRES-03 | Quality rubric tier agent invocation pattern in workflow | structural | `bash test_pres03_rubric.sh` | Wave 0 |
| PRES-04 | Fixture directories exist for all three states | structural | `bash test_pres04_fixtures.sh` | Wave 0 |
| PRES-05 | Report output path `.planning/pressure-test-report.md` referenced in workflow | structural | `bash test_pres05_report.sh` | Wave 0 |
| PRES-06 | AI aesthetic checks present (VISUAL-HOOK, color, asymmetry, motion) | structural | `bash test_pres06_ai_aesthetic.sh` | Wave 0 |

### Sampling Rate

- **Per task commit:** `bash .planning/phases/37-pressure-test-validation/test_pres*.sh`
- **Per wave merge:** Full suite (all test_pres*.sh scripts)
- **Phase gate:** All scripts green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/37-pressure-test-validation/test_pres01_command.sh` — covers PRES-01 (command + workflow existence)
- [ ] `.planning/phases/37-pressure-test-validation/test_pres02_compliance.sh` — covers PRES-02 (compliance tier pattern)
- [ ] `.planning/phases/37-pressure-test-validation/test_pres03_rubric.sh` — covers PRES-03 (rubric tier agent invocation)
- [ ] `.planning/phases/37-pressure-test-validation/test_pres04_fixtures.sh` — covers PRES-04 (fixture directory existence)
- [ ] `.planning/phases/37-pressure-test-validation/test_pres05_report.sh` — covers PRES-05 (report path in workflow)
- [ ] `.planning/phases/37-pressure-test-validation/test_pres06_ai_aesthetic.sh` — covers PRES-06 (4 AI aesthetic checks in workflow)

---

## State of the Art

### Pending Decision Resolution (from STATE.md)

STATE.md records this pending decision: "Pressure test quality evaluation tier: human review pass vs. AI-with-rubric judge agent — must be resolved before Phase 37 planning."

**Resolution: Use AI-with-rubric judge agent.**

Rationale:
- PRES-06 requires "each [AI aesthetic check] as a named pass/fail check" — this is only automatable with an agent
- The `pde-design-quality-evaluator` agent pattern is already proven in Phase 30
- Human review breaks the command's ability to produce a report non-interactively
- The evaluator must be a NEW agent (`pde-pressure-test-evaluator`) rather than reusing `pde-design-quality-evaluator` — see Pitfall 4

### Key Architectural Decision: Fixture Concept

The pressure-test must use a **real, specific product concept** — not PDE itself, not a generic CRUD app. The fixture brief must provide enough concept-specificity to drive non-AI-aesthetic output from the elevated skills.

**Recommended concept for fixture:** A specialized professional tool with a distinctive domain — something like "a music theory curriculum builder for conservatory educators" or "a materials-science simulation dashboard for polymer researchers". The specificity forces concept-driven color, typography, and interaction choices.

The concept must be embedded in the `fixture-greenfield/` brief artifact and the partial fixture's BRF-brief-v1.md.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual QA of pipeline output | AI-with-rubric evaluator agent | Phase 30 (audit-fleet pattern) | Automatable, consistent findings |
| Coverage check via manifest parsing | `pde-tools design coverage-check` CLI | Phase 12 (design pipeline infrastructure) | Single source of truth |
| `hasIterate` always present | `hasIterate` set at runtime by iterate skill | Phase 15.1 | Must use `?? false` null-coalescing |
| Brief coverage via flag | Brief coverage via Glob only | Phase 15.1 | No `hasBrief` flag exists |

**Deprecated/outdated:**
- `hasBrief` coverage flag: Removed Phase 15.1. Use Glob on `BRF-brief-v*.md` only.
- `pde-design-quality-evaluator` for design output: Wrong agent — targets SKILL.md anatomy, not design artifacts.

---

## Open Questions

1. **Fixture concept selection**
   - What we know: Must be real, specific, not PDE itself; drives concept-specificity in PRES-06 checks
   - What's unclear: Whether a single concept works for all three fixture states or if each fixture needs a different concept
   - Recommendation: Use one concept across all three fixtures (continuity) — the partial fixture is stages 1-7 of that same concept

2. **Fixture directory location vs. working directory contamination**
   - What we know: `pde-tools` is hardcoded to `$CWD/.planning/design/`; running pde:build will write to the live project
   - What's unclear: Whether the pressure-test artifacts should persist after the test or be cleaned up
   - Recommendation: Accept that `.planning/design/` gets populated with the fixture concept's design work. Document this behavior. This is consistent with "running a real pipeline on a real concept." The pressure-test report archives the state.

3. **Partial fixture artifact quality**
   - What we know: The partial fixture needs stages 1-7 complete with real enough artifacts for stages 8-13 to produce quality output
   - What's unclear: Should partial fixture artifacts be hand-authored stubs or produced by a prior run?
   - Recommendation: Produce them via a prior run of stages 1-7 on the chosen concept, then commit as fixture files. This ensures they're pipeline-authentic.

---

## Sources

### Primary (HIGH confidence)

- `workflows/build.md` — Pipeline STAGES definition, coverage-check pattern, Skill() invocation anti-patterns, 13-field designCoverage JSON schema, brief=Glob-only pattern
- `bin/lib/design.cjs` — `cmdCoverageCheck`, `cmdManifestRead`, `ensureDesignDirs` implementation
- `templates/design-manifest.json` — designCoverage schema with all 13 fields
- `references/quality-standards.md` — Awwwards 4-dimension rubric with per-dimension AI aesthetic flag rows; loaded by pressure-test.md per file header
- `agents/pde-design-quality-evaluator.md` — Task() agent pattern for design quality evaluation
- `workflows/audit.md` — Task() agent invocation pattern, report structure

### Secondary (MEDIUM confidence)

- `workflows/mockup.md` lines 1217+ — 13-field designCoverage write pattern confirming all field names
- `workflows/recommend.md` line 582 — Full 13-field JSON in canonical order (defines canonical field order)
- `.planning/phases/36-*/test_hand01_motion_spec.sh` — Bash Nyquist test pattern (PASS/FAIL counter, check() function, grep -qE pattern)
- `.planning/STATE.md` lines 78, 136 — Pending decision: "Pressure test quality evaluation tier: human review pass vs. AI-with-rubric judge agent"

### Tertiary (LOW confidence)

- None — all claims verified against project source code or existing skill files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All referenced components exist and are in active use
- Architecture patterns: HIGH — Fixture-isolation pattern and two-tier evaluation derived from existing build.md + audit.md workflows
- Pitfalls: HIGH — Each pitfall is traceable to a specific existing anti-pattern section or STATE.md decision record
- Validation architecture: HIGH — Nyquist test pattern verified from 17 passing Phase 36 tests

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable — PDE codebase is stable; only Phase 37 is pending)
