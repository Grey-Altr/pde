---
phase: 157
slug: dashboard-webmcp-tools
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 157 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest) |
| **Config file** | `dashboard/vitest.config.ts` |
| **Quick run command** | `cd dashboard && npm test -- --run __tests__/webmcp-*.test.ts` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npm test -- --run __tests__/webmcp-*.test.ts`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 157-01-01 | 01 | 1 | BRW-01 | unit | `cd dashboard && npx vitest run __tests__/webmcp-browser-tools.test.ts` | Yes (4 tests) | green |
| 157-01-02 | 01 | 1 | BRW-02 | unit | `cd dashboard && npx vitest run __tests__/webmcp-lifecycle.test.ts` | Yes (7 tests) | green |
| 157-01-03 | 03 | 2 | BRW-03 | unit | `cd dashboard && npx vitest run __tests__/webmcp-browser-tools.test.ts` | Yes (7 tests) | green |
| 157-01-04 | 01 | 1 | BRW-04 | unit | `cd dashboard && npx vitest run __tests__/use-mcp-client.test.ts` | Yes (13 tests) | green |
| 157-01-05 | 02 | 1 | BRW-05 | unit | `npx vitest run tests/context-sync-webmcp.test.cjs` | Yes (6 tests) | green |
| 157-01-06 | 02 | 1 | BRW-06 | unit | `npx vitest run tests/context-sync-webmcp.test.cjs` | Yes (2 tests) | green |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `dashboard/__tests__/webmcp-browser-tools.test.ts` — 11 tests for BRW-01, BRW-03
- [x] `dashboard/__tests__/webmcp-lifecycle.test.ts` — 7 tests for BRW-02
- [x] `dashboard/__tests__/use-mcp-client.test.ts` — 13 tests for BRW-04
- [x] `tests/context-sync-webmcp.test.cjs` — 8 tests for BRW-05, BRW-06
- [x] Packages installed: @mcp-b/react-webmcp@2.2.0, @mcp-b/global@2.2.0, zod-to-json-schema@3.25.2

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser AI agent sees PDE tools in navigator.modelContext | BRW-01 | Requires real browser with WebMCP-capable AI agent | Open dashboard in Chrome with WebMCP-compatible extension, verify tools appear |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (measured: ~0.3s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-03-28

| Metric | Count |
|--------|-------|
| Requirements audited | 6 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 39 |
| All green | Yes |
