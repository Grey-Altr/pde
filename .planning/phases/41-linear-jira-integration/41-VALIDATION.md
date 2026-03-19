---
phase: 41
slug: linear-jira-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — PDE uses behavioral smoke tests (same as Phase 40) |
| **Config file** | None |
| **Quick run command** | `/pde:health` |
| **Full suite command** | `/pde:health` + manual smoke tests for each LIN-*/JIRA-* requirement |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `/pde:health`
- **After every plan wave:** Run `/pde:health` + smoke test each completed requirement
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 0 | JIRA-04 | smoke | `node bin/lib/config.cjs` — verify task_tracker in VALID_CONFIG_KEYS | ❌ W0 | ⬜ pending |
| 41-01-02 | 01 | 0 | LIN-01, JIRA-01 | smoke | `grep -c "TOOL_MAP" bin/lib/mcp-bridge.cjs` — verify Linear + Atlassian entries | ❌ W0 | ⬜ pending |
| 41-02-01 | 02 | 1 | LIN-01 | smoke | `/pde:sync --linear` — verify REQUIREMENTS.md contains `### Linear Issues` with `LIN-` entries | ❌ W0 | ⬜ pending |
| 41-02-02 | 02 | 1 | LIN-02 | smoke | `/pde:sync --linear` — verify ROADMAP.md contains `<!-- Linear Active Cycle:` comments | ❌ W0 | ⬜ pending |
| 41-03-01 | 03 | 1 | JIRA-01 | smoke | `/pde:sync --jira` — verify REQUIREMENTS.md contains `### Jira Issues` with `JIRA-` entries | ❌ W0 | ⬜ pending |
| 41-03-02 | 03 | 1 | JIRA-02 | smoke | `/pde:sync --jira` — verify REQUIREMENTS.md contains `## Jira Epics` table | ❌ W0 | ⬜ pending |
| 41-04-01 | 04 | 2 | LIN-03 | smoke | `/pde:handoff --create-linear-issues` — verify confirmation prompt before write | ❌ W0 | ⬜ pending |
| 41-04-02 | 04 | 2 | JIRA-03 | smoke | `/pde:handoff --create-jira-tickets` — verify confirmation prompt before write | ❌ W0 | ⬜ pending |
| 41-05-01 | 05 | 2 | JIRA-04 | smoke | Set task_tracker → run `/pde:sync` → verify correct service dispatched | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bin/lib/mcp-bridge.cjs` — TOOL_MAP entries for linear + atlassian, fix installCmd + AUTH_INSTRUCTIONS, set probeTool
- [ ] `bin/lib/config.cjs` — add `task_tracker` to VALID_CONFIG_KEYS

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
