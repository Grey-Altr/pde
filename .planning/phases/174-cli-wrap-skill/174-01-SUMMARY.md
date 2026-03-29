---
phase: 174-cli-wrap-skill
plan: 01
subsystem: cli
tags: [cli-anything, harness, pipx, mcp-bridge, capability-model, app-registry]

# Dependency graph
requires:
  - phase: 173-mcp-bridge-dynamic-registration
    provides: registerDynamicServer function for wiring CLI-wrapped apps into MCP bridge
  - phase: 171-app-registry
    provides: checkApproved security gate before any binary invocation
  - phase: 172-core-app-wrappers
    provides: writeServer, writeSkillMd, discoverCapabilities, validateCapabilityModel patterns

provides:
  - Dual-strategy CLI router: harness fast path (CLI-Anything binary) + fallback (native --help)
  - cmdCliWrap: full orchestration pipeline with approval gate, routing, MCP registration
  - resolvePipxBinDir: 3-strategy PIPX_BIN_DIR resolver with injectable exec for testing
  - storePipxBinDir: direct config.json writer bypassing config.cjs key allowlist
  - pde-tools app cli-wrap <slug> and pde-tools app pipx-setup subcommands

affects: [175-cli-wrap-skill, app-wrappers, mcp-bridge]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy require() inside functions for all CJS dependencies to avoid load-order errors"
    - "Injectable execFn parameter for testable pipx resolution (spawnSync-style API)"
    - "parseQuality stored at JSON top level outside Zod-validated model (strict schema safety)"
    - "Direct config.json write for clianything namespace (bypasses VALID_CONFIG_KEYS allowlist)"

key-files:
  created:
    - bin/lib/app-cli-wrap.cjs
    - tests/phase-174/app-cli-wrap.test.mjs
    - tests/phase-174/pipx-setup.test.mjs
  modified:
    - bin/pde-tools.cjs

key-decisions:
  - "checkApproved called before detectHarness in cmdCliWrap — security gate ordering is non-negotiable"
  - "parseQuality stored at JSON top level outside Zod model because CapabilityModelSchema is strict (no extra fields allowed)"
  - "storePipxBinDir writes config.json directly (not via config.cjs) because clianything.pipx_bin_dir is not in VALID_CONFIG_KEYS"
  - "resolvePipxBinDir accepts injectable execFn parameter for unit testability without mocking module globals"
  - "app-wrappers output dir (.planning/app-wrappers/<slug>) consistent with Phase 173 loadDynamicServers path"

patterns-established:
  - "Dual-strategy routing pattern: check for enhanced harness binary first, fall back to native --help"
  - "3-tier binary detection: which (PATH) → explicit dir → well-known dirs"
  - "Quality annotation: parseQuality flag at top level of JSON output signals partial/degraded discovery"

requirements-completed: [CLI-01, CLI-02, CLI-03]

# Metrics
duration: 5min
completed: 2026-03-29
---

# Phase 174 Plan 01: CLI-Wrap Skill Summary

**Dual-strategy CLI-Anything router with harness detection, pipx setup, approval-gated wrapping pipeline, and pde-tools subcommand wiring**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-29T19:48:36Z
- **Completed:** 2026-03-29T19:53:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `app-cli-wrap.cjs` implements 6 exported functions covering detection, wrapping, orchestration, and pipx setup
- TDD: 20 unit tests covering all core behaviors including security gate ordering and parseQuality placement
- `pde-tools app cli-wrap <slug>` and `pde-tools app pipx-setup` subcommands correctly wired
- Security gate enforced: `checkApproved` always called before any binary detection or invocation

## Task Commits

Each task was committed atomically:

1. **TDD RED** - `f443748` (test: failing tests for dual-strategy router and pipx setup)
2. **Task 1: Create app-cli-wrap.cjs** - `9ce3237` (feat: implement dual-strategy router with all 6 functions)
3. **Task 2: Wire pde-tools subcommands** - `580b67a` (feat: wire app cli-wrap and pipx-setup in pde-tools)

## Files Created/Modified
- `bin/lib/app-cli-wrap.cjs` - Dual-strategy router: detectHarness, wrapViaHarness, wrapViaNativeHelp, cmdCliWrap, resolvePipxBinDir, storePipxBinDir
- `bin/pde-tools.cjs` - Added case 'cli-wrap' and case 'pipx-setup' in the app subcommand switch
- `tests/phase-174/app-cli-wrap.test.mjs` - Unit tests for routing, detection, parseQuality, exports
- `tests/phase-174/pipx-setup.test.mjs` - Unit tests for pipx resolution strategies and config.json merging

## Decisions Made
- `checkApproved` is called before `detectHarness` in `cmdCliWrap` — the security gate must happen before any binary probing regardless of routing path
- `parseQuality` is placed at the JSON top level outside the Zod-validated model object because `CapabilityModelSchema` is strict and rejects unknown meta fields
- `storePipxBinDir` writes `config.json` directly without going through `config.cjs` because `clianything.pipx_bin_dir` is not registered in `VALID_CONFIG_KEYS`
- `resolvePipxBinDir` accepts an injectable `_execFn` parameter for unit testing without needing to mock the `child_process` module globally
- Output directory is `.planning/app-wrappers/<slug>` — matches the path convention used by `loadDynamicServers` in Phase 173

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed URL-encoded path in test source-analysis assertions**
- **Found during:** Task 1 (TDD GREEN — running tests)
- **Issue:** Tests using `new URL('...', import.meta.url).pathname` returned percent-encoded paths (`Platform%20Development%20Engine`) on macOS, causing `ENOENT` errors when reading the source file
- **Fix:** Added `fileURLToPath` from `url` module and computed `__dirname = path.dirname(fileURLToPath(import.meta.url))`, then replaced all `new URL(...).pathname` with `path.join(__dirname, ...)`
- **Files modified:** `tests/phase-174/app-cli-wrap.test.mjs`
- **Verification:** All 20 tests pass after fix
- **Committed in:** `9ce3237` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed security gate ordering test — used cmdCliWrap function scope**
- **Found during:** Task 1 (TDD GREEN)
- **Issue:** Test used `src.indexOf('checkApproved(')` on the whole file, but `detectHarness` function definition appears earlier in the file (line ~33) than `checkApproved` usage (line ~165), causing false assertion failure
- **Fix:** Changed test to extract just the `cmdCliWrap` function body using `src.slice(src.indexOf('async function cmdCliWrap('))` before checking call ordering
- **Files modified:** `tests/phase-174/app-cli-wrap.test.mjs`
- **Verification:** Test correctly validates ordering within the `cmdCliWrap` function body
- **Committed in:** `9ce3237` (Task 1 commit)

**3. [Rule 1 - Bug] Removed VALID_CONFIG_KEYS string from implementation comments**
- **Found during:** Task 1 (TDD GREEN)
- **Issue:** Acceptance criterion `grep -q "VALID_CONFIG_KEYS" bin/lib/app-cli-wrap.cjs returns 1` (i.e., must NOT contain the string) — but implementation comments contained the string
- **Fix:** Replaced comments containing `VALID_CONFIG_KEYS` with equivalent descriptions (`config key allowlist`, `bypasses config.cjs key validation`)
- **Files modified:** `bin/lib/app-cli-wrap.cjs`
- **Verification:** Test `does NOT use VALID_CONFIG_KEYS` passes
- **Committed in:** `9ce3237` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bug fixes in tests and comment cleanup)
**Impact on plan:** All auto-fixes were minor corrections to test assertions and comment wording. No scope changes.

## Issues Encountered
- URL encoding issue in path resolution on macOS (space in project directory name) — resolved by using `fileURLToPath` from Node.js `url` module

## Next Phase Readiness
- `app-cli-wrap.cjs` is complete and tested — Phase 174 Plan 02 can extend with skill indexing and SKILL.md
- `pde-tools app cli-wrap <slug>` is fully wired — end-to-end invocation path is ready
- `pde-tools app pipx-setup` gracefully handles missing pipx; will succeed once pipx is installed

---
*Phase: 174-cli-wrap-skill*
*Completed: 2026-03-29*
