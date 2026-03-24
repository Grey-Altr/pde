---
phase: 112-experiment-templates
generated: "2026-03-23T00:00:00Z"
finding_count: 4
high_count: 1
has_bdd_candidates: true
---

# Phase 112: Edge Cases

**Generated:** 2026-03-23
**Findings:** 4 (cap: 8)
**HIGH severity:** 1
**BDD candidates:** yes

## Findings

### 1. [HIGH] critique.md template uses nyquist-metric instead of a11y-metric on defective fixture

**Plan element:** `references/experiments/critique.md`
**Category:** boundary_condition

The RESEARCH.md (Pattern 3) explicitly defines the critique template using `a11y-metric.cjs` on `references/experiments/fixtures/a11y-issues.html` with `direction: min` as the intended proxy metric for critique quality. However, the plan (112-01, Task 2) deviates from this to use `nyquist-metric.cjs` with `direction: max` instead, citing the subtlety of direction: min. The research notes this tension but warns the nyquist proxy is "less direct" for measuring critique quality against known-defective wireframes. The template as planned may not correctly validate EXP-03 ("measure finding quality against known-defective wireframes") since nyquist tests measure critique output structure, not a11y defect detection capability.

**BDD Acceptance Criteria Candidate:**
```
Given critique.md is mutated during an AutoResearch experiment
When the experiment runs verify: node bin/nyquist-metric.cjs
Then the score reflects critique structural quality but NOT detection rate of a11y issues in known-defective wireframes
```

### 2. [MEDIUM] 14-template count discrepancy: VALIDATION.md only maps 1 task

**Plan element:** `tests/phase-112/experiment-templates.test.mjs`
**Category:** empty_state

The VALIDATION.md Per-Task Verification Map only has a single row (112-01-01) and references `node experiment-schema.cjs validate` — not the Nyquist test file that Plan 02 Task 2 actually creates (`node --test tests/phase-112/experiment-templates.test.mjs`). If the VALIDATION.md is used to track completion, tasks 112-01-02, 112-02-01, and 112-02-02 have no validation rows. This creates a gap in the sign-off process.

### 3. [MEDIUM] No fixture fallback for nyquist-metric.cjs verify commands in non-browser templates

**Plan element:** `verify: node bin/nyquist-metric.cjs`
**Category:** boundary_condition

Browser-backed templates use `references/experiments/fixtures/good-wireframe.html` as a stable fixture path. Non-browser templates (recommend, competitive, opportunity, ideate, critique) use `node bin/nyquist-metric.cjs` with no path argument. If nyquist-metric.cjs requires an input path argument (similar to how dom-metric.cjs takes argv[2]), these templates will fail at runtime. The RESEARCH.md interfaces section confirms "no argv[2] needed" for nyquist-metric.cjs, but this isn't validated in the plan's acceptance criteria.

### 4. [LOW] deploy.md not addressed in template set — potential ambiguity on EXP-12 count

**Plan element:** `EXPECTED_TEMPLATES` array in `tests/phase-112/experiment-templates.test.mjs`
**Category:** boundary_condition

Plan 02 Task 2 action explicitly notes `// Note: deploy.md is experiment-eligible but not a design skill — 14 design skills, not 15`. The REQUIREMENTS.md EXP-12 says "all 14 eligible design skills" and references/experiment-boundaries.md lists 14 authorized workflow files. The exclusion of deploy.md is intentional and justified, but the test comment is the only documentation of this decision. A future reader might question why 14 templates cover all 14 "eligible" skills while experiment-boundaries.md shows 14 authorized files that may include deploy.md.
