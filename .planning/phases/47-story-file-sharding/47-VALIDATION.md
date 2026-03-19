---
phase: 47
slug: story-file-sharding
status: complete
nyquist_compliant: true
wave_0_complete: true
updated: 2026-03-19
created: 2026-03-19
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | none — `node --test` is built-in |
| **Quick run command** | `node --test tests/phase-47/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-47/*.test.mjs && node --test tests/phase-46/*.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-47/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-47/*.test.mjs && node --test tests/phase-46/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 47-01-01 | 01 | 0 | PLAN-01 | unit | `node --test tests/phase-47/sharding.test.mjs` | ✅ | ✅ green |
| 47-01-02 | 01 | 0 | PLAN-01 | unit | `node --test tests/phase-47/task-file-content.test.mjs` | ✅ | ✅ green |
| 47-01-03 | 01 | 0 | PLAN-02 | integration | `node --test tests/phase-47/executor-path-resolution.test.mjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-47/sharding.test.mjs` — shardPlan unit tests (6 tests: threshold, count, TDD exemption, custom threshold, idempotency)
- [x] `tests/phase-47/task-file-content.test.mjs` — task file schema validation (9 tests: verbatim action, frontmatter fields, task isolation)
- [x] `tests/phase-47/executor-path-resolution.test.mjs` — conditional path resolution logic (3 tests: task file, no-dir fallback, missing-file fallback)

*Existing `node --test` infrastructure from Phase 46 covers framework needs.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s (18 tests in ~58ms)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✓ approved (2026-03-19)

---

## Validation Audit 2026-03-19

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tests total | 18 |
| Tests passing | 18 |
