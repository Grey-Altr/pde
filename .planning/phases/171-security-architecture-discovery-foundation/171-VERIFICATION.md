---
phase: 171-security-architecture-discovery-foundation
verified: 2026-03-29T02:15:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 171: Security Architecture + Discovery Foundation Verification Report

**Phase Goal:** Any discovered desktop application is classified and gated before any tool can invoke it -- the two-tier approval registry, five-tier binary probe, and executionMode classification are in place as the foundation every subsequent phase writes into
**Verified:** 2026-03-29T02:15:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `pde-tools app discover` returns installed apps via five-tier probe (env var, which/where, pip module, mdfind, well-known paths) | VERIFIED | `bin/pde-tools.cjs` lines 1522-1544 wire `discoverApp` then `addPendingEntry`. `probeBinary` in `app-discovery.cjs` implements all 5 tiers (lines 140-213). 31 tests pass including per-tier unit tests. CLI `app list --raw` returns `[]` (empty JSON, exit 0). |
| 2 | Every discovered app appears in registry.json with status `pending` -- no discovered app is executable until human approves | VERIFIED | `addPendingEntry` (registry.cjs:74-101) always sets `status: 'pending'`, `binaryHash: null`. `checkApproved` (registry.cjs:169-192) throws for pending/rejected/mock entries with actionable error messages. Tests verify all three rejection paths. |
| 3 | Each registry entry carries `executionMode` (`headless`/`gui-required`/`mock`) set at discovery time -- mock entries produce visible error | VERIFIED | `discoverApp` (discovery.cjs:293-328) sets `executionMode: 'mock'` when probe returns null, otherwise copies from APP_CATALOG. `checkApproved` throws `"executionMode "mock" - binary not installed"` for mock entries (registry.cjs:179-183). |
| 4 | The `col -b` preprocessing step strips backspace sequences from --help output with `parseQuality: "degraded"` annotation | VERIFIED | `preprocessHelpText` (discovery.cjs:260-282) runs `spawnSync('col', ['-b'])` with regex fallback. Returns `parseQuality: 'degraded'` when backspaces present, `'clean'` otherwise. 4 dedicated tests in `col-preprocess.test.mjs` pass. |
| 5 | `references/app-integrations.md` documents bundle IDs, pip status, executionMode, and discovery hints for Blender, GIMP, and Inkscape | VERIFIED | File exists (105 lines). Contains `org.blenderfoundation.blender`, `org.gimp.gimp`, `org.inkscape.Inkscape`. Documents pip Module, executionMode, Discovery Hints, and Env Var Override for each app. Includes Discovery Tier Reference table and GIMP 3.x breaking changes. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/app-discovery.cjs` | Five-tier binary probe, display probe, col-b preprocessing, APP_CATALOG, executionMode | VERIFIED (340 lines) | Exports: probeBinary, resolveBinaryFromBundle, probeDisplay, preprocessHelpText, discoverApp, APP_CATALOG. Uses spawnSync with argument arrays. |
| `bin/lib/app-registry.cjs` | Registry CRUD, state transitions, SHA-256 verification, approval guard | VERIFIED (268 lines) | Exports: loadRegistry, saveRegistry, addPendingEntry, approveEntry, rejectEntry, checkApproved, verifyBinaryHash, getEntry, listEntries. |
| `tests/phase-171/app-discovery.test.mjs` | Unit tests for DISC-01, DISC-03, DISC-05 | VERIFIED (242 lines, min 80 required) | Covers probeBinary tiers 1-5, null return, executionMode classification, probeDisplay (darwin/linux/win32). |
| `tests/phase-171/col-preprocess.test.mjs` | Unit tests for DISC-04 | VERIFIED (77 lines, min 30 required) | Covers clean text, col -b success, col -b failure fallback, regex bold encoding. |
| `tests/phase-171/app-registry.test.mjs` | Unit tests for DISC-02 | VERIFIED (274 lines, min 60 required) | Covers loadRegistry, addPendingEntry, approveEntry, rejectEntry, checkApproved (all error paths), verifyBinaryHash. |
| `bin/pde-tools.cjs` | app discover/probe/list/approve subcommand routing | VERIFIED | Lines 1515-1594: case 'app' with discover, probe, list, approve subcommands. Requires app-discovery.cjs and app-registry.cjs. |
| `references/app-integrations.md` | Known design app catalog for DISC-06 | VERIFIED (105 lines) | Contains all three bundle IDs, pip status, executionMode, discovery hints, tier reference table. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app-discovery.cjs` | Node.js spawnSync | spawnSync with argument arrays | WIRED | Line 6 imports spawnSync and execFileSync. Used throughout with array args `['-b']`, `['aux']`, etc. No shell string invocation. |
| `app-discovery.cjs` | APP_CATALOG | Catalog lookup for executionMode | WIRED | `discoverApp` (line 295) uses `APP_CATALOG.find(a => a.slug === slug)` and copies `catalogEntry.executionMode`. |
| `app-registry.cjs` | .planning/app-registry.json | fs.readFileSync + JSON.parse / JSON.stringify + fs.writeFileSync | WIRED | `loadRegistry` reads and parses JSON (line 38-39). `saveRegistry` writes with 2-space indent (line 60). ENOENT handled (line 41-43). |
| `app-registry.cjs` | Node.js crypto | createHash('sha256') at approval time | WIRED | Line 22: creates SHA-256 hash. Called only in `defaultHashFn`, used by `approveEntry` (line 125). |
| `bin/pde-tools.cjs` | `app-discovery.cjs` | require('./lib/app-discovery.cjs') | WIRED | Line 1517. Used for `discoverApp` and `APP_CATALOG` access. |
| `bin/pde-tools.cjs` | `app-registry.cjs` | require('./lib/app-registry.cjs') | WIRED | Line 1518. Used for `addPendingEntry`, `approveEntry`, `getEntry`, `listEntries`, `verifyBinaryHash`. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `pde-tools app list` returns valid JSON | `node bin/pde-tools.cjs app list --raw` | `[]` (empty array, exit 0) | PASS |
| app-discovery.cjs exports all required functions | `node -e "require(...)"`  | 6 exports: APP_CATALOG, discoverApp, preprocessHelpText, probeBinary, probeDisplay, resolveBinaryFromBundle | PASS |
| app-registry.cjs exports all required functions | `node -e "require(...)"`  | 9 exports: addPendingEntry, approveEntry, checkApproved, getEntry, listEntries, loadRegistry, rejectEntry, saveRegistry, verifyBinaryHash | PASS |
| APP_CATALOG contains 3 apps | Checked slugs | blender, gimp, inkscape | PASS |
| All 31 phase-171 tests pass | `npx vitest run tests/phase-171/` | 3 files, 31 tests, all passed (133ms) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DISC-01 | 171-01 | Five-tier probe (env var, which/where, pip, mdfind, well-known) on macOS/Linux/Windows | SATISFIED | `probeBinary` implements all 5 tiers with platform branching. 6 tests verify each tier + null return. |
| DISC-02 | 171-02 | Two-tier approval registry with pending/approved/rejected + SHA-256 | SATISFIED | `app-registry.cjs` implements full state machine. SHA-256 at approval time only. 14 tests cover all paths. |
| DISC-03 | 171-01 | executionMode classification (headless/gui-required/mock) gating tool calls | SATISFIED | `discoverApp` sets executionMode from catalog or 'mock'. `checkApproved` blocks mock entries. |
| DISC-04 | 171-01 | col -b preprocessing with parseQuality annotation | SATISFIED | `preprocessHelpText` with col -b + regex fallback. parseQuality: 'clean' or 'degraded'. 4 tests. |
| DISC-05 | 171-01 | Display server availability probe integrated into probe/degrade contract | SATISFIED | `probeDisplay` detects WindowServer (darwin), DISPLAY/WAYLAND_DISPLAY (linux), assumed true (win32). 4 tests. |
| DISC-06 | 171-03 | Known design app catalog in references/app-integrations.md | SATISFIED | File exists with bundle IDs, pip status, executionMode, discovery hints for Blender, GIMP, Inkscape. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected in any phase 171 files |

### Human Verification Required

### 1. Live Discovery Run

**Test:** Run `node bin/pde-tools.cjs app discover` on a machine with at least one of Blender/GIMP/Inkscape installed
**Expected:** The installed app is discovered with correct binaryPath and executionMode. Registry file `.planning/app-registry.json` is created with status 'pending'.
**Why human:** Requires actual installed binaries to verify real probe tiers beyond mock tests.

### 2. Approval and Hash Verification Flow

**Test:** After discovering an app, run `node bin/pde-tools.cjs app approve <slug>` then `node bin/pde-tools.cjs app probe <slug>`
**Expected:** Approval succeeds, SHA-256 hash is computed and stored. Probe confirms binary exists and hash matches.
**Why human:** Requires real binary on disk for SHA-256 computation.

### 3. Cross-Platform Behavior

**Test:** Run discovery on Linux or Windows in addition to macOS
**Expected:** Platform-specific probes (which vs where.exe, DISPLAY vs WindowServer, mdfind only on macOS) work correctly
**Why human:** Requires access to multiple OS platforms.

### Gaps Summary

No gaps found. All 5 success criteria verified, all 6 requirements satisfied, all 31 tests passing, all artifacts substantive and properly wired. The security architecture foundation is complete: five-tier binary probe discovers apps, two-tier approval registry gates execution, executionMode classification prevents unapproved invocation, col-b preprocessing annotates degraded output, and the known app catalog documents priority integrations.

---

_Verified: 2026-03-29T02:15:00Z_
_Verifier: Claude (gsd-verifier)_
