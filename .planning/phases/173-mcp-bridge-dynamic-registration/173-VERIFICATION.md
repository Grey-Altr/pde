---
phase: 173-mcp-bridge-dynamic-registration
verified: 2026-03-29T12:34:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 173: MCP Bridge Dynamic Registration Verification Report

**Phase Goal:** Approved wrappers from the registry load automatically into mcp-bridge.cjs at session init, and users have a single `pde-tools app` entry point for all discovery and registration operations
**Verified:** 2026-03-29T12:34:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Approved registry entries appear in TOOL_MAP on module load | VERIFIED | `loadDynamicServers()` called at module scope (line 312 of mcp-bridge.cjs); filters `status !== 'approved'`; writes canonical → raw name into `TOOL_MAP` |
| 2 | Pending and rejected entries are excluded from TOOL_MAP | VERIFIED | Line 255: `if (entry.status !== 'approved') continue;` — confirmed by 38 passing tests including explicit pending/rejected exclusion cases |
| 3 | Missing or corrupt registry file does not crash the bridge | VERIFIED | `safeReadFile` returns null on ENOENT (no throw); JSON parse error inside try/catch returns silently; mirrors `loadConnections` pattern exactly |
| 4 | `registerDynamicServer` populates DYNAMIC_SERVERS and TOOL_MAP for a single app | VERIFIED | Lines 292-309 implement full population; behavioral spot-check: `call('blender:blender-render', {})` returns `{"toolName":"mcp__app_blender__blender_render","args":{}}` |
| 5 | `assertApproved` accepts dynamic server keys from DYNAMIC_SERVERS | VERIFIED | Line 386: `!APPROVED_SERVERS[serverKey] && !DYNAMIC_SERVERS[serverKey]`; spot-check: `m.registerDynamicServer('test', '/tmp/s.cjs', []); m.assertApproved('test')` outputs `OK` |
| 6 | `pde-tools app register <slug>` approves and loads an app into the bridge in one command | VERIFIED | Lines 1613-1650 of pde-tools.cjs: calls `registry.approveEntry`, `registry.getEntry`, `safeReadFile` for capability-model, then `registerDynamicServer` |
| 7 | `pde-tools app register` without slug shows usage error and exits 1 | VERIFIED | Line 1615: `if (!slug) { console.error('Usage: pde-tools app register <slug>'); process.exit(1); }`; spot-check confirms exit 1 |
| 8 | `generatePythonModuleHandler` produces spawnSync handler with python3 -m argument array | VERIFIED | Line 152 of server-gen.cjs: `spawnSync('python3', ['-m', ${safeModuleLiteral}, ...args], ...)`; no shell string concatenation; spot-check confirms |
| 9 | `validateModuleName` rejects shell metacharacters and accepts valid pip names | VERIFIED | Lines 118-127 of server-gen.cjs: regex `/^[a-zA-Z0-9_-]+$/`; spot-check: rejects `rembg; echo pwned`, accepts `rembg` |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/mcp-bridge.cjs` | `loadDynamicServers`, `registerDynamicServer`, `DYNAMIC_SERVERS`, extended `assertApproved` | VERIFIED | 677 lines; all four additions present and exported; module-scope `loadDynamicServers()` call confirmed at line 312 |
| `tests/phase-173/mcp-bridge-dynamic.test.mjs` | Unit tests for REG-01 and REG-04, min 80 lines | VERIFIED | 293 lines; 19 test cases; all pass |
| `bin/lib/cli-anything/server-gen.cjs` | `validateModuleName`, `generatePythonModuleHandler` exported | VERIFIED | 258 lines; both functions present and in `module.exports` at line 258 |
| `bin/pde-tools.cjs` | `case 'register':` inside `case 'app':` switch | VERIFIED | 1663 lines; `case 'register':` at line 1613; default error string includes `register` at line 1652 |
| `tests/phase-173/server-gen-python.test.mjs` | Unit tests for REG-03, min 50 lines | VERIFIED | 97 lines; 14 test cases; all pass |
| `tests/phase-173/pde-tools-app-register.test.mjs` | Unit tests for REG-02, min 30 lines | VERIFIED | 59 lines; 5 test cases; all pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `mcp-bridge.cjs loadDynamicServers` | `app-registry.json` | `safeReadFile` + `JSON.parse` | WIRED | Line 249: `const raw = safeReadFile(rPath)` where rPath defaults to `APP_REGISTRY_PATH` |
| `mcp-bridge.cjs loadDynamicServers` | `TOOL_MAP` | capability-model.json parsing | WIRED | Line 277: `TOOL_MAP[canonical] = rawName` inside the approved-entries loop |
| `mcp-bridge.cjs assertApproved` | `DYNAMIC_SERVERS` | fallback check after APPROVED_SERVERS miss | WIRED | Line 386: `!APPROVED_SERVERS[serverKey] && !DYNAMIC_SERVERS[serverKey]` |
| `pde-tools.cjs case 'register'` | `mcp-bridge.cjs registerDynamicServer` | `require('./lib/mcp-bridge.cjs').registerDynamicServer` | WIRED | Line 1635: `const { registerDynamicServer } = require('./lib/mcp-bridge.cjs')` |
| `pde-tools.cjs case 'register'` | `app-registry.cjs approveEntry` | `registry.approveEntry(registryPath, slug)` | WIRED | Line 1617: `registry.approveEntry(registryPath, slug)` |
| `pde-tools.cjs case 'register'` | `core.cjs safeReadFile` | `safeReadFile` for capability-model.json | WIRED | Lines 1621-1623: `const { safeReadFile } = require('./lib/core.cjs'); const modelRaw = safeReadFile(modelPath)` |
| `server-gen.cjs generatePythonModuleHandler` | generated server source | `spawnSync('python3', ['-m', moduleName])` | WIRED | Line 152: `spawnSync('python3', ['-m', ${safeModuleLiteral}, ...args], ...)` with JSON.stringify literal — no injection possible |

---

### Data-Flow Trace (Level 4)

Not applicable — these artifacts are CLI tools and library modules, not components rendering dynamic state from a data source. The data flows through function arguments and return values, which are verified by the unit tests and spot-checks above.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| mcp-bridge exports all three new symbols | `node -e "const m = require('./bin/lib/mcp-bridge.cjs'); console.log(typeof m.loadDynamicServers, typeof m.registerDynamicServer, typeof m.DYNAMIC_SERVERS)"` | `function function object` | PASS |
| Dynamic server passes assertApproved | `node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.registerDynamicServer('test', '/tmp/s.cjs', []); m.assertApproved('test'); console.log('OK')"` | `OK` | PASS |
| Dynamic tool resolves via call() | `node -e "m.registerDynamicServer('blender', '/tmp/s.cjs', [{name:'blender_render'}]); console.log(JSON.stringify(m.call('blender:blender-render', {})))"` | `{"toolName":"mcp__app_blender__blender_render","args":{}}` | PASS |
| server-gen exports both new functions | `node -e "const s = require('./bin/lib/cli-anything/server-gen.cjs'); console.log(typeof s.validateModuleName, typeof s.generatePythonModuleHandler)"` | `function function` | PASS |
| pde-tools app register no-slug error | `node bin/pde-tools.cjs app register 2>&1; echo "exit: $?"` | `Usage: pde-tools app register <slug>\nexit: 1` | PASS |
| validateModuleName rejects shell metachar | `node -e "require('./bin/lib/cli-anything/server-gen.cjs').validateModuleName('rembg; echo pwned')"` | Throws `Invalid pip module name` | PASS |
| generatePythonModuleHandler uses spawnSync arg array | Generated handler string | Contains `spawnSync('python3', ['-m',`; no BINARY; contains DRY_RUN | PASS |
| All phase 173 tests pass | `npx vitest run tests/phase-173/` | 38/38 pass | PASS |
| Full test suite — no regressions | `npx vitest run` | 62/62 pass across 15 suites | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REG-01 | 173-01 | `mcp-bridge.cjs` gains `loadDynamicServers(registryPath)` reading registry.json at module init, populating approved entries into TOOL_MAP | SATISFIED | Implemented as `loadDynamicServers(registryPath, projectRoot)` — second param added for testability (intentional deviation from REQ wording "APPROVED_SERVERS" → actually uses `DYNAMIC_SERVERS`; the intent — approved entries available at init — is fully met and the security gate works via assertApproved's dual-map check) |
| REG-02 | 173-02 | `pde-tools app` subcommand as user-facing CLI entry point (discover, wrap, register, list, probe) | SATISFIED | `case 'register':` added to pde-tools.cjs; default error string lists all 6 subcommands including register |
| REG-03 | 173-02 | `server-gen.cjs` gains `generatePythonModuleHandler()` for pip CLIs using `python -m {tool}` spawn pattern | SATISFIED | Function implemented at line 137 of server-gen.cjs; uses `spawnSync('python3', ['-m', <literal>, ...args])`; `validateModuleName` prevents injection |
| REG-04 | 173-01 | Dynamic registration uses `registerDynamicServer(slug, serverPath, caps)` for single-app registration path | SATISFIED | Function at line 292 of mcp-bridge.cjs; validates inputs; idempotent; populates both DYNAMIC_SERVERS and TOOL_MAP |

**Note on REG-01 wording:** REQUIREMENTS.md says "populating APPROVED_SERVERS + TOOL_MAP" but the implementation uses `DYNAMIC_SERVERS + TOOL_MAP`. This was a deliberate architectural decision documented in Plan 01's design decisions — separate maps keep the static security policy boundary clean. The functional requirement (approved wrappers available at session init, accessible through the security gate) is fully met. The REQUIREMENTS.md text is a pre-implementation draft artifact; the Plan 01 must_haves accurately reflect the agreed design.

---

### Anti-Patterns Found

None. No TODO/FIXME/PLACEHOLDER markers in modified files. No empty implementations. No hardcoded stub returns. The `DYNAMIC_SERVERS = {}` initializer is correct module-level initialization (populated by `loadDynamicServers()` at require time), not a stub.

---

### Human Verification Required

None — all behaviors were verifiable programmatically via spot-checks and the full test suite.

---

### Gaps Summary

No gaps. All 9 observable truths verified. All 6 artifacts confirmed substantive, wired, and data-flowing. All 4 requirement IDs (REG-01 through REG-04) satisfied. Full test suite passes with no regressions (62/62). Phase goal is achieved.

---

_Verified: 2026-03-29T12:34:00Z_
_Verifier: Claude (gsd-verifier)_
