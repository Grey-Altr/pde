---
phase: 101-experiment-schema-state-directory
plan: "02"
subsystem: experiment-infrastructure
one-liner: "Experiment phase type reference with four ROADMAP fields (Type, Target Metric, Search Space, Iteration Budget) and machine-parseable recognition rules"
tags: [experiment, roadmap, reference, documentation, cmd-03]
dependency-graph:
  requires: [101-01-PLAN.md]
  provides: [references/experiment-phase-type.md]
  affects: [.planning/ROADMAP.md, Phase 102+]
tech-stack:
  added: []
  patterns: [YAML frontmatter with markdown body, experiment-boundaries.md reference style]
key-files:
  created:
    - references/experiment-phase-type.md
  modified: []
decisions:
  - "CMD-03 satisfied by format convention document, not code changes — 'recognized by downstream tooling' means field presence, not parser implementation"
  - "ROADMAP fields mirror experiment.md frontmatter schema — ROADMAP declares intent, experiment.md is the machine-readable config the runner consumes"
  - "Two-field recognition rule: Type + Target Metric both required — prevents false positives from standard phases with unusual fields"
metrics:
  duration_seconds: 58
  completed: 2026-03-23
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 101 Plan 02: Experiment Phase Type Reference Summary

## What Was Built

Created `references/experiment-phase-type.md` — a canonical reference document that defines the experiment phase type format for ROADMAP.md entries. The document specifies the four additional fields that distinguish experiment phases from standard phases, provides a complete example, explains the relationship to `experiment.md` frontmatter, and defines machine-parseable recognition rules for downstream tooling.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create experiment phase type reference document | c8a25dd | references/experiment-phase-type.md |

## Verification Results

All acceptance criteria passed:

```
test -f references/experiment-phase-type.md                      PASS
grep -q "Target Metric" references/experiment-phase-type.md      PASS
grep -q "Search Space" references/experiment-phase-type.md       PASS
grep -q "Iteration Budget" references/experiment-phase-type.md   PASS
grep -q "Type.*experiment" references/experiment-phase-type.md   PASS
grep -q "direction" references/experiment-phase-type.md          PASS
```

## Decisions Made

1. **CMD-03 is a format convention, not a code change.** The RESEARCH.md Pitfall 5 analysis was correct — CMD-03 requires the four fields to be present and documented so Phase 103+ operators know the correct ROADMAP format. No changes to `gsd-tools.cjs`, `init.cjs`, or roadmap parsing code were needed.

2. **ROADMAP-to-experiment.md field mapping documented explicitly.** The mapping table (Target Metric → metric + direction, Search Space → mutable_files, Iteration Budget → iteration_budget + time_budget_minutes) establishes the contract between human-readable ROADMAP declarations and the machine-readable config the runner parses. The runner never reads ROADMAP.md at runtime.

3. **Two-field recognition rule.** Both `**Type**: experiment` AND `**Target Metric**` must be present for classification as an experiment phase. Single-field presence is treated as malformed (Type only) or standard with unusual field (Target Metric only). This prevents false positives against existing standard phase entries.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist

```
FOUND: references/experiment-phase-type.md
```

### Commits Exist

```
FOUND: c8a25dd
```

## Self-Check: PASSED
