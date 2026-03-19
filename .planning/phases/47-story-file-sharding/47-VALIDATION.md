---
phase: 47
slug: story-file-sharding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | none — `node --test` is built-in |
| **Quick run command** | `node --test tests/phase-47/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-47/*.test.mjs && node --test tests/phase-46/*.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-47/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-47/*.test.mjs && node --test tests/phase-46/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 47-01-01 | 01 | 0 | PLAN-01 | unit | `node --test tests/phase-47/sharding.test.mjs` | ❌ W0 | ⬜ pending |
| 47-01-02 | 01 | 0 | PLAN-01 | unit | `node --test tests/phase-47/task-file-content.test.mjs` | ❌ W0 | ⬜ pending |
| 47-01-03 | 01 | 0 | PLAN-02 | integration | `node --test tests/phase-47/executor-path-resolution.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-47/sharding.test.mjs` — shardPlan unit tests (count, write, skip, TDD exemption)
- [ ] `tests/phase-47/task-file-content.test.mjs` — task file schema validation (verbatim action, frontmatter fields)
- [ ] `tests/phase-47/executor-path-resolution.test.mjs` — conditional path resolution logic

*Existing `node --test` infrastructure from Phase 46 covers framework needs.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
