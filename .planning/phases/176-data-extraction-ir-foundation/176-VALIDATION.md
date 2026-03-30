---
phase: 176
slug: data-extraction-ir-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 176 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert + direct CJS require |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node tests/presentation-ir.test.cjs` |
| **Full suite command** | `node tests/presentation-ir.test.cjs && node tests/presentation-validate.test.cjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/presentation-ir.test.cjs`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 176-01-01 | 01 | 0 | EXT-01 | unit | `node tests/presentation-ir.test.cjs` | ❌ W0 | ⬜ pending |
| 176-01-02 | 01 | 1 | EXT-02 | unit | `node tests/presentation-ir.test.cjs` | ❌ W0 | ⬜ pending |
| 176-01-03 | 01 | 1 | EXT-03 | unit | `node tests/presentation-ir.test.cjs` | ❌ W0 | ⬜ pending |
| 176-02-01 | 02 | 1 | EXT-04,EXT-05 | unit | `node tests/presentation-ir.test.cjs` | ❌ W0 | ⬜ pending |
| 176-02-02 | 02 | 1 | EXT-06 | unit | `node tests/presentation-ir.test.cjs` | ❌ W0 | ⬜ pending |
| 176-02-03 | 02 | 1 | EXT-07 | unit | `node tests/presentation-ir.test.cjs` | ❌ W0 | ⬜ pending |
| 176-03-01 | 03 | 2 | EXT-08,EXT-09 | unit | `node tests/presentation-validate.test.cjs` | ❌ W0 | ⬜ pending |
| 176-03-02 | 03 | 2 | EXT-10 | unit | `node tests/presentation-validate.test.cjs` | ❌ W0 | ⬜ pending |
| 176-03-03 | 03 | 2 | CMD-03,CMD-04 | integration | `node tests/presentation-validate.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/presentation-ir.test.cjs` — stubs for EXT-01 through EXT-07
- [ ] `tests/presentation-validate.test.cjs` — stubs for EXT-08 through EXT-10, CMD-03, CMD-04

*Existing infrastructure (bin/lib/, tests/) covers the test runner pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IR includes all persona data fields | EXT-01 | Schema completeness requires inspection | Compare IR JSON keys against persona data requirements table |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
