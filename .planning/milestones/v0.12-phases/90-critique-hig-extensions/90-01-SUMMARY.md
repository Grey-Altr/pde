---
phase: 90-critique-hig-extensions
plan: "01"
subsystem: design-pipeline
one-liner: "critique.md extended with 4 business perspectives, pitch coherence cross-check, business composite formula (denominator 9.5), and 20-field designCoverage write"
tags: [critique, business-mode, pitch-coherence, nyquist-tests, design-coverage]
dependency_graph:
  requires: [88-brand-system, 89-wireframe-stage-launch-artifacts]
  provides: [critique-business-perspectives, pitch-coherence-check, critique-20-field-coverage]
  affects: [workflows/critique.md]
tech_stack:
  added: []
  patterns: [manifest-get-top-level-pattern, independent-if-block-pattern, read-before-set-coverage-pattern, nyquist-structural-test-pattern]
key_files:
  created:
    - .planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs
  modified:
    - workflows/critique.md
decisions:
  - "Step 4-BUSINESS is an INDEPENDENT IF block inside the ELSE clause — not ELSE IF from experience gate"
  - "Coherence findings excluded from composite score (structural check, not quality perspective)"
  - "Business composite denominator 9.5 = sum of 8 weights (1.5+1.0+1.5+1.0+1.0+1.0+1.5+1.0)"
  - "BM/BT detection cached in ELSE clause preamble for use by both Step 4-BUSINESS and Step 4-COHERENCE"
  - "16-field designCoverage upgraded to 20 fields adding hasBusinessThesis/hasMarketLandscape/hasServiceBlueprint/hasLaunchKit"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_modified: 2
---

# Phase 90 Plan 01: Critique + HIG Extensions (critique.md) Summary

critique.md extended with 4 business perspectives, pitch coherence cross-check, business composite formula (denominator 9.5), and 20-field designCoverage write — 18/24 Nyquist tests GREEN (6 hig.md tests RED as expected for Plan 02).

## What Was Built

### Task 1: Nyquist Test Scaffold (Wave 0 — TDD RED)

Created `.planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` with 24 structural assertions covering:
- QUAL-01 (7 tests): businessMode detection, 4 business perspective names, 9.5 denominator, Groups Evaluated field
- QUAL-02 (5 tests): LCV-lean-canvas glob in strategy/, DPD-pitch-deck-outline glob, LCV.box3.UVP anchor, LCV.box6.metrics anchor, Pitch Coherence Cross-Check heading
- QUAL-03 (4 tests): hig.md businessMode detection, pitch deck readability, email cadence, content calendar
- QUAL-04 (2 tests): negative assertions — no `| info |` severity in critique.md or hig.md
- INTG-02 (6 tests): hasBusinessThesis and hasMarketLandscape in both files, hasServiceBlueprint/hasLaunchKit in critique.md

Tests run with 2 PASS / 22 FAIL RED state (QUAL-04 negative assertions already GREEN).

### Task 2: critique.md Business Extensions (TDD GREEN for critique tests)

Four modifications to `workflows/critique.md`:

**Modification 1: BM/BT detection in ELSE clause preamble**
Added businessMode/businessTrack detection at the start of the ELSE clause (software path), cached for use by Step 4-BUSINESS and Step 4-COHERENCE. Pattern from wireframe.md.

**Modification 2: Step 4-BUSINESS block**
Inserted as INDEPENDENT IF block after Step 4g (visual screenshot observations), before Step 5. When `$BM == "true"`:
- Loads @references/business-track.md and @references/business-financial-disclaimer.md
- BIZ-1: Unit Economics Viability (1.0x weight) — LCV/BRF/STR cross-evaluation with financial placeholder enforcement
- BIZ-2: GTM-ICP Fit (1.0x weight) — GTM channel flow vs ICP onboarding alignment
- BIZ-3: Pricing Psychology (1.5x weight) — anchoring, decoy effect, loss aversion, cognitive load
- BIZ-4: Investor Readiness (1.0x weight) — DPD/LCV/BTH narrative completeness for investor presentation
- Business findings rendered in separate `## Business Mode Findings` section (not mixed with Perspectives 1-4)

**Modification 3: Step 4-COHERENCE block**
Pitch coherence cross-check after Step 4-BUSINESS. When `$BM == "true"`:
- Globs for LCV artifact in `strategy/` and DPD artifact in `launch/`
- Graceful degradation if either artifact absent (note in report, no halt)
- Cross-check 1: LCV.box3.UVP anchor vs DPD Solution slide (pass/advisory/fail)
- Cross-check 2: LCV.box6.metrics anchor vs DPD Traction slide (pass/advisory/fail)
- Coherence findings in `## Pitch Coherence Cross-Check` section, included in Action List, excluded from composite score

**Modification 4: 16→20 field designCoverage write**
Step 7c upgraded from 16-field to 20-field read-before-set pattern. Adds hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit to the coverage write command.

**Additional updates:**
- Composite score formula: business mode uses `/ 9.5` denominator (8 perspectives)
- Summary Scorecard extends to 8 rows in business mode
- `--focused business` documentation updated to note it includes BIZ-1 through BIZ-4 in business mode
- Sections in order updated to include Business Mode Findings (#6), Pitch Coherence (#7), Action List (#8)

## Test Results

```
# tests 24
# suites 5
# pass 18
# fail 6    <- all 6 are hig.md tests, expected RED until Plan 02
```

QUAL-01 (7/7 GREEN), QUAL-02 (5/5 GREEN), QUAL-03 (0/4 RED — Plan 02), QUAL-04 (2/2 GREEN), INTG-02 critique tests (4/4 GREEN), INTG-02 hig tests (0/2 RED — Plan 02).

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| INDEPENDENT IF block for Step 4-BUSINESS | Same pattern as Steps 5c/5d in system.md (STATE.md decision): business:experience compositions must not run business perspectives against floor plan artifacts |
| Denominator 9.5 not 9.0 | Sum of 8 weights: 1.5+1.0+1.5+1.0+1.0+1.0+1.5+1.0 = 9.5 (anti-pattern in RESEARCH.md) |
| Coherence findings excluded from composite score | Structural consistency check, not a quality perspective — per QUAL-02 spec |
| Pitch coherence uses DPD coherence anchors | wireframe.md Step 4j embeds LCV.box3.UVP and LCV.box6.metrics anchors in DPD — simpler than parsing raw box content |
| Business findings in separate section | Prevents mixing with sorted Perspectives 1-4 table — per anti-pattern QUAL-06 in RESEARCH.md |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `.planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` | FOUND |
| `workflows/critique.md` | FOUND |
| `.planning/phases/90-critique-hig-extensions/90-01-SUMMARY.md` | FOUND |
| Commit f3235d6 (test scaffold) | FOUND |
| Commit 7c01d3e (critique.md extensions) | FOUND |
