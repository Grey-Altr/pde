---
phase: 177
slug: command-interface-workflow-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 177 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (inline TDD) |
| **Config file** | inline |
| **Quick run command** | `npx vitest run tests/phase-177/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/phase-177/ --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 177-01-01 | 01 | 1 | CMD-01 | unit | `npx vitest run tests/phase-177/` | ❌ TDD | ⬜ pending |
| 177-02-01 | 02 | 2 | CMD-02 | integration | `npx vitest run tests/phase-177/` | ❌ TDD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 — tests created inline via TDD pattern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /pde:present invokable via Skill tool | CMD-01 | Requires Claude Code runtime | Run `/pde:present` in Claude Code session |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
