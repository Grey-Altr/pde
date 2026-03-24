---
phase: 112-experiment-templates
plan: "01"
subsystem: experiment-templates
tags: [experiments, autoResearch, visual-metrics, design-skills]
dependency_graph:
  requires: [111-01]
  provides: [EXP-01, EXP-02, EXP-03, EXP-04, EXP-05, EXP-06, EXP-07, EXP-08, EXP-09, EXP-11]
  affects: [autoResearch experiment runner, design skill workflows]
tech_stack:
  added: []
  patterns: [YAML frontmatter experiment template, fixture fallback path, metric script wiring]
key_files:
  created:
    - references/experiments/wireframe.md
    - references/experiments/mockup.md
    - references/experiments/system.md
    - references/experiments/flows.md
    - references/experiments/iterate.md
    - references/experiments/critique.md
    - references/experiments/hig.md
    - references/experiments/handoff.md
    - references/experiments/brief.md
  modified: []
decisions:
  - "All 9 browser-backed skill templates use direction: max — consistent with Phase 111 metric conventions (no direction: min in Phase 112)"
  - "critique.md uses nyquist-metric.cjs not a11y-metric.cjs direction:min — safer proxy, nyquist tests validate critique structure"
  - "brief.md uses dom-metric.cjs on fixture as Phase 112 proxy — full brief-to-wireframe pipeline measurement deferred to Phase 113"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-23"
  tasks_completed: 2
  files_created: 9
  files_modified: 0
---

# Phase 112 Plan 01: Experiment Templates Summary

9 YAML experiment template files wiring each browser-backed design skill to its Phase 111 visual metric script for AutoResearch optimization loops.

## What Was Built

Created 9 experiment template files in `references/experiments/`, one per browser-backed design skill. Each template contains valid YAML frontmatter with all 4 REQUIRED_FIELDS (metric, direction, verify, mutable_files) plus three prose sections (Search Space, Constraints, Stopping Rationale).

**Metric script assignments:**
- wireframe, mockup, handoff, brief — `dom-metric.cjs` (DOM structure score, direction: max)
- system — `contrast-metric.cjs` (WCAG contrast pass count, direction: max)
- flows — `mermaid-metric.cjs` (Mermaid readability score, direction: max)
- iterate, hig — `a11y-metric.cjs` (a11y violations score, direction: max)
- critique — `nyquist-metric.cjs` (Nyquist pass count, direction: max)

All verify commands use fixture fallback paths from `references/experiments/fixtures/` so experiments can run without a live project. Every template specifies `iteration_budget: 30` and `time_budget_minutes: 60`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create 5 HTML-output skill experiment templates | 2429f6c | wireframe.md, mockup.md, system.md, flows.md, iterate.md |
| 2 | Create 4 proxy/text-metric skill experiment templates | c7fefa7 | critique.md, hig.md, handoff.md, brief.md |

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **All directions max:** Every metric in this phase uses `direction: max`. This is consistent with the Phase 111 convention that all visual metric scripts return higher-is-better scores (a11y: 100 - violations*10, contrast: pass count, DOM: 0-100, mermaid: 0-100).

2. **critique uses nyquist not a11y direction:min:** Per research recommendation, nyquist_pass_count is a safer proxy metric than a11y_score direction:min. Nyquist tests assert critique output structure, perspective coverage, and finding quality — a direct structural proxy rather than an inverted failure metric.

3. **brief defers pipeline measurement:** Full brief-to-wireframe pipeline measurement requires multi-step experiment execution (Phase 113 concern). Phase 112 brief.md uses dom-metric.cjs on a fixture as an acceptable proxy per the research recommendation.

## Self-Check: PASSED

Files verified:
- FOUND: references/experiments/wireframe.md
- FOUND: references/experiments/mockup.md
- FOUND: references/experiments/system.md
- FOUND: references/experiments/flows.md
- FOUND: references/experiments/iterate.md
- FOUND: references/experiments/critique.md
- FOUND: references/experiments/hig.md
- FOUND: references/experiments/handoff.md
- FOUND: references/experiments/brief.md

Commits verified:
- FOUND: 2429f6c (feat(112-01): create 5 HTML-output skill experiment templates)
- FOUND: c7fefa7 (feat(112-01): create 4 proxy/text-metric skill experiment templates)
