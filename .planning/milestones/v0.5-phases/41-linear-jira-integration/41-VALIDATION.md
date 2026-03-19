---
phase: 41
slug: linear-jira-integration
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-18
updated: 2026-03-19
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in Node.js test runner) |
| **Config file** | None |
| **Quick run command** | `node --test tests/phase-41/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-41/*.test.mjs && node --test tests/phase-40/mcp-bridge-toolmap.test.mjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-41/*.test.mjs`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | JIRA-04 | unit | `node --test tests/phase-41/config-task-tracker.test.mjs` | ✅ | ✅ green |
| 41-01-02 | 01 | 1 | LIN-01, JIRA-01 | unit | `node --test tests/phase-41/linear-toolmap.test.mjs && node --test tests/phase-41/atlassian-toolmap.test.mjs` | ✅ | ✅ green |
| 41-02-01 | 02 | 1 | LIN-01 | integration | `node --test tests/phase-41/sync-linear-workflow.test.mjs` | ✅ | ✅ green |
| 41-02-02 | 02 | 1 | LIN-02 | integration | `node --test tests/phase-41/sync-linear-workflow.test.mjs` | ✅ | ✅ green |
| 41-03-01 | 03 | 2 | JIRA-01 | integration | `node --test tests/phase-41/sync-jira-workflow.test.mjs` | ✅ | ✅ green |
| 41-03-02 | 03 | 2 | JIRA-02 | integration | `node --test tests/phase-41/sync-jira-workflow.test.mjs` | ✅ | ✅ green |
| 41-04-01 | 04 | 2 | LIN-03 | integration | `node --test tests/phase-41/handoff-linear-workflow.test.mjs` | ✅ | ✅ green |
| 41-04-02 | 04 | 2 | JIRA-03 | integration | `node --test tests/phase-41/handoff-jira-workflow.test.mjs` | ✅ | ✅ green |
| 41-05-01 | — | — | JIRA-04 | unit | `node --test tests/phase-41/config-task-tracker.test.mjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `bin/lib/mcp-bridge.cjs` — TOOL_MAP entries for linear + atlassian, fix installCmd + AUTH_INSTRUCTIONS, set probeTool
- [x] `bin/lib/config.cjs` — add `task_tracker` to VALID_CONFIG_KEYS

*Existing infrastructure covers test framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Linear OAuth browser flow | LIN-01 | Requires browser interaction for OAuth 2.1 consent | 1. Run `claude mcp add --transport http linear https://mcp.linear.app/mcp` 2. Open /mcp 3. Authenticate via browser |
| Atlassian OAuth browser flow | JIRA-01 | Requires browser interaction for OAuth 2.1 consent | 1. Run `claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse` 2. Open /mcp 3. Authenticate via browser |
| Confirmation gate blocks write on "n" | LIN-03, JIRA-03 | Requires interactive user input | 1. Run handoff command 2. Answer "n" to confirmation 3. Verify no issue created |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-19

---

## Validation Audit 2026-03-19

| Metric | Count |
|--------|-------|
| Gaps found | 8 |
| Resolved | 8 |
| Escalated | 0 |

**Tests created:** 7 new files in `tests/phase-41/` (84 tests total)
**Regression fixed:** `tests/phase-40/mcp-bridge-toolmap.test.mjs` updated for 22-entry TOOL_MAP and non-null Linear/Atlassian probeTools (16 tests)
