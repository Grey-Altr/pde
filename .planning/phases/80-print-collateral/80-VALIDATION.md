---
phase: 80
slug: print-collateral
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 80 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in test runner) / manual HTML inspection |
| **Config file** | none — uses node:test built-in |
| **Quick run command** | `node --test tests/phase-80/print-collateral.test.mjs` |
| **Full suite command** | `node --test tests/phase-80/print-collateral.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-80/print-collateral.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-80/print-collateral.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 80-01-01 | 01 | 1 | PRNT-01, PRNT-02, PRNT-04 | unit | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ W0 | ⬜ pending |
| 80-01-02 | 01 | 1 | PRNT-01, PRNT-02, PRNT-04 | unit | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ W0 | ⬜ pending |
| 80-02-01 | 02 | 2 | PRNT-03 | unit | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ W0 | ⬜ pending |
| 80-02-02 | 02 | 2 | PRNT-04 | manual | Visual inspection of composition quality | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-80/print-collateral.test.mjs` — unified test file for all PRNT requirements (FLY @page, bleed, CMYK, SIT {{variable}} slots, prepress disclaimer, PRG multi-page)

*Wave 0 is Plan 01 Task 1 — creates test file with 16 assertions in red state.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Awwwards-level composition quality | PRNT-04 | Subjective visual assessment of hierarchy, negative space, typeface count, legibility | Open generated flyer HTML in browser, verify: clear focal hierarchy, intentional negative space, max 3 typefaces, legible at print size |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
