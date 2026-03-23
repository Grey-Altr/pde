# Phase 99: Safety Boundaries - Research

**Researched:** 2026-03-23
**Domain:** Mutable/immutable zone annotation system for experiment-eligible workflow files
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None explicitly locked — auto-generated infrastructure phase. All implementation choices are at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SAFE-01 | `references/experiment-boundaries.md` defines locked zones (eval harness, core infrastructure, protected-files list) and optimizable zones (workflow prose, agent prompts, skill instructions) | Codebase scan identifies exact file categories; existing `protected-files.json` provides the locked-files baseline; ARCHITECTURE research defines the boundary taxonomy. |
| SAFE-02 | `<!-- LOCKED -->` / `<!-- OPTIMIZABLE -->` section-level markers added to experiment-eligible workflow files — experiment runner enforces these boundaries pre-commit | Pattern matches existing HTML comment annotation conventions in workflow files; "experiment-eligible" classification defined by codebase audit below. |
| SAFE-03 | Eval harness (Nyquist test files, Awwwards rubric references) is permanently immutable during experiments — added to protected-files list | Nyquist suite = `tests/` directory (78 `.test.mjs` files, 952 assertions). Awwwards rubric = `references/quality-standards.md`. Both identified in codebase scan. |
| SAFE-04 | Mutable file list in experiment.md frontmatter is validated against boundaries before experiment starts — rejects experiments targeting locked files | Validation logic pattern: read `references/experiment-boundaries.md` protected-files list, diff against experiment.md `mutable_files:` array, produce explicit rejection message if overlap found. |
</phase_requirements>

---

## Summary

Phase 99 is a pure annotation and documentation phase. No new binary code is written. The deliverables are: (1) a new canonical reference file at `references/experiment-boundaries.md` that defines what is permanently locked vs. optimizable; (2) `<!-- LOCKED -->` and `<!-- OPTIMIZABLE -->` section markers added to every experiment-eligible workflow file; and (3) a validation function (in `experiment.cjs`, Phase 100) will read this reference to enforce the boundary at runtime. Phase 99 must produce everything that Phase 100's boundary checker needs to consume.

The boundary taxonomy is grounded in prior v0.13 research: `ARCHITECTURE.md` defines three classes of content (immutable always, mutable by experiment, never mutable without human review) and `PITFALLS.md` explains why each class exists. The existing `protected-files.json` already protects core infrastructure at the prompt-enforcement layer; `references/experiment-boundaries.md` extends this to a machine-readable document that the experiment runner reads at startup.

The "experiment-eligible" workflow files are the 14 design pipeline skill workflows (brief, system, flows, ideate, wireframe, critique, hig, iterate, recommend, mockup, competitive, opportunity, handoff, deploy) and their close skill variants. Infrastructure workflows (execute-phase, plan-phase, autonomous, new-milestone, etc.) are excluded — they orchestrate the PDE engine itself and are not safe optimization targets. Agents and references are fully locked.

**Primary recommendation:** Write `references/experiment-boundaries.md` first (SAFE-01), then annotate experiment-eligible workflows with `<!-- LOCKED -->` / `<!-- OPTIMIZABLE -->` markers (SAFE-02), then verify the Nyquist test suite and Awwwards rubric are in the protected-files list (SAFE-03), and finally add the frontmatter validation function stub that Phase 100 will wire (SAFE-04).

---

## Standard Stack

No new libraries or tooling required. This phase is purely file authoring.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Markdown with YAML frontmatter | Existing convention | `references/experiment-boundaries.md` document format | All PDE reference files follow this pattern; `bin/lib/frontmatter.cjs` can parse them |
| HTML comments (`<!-- -->`) | HTML spec | `<!-- LOCKED -->` / `<!-- OPTIMIZABLE -->` inline markers | Already used throughout workflows for structural annotations (e.g., `<!-- BLOCKED -->` references in plan-phase.md) |
| `protected-files.json` | Existing file | Machine-readable protected file registry | Existing prompt-enforcement mechanism Phase 99 extends |

### No Alternatives Needed
This phase produces static files. The only decision is marker syntax and document structure — both constrained by existing project conventions.

---

## Architecture Patterns

### Recommended Project Structure (Phase 99 Additions)

```
references/
└── experiment-boundaries.md    (NEW — canonical boundary reference)

workflows/
├── critique.md                 (ANNOTATED — add LOCKED/OPTIMIZABLE sections)
├── system.md                   (ANNOTATED)
├── flows.md                    (ANNOTATED)
├── wireframe.md                (ANNOTATED)
├── hig.md                      (ANNOTATED)
├── iterate.md                  (ANNOTATED)
├── ideate.md                   (ANNOTATED)
├── recommend.md                (ANNOTATED)
├── mockup.md                   (ANNOTATED)
├── competitive.md              (ANNOTATED)
├── opportunity.md              (ANNOTATED)
├── brief.md                    (ANNOTATED)
├── handoff.md                  (ANNOTATED)
├── deploy.md                   (ANNOTATED)
└── [all other experiment-eligible workflows]
```

### Pattern 1: experiment-boundaries.md Document Structure

The reference document consumed by the experiment runner. Must be machine-parseable (YAML frontmatter lists) and human-readable (prose sections). The experiment runner reads the `protected_files` and `protected_directories` YAML lists at startup to perform the SAFE-04 frontmatter validation.

```markdown
---
protected_files:
  - tests/
  - references/quality-standards.md
  - references/experiment-boundaries.md
  - bin/
  - agents/
  - protected-files.json
  - .planning/STATE.md
  - .planning/ROADMAP.md
  ...
protected_directories:
  - tests/
  - bin/
  - agents/
  - references/
  - .planning/
---

## Locked Zones
### Eval Harness
...
### Core Infrastructure
...
### Protected Files List
...

## Optimizable Zones
### Workflow Prose
...
### Agent Prompts
...
### Skill Instructions
...
```

**Source:** ARCHITECTURE.md Pattern 3; PITFALLS.md Pitfall 3 (confidence: HIGH).

### Pattern 2: Section-Level LOCKED / OPTIMIZABLE Markers in Workflow Files

Each experiment-eligible workflow file gets at minimum one `<!-- LOCKED -->` section and one `<!-- OPTIMIZABLE -->` section. The markers delimit regions at the section level (wrapping a full named section, not individual lines) using paired open/close comments.

```markdown
<!-- LOCKED -->
## Step 1: Initialize

[Infrastructure step with tool calls, git operations, state reads — must not be mutated]

<!-- /LOCKED -->

<!-- OPTIMIZABLE -->
## Step 3: Generate Critique

[Prose prompt describing how to evaluate design — can be improved by experiment runner]

<!-- /OPTIMIZABLE -->
```

**What is LOCKED within a workflow file:**
- Step 1 (init) — always calls `pde-tools.cjs`, parses JSON, validates prerequisites
- Artifact schema writes — `designCoverage` field names, artifact code values, file path patterns
- Error message formats — human-visible halt messages that tests assert against
- MCP probe patterns — standardized bridge.call() blocks
- Required reading blocks (`@references/...` includes)
- Frontmatter / `<purpose>` / `<flags>` sections

**What is OPTIMIZABLE within a workflow file:**
- Prose action descriptions within a step (what to write, how to structure output)
- Example output sections (quality examples used as agent guidance)
- Heuristic ordering within a step (which perspectives to evaluate first)
- Prompt phrasing for agent instructions
- Scoring rubric text (weighting descriptions, not the structural field names)
- `<required_reading>` order within reason (references themselves are locked)

**Source:** PITFALLS.md Pitfall 3 ("Immutable at all times" vs "Mutable by experiment" vs "Never mutable by experiment" taxonomy). Confidence: HIGH.

### Anti-Patterns to Avoid

- **Marking entire workflows as LOCKED:** Defeats the purpose. Every experiment-eligible file needs at least one OPTIMIZABLE section.
- **Marking an artifact schema field as OPTIMIZABLE:** Any line that writes a `designCoverage` field, artifact code, or file path is a pipeline contract — changing it breaks downstream skills.
- **Using OPTIMIZABLE on error message strings asserted by tests:** Nyquist tests grep for exact strings in workflow files. If a LOCKED test asserts `content.includes('Error: Critique requires product context')`, that string is locked even if it appears in what looks like prose.
- **Glob patterns in protected_files in experiment-boundaries.md:** The ARCHITECTURE research is explicit that mutable lists must be explicit, not globs, to prevent accidental inclusions. The boundaries reference should follow the same rule: list explicit paths.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Protected file lookup | Custom JSON format | Extend `protected-files.json` pattern + add `references/experiment-boundaries.md` | `protected-files.json` already parsed by agents; consistent enforcement |
| Marker parsing | Custom regex scanner | HTML comment convention (`<!-- LOCKED -->`) | Plain string search is trivial; existing test patterns use `content.includes(...)` |
| Boundary validation (SAFE-04) | Full validator agent | CJS function in Phase 100's `experiment.cjs` that reads frontmatter list | Keeps Phase 99 as static docs; Phase 100 wires the enforcement |

**Key insight:** Phase 99 produces documents. The enforcement code that reads those documents belongs in Phase 100 (`experiment.cjs`). Do not conflate the two.

---

## Common Pitfalls

### Pitfall 1: Annotating Infrastructure Workflows as Experiment-Eligible

**What goes wrong:** Adding OPTIMIZABLE markers to `execute-phase.md`, `plan-phase.md`, `autonomous.md`, or `new-milestone.md` opens those files to mutation by the experiment runner. These workflows orchestrate PDE itself — a change that "improves" a local metric can break the entire planning pipeline.

**Why it happens:** 76 workflow files exist and it is tempting to mark all of them. But many are orchestration infrastructure, not skill prose.

**How to avoid:** Only annotate the 14-16 design pipeline skill workflows (see "Experiment-Eligible Workflow Files" section below). Explicitly note in `experiment-boundaries.md` that infrastructure workflows are locked even though they live in `workflows/`.

**Warning signs:** An experiment run targets `execute-phase.md` or `plan-phase.md` — SAFE-04 should reject this.

### Pitfall 2: Locking Test-Asserted Strings in OPTIMIZABLE Sections

**What goes wrong:** A workflow section appears to be pure prose guidance (safe to change) but contains exact strings that Nyquist tests assert via `content.includes(...)`. Marking it OPTIMIZABLE allows mutation of a string that will fail a test.

**Why it happens:** The tests are in `tests/` — they're not visible when reading the workflow file itself. The relationship between workflow content and test assertions is non-obvious.

**How to avoid:** Before marking any section OPTIMIZABLE, search `tests/` for the workflow filename. Any `content.includes(...)` assertion in the test files defines a string that must remain in the LOCKED zone. Specifically: the critique skill is tested extensively — `references/quality-standards.md` is asserted in `required_reading`, all Awwwards dimension weights are asserted, `score impact` language is asserted.

**Warning signs:** After annotation, run `node --test tests/**/*.test.mjs` — if any test fails that was previously passing, a string that should be LOCKED was accidentally marked OPTIMIZABLE.

### Pitfall 3: experiment-boundaries.md Protected-Files List Out of Sync with protected-files.json

**What goes wrong:** Two separate files claim to define what is protected. An agent consults one but not the other. A file protected in `protected-files.json` but not listed in `experiment-boundaries.md` will pass SAFE-04 validation but still be flagged by the prompt-enforcement layer — inconsistent behavior.

**Why it happens:** `protected-files.json` exists for the prompt-enforcement layer (all fleet agents). `references/experiment-boundaries.md` exists for the experiment runner specifically. They have overlapping but distinct concerns.

**How to avoid:** `references/experiment-boundaries.md` must include ALL files from `protected-files.json` plus the eval harness additions (tests/, quality-standards.md). The experiment runner checks `experiment-boundaries.md`; fleet agents check `protected-files.json`. Both protections apply independently.

**Warning signs:** A file appears in `protected-files.json` but not in the `protected_files` YAML array of `experiment-boundaries.md`.

### Pitfall 4: No LOCKED Section in a Workflow = Silently Fully Optimizable

**What goes wrong:** A workflow file with no LOCKED markers is treated as fully optimizable by the experiment runner, which then modifies infrastructure-critical sections (init steps, schema writes) that were never intended to be mutable.

**Why it happens:** The default assumption in an absence-of-annotation system is "unlocked = mutable."

**How to avoid:** The experiment runner should treat unannotated files as LOCKED by default, not OPTIMIZABLE. State this policy explicitly in `experiment-boundaries.md`. An unannotated experiment-eligible file should produce a validation warning, not silent acceptance. The SAFE-02 requirement — "every experiment-eligible file contains at least one LOCKED and at least one OPTIMIZABLE section" — prevents this by requiring both markers in every eligible file.

---

## Experiment-Eligible Workflow Files

These 14 design skill workflows are the primary experiment optimization targets. Each must receive LOCKED/OPTIMIZABLE annotation (SAFE-02).

| Workflow | Optimizable Content | LOCKED Content |
|----------|--------------------|-----------------------|
| `workflows/brief.md` | Brief generation prompts, question phrasing, output structure guidance | Init step, artifact code `BRF`, `hasBrief` write, file path pattern, MCP probe |
| `workflows/system.md` | Token generation guidance, category ordering, design prose | Init step, artifact code `SYS`, `hasDesignSystem` write, token JSON schema field names |
| `workflows/flows.md` | Flow diagram guidance, persona labeling, journey narration | Init step, artifact code `FLW`, `hasFlows` write, DESIGN-STATE fields |
| `workflows/ideate.md` | Ideation prompts, concept framing, output format | Init step, artifact code, `hasIdeation` write |
| `workflows/wireframe.md` | Wireframe guidance, layout prompts, annotation style | Init step, `hasWireframes` write, Stitch integration contract, token path assertion (`design/visual/SYS-experience-tokens.json`) |
| `workflows/critique.md` | Critique perspective ordering, rubric description text | Init step, artifact code `CRT`, `hasCritique` write, Awwwards dimension weights and names (`Design 40`, `Usability 30`, `Creativity 20`, `Content 10`), `quality-standards.md` required_reading, `score impact` phrasing |
| `workflows/hig.md` | HIG evaluation prose, platform guidance | Init step, `hasHIG` write, required_reading block |
| `workflows/iterate.md` | Iteration guidance, action list processing | Init step, `hasIteration` write |
| `workflows/recommend.md` | Recommendation framing, context analysis | Init step, `hasRecommendation` write |
| `workflows/mockup.md` | Mockup guidance, layer prompts | Init step, artifact code `MCK`, `hasMockup` write, Stitch integration contract |
| `workflows/competitive.md` | Competitive analysis guidance, comparison framing | Init step, artifact code, `hasCompetitive` write |
| `workflows/opportunity.md` | Opportunity framing, analysis structure | Init step, artifact code, `hasOpportunity` write |
| `workflows/handoff.md` | Handoff narrative, developer guidance prose | Init step, `hasHandoff` write, `hasProductionBible` write, artifact file paths |
| `workflows/deploy.md` | Deploy guidance, checklist framing | Init step, deploy verification steps |

**NOT experiment-eligible (infrastructure workflows — must be listed as locked in experiment-boundaries.md even though they live in `workflows/`):**

`execute-phase.md`, `execute-plan.md`, `plan-phase.md`, `research-phase.md`, `autonomous.md`, `new-milestone.md`, `new-project.md`, `complete-milestone.md`, `audit-milestone.md`, `verify-phase.md`, `validate-phase.md`, `check-readiness.md`, `reconcile-phase.md`, `improve.md`, `health.md`, `settings.md`, `monitor.md`, `transition.md`, `pause-work.md`, `resume-project.md`, `progress.md`, `stats.md`, `pipeline-status.md`, `add-phase.md`, `insert-phase.md`, `remove-phase.md`, `add-tests.md`, `add-todo.md`, `check-todos.md`, `list-phase-assumptions.md`, `plan-milestone-gaps.md`, `node-repair.md`, `cleanup.md`, `discovery-phase.md`, `discuss-phase.md`, `audit.md`, `map-codebase.md`, `help.md`, `quick.md`, `update.md`

**Boundary case workflows (annotate conservatively — lean toward LOCKED):**
`build.md`, `connect.md`, `sync-figma.md`, `sync-github.md`, `sync-linear.md`, `sync-jira.md`, `sync-pencil.md`, `mcp-status.md`, `ui-phase.md`, `ui-review.md`, `pressure-test.md`, `wireframe-figma-context.md`, `mockup-export-figma.md`, `handoff-create-prs.md`, `handoff-create-linear-issues.md`, `handoff-create-jira-tickets.md`, `handoff-figma-codeConnect.md`, `critique-pencil-screenshot.md`, `brief-from-github.md`, `diagnose-issues.md`

---

## Code Examples

### SAFE-04: Validation Function Shape (to be implemented in Phase 100)

The Phase 99 planner should note this is the consumer of `references/experiment-boundaries.md`. The reference document must be structured so this validation works:

```javascript
// Source: ARCHITECTURE.md Pattern 3 + REQUIREMENTS.md SAFE-04
// Implemented in Phase 100 experiment.cjs — referenced here to confirm format

function validateMutableFiles(experimentMd, boundariesPath) {
  const boundaries = parseFrontmatter(boundariesPath);
  const protectedPaths = new Set([
    ...boundaries.protected_files,
    ...boundaries.protected_directories,
  ]);

  const experiment = parseFrontmatter(experimentMd);
  const mutableFiles = experiment.mutable_files || [];

  const violations = mutableFiles.filter(f =>
    protectedPaths.has(f) ||
    [...boundaries.protected_directories].some(dir => f.startsWith(dir))
  );

  if (violations.length > 0) {
    // SAFE-04: produce explicit rejection message (not silent)
    return {
      valid: false,
      message: `Experiment rejected: mutable_files list targets locked path(s):\n${violations.map(v => `  - ${v}`).join('\n')}\n\nSee references/experiment-boundaries.md for the full locked zones list.`,
    };
  }
  return { valid: true };
}
```

### LOCKED/OPTIMIZABLE Marker Pattern in Workflow Files

```markdown
<!-- LOCKED: init step — infrastructure, do not modify -->
## Step 1/N: Initialize

```bash
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```
<!-- /LOCKED -->

<!-- OPTIMIZABLE: critique-generation step — prose, prompts, and output structure -->
## Step 5/N: Write Critique Report

For each perspective (UX, Visual Hierarchy, Accessibility, Business Alignment), evaluate...

<!-- /OPTIMIZABLE -->
```

### experiment-boundaries.md YAML Frontmatter Structure

```yaml
---
# experiment-boundaries.md — machine-readable boundary spec
# Read by experiment.cjs at startup for SAFE-04 validation
version: "1.0"
protected_files:
  - references/quality-standards.md        # Awwwards rubric — eval harness
  - references/experiment-boundaries.md    # this file — self-protecting
  - protected-files.json                   # prompt-enforcement layer
  - bin/pde-tools.cjs
  - bin/lib/core.cjs
  - bin/lib/init.cjs
  - bin/lib/state.cjs
  - bin/lib/phase.cjs
  - bin/lib/roadmap.cjs
  - bin/lib/model-profiles.cjs
  - .planning/STATE.md
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - skill-registry.md
  - CLAUDE.md
  - .claude/settings.json
protected_directories:
  - tests/                   # Nyquist eval harness — all test files
  - bin/                     # Core tooling
  - .claude/                 # Claude Code settings
  - agents/                  # Agent definitions (circular risk)
  - .planning/               # Planning state (experiment runner writes only to .planning/experiments/)
infrastructure_workflows:
  # Locked even though in workflows/ — do NOT add OPTIMIZABLE markers
  - workflows/execute-phase.md
  - workflows/execute-plan.md
  - workflows/plan-phase.md
  - workflows/research-phase.md
  - workflows/autonomous.md
  - workflows/new-milestone.md
  - workflows/new-project.md
  - workflows/complete-milestone.md
  - workflows/improve.md
  # ... (full list in document body)
---
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `protected-files.json` prompt-only enforcement | `protected-files.json` (prompt) + `experiment-boundaries.md` (machine-validated pre-commit) | Phase 99 (v0.13) | Two complementary layers — prompt prevents agent writes, boundary check prevents experiment commits |
| No inline workflow annotations | `<!-- LOCKED -->` / `<!-- OPTIMIZABLE -->` section markers | Phase 99 (v0.13) | Experiment runner has zone-level visibility; avoids whole-file locking |
| Immutable boundaries as comment in ARCHITECTURE research | Canonical `references/experiment-boundaries.md` document | Phase 99 (v0.13) | Single source of truth consumed by tooling, not buried in planning research |

**Existing protected_files.json (current state to preserve and extend):**
```
protected: bin/pde-tools.cjs, bin/lib/model-profiles.cjs, bin/lib/core.cjs,
           bin/lib/init.cjs, bin/lib/state.cjs, bin/lib/phase.cjs,
           bin/lib/roadmap.cjs, references/quality-standards.md,
           references/skill-style-guide.md, references/tooling-patterns.md,
           references/model-profiles.md, workflows/improve.md,
           protected-files.json, CLAUDE.md, .claude/settings.json,
           skill-registry.md
protected_directories: bin/, .claude/
```

The `experiment-boundaries.md` protected list must be a superset: add `tests/`, `agents/`, `.planning/` (experiment state writes only to `.planning/experiments/`), and `references/experiment-boundaries.md` itself.

---

## Open Questions

1. **Boundary case workflows: annotate or not?**
   - What we know: `build.md`, `deploy.md`, `connect.md`, `sync-*.md` are not pure skill prose — they integrate with external tools. Some have operator-level logic that should not be mutated.
   - What's unclear: Whether any of these are realistic experiment optimization targets in v0.13.
   - Recommendation: Annotate `deploy.md` (it has prose guidance that could improve). Mark sync/connect workflows as infrastructure — add them to `infrastructure_workflows` in experiment-boundaries.md. Can be revisited when Phase 104 defines specific optimization presets.

2. **Should `references/experiment-boundaries.md` itself be in `protected-files.json`?**
   - What we know: `experiment-boundaries.md` defines the boundaries. If it can be modified by an agent, an agent could remove its own files from the protected list.
   - What's unclear: Whether the existing prompt-enforcement fleet (auditor, improver, validator, skill-builder) should also be blocked from modifying it.
   - Recommendation: YES — add `references/experiment-boundaries.md` to `protected-files.json` in Phase 99 as part of SAFE-03. The file should self-protect at both layers.

3. **How should the `<!-- LOCKED -->` and `<!-- OPTIMIZABLE -->` markers interact with workflow file length?**
   - What we know: Critique.md is ~500 lines; a file may have 8-12 steps with varying lock/optimize status.
   - What's unclear: Whether nested or interleaved markers are acceptable (step 1 = LOCKED, step 2 = OPTIMIZABLE, step 3 = LOCKED, etc.).
   - Recommendation: Interleaved is fine — the markers are section-level, not file-level. The experiment runner needs to be able to parse and respect interleaved zones. Document this explicitly in experiment-boundaries.md.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (Node.js 18+) |
| Config file | None — run directly with `node --test` |
| Quick run command | `node --test tests/phase-99/*.test.mjs` |
| Full suite command | `node --test tests/**/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAFE-01 | `references/experiment-boundaries.md` exists with YAML frontmatter containing `protected_files` and `protected_directories` arrays | unit | `node --test tests/phase-99/experiment-boundaries.test.mjs` | Wave 0 |
| SAFE-01 | Locked zones section exists with eval harness, core infrastructure, protected-files subsections | unit | `node --test tests/phase-99/experiment-boundaries.test.mjs` | Wave 0 |
| SAFE-01 | Optimizable zones section exists with workflow prose, agent prompts, skill instructions subsections | unit | `node --test tests/phase-99/experiment-boundaries.test.mjs` | Wave 0 |
| SAFE-02 | Every experiment-eligible workflow file contains at least one `<!-- LOCKED -->` marker | unit | `node --test tests/phase-99/workflow-markers.test.mjs` | Wave 0 |
| SAFE-02 | Every experiment-eligible workflow file contains at least one `<!-- OPTIMIZABLE -->` marker | unit | `node --test tests/phase-99/workflow-markers.test.mjs` | Wave 0 |
| SAFE-03 | `tests/` directory listed in `protected_directories` in experiment-boundaries.md | unit | `node --test tests/phase-99/experiment-boundaries.test.mjs` | Wave 0 |
| SAFE-03 | `references/quality-standards.md` listed in `protected_files` in experiment-boundaries.md | unit | `node --test tests/phase-99/experiment-boundaries.test.mjs` | Wave 0 |
| SAFE-04 | A mutable_files list targeting a locked file produces rejection with explicit message | unit | `node --test tests/phase-99/boundary-validation.test.mjs` | Wave 0 |
| SAFE-04 | Valid mutable_files list (non-locked files only) passes validation | unit | `node --test tests/phase-99/boundary-validation.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-99/*.test.mjs`
- **Per wave merge:** `node --test tests/**/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-99/experiment-boundaries.test.mjs` — covers SAFE-01, SAFE-03
- [ ] `tests/phase-99/workflow-markers.test.mjs` — covers SAFE-02; enumerates experiment-eligible workflow file list
- [ ] `tests/phase-99/boundary-validation.test.mjs` — covers SAFE-04; tests the validation function in experiment-boundaries.md frontmatter format

**SAFE-04 test note:** The validation function itself ships in Phase 100 (`experiment.cjs`). The Phase 99 test for SAFE-04 should verify the `references/experiment-boundaries.md` document structure is correct for the validator to consume — i.e., the YAML frontmatter can be parsed and the protected lists are populated. The end-to-end rejection behavior test can be a Phase 100 test against the actual function.

---

## Sources

### Primary (HIGH confidence)
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/research/ARCHITECTURE.md` — Pattern 3: Mutable/Immutable File Boundary Enforcement; full boundary taxonomy
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/research/PITFALLS.md` — Pitfall 3: defines "Immutable at all times", "Mutable by experiment", "Never mutable by experiment" zones
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/research/STACK.md` — experiment.md YAML frontmatter format; `immutable_files` list pattern
- `/Users/greyaltaer/code/projects/Platform Development Engine/protected-files.json` — current prompt-enforcement protected file registry (Phase 99 must be a superset)
- `/Users/greyaltaer/code/projects/Platform Development Engine/tests/` — 78 `.test.mjs` files, 952 assertions — the Nyquist eval harness to protect
- `/Users/greyaltaer/code/projects/Platform Development Engine/references/quality-standards.md` — Awwwards rubric reference (confirmed as eval harness)
- `.planning/REQUIREMENTS.md` — SAFE-01 through SAFE-04 precise specifications
- `.planning/phases/99-safety-boundaries/99-CONTEXT.md` — phase scope

### Secondary (MEDIUM confidence)
- Direct codebase scan: 76 workflow files categorized into skill vs. infrastructure based on content inspection
- Nyquist test suite output: `node --test tests/**/*.test.mjs` — 952 assertions, 944 passing, confirms eval harness scale

### Tertiary (LOW confidence)
- None. All findings grounded in direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new tech; pure existing file formats
- Architecture: HIGH — ARCHITECTURE.md and PITFALLS.md from prior v0.13 research are definitive; codebase scan confirms file inventory
- Pitfalls: HIGH — grounded in PITFALLS.md research and direct Nyquist test inspection
- Experiment-eligible file list: MEDIUM — classification of 14 skill workflows is clear; 20 boundary-case workflows require judgment

**Research date:** 2026-03-23
**Valid until:** 2026-04-22 (stable domain — file annotation, no external dependencies)
