---
phase: 61
slug: token-context-metering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 61 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + validate-*.sh scripts (project convention) |
| **Config file** | none — uses existing test harness from Phase 58/59 |
| **Quick run command** | `bash .planning/phases/61-token-context-metering/validate-metering.sh` |
| **Full suite command** | `bash .planning/phases/61-token-context-metering/validate-metering.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/61-token-context-metering/validate-metering.sh`
- **After every plan wave:** Run `bash .planning/phases/61-token-context-metering/validate-metering.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 61-01-01 | 01 | 1 | TOKN-01 | integration | `grep '~est\.' dashboard/panes/pane-token-meter.sh` | ❌ W0 | ⬜ pending |
| 61-01-02 | 01 | 1 | TOKN-02 | integration | `grep 'model_pricing' dashboard/panes/pane-token-meter.sh` | ❌ W0 | ⬜ pending |
| 61-01-03 | 01 | 1 | TOKN-03 | integration | `grep 'Orchestrator context (~estimated)' dashboard/panes/pane-context-window.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `validate-metering.sh` — validation script covering TOKN-01, TOKN-02, TOKN-03
- [ ] Verify pane stub files exist from Phase 59

*Existing infrastructure from Phase 58/59 covers event bus and pane framework.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cost differs visibly between models | TOKN-02 | Requires visual comparison in tmux | Switch model-profile between Sonnet/Haiku, verify different dollar amounts display |
| Estimates update as events flow | TOKN-01 | Requires live event stream | Run a Claude Code session, observe token count incrementing in real-time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
