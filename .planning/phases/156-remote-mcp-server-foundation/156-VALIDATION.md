---
phase: 156
slug: remote-mcp-server-foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
validated: 2026-03-28
---

# Phase 156 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest) |
| **Config file** | `dashboard/vitest.config.ts` |
| **Quick run command** | `cd dashboard && npm test -- --run __tests__/mcp-*.test.ts __tests__/server-factory.test.ts` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~0.3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npm test -- --run __tests__/mcp-*.test.ts __tests__/server-factory.test.ts`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 156-01-01 | 01 | 1 | RMT-01 | integration | `cd dashboard && npx vitest run __tests__/mcp-route.test.ts` | Yes (8 tests) | green |
| 156-01-02 | 01 | 1 | RMT-02 | unit | `cd dashboard && npx vitest run __tests__/mcp-auth.test.ts` | Yes (4 tests) | green |
| 156-01-03 | 01 | 1 | RMT-02 | integration | `cd dashboard && npx vitest run __tests__/mcp-well-known.test.ts` | Yes (4 tests) | green |
| 156-01-04 | 01 | 1 | RMT-03 | unit | `cd dashboard && npx vitest run __tests__/mcp-origin-guard.test.ts` | Yes (4 tests) | green |
| 156-01-05 | 01 | 1 | RMT-04 | integration | `cd dashboard && npx vitest run __tests__/mcp-route.test.ts` | Yes (shared) | green |
| 156-01-06 | 01 | 1 | RMT-05 | unit | `cd dashboard && npx vitest run __tests__/server-factory.test.ts` | Yes (3 tests) | green |
| 156-01-07 | 01 | 1 | RMT-06 | unit | `cd dashboard && npx vitest run __tests__/mcp-polling-tools.test.ts` | Yes (4 tests) | green |
| 156-01-08 | 01 | 1 | RMT-07 | manual | review docs | — | green |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `dashboard/__tests__/mcp-route.test.ts` — 8 tests for RMT-01, RMT-04
- [x] `dashboard/__tests__/mcp-auth.test.ts` — 4 tests for RMT-02 token validation
- [x] `dashboard/__tests__/mcp-well-known.test.ts` — 4 tests for RMT-02 metadata endpoints
- [x] `dashboard/__tests__/mcp-origin-guard.test.ts` — 4 tests for RMT-03
- [x] `dashboard/__tests__/server-factory.test.ts` — 3 tests for RMT-05
- [x] `dashboard/__tests__/mcp-polling-tools.test.ts` — 4 tests for RMT-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop client config docs exist and are correct | RMT-07 | Documentation review — no automated assertion | Review that docs include Claude Code, Cursor, and npx mcp-remote relay configs |
| E2E OAuth flow with Clerk token | RMT-02 | Requires deployed environment with Clerk | Deploy to Vercel, authenticate via Clerk, verify MCP connection |
| 401 vs 307 redirect behavior | RMT-02 | Browser redirect behavior differs from API calls | Test in real browser with expired token |
| Stateless mode confirmation | RMT-04 | Requires live MCP client connection | Connect via npx mcp-remote, verify no Mcp-Session-Id headers |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (measured: ~0.3s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete 2026-03-28

---

## Validation Audit 2026-03-28

| Metric | Count |
|--------|-------|
| Requirements audited | 7 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 50 |
| All green | Yes |
