---
phase: 60
slug: session-archival
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + Node.js assertions (consistent with Phase 58/59) |
| **Config file** | none — validation scripts in phase directory |
| **Quick run command** | `bash .planning/phases/60-session-archival/validate-archival.sh` |
| **Full suite command** | `bash .planning/phases/60-session-archival/validate-archival.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/60-session-archival/validate-archival.sh`
- **After every plan wave:** Run `bash .planning/phases/60-session-archival/validate-archival.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 60-01-01 | 01 | 1 | HIST-01 | integration | `validate-archival.sh` | W0 | pending |
| 60-01-02 | 01 | 1 | HIST-04 | integration | `validate-archival.sh` | W0 | pending |
| 60-02-01 | 02 | 1 | HIST-02 | integration | `validate-archival.sh` | W0 | pending |
| 60-03-01 | 03 | 1 | HIST-03 | integration | `validate-archival.sh` | W0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `validate-archival.sh` — validation script for all HIST requirements
- [ ] Verify archive-session.cjs exists and is syntactically valid
- [ ] Verify hooks.json includes SessionEnd archival hook entry
- [ ] Verify .planning/logs/ directory creation logic exists

*Wave 0 creates the validation script; subsequent tasks verify against it.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SessionEnd produces markdown summary | HIST-01 | Requires actual Claude Code session lifecycle | End a PDE session and check .planning/logs/ for new file |
| NDJSON cleanup on SessionStart | HIST-03 | Requires stale files in /tmp older than 7 days | Create test files with old timestamps, start new session, verify removal |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
