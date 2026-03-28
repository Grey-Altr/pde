---
phase: 158
slug: mcp-apps-rich-ui-design-artifact-preview
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
updated: 2026-03-28
---

# Phase 158 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `npx vitest run __tests__/server-factory.test.ts __tests__/mcp-rich-ui.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~250ms (phase tests), ~930ms (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run __tests__/server-factory.test.ts __tests__/mcp-rich-ui.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** <1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 158-01-01 | 01 | 1 | RUI-01 | unit | `npx vitest run __tests__/server-factory.test.ts` | ✅ | ✅ green |
| 158-01-02 | 01 | 1 | RUI-01 | unit | `npx vitest run __tests__/server-factory.test.ts` | ✅ | ✅ green |
| 158-01-03 | 01 | 1 | RUI-02 | unit | `npx vitest run __tests__/server-factory.test.ts` | ✅ | ✅ green |
| 158-02-01 | 02 | 2 | RUI-03 | unit | `npx vitest run __tests__/mcp-rich-ui.test.ts` | ✅ | ✅ green |
| 158-02-02 | 02 | 2 | RUI-03 | unit | `npx vitest run __tests__/mcp-rich-ui.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Detail

| Requirement | Test File | Tests | Behaviors Verified |
|-------------|-----------|-------|--------------------|
| RUI-01 | `server-factory.test.ts` | 2 | registerAppTool called with tool name; resource with MIME type registered |
| RUI-02 | `server-factory.test.ts` | 1 | Resource callback returns `_meta.ui.csp.connectDomains` array |
| RUI-03 | `mcp-rich-ui.test.ts` | 7 | URI pattern `ui://pde/{artifact}`; MIME type; CSP connectDomains; Markdown rendering via marked; HTML pass-through with tokens.css inlining; JSON pretty-print in pre block; error HTML for missing artifacts |

**Total:** 3/3 requirements covered, 13/13 tests green, 0 gaps

---

## Wave 0 Requirements

- [x] Test stubs for RUI-01 (rich HTML tool responses) — `server-factory.test.ts`
- [x] Test stubs for RUI-02 (plain text fallback) — `server-factory.test.ts`
- [x] Test stubs for RUI-03 (resource URI scheme) — `mcp-rich-ui.test.ts`
- [x] Shared test fixtures for MCP server mock — vi.fn() mocks in both test files

*All Wave 0 requirements satisfied during plan execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTML panel renders in MCP Apps client | RUI-01 | Requires MCP Apps-capable AI chat client | Open Claude desktop, invoke PDE tool, verify HTML panel appears |
| CSP callback works without errors | RUI-02 | Browser CSP enforcement is runtime-only | Trigger tool with connectDomains, verify no console CSP errors |
| Stdio client receives clean text fallback | RUI-01 | Requires stdio-only MCP client | Connect via stdio, invoke preview_artifact, verify text-only output |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s (actual: <1s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ Nyquist-compliant (2026-03-28)

---

## Validation Audit 2026-03-28

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Requirements covered | 3/3 |
| Tests passing | 13/13 |
| Test files | 2 |
