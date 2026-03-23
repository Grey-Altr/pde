---
phase: 110-critique-a11y-deploy-smoke-test
generated: "2026-03-23T00:00:00Z"
finding_count: 4
high_count: 1
has_bdd_candidates: true
---

# Phase 110: Edge Cases

**Generated:** 2026-03-23
**Findings:** 4 (cap: 8)
**HIGH severity:** 1
**BDD candidates:** yes

## Findings

### 1. [HIGH] AOM_DATA parse when browser_snapshot returns empty or error output

**Plan element:** `AOM_DATA` variable in `workflows/critique.md` Perspective 3
**Category:** error_path

Task 2 sets AOM_DATA from browser_snapshot but does not specify handling when snapshot returns empty string or single-line output (navigation failure, blank page, Playwright error). The landmark/heading/unlabeled parse would silently report zero findings — ambiguous between "no accessibility issues" and "snapshot failed".

**BDD Acceptance Criteria Candidate:**
```
Given PLAYWRIGHT_A11Y_AVAILABLE is true and an HTML artifact is present
When browser_snapshot returns an empty string or single-line output
Then critique should log a warning ("AOM snapshot returned empty — skipping structural checks") rather than reporting no accessibility issues found
```

### 2. [MEDIUM] Smoke test section verification when LDP_SECTIONS is empty

**Plan element:** `LDP_SECTIONS` variable in `workflows/deploy.md` Step 5/7
**Category:** empty_state

Task 2 uses $LDP_SECTIONS loaded in Step 2 for section verification. If no LDP artifact exists or the variable is empty, the verification loop has nothing to check. The plan does not specify whether SMOKE_PASS should vacuously pass or log a warning noting no sections were verified.

### 3. [MEDIUM] Fixed smoke screenshot path causes silent overwrites on repeated deploys

**Plan element:** `SMOKE_SCREENSHOT_PATH` constant in `workflows/deploy.md` Step 5/7
**Category:** boundary_condition

Path `.planning/deploy-staging/smoke-screenshot.png` is a fixed filename. Repeated deploys overwrite the previous screenshot without notification. Users comparing deploy runs cannot distinguish screenshots from different deployments.

### 4. [LOW] Heading hierarchy check omits "zero headings" violation case

**Plan element:** `HEADINGS` variable in `workflows/critique.md` Perspective 3 heading analysis
**Category:** empty_state

RESEARCH.md lists "No headings present at all" as a heading hierarchy violation, but Task 2's Perspective 3 action block omits this check. A page with no headings would silently produce zero hierarchy findings rather than a "missing headings" finding.
