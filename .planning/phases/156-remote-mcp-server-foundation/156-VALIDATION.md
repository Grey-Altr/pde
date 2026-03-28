---
phase: 156
slug: remote-mcp-server-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 156 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest) |
| **Config file** | `dashboard/vitest.config.ts` |
| **Quick run command** | `npm test -- --run __tests__/mcp-*.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run __tests__/mcp-*.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 156-01-01 | 01 | 1 | RMT-01 | integration | `npm test -- --run __tests__/mcp-route.test.ts` | ❌ W0 | ⬜ pending |
| 156-01-02 | 01 | 1 | RMT-02 | unit | `npm test -- --run __tests__/mcp-auth.test.ts` | ❌ W0 | ⬜ pending |
| 156-01-03 | 01 | 1 | RMT-02 | integration | `npm test -- --run __tests__/mcp-well-known.test.ts` | ❌ W0 | ⬜ pending |
| 156-01-04 | 01 | 1 | RMT-03 | unit | `npm test -- --run __tests__/mcp-origin-guard.test.ts` | ❌ W0 | ⬜ pending |
| 156-01-05 | 01 | 1 | RMT-04 | integration | `npm test -- --run __tests__/mcp-route.test.ts` | ❌ W0 | ⬜ pending |
| 156-01-06 | 01 | 1 | RMT-05 | unit | `npm test -- --run __tests__/server-factory.test.ts` | ❌ W0 | ⬜ pending |
| 156-01-07 | 01 | 1 | RMT-06 | unit | `npm test -- --run __tests__/mcp-polling-tools.test.ts` | ❌ W0 | ⬜ pending |
| 156-01-08 | 01 | 1 | RMT-07 | manual | review docs | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/__tests__/mcp-route.test.ts` — stubs for RMT-01, RMT-04
- [ ] `dashboard/__tests__/mcp-auth.test.ts` — stubs for RMT-02 token validation
- [ ] `dashboard/__tests__/mcp-well-known.test.ts` — stubs for RMT-02 metadata endpoints
- [ ] `dashboard/__tests__/mcp-origin-guard.test.ts` — stubs for RMT-03
- [ ] `dashboard/__tests__/server-factory.test.ts` — stubs for RMT-05
- [ ] `dashboard/__tests__/mcp-polling-tools.test.ts` — stubs for RMT-06

*Test infrastructure (Vitest, `next-test-api-route-handler`) is already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop client config docs exist and are correct | RMT-07 | Documentation review — no automated assertion | Review that README/docs include Claude Code `--transport http`, Cursor `"url"` key, and `npx mcp-remote` fallback configs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
