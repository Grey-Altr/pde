---
# experiment-boundaries.md — machine-readable boundary spec
# Read by experiment.cjs at startup for SAFE-04 validation
version: "1.0"
protected_files:
  - references/quality-standards.md        # Awwwards rubric — eval harness
  - references/skill-style-guide.md        # skill authoring guide
  - references/tooling-patterns.md         # tooling conventions
  - references/model-profiles.md           # model profile definitions
  - references/experiment-boundaries.md    # this file — self-protecting
  - protected-files.json                   # prompt-enforcement layer
  - bin/pde-tools.cjs                      # core CLI entry point
  - bin/lib/core.cjs                       # core library module
  - bin/lib/init.cjs                       # init library module
  - bin/lib/state.cjs                      # state library module
  - bin/lib/phase.cjs                      # phase library module
  - bin/lib/roadmap.cjs                    # roadmap library module
  - bin/lib/model-profiles.cjs             # model-profiles library module
  - .planning/STATE.md                     # project execution state
  - .planning/ROADMAP.md                   # phase/milestone roadmap
  - .planning/REQUIREMENTS.md             # requirements registry
  - CLAUDE.md                              # project instructions
  - .claude/settings.json                  # Claude Code settings
  - skill-registry.md                      # skill command registry
  - workflows/improve.md                   # self-improvement workflow (infrastructure)

protected_directories:
  - tests/        # Nyquist eval harness — all test files are permanently immutable
  - bin/          # Core tooling — pde-tools.cjs and all library modules
  - .claude/      # Claude Code settings and hooks
  - agents/       # Agent definitions — circular risk if experiment modifies its own agent
  - .planning/    # Planning state — experiment runner writes ONLY to .planning/experiments/
  - references/   # All reference files — canonical knowledge base

infrastructure_workflows:
  # Locked even though they live in workflows/ — do NOT add OPTIMIZABLE markers
  # These workflows orchestrate PDE itself — mutation risks breaking the planning pipeline
  - workflows/execute-phase.md
  - workflows/execute-plan.md
  - workflows/plan-phase.md
  - workflows/research-phase.md
  - workflows/autonomous.md
  - workflows/new-milestone.md
  - workflows/new-project.md
  - workflows/complete-milestone.md
  - workflows/audit-milestone.md
  - workflows/verify-phase.md
  - workflows/validate-phase.md
  - workflows/check-readiness.md
  - workflows/reconcile-phase.md
  - workflows/improve.md
  - workflows/health.md
  - workflows/settings.md
  - workflows/monitor.md
  - workflows/transition.md
  - workflows/pause-work.md
  - workflows/resume-project.md
  - workflows/progress.md
  - workflows/stats.md
  - workflows/pipeline-status.md
  - workflows/add-phase.md
  - workflows/insert-phase.md
  - workflows/remove-phase.md
  - workflows/add-tests.md
  - workflows/add-todo.md
  - workflows/check-todos.md
  - workflows/list-phase-assumptions.md
  - workflows/plan-milestone-gaps.md
  - workflows/node-repair.md
  - workflows/cleanup.md
  - workflows/discovery-phase.md
  - workflows/discuss-phase.md
  - workflows/audit.md
  - workflows/map-codebase.md
  - workflows/help.md
  - workflows/quick.md
  - workflows/update.md
  - workflows/verify-work.md
  - workflows/analyst-interview.md
  - workflows/build.md
  - workflows/connect.md
  - workflows/sync-figma.md
  - workflows/sync-github.md
  - workflows/sync-linear.md
  - workflows/sync-jira.md
  - workflows/sync-pencil.md
  - workflows/mcp-status.md
  - workflows/ui-phase.md
  - workflows/ui-review.md
  - workflows/pressure-test.md
  - workflows/wireframe-figma-context.md
  - workflows/mockup-export-figma.md
  - workflows/handoff-create-prs.md
  - workflows/handoff-create-linear-issues.md
  - workflows/handoff-create-jira-tickets.md
  - workflows/handoff-figma-codeConnect.md
  - workflows/critique-pencil-screenshot.md
  - workflows/brief-from-github.md
  - workflows/diagnose-issues.md
---

## Experiment Boundary Reference

This document defines what is permanently immutable versus what can be modified during autonomous experiments. It is read by `experiment.cjs` at startup for SAFE-04 validation — before any experiment run begins, the runner checks the `mutable_files` list in the experiment's frontmatter against the `protected_files` and `protected_directories` arrays defined here.

Two protection layers apply independently:
- **`protected-files.json`** — prompt-enforcement layer for all fleet agents (auditor, improver, validator, skill-builder)
- **`references/experiment-boundaries.md`** (this file) — experiment-enforcement layer consumed by the experiment runner

An experiment targeting a locked file is rejected with an explicit message listing the violating paths. The experiment never starts.

## Default Policy

**Unannotated files are treated as LOCKED by default, not OPTIMIZABLE.** An experiment-eligible file missing both `<!-- LOCKED -->` and `<!-- OPTIMIZABLE -->` markers produces a validation warning during experiment setup. The absence of markers is not permission to mutate — it is an annotation gap that must be resolved before the file can be included in an experiment.

This default-locked policy prevents silent full-optimization of files that were never explicitly approved for mutation.

## Locked Zones

### Eval Harness

The evaluation harness that measures experiment quality is permanently immutable. If the eval harness changes, metrics become meaningless — you cannot measure improvement against a moving target.

- All files in the `tests/` directory (Nyquist suite — 78 `.test.mjs` files, 952+ assertions across all pipeline skills)
- `references/quality-standards.md` (Awwwards rubric — the 4-dimension scoring standard used by critique, hig, and pressure-test workflows)
- This file (`references/experiment-boundaries.md`) — self-protecting so no agent or experiment can modify the boundary definition

### Core Infrastructure

PDE's runtime infrastructure must not be modified by experiments. These files handle initialization, state reads, error handling, and tool dispatch — a change here can silently corrupt every subsequent operation.

- All files in `bin/` — `pde-tools.cjs` and library modules (`core.cjs`, `init.cjs`, `state.cjs`, `phase.cjs`, `roadmap.cjs`, `model-profiles.cjs`)
- All files in `agents/` — agent definitions carry circular risk: an experiment modifying its own agent prompt could disable the boundary-checking behavior that prevents unsafe experiments
- All files in `.claude/` — Claude Code settings and hook configurations
- All files in `.planning/` except `.planning/experiments/` — state files (`STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`) must remain stable across experiment runs; experiment outputs write only to `.planning/experiments/`
- `protected-files.json` — the prompt-enforcement layer; modification would compromise fleet agent protection
- `CLAUDE.md` — project-level instructions for all agents
- `skill-registry.md` — canonical command registry; changes here affect all slash command routing

### Infrastructure Workflows

The `infrastructure_workflows` list in this file's YAML frontmatter enumerates workflow files that live in `workflows/` but are permanently locked to experiments. These workflows orchestrate PDE itself — they handle phase execution, plan orchestration, milestone transitions, and agent coordination. Mutation risks breaking the entire planning pipeline.

**The `infrastructure_workflows` list is exhaustive.** Any workflow file not in this list AND not in the `protected_directories` list is a candidate for experiment annotation (though it must also be explicitly listed in the Experiment-Eligible Workflow Files section below before it can be targeted).

### Protected Files List

`protected-files.json` is the prompt-enforcement layer. All fleet agents (auditor, improver, validator, skill-builder) must check this file before every write operation. `references/experiment-boundaries.md` is the experiment-enforcement layer consumed by the experiment runner. Both protections apply independently — a file can be blocked by one layer, the other, or both.

The `protected_files` YAML array above is a superset of `protected-files.json`: it includes all entries from `protected-files.json` plus the experiment-specific additions (eval harness files, this file itself, state files, and directory-level entries for agents/ and references/).

## Optimizable Zones

### Workflow Prose

The 14 design skill workflows contain sections annotated with `<!-- OPTIMIZABLE -->` markers. Only content within these markers is eligible for mutation by the experiment runner.

Experiments target these files because they contain prose that guides agent behavior — better prose produces better design output, which is measurable against the Awwwards rubric. The optimization hypothesis is that current workflow prose can be improved without touching the underlying tool calls, schema contracts, or error message formats.

**Annotated with `<!-- LOCKED -->` and `<!-- OPTIMIZABLE -->` markers:**

- `workflows/brief.md` — brief generation prompts, question phrasing, output structure guidance
- `workflows/system.md` — token generation guidance, category ordering, design prose
- `workflows/flows.md` — flow diagram guidance, persona labeling, journey narration
- `workflows/ideate.md` — ideation prompts, concept framing, output format
- `workflows/wireframe.md` — wireframe guidance, layout prompts, annotation style
- `workflows/critique.md` — critique perspective ordering, rubric description text
- `workflows/hig.md` — HIG evaluation prose, platform guidance
- `workflows/iterate.md` — iteration guidance, action list processing
- `workflows/recommend.md` — recommendation framing, context analysis
- `workflows/mockup.md` — mockup guidance, layer prompts
- `workflows/competitive.md` — competitive analysis guidance, comparison framing
- `workflows/opportunity.md` — opportunity framing, analysis structure
- `workflows/handoff.md` — handoff narrative, developer guidance prose
- `workflows/deploy.md` — deploy guidance, checklist framing

### What Is Optimizable Within a Workflow

The following content types within an `<!-- OPTIMIZABLE -->` block are eligible for mutation:

- Prose action descriptions within a step (how to structure or narrate output)
- Example output sections (quality examples used as agent guidance)
- Heuristic ordering within a step (which perspectives to evaluate first)
- Prompt phrasing for agent instructions
- Scoring rubric description text (weighting descriptions, not field names)
- `<required_reading>` order within reason (references themselves are locked)

### What Is LOCKED Within a Workflow (Even in Experiment-Eligible Files)

The following content is locked even when it appears inside an otherwise optimizable workflow file. These sections must be wrapped with `<!-- LOCKED -->` markers:

- **Step 1 (init)** — `pde-tools.cjs` calls, JSON parsing, prerequisite validation; this step bootstraps the tool and must remain stable
- **Artifact schema writes** — `designCoverage` field names, artifact code values (e.g., `BRF`, `CRT`, `SYS`), file path patterns; these are pipeline contracts that downstream skills depend on
- **Error message formats** — exact strings asserted by Nyquist tests via `content.includes(...)`; if you change these, tests will fail silently until the next suite run
- **MCP probe patterns** — standardized `bridge.call()` blocks; these are integration contracts with external tools
- **Required reading blocks** — `@references/` includes that pull in locked reference files
- **Frontmatter, purpose, and flags sections** — workflow metadata

## Marker Syntax

Paired open/close HTML comment markers delimit zones at the section level. Both open and close markers are required.

```
<!-- LOCKED -->
## Section that must not be modified

Content here...

<!-- /LOCKED -->

<!-- OPTIMIZABLE -->
## Section eligible for experiment mutation

Prose guidance here...

<!-- /OPTIMIZABLE -->
```

**Interleaved markers are valid.** A workflow file can alternate between LOCKED and OPTIMIZABLE sections:

```
<!-- LOCKED: init step — infrastructure, do not modify -->
## Step 1: Initialize
...
<!-- /LOCKED -->

<!-- OPTIMIZABLE: generation step — prose and prompts -->
## Step 2: Generate Output
...
<!-- /OPTIMIZABLE -->

<!-- LOCKED: schema write — pipeline contract -->
## Step 3: Write Artifact
...
<!-- /LOCKED -->
```

Each marker can optionally include a description after a colon: `<!-- LOCKED: init step — infrastructure -->`. Descriptions are for human readers; the experiment runner matches on the marker keyword only (`LOCKED` or `OPTIMIZABLE`).

**Coverage requirement:** Every experiment-eligible workflow file must contain at least one `<!-- LOCKED -->` marker AND at least one `<!-- OPTIMIZABLE -->` marker. A file with only one type produces a validation warning.

## Experiment-Eligible Workflow Files

Exactly 14 design skill workflows are eligible for experiment annotation and targeting:

- workflows/brief.md
- workflows/system.md
- workflows/flows.md
- workflows/ideate.md
- workflows/wireframe.md
- workflows/critique.md
- workflows/hig.md
- workflows/iterate.md
- workflows/recommend.md
- workflows/mockup.md
- workflows/competitive.md
- workflows/opportunity.md
- workflows/handoff.md
- workflows/deploy.md

All other workflow files are either in `infrastructure_workflows` (locked even though in `workflows/`) or are boundary-case integration workflows (sync, connect, ui-phase, etc.) that are treated as locked in v0.13. The eligible list can be extended in future milestones after explicit annotation and safety review.

## Validation Rules

The experiment runner (`experiment.cjs`) enforces these rules at startup before any experiment begins:

1. **Explicit path check:** Every path in an experiment's `mutable_files` list is checked against the `protected_files` array in this document's frontmatter. Any match produces an explicit rejection message listing the violating paths.

2. **Directory prefix check:** Every path in `mutable_files` is checked against `protected_directories` by prefix. A file starting with `tests/` matches the `tests/` entry. A file at `agents/researcher.md` matches `agents/`. The check is case-sensitive and exact.

3. **Infrastructure workflow check:** Every path in `mutable_files` that begins with `workflows/` is checked against the `infrastructure_workflows` list. A match produces a rejection.

4. **No glob patterns:** Paths in `mutable_files` must be exact file paths. Globs are not supported and produce a validation error.

5. **Rejection format:** A rejected experiment produces an explicit message of the form:
   ```
   Experiment rejected: mutable_files list targets locked path(s):
     - <violating-path-1>
     - <violating-path-2>

   See references/experiment-boundaries.md for the full locked zones list.
   ```
   The experiment never runs — no file is read, no commit is attempted.

6. **Valid experiment passes through:** If no violations are found, the experiment proceeds to the metric baseline step.
