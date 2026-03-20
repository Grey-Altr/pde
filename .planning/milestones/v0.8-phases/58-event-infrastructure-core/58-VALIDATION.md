---
phase: 58
slug: event-infrastructure-core
status: audited
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-19
audited: 2026-03-20
---

# Phase 58 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert + shell scripts (zero deps) |
| **Config file** | none — inline validation via bash |
| **Quick run command** | `node bin/pde-tools.cjs event-emit test '{}' 2>/dev/null; echo $?` |
| **Full suite command** | `bash .planning/phases/58-event-infrastructure-core/validate-events.sh` |
| **Estimated runtime** | ~0.4 seconds |
| **Last run result** | 6/6 PASS (2026-03-20) |

---

## Sampling Rate

- **After every task commit:** Run quick validation command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 58-01-T1 | 01 | 1 | EVNT-01 | structural | `validate-events.sh` EVNT-01 check (envelope fields) | ✅ green |
| 58-01-T1 | 01 | 1 | EVNT-02 | behavioral | `validate-events.sh` EVNT-02 check (NDJSON file exists) | ✅ green |
| 58-01-T1 | 01 | 1 | EVNT-05 | structural | `validate-events.sh` EVNT-05 check (extensions field) | ✅ green |
| 58-01-T1 | 01 | 1 | EVNT-06 | behavioral | `validate-events.sh` EVNT-06 check (2 sessions, 2 files) | ✅ green |
| 58-01-T2 | 01 | 1 | EVNT-01 | structural | `node bin/pde-tools.cjs config-set monitoring.enabled true` exits 0 | ✅ green |
| 58-02-T1 | 02 | 2 | EVNT-01 | integration | `validate-events.sh` EVNT-01 (event-emit writes envelope) | ✅ green |
| 58-02-T1 | 02 | 2 | EVNT-02 | integration | `validate-events.sh` EVNT-02 (session-scoped file) | ✅ green |
| 58-02-T1 | 02 | 2 | EVNT-06 | behavioral | `validate-events.sh` EVNT-06 (session isolation) | ✅ green |
| 58-03-T1 | 03 | 3 | EVNT-03 | structural | `validate-events.sh` EVNT-03 (hooks.json structure, 5 events, async flags) | ✅ green |
| 58-03-T1 | 03 | 3 | EVNT-06 | integration | emit-event.cjs stdin adapter exits 0 for valid and invalid input | ✅ green |
| 58-03-T2 | 03 | 3 | EVNT-01,02,03,05,06 | e2e | `bash validate-events.sh` — 6/6 PASS in 0.37s | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `validate-events.sh` — shell script testing NDJSON output, schema shape, session isolation, fail-silent
- [x] Event bus module loadable without side effects

*All Wave 0 requirements satisfied.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hook auto-fire in live Claude Code session | EVNT-03 | Requires real Claude Code runtime with plugin loaded | Start session, run a tool, check NDJSON file for hook events |
| PostToolUse matcher filters correctly | EVNT-03 | Requires real Claude Code PostToolUse dispatch | Use Write/Edit/Bash tools, verify only those fire hooks |
| Hook timing overhead < 5% of baseline | EVNT-02 | Requires wall-clock comparison across sessions | Run PDE command with/without hooks, compare wall clock |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s (0.37s actual)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** passed

---

## Validation Audit 2026-03-20

| Metric | Count |
|--------|-------|
| Requirements audited | 5 (EVNT-01, EVNT-02, EVNT-03, EVNT-05, EVNT-06) |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only items | 3 (live session required) |
| Validation suite result | 6/6 PASS in 0.37s |
