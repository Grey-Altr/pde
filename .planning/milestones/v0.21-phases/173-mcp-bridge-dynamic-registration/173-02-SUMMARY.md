---
phase: 173-mcp-bridge-dynamic-registration
plan: "02"
subsystem: cli-anything, pde-tools
tags: [server-gen, pip-module, shell-injection, pde-tools, app-register, tdd]
dependency_graph:
  requires:
    - bin/lib/mcp-bridge.cjs (registerDynamicServer — from Plan 01)
    - bin/lib/app-registry.cjs (approveEntry, getEntry)
    - bin/lib/core.cjs (safeReadFile)
    - .planning/app-wrappers/{slug}/capability-model.json (runtime — Phase 172 output)
  provides:
    - validateModuleName() — rejects shell metacharacters in pip module names
    - generatePythonModuleHandler() — spawnSync handler with python3 -m argument array
    - pde-tools app register <slug> — approve + load app into bridge in one command
  affects:
    - bin/lib/cli-anything/server-gen.cjs (consumers of pip CLI server generation)
    - Phase 174 CLI Wrap Skill (depends on register subcommand being stable)
tech_stack:
  added: []
  patterns:
    - TDD (Red-Green cycle for both feature units)
    - spawnSync with argument array (prevents shell injection in generated handlers)
    - safeReadFile over fs.readFileSync (null-on-ENOENT, established codebase pattern)
    - Inline require() pattern (matches existing case 'app': subcommand pattern)
key_files:
  created:
    - tests/phase-173/server-gen-python.test.mjs
    - tests/phase-173/pde-tools-app-register.test.mjs
  modified:
    - bin/lib/cli-anything/server-gen.cjs
    - bin/pde-tools.cjs
decisions:
  - Use safeReadFile (not fs.readFileSync) in register case — returns null on ENOENT instead of throwing, consistent with loadConnections() pattern
  - validateModuleName uses /^[a-zA-Z0-9_-]+$/ regex — pip package naming convention, rejects all shell metacharacters
  - generatePythonModuleHandler embeds module name as JSON literal in spawnSync argument array — no runtime variable injection possible
metrics:
  duration: "5 minutes"
  completed: "2026-03-29"
  tasks_completed: 3
  files_modified: 4
  tests_added: 19
---

# Phase 173 Plan 02: Pip Handler + App Register Subcommand Summary

**One-liner:** pip module handler for server-gen.cjs using spawnSync python3 -m argument array, plus pde-tools app register subcommand that approves and loads into bridge in one command.

## What Was Built

**REG-03: generatePythonModuleHandler** (`bin/lib/cli-anything/server-gen.cjs`)

- `validateModuleName(moduleName)` — rejects shell metacharacters via `/^[a-zA-Z0-9_-]+$/` regex; throws `"moduleName must be a non-empty string"` for empty/non-string, `"Invalid pip module name"` for invalid characters
- `generatePythonModuleHandler(moduleName, cap)` — produces an async handler body using `spawnSync('python3', ['-m', <literal>, ...args], ...)` with no shell string concatenation; mirrors the internal `generateToolHandler` but targets pip CLIs
- Both exported from `module.exports`

**REG-02: pde-tools app register** (`bin/pde-tools.cjs`)

- New `case 'register':` in the `case 'app':` switch
- Flow: (1) `registry.approveEntry(registryPath, slug)`, (2) `registry.getEntry` for displayName, (3) `safeReadFile` for capability-model.json, (4) `registerDynamicServer(slug, serverPath, caps, opts)`
- Exits 1 with `Usage: pde-tools app register <slug>` when slug is missing
- Default error message updated to include `register` in Available subcommands list
- Uses `safeReadFile` from `./lib/core.cjs` (not `fs.readFileSync`) for graceful ENOENT handling

## Tests

| File | Tests | Status |
|------|-------|--------|
| tests/phase-173/server-gen-python.test.mjs | 14 | All pass |
| tests/phase-173/pde-tools-app-register.test.mjs | 5 | All pass |
| tests/phase-173/ (all Phase 173) | 38 | All pass |

## Deviations from Plan

None — plan executed exactly as written. The `safeReadFile` pattern was specified in the plan and followed accordingly.

## Known Stubs

None — all functionality is fully wired. The `pde-tools app register` command calls real modules (`approveEntry`, `getEntry`, `registerDynamicServer`) with real data paths.

## Self-Check: PASSED

All created/modified files verified:
- `tests/phase-173/server-gen-python.test.mjs` — created, 14 tests pass
- `tests/phase-173/pde-tools-app-register.test.mjs` — created, 5 tests pass
- `bin/lib/cli-anything/server-gen.cjs` — modified, exports `validateModuleName` and `generatePythonModuleHandler`
- `bin/pde-tools.cjs` — modified, contains `case 'register':` with `safeReadFile` and `registerDynamicServer`

Commits verified:
- `4258ded` — feat(173-02): add validateModuleName and generatePythonModuleHandler to server-gen.cjs
- `555756c` — test(173-02): add failing tests for pde-tools app register subcommand (RED phase)
- `22fe1a1` — feat(173-02): implement pde-tools app register subcommand (GREEN phase)
