---
phase: 63
slug: session-summary-plan-events
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 63 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bash (zero-npm constraint; bash validation per project pattern) |
| **Config file** | `.planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` (new, Wave 0) |
| **Quick run command** | `bash .planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` |
| **Full suite command** | `bash .planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh`
- **After every plan wave:** Run `bash .planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 63-01-01 | 01 | 1 | EVNT-04 | static analysis | `grep -q 'plan_started' hooks/archive-session.cjs` | ❌ W0 | ⬜ pending |
| 63-01-02 | 01 | 1 | EVNT-04 | static analysis | `grep -q 'plan_complete' hooks/archive-session.cjs` | ❌ W0 | ⬜ pending |
| 63-01-03 | 01 | 1 | EVNT-04 | static analysis | `grep -q "case 'plan_started'" hooks/archive-session.cjs` | ❌ W0 | ⬜ pending |
| 63-01-04 | 01 | 1 | EVNT-04 | static analysis | `grep -q "case 'plan_complete'" hooks/archive-session.cjs` | ❌ W0 | ⬜ pending |
| 63-01-05 | 01 | 1 | EVNT-04 | syntax check | `node --check hooks/archive-session.cjs` | ❌ W0 | ⬜ pending |
| 63-01-06 | 01 | 1 | EVNT-04 | unit | Node.js inline source inspection of plan_id field | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` — validation script covering EVNT-04 checks P1-P6

*Existing infrastructure covers syntax checking via node --check.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
