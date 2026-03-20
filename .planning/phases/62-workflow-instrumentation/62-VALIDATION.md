---
phase: 62
slug: workflow-instrumentation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 62 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + bats-like manual assertions |
| **Config file** | none — inline validation scripts |
| **Quick run command** | `bash bin/validate-workflow-events.sh quick` |
| **Full suite command** | `bash bin/validate-workflow-events.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash bin/validate-workflow-events.sh quick`
- **After every plan wave:** Run `bash bin/validate-workflow-events.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 62-01-01 | 01 | 1 | EVNT-04 | integration | `bash bin/validate-workflow-events.sh phase_events` | ❌ W0 | ⬜ pending |
| 62-01-02 | 01 | 1 | EVNT-04 | integration | `bash bin/validate-workflow-events.sh wave_events` | ❌ W0 | ⬜ pending |
| 62-01-03 | 01 | 1 | EVNT-04 | integration | `bash bin/validate-workflow-events.sh plan_events` | ❌ W0 | ⬜ pending |
| 62-02-01 | 02 | 2 | EVNT-04 | integration | `bash bin/validate-workflow-events.sh session_summary` | ❌ W0 | ⬜ pending |
| 62-02-02 | 02 | 2 | EVNT-04 | regression | `bash bin/validate-workflow-events.sh regression` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bin/validate-workflow-events.sh` — validation script covering all event types and regression checks
- [ ] Test fixtures: sample NDJSON event files for phase/wave/plan events

*Wave 0 creates the validation script; no external framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard displays wave progress | EVNT-04 | Requires live tmux session | Start tmux dashboard, trigger phase execution, observe pipeline-progress pane updates |
| Session summary includes events | EVNT-04 | Requires full session lifecycle | Complete a session, check archive summary for phase/wave/plan event summaries |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
