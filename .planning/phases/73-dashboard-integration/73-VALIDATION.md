---
phase: 73
slug: dashboard-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 73 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js CJS test runner (verify-phase-73.cjs) |
| **Config file** | hooks/tests/verify-phase-73.cjs |
| **Quick run command** | `node hooks/tests/verify-phase-73.cjs` |
| **Full suite command** | `node hooks/tests/verify-phase-73.cjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node hooks/tests/verify-phase-73.cjs`
- **After every plan wave:** Run `node hooks/tests/verify-phase-73.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 73-01-01 | 01 | 1 | DASH-01 | integration | `node hooks/tests/verify-phase-73.cjs` | ❌ W0 | ⬜ pending |
| 73-01-02 | 01 | 1 | DASH-02, DASH-03 | integration | `node hooks/tests/verify-phase-73.cjs` | ❌ W0 | ⬜ pending |
| 73-02-01 | 02 | 1 | DASH-04, DASH-05 | integration | `node hooks/tests/verify-phase-73.cjs` | ❌ W0 | ⬜ pending |
| 73-02-02 | 02 | 1 | DASH-06 | integration | `node hooks/tests/verify-phase-73.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `hooks/tests/verify-phase-73.cjs` — test scaffold for DASH-01 through DASH-06

*Existing infrastructure from Phase 72 tests provides the pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pane 7 visual layout in 7-pane tmux | DASH-01 | Requires live tmux session with sufficient terminal size | Run `/pde:monitor` in 120x30+ terminal, verify Pane 7 shows suggestion list |
| Degraded layout excludes Pane 7 | DASH-02 | Requires small terminal to trigger degradation | Run `/pde:monitor` in 80x24 terminal, verify only 4/2 panes appear |
| Zero-state message display | DASH-03 | Requires visual inspection before any phase starts | Launch monitor before starting PDE work, verify zero-state text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
