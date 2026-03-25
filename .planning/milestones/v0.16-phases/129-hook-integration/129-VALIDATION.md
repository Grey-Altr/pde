---
phase: 129
slug: hook-integration
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-24
---

# Phase 129 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — Wave 0 creates test file |
| **Quick run command** | `node --test tests/phase-129/test-hook-integration.cjs` |
| **Full suite command** | `node --test tests/phase-129/test-hook-integration.cjs && node --test tests/phase-128/test-merge-engine.cjs && node --test tests/phase-127/test-reverse-parsers.cjs && node --test tests/phase-126/test-sync-foundation.cjs` |
| **Estimated runtime** | ~4 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-129/test-hook-integration.cjs`
- **After every plan wave:** Run full suite (all 4 phase test files)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 4 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 129-01-01 | 01 | 1 | SYN-04, SYN-05 | unit (TDD RED) | `node --test tests/phase-129/test-hook-integration.cjs 2>&1 \| tail -5` | W0 | pending |
| 129-01-02 | 01 | 1 | SYN-04, SYN-05 | unit (TDD GREEN) | `node --test tests/phase-129/test-hook-integration.cjs && node --test tests/phase-128/test-merge-engine.cjs` | W0 | pending |
| 129-02-01 | 02 | 2 | CUR-03 | unit (TDD RED) | `node --test tests/phase-129/test-hook-integration.cjs 2>&1 \| tail -10` | depends 129-01 | pending |
| 129-02-02 | 02 | 2 | CUR-03 | unit (TDD GREEN) | `node --test tests/phase-129/test-hook-integration.cjs && node --test tests/phase-128/test-merge-engine.cjs && node --test tests/phase-127/test-reverse-parsers.cjs` | depends 129-01 | pending |

---

## Wave 0 Requirements

- [ ] `tests/phase-129/test-hook-integration.cjs` — 12 reconciliation/ingest tests for SYN-04, SYN-05 (created by Plan 129-01 Task 1)
- [ ] `tests/phase-129/` directory — created as part of Task 1

*Wave 0 is Plan 129-01 Task 1 (write failing tests first).*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 4s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-24
