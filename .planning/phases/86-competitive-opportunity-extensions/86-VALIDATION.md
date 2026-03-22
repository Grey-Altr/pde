---
phase: 86
slug: competitive-opportunity-extensions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 86 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existing) |
| **Config file** | `tests/jest.config.js` |
| **Quick run command** | `npm test -- --testPathPattern="MRKT"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="MRKT"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 86-01-01 | 01 | 1 | MRKT-01 | unit | `npm test -- --testPathPattern="MRKT-01"` | ❌ W0 | ⬜ pending |
| 86-01-02 | 01 | 1 | MRKT-02 | unit | `npm test -- --testPathPattern="MRKT-02"` | ❌ W0 | ⬜ pending |
| 86-01-03 | 01 | 1 | MRKT-04 | unit | `npm test -- --testPathPattern="MRKT-04"` | ❌ W0 | ⬜ pending |
| 86-01-04 | 01 | 1 | MRKT-05 | unit | `npm test -- --testPathPattern="MRKT-05"` | ❌ W0 | ⬜ pending |
| 86-02-01 | 02 | 1 | MRKT-03 | unit | `npm test -- --testPathPattern="MRKT-03"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-86-mrkt.test.js` — stubs for MRKT-01 through MRKT-05
- [ ] Test fixtures for business-mode manifest states (businessMode true/false, all 3 tracks)

*Existing test infrastructure covers framework needs — no new framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mermaid quadrantChart renders correctly | MRKT-02 | Rendering depends on viewer | Open MLS artifact in GitHub/Obsidian, verify chart renders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
