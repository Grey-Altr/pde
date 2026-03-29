---
phase: 173-mcp-bridge-dynamic-registration
plan: "01"
subsystem: mcp-bridge
tags: [mcp, dynamic-registration, security, tool-map]
dependency_graph:
  requires:
    - bin/lib/core.cjs (safeReadFile)
    - bin/lib/app-registry.cjs schema (registry entry format)
    - .planning/app-registry.json (runtime — populated by Phase 171)
    - .planning/app-wrappers/{slug}/capability-model.json (runtime — populated by Phase 172)
  provides:
    - loadDynamicServers() — approved registry entries populate TOOL_MAP at session init
    - registerDynamicServer() — single-app runtime registration
    - DYNAMIC_SERVERS — registry of dynamically approved app servers
    - Extended assertApproved — dynamic server keys pass the security gate
  affects:
    - bin/pde-tools.cjs (consumers of assertApproved, TOOL_MAP, call())
    - Phase 173 Plan 02 (pde-tools app register subcommand depends on registerDynamicServer)
tech_stack:
  added: []
  patterns:
    - safeReadFile pattern (mirrors loadConnections — null-on-ENOENT, silent JSON parse errors)
    - Module-scope initialization (loadDynamicServers() called once at require time)
    - Dual-map security gate (APPROVED_SERVERS || DYNAMIC_SERVERS in assertApproved)
key_files:
  created:
    - tests/phase-173/mcp-bridge-dynamic.test.mjs
  modified:
    - bin/lib/mcp-bridge.cjs
decisions:
  - Used separate DYNAMIC_SERVERS map instead of merging into APPROVED_SERVERS to avoid
    collision with static entries and keep the security policy boundary clean
  - loadDynamicServers accepts optional (registryPath, projectRoot) parameters so tests
    can inject temp directories without mocking process.cwd()
  - TOOL_MAP canonical names use underscore-to-hyphen conversion (blender_render -> blender:blender-render)
    consistent with existing static entries in TOOL_MAP
metrics:
  duration: "6 minutes"
  completed: "2026-03-29"
  tasks_completed: 2
  files_modified: 2
---

# Phase 173 Plan 01: MCP Bridge Dynamic Registration Summary

**One-liner:** Dynamic server registration in mcp-bridge.cjs with loadDynamicServers() reading approved app-registry entries into TOOL_MAP at module init and registerDynamicServer() for runtime single-app registration, with assertApproved extended to accept DYNAMIC_SERVERS keys.

## What Was Built

`bin/lib/mcp-bridge.cjs` gained four additions:

1. **DYNAMIC_SERVERS** — empty object at module scope, populated by loadDynamicServers and registerDynamicServer
2. **loadDynamicServers(registryPath?, projectRoot?)** — reads .planning/app-registry.json, filters to `approved` entries only, populates DYNAMIC_SERVERS with server metadata and TOOL_MAP with canonical → raw MCP tool name mappings. Silently handles missing/corrupt registry (mirrors loadConnections pattern).
3. **registerDynamicServer(slug, serverPath, caps, opts?)** — single-app runtime registration. Idempotent. Validates inputs (slug, serverPath required strings; caps must be Array). Throws on invalid input.
4. **Extended assertApproved** — now checks `!APPROVED_SERVERS[serverKey] && !DYNAMIC_SERVERS[serverKey]` so dynamic servers pass the gate without weakening the static security policy.

Module-scope `loadDynamicServers()` call ensures approved wrappers are available immediately when the module is required.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (RED) | 2fbb2e3 | test(173-01): add failing tests for mcp-bridge dynamic registration |
| 2 (GREEN) | 9e17330 | feat(173-01): implement dynamic server registration in mcp-bridge.cjs |

## Tests

19 test cases in `tests/phase-173/mcp-bridge-dynamic.test.mjs`:
- loadDynamicServers: approved entry populates DYNAMIC_SERVERS + TOOL_MAP; pending/rejected entries excluded; missing registry silent; corrupt JSON silent; missing capability-model adds DYNAMIC_SERVERS entry but no tools; correct entry shape with startupMs
- registerDynamicServer: DYNAMIC_SERVERS + TOOL_MAP populated; idempotent overwrite; throws on empty slug; throws on undefined slug; throws on non-array caps; app_ prefix in TOOL_MAP; underscore-to-hyphen canonical name conversion; correct entry shape
- call() integration: dynamic TOOL_MAP entries resolve correctly
- assertApproved: dynamic server keys pass; unknown keys throw POLICY_VIOLATION; static APPROVED_SERVERS entries still pass

## Verification

```
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); console.log(typeof m.loadDynamicServers, typeof m.registerDynamicServer, typeof m.DYNAMIC_SERVERS)"
# → function function object

node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.registerDynamicServer('test', '/tmp/s.cjs', []); m.assertApproved('test'); console.log('OK')"
# → OK
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added projectRoot parameter to loadDynamicServers**
- **Found during:** Task 1 (test authoring)
- **Issue:** Plan's `loadDynamicServers(registryPath)` signature with `process.cwd()` hardcoded for app-wrappers resolution makes the function untestable with temp directories
- **Fix:** Added optional second parameter `projectRoot` (defaults to `process.cwd()`). Tests pass `dir` as projectRoot so capability-model.json resolves inside the temp directory.
- **Files modified:** bin/lib/mcp-bridge.cjs, tests/phase-173/mcp-bridge-dynamic.test.mjs
- **Commit:** 9e17330

## Known Stubs

None — all implementation is complete and functional. DYNAMIC_SERVERS starts empty at runtime until loadDynamicServers() runs at module init; this is correct behavior (not a stub).

## Self-Check: PASSED
