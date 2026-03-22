---
phase: 86
slug: competitive-opportunity-extensions
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
---

# Phase 86 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in Node.js test runner) |
| **Config file** | none — inline test files |
| **Quick run command** | `node --test .planning/phases/86-competitive-opportunity-extensions/tests/test-competitive-mls.cjs .planning/phases/86-competitive-opportunity-extensions/tests/test-opportunity-rice.cjs` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test .planning/phases/86-competitive-opportunity-extensions/tests/`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 86-01-01 | 01 | 1 | MRKT-01, MRKT-02, MRKT-04, MRKT-05 | structural | `node --test .planning/phases/86-competitive-opportunity-extensions/tests/test-competitive-mls.cjs` | ❌ W0 | ⬜ pending |
| 86-01-02 | 01 | 1 | MRKT-01, MRKT-02, MRKT-04, MRKT-05 | structural | `node --test .planning/phases/86-competitive-opportunity-extensions/tests/test-competitive-mls.cjs` | ❌ W0 | ⬜ pending |
| 86-02-01 | 02 | 1 | MRKT-03 | structural | `node --test .planning/phases/86-competitive-opportunity-extensions/tests/test-opportunity-rice.cjs` | ❌ W0 | ⬜ pending |
| 86-02-02 | 02 | 1 | MRKT-03 | structural | `node --test .planning/phases/86-competitive-opportunity-extensions/tests/test-opportunity-rice.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/phases/86-competitive-opportunity-extensions/tests/test-competitive-mls.cjs` — structural tests for MRKT-01, MRKT-02, MRKT-04, MRKT-05 (created by Plan 86-01, Task 1)
- [ ] `.planning/phases/86-competitive-opportunity-extensions/tests/test-opportunity-rice.cjs` — structural tests for MRKT-03 (created by Plan 86-02, Task 1)

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
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
