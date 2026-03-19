---
phase: 39
slug: mcp-infrastructure-foundation
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-18
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Inline `node -e` and `grep` commands (no test file dependencies) |
| **Quick run command** | See per-task automated verify commands below |
| **Full suite command** | Run all automated verify commands from plans 39-01 and 39-02 |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` verify command
- **After every plan wave:** Run all verify commands from that wave's plans
- **Before `/gsd:verify-work`:** All verify commands must pass
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 39-01-01 | 01 | 1 | INFRA-04,05,06 | inline | `node -e "const b = require('./bin/lib/mcp-bridge.cjs'); b.assertApproved('github'); try { b.assertApproved('evil'); } catch(e) { console.log('POLICY:', e.code); } console.log('SCHEMA:', b.loadConnections().schema_version); try { b.call('x', {}); } catch(e) { console.log('CALL:', e.message.includes('not found')); } console.log('OK');"` | ✅ green |
| 39-01-02 | 01 | 1 | INFRA-05 | inline | `git check-ignore .planning/mcp-connections.json` | ✅ green |
| 39-02-01 | 02 | 2 | INFRA-01,03 | grep | `grep -c "getAllStatuses" workflows/mcp-status.md && grep -c "degraded" workflows/mcp-status.md && grep -c "probe" workflows/mcp-status.md` | ✅ green |
| 39-02-02 | 02 | 2 | INFRA-02 | grep | `grep -c "assertApproved" workflows/connect.md && grep -c "AUTH_INSTRUCTIONS" workflows/connect.md && grep -c "updateConnectionStatus" workflows/connect.md` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No Wave 0 test stubs required. All verification uses inline `node -e` and `grep` commands embedded in plan `<verify>` blocks, which satisfy Nyquist requirements without external test files.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/pde:connect` auth flow | INFRA-02 | Requires real OAuth redirect | Run `/pde:connect github`, follow prompts, verify connection appears in `mcp-connections.json` |
| `/pde:mcp-status` display | INFRA-01 | Visual output verification | Run `/pde:mcp-status`, verify table shows all configured servers with correct states |
| Unofficial server rejection | INFRA-04 | Requires interactive rejection message | Attempt to add an unapproved server, verify policy message displayed |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No Wave 0 test stub dependencies
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-18

---

## Validation Audit 2026-03-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 4 automated verify commands executed and passed. All 6 requirements (INFRA-01 through INFRA-06) have automated coverage.
