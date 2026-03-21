---
phase: 81
slug: handoff-production-bible
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 81 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in Node.js test runner) |
| **Config file** | none (uses node --test directly) |
| **Quick run command** | `node --test tests/phase-81/handoff-production-bible.test.mjs` |
| **Full suite command** | `node --test tests/phase-81/handoff-production-bible.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-81/handoff-production-bible.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-81/handoff-production-bible.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Wave 0 Strategy

This phase uses **TDD as Wave 0 equivalent**. Plan 01 Task 1 writes failing tests (red phase), Plan 01 Task 2 implements to make them pass (green phase). This is the project's standard approach — the test file is created as the first task action, satisfying Nyquist coverage before production code is written.

- [x] `tests/phase-81/handoff-production-bible.test.mjs` — consolidated test file covering all HDOF requirements, software guard, hybrid-event, and regression checks

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 81-01-01 | 01 | 1 | HDOF-01..06 | integration | `node --test tests/phase-81/handoff-production-bible.test.mjs` | pending |
| 81-01-02 | 01 | 1 | HDOF-01..06 | integration | `node --test tests/phase-81/handoff-production-bible.test.mjs` | pending |
| 81-02-01 | 02 | 2 | HDOF-01..06 | integration | `node --test tests/phase-81/handoff-production-bible.test.mjs` | pending |
| 81-02-02 | 02 | 2 | HDOF-01..06 | integration | `node --test tests/phase-81/handoff-production-bible.test.mjs` | pending |

*Status: pending / green / red / flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production bible readability | HDOF-01..06 | Subjective document quality | Review generated BIB markdown for logical section ordering and completeness |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (TDD red-phase is Wave 0 equivalent)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
