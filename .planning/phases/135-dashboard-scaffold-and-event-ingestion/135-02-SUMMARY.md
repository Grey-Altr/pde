---
phase: 135-dashboard-scaffold-and-event-ingestion
plan: "02"
subsystem: dashboard
tags: [ingest, redis, pipeline, bearer-auth, zod, next-api-route]
dependency_graph:
  requires: [135-01]
  provides: [ingest-endpoint]
  affects: [dashboard/app/api/ingest/route.ts]
tech_stack:
  added: []
  patterns: [redis-pipeline-batch-write, bearer-token-auth, zod-batch-validation, tdd-red-green]
key_files:
  created:
    - dashboard/app/api/ingest/route.ts
    - dashboard/lib/__tests__/ingest.test.ts
  modified: []
decisions:
  - "Batch size capped at 100 events per ingest request (Claude's discretion per plan spec)"
  - "TDD RED commit before implementation; GREEN commit after all 8 tests pass"
metrics:
  duration: "~12 minutes"
  completed: "2026-03-25"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
requirements-completed: [DSH-01, DSH-06]
---

# Phase 135 Plan 02: Event Ingest Endpoint Summary

**One-liner:** POST /api/ingest with Bearer auth, zod batch validation (1-100 events), and Upstash Redis pipeline writes (events sorted set + session registry + metadata hash).

## What Was Built

`dashboard/app/api/ingest/route.ts` — the entry point for all PDE relay events into the dashboard. Accepts POST requests with Bearer token authentication, validates event batches with zod, and writes them to Upstash Redis in a single pipeline round-trip.

### Endpoint Behavior

| Condition | Response |
|-----------|----------|
| Missing or wrong Bearer token | 401 `{ error: 'Unauthorized' }` |
| Invalid JSON body | 400 `{ error: 'Invalid JSON' }` |
| Schema invalid / empty / > 100 events | 422 `{ error: result.error.flatten() }` |
| Valid batch (1-100 events) | 200 `{ ok: true, count: N }` |

### Redis Key Pattern (D-01, D-02, D-03)

- `pde:default:events:{session_id}` — sorted set, score = relay_ts epoch ms, member = JSON event
- `pde:default:sessions` — sorted set, score = Date.now(), member = session_id (registry)
- `pde:default:session:{session_id}` — hash, fields: last_event_ts, last_event_type, phase, plan, started_at

All writes use `redis.pipeline()` for a single HTTP round-trip to Upstash (D-03).

## TDD Flow

**RED commit:** `308e193` — 8 failing tests written before implementation
**GREEN commit:** `c141d0c` — route handler implemented, all 8 tests pass

## Tests

8 integration tests in `dashboard/lib/__tests__/ingest.test.ts`:

1. Missing Authorization header returns 401
2. Wrong Bearer token returns 401
3. Invalid JSON body returns 400
4. Schema-invalid events returns 422
5. Empty array returns 422 (min 1)
6. Array of 101 events returns 422 (max 100)
7. Valid batch returns 200 `{ ok: true, count: N }`
8. Valid batch triggers pipeline() with zadd + hset + exec calls

Full suite: 20/20 pass (4 test files — no regressions from 135-01).

## Decisions Made

- **Batch size cap:** 100 events per ingest request (plan grants Claude's discretion; 100 is a safe ceiling that prevents oversized payloads)
- **TDD approach:** RED commit first to lock in behavior spec, then GREEN implementation

## Deviations from Plan

### Pre-execution Setup

**[Rule 3 - Blocker] Merged 135-01 commits into worktree before starting**

- **Found during:** Setup — worktree branch was tracking origin/main which lacked 135-01 scaffold
- **Issue:** dashboard/ directory and all shared libs (redis.ts, auth.ts, wire-schema.ts) didn't exist in this worktree
- **Fix:** `git fetch` from local main repo + fast-forward merge to bring in the 3 commits from 135-01
- **Commit:** Fast-forward merge (no additional commit needed, existing 135-01 commits absorbed)

**[Rule 3 - Blocker] Ran npm install in dashboard/ worktree**

- **Found during:** RED test run — vitest couldn't load `@vitejs/plugin-react`
- **Issue:** node_modules are gitignored; the worktree has its own filesystem path separate from main repo dashboard
- **Fix:** `cd dashboard && npm install` to install 461 packages from package-lock.json
- **Commit:** No commit needed (node_modules is gitignored)

## Commits

| Hash | Message |
|------|---------|
| `308e193` | `test(135-02): add failing tests for /api/ingest endpoint` |
| `c141d0c` | `feat(135-02): implement /api/ingest POST endpoint` |

## Self-Check: PASSED

- FOUND: dashboard/app/api/ingest/route.ts
- FOUND: dashboard/lib/__tests__/ingest.test.ts
- FOUND commit: 308e193 (test RED)
- FOUND commit: c141d0c (feat GREEN)
- 20/20 tests pass, no regressions
