---
phase: 15
slug: user-flow-mapping-pde-flows
status: audited
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-15
audited: 2026-03-16
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in assert (no test runner — same as design.cjs self-test) |
| **Config file** | None — tests are inline `runSelfTest()` blocks in .cjs files |
| **Quick run command** | `node bin/pde-tools.cjs test design` |
| **Full suite command** | `node bin/pde-tools.cjs test design` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node bin/pde-tools.cjs test design`
- **After every plan wave:** Run `node bin/pde-tools.cjs test design` + manual `/pde:flows` end-to-end
- **Before `/gsd:verify-work`:** Full suite must be green + both output files verified
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | FLW-01 | automated (grep) + manual (runtime) | 13/13 grep checks pass on workflows/flows.md; runtime execution is manual-only | ✅ | ✅ green |
| 15-01-02 | 01 | 1 | FLW-02 | automated (grep) + manual (runtime) | 4/4 grep checks pass on commands/flows.md; screen inventory extraction verified via workflow content | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `workflows/flows.md` — the workflow document (primary deliverable) — 537 lines, all 7 steps verified
- [x] `commands/flows.md` — updated to delegate to `@workflows/flows.md` — stub text removed
- [x] No new test file needed — existing `design.cjs` self-tests cover all infrastructure calls

*Existing infrastructure covers all phase requirements at the code level. Validation is manual end-to-end execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mermaid flowchart renders correctly with happy path + error states | FLW-01 | Output is a workflow-authored markdown document, not executable code | Run `/pde:flows` on a project with a brief; verify `ux/FLW-flows-v1.md` contains `flowchart TD`, journey-prefixed node IDs, `style ... fill:#fee` error styling, and `{}` decision nodes |
| Screen inventory JSON is valid and excludes decision nodes | FLW-02 | JSON correctness requires inspecting generated content | After `/pde:flows`, verify `ux/FLW-screen-inventory.json` exists, is valid JSON, contains `screens[]` array, each screen has `slug`, `label`, `journey`, `persona`, `type` fields, and no entries with question-phrased slugs |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-16

---

## Validation Audit 2026-03-16

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Automated checks run | 19 |
| Automated checks passed | 19 |

**Notes:** Phase 15 is a workflow-authoring phase — deliverables are markdown instruction files, not executable code. All 19 grep/wc automated checks pass against the authored artifacts. Runtime behavior (actually running `/pde:flows`) remains manual-only verification, correctly documented in the Manual-Only Verifications table.
