---
phase: 156-remote-mcp-server-foundation
plan: 01
subsystem: dashboard/mcp
tags: [mcp, server-factory, origin-guard, wave0, testing, infrastructure]
dependency_graph:
  requires: []
  provides:
    - dashboard/lib/mcp/server-factory.ts (registerPdeTools)
    - dashboard/lib/mcp/origin-guard.ts (validateOrigin, ALLOWED_ORIGINS)
    - dashboard/lib/mcp/tools/index.ts (registerPipelineTools stub)
  affects:
    - Plans 02 and 03 (import server-factory.ts)
tech_stack:
  added:
    - mcp-handler@1.1.0
    - "@clerk/mcp-tools@0.3.1"
  patterns:
    - "Pure tool registration function (no transport lifecycle)"
    - "Null origin allowance for CLI/relay clients"
    - "Wave 0 test.todo() scaffolding for multi-plan TDD"
key_files:
  created:
    - dashboard/lib/mcp/server-factory.ts
    - dashboard/lib/mcp/origin-guard.ts
    - dashboard/lib/mcp/tools/index.ts
    - dashboard/__tests__/server-factory.test.ts
    - dashboard/__tests__/mcp-origin-guard.test.ts
    - dashboard/__tests__/mcp-route.test.ts
    - dashboard/__tests__/mcp-auth.test.ts
    - dashboard/__tests__/mcp-well-known.test.ts
    - dashboard/__tests__/mcp-polling-tools.test.ts
  modified:
    - dashboard/package.json
    - dashboard/package-lock.json
decisions:
  - "Used --legacy-peer-deps for mcp-handler install due to its exact pin on SDK 1.26.0 vs project's 1.28.0 (backward-compatible per research)"
  - "Origin guard allows null origin to support CLI/relay clients that don't send Origin header (MCP spec compliant)"
  - "registerPipelineTools is a stub in tools/index.ts - Plan 03 fills it in"
  - "server-factory.ts is pure (registers tools only, no transport) - HTTP route handler owns transport lifecycle"
metrics:
  duration_seconds: 157
  completed_date: "2026-03-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 2
requirements_covered:
  - RMT-05
  - RMT-03
---

# Phase 156 Plan 01: MCP Foundation — Server Factory and Origin Guard Summary

**One-liner:** Shared McpServer tool registration factory (RMT-05) with MCP-spec-compliant Origin header guard (RMT-03) plus six Wave 0 test scaffolds for all phase requirements.

## What Was Built

### Task 1: Install MCP packages, create server factory and origin guard

- Installed `mcp-handler@1.1.0` and `@clerk/mcp-tools@0.3.1` into `dashboard/` with `--legacy-peer-deps` to resolve the SDK version pin conflict (confirmed backward-compatible in research).
- Created `dashboard/lib/mcp/origin-guard.ts`: exports `ALLOWED_ORIGINS` (Set containing `process.env.NEXT_PUBLIC_APP_URL` and `http://localhost:3000`) and `validateOrigin(req)` which returns `Response(403)` for unlisted origins and `null` for absent or allowlisted origins.
- Created `dashboard/lib/mcp/tools/index.ts`: stub `registerPipelineTools` function typed with `McpServer` — Plan 03 fills in the actual tools.
- Created `dashboard/lib/mcp/server-factory.ts`: `registerPdeTools(server)` registers `get_project_state` tool and calls `registerPipelineTools(server)`. Pure function with no transport lifecycle.
- Tests: `server-factory.test.ts` (3 tests) and `mcp-origin-guard.test.ts` (4 tests) — all 7 pass.

**Commit:** `9268d75` — `feat(156-01): install MCP packages, add server factory and origin guard`

### Task 2: Create Wave 0 test scaffolds for Plans 02 and 03

Created 4 scaffold files using `test.todo()` to define the red-state targets for subsequent plans:

- `mcp-route.test.ts`: 8 todos for RMT-01 (POST/GET/DELETE route) and RMT-04 (stateless, no Mcp-Session-Id)
- `mcp-auth.test.ts`: 4 todos for RMT-02 (Clerk OAuth token validation)
- `mcp-well-known.test.ts`: 4 todos for RMT-02 (.well-known metadata endpoints)
- `mcp-polling-tools.test.ts`: 4 todos for RMT-06 (start_pipeline_run, check_pipeline_run)

All 20 todo tests run without errors.

**Commit:** `8f69191` — `test(156-01): add Wave 0 scaffold tests for Plans 02 and 03`

## Verification

Full MCP test suite result:
- 2 test files passed (7 active tests green)
- 4 test files skipped (20 todo tests, correct Wave 0 state)
- 0 failures

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `dashboard/lib/mcp/tools/index.ts`: `registerPipelineTools` is intentionally empty. Plan 03 (RMT-06) will register `start_pipeline_run` and `check_pipeline_run` here. This is by design — the stub satisfies the import chain for server-factory.ts.

## Self-Check: PASSED

Files verified:
- dashboard/lib/mcp/server-factory.ts: FOUND
- dashboard/lib/mcp/origin-guard.ts: FOUND
- dashboard/lib/mcp/tools/index.ts: FOUND
- dashboard/__tests__/server-factory.test.ts: FOUND
- dashboard/__tests__/mcp-origin-guard.test.ts: FOUND
- dashboard/__tests__/mcp-route.test.ts: FOUND
- dashboard/__tests__/mcp-auth.test.ts: FOUND
- dashboard/__tests__/mcp-well-known.test.ts: FOUND
- dashboard/__tests__/mcp-polling-tools.test.ts: FOUND

Commits verified:
- 9268d75: FOUND (feat(156-01): install MCP packages, add server factory and origin guard)
- 8f69191: FOUND (test(156-01): add Wave 0 scaffold tests for Plans 02 and 03)
