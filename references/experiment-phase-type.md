---
scope: experiment-phase-type
status: active
created: 2026-03-23
---

# Experiment Phase Type

## Purpose

Experiment phases use the `/pde:optimize` loop instead of the standard plan-execute pattern. Where a standard phase builds a feature by executing plans with deterministic tasks, an experiment phase runs an autonomous iterate-measure-keep/discard loop against a declared metric until a stopping condition fires.

**Key difference from standard phases:**

| Property | Standard Phase | Experiment Phase |
|----------|----------------|-----------------|
| Execution | `/pde:execute-phase` | `/pde:optimize` |
| Output | Code, docs, config | EXPERIMENT-BEST.json, REPORT.md |
| Stopping condition | All plans complete | Budget exhausted or circuit breaker fires |
| Commit pattern | Atomic planning commits | Candidate commits (experiment branch) + promote on improvement |
| Agent | pde-executor | pde-experiment-runner |

Experiment phases do not have plans in the traditional sense. They declare a configuration and let the runner iterate. `**Plans**: TBD` is the placeholder until the runner determines iteration count at runtime.

## Format Specification

An experiment phase entry in ROADMAP.md extends the standard phase format with four additional fields placed between `**Type**` and `**Goal**`:

### Standard Phase Format (reference)

```markdown
### Phase N: Name
**Goal**: ...
**Depends on**: Phase N-1
**Requirements**: REQ-XX
**Success Criteria** (what must be TRUE):
  1. ...
**Plans**: TBD
```

### Experiment Phase Format

```markdown
### Phase N: Name
**Type**: experiment
**Goal**: ...
**Target Metric**: {metric_name} (direction: {min|max})
**Search Space**: {file_or_files} {section_description}
**Iteration Budget**: {N} iterations / {M} min
**Depends on**: Phase N-1
**Requirements**: REQ-XX
**Success Criteria** (what must be TRUE):
  1. ...
**Plans**: TBD
```

### Field Definitions

**`**Type**: experiment`**
Marks the phase as an experiment. Standard phases omit this field entirely. Its presence (along with `**Target Metric**`) is sufficient for downstream tooling to classify the phase as an experiment rather than a standard feature-build phase.

**`**Target Metric**: {metric_name} (direction: {min|max})`**
The single metric being optimized. `direction: max` means higher is better (e.g., Awwwards score, assertion pass count). `direction: min` means lower is better (e.g., error count, latency). Only one metric per experiment phase — multi-metric optimization is out of scope for v0.13.

**`**Search Space**: {file_list} {section_description}`**
Which files and sections the experiment runner is permitted to mutate. The runner enforces that every listed file has `<!-- OPTIMIZABLE -->` markers and is not in the `protected_files` or `protected_directories` lists from `references/experiment-boundaries.md`. Section descriptions are human-readable context; the runner operates on the marker boundaries, not the prose.

**`**Iteration Budget**: {N} iterations / {M} min`**
Maximum number of iterations and wall-clock time. Both are stopping conditions — whichever fires first halts the loop. These values are the experiment's declared budget ceiling; the actual `experiment.md` file (the machine-readable config) carries the same values as YAML frontmatter that the runner parses at startup.

## Example

A complete experiment phase entry showing all fields:

```markdown
### Phase 108: Optimize Brief Quality
**Type**: experiment
**Goal**: Improve the Awwwards rubric score produced by the brief workflow by autonomously mutating its generation prose within declared OPTIMIZABLE sections
**Target Metric**: awwwards_score (direction: max)
**Search Space**: workflows/brief.md OPTIMIZABLE sections
**Iteration Budget**: 50 iterations / 60 min
**Depends on**: Phase 103
**Requirements**: SELF-01
**Success Criteria** (what must be TRUE):
  1. The experiment loop runs at least 10 iterations without crashing
  2. EXPERIMENT-BEST.json contains a kept commit with a metric value higher than the baseline
  3. REPORT.md lists all iterations with their metric deltas and keep/discard outcomes
  4. The promoted result does not introduce any Nyquist regressions (Nyquist is a hard floor)
**Plans**: TBD
```

## Relationship to experiment.md

The ROADMAP.md entry is the **human-readable declaration of intent** for an experiment phase. The `experiment.md` file is the **machine-readable config** that the runner actually parses.

The four ROADMAP fields mirror the `experiment.md` YAML frontmatter schema:

| ROADMAP Field | experiment.md Frontmatter Key |
|---------------|-------------------------------|
| `**Target Metric**: awwwards_score (direction: max)` | `metric: awwwards_score` + `direction: max` |
| `**Search Space**: workflows/brief.md ...` | `mutable_files: [workflows/brief.md]` |
| `**Iteration Budget**: 50 iterations / 60 min` | `iteration_budget: 50` + `time_budget_minutes: 60` |
| _(implicit — phase is type experiment)_ | `slug: improve-brief-quality` |

The ROADMAP entry is for planning visibility and human navigation. The `experiment.md` file lives at the path passed to `/pde:optimize` and is the actual config consumed by `experiment.cjs` at startup. They must agree — if the ROADMAP says 50 iterations but the `experiment.md` says 30, the runner uses the `experiment.md` value (it never reads ROADMAP.md at runtime).

For the full `experiment.md` schema, see `templates/experiment.md`.

## Recognition Rules

Downstream tooling (plan-phase planner, ROADMAP parsers, progress trackers) identifies an experiment phase by checking two fields:

1. **Primary signal:** `**Type**: experiment` is present in the phase entry
2. **Confirmation signal:** `**Target Metric**` field is present in the phase entry

Both fields must be present for a phase to be classified as an experiment. A phase with only `**Type**: experiment` but no `**Target Metric**` is malformed. A phase with only `**Target Metric**` but no `**Type**` field is treated as a standard phase with an unusual field.

These two fields are sufficient to distinguish experiment phases from all current standard phase entries in ROADMAP.md. No existing standard phase uses either field.

**Machine-parseable pattern:**

```
Type.*experiment         # matches **Type**: experiment
Target Metric            # literal field name presence check
```

Both patterns must match within the same phase block (between two `### Phase N:` headings) for the phase to be classified as an experiment phase.
