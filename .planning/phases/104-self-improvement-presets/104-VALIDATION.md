---
phase: 104
slug: self-improvement-presets
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 104 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (native Node.js test runner) |
| **Config file** | none — tests use node --test |
| **Quick run command** | `node --test tests/phase-104/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-104/`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Wave 0 Requirements

- [ ] `tests/phase-104/preset-discovery.test.mjs` — stubs for SELF-01 (auto-discovery)
- [ ] `tests/phase-104/preset-skill.test.mjs` — stubs for SELF-02 (skill targeting)
- [ ] `tests/phase-104/nyquist-metric.test.mjs` — stubs for SELF-03 (Nyquist metric wrapper)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full --self experiment loop runs end-to-end | SELF-01 | Requires Claude agent runtime | Run /pde:optimize --self, verify it discovers files and starts iterating |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
