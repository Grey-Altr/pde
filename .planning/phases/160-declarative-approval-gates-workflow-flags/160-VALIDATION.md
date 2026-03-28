---
phase: 160
slug: declarative-approval-gates-workflow-flags
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 160 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 160-01-01 | 01 | 1 | WFL-01 | source-inspection | `cd dashboard && npx vitest run` | ❌ W0 | ⬜ pending |
| 160-01-02 | 01 | 1 | WFL-01 | source-inspection | `cd dashboard && npx vitest run` | ❌ W0 | ⬜ pending |
| 160-02-01 | 02 | 2 | WFL-02 | source-inspection | `grep --webmcp workflows/wireframe.md` | ❌ W0 | ⬜ pending |
| 160-02-02 | 02 | 2 | WFL-03 | source-inspection | `grep --webmcp workflows/mockup.md` | ❌ W0 | ⬜ pending |
| 160-02-03 | 02 | 2 | WFL-04 | source-inspection | `grep --webmcp workflows/critique.md` | ❌ W0 | ⬜ pending |
| 160-02-04 | 02 | 2 | WFL-05 | source-inspection | `grep --webmcp workflows/competitive.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/__tests__/webmcp-approval-gate.test.ts` — stubs for WFL-01 (approval gate tool registration, inputSchema, handler)
- [ ] `tests/webmcp-workflow-flags.test.ts` — stubs for WFL-02 through WFL-05 (--webmcp flag parsing and output sections)

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser AI agent can call approval gate tool | WFL-01 | Requires live WebMCP client | Open dashboard in Chrome, verify tool appears in navigator.modelContext |
| Existing approval flow unchanged without --webmcp | WFL-01 | Regression check | Run /pde:wireframe without --webmcp, confirm output unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
