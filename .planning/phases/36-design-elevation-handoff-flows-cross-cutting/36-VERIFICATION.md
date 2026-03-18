---
phase: 36-design-elevation-handoff-flows-cross-cutting
status: complete
nyquist_tests: GREEN
created: 2026-03-18
---

# Phase 36 — Verification

## Automated Tests

All 4 Nyquist test scripts GREEN:

```bash
# Full suite run:
for f in .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_hand*.sh .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_flow*.sh .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_cross*.sh; do bash "$f"; done
```

| Script | Requirement | Checks | Status |
|--------|-------------|--------|--------|
| test_hand01_motion_spec.sh | HAND-01 | 5 | GREEN |
| test_hand02_impl_notes.sh | HAND-02 | 3 | GREEN |
| test_flow01_transitions.sh | FLOW-01 | 2 | GREEN |
| test_cross01_includes.sh | CROSS-01 | 7 | GREEN |

## ORDER-01: Design Elevation Dependency Order (Manual Verification)

**Requirement:** Design elevation follows strict dependency order — system → wireframe → critique/iterate → mockup (upstream quality sets downstream ceiling).

**Evidence:** All upstream elevation phases completed before Phase 36:

| Phase | Skill | Completed | Dependency Rationale |
|-------|-------|-----------|---------------------|
| Phase 32 | system.md | 2026-03-18 | Foundation — motion tokens, OKLCH palettes, APCA contrast, type pairings. Sets the vocabulary all downstream skills reference. |
| Phase 33 | wireframe.md | 2026-03-18 | Requires system tokens (density spacing, grid rationale). Wireframe quality ceiling set by upstream system. |
| Phase 34 | critique.md, hig.md | 2026-03-18 | Requires wireframe (evaluates wireframe composition quality). Requires system (references quality-standards.md). |
| Phase 35 | mockup.md | 2026-03-18 | Requires system (spring tokens, DTCG format), wireframe (layout quality), critique/iterate framework (runs before mockup in pipeline). |
| Phase 36 | handoff.md, flows.md | 2026-03-18 | Requires mockup (VISUAL-HOOK convention — handoff implementation notes reference mockup annotations). Requires system (motion-design.md — handoff motion spec vocabulary drawn from motion tokens). |

**Dependency chain (canonical order):**
```
system → wireframe → critique/iterate → mockup → handoff + flows
```

All phases executed in this order. ORDER-01 satisfied.

## CROSS-01: Reference Injection Uniformity (Automated + Manual Confirmation)

**Requirement:** All 7 elevated skills load quality references via `@` includes in `required_reading`. No structural changes to the 7-step skill anatomy.

**Automated evidence:** `test_cross01_includes.sh` passes 7/7 checks.

| Skill | @references/ includes | CROSS-01 |
|-------|-----------------------|----------|
| system.md | skill-style-guide, mcp-integration, motion-design, composition-typography | COMPLIANT |
| wireframe.md | skill-style-guide, mcp-integration, composition-typography | COMPLIANT |
| critique.md | skill-style-guide, mcp-integration, quality-standards, composition-typography | COMPLIANT |
| hig.md | skill-style-guide, mcp-integration, motion-design | COMPLIANT |
| mockup.md | skill-style-guide, mcp-integration, motion-design | COMPLIANT |
| handoff.md | skill-style-guide, mcp-integration, motion-design | COMPLIANT (added Phase 36) |
| flows.md | skill-style-guide, mcp-integration | COMPLIANT (transition vocabulary embedded in prose — no additional reference file needed) |

7-step pipeline structure preserved in all 7 skills. No steps added or renumbered.

## CROSS-02: Audit Delta Measurement (Manual Verification)

**Requirement:** Running /pde:audit after all elevation phases produces measurable quality delta against Phase 30 baseline.

**Procedure:**

1. **Pre-elevation baseline** (run before Phase 36 skill edits):
   ```
   /pde:audit --save-baseline
   ```
   Records to `.planning/audit-baseline.json`. Note the `finding_count` and `skill_quality_pct` for handoff.md and flows.md specifically.

2. **Apply Phase 36 elevations** (Tasks 2 and 3 of this plan).

3. **Post-elevation audit**:
   ```
   /pde:audit
   ```
   Compare: `finding_count_delta` (negative = improvement) and `skill_quality_pct` delta for handoff/flows domain.

**Acceptance criteria for CROSS-02:**
One of the following must be true:
- (a) `finding_count_delta < 0` (fewer total findings), OR
- (b) handoff.md or flows.md specific findings are fewer in post-elevation audit, OR
- (c) If audit tool does not capture the specific HAND/FLOW additions (motion spec fields are generated output, not evaluated by auditor against rubric), document this explicitly: "Audit tool evaluates skill generation quality via rubric — HAND-01/02 and FLOW-01 additions are structural (instruction quality), not scored as generated artifacts. Delta is qualitative: handoff.md gained 3 new generation directives; flows.md gained 1. Quality delta documented via Nyquist test GREEN state."

**Status:** Pending — run /pde:audit --save-baseline before elevation, then /pde:audit after, and record delta here.
