---
phase: 158-mcp-apps-rich-ui-design-artifact-preview
verified: 2026-03-28T13:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 158: MCP Apps Rich UI + Design Artifact Preview — Verification Report

**Phase Goal:** PDE tool responses render as interactive HTML inside MCP Apps-capable AI chat clients, and design artifacts are directly previewable via a resource URI scheme
**Verified:** 2026-03-28T13:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Tool responses in MCP Apps-capable clients include `_meta.ui.resourceUri` pointing to a registered resource | VERIFIED | `artifact-preview.ts` lines 233, 259: `_meta: { ui: { resourceUri: ARTIFACT_VIEWER_URI } }` present in both `preview_artifact` and `list_design_artifacts` registerAppTool configs |
| 2 | Tool responses include a plain text fallback in `content[0].type === 'text'` for stdio clients | VERIFIED | Lines 236–242 and 273–279: both tool handlers return `content: [{ type: 'text' as const, text: ... }]` plus `structuredContent` |
| 3 | Resource contents include `_meta.ui.csp.connectDomains` with the app base URL | VERIFIED | Lines 209–214: static viewer resource returns `_meta.ui.csp.connectDomains: [BASE_URL]` and `resourceDomains: [BASE_URL]`; lines 343–349 and 358–364: dynamic template resource returns `connectDomains: [BASE_URL]` |
| 4 | `registerPdeTools` calls both pipeline tool registration and rich app tool registration | VERIFIED | `server-factory.ts` lines 28–29: `registerPipelineTools(server)` and `registerArtifactPreviewTools(server)` both called |
| 5 | Design artifacts are accessible via `ui://pde/{artifact}` ResourceTemplate | VERIFIED | `artifact-preview.ts` lines 284–306: `server.registerResource('pde-design-artifact', new ResourceTemplate('ui://pde/{artifact}', { list }), ...)` |
| 6 | Resource handler reads artifact files from `.planning/design/` and wraps in HTML | VERIFIED | Lines 311–372: reads file via `fs.readFile(filePath, 'utf-8')`, dispatches through `renderArtifact()` for non-HTML formats |
| 7 | HTML artifacts pass through with inlined CSS (no external link tags) | VERIFIED | Lines 318–335: replaces `<link href="...tokens.css">` via regex with `<style>${tokensCss}</style>`, falls back to stripping tag on ENOENT |
| 8 | Markdown artifacts are server-rendered to HTML via marked | VERIFIED | Lines 166–170: `marked.parse(raw) as string` wrapped in `wrapInHtmlShell()` |
| 9 | JSON artifacts render with syntax highlighting in a `<pre>` block | VERIFIED | Lines 172–181: `JSON.stringify(JSON.parse(raw), null, 2)` HTML-escaped, wrapped in `<pre><code>` |
| 10 | MCP App HTML panels declare CSP `connectDomains` pointing to app base URL | VERIFIED | `BASE_URL` resolves `NEXT_PUBLIC_APP_URL ?? VERCEL_URL ?? 'http://localhost:3000'`; `.env.example` documents `NEXT_PUBLIC_APP_URL=http://localhost:3000` |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `dashboard/lib/mcp/apps/artifact-preview.ts` | registerAppTool + registerAppResource calls for preview_artifact tool; exports registerArtifactPreviewTools | VERIFIED | 375-line file — substantive; exports `registerArtifactPreviewTools`; imports from `@modelcontextprotocol/ext-apps/server`; wired into server-factory |
| `dashboard/lib/mcp/server-factory.ts` | Updated to call registerArtifactPreviewTools | VERIFIED | Line 4 imports from `./apps/artifact-preview`; line 29 calls `registerArtifactPreviewTools(server)` |
| `dashboard/__tests__/server-factory.test.ts` | Tests for RUI-01 and RUI-02 requirements | VERIFIED | Contains `registerArtifactPreviewTools — RUI-01 dual-mode responses` and `registerArtifactPreviewTools — RUI-02 CSP connectDomains` describe blocks; all 6 tests pass |
| `dashboard/__tests__/mcp-rich-ui.test.ts` | Tests for RUI-03 artifact resource scheme | VERIFIED | 176-line file; contains `artifact resource template — RUI-03` describe block with 7 tests; all pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dashboard/lib/mcp/server-factory.ts` | `dashboard/lib/mcp/apps/artifact-preview.ts` | `import { registerArtifactPreviewTools } from './apps/artifact-preview'` | WIRED | Import on line 4; call on line 29 |
| `dashboard/lib/mcp/apps/artifact-preview.ts` | `@modelcontextprotocol/ext-apps/server` | `import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE }` | WIRED | Lines 1–5; all three names used throughout file |
| `dashboard/lib/mcp/apps/artifact-preview.ts` | `@modelcontextprotocol/sdk/server/mcp.js` | `import { ResourceTemplate }` | WIRED | Line 6; used on line 286 |
| `dashboard/lib/mcp/apps/artifact-preview.ts` | `.planning/design/` | `fs.readdir` + `fs.readFile` | WIRED | Lines 262–268 (list_design_artifacts), lines 287–304 (ResourceTemplate list), lines 316–316 (read callback) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `artifact-preview.ts` — `preview_artifact` tool | `name` (input param) | Handler `({ name })` — receives from caller | Yes — caller-supplied, no hardcoded empty | FLOWING |
| `artifact-preview.ts` — `list_design_artifacts` tool | `files` array | `fs.readdir(designDir, { recursive: true })` at runtime | Yes — reads live filesystem | FLOWING |
| `artifact-preview.ts` — ResourceTemplate read callback | `raw` string | `fs.readFile(filePath, 'utf-8')` | Yes — reads live artifact file | FLOWING |
| `artifact-preview.ts` — static viewer resource | HTML content | `buildArtifactViewerHtml()` returns self-contained placeholder HTML | Yes — intentional placeholder for the MCP App shell (content updated via `app.ontoolresult` in client) | FLOWING |
| Test: `mcp-rich-ui.test.ts` | `result.contents[0].mimeType` | `fs.default.readFile` mock + `RESOURCE_MIME_TYPE` constant | Confirmed equals `'text/html;profile=mcp-app'` at runtime | FLOWING |

Note: The static viewer HTML contains "Artifact preview will appear here when a tool result is received." — this is the intended placeholder text per UI-SPEC, populated at runtime by the MCP Apps client via `app.ontoolresult`. It is NOT a stub.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All RUI-01/RUI-02 tests pass | `vitest run __tests__/server-factory.test.ts` | 6/6 pass | PASS |
| All RUI-03 tests pass | `vitest run __tests__/mcp-rich-ui.test.ts` | 7/7 pass | PASS |
| `@modelcontextprotocol/ext-apps` importable | `node -e "require('@modelcontextprotocol/ext-apps/server')"` | Exit 0, no errors | PASS |
| No hard-coded MIME type string | `grep "text/html;profile=mcp-app" artifact-preview.ts` | No match — RESOURCE_MIME_TYPE used exclusively | PASS |
| All 5 task commits present | `git log --oneline b6349b3 2381ef3 372a7d1 e782c3a c1ad3dc` | All 5 commits found | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RUI-01 | 158-01-PLAN.md | Tool handlers return type: 'resource' blocks with text/html;profile=mcp-app MIME plus text fallback | SATISFIED | Both `preview_artifact` and `list_design_artifacts` return `content[0].type='text'` fallback + `structuredContent`; `_meta.ui.resourceUri` points to registered resource; tests pass |
| RUI-02 | 158-01-PLAN.md | MCP App HTML resources declare required origins in `_meta.ui.csp.connectDomains` | SATISFIED | Static viewer resource returns `connectDomains: [BASE_URL]` and `resourceDomains: [BASE_URL]`; dynamic template resource returns `connectDomains: [BASE_URL]`; test in server-factory.test.ts asserts array is defined |
| RUI-03 | 158-02-PLAN.md | Design artifacts accessible via `ui://pde/[artifact]` resource scheme in AI chat clients | SATISFIED | `ResourceTemplate('ui://pde/{artifact}')` registered with `list` callback for discovery; read callback serves format-specific HTML; 7 tests cover markdown, JSON, HTML pass-through, error case |

No orphaned requirements — RUI-04 and RUI-05 are mapped to Phase 159 in REQUIREMENTS.md and were not claimed by any Phase 158 plan.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODOs, FIXMEs, empty implementations, placeholder handlers, or hardcoded empty data arrays found in phase-modified files. The static viewer HTML's placeholder div is intentional per UI-SPEC (populated by MCP Apps client at runtime).

---

### Human Verification Required

#### 1. HTML Panel Renders in Claude.ai / MCP Apps Client

**Test:** Connect PDE MCP server to an MCP Apps-capable client (Claude.ai or compatible). Call `preview_artifact` with a valid artifact name. Observe whether an HTML panel appears rather than raw text.
**Expected:** A rendered HTML panel appears with the design artifact content.
**Why human:** Requires a live MCP Apps client — cannot verify the host rendering pipeline programmatically.

#### 2. CSP Allows Callbacks Without Errors

**Test:** In the same MCP Apps client, observe whether the HTML panel can make fetch/XHR requests to the PDE domain without Content Security Policy errors in the browser console.
**Expected:** No CSP violation errors; `connectDomains` declaration allows callbacks to the PDE app URL.
**Why human:** Requires browser DevTools inspection of a running MCP Apps client session.

#### 3. Stdio Client Fallback Behavior

**Test:** Call `preview_artifact` or `list_design_artifacts` via a plain stdio MCP client (e.g., direct JSON-RPC). Verify only the `content[0].text` field is used and no UI-specific metadata causes errors.
**Expected:** stdio client receives and displays the plain text response with no errors.
**Why human:** Requires a live stdio MCP client connection.

---

### Gaps Summary

No gaps. All 10 must-have truths are verified, all 4 artifacts pass all levels (exists, substantive, wired, data-flowing), all 4 key links are wired, all 3 requirement IDs are satisfied, and no anti-patterns were found. The phase goal is achieved in code: tool responses are registered with dual-mode outputs (HTML resource URI + text fallback) and design artifacts are accessible via the `ui://pde/{artifact}` scheme. Three items are flagged for human verification because they require a live MCP Apps-capable client to confirm the host rendering side of the contract.

---

_Verified: 2026-03-28T13:30:00Z_
_Verifier: Claude (gsd-verifier)_
