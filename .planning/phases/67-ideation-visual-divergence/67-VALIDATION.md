---
phase: 67
slug: ideation-visual-divergence
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 67 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in Node.js test runner, matching Phase 66 pattern) |
| **Config file** | none — uses node --test directly |
| **Quick run command** | `node --test tests/phase-67/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-67/*.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-67/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-67/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 67-01-01 | 01 | 1 | IDT-01, IDT-02, IDT-03, IDT-04, EFF-03 | structural grep | `grep -c '4-STITCH' workflows/ideate.md` | n/a | pending |
| 67-02-01 | 02 | 2 | IDT-01 | file-parse | `node --test tests/phase-67/diverge-stitch-flag.test.mjs` | W2 | pending |
| 67-02-02 | 02 | 2 | IDT-02 | file-parse | `node --test tests/phase-67/stitch-png-persist.test.mjs` | W2 | pending |
| 67-02-03 | 02 | 2 | IDT-03 | file-parse | `node --test tests/phase-67/visual-distinctness.test.mjs` | W2 | pending |
| 67-02-04 | 02 | 2 | IDT-04 | file-parse | `node --test tests/phase-67/quota-partial-batch.test.mjs` | W2 | pending |
| 67-02-05 | 02 | 2 | EFF-03 | file-parse | `node --test tests/phase-67/batch-efficiency.test.mjs` | W2 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Plan 01 uses grep-based structural verification. Plan 02 creates all test files as part of Wave 2 execution.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual distinctness of generated PNGs | IDT-03 | Requires actual Stitch API call + color extraction | Generate 3 variants, extract dominant colors, verify meaningful palette differences |

*All other behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-20
