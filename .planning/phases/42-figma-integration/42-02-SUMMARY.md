---
phase: 42-figma-integration
plan: "02"
subsystem: infra
tags: [figma, mcp, dtcg, design-tokens, node-test]

requires:
  - phase: 42-01
    provides: Figma TOOL_MAP entries in mcp-bridge.cjs + connect.md Step 3.8 + command dispatch for sync/wireframe/handoff

provides:
  - Wave 0 tests for FIG-01 (figma-toolmap, token-conversion, sync-figma-workflow) — 31 tests all GREEN
  - sync-figma.md workflow implementing FIG-01 DTCG token import via mcp__figma__get_variable_defs
  - Inline figmaColorToCss() — Figma {r,g,b,a} 0-1 range to #RRGGBB / #RRGGBBAA hex
  - Inline mergeTokens() — non-destructive merge preserving PDE-originated tokens
  - Degraded mode handling for disconnected Figma and missing fileUrl

affects:
  - Phase 42-03 (FIG-02 wireframe-figma-context.md) — follows same Step 0–5 pattern
  - Phase 42-04 (FIG-03/FIG-04) — handoff-figma-codeConnect.md and mockup-export-figma.md
  - Any phase reading assets/tokens.json (non-destructive merge policy now established)

tech-stack:
  added: []
  patterns:
    - "sync-figma.md follows Phase 40/41 Step 0-5 workflow pattern exactly"
    - "Inline helper functions (figmaColorToCss, mergeTokens) embedded in workflow markdown — no shared module — preserves zero npm constraint"
    - "Non-destructive merge: update $value for Figma-matched tokens, preserve $description if incoming has none, preserve PDE-only tokens untouched"
    - "TDD token-conversion.test.mjs defines inline copies of production functions — enables test-first with no module coupling"

key-files:
  created:
    - tests/phase-42/figma-toolmap.test.mjs
    - tests/phase-42/token-conversion.test.mjs
    - tests/phase-42/sync-figma-workflow.test.mjs
    - workflows/sync-figma.md
  modified: []

key-decisions:
  - "figmaColorToCss and mergeTokens are embedded inline in sync-figma.md workflow (not shared modules) — consistent with zero npm constraint and Phase 40/41 pattern of self-contained workflows"
  - "Non-destructive merge semantics: Figma is source of truth for $value of tokens it exports; PDE-originated tokens (no Figma counterpart) are always preserved"
  - "Workflow instructs Claude to call mcp__figma__get_variable_defs with fileUrl as context and let MCP server infer parameter shape — consistent with MEDIUM confidence on exact param names from research"
  - "sync-figma-workflow.test.mjs is intentionally RED at Task 1 commit (workflow not yet created) — standard TDD practice"

patterns-established:
  - "Pattern: Token test files define inline copies of production functions — test-first without module coupling"
  - "Pattern: Workflow degraded mode has two distinct gates: (1) Figma not connected → stop; (2) fileUrl empty → stop with specific guidance"

requirements-completed: [FIG-01]

duration: 2min
completed: 2026-03-19
---

# Phase 42 Plan 02: Figma Token Import Workflow Summary

**sync-figma.md with inline figmaColorToCss/mergeTokens implements FIG-01 non-destructive DTCG token import from Figma variables via mcp__figma__get_variable_defs**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-19T05:23:22Z
- **Completed:** 2026-03-19T05:25:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created 3 Wave 0 test files for FIG-01: figma-toolmap (13 tests), token-conversion (10 tests), sync-figma-workflow (8 tests) — all 31 pass GREEN
- Created sync-figma.md with full Step 0-5 workflow: connection check, MCP probe, variable fetch, DTCG conversion, non-destructive merge, dry-run support, summary
- Inline figmaColorToCss handles COLOR {r,g,b,a} 0-1 to #RRGGBB (opaque) or #RRGGBBAA (transparent), inline mergeTokens deep-clones for non-mutation
- Degraded mode covers disconnected Figma, missing fileUrl, and MCP call failures — zero crashes

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 tests for FIG-01 (TOOL_MAP, token conversion, workflow structure)** - `fd4efd4` (test)
2. **Task 2: Create sync-figma.md workflow with DTCG token import and non-destructive merge** - `3c54ca7` (feat)

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified

- `tests/phase-42/figma-toolmap.test.mjs` — 13 tests validating all 7 Figma TOOL_MAP entries, args forwarding, probe_deferred, APPROVED_SERVERS.figma (HTTP transport, URL, probeTool)
- `tests/phase-42/token-conversion.test.mjs` — 10 tests for figmaColorToCss (4 color cases + alpha) and mergeTokens (preserve/update/insert/non-mutating) with inline function definitions
- `tests/phase-42/sync-figma-workflow.test.mjs` — 8 structural tests asserting sync-figma.md exists and contains key strings (bridge.call, loadConnections, fileUrl, tokens.json, --dry-run, /pde:connect figma, 80+ lines)
- `workflows/sync-figma.md` — 225-line FIG-01 workflow: Step 0 (loadConnections + b.call lookup), Step 1 (probe), Step 2 (MCP fetch instruction), Step 3 (inline conversion functions), Step 4 (merge + dry-run), Step 5 (summary with default-mode note)

## Decisions Made

- Inline functions (figmaColorToCss, mergeTokens) are embedded in sync-figma.md, not extracted to a shared module. This preserves the zero npm constraint pattern established in Phase 40/41 and keeps workflows self-contained.
- Workflow instructs Claude to call `mcp__figma__get_variable_defs` with fileUrl as natural-language context, letting the MCP server infer parameter names. This handles the MEDIUM-confidence open question on exact param names from research.
- Non-destructive merge semantics: Figma is the source of truth for token values it exports. PDE-originated tokens with no Figma counterpart are preserved. This is intentional by design (documented in RESEARCH.md Pitfall 6).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. Figma connection setup is handled by connect.md Step 3.8 (created in Plan 42-01).

## Next Phase Readiness

- FIG-01 implementation and tests complete — ready for Phase 42-03 (FIG-02 wireframe-figma-context.md)
- sync-figma.md establishes the Step 0-5 workflow pattern for all remaining Figma workflows
- tests/phase-42/ directory established with Wave 0 FIG-01 coverage; FIG-02/03/04 tests needed next

---
*Phase: 42-figma-integration*
*Completed: 2026-03-19*
