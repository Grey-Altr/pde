---
phase: 157-dashboard-webmcp-tools
plan: "01"
subsystem: dashboard/webmcp
tags: [webmcp, polyfill, mcp-client, testing, browser-tools]
dependency_graph:
  requires: []
  provides: [WebMCP polyfill initialization, useMcpClient hook, Wave 0 test scaffolds]
  affects: [dashboard/components/providers.tsx, dashboard/lib/mcp/use-mcp-client.ts]
tech_stack:
  added:
    - "@mcp-b/react-webmcp@2.2.0"
    - "@mcp-b/global@2.2.0"
    - "zod-to-json-schema@3.25.2"
  patterns:
    - "Source-inspection tests (readFileSync) — project uses node vitest env, not jsdom"
    - "useEffect guard for SSR-safe browser API calls"
    - "Stateless JSON-RPC 2.0 fetch with SSE fallback parsing"
key_files:
  created:
    - dashboard/lib/mcp/use-mcp-client.ts
    - dashboard/__tests__/use-mcp-client.test.ts
    - dashboard/__tests__/webmcp-browser-tools.test.ts
    - dashboard/__tests__/webmcp-lifecycle.test.ts
  modified:
    - dashboard/package.json
    - dashboard/components/providers.tsx
decisions:
  - "Used source-inspection (readFileSync) tests instead of renderHook — project vitest config uses node environment (not jsdom), @testing-library/react not installed"
  - "WebMcpInitializer is an internal (unexported) component in providers.tsx — isolates lifecycle to a single mount point"
  - "useMcpClient uses no SDK imports — raw fetch only, consistent with Phase 156 stateless transport decision"
metrics:
  duration: "5m"
  completed: "2026-03-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
requirements-completed: [BRW-01, BRW-04]
---

# Phase 157 Plan 01: WebMCP Foundation Setup Summary

**One-liner:** WebMCP polyfill initialized in providers.tsx via SSR-safe useEffect, plus thin fetch-based JSON-RPC 2.0 hook (useMcpClient) with no SDK dependencies and source-inspection test scaffolds for BRW-01/BRW-02/BRW-04.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install WebMCP packages and create Wave 0 test scaffolds | 8d06062 | dashboard/package.json, 3 test files |
| 2 | WebMCP initialization in providers.tsx and use-mcp-client.ts hook | 93acea0 | providers.tsx, lib/mcp/use-mcp-client.ts |

## What Was Built

### providers.tsx — WebMCP Polyfill Initialization (BRW-01)

Added an internal `WebMcpInitializer` component that calls `initializeWebModelContext()` from `@mcp-b/global` inside a `useEffect(() => {}, [])`. This:
- Runs only on mount (empty dep array)
- Is SSR-safe (navigator only accessed after hydration, inside useEffect)
- Is idempotent (safe to call multiple times — @mcp-b/global handles deduplication)
- Renders before `{children}` so polyfill is active before any useWebMCP() calls in child components

### lib/mcp/use-mcp-client.ts — Thin Fetch-Based MCP Hook (BRW-04)

`useMcpClient({ endpoint, getToken })` returns `{ callTool, state, error }`:
- State machine: `idle` → `calling` → `done` | `error`
- Sends JSON-RPC 2.0 POST with `Content-Type: application/json` and `Accept: application/json, text/event-stream`
- Optional Bearer token via `getToken?: () => Promise<string | null>`
- Handles both `application/json` and `text/event-stream` (SSE `data:` line parsing)
- Zero SDK imports — raw `fetch` only (Phase 156 stateless transport decision)

### Wave 0 Test Scaffolds

Three test files using source-inspection pattern (project-standard — no jsdom/JSDOM):

- `__tests__/webmcp-lifecycle.test.ts`: Verifies `@mcp-b/react-webmcp` exports `useWebMCP` and validates useEffect lifecycle structure in providers.tsx (BRW-02)
- `__tests__/webmcp-browser-tools.test.ts`: Validates WebMcpInitializer initialization pattern + BRW-03 todos for Plan 03 (BRW-01/BRW-03)
- `__tests__/use-mcp-client.test.ts`: Source structure checks + fetch construction behavior tests (BRW-04)

**Test results:** 24 passing, 3 todos (BRW-03 stubs for Plan 03), 0 failures. Full suite: 276/276 passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Project Convention] Used source-inspection tests instead of renderHook**
- **Found during:** Task 1
- **Issue:** Plan specified `renderHook` from `@testing-library/react` which requires jsdom environment. Project vitest config uses `environment: 'node'` and `@testing-library/react` is not installed.
- **Fix:** Used `readFileSync` source-inspection pattern (project-standard — every existing component test uses this approach)
- **Files modified:** All three test files
- **Impact:** Tests validate same structural requirements — SSR-safety, correct import patterns, hook exports, header values

**2. [Rule 1 - Bug] Fixed test — comment line matched before actual call**
- **Found during:** Task 2 verification
- **Issue:** `webmcp-browser-tools.test.ts` indentation check found the comment `// initializeWebModelContext() is idempotent` (column 0) before the actual indented call
- **Fix:** Added `.trimStart().startsWith('//')` filter to skip comment lines in `findIndex`
- **Commit:** 93acea0

## Known Stubs

None. The BRW-03 todos in `webmcp-browser-tools.test.ts` are intentional placeholders for Plan 03 (tool registration), not missing functionality for this plan's goals.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| dashboard/lib/mcp/use-mcp-client.ts | FOUND |
| dashboard/components/providers.tsx | FOUND |
| dashboard/__tests__/use-mcp-client.test.ts | FOUND |
| dashboard/__tests__/webmcp-browser-tools.test.ts | FOUND |
| dashboard/__tests__/webmcp-lifecycle.test.ts | FOUND |
| Commit 8d06062 (Task 1) | FOUND |
| Commit 93acea0 (Task 2) | FOUND |
