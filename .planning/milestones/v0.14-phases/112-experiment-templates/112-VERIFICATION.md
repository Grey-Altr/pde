---
phase: 112-experiment-templates
verified: 2026-03-23T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "All 14 eligible design skills have at least one experiment template (EXP-12) — deploy.md created by Plan 03"
  gaps_remaining: []
  regressions: []
---

# Phase 112: Experiment Templates Verification Report

**Phase Goal:** Every eligible design skill has an AutoResearch experiment template with browser-backed verification
**Verified:** 2026-03-23
**Status:** passed
**Re-verification:** Yes — after gap closure (Plan 03 created deploy.md)

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Every browser-backed design skill has an experiment template wiring its workflow file to a visual metric script | VERIFIED | 9 browser-backed templates exist: wireframe (dom-metric), mockup (dom-metric), system (contrast-metric), flows (mermaid-metric), iterate (a11y-metric), critique (nyquist-metric), hig (a11y-metric), handoff (dom-metric), brief (dom-metric) |
| 2  | Each template passes experiment-schema.cjs validation (all 4 REQUIRED_FIELDS present) | VERIFIED | 126/126 Nyquist tests pass — all 14 templates pass parseExperimentFile() with metric, direction, verify, mutable_files present |
| 3  | Each template's verify command invokes the correct metric script with a fixture fallback path | VERIFIED | Confirmed in test suite: dom-metric on 4 templates, contrast-metric on 1, mermaid-metric on 1, a11y-metric on 2, nyquist-metric on 6 (including deploy.md) |
| 4  | Each template's mutable_files lists only authorized workflow files | VERIFIED | All 14 templates target only workflows/*.md paths; boundary check passes in test suite (14/14 assertions pass) |
| 5  | All 14 eligible design skills have at least one experiment template (EXP-12) | VERIFIED | deploy.md created by Plan 03 — experiment-boundaries.md 14-skill list now fully covered; test ok 14 passes |

**Score:** 5/5 truths verified

---

## Required Artifacts

### Plan 01 — Browser-Backed Templates (EXP-01 through EXP-09, EXP-11)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `references/experiments/wireframe.md` | dom_structure_score, max, dom-metric.cjs | VERIFIED | slug: wireframe-visual, verify: node bin/dom-metric.cjs fixtures/good-wireframe.html, mutable_files: [workflows/wireframe.md] |
| `references/experiments/mockup.md` | dom_structure_score, max, dom-metric.cjs | VERIFIED | slug: mockup-visual, correct frontmatter and prose |
| `references/experiments/system.md` | contrast_pass_count, max, contrast-metric.cjs | VERIFIED | slug: system-contrast, verify uses contrast-metric.cjs |
| `references/experiments/flows.md` | mermaid_readability_score, max, mermaid-metric.cjs | VERIFIED | slug: flows-mermaid, uses mermaid-simple.md fixture |
| `references/experiments/iterate.md` | a11y_score, max, a11y-metric.cjs | VERIFIED | slug: iterate-improvement, correct metric assignment |
| `references/experiments/critique.md` | nyquist_pass_count, max, nyquist-metric.cjs | VERIFIED | slug: critique-quality, no fixture path (nyquist runs full suite) |
| `references/experiments/hig.md` | a11y_score, max, a11y-metric.cjs | VERIFIED | slug: hig-a11y-detection, correct metric |
| `references/experiments/handoff.md` | dom_structure_score, max, dom-metric.cjs | VERIFIED | slug: handoff-completeness, correct metric |
| `references/experiments/brief.md` | dom_structure_score, max, dom-metric.cjs | VERIFIED | slug: brief-downstream, fixture proxy documented in Constraints |

### Plan 02 — Non-Browser Templates (EXP-10, EXP-12)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `references/experiments/recommend.md` | nyquist_pass_count, max, nyquist-metric.cjs | VERIFIED | slug: recommend-quality, correct frontmatter and prose |
| `references/experiments/competitive.md` | nyquist_pass_count, max, nyquist-metric.cjs | VERIFIED | slug: competitive-quality, correct |
| `references/experiments/opportunity.md` | nyquist_pass_count, max, nyquist-metric.cjs | VERIFIED | slug: opportunity-quality, correct |
| `references/experiments/ideate.md` | nyquist_pass_count, max, nyquist-metric.cjs | VERIFIED | slug: ideate-quality, correct |
| `tests/phase-112/experiment-templates.test.mjs` | 126+ assertions, exits 0 | VERIFIED | Exits 0 with 126/126 passing; EXPECTED_TEMPLATES has 14 entries, nyquistTemplates has 6 entries including deploy.md |

### Plan 03 — Gap Closure: deploy.md (EXP-12)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `references/experiments/deploy.md` | nyquist_pass_count, max, nyquist-metric.cjs, mutable_files: [workflows/deploy.md] | VERIFIED | slug: deploy-quality; all 4 REQUIRED_FIELDS present; 3 prose sections (Search Space, Constraints, Stopping Rationale) present; test ok 14 passes |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `references/experiments/*.md` (14 files) | `bin/lib/experiment-schema.cjs` | `parseExperimentFile()` frontmatter parsing | VERIFIED | 84/84 schema assertions pass; all REQUIRED_FIELDS present in all 14 templates |
| `references/experiments/wireframe.md` | `bin/dom-metric.cjs` | verify field shell command | VERIFIED | `node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html` |
| `references/experiments/system.md` | `bin/contrast-metric.cjs` | verify field | VERIFIED | `node bin/contrast-metric.cjs references/experiments/fixtures/good-wireframe.html` |
| `references/experiments/flows.md` | `bin/mermaid-metric.cjs` | verify field | VERIFIED | `node bin/mermaid-metric.cjs references/experiments/fixtures/mermaid-simple.md` |
| `references/experiments/{iterate,hig}.md` | `bin/a11y-metric.cjs` | verify field | VERIFIED | Both use `node bin/a11y-metric.cjs references/experiments/fixtures/good-wireframe.html` |
| `references/experiments/{critique,recommend,competitive,opportunity,ideate,deploy}.md` | `bin/nyquist-metric.cjs` | verify field | VERIFIED | All 6 use `node bin/nyquist-metric.cjs` (no file path — runs full suite) |
| `tests/phase-112/experiment-templates.test.mjs` | `references/experiments/deploy.md` | EXPECTED_TEMPLATES array | VERIFIED | 'deploy.md' present at index 13 (14th entry); nyquistTemplates includes 'deploy.md' |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EXP-01 | 112-01 | wireframe experiment template | SATISFIED | references/experiments/wireframe.md exists with dom-metric.cjs, passes schema |
| EXP-02 | 112-01 | mockup experiment template | SATISFIED | references/experiments/mockup.md exists with dom-metric.cjs, passes schema |
| EXP-03 | 112-01 | critique experiment template | SATISFIED | references/experiments/critique.md exists with nyquist-metric.cjs, passes schema |
| EXP-04 | 112-01 | system experiment template | SATISFIED | references/experiments/system.md exists with contrast-metric.cjs, passes schema |
| EXP-05 | 112-01 | brief experiment template | SATISFIED | references/experiments/brief.md exists with dom-metric.cjs proxy, passes schema |
| EXP-06 | 112-01 | flows experiment template | SATISFIED | references/experiments/flows.md exists with mermaid-metric.cjs, passes schema |
| EXP-07 | 112-01 | iterate experiment template | SATISFIED | references/experiments/iterate.md exists with a11y-metric.cjs, passes schema |
| EXP-08 | 112-01 | hig experiment template | SATISFIED | references/experiments/hig.md exists with a11y-metric.cjs, passes schema |
| EXP-09 | 112-01 | handoff experiment template | SATISFIED | references/experiments/handoff.md exists with dom-metric.cjs, passes schema |
| EXP-10 | 112-02 | non-browser skill templates (recommend, competitive, opportunity, ideate) | SATISFIED | All 4 exist with nyquist-metric.cjs; test suite EXP-10 suite passes 6/6 (including deploy.md) |
| EXP-11 | 112-01 + 112-02 | each template validates against experiment-schema.cjs contract | SATISFIED | 84/84 schema validation assertions pass across all 14 templates |
| EXP-12 | 112-02 + 112-03 | All 14 eligible design skills have at least one experiment template | SATISFIED | deploy.md created by Plan 03; all 14 entries in EXPECTED_TEMPLATES exist and pass; test suite: 126/126 pass |

**Orphaned requirements:** None — all 12 EXP requirement IDs (EXP-01 through EXP-12) are claimed by Plans 01, 02, or 03.

---

## Anti-Patterns Found

None. No TODO/FIXME/placeholder patterns found in any template or test file.

---

## Human Verification Required

None — all checks are automatable for this phase. The Nyquist test suite covers schema validation, metric assignment, boundary compliance, file existence, and correct metric-script routing for all 14 templates. All 126 assertions pass.

---

## Re-Verification Summary

**Gap closed:** `references/experiments/deploy.md` now exists with valid YAML frontmatter (slug: deploy-quality, metric: nyquist_pass_count, direction: max, verify: node bin/nyquist-metric.cjs, mutable_files: [workflows/deploy.md]) and all three required prose sections (Search Space, Constraints, Stopping Rationale).

**Test suite updated:** `tests/phase-112/experiment-templates.test.mjs` EXPECTED_TEMPLATES array expanded from 13 to 14 entries; describe label updated to "all 14 design skill experiment templates exist"; nyquistTemplates array expanded from 5 to 6 entries; test count grew from 117 to 126 assertions.

**Previous score:** 4/5 (EXP-12 blocked by missing deploy.md)
**Current score:** 5/5 (all 12 requirements satisfied)

All 14 experiment templates exist, pass schema validation, target authorized workflow files, and invoke the correct metric script. Phase goal fully achieved.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
