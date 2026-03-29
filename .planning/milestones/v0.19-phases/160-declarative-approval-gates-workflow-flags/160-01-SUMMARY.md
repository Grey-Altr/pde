---
phase: 160-declarative-approval-gates-workflow-flags
plan: 01
subsystem: dashboard/webmcp
tags: [webmcp, approval-gates, browser-tools, api-route, clerk-auth]
dependency_graph:
  requires: []
  provides: [pde_approval_gate WebMCP tool, /api/planning/gates GET+POST]
  affects: [dashboard/hooks/use-webmcp-tools.ts, dashboard/lib/mcp/browser-tools/index.ts]
tech_stack:
  added: []
  patterns: [source-inspection tests, useWebMCP hook, Clerk auth guard, fs.readFileSync/writeFileSync for local planning files]
key_files:
  created:
    - dashboard/lib/mcp/browser-tools/use-approval-gate-tool.ts
    - dashboard/app/api/planning/gates/route.ts
    - dashboard/lib/__tests__/approval-gate-tool.test.ts
    - dashboard/lib/__tests__/planning-gates.test.ts
  modified:
    - dashboard/lib/mcp/browser-tools/index.ts
    - dashboard/hooks/use-webmcp-tools.ts
decisions:
  - inputSchema const at module level outside hook function (Phase 157 pattern — prevents zombie re-registration on re-renders)
  - filesystem write in route.ts is intentional — PDE runs locally, .planning/gates/ is a local workflow artifact (same pattern as existing design-state and approval-response routes)
metrics:
  duration: "~3 minutes"
  completed: "2026-03-28T21:51:38Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
---

# Phase 160 Plan 01: Declarative Approval Gates — WebMCP Tool + API Route Summary

**One-liner:** pde_approval_gate WebMCP tool with gate_id/action/reject schema backed by /api/planning/gates REST route, Clerk-authenticated, wired into composite hook.

## What Was Built

A browser AI agent can now call `pde_approval_gate` to approve or reject pending PDE workflow gates without navigating the dashboard UI. The implementation consists of:

1. **`use-approval-gate-tool.ts`** — WebMCP browser tool hook registering `pde_approval_gate` with three parameters: `gate_id` (string), `action` (enum: approve|reject), and `reason` (optional string). inputSchema defined at module level per Phase 157 decision.

2. **`/api/planning/gates` route** — GET handler lists all `*.json` files from `.planning/gates/` filtered to `status: "pending"`. POST handler requires Clerk auth, validates gate_id and action, reads the gate JSON file, updates status/decided_at/reason, and writes back.

3. **Barrel + composite hook wiring** — `useApprovalGateTool` exported from browser-tools index, called in `useWebMcpTools()` so it auto-registers on dashboard load.

4. **Source-inspection tests** — 20 tests total across both test files, all passing.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create approval gate browser tool hook + API route + tests | 4139a59 | use-approval-gate-tool.ts, gates/route.ts, approval-gate-tool.test.ts, planning-gates.test.ts |
| 2 | Wire approval gate tool into composite hook and barrel export | 8946892 | browser-tools/index.ts, hooks/use-webmcp-tools.ts |

## Test Results

```
Test Files  2 passed (2)
Tests       20 passed (20)
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The approval gate tool makes real fetch calls to a real API route. The route reads and writes real `.planning/gates/*.json` files. No placeholder data.

## Self-Check: PASSED

- FOUND: dashboard/lib/mcp/browser-tools/use-approval-gate-tool.ts
- FOUND: dashboard/app/api/planning/gates/route.ts
- FOUND: dashboard/lib/__tests__/approval-gate-tool.test.ts
- FOUND: dashboard/lib/__tests__/planning-gates.test.ts
- FOUND: commit 4139a59
- FOUND: commit 8946892
