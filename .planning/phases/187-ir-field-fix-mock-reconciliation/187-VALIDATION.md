---
phase: 187
slug: ir-field-fix-mock-reconciliation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 187 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.mjs |
| **Quick run command** | `npx vitest run tests/phase-184/` |
| **Full suite command** | `npx vitest run tests/phase-184/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-184/`
- **After every plan wave:** Run `npx vitest run tests/phase-184/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 187-01-01 | 01 | 1 | INT-05 | integration | `npx vitest run tests/phase-184/portfolio-render.test.mjs` | ✅ | ⬜ pending |
| 187-01-02 | 01 | 1 | INT-06 | integration | `npx vitest run tests/phase-184/` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Phase 186 established vitest exclude config and coverage baseline.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /pde:portfolio cross-patterns output | INT-05 | Requires real .planning/ dirs | Run `/pde:portfolio` on two PDE project directories, verify cross-patterns section has content |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
