---
phase: 65-mcp-bridge-quota-infrastructure
plan: 01
subsystem: mcp-bridge
tags: [mcp, stitch, tool-map, auth-instructions, connect-workflow, tdd, nyquist]
dependency_graph:
  requires: [64-01]
  provides: [stitch-approved-server, stitch-tool-map, stitch-auth-instructions, stitch-connect-step-310]
  affects: [workflows/connect.md, bin/lib/mcp-bridge.cjs]
tech_stack:
  added: []
  patterns: [approved-servers-schema, tool-map-canonical-to-raw, auth-instructions-array, tdd-red-green]
key_files:
  created:
    - tests/phase-65/stitch-bridge-registration.test.mjs
    - tests/phase-65/tool-map-stitch.test.mjs
  modified:
    - bin/lib/mcp-bridge.cjs
    - workflows/connect.md
decisions:
  - AUTH_INSTRUCTIONS stitch array uses 7 elements in logical setup order where [4]=source, [5]=register, [6]=confirm — matches test index assertions
  - TOOL_MAP entries use fetch_screen_code (official upstream name) not get_screen_code (davideast proxy wrapper) per MEDIUM-HIGH confidence assessment
  - probeTool comment also marked TOOL_MAP_VERIFY_REQUIRED to indicate the probe tool name needs live verification
  - Step 3.10 includes STITCH_API_KEY env check that stops execution (not proceeds) when key is missing — prevents indefinite hang at MCP startup
metrics:
  duration: ~12min
  completed: 2026-03-20
  tasks_completed: 2
  files_changed: 4
---

# Phase 65 Plan 01: Stitch Bridge Registration Summary

Google Stitch registered as 6th approved MCP server in mcp-bridge.cjs with stdio transport, 10 TOOL_MAP entries marked TOOL_MAP_VERIFY_REQUIRED, 7-element AUTH_INSTRUCTIONS setup guide, and connect.md Step 3.10 with STITCH_API_KEY env check and MCP-05 live tool name verification gate.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 (TDD) | Add Stitch to APPROVED_SERVERS, TOOL_MAP, and AUTH_INSTRUCTIONS | 987bf21 | bin/lib/mcp-bridge.cjs, tests/phase-65/*.test.mjs |
| 2 | Add Step 3.10 to connect.md for Stitch API key + MCP-05 gate | 2e535e7 | workflows/connect.md |

## Verification Results

All 8 plan verification checks passed:

1. `node --test tests/phase-65/stitch-bridge-registration.test.mjs` — 13 tests PASS (MCP-01, MCP-03)
2. `node --test tests/phase-65/tool-map-stitch.test.mjs` — 15 tests PASS (MCP-02, MCP-05)
3. `assertApproved('stitch')` — returns without throw (stitch is approved)
4. 10 `TOOL_MAP_VERIFY_REQUIRED` comments in TOOL_MAP section (+ 1 in probeTool comment)
5. `## 3.10.` exists in connect.md
6. `STITCH_API_KEY` referenced in connect.md (7 occurrences)
7. `claude mcp test stitch` command in connect.md Step 3.10
8. `TOOL_MAP_VERIFIED` marker replacement logic in connect.md Step 3.10

## What Was Built

### bin/lib/mcp-bridge.cjs

**APPROVED_SERVERS.stitch:**
- `transport: 'stdio'` — uses npx proxy, not HTTP (avoids Claude Code header bug #7290)
- `installCmd: null` — multi-step setup via AUTH_INSTRUCTIONS
- `probeTimeoutMs: 15000` — accommodates cold npm cache startup (~1.2s warm, 5-15s cold)
- `probeTool: 'mcp__stitch__list_projects'` — lightest read-only probe tool

**TOOL_MAP (10 entries):**
- All marked `TOOL_MAP_VERIFY_REQUIRED` — MEDIUM confidence from community sources
- Uses `fetch_screen_code` (official upstream name, MEDIUM-HIGH confidence) not `get_screen_code` (davideast proxy wrapper)
- Covers full tool surface: probe, generate-screen, get-screen, list-screens, fetch-screen-code, fetch-screen-image, extract-design-context, create-project, list-projects, get-project

**AUTH_INSTRUCTIONS.stitch (7 elements):**
- Logical setup order: get API key (0-3), source profile (4), register MCP (5), confirm (6)
- Index 4 = source ~/.zshrc, index 5 = claude mcp add stitch, index 6 = /pde:connect stitch --confirm

### workflows/connect.md

**Step 0:** Approved services list updated to include stitch.

**Step 3.10 (Stitch only):**
- Checks STITCH_API_KEY env var — stops with AUTH_INSTRUCTIONS if not set (prevents indefinite hang)
- Mentions ~/.claude.json env field as alternative to shell profile
- MCP-05 gate: runs `claude mcp test stitch`, graceful fallback on timeout
- Comparison table showing all 10 stitch:* entries vs live server tool names
- Per-discrepancy WARNING with suggested alternatives
- Updates TOOL_MAP_VERIFY_REQUIRED to TOOL_MAP_VERIFIED only when ALL 10 entries confirmed

## Decisions Made

1. **AUTH_INSTRUCTIONS array order:** Logical instruction order (get key → add to profile → verify key → source profile → register MCP → verify in /mcp → confirm) maps to indexes [0-6] with test-required [4]=source, [5]=register, [6]=confirm. Step 4 is an additional verification step to keep logical flow while satisfying index constraints.

2. **fetch_screen_code vs get_screen_code:** Used `mcp__stitch__fetch_screen_code` as the canonical raw name based on MEDIUM-HIGH confidence (three independent sources: Kargatharaakash repo, gemini-cli-extensions, stitch-sdk). The MCP-05 live gate in Step 3.10 will resolve any remaining discrepancy at connection time.

3. **probeTool also marked TOOL_MAP_VERIFY_REQUIRED:** The comment on the probeTool in APPROVED_SERVERS notes that `mcp__stitch__list_projects` needs live verification since all tool names are MEDIUM confidence. This is informational and does not affect the MCP-05 gate logic.

4. **STITCH_API_KEY stops execution:** Step 3.10 stops (does NOT proceed to Step 4) when STITCH_API_KEY is missing. This is critical — a missing API key causes an indefinite hang at stdio MCP startup, not a clean error (Claude Code issue #35287). The connection must NOT be recorded as 'connected' without confirmed API key.

## Deviations from Plan

None — plan executed exactly as written. The AUTH_INSTRUCTIONS array analysis in the plan action correctly resolved the index constraint before implementation.

## Self-Check

Files exist:
- [x] bin/lib/mcp-bridge.cjs — modified with stitch entries
- [x] workflows/connect.md — modified with Step 3.10
- [x] tests/phase-65/stitch-bridge-registration.test.mjs — created
- [x] tests/phase-65/tool-map-stitch.test.mjs — created

Commits exist:
- [x] 623422e — test(65-01): add RED Nyquist tests for MCP-01/02/03/05
- [x] 987bf21 — feat(65-01): register Google Stitch as 6th approved MCP server
- [x] 2e535e7 — feat(65-01): add Step 3.10 to connect.md

## Self-Check: PASSED
