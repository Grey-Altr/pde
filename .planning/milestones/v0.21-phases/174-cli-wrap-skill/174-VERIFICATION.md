---
phase: 174-cli-wrap-skill
verified: 2026-03-29T13:05:00Z
status: passed
score: 9/9 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  gaps_closed:
    - "The integration test verifies the full pipeline: slug in, artifacts out — all 17 integration tests now pass after commit 27673fa added async/await to 4 failing test callbacks"
  gaps_remaining: []
  regressions: []
---

# Phase 174: CLI-Wrap Skill Verification Report

**Phase Goal:** Any installed application can be wrapped as an agent-native CLI tool in one command — `/pde:cli-wrap` handles discovery, capability model generation, MCP server creation, and SKILL.md publishing automatically
**Verified:** 2026-03-29T13:05:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (commit 27673fa)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `detectHarness()` finds a CLI-Anything binary via PATH or stored pipx_bin_dir | VERIFIED | 3-tier detection at lines 33-60 in app-cli-wrap.cjs; 4 unit tests pass |
| 2 | `wrapViaHarness()` produces capability-model.json + server.cjs + SKILL.md using harness binary as source | VERIFIED | Implemented at lines 73-109; writes to `.planning/app-wrappers/<slug>/`; integration tests pass including "fast path result has strategy: harness" |
| 3 | `wrapViaNativeHelp()` produces capability-model.json + server.cjs + SKILL.md using native --help parsing | VERIFIED | Implemented at lines 121-164; parseQuality stored at top level; integration tests pass including "fallback result includes strategy: fallback" |
| 4 | `cmdCliWrap()` routes to harness fast path when available, fallback when not | VERIFIED | Lines 203-212 implement routing; security gate at lines 199-201 precedes detectHarness at line 204; all routing integration tests pass |
| 5 | `resolvePipxBinDir()` resolves PIPX_BIN_DIR from pipx environment command | VERIFIED | 3-strategy resolver at lines 250-277; injectable execFn for testing; unit tests pass |
| 6 | `storePipxBinDir()` writes pipx_bin_dir to .planning/config.json under clianything key | VERIFIED | Lines 288-309 write directly to config.json bypassing config.cjs; merges with existing keys; unit tests pass |
| 7 | `pde-tools app cli-wrap <slug>` and `pde-tools app pipx-setup` are routed correctly | VERIFIED | bin/pde-tools.cjs lines 1651-1670: both cases wired, lazy require of app-cli-wrap.cjs, updated default error message includes new subcommands |
| 8 | `/pde:cli-wrap` slash command is available in Claude Code | VERIFIED | commands/cli-wrap.md exists with correct frontmatter (name: pde:cli-wrap), argument-hint, allowed-tools, process block invoking pde-tools.cjs app cli-wrap |
| 9 | The integration test verifies the full pipeline: slug in, artifacts out | VERIFIED | All 17 integration tests pass (commit 27673fa fixed 4 tests that were missing async/await — wrapViaHarness and wrapViaNativeHelp callbacks now correctly declared async with await) |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/app-cli-wrap.cjs` | Dual-strategy router: 6 exported functions | VERIFIED | 320 lines, all 6 functions present and substantive: detectHarness, wrapViaHarness, wrapViaNativeHelp, cmdCliWrap, resolvePipxBinDir, storePipxBinDir |
| `bin/pde-tools.cjs` | Routing for app cli-wrap and app pipx-setup | VERIFIED | Lines 1651-1670: case 'cli-wrap' and case 'pipx-setup' both present, lazy require wired correctly |
| `tests/phase-174/app-cli-wrap.test.mjs` | Unit tests for dual-strategy routing | VERIFIED | All unit tests pass |
| `tests/phase-174/pipx-setup.test.mjs` | Unit tests for pipx bin dir resolution and config storage | VERIFIED | All pipx-setup unit tests pass |
| `commands/cli-wrap.md` | /pde:cli-wrap slash command definition | VERIFIED | 71 lines; all required patterns present (name, argument-hint, allowed-tools, FAST PATH, FALLBACK, app-wrappers output, process block) |
| `tests/phase-174/cli-wrap-integration.test.mjs` | End-to-end integration test for the cli-wrap pipeline | VERIFIED | 17 tests, all 17 pass (fixed in commit 27673fa) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/lib/app-cli-wrap.cjs` | `bin/lib/cli-anything/help-parser.cjs` | `require('./cli-anything/help-parser.cjs').discoverCapabilities` | WIRED | Line 76 (wrapViaHarness) and line 124 (wrapViaNativeHelp) — lazy require present |
| `bin/lib/app-cli-wrap.cjs` | `bin/lib/app-registry.cjs` | `require('./app-registry.cjs').checkApproved` | WIRED | Lines 199-201 — security gate before detectHarness |
| `bin/lib/app-cli-wrap.cjs` | `bin/lib/mcp-bridge.cjs` | `require('./mcp-bridge.cjs').registerDynamicServer` | WIRED | Lines 215, 228 — reads capability-model.json from disk and passes caps to bridge |
| `bin/pde-tools.cjs` | `bin/lib/app-cli-wrap.cjs` | `require('./lib/app-cli-wrap.cjs')` | WIRED | Lines 1654 (cmdCliWrap), 1659 (resolvePipxBinDir + storePipxBinDir) |
| `commands/cli-wrap.md` | `bin/pde-tools.cjs` | `node bin/pde-tools.cjs app cli-wrap` | WIRED | Process block line 63 invokes `pde-tools.cjs app cli-wrap $ARGUMENTS` |
| `tests/phase-174/cli-wrap-integration.test.mjs` | `bin/lib/app-cli-wrap.cjs` | `import { cmdCliWrap } from app-cli-wrap` | WIRED | Line 19 via createRequire; cmdCliWrap, detectHarness, wrapViaHarness, wrapViaNativeHelp all imported |

### Data-Flow Trace (Level 4)

Not applicable — these are CLI modules and a slash command file, not React components or data-rendering pages. The relevant data flow (binary invocation -> capability discovery -> JSON files) is verified by the integration tests.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `module.exports` present | `grep -c "module.exports" bin/lib/app-cli-wrap.cjs` | 1 | PASS |
| All 6 functions exported | `grep "module.exports" bin/lib/app-cli-wrap.cjs` | exports all 6 names | PASS |
| `checkApproved` before `detectHarness` in source | Source-level ordering check | checkApproved at line 199, detectHarness at line 204 | PASS |
| pde-tools routes cli-wrap | `grep "case 'cli-wrap':" bin/pde-tools.cjs` | line 1651 | PASS |
| pde-tools routes pipx-setup | `grep "case 'pipx-setup':" bin/pde-tools.cjs` | line 1658 | PASS |
| does NOT use VALID_CONFIG_KEYS | `grep -c "VALID_CONFIG_KEYS" bin/lib/app-cli-wrap.cjs` | 0 | PASS |
| uses app-wrappers (not cli-anything) output dir | `grep -c "app-wrappers" bin/lib/app-cli-wrap.cjs` | multiple | PASS |
| Unit tests pass | `npx vitest run tests/phase-174/app-cli-wrap.test.mjs tests/phase-174/pipx-setup.test.mjs` | 20 passed | PASS |
| Integration tests pass | `npx vitest run tests/phase-174/cli-wrap-integration.test.mjs` | 17/17 passed | PASS |
| Full phase-174 suite | `npx vitest run tests/phase-174/` | 37/37 passed (3 files) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLI-01 | 174-01, 174-02 | `/pde:cli-wrap` skill takes any installed app and produces agent-native CLI + MCP server + SKILL.md in one command | SATISFIED | commands/cli-wrap.md provides the slash command; cmdCliWrap orchestrates approval gate -> capability discovery -> server generation -> MCP registration in a single invocation; artifacts written to `.planning/app-wrappers/<slug>/` |
| CLI-02 | 174-01, 174-02 | Dual strategy routing: CLI-Anything pre-built CLIs (pipx) as fast path when available, native `--help` -> capability model -> codegen as fallback | SATISFIED | detectHarness() implements 3-tier detection; cmdCliWrap routes to wrapViaHarness (FAST PATH) or wrapViaNativeHelp (FALLBACK PATH) based on detection result |
| CLI-03 | 174-01 | pipx (not pip) as canonical install method for CLI-Anything CLIs, with absolute path resolution stored in config | SATISFIED | resolvePipxBinDir() uses `pipx environment` command for resolution; storePipxBinDir() writes pipx_bin_dir to `.planning/config.json` under `clianything` key; pipx-setup subcommand wired in pde-tools |

All 3 requirements claimed by both plans are satisfied. No orphaned requirements found for Phase 174.

### Anti-Patterns Found

No blockers or warnings remain. The previously identified anti-pattern (missing async/await in 4 integration test callbacks) was resolved in commit 27673fa. All 37 tests in the phase-174 suite pass cleanly.

### Human Verification Required

None — all required behaviors are verified programmatically. The full test suite passes.

### Gaps Summary

No gaps remain. The single gap identified in the initial verification (4 integration tests missing async/await on calls to `wrapViaHarness` and `wrapViaNativeHelp`) was fixed in commit 27673fa. The fix added `async` to the 4 test callbacks and `await` before each function call. All 17 integration tests now pass, bringing the full phase-174 suite to 37/37.

Phase goal is fully achieved: `/pde:cli-wrap` wraps any installed application as an agent-native CLI tool in one command, with dual-strategy routing (harness fast path + native --help fallback), pipx-based binary resolution, and automatic MCP server + SKILL.md publishing.

---

_Verified: 2026-03-29T13:05:00Z_
_Verifier: Claude (gsd-verifier)_
