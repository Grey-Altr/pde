---
gsd_state_version: 1.0
milestone: v0.11
milestone_name: Experience Product Type
status: unknown
stopped_at: Completed 77-01-PLAN.md
last_updated: "2026-03-21T22:56:36.261Z"
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 16
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.
**Current focus:** Phase 77 — flow-diagrams

## Current Position

Phase: 77 (flow-diagrams) — EXECUTING
Plan: 1 of 2

## Performance Metrics

**Prior milestone reference:**

- v0.10: 4 phases, 8 plans, 107 files, 56 commits (~4 hours)
- v0.9: 6 phases, 12 plans, 91 files, 76 commits (~6 hours)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**Phase 74 Plan 01 decisions (2026-03-21):**

- Experience classification precedes hybrid in brief.md chain — experience + software signals resolve to hybrid-event sub-type, not hybrid product type
- experienceSubType written as null for non-experience products (null = sentinel, not omission)
- Regression smoke matrix written before workflow edits (Wave 0 strategy)

**Phase 74 Plan 02 decisions (2026-03-21):**

- Experience stubs are comment-only placeholders with phase-forward references — no actual experience behavior until Phase 75+
- Disclaimer wired into critique.md and handoff.md required_reading in Phase 74 even though consumed in Phases 79 and 81 — makes linkage visible to grep from Phase 74 forward
- physical domain added to DOMAIN_DIRS in Phase 74 as non-breaking additive change (ahead of Phase 80)

Key architectural constraints locked for this milestone:

- Sub-types (single-night, multi-day, recurring-series, installation, hybrid-event) are metadata attributes on the manifest, not structural pipeline branches — established in Phase 74, irreversible
- Experience tokens live in SYS-experience-tokens.json, never merged into SYS-tokens.json — established in Phase 76, irreversible
- All experience behavior lives as conditional blocks in existing workflow files — no new workflow files (preserves --from stage resumption)
- Every regulatory value in critique and handoff output must carry [VERIFY WITH LOCAL AUTHORITY] inline tag — established in Phase 74 disclaimer block
- Print artifacts are framed as composition reference guides, not production print files — "print-ready" phrase prohibited without prepress disclaimer
- [Phase 79]: Experience gate in critique.md placed before Perspective 1 (before per-wireframe loop) not at stub line — ensures experience products skip all four software perspectives
- [Phase 79]: FLP floor plan is hard prerequisite for experience critique (HALT if absent); TML timeline is soft dependency (warning only)
- [Phase 79]: productType gate in hig.md Step 4 executes before --light check; physical-hig-audit manifest type for experience products; hasHigAudit flag name identical across all modes
- [Phase 80-01]: Bleed zone faked via ::before pseudo-element (inset: -3mm); @page bleed descriptor not browser-implemented
- [Phase 80-01]: Instagram formats use fixed px + transform:scale, never @page — screen-only artifacts
- [Phase 80-01]: SIT gated strictly on experienceSubType === recurring-series; hasPrintCollateral is 15th coverage flag
- [Phase 80-print-collateral]: PRG uses @page schedule landscape for schedule grid legibility; GENERATE_PRG flag mirrors GENERATE_SIT pattern
- [Phase 81]: Four-pass BIB generation (Pass A-D) mandatory — single-pass truncates at staffing plan for venues above 500 capacity
- [Phase 81]: HND_GENERATES_SOFTWARE = false for pure experience; = true only for hybrid-event — prevents software layer generation for single-night, multi-day, recurring-series, and installation sub-types
- [Phase 81]: STACK.md bypass in Step 2a reads manifest before hard-stop — non-hybrid-event experience products skip STACK.md check (FRAMEWORK=none, TYPESCRIPT=false)
- [Phase 81-02]: NEVER-guard language lives inline at Step 4i branch decision — not only in anti-patterns — providing defense-in-depth against product-type violations
- [Phase 81-02]: SC-4 Nyquist test checks for affirmative BIB generation instructions (not word presence) allowing NEVER-guard prohibition text in software branch
- [Phase 82]: wireframe.md experience keyword is 'FLY artifact' not GENERATE_FLY — that constant was never defined in wireframe.md
- [Phase 82]: 4 fixture JSON manifests required hasPrintCollateral/hasProductionBible fields added to match 16-field canonical schema — added as auto-fix Rule 2
- [Phase 82]: 19 test.todo() markers map 1:1 to pending requirement IDs (BREF-01 through WIRE-03) — directly executable when phases 75-78 ship
- [Phase 75]: Wave 0 TDD strategy: tests written and committed red before workflow edits — validates pre-state and creates unambiguous pass/fail contract
- [Phase 75]: Experience sections grouped in single product_type == "experience" guard block after Scope Boundaries — simpler, more grep-friendly than per-section guards
- [Phase 75]: Phase 82 negative BREF assertions replaced with positive assertions in same commit as workflow edits — keeps milestone regression suite accurate immediately
- [Phase 75]: No new decisions — BREF todo markers removed after positive assertions confirmed present from Plan 01
- [Phase 76]: Step 5b placement is AFTER SYS-tokens.json write and BEFORE Step 6 — ensures base file is byte-identical for non-experience products
- [Phase 76]: SYS-experience-tokens.json first reference moved out of Step 2 stub comment — ensures PRODUCT_TYPE guard precedes all file references in test ordering
- [Phase 76]: Phase 82 DSYS todo markers (7) replaced with positive passing assertions in same commit as system.md edit
- [Phase 76]: Stub test at lines 221-227 replaced with Phase 76 complete assertions (SYS-experience-tokens.json + Step 5b) — keeps structural parity with Phase 75 pattern
- [Phase 77]: Step 4-EXP mutual exclusion: experience products skip Steps 4a-4e entirely — TFL/SFL/SOC generated via dedicated path, not alongside software flow
- [Phase 77]: spaces-inventory.json uses fixed unversioned path (.planning/design/ux/spaces-inventory.json) — same convention as FLW-screen-inventory.json, consumed by Phase 78 floor plan
- [Phase 77]: Coverage updated to 16-field read-merge-write pattern (adds hasPrintCollateral, hasProductionBible) — prevents coverage field truncation on experience product runs

### Phase Ordering Rationale

- Phase 74 before all: regression infrastructure and two irreversible architecture decisions must precede any workflow modifications
- Phase 75 before Phase 76: token generation is parametrized by brief data (venue capacity drives spatial tokens, vibe drives lighting palette)
- Phase 76 before Phase 77: flow diagrams consume design tokens for zone color annotations
- Phase 77 before Phase 78: floor plan requires spatial flow as layout rationale; timeline requires temporal flow
- Phase 78 before Phase 79: critique and HIG review the floor plan — no layout means no safety review
- Phase 79 and Phase 80 before Phase 81: HIG checklist and flyer artifacts are referenced sections in the production bible
- Phase 82 last: all modifications complete before full regression validation runs
- Phase 80 depends on Phase 76 (tokens), not Phase 79 — print runs in parallel with critique/HIG

### Pending Todos

- Run /pde:connect stitch --confirm with valid STITCH_API_KEY to execute MCP-05 live tool name gate and update TOOL_MAP markers to TOOL_MAP_VERIFIED

### Blockers/Concerns

- Research flag: SVG spatial generation quality for floor plans is empirically unvalidated — generate 2-3 example floor plans early in Phase 78 before committing to prompt architecture
- Research flag: CSS @page browser compatibility (Chrome reliable, Firefox/Safari partial) — test print-to-PDF in Chrome before finalizing print artifact spec
- Research flag: Multi-stage festival gantt legibility above ~20 items — explicit manifest naming convention for multi-stage TML artifacts needed in Phase 77

## Session Continuity

Last session: 2026-03-21T22:56:36.258Z
Stopped at: Completed 77-01-PLAN.md
Resume file: None

Next action: Execute Phase 75 (experience design system token generation)
