---
phase: 62
slug: workflow-instrumentation
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `bash .planning/phases/62-workflow-instrumentation/validate-instrumentation.sh --quick` |
| **Full suite command** | `bash .planning/phases/62-workflow-instrumentation/validate-instrumentation.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/62-workflow-instrumentation/validate-instrumentation.sh --quick`
- **After every plan wave:** Run `bash .planning/phases/62-workflow-instrumentation/validate-instrumentation.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 62-01-T1 | 01 | 1 | EVNT-04 | unit | `validate-instrumentation.sh --quick` (EVNT04-A..E) | Yes | PASS |
| 62-01-T2 | 01 | 1 | EVNT-04 | static | `validate-instrumentation.sh --quick \| grep EVNT04-[A-D]` | Yes | PASS |
| 62-01-T3 | 01 | 1 | EVNT-04 | static | `validate-instrumentation.sh --quick \| grep EVNT04-E` | Yes | PASS |
| 62-02-T1 | 02 | 2 | EVNT-04 | integration | `validate-instrumentation.sh \| tail -12` (EVNT04-F..H) | Yes | PASS |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `.planning/phases/62-workflow-instrumentation/validate-instrumentation.sh` — 8-check validation suite (EVNT04-A..H)

*Existing infrastructure covers all phase requirements. No external framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard displays wave progress | EVNT-04 | Requires live tmux session | Start tmux dashboard, trigger phase execution, observe pipeline-progress pane updates |
| Session summary includes events | EVNT-04 | Requires full session lifecycle | Complete a session, check archive summary for phase/wave/plan event summaries |

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
| Checks | 8/8 PASS |
