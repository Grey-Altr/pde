---
phase: 157
slug: dashboard-webmcp-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 157-01-01 | 01 | 0 | BRW-01 | unit | `npm test -- --run __tests__/webmcp-browser-tools.test.ts` | No — Wave 0 | pending |
| 157-01-02 | 01 | 0 | BRW-02 | unit | `npm test -- --run __tests__/webmcp-lifecycle.test.ts` | No — Wave 0 | pending |
| 157-01-03 | 01 | 0 | BRW-03 | unit | `npm test -- --run __tests__/webmcp-browser-tools.test.ts` | No — Wave 0 | pending |
| 157-01-04 | 01 | 0 | BRW-04 | unit | `npm test -- --run __tests__/use-mcp-client.test.ts` | No — Wave 0 | pending |
| 157-01-05 | 01 | 0 | BRW-05 | unit | `npm test -- --run __tests__/context-sync-webmcp.test.ts` | No — Wave 0 | pending |
| 157-01-06 | 01 | 0 | BRW-06 | unit | `npm test -- --run __tests__/context-sync-webmcp.test.ts` | No — Wave 0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/__tests__/webmcp-browser-tools.test.ts` — stubs for BRW-01, BRW-03
- [ ] `dashboard/__tests__/webmcp-lifecycle.test.ts` — stubs for BRW-02
- [ ] `dashboard/__tests__/use-mcp-client.test.ts` — stubs for BRW-04
- [ ] `dashboard/__tests__/context-sync-webmcp.test.ts` — stubs for BRW-05, BRW-06
- [ ] Install packages: `cd dashboard && npm install @mcp-b/react-webmcp@2.2.0 @mcp-b/global@2.2.0 zod-to-json-schema@3.25.2`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser AI agent sees PDE tools in navigator.modelContext | BRW-01 | Requires real browser with WebMCP-capable AI agent | Open dashboard in Chrome with WebMCP-compatible extension, verify tools appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
