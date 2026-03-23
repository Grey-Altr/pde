---
phase: 91
slug: handoff-launch-kit-assembly
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 91 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existing Nyquist test suite) |
| **Config file** | tests/nyquist/jest.config.js |
| **Quick run command** | `npx jest tests/nyquist/phase-91 --no-coverage` |
| **Full suite command** | `npx jest tests/nyquist/ --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest tests/nyquist/phase-91 --no-coverage`
- **After every plan wave:** Run `npx jest tests/nyquist/ --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 91-01-01 | 01 | 1 | KIT-01 | unit | `npx jest tests/nyquist/phase-91 -t "KIT-01"` | ❌ W0 | ⬜ pending |
| 91-01-02 | 01 | 1 | KIT-02 | unit | `npx jest tests/nyquist/phase-91 -t "KIT-02"` | ❌ W0 | ⬜ pending |
| 91-01-03 | 01 | 1 | KIT-03 | unit | `npx jest tests/nyquist/phase-91 -t "KIT-03"` | ❌ W0 | ⬜ pending |
| 91-01-04 | 01 | 1 | KIT-04 | unit | `npx jest tests/nyquist/phase-91 -t "KIT-04"` | ❌ W0 | ⬜ pending |
| 91-01-05 | 01 | 1 | KIT-05 | unit | `npx jest tests/nyquist/phase-91 -t "KIT-05"` | ❌ W0 | ⬜ pending |
| 91-01-06 | 01 | 1 | KIT-06 | unit | `npx jest tests/nyquist/phase-91 -t "KIT-06"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/nyquist/phase-91/kit-requirements.test.js` — stubs for KIT-01 through KIT-06
- [ ] Existing test infrastructure covers framework and fixture needs

*Existing infrastructure covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email placeholder verification | KIT-06 | Requires reading generated OTR content for absence of specific names | Grep OTR artifact for company/partner name patterns |

*Most behaviors have automated verification via grep-based assertions.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
