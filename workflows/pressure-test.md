---
name: pde:pressure-test
description: Run full 13-stage design pipeline on a product concept fixture and evaluate output across process compliance and design quality tiers
argument-hint: '[--fixture greenfield|partial|rerun] [--skip-build] [--verbose] [--dry-run] [--quick] [--no-mcp]'
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<purpose>
Run the full 13-stage design pipeline on a product concept fixture and evaluate output across two tiers: process compliance (artifact existence and coverage flag completeness) and design quality (Awwwards rubric evaluation with AI aesthetic avoidance checks). Produces a structured report at .planning/pressure-test-report.md.
</purpose>

<required_reading>
@${CLAUDE_PLUGIN_ROOT}/references/quality-standards.md
@${CLAUDE_PLUGIN_ROOT}/references/composition-typography.md
@${CLAUDE_PLUGIN_ROOT}/references/motion-design.md
</required_reading>

<skill_code>PRT</skill_code>
<skill_domain>tooling</skill_domain>

<context_routing>
Accepts $ARGUMENTS from commands/pressure-test.md.
No user-project artifacts needed — operates on fixture data and .planning/design/.
</context_routing>

<flags>
| Flag             | Type   | Behavior |
|------------------|--------|----------|
| --fixture {name} | string | Fixture to use: greenfield (default), partial, rerun |
| --skip-build     | bool   | Skip pde:build invocation — evaluate existing .planning/design/ artifacts only |
| --verbose        | bool   | Show detailed compliance check output |
| --dry-run        | bool   | Show what would be evaluated without running |
| --quick          | bool   | Skip quality tier — compliance only |
| --no-mcp         | bool   | Disable MCP tools |
</flags>

<process>

## Step 1/7: Initialize

Parse $ARGUMENTS for flags:
- `FIXTURE`: value after --fixture (default: "greenfield")
- `SKIP_BUILD`: true if --skip-build present
- `VERBOSE`: true if --verbose present
- `DRY_RUN`: true if --dry-run present
- `QUICK`: true if --quick present

```bash
# Parse FIXTURE value
FIXTURE="greenfield"
if echo "$ARGUMENTS" | grep -qE '\-\-fixture\s+\S+'; then
  FIXTURE=$(echo "$ARGUMENTS" | grep -oE '\-\-fixture\s+\S+' | awk '{print $2}')
fi

# Parse boolean flags
SKIP_BUILD=false
VERBOSE=false
DRY_RUN=false
QUICK=false
echo "$ARGUMENTS" | grep -q '\-\-skip-build' && SKIP_BUILD=true
echo "$ARGUMENTS" | grep -q '\-\-verbose' && VERBOSE=true
echo "$ARGUMENTS" | grep -q '\-\-dry-run' && DRY_RUN=true
echo "$ARGUMENTS" | grep -q '\-\-quick' && QUICK=true
```

Validate FIXTURE is one of: greenfield, partial, rerun. If invalid, display error and HALT:

```
ERROR: Invalid fixture "${FIXTURE}". Valid values: greenfield, partial, rerun
```

Resolve evaluator model:
```bash
EVALUATOR_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-pressure-test-evaluator --raw)
```

Display banner:
```
PDE > PRESSURE TEST
Fixture: {FIXTURE}
```

If DRY_RUN is true: display what would happen per fixture, then HALT (no execution):

```
DRY-RUN: Would execute pressure test with fixture: {FIXTURE}
  Step 2/7: Seed .planning/design/ from .planning/pressure-test/fixture-{FIXTURE}/
  Step 3/7: {SKIP_BUILD ? "Skip pipeline (--skip-build)" : "Run pde:build on seeded fixture"}
  Step 4/7: Run Tier 1 — Process Compliance (13 stages, 12 coverage flags + 1 Glob)
  Step 5/7: {QUICK ? "Skip Tier 2 (--quick)" : "Run Tier 2 — Design Quality (pde-pressure-test-evaluator)"}
  Step 6/7: Write report to .planning/pressure-test-report.md
  Step 7/7: Display results summary
Dry-run complete — no execution performed.
```

---

## Step 2/7: Seed Fixture

Seed `.planning/design/` from the fixture directory based on FIXTURE value:

For "greenfield":
```bash
# Reset design directory to fresh state
rm -rf .planning/design/
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs
# Manifest is now fresh with all coverage flags false — greenfield state
```

For "partial":
```bash
# Reset and seed from partial fixture (stages 1-7 complete: recommend through flows)
rm -rf .planning/design/
mkdir -p .planning/design/
cp -r "${CLAUDE_PLUGIN_ROOT}/.planning/pressure-test/fixture-partial/design/"* .planning/design/
```

For "rerun":
```bash
# Reset and seed from complete fixture (all 13 stages complete)
rm -rf .planning/design/
mkdir -p .planning/design/
cp -r "${CLAUDE_PLUGIN_ROOT}/.planning/pressure-test/fixture-rerun/design/"* .planning/design/
```

Display: `Fixture seeded: .planning/design/ populated from fixture-{FIXTURE}/`

---

## Step 3/7: Run Pipeline (optional)

If SKIP_BUILD is false, run the pipeline based on FIXTURE:

**For "greenfield":** Run full pipeline from scratch:
```
Skill("pde:build", args="--force")
```
All 13 stages are pending. Build runs them in order: recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff.

**For "partial":** Run remaining stages:
```
Skill("pde:build", args="--force")
```
Build reads coverage state, detects completed stages 1-7 (recommend through flows), and resumes from stage 8 (wireframe). Runs: wireframe → critique → iterate → mockup → hig → handoff.

**For "rerun":** Run dry-run verification:
```
Skill("pde:build", args="--dry-run")
```
All 13 stages are already complete. Verify idempotent skip behavior — build should report all stages complete and halt with no execution.

If SKIP_BUILD is true:
Display: `--skip-build: Skipping pipeline invocation. Evaluating existing artifacts.`

**CRITICAL:** Use `Skill()` NOT `Task()` for pde:build invocation. Task() causes Issue #686 execution freezes when nested. Skill() is the correct pattern for skill invocation.

---

## Step 4/7: Tier 1 — Process Compliance Check

Read coverage flags:
```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Read manifest for top-level field validation:
```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

**Coverage flag check (12 flags + 1 Glob):**

For each of the 12 flagged stages, extract the corresponding field from the COV JSON. Use `?? false` semantics for `hasIterate` — it may be absent from older manifests (added at runtime by /pde:iterate):

| Stage | Flag to Check | Default |
|-------|---------------|---------|
| 1 recommend | hasRecommendations | false |
| 2 competitive | hasCompetitive | false |
| 3 opportunity | hasOpportunity | false |
| 4 ideate | hasIdeation | false |
| 6 system | hasDesignSystem | false |
| 7 flows | hasFlows | false |
| 8 wireframe | hasWireframes | false |
| 9 critique | hasCritique | false |
| 10 iterate | hasIterate ?? false | false (absent = false) |
| 11 mockup | hasMockup | false |
| 12 hig | hasHigAudit | false |
| 13 handoff | hasHandoff | false |

For stage 5 (brief): Use Glob tool to check for `.planning/design/strategy/BRF-brief-v*.md`. No coverage flag exists for brief — Glob is the only check method.

**Artifact existence check:**

For each stage, use Glob tool to verify the artifact file exists at the expected path:

| Stage | Artifact Glob |
|-------|---------------|
| 1 recommend | .planning/design/strategy/REC-recommendations-v*.md |
| 2 competitive | .planning/design/strategy/CPT-competitive-v*.md |
| 3 opportunity | .planning/design/strategy/OPP-opportunity-v*.md |
| 4 ideate | .planning/design/strategy/IDT-ideation-v*.md |
| 5 brief | .planning/design/strategy/BRF-brief-v*.md |
| 6 system | .planning/design/visual/SYS-tokens-v*.css |
| 7 flows | .planning/design/ux/FLW-flows-v*.md |
| 8 wireframe | .planning/design/ux/WFR-*.md |
| 9 critique | .planning/design/review/CRT-critique-v*.md |
| 10 iterate | .planning/design/review/ITR-iterate-v*.md |
| 11 mockup | .planning/design/ux/mockups/mockup-*.html |
| 12 hig | .planning/design/review/HIG-audit-v*.md |
| 13 handoff | .planning/design/handoff/HND-spec-v*.md |

**Manifest completeness check:**

From the MANIFEST JSON, verify these top-level fields are present and non-empty:
- `projectName` (must be non-empty string)
- `productType` (must be non-empty string)
- `outputRoot` (must be non-empty string)
- `mode` (must be "full" or "quick")

Count: COMPLIANCE_PASS = number of stages where both flag check and artifact Glob pass. COMPLIANCE_TOTAL = 13.

Record results in a COMPLIANCE_RESULTS data structure for report generation.

If VERBOSE is true, display per-stage check results as they are computed.

---

## Step 5/7: Tier 2 — Design Quality Evaluation

If QUICK is true: Skip this step. Display: `Skipping quality tier (--quick mode).`

Build artifact list by scanning `.planning/design/` for the produced artifacts:

```bash
BRIEF_ARTIFACT=$(ls .planning/design/strategy/BRF-brief-v*.md 2>/dev/null | head -1)
SYSTEM_ARTIFACT=$(ls .planning/design/visual/SYS-tokens-v*.css 2>/dev/null | head -1)
WIREFRAME_ARTIFACTS=$(ls .planning/design/ux/WFR-*.md 2>/dev/null | tr '\n' ',')
MOCKUP_ARTIFACTS=$(ls .planning/design/ux/mockups/mockup-*.html 2>/dev/null | tr '\n' ',')
CRITIQUE_ARTIFACT=$(ls .planning/design/review/CRT-critique-v*.md 2>/dev/null | head -1)
HANDOFF_ARTIFACT=$(ls .planning/design/handoff/HND-spec-v*.md 2>/dev/null | head -1)
FLOWS_ARTIFACT=$(ls .planning/design/ux/FLW-flows-v*.md 2>/dev/null | head -1)
HIG_ARTIFACT=$(ls .planning/design/review/HIG-audit-v*.md 2>/dev/null | head -1)
```

Spawn the evaluator agent via Task() — this is the correct pattern for agents (NOT Skill()):

```
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-pressure-test-evaluator.md for instructions.

<artifacts_to_evaluate>
Design Brief: {BRIEF_ARTIFACT}
Design System: {SYSTEM_ARTIFACT}
Wireframes: {WIREFRAME_ARTIFACTS}
Mockups: {MOCKUP_ARTIFACTS}
Critique: {CRITIQUE_ARTIFACT}
Flows: {FLOWS_ARTIFACT}
HIG Audit: {HIG_ARTIFACT}
Handoff: {HANDOFF_ARTIFACT}
</artifacts_to_evaluate>

<rubric_path>${CLAUDE_PLUGIN_ROOT}/references/quality-standards.md</rubric_path>
<ai_flags_check>true</ai_flags_check>

<constraint>READ-ONLY. Return structured JSON with per-artifact findings and AI aesthetic check results matching the return schema in your agent instructions.</constraint>",
  model="{EVALUATOR_MODEL}"
)
```

Parse the evaluator's returned JSON. Extract:
- `artifacts_evaluated[]` — per-artifact dimension scores and findings
- `ai_aesthetic_checks{}` — 4 named pass/fail checks:
  - `concept_specific_interaction` — checks mockup HTML for `<!-- VISUAL-HOOK:` comment (concept-specific named interaction). PASS if found. FAIL if absent.
  - `non_generic_color` — checks system CSS for OKLCH color notation and custom palette. FAIL if palette matches common defaults (Tailwind indigo `#6366f1`, generic blue-purple gradient). PASS if color choices are domain-specific.
  - `intentional_asymmetry` — checks wireframes/mockups for "asymmetry" or "asymmetric" annotations. PASS if at least one axis break is documented. FAIL if only symmetric grid layouts present.
  - `custom_motion_choreography` — checks mockup for narrative entrance order in animations. PASS if elements enter in content-meaning order (e.g., hero → data label → CTA). FAIL if stagger pattern is uniform `.forEach` delay or all-at-once. Motion order must reflect the design's choreography intent, not generic sequential delay.
- `quality_result` — PASS if average overall_score >= 6.5 across all artifacts, FAIL otherwise
- `quality_threshold` — 6.5 (Awwwards Honorable Mention threshold)

---

## Step 6/7: Generate Report

Write the structured report to `.planning/pressure-test-report.md` using the Write tool.

Report template:

```markdown
# PDE Pressure Test Report

**Run date:** {ISO timestamp}
**Product concept:** Tide — marine biology field research platform for coastal ecologists
**Fixture:** {FIXTURE}

## Tier 1: Process Compliance

| # | Stage | Coverage Flag | Flag Set | Artifact Exists | Status |
|---|-------|---------------|----------|-----------------|--------|
| 1 | recommend | hasRecommendations | {true/false} | {yes/no} | {PASS/FAIL} |
| 2 | competitive | hasCompetitive | {true/false} | {yes/no} | {PASS/FAIL} |
| 3 | opportunity | hasOpportunity | {true/false} | {yes/no} | {PASS/FAIL} |
| 4 | ideate | hasIdeation | {true/false} | {yes/no} | {PASS/FAIL} |
| 5 | brief | (Glob only) | — | {yes/no} | {PASS/FAIL} |
| 6 | system | hasDesignSystem | {true/false} | {yes/no} | {PASS/FAIL} |
| 7 | flows | hasFlows | {true/false} | {yes/no} | {PASS/FAIL} |
| 8 | wireframe | hasWireframes | {true/false} | {yes/no} | {PASS/FAIL} |
| 9 | critique | hasCritique | {true/false} | {yes/no} | {PASS/FAIL} |
| 10 | iterate | hasIterate ?? false | {true/false} | {yes/no} | {PASS/FAIL} |
| 11 | mockup | hasMockup | {true/false} | {yes/no} | {PASS/FAIL} |
| 12 | hig | hasHigAudit | {true/false} | {yes/no} | {PASS/FAIL} |
| 13 | handoff | hasHandoff | {true/false} | {yes/no} | {PASS/FAIL} |

**Compliance Result:** {PASS ({N}/13 stages complete) or FAIL ({N}/13)}

### Manifest Completeness

| Field | Value | Status |
|-------|-------|--------|
| projectName | {value} | {PASS/FAIL} |
| productType | {value} | {PASS/FAIL} |
| outputRoot | {value} | {PASS/FAIL} |
| mode | {value} | {PASS/FAIL} |

## Tier 2: Design Quality (Awwwards Rubric)

{If QUICK mode: "Skipped (--quick mode)"}

### Per-Artifact Findings

{For each artifact in evaluator response:}

#### {artifact.stage} — {artifact.artifact}

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Design | {score} | 0.40 | {weighted} |
| Usability | {score} | 0.30 | {weighted} |
| Creativity | {score} | 0.20 | {weighted} |
| Content | {score} | 0.10 | {weighted} |
| **Overall** | | | **{overall_score}** |

**Findings:**
{List each finding from each dimension}

### AI Aesthetic Avoidance (PRES-06)

| Check | Result | Evidence |
|-------|--------|----------|
| Concept-specific interaction (VISUAL-HOOK) | {PASS/FAIL} | {evidence} |
| Non-generic color choice (OKLCH palette) | {PASS/FAIL} | {evidence} |
| Intentional asymmetry (axis break) | {PASS/FAIL} | {evidence} |
| Custom motion choreography (narrative entrance order) | {PASS/FAIL} | {evidence} |

**AI Aesthetic Result:** {PASS (all 4 checks pass) or FAIL ({N}/4 checks pass)}

**Quality Result:** {PASS (average score >= 6.5) or FAIL}

## Summary

| Tier | Result |
|------|--------|
| Process Compliance | {PASS/FAIL} |
| Design Quality | {PASS/FAIL or Skipped} |
| AI Aesthetic Avoidance | {PASS/FAIL or Skipped} |
| **Overall** | **{PASS only if all applicable tiers pass}** |
```

---

## Step 7/7: Summary

Display results table:

```
PDE > PRESSURE TEST — COMPLETE

| Tier                     | Result   |
|--------------------------|----------|
| Process Compliance       | {PASS/FAIL} |
| Design Quality           | {PASS/FAIL or Skipped} |
| AI Aesthetic Avoidance   | {PASS/FAIL or Skipped} |

Report: .planning/pressure-test-report.md
```

If any tier is FAIL, display: `Run with --verbose for detailed findings.`

</process>

<anti_patterns>
CRITICAL anti-patterns — NEVER do these:

1. NEVER use Task() for pde:build invocation. Always use Skill(). Issue #686 causes execution freezes with nested Task agents. Skill() is the only correct pattern for skill invocation.

2. NEVER use Skill() for the pde-pressure-test-evaluator agent. Always use Task(). Agents must be invoked via Task() — Skill() is for skills, Task() is for agents. These are different invocation patterns.

3. NEVER write to the design manifest directly. The manifest is owned by pde-tools. The pressure-test workflow is READ-ONLY with respect to the manifest after seeding.

4. NEVER assume `hasIterate` is present in the coverage JSON — it is added at runtime by /pde:iterate. Always apply ?? false semantics: if the field is absent, treat it as false.

5. NEVER look for a hasBrief coverage flag — no such flag exists. Brief stage (5) completion is determined ONLY by Glob on `.planning/design/strategy/BRF-brief-v*.md`.

6. NEVER run the compliance check before fixture seeding is complete. Step order is strictly: seed → (optional build) → compliance → quality → report.

7. NEVER pass Task() a pde:build instruction — only Skill() calls can invoke pipeline skills. Task() spawns reasoning agents; Skill() invokes workflow files.
</anti_patterns>
</output>
