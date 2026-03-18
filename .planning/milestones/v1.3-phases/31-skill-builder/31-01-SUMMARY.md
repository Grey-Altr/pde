---
phase: 31-skill-builder
plan: "01"
subsystem: skill-builder
tags: [agents, rubric, model-profiles, test-scripts, nyquist]
dependency_graph:
  requires: [phases/29-quality-infrastructure, phases/30-self-improvement-fleet-audit-command]
  provides: [pde-skill-builder agent, pde-design-quality-evaluator agent, skill-quality-rubric, model profile entry, 6 Nyquist test scripts]
  affects: [phases/31-02, model-profiles resolution for pde-skill-builder]
tech_stack:
  added: [skill-quality-rubric.md, pde-skill-builder.md, pde-design-quality-evaluator.md]
  patterns: [Awwwards-adapted rubric scoring, protected-files constraint pattern, READ-ONLY agent pattern, Wave 0 Nyquist test scripts]
key_files:
  created:
    - references/skill-quality-rubric.md
    - agents/pde-skill-builder.md
    - agents/pde-design-quality-evaluator.md
    - .planning/phases/31-skill-builder/test_skill01_create_mode.sh
    - .planning/phases/31-skill-builder/test_skill02_improve_mode.sh
    - .planning/phases/31-skill-builder/test_skill03_eval_mode.sh
    - .planning/phases/31-skill-builder/test_skill04_validation_gate.sh
    - .planning/phases/31-skill-builder/test_skill05_reference_loading.sh
    - .planning/phases/31-skill-builder/test_skill06_path_sandboxing.sh
  modified:
    - bin/lib/model-profiles.cjs
    - references/model-profiles.md
decisions:
  - pde-skill-builder uses sonnet/sonnet/haiku model tiers — matching pde-skill-improver since both do skill content generation
  - skill-quality-rubric lives in references/ as a separate file — separates evaluation criteria from agent prompt, easier to iterate
  - Wave 0 test scripts check infrastructure existence now so Plan 02 has automated verification gates ready
metrics:
  duration: "~4 minutes"
  completed_date: "2026-03-18"
  tasks_completed: 3
  files_changed: 11
---

# Phase 31 Plan 01: Skill Builder Infrastructure Summary

Skill builder infrastructure created: 4-dimension quality rubric, create/improve/eval agent files, model profile registration, and 6 Nyquist Wave 0 test scripts ready for Plan 02 verification.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create skill-quality-rubric and both agent files | 71cc701 | references/skill-quality-rubric.md, agents/pde-skill-builder.md, agents/pde-design-quality-evaluator.md |
| 2 | Register pde-skill-builder in model-profiles | 3262eca | bin/lib/model-profiles.cjs, references/model-profiles.md |
| 3 | Create all 6 Nyquist test scripts (Wave 0) | e47f4cb | test_skill01–06_*.sh |

## What Was Built

### references/skill-quality-rubric.md

Skill quality evaluation rubric adapting the Awwwards 4-dimension framework for skill file assessment. Four dimensions:
- Design (40%): structural quality — 7 anatomy sections, step numbering, universal flags
- Usability (30%): developer experience — flags table, prerequisite checks, error message quality
- Creativity (20%): domain sophistication — MCP integration, domain heuristics, context routing
- Content (10%): reference quality — required_reading completeness, purpose specificity

Includes JSON return schema (`overall_score`, `dimensions`, `lint_errors`, `lint_warnings`, `recommendations`) for use by pde-design-quality-evaluator.

### agents/pde-skill-builder.md

Skill builder agent for three modes:
- CREATE: produces complete 7-anatomy skill files at output_path with all required flags, YAML frontmatter, and standard summary table
- IMPROVE (additive): returns structured JSON with `additions` and `replacements` arrays — workflow applies diffs directly
- IMPROVE (--rewrite): returns full file replacement for orchestrator to write after backup

Includes protected-files constraint (prompt-only enforcement), required reading block (skill-style-guide, tooling-patterns, mcp-integration, protected-files.json), LINT-011 collision check for skill code assignment, and output formats for each mode.

### agents/pde-design-quality-evaluator.md

READ-ONLY evaluation agent loading skill-quality-rubric.md, skill-style-guide.md, and tooling-patterns.md. Provides a 7-step evaluation checklist aligned to each rubric dimension, runs LINT rule checks from tooling-patterns.md, and returns structured JSON matching the rubric schema.

### model-profiles.cjs + model-profiles.md

Added `pde-skill-builder` entry with sonnet/sonnet/haiku tiers. Matches pde-skill-improver tier since both agents perform skill content generation (sonnet tier needed for solid reasoning about code change proposals).

### Nyquist Test Scripts (Wave 0)

Six test scripts at `.planning/phases/31-skill-builder/test_skill0{1-6}_*.sh`:

| Script | SKILL | Tests | Current State |
|--------|-------|-------|---------------|
| test_skill01_create_mode.sh | SKILL-01 | command/workflow existence, IMP registry, pde:improve name, Task tool | Will fail (Plan 02 delivers) |
| test_skill02_improve_mode.sh | SKILL-02 | --rewrite flag, additive mode, backup logic in workflow | Will fail (Plan 02 delivers) |
| test_skill03_eval_mode.sh | SKILL-03 | evaluator agent, rubric file, eval mode, model registration | Partially passes (agent+rubric done, workflow not yet) |
| test_skill04_validation_gate.sh | SKILL-04 | validate-skill call, retry/cycle logic, rejection path | Will fail (Plan 02 delivers) |
| test_skill05_reference_loading.sh | SKILL-05 | required_reading refs in pde-skill-builder, reference file existence | PASSES fully (5/5) |
| test_skill06_path_sandboxing.sh | SKILL-06 | path guards, protected-files.json checks, --for-pde flag | Partially passes (3/7 — workflow not yet) |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `node -e "require('./bin/lib/model-profiles.cjs')"` exits 0 — syntax valid
- `pde-tools.cjs resolve-model pde-skill-builder --raw` returns `sonnet`
- `ls agents/pde-skill-builder.md agents/pde-design-quality-evaluator.md references/skill-quality-rubric.md` — all exist
- 6/6 test scripts exist at expected paths
- `bash test_skill05_reference_loading.sh` — 5/5 PASS

## Self-Check: PASSED

Files created:
- references/skill-quality-rubric.md: FOUND
- agents/pde-skill-builder.md: FOUND
- agents/pde-design-quality-evaluator.md: FOUND
- All 6 test scripts: FOUND

Commits:
- 71cc701: Task 1 — agent and rubric files
- 3262eca: Task 2 — model-profiles
- e47f4cb: Task 3 — Nyquist test scripts
