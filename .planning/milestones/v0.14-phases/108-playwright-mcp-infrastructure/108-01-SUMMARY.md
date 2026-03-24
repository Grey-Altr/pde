---
phase: 108-playwright-mcp-infrastructure
plan: "01"
subsystem: mcp-bridge
one-liner: "Playwright registered as 7th APPROVED_SERVER with stdio transport, 10 TOOL_MAP entries, AUTH_INSTRUCTIONS, and 27 Nyquist tests GREEN"
tags: [mcp, playwright, browser-automation, tool-map, nyquist]
dependency_graph:
  requires: []
  provides: [playwright-approved-server, playwright-tool-map, playwright-auth-instructions]
  affects: [bin/lib/mcp-bridge.cjs, tests/phase-108]
tech_stack:
  added: []
  patterns: [probe-degrade-contract, tool-map-verify-required, stdio-transport]
key_files:
  created:
    - tests/phase-108/mcp-bridge-playwright.test.mjs
  modified:
    - bin/lib/mcp-bridge.cjs
    - tests/phase-40/mcp-bridge-toolmap.test.mjs
    - tests/phase-41/linear-toolmap.test.mjs
    - tests/phase-42/figma-toolmap.test.mjs
    - tests/phase-43/pencil-toolmap.test.mjs
    - .planning/config/files-manifest.csv
decisions:
  - "Playwright uses stdio transport (identical to Stitch pattern — avoids Claude Code header bug #7290)"
  - "probeTimeoutMs=30000 — browser launch slow on first use (~170MB Chromium download)"
  - "All 10 TOOL_MAP entries marked TOOL_MAP_VERIFY_REQUIRED — tool names from README/practitioner sources (MEDIUM confidence)"
  - "Fallback version pin (0.0.41) documented in AUTH_INSTRUCTIONS — protects against @latest tool name changes"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-23"
  tasks_completed: 2
  files_changed: 6
---

# Phase 108 Plan 01: Playwright MCP Infrastructure Summary

## What Was Built

Playwright registered as the 7th APPROVED_SERVER in `bin/lib/mcp-bridge.cjs`, providing the infrastructure foundation for all v0.14 browser-backed features (Phases 109-117).

### APPROVED_SERVERS.playwright

```javascript
playwright: {
  displayName: 'Playwright',
  transport: 'stdio',
  url: null,
  installCmd: null, // Multi-flag: see AUTH_INSTRUCTIONS
  probeTimeoutMs: 30000,
  probeTool: 'mcp__playwright__browser_snapshot',
  probeArgs: {},
}
```

### TOOL_MAP playwright entries (10 new entries, total 56)

| Canonical | Raw MCP name | Confidence |
|-----------|-------------|------------|
| playwright:probe | mcp__playwright__browser_snapshot | MEDIUM/VERIFY_REQUIRED |
| playwright:navigate | mcp__playwright__browser_navigate | MEDIUM/VERIFY_REQUIRED |
| playwright:screenshot | mcp__playwright__browser_take_screenshot | MEDIUM/VERIFY_REQUIRED |
| playwright:snapshot | mcp__playwright__browser_snapshot | MEDIUM/VERIFY_REQUIRED |
| playwright:click | mcp__playwright__browser_click | MEDIUM/VERIFY_REQUIRED |
| playwright:type | mcp__playwright__browser_type | MEDIUM/VERIFY_REQUIRED |
| playwright:wait | mcp__playwright__browser_wait_for | MEDIUM/VERIFY_REQUIRED |
| playwright:evaluate | mcp__playwright__browser_evaluate | MEDIUM/VERIFY_REQUIRED |
| playwright:pdf | mcp__playwright__browser_pdf_save | MEDIUM/VERIFY_REQUIRED |
| playwright:close | mcp__playwright__browser_close | MEDIUM/VERIFY_REQUIRED |

### AUTH_INSTRUCTIONS.playwright

```
1. Run: claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access
   (If tools show "No such tool available", pin version: npx @playwright/mcp@0.0.41 instead of @latest)
2. Verify Playwright appears in Claude Code MCP list: run /mcp in Claude Code
3. Chromium is downloaded automatically on first use (~170MB, one-time)
4. Return here and run /pde:connect playwright --confirm
```

## Tests

**27 Nyquist structural tests in `tests/phase-108/mcp-bridge-playwright.test.mjs` — all GREEN:**

- PLAY-01: 7 APPROVED_SERVERS.playwright field assertions
- PLAY-02: 12 TOOL_MAP playwright entry + count assertions
- PLAY-02: 2 call() resolution tests
- PLAY-03: 4 AUTH_INSTRUCTIONS assertions (array length, --headless, --allow-unrestricted-file-access, npx command)
- PLAY-05: 1 probe_deferred status test
- PLAY-07: 1 TOOL_MAP_VERIFY_REQUIRED source marker test (10 lines verified)

**4 previously-stale test files fixed (TOOL_MAP count 36 → 56):**
- tests/phase-40/mcp-bridge-toolmap.test.mjs
- tests/phase-41/linear-toolmap.test.mjs
- tests/phase-42/figma-toolmap.test.mjs
- tests/phase-43/pencil-toolmap.test.mjs

**Full suite: 84 tests across phase-108/40/41/42/43 GREEN, 0 failures**

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 61ee1eb | test | Add failing tests for Playwright MCP bridge registration (RED phase) |
| 44ca77d | feat | Register Playwright as 7th APPROVED_SERVER in mcp-bridge.cjs (GREEN phase) |

## Deviations from Plan

None — plan executed exactly as written.

The 4 pre-existing test failures in the full suite (designCoverage fields, Stitch wireframes, SC-3 workflow count, REQUIREMENTS.md FLP artifact) were present before this plan and are out of scope.

## Self-Check: PASSED

- tests/phase-108/mcp-bridge-playwright.test.mjs: FOUND
- bin/lib/mcp-bridge.cjs contains `playwright:` in APPROVED_SERVERS: FOUND
- TOOL_MAP count = 56: VERIFIED
- APPROVED_SERVERS count = 7: VERIFIED
- probe('playwright').status = 'probe_deferred': VERIFIED
- Commits 61ee1eb, 44ca77d: FOUND
