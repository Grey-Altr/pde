---
phase: 178
slug: reference-personas-rendering-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 178 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (inline TDD) |
| **Config file** | inline |
| **Quick run command** | `npx vitest run tests/phase-178/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/phase-178/ --reporter=verbose` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 178-01-01 | 01 | 1 | RND-01,RND-02,RND-03 | unit | `npx vitest run tests/phase-178/` | ❌ TDD | ⬜ pending |
| 178-02-01 | 02 | 2 | CLU-01,RND-04,RND-05 | integration | `npx vitest run tests/phase-178/` | ❌ TDD | ⬜ pending |
| 178-02-02 | 02 | 2 | CLR-01,RND-06,RND-07 | integration | `npx vitest run tests/phase-178/` | ❌ TDD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 — tests created inline via TDD pattern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTML renders correctly in browser | RND-01 | Visual fidelity check | Open generated HTML in browser, verify layout/TOC |
| Base64 images display correctly | RND-05 | Requires visual inspection | Check embedded images render in browser |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
