---
phase: 174
slug: cli-wrap-skill
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-29
---

# Phase 174 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | existing project vitest config |
| **Quick run command** | `npx vitest run tests/phase-174/` |
| **Full suite command** | `npx vitest run tests/phase-174/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-174/`
- **After every plan wave:** Run `npx vitest run tests/phase-174/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | CLI-01 | unit | `npx vitest run tests/phase-174/` | W0 | pending |
| TBD | TBD | TBD | CLI-02 | unit | `npx vitest run tests/phase-174/` | W0 | pending |
| TBD | TBD | TBD | CLI-03 | unit | `npx vitest run tests/phase-174/` | W0 | pending |

*Status: pending / green / red / flaky*
*Task IDs will be updated after planning completes.*

---

## Wave 0 Requirements

- [ ] Test stubs for CLI-01 (one-command workflow)
- [ ] Test stubs for CLI-02 (dual strategy routing)
- [ ] Test stubs for CLI-03 (pipx canonical install)

*Test infrastructure exists from prior phases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /pde:cli-wrap produces working MCP server | CLI-01 | Requires real binary on system | Run `/pde:cli-wrap blender`, verify MCP server starts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
