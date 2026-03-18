---
phase: 39
slug: mcp-infrastructure-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node --test tests/mcp-infra/*.test.cjs` |
| **Full suite command** | `node --test tests/mcp-infra/*.test.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/mcp-infra/*.test.cjs`
- **After every plan wave:** Run `node --test tests/mcp-infra/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 1 | INFRA-01 | unit | `node --test tests/mcp-infra/approved-servers.test.cjs` | ❌ W0 | ⬜ pending |
| 39-01-02 | 01 | 1 | INFRA-02 | unit | `node --test tests/mcp-infra/mcp-bridge.test.cjs` | ❌ W0 | ⬜ pending |
| 39-02-01 | 02 | 1 | INFRA-03 | unit | `node --test tests/mcp-infra/connection-metadata.test.cjs` | ❌ W0 | ⬜ pending |
| 39-02-02 | 02 | 1 | INFRA-04 | unit | `node --test tests/mcp-infra/probe-health.test.cjs` | ❌ W0 | ⬜ pending |
| 39-03-01 | 03 | 2 | INFRA-05 | integration | `node --test tests/mcp-infra/graceful-degradation.test.cjs` | ❌ W0 | ⬜ pending |
| 39-03-02 | 03 | 2 | INFRA-06 | integration | `node --test tests/mcp-infra/status-command.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/mcp-infra/` — test directory created
- [ ] `tests/mcp-infra/approved-servers.test.cjs` — stubs for INFRA-01 (approved server policy)
- [ ] `tests/mcp-infra/mcp-bridge.test.cjs` — stubs for INFRA-02 (bridge coordination layer)
- [ ] `tests/mcp-infra/connection-metadata.test.cjs` — stubs for INFRA-03 (metadata persistence)
- [ ] `tests/mcp-infra/probe-health.test.cjs` — stubs for INFRA-04 (health probing)
- [ ] `tests/mcp-infra/graceful-degradation.test.cjs` — stubs for INFRA-05 (degraded mode)
- [ ] `tests/mcp-infra/status-command.test.cjs` — stubs for INFRA-06 (status command)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/pde:connect` auth flow | INFRA-02 | Requires real OAuth redirect | Run `/pde:connect github`, follow prompts, verify connection appears in `mcp-connections.json` |
| `/pde:mcp-status` display | INFRA-06 | Visual output verification | Run `/pde:mcp-status`, verify table shows all configured servers with correct states |
| Unofficial server rejection | INFRA-01 | Requires interactive rejection message | Attempt to add an unapproved server, verify policy message displayed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
