---
phase: 60
slug: session-archival
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| 60-01-T1 | 01 | 1 | HIST-03, HIST-04 | integration | `validate-archival.sh` (FILE-01, PDE-01, HIST-03, HIST-04) | yes | green |
| 60-01-T2 | 01 | 1 | HIST-03, HIST-04 | integration | `validate-archival.sh` (HOOKS-01) | yes | green |
| 60-02-T1 | 02 | 2 | HIST-01, HIST-02, HIST-04 | integration | `validate-archival.sh` (FILE-02, HIST-01/02, HIST-04) | yes | green |
| 60-02-T2 | 02 | 2 | HIST-01, HIST-02, HIST-04 | integration | `validate-archival.sh` (HOOKS-02) | yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] `validate-archival.sh` — validation script for all HIST requirements
- [x] Verify archive-session.cjs exists and is syntactically valid
- [x] Verify hooks.json includes SessionEnd archival hook entry
- [x] Verify .planning/logs/ directory creation logic exists

*Wave 0 complete — all validation infrastructure in place.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SessionEnd produces markdown summary | HIST-01 | Requires actual Claude Code session lifecycle | End a PDE session and check .planning/logs/ for new file |
| NDJSON cleanup on SessionStart | HIST-03 | Requires stale files in /tmp older than 7 days | Create test files with old timestamps, start new session, verify removal |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-20

## Validation Audit 2026-03-20
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tests total | 8 |
| Tests passing | 8 |
