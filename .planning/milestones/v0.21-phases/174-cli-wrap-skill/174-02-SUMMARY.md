---
phase: 174-cli-wrap-skill
plan: "02"
subsystem: cli-wrap-command
tags: [slash-command, integration-test, cli-wrap, dual-strategy]
dependency_graph:
  requires: [app-cli-wrap, mcp-bridge, app-registry, 174-01]
  provides: [commands/cli-wrap.md, tests/phase-174/cli-wrap-integration.test.mjs]
  affects: []
tech_stack:
  added: []
  patterns: [slash-command, real-temp-dir-tests, source-inspection]
key_files:
  created:
    - commands/cli-wrap.md
    - tests/phase-174/cli-wrap-integration.test.mjs
  modified: []
decisions:
  - Real temp directories for all integration tests — consistent with phase-173 pattern; vi.mock() unreliable for CJS modules in ESM test context
  - Source-level ordering verification for security gate — confirms checkApproved precedes detectHarness in cmdCliWrap function body without needing execution order tracking
  - Slash command follows exact commands/wrap.md format — consistent user experience
metrics:
  duration: "~20 minutes"
  completed: "2026-03-29"
  tasks_completed: 2
  files_changed: 2
---

# Phase 174 Plan 02: /pde:cli-wrap Slash Command + Integration Tests Summary

Slash command and integration test suite for the one-command CLI wrap pipeline with dual-strategy routing (fast path via CLI-Anything harness, fallback via native --help).

## What Was Built

**commands/cli-wrap.md** — The `/pde:cli-wrap` slash command:
- Frontmatter: name, description, argument-hint, allowed-tools (matches commands/wrap.md format)
- Documents the full pipeline: approval check → strategy routing → artifacts → bridge registration
- Dual-strategy explanation: FAST PATH (harness via pipx) and FALLBACK PATH (native --help)
- Prerequisites section: discover + approve + pipx-setup
- Output file paths: `.planning/app-wrappers/{slug}/` (capability-model.json, server/server.cjs, server/SKILL.md)
- Process block: `node bin/pde-tools.cjs app cli-wrap $ARGUMENTS` with error diagnosis guidance
- Examples: blender, gimp, inkscape

**tests/phase-174/cli-wrap-integration.test.mjs** — 17 integration tests covering:
1. Fast path: harness in pipx_bin_dir produces artifacts + registers with bridge
2. Fallback path: native --help produces artifacts with parseQuality at top level
3. Security: rejects pending/rejected/missing apps before any harness detection
4. Output directory: all writes go to app-wrappers not cli-anything
5. Bridge registration: serverPath verified on disk, DYNAMIC_SERVERS populated
6. Source ordering: checkApproved appears before detectHarness in cmdCliWrap body

## Test Results

45 total tests pass (28 unit + 17 integration) across:
- `tests/phase-174/app-cli-wrap.test.mjs` — 28 unit tests
- `tests/phase-174/pipx-setup.test.mjs` — included in unit count
- `tests/phase-174/cli-wrap-integration.test.mjs` — 17 integration tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] URL encoding in import.meta.url for path with spaces**
- **Found during:** Task 2 (integration test run)
- **Issue:** `new URL(import.meta.url).pathname` returns URL-encoded path (`%20` for spaces in project name "Platform Development Engine"), causing ENOENT when passed to `fs.readFileSync`
- **Fix:** Applied `.replace(/%20/g, ' ')` to the pathname before passing to `path.resolve`
- **Files modified:** `tests/phase-174/cli-wrap-integration.test.mjs`
- **Commit:** 305ba10

**2. [Rule 1 - Bug] Source ordering test used wrong string index**
- **Found during:** Task 2 (test assertion failure)
- **Issue:** Searching for `checkApproved` in full source found the function definition (line ~170) before `detectHarness(` call in `cmdCliWrap` (line ~250), but both are definitions not call sites. The assertions expected call ordering but got definition ordering.
- **Fix:** Extracted `cmdCliWrap` function body slice from source, then compared positions of `checkApproved(` and `detectHarness(` within that body
- **Files modified:** `tests/phase-174/cli-wrap-integration.test.mjs`
- **Commit:** 305ba10

## Commits

- `fe075ba` — feat(174-02): create /pde:cli-wrap slash command
- `305ba10` — feat(174-02): create integration tests for full cli-wrap pipeline

## Self-Check: PASSED

- `commands/cli-wrap.md` exists ✓
- `grep "name: pde:cli-wrap" commands/cli-wrap.md` ✓
- `tests/phase-174/cli-wrap-integration.test.mjs` exists ✓
- All 45 tests pass ✓
- Commits fe075ba and 305ba10 present in git log ✓
