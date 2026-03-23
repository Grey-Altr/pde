---
phase: 87
slug: flows-stage
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
updated: 2026-03-22
---

# Phase 87 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — direct `node --test` invocation |
| **Quick run command** | `node --test .planning/phases/87-flows-stage/tests/test-flows-sbp.cjs` |
| **Full suite command** | `node --test .planning/phases/87-flows-stage/tests/test-flows-sbp.cjs` |
| **Estimated runtime** | ~50ms |

---

## Sampling Rate

- **After every task commit:** Run `node --test .planning/phases/87-flows-stage/tests/test-flows-sbp.cjs`
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** <1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 87-01-01 | 01 | 1 | OPS-01 | structural | `node --test tests/test-flows-sbp.cjs` | ✅ | ✅ green |
| 87-01-02 | 01 | 1 | OPS-02 | structural | `node --test tests/test-flows-sbp.cjs` | ✅ | ✅ green |
| 87-01-03 | 01 | 1 | OPS-03 | structural | `node --test tests/test-flows-sbp.cjs` | ✅ | ✅ green |
| 87-01-04 | 01 | 1 | OPS-04 | structural | `node --test tests/test-flows-sbp.cjs` | ✅ | ✅ green |
| 87-02-01 | 02 | 2 | OPS-02, OPS-03 | structural | `node --test tests/test-flows-sbp.cjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement-to-Test Map

| Requirement | Tests (10 total) | Status |
|-------------|-------------------|--------|
| OPS-01 | SBP filename pattern, 5-participant syntax, Note over C,E: spanning, businessMode ordering | 4/4 GREEN |
| OPS-02 | GTM filename pattern, ACQ/CONV/RET subgraphs, flowchart LR | 3/3 GREEN |
| OPS-03 | hasServiceBlueprint field reference, all 20 designCoverage fields | 2/2 GREEN |
| OPS-04 | solo_founder/startup_team/product_leader track branching | 1/1 GREEN |

---

## Wave 0 Requirements

- [x] Test stubs for OPS-01 (service blueprint generation) — `test-flows-sbp.cjs` describe block 1
- [x] Test stubs for OPS-02 (GTM channel flow) — `test-flows-sbp.cjs` describe block 2
- [x] Test stubs for OPS-03 (designCoverage tracking) — `test-flows-sbp.cjs` describe block 3
- [x] Test stubs for OPS-04 (businessTrack adaptation) — `test-flows-sbp.cjs` describe block 4

*All test stubs created in Plan 01 Task 1 (RED state confirmed), then verified GREEN after Task 2.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 5-lane Mermaid visual correctness | OPS-01 | Visual diagram layout | Render output in Mermaid live editor, verify 5 lanes visible |
| GTM flow channel annotations | OPS-02 | Visual annotation check | Render output, verify acquisition→conversion→retention labels |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-22

---

## Validation Audit 2026-03-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 10 |
| Requirements covered | 4/4 |
