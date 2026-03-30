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
| **Framework** | vitest (inline TDD — tests created alongside production code) |
| **Config file** | vitest.config or inline |
| **Quick run command** | `npx vitest run tests/phase-176/presentation-ir.test.mjs --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/phase-176/ --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 176-01-01 | 01 | 1 | EXT-01,EXT-02,EXT-03,EXT-04 | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs` | ❌ TDD | ⬜ pending |
| 176-02-01 | 02 | 2 | EXT-05,EXT-06,EXT-07,EXT-08,EXT-09,EXT-10 | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs` | ❌ TDD | ⬜ pending |
| 176-03-01 | 03 | 3 | CMD-03 | integration | `node -e "const p = require('./bin/lib/presentation.cjs')..."` | ❌ TDD | ⬜ pending |
| 176-03-02 | 03 | 3 | CMD-04 | integration | `npx vitest run tests/phase-176/ --reporter=verbose` | ❌ TDD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 — tests are created inline via TDD pattern (tdd=true on tasks). Each task creates both production code and test file simultaneously.

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
