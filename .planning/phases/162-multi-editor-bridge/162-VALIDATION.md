---
phase: 162
slug: multi-editor-bridge
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 162 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 162-01-01 | 01 | 1 | MEB-02 | unit | `cd dashboard && npx vitest run __tests__/mcp-relay-depth.test.ts` | ❌ W0 | ⬜ pending |
| 162-01-02 | 01 | 1 | MEB-02 | structural | `grep -q 'X-PDE-Relay-Depth' dashboard/lib/mcp/relay-depth-guard.ts` | N/A | ⬜ pending |
| 162-01-03 | 01 | 1 | MEB-02 | structural | `grep -q 'validateRelayDepth' dashboard/app/api/mcp/route.ts` | N/A | ⬜ pending |
| 162-02-01 | 02 | 1 | MEB-03 | structural | `grep -q 'pde_remote' bin/lib/mcp-bridge.cjs` | N/A | ⬜ pending |
| 162-02-02 | 02 | 1 | MEB-03 | unit | `cd dashboard && npx vitest run __tests__/mcp-bridge-pde-remote.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/__tests__/mcp-relay-depth.test.ts` — stubs for MEB-02 relay depth guard
- [ ] `dashboard/__tests__/mcp-bridge-pde-remote.test.ts` — stubs for MEB-03 APPROVED_SERVERS entry

*Plan 01/02 tasks create these test files as part of implementation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cursor connects to PDE remote | MEB-01 | Requires live Cursor instance | 1. Add PDE remote to Cursor MCP config 2. Call a PDE tool 3. Verify response |
| Gemini CLI connects to PDE remote | MEB-01 | Requires live Gemini CLI | 1. Add PDE remote to Gemini config 2. Call a PDE tool 3. Verify response |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-28
