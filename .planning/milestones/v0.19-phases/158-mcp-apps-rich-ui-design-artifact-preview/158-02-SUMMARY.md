---
phase: 158-mcp-apps-rich-ui-design-artifact-preview
plan: 02
subsystem: api
tags: [mcp, mcp-apps, resource-template, rich-ui, typescript, vitest, marked, rui-03]

# Dependency graph
requires:
  - phase: 158-01
    provides: registerArtifactPreviewTools with registerAppResource + registerAppTool (RUI-01, RUI-02)
  - phase: 156-mcp-infrastructure
    provides: server-factory.ts McpServer pattern

provides:
  - ResourceTemplate at ui://pde/{artifact} for dynamic artifact resource discovery (RUI-03)
  - Format-specific rendering: HTML pass-through, Markdown via marked, JSON/code pre blocks, SVG inline
  - tokens.css inlining for HTML artifacts referencing external design tokens
  - Error HTML page for missing artifacts (no thrown exceptions)
  - 7 RUI-03 unit tests in dashboard/__tests__/mcp-rich-ui.test.ts

affects: [159, 160, 161, 162, mcp-apps, rich-ui, artifact-preview]

# Tech tracking
tech-stack:
  added: ["marked@^17.0.5"]
  patterns:
    - "ResourceTemplate('ui://pde/{artifact}', { list }) for parameterized resource URIs"
    - "server.registerResource(name, template, metadata, readCallback) for dynamic URI scheme"
    - "wrapInHtmlShell(title, bodyHtml) for consistent HTML output"
    - "marked.parse(raw) as string for synchronous Markdown rendering"
    - "vi.mock with shared vi.fn() instances for default + named ESM exports"

key-files:
  created:
    - dashboard/__tests__/mcp-rich-ui.test.ts
  modified:
    - dashboard/lib/mcp/apps/artifact-preview.ts
    - dashboard/__tests__/server-factory.test.ts
    - dashboard/package.json
    - dashboard/package-lock.json
    - dashboard/lib/mcp/server-factory.ts

key-decisions:
  - "ResourceTemplate.uriTemplate is a UriTemplate object — use .uriTemplate.template for the string, not String(rt)"
  - "artifact-preview.ts uses default ESM import (import fs from 'node:fs/promises') — vi.mock must share vi.fn() between default and named exports"
  - "RUI-02 server-factory test updated to capture first static string URI resource callback, not last (dynamic template) callback"
  - "marked.parse() returns string synchronously in marked v17 — no await needed"

patterns-established:
  - "vi.mock factory returns { default: { readdir, readFile }, readdir, readFile } with shared fn refs"
  - "findArtifactReadCallback helper checks a.constructor?.name === 'ResourceTemplate' + a.uriTemplate?.template for reliable detection"

requirements-completed: [RUI-03]

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 158 Plan 02: ResourceTemplate ui://pde/{artifact} with Format-Specific Rendering Summary

**ResourceTemplate registered at ui://pde/{artifact} serving design artifacts as HTML previews via marked (Markdown), JSON pre blocks, and HTML pass-through with inlined tokens.css**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-28T20:10:40Z
- **Completed:** 2026-03-28T20:17:10Z
- **Tasks:** 2
- **Files modified:** 5 (+ 1 created)

## Accomplishments

- Installed marked@^17.0.5 for server-side Markdown rendering
- Added ResourceTemplate 'pde-design-artifact' at `ui://pde/{artifact}` to artifact-preview.ts
- Implemented wrapInHtmlShell(), renderArtifact(), escapeHtml(), renderErrorHtml() helpers
- HTML artifact: replaces `<link href="...tokens.css">` with inlined `<style>` block (tokens.css read from disk)
- Markdown artifact: rendered via `marked.parse()` wrapped in HTML shell with full styling
- JSON artifact: pretty-printed, HTML-escaped, shown in `<pre><code>` block
- SVG/TS/CSS/CSV: HTML-escaped and wrapped in pre block
- Error HTML returned for missing artifacts (never throws, preserves graceful degradation)
- Created 7 comprehensive RUI-03 unit tests — all pass
- Fixed RUI-02 test to correctly identify static viewer callback after dynamic template addition
- All 293 tests pass across 39 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create mcp-rich-ui.test.ts with RUI-03 test scaffolds** - `e782c3a` (test)
2. **Task 2: Add ResourceTemplate with format-specific rendering** - `c1ad3dc` (feat)

## Files Created/Modified

- `dashboard/__tests__/mcp-rich-ui.test.ts` — 7 RUI-03 tests with ResourceTemplate detection helper
- `dashboard/lib/mcp/apps/artifact-preview.ts` — ResourceTemplate, rendering helpers, marked import
- `dashboard/__tests__/server-factory.test.ts` — Fixed RUI-02 test to capture static callback
- `dashboard/package.json` — Added marked@^17.0.5 (installed as ^17.0.5)
- `dashboard/lib/mcp/server-factory.ts` — Import + registerArtifactPreviewTools wired (from Plan 01 baseline)

## Decisions Made

- `ResourceTemplate.uriTemplate` is a `UriTemplate` object (not a string). The template string is at `.uriTemplate.template`. Test detection uses `a.constructor?.name === 'ResourceTemplate'` for reliability.
- `import fs from 'node:fs/promises'` (default import) means `vi.mock` factory must share the same `vi.fn()` instances between `default.readFile` and named export `readFile`. Tests mock `fs.default.readFile`.
- `marked.parse()` is synchronous in marked v17 — the return type is `string` directly (no Promise wrapping needed).
- `vi.resetModules()` in beforeEach with shared mock functions requires the mock factory to return the same fn instances via closure, not create new ones per import.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ResourceTemplate detection in test helpers**
- **Found during:** Task 1 → Task 2 test run
- **Issue:** Test used `String(a.uriTemplate).includes('ui://pde/')` but `ResourceTemplate.uriTemplate` is a `UriTemplate` object, not a string. `String(obj)` returns `[object Object]`.
- **Fix:** Changed detection to `a.constructor?.name === 'ResourceTemplate' && a.uriTemplate?.template?.includes('ui://pde/')`
- **Files modified:** `dashboard/__tests__/mcp-rich-ui.test.ts`

**2. [Rule 1 - Bug] Fixed vi.mock ESM default import mismatch**
- **Found during:** Task 2 test run (markdown/JSON tests failing)
- **Issue:** Test set up `(fs.readFile as any).mockResolvedValue(...)` using the named export, but `artifact-preview.ts` uses `import fs from 'node:fs/promises'` (default import) — different `vi.fn()` instance was being mocked.
- **Fix:** Changed `vi.mock` factory to share the same `vi.fn()` between `default.readFile` and named `readFile`. Tests mock `fs.default.readFile`.
- **Files modified:** `dashboard/__tests__/mcp-rich-ui.test.ts`

**3. [Rule 1 - Bug] Fixed RUI-02 server-factory test after second registerResource call added**
- **Found during:** Task 2 test run
- **Issue:** Plan 01's RUI-02 test captured "the last registered resource callback", but Plan 02 added a second `registerResource` call (the dynamic template). The test now captured the wrong callback.
- **Fix:** Updated test to capture only the first `registerResource` call where the second arg is a string URI (static viewer), not a ResourceTemplate object.
- **Files modified:** `dashboard/__tests__/server-factory.test.ts`

## Known Stubs

None — ResourceTemplate, rendering helpers, and tests are fully wired and functional.

## Self-Check: PASSED

- FOUND: dashboard/__tests__/mcp-rich-ui.test.ts
- FOUND: dashboard/lib/mcp/apps/artifact-preview.ts (contains ResourceTemplate, marked, renderArtifact)
- FOUND commit: e782c3a (Task 1)
- FOUND commit: c1ad3dc (Task 2)
- All 293 vitest tests pass

---
*Phase: 158-mcp-apps-rich-ui-design-artifact-preview*
*Completed: 2026-03-28*
