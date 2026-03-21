---
phase: 72
slug: suggestion-catalog-and-content-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 72 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existing project test framework) |
| **Config file** | jest.config.js |
| **Quick run command** | `npx jest --testPathPattern="idle-suggestions\|context-notes" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="idle-suggestions\|context-notes" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 72-01-01 | 01 | 1 | CONT-01 | unit | `npx jest --testPathPattern="idle-catalog-parser"` | ❌ W0 | ⬜ pending |
| 72-01-02 | 01 | 1 | CONT-02 | unit | `npx jest --testPathPattern="idle-suggestions"` | ❌ W0 | ⬜ pending |
| 72-01-03 | 01 | 1 | CONT-03 | unit | `npx jest --testPathPattern="idle-suggestions"` | ❌ W0 | ⬜ pending |
| 72-01-04 | 01 | 1 | CONT-05 | unit | `npx jest --testPathPattern="design-state-parser"` | ❌ W0 | ⬜ pending |
| 72-02-01 | 02 | 2 | CONT-04 | integration | `npx jest --testPathPattern="context-notes"` | ❌ W0 | ⬜ pending |
| 72-02-02 | 02 | 2 | CONT-06 | integration | `npx jest --testPathPattern="plan-phase-context"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/idle-catalog-parser.test.js` — stubs for CONT-01 catalog parsing
- [ ] `tests/idle-suggestions.test.js` — stubs for CONT-02, CONT-03 suggestion generation
- [ ] `tests/design-state-parser.test.js` — stubs for CONT-05 incomplete choice detection
- [ ] `tests/context-notes.test.js` — stubs for CONT-04 context-notes injection
- [ ] `tests/plan-phase-context.test.js` — stubs for CONT-06 plan/brief consumption

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| idle-catalog.md is human-readable and editable | CONT-01 | Subjective readability | Open file, verify sections are clear with time/cost labels |
| Context notes appear in planner output | CONT-04 | Requires full pipeline run | Place .md in context-notes/, run /pde:plan, check planner prompt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
