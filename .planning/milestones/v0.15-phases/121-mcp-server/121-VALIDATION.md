---
phase: 121
slug: mcp-server
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 121 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — uses node --test directly |
| **Quick run command** | `node --test tests/phase-121/test-mcp-server.cjs` |
| **Full suite command** | `node --test tests/phase-121/test-mcp-server.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-121/test-mcp-server.cjs`
- **After every plan wave:** Run `node --test tests/phase-121/test-mcp-server.cjs`
- **Before `/pde:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 121-01-01 | 01 | 1 | MCP-01 | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ W0 | ⬜ pending |
| 121-01-02 | 01 | 1 | MCP-02 | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ W0 | ⬜ pending |
| 121-01-03 | 01 | 1 | MCP-03 | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ W0 | ⬜ pending |
| 121-01-04 | 01 | 1 | MCP-04 | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ W0 | ⬜ pending |
| 121-01-05 | 01 | 1 | MCP-05 | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-121/test-mcp-server.cjs` — stubs for MCP-01 through MCP-05
- [ ] `packages/pde-mcp-server/` — package directory with package.json

*Existing node:test infrastructure from prior phases covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npx pde-mcp-server` starts correctly | MCP-03 | Requires npm publish or local link | Run `cd packages/pde-mcp-server && node index.cjs` to verify startup |
| Editor consumption of pipeline resource | MCP-04 | Requires MCP-compatible editor | Configure editor to connect to MCP server and verify pipeline status appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
