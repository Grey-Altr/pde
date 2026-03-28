---
phase: 158-mcp-apps-rich-ui-design-artifact-preview
plan: 01
subsystem: api
tags: [mcp, mcp-apps, ext-apps, rich-ui, typescript, vitest]

# Dependency graph
requires:
  - phase: 156-mcp-infrastructure
    provides: server-factory.ts with registerPdeTools pattern
  - phase: 157-dashboard-webmcp-tools
    provides: MCP server tool registration infrastructure

provides:
  - registerArtifactPreviewTools function in dashboard/lib/mcp/apps/artifact-preview.ts
  - pde-artifact-viewer HTML resource with CSP connectDomains (RUI-02)
  - preview_artifact tool with dual-mode response: text fallback + structuredContent (RUI-01)
  - list_design_artifacts tool reading .planning/design/ with dual-mode response
  - @modelcontextprotocol/ext-apps package installed and wired into server-factory

affects: [159, 160, 161, 162, mcp-apps, rich-ui, artifact-preview]

# Tech tracking
tech-stack:
  added: ["@modelcontextprotocol/ext-apps@^1.3.2"]
  patterns:
    - "registerAppTool(server, name, config, handler) for MCP Apps tool registration"
    - "registerAppResource(server, name, uri, config, readCallback) for HTML resource"
    - "Dual-mode response: content[0].type='text' fallback + structuredContent for rich clients"
    - "CSP connectDomains in contents[]._meta.ui.csp (not registerAppResource config)"

key-files:
  created:
    - dashboard/lib/mcp/apps/artifact-preview.ts
  modified:
    - dashboard/lib/mcp/server-factory.ts
    - dashboard/__tests__/server-factory.test.ts
    - dashboard/.env.example
    - dashboard/package.json

key-decisions:
  - "CSP _meta.ui.csp belongs in contents[]._meta (read callback return value), not in registerAppResource config — config-level _meta is listing-level only"
  - "RESOURCE_MIME_TYPE constant used throughout — never hard-code text/html;profile=mcp-app"
  - "ARTIFACT_VIEWER_URI shared between registerAppResource and registerAppTool._meta.ui.resourceUri"
  - "BASE_URL resolves from NEXT_PUBLIC_APP_URL -> VERCEL_URL -> localhost:3000"

patterns-established:
  - "MCP Apps tools live in dashboard/lib/mcp/apps/ subdirectory"
  - "registerAppTool signature: (server, name, config, handler) — name is second arg, not in config"
  - "registerAppResource signature: (server, name, uri, config, readCallback) — uri is third arg"

requirements-completed: [RUI-01, RUI-02]

# Metrics
duration: 12min
completed: 2026-03-28
---

# Phase 158 Plan 01: MCP Apps ext-apps SDK Installation and Artifact Preview Tools Summary

**@modelcontextprotocol/ext-apps installed with registerArtifactPreviewTools wiring two dual-mode tools (preview_artifact, list_design_artifacts) and a CSP-declared HTML resource into the PDE MCP server**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-28T13:05:00Z
- **Completed:** 2026-03-28T13:06:30Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Installed @modelcontextprotocol/ext-apps@^1.3.2 and verified importable
- Created artifact-preview.ts with two registerAppTool calls (preview_artifact, list_design_artifacts) using RESOURCE_MIME_TYPE constant and dual-mode responses (RUI-01)
- Registered pde-artifact-viewer HTML resource with CSP connectDomains in contents[]._meta.ui.csp (RUI-02)
- Wired registerArtifactPreviewTools into server-factory.ts alongside existing registerPipelineTools
- All 6 vitest tests pass: 3 original registerPdeTools + 3 new RUI-01/RUI-02 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Install ext-apps, add env var, create test scaffolds** - `b6349b3` (feat)
2. **Task 2: Create artifact-preview.ts** - `2381ef3` (feat)
3. **Task 3: Wire artifact-preview into server-factory.ts** - `372a7d1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `dashboard/lib/mcp/apps/artifact-preview.ts` - registerArtifactPreviewTools: resource + 2 tools
- `dashboard/lib/mcp/server-factory.ts` - Added import + registerArtifactPreviewTools(server) call
- `dashboard/__tests__/server-factory.test.ts` - Added RUI-01/RUI-02 test blocks, updated mocks
- `dashboard/.env.example` - Added NEXT_PUBLIC_APP_URL=http://localhost:3000
- `dashboard/package.json` - Added @modelcontextprotocol/ext-apps@^1.3.2 dependency

## Decisions Made

- CSP `_meta.ui.csp` goes in `contents[]._meta` (returned by read callback), not in the `config` object passed to `registerAppResource`. The config-level `_meta` is a listing-level fallback only — per SDK type definitions and research pitfall #5.
- `registerAppTool` signature is `(server, name, config, handler)` not `(server, config, handler)` — name is the second positional arg per actual SDK declaration.
- `RESOURCE_MIME_TYPE` constant used throughout per research pitfall #1.
- `ARTIFACT_VIEWER_URI = 'ui://pde/artifact-viewer'` shared as module const between registerAppResource and registerAppTool._meta.ui.resourceUri.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Environment variable needed for CSP configuration:
- Add `NEXT_PUBLIC_APP_URL=https://your-domain.com` to production `.env` (or Vercel env vars)
- Defaults to `VERCEL_URL` auto-variable on Vercel, `http://localhost:3000` in local dev

## Next Phase Readiness

- registerArtifactPreviewTools is wired into server-factory and callable
- HTML resource pde-artifact-viewer is registered at `ui://pde/artifact-viewer`
- RUI-01 (dual-mode responses) and RUI-02 (CSP connectDomains) requirements satisfied
- Ready for Phase 158 Plan 02: iframe App component consuming structuredContent via app.ontoolresult

## Self-Check: PASSED

- FOUND: dashboard/lib/mcp/apps/artifact-preview.ts
- FOUND: dashboard/lib/mcp/server-factory.ts
- FOUND: .planning/phases/158-mcp-apps-rich-ui-design-artifact-preview/158-01-SUMMARY.md
- FOUND commit: b6349b3 (Task 1)
- FOUND commit: 2381ef3 (Task 2)
- FOUND commit: 372a7d1 (Task 3)
- All 6 vitest tests pass

---
*Phase: 158-mcp-apps-rich-ui-design-artifact-preview*
*Completed: 2026-03-28*
