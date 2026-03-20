---
phase: 61
slug: token-context-metering
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| 61-01-01 | 01 | 1 | TOKN-01 | structural | `TOKN01-A: grep '~est\.' bin/pane-token-meter.sh` | ✅ | ✅ green |
| 61-01-02 | 01 | 1 | TOKN-01 | structural | `TOKN01-B: grep 'line_len / 4' bin/pane-token-meter.sh` | ✅ | ✅ green |
| 61-01-03 | 01 | 1 | TOKN-02 | structural | `TOKN02-A: grep opus/sonnet/haiku bin/pane-token-meter.sh` | ✅ | ✅ green |
| 61-01-04 | 01 | 1 | TOKN-02 | structural | `TOKN02-B: grep model-profiles bin/pane-token-meter.sh` | ✅ | ✅ green |
| 61-01-05 | 01 | 1 | TOKN-03 | structural | `TOKN03-A: grep 'Orchestrator context (~estimated)' bin/pane-context-window.sh` | ✅ | ✅ green |
| 61-01-06 | 01 | 1 | TOKN-03 | structural | `TOKN03-B: grep 'not subagents' bin/pane-context-window.sh` | ✅ | ✅ green |
| 61-01-07 | 01 | 1 | TOKN-02 | unit | `TOKN02-C: node -e sonnet_cost != haiku_cost` | ✅ | ✅ green |
| 61-01-08 | 01 | 1 | TOKN-03 | unit | `TOKN03-C: node -e 10000/1000000*100 == 1` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `validate-metering.sh` — validation script covering TOKN-01, TOKN-02, TOKN-03
- [x] Verify pane stub files exist from Phase 59

*Existing infrastructure from Phase 58/59 covers event bus and pane framework.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cost differs visibly between models | TOKN-02 | Requires visual comparison in tmux | Switch model-profile between Sonnet/Haiku, verify different dollar amounts display |
| Estimates update as events flow | TOKN-01 | Requires live event stream | Run a Claude Code session, observe token count incrementing in real-time |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-20

---

## Validation Audit 2026-03-20

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Nyquist compliant: 8/8 PASS, all requirements have automated verification.
