# WebMCP Architecture Research: Browser Integration for PDE

**Domain:** Browser-based MCP integration into Claude Code plugin architecture
**Researched:** 2026-03-23
**Overall confidence:** MEDIUM-HIGH (Playwright MCP: HIGH, WebMCP spec: LOW)

---

## Executive Summary

"WebMCP integration" for PDE decomposes into two distinct capabilities:

1. **Playwright MCP** (browser automation) -- gives PDE workflows the ability to navigate, screenshot, and interact with web pages. Immediately actionable. Slots into existing mcp-bridge.cjs as 7th approved server.

2. **WebMCP W3C standard** (browser exposure) -- makes PDE's planning state available to browser-based AI consumers via `navigator.modelContext`. Deferred until PDE-as-MCP-server (v0.14 Phase B) exists.

This document covers both, with emphasis on Playwright MCP integration since it delivers immediate value.

---

## 1. How Browser-Based MCP Integrates with mcp-bridge.cjs

### Current Architecture

```
                         mcp-bridge.cjs
                    +--------------------+
                    |  APPROVED_SERVERS  |  6 entries: github, linear, figma, pencil, atlassian, stitch
                    |  TOOL_MAP          |  46 entries: canonical -> raw MCP tool names
                    |  probe()           |  Check server availability
                    |  call()            |  Canonical name -> raw tool name lookup
                    |  assertApproved()  |  Security policy enforcement
                    +--------------------+
                              |
              Claude Code MCP Runtime (actual tool execution)
                              |
         +--------+--------+--------+--------+--------+
         | GitHub | Linear | Figma  | Pencil | Stitch |
         | (http) | (http) | (http) | (stdio)| (stdio)|
         +--------+--------+--------+--------+--------+
```

### Proposed Architecture (with Playwright MCP)

```
                         mcp-bridge.cjs
                    +--------------------+
                    |  APPROVED_SERVERS  |  7 entries: + playwright
                    |  TOOL_MAP          |  ~56 entries: + 10 playwright tools
                    |  probe()           |  Same contract
                    |  call()            |  Same contract
                    |  assertApproved()  |  Same policy
                    +--------------------+
                              |
              Claude Code MCP Runtime
                              |
    +--------+--------+--------+--------+--------+--------+-----------+
    | GitHub | Linear | Figma  | Pencil | Stitch | Atlsn  | Playwright|
    | (http) | (http) | (http) | (stdio)| (stdio)| (sse)  | (stdio)   |
    +--------+--------+--------+--------+--------+--------+-----------+
                                                                |
                                                         Headless Chrome
                                                         (spawned by npx)
```

### Integration Pattern

Playwright MCP follows the exact same integration pattern as Stitch:

| Aspect | Stitch (existing) | Playwright (proposed) |
|--------|-------------------|----------------------|
| Transport | stdio | stdio |
| Install command | `claude mcp add stitch -- npx @_davideast/stitch-mcp proxy` | `claude mcp add playwright -- npx @playwright/mcp@latest --headless` |
| npm deps at plugin root | Zero | Zero |
| Probe tool | `mcp__stitch__list_projects` | `mcp__playwright__browser_navigate` (or `browser_snapshot`) |
| TOOL_MAP confidence | MEDIUM (VERIFY_REQUIRED) | MEDIUM (VERIFY_REQUIRED -- tool name prefix needs live verification) |

---

## 2. Transport Recommendation

**Use stdio transport.** Rationale:

| Transport | Pros | Cons | Verdict |
|-----------|------|------|---------|
| stdio | Same as Stitch/Pencil pattern, zero network config, process lifecycle managed by Claude Code | Browser process lives inside Claude Code session lifecycle | **Recommended** |
| HTTP/SSE | Could share browser across sessions | Requires port management, extra process management, no existing PDE pattern for self-hosted HTTP MCP | Not recommended |

Claude Code supports stdio and HTTP/SSE MCP transports. PDE's existing stdio servers (Pencil, Stitch) demonstrate the pattern works well. The browser process spawns with `npx @playwright/mcp@latest --headless` and dies when the session ends.

---

## 3. Separate Server vs Integrated into Plugin

**Separate MCP server process** (like all existing PDE MCP integrations). Not integrated into plugin.

Rationale:
- PDE's mcp-bridge.cjs is a policy/coordination layer, not an MCP runtime. It never calls MCP tools directly.
- Playwright MCP is Microsoft's maintained package. PDE should consume it, not fork/embed it.
- Zero npm dependencies at plugin root is a hard constraint. Embedding Playwright would add hundreds of MB of browser binaries.
- The existing `claude mcp add` pattern works for Stitch and Pencil, both stdio. Playwright follows the same pattern.

---

## 4. PDE Workflows That Benefit from Browser Automation

### 4a. Wireframe Verification (wireframe.md Step 5d)

**Current state:** Already has `--no-playwright` flag and Playwright MCP probe in Step 3. Step 5d says: "If PLAYWRIGHT_AVAILABLE is true AND --no-playwright is not set: attempt to open index.html using a Playwright MCP tool call for screenshot validation."

**What to build:**
```
After wireframe HTML files are written to .planning/design/ux/wireframes/:
1. browser_navigate to file:///absolute/path/to/.planning/design/ux/wireframes/index.html
2. browser_take_screenshot -> save to .planning/design/ux/wireframes/screenshots/index.png
3. For each screen HTML file:
   a. browser_navigate to file:///path/to/screen-{name}.html
   b. browser_take_screenshot -> save to screenshots/{name}.png
4. Log results to mcp-debug.log
```

**Value:** Visual confirmation that wireframes render correctly. Screenshots become inputs to critique.

**Complexity:** Low -- the workflow stub already exists.

### 4b. Mockup Screenshot Comparison (mockup.md)

**Current state:** Mockup workflow generates HTML mockup files. No automated visual comparison.

**What to build:**
```
After mockup HTML is generated:
1. browser_navigate to mockup file
2. browser_take_screenshot -> .planning/design/visual/mockups/screenshots/
3. If previous version exists:
   Compare screenshots (perceptual hash or structural diff)
   Log differences in iterate recommendation
```

**Value:** Catch visual regressions between mockup versions. Feed differences into /pde:critique.

**Complexity:** Medium -- screenshot capture is Low, comparison logic is Medium (no npm deps for image diff means basic file-size or hash comparison).

### 4c. Deploy Verification (deploy.md)

**Current state:** deploy.md queues Vercel deployment and outputs `$DEPLOY_URL`. No automated post-deploy verification.

**What to build:**
```
After Vercel deploy returns $DEPLOY_URL:
1. Wait for build (poll or use --no-wait then check later)
2. browser_navigate to $DEPLOY_URL
3. browser_snapshot -> check accessibility tree for expected sections
4. browser_take_screenshot -> save to .planning/deploy-staging/deploy-screenshot.png
5. Verify: hero section present, pricing section present, CTA visible
6. Log pass/fail to deploy-manifest.json
```

**Value:** Automated smoke test that deploy actually renders the landing page. Closes the gap between "deployed" and "verified deployed."

**Complexity:** Low-Medium -- navigation and screenshot are trivial, section verification requires parsing accessibility tree.

### 4d. Critique Accessibility Audit (critique.md)

**Current state:** Critique uses Axe MCP for accessibility scanning. Playwright MCP provides accessibility tree snapshots via `browser_snapshot`.

**What to build:**
```
During critique Step 4 (accessibility perspective):
1. If PLAYWRIGHT_AVAILABLE:
   a. browser_navigate to wireframe HTML
   b. browser_snapshot -> get full accessibility tree
   c. Feed tree into accessibility analysis alongside Axe results
2. If both Playwright and Axe unavailable:
   Fall back to manual WCAG checklist (existing degraded path)
```

**Value:** Richer accessibility data. `browser_snapshot` returns the full AOM (Accessibility Object Model) tree, which reveals missing landmarks, unlabeled controls, and heading hierarchy issues that static HTML analysis misses.

**Complexity:** Low -- `browser_snapshot` is a single tool call, parsing is text processing.

---

## 5. Browser State Management Across Sessions

### Session Model

Playwright MCP spawns a **fresh browser instance** per Claude Code session. When the session ends, the browser process dies. This means:

- No persistent cookies across sessions
- No persistent localStorage across sessions
- Each session starts with a clean browser state
- Auth-gated pages need re-authentication each session

### Strategies for PDE

| Scenario | Strategy | Notes |
|----------|----------|-------|
| Local wireframe validation (file://) | No state needed | File paths are deterministic |
| Deploy verification (public URL) | No state needed | Vercel preview URLs are public |
| Auth-gated deploy preview | Manual login via headed mode | Use `--no-headless` for deploy verification when auth required |
| Competitive analysis (external URLs) | Ephemeral -- no state | One-shot navigation and screenshot |

### Recommendation

Do NOT attempt browser state persistence. PDE's primary use cases (wireframe screenshot, deploy smoke test, a11y tree capture) all work against public URLs or local files. The complexity of cookie/session injection is not worth it for PDE's scope.

If future workflows require auth-gated browser access:
1. Run Playwright MCP in headed mode (`--no-headless` flag or omit `--headless`)
2. User manually logs in through the visible browser window
3. Playwright MCP maintains cookies for the duration of that session
4. This is the same approach Simon Willison documents for Claude Code + Playwright MCP

---

## 6. Minimal Architecture: Zero npm Dependencies

### File Changes Required

```
bin/lib/mcp-bridge.cjs
  APPROVED_SERVERS: Add 'playwright' entry (7 lines)
  TOOL_MAP: Add ~10 canonical -> raw tool name mappings (~10 lines)
  AUTH_INSTRUCTIONS: Add 'playwright' entry (4 lines)

references/mcp-integration.md
  Add Playwright MCP section to enhancement recipes
  Update server count from 7 to 8 (2 universal + 6 targeted)

workflows/wireframe.md
  Step 5d: Replace stub with actual Playwright MCP tool calls
  No structural change -- the probe/degrade infrastructure already exists

workflows/critique.md
  Add optional browser_snapshot call in accessibility perspective
  Follows existing Axe MCP degradation pattern

workflows/deploy.md (optional, lower priority)
  Add post-deploy smoke test after Gate 4/4 success
  New Step 4b between Step 4 and Step 5

workflows/mockup.md (optional, lower priority)
  Add screenshot capture after mockup generation
```

### What NOT to Change

- **No new npm dependencies** at plugin root
- **No new bin/ scripts** -- all browser calls go through Claude Code MCP runtime
- **No new file-based state format** -- screenshots go in existing design directories
- **No changes to core.cjs** -- mcp-bridge.cjs additions are self-contained

---

## 7. Proposed APPROVED_SERVERS Entry

```javascript
playwright: {
  displayName: 'Playwright',
  transport: 'stdio',
  url: null,
  installCmd: 'claude mcp add playwright -- npx @playwright/mcp@latest --headless',
  probeTimeoutMs: 10000,
  probeTool: 'mcp__playwright__browser_snapshot', // TOOL_MAP_VERIFY_REQUIRED
  probeArgs: {},
},
```

### Proposed TOOL_MAP Entries

```javascript
// Playwright -- Phase TBD (TOOL_MAP_VERIFY_REQUIRED -- tool name prefix mcp__playwright__* needs live verification)
'playwright:probe':           'mcp__playwright__browser_snapshot',       // TOOL_MAP_VERIFY_REQUIRED
'playwright:navigate':        'mcp__playwright__browser_navigate',       // TOOL_MAP_VERIFY_REQUIRED
'playwright:screenshot':      'mcp__playwright__browser_take_screenshot',// TOOL_MAP_VERIFY_REQUIRED
'playwright:snapshot':        'mcp__playwright__browser_snapshot',       // TOOL_MAP_VERIFY_REQUIRED
'playwright:click':           'mcp__playwright__browser_click',          // TOOL_MAP_VERIFY_REQUIRED
'playwright:type':            'mcp__playwright__browser_type',           // TOOL_MAP_VERIFY_REQUIRED
'playwright:wait':            'mcp__playwright__browser_wait_for',       // TOOL_MAP_VERIFY_REQUIRED
'playwright:evaluate':        'mcp__playwright__browser_evaluate',       // TOOL_MAP_VERIFY_REQUIRED
'playwright:pdf':             'mcp__playwright__browser_pdf_save',       // TOOL_MAP_VERIFY_REQUIRED
'playwright:close':           'mcp__playwright__browser_close',          // TOOL_MAP_VERIFY_REQUIRED
```

### Proposed AUTH_INSTRUCTIONS Entry

```javascript
playwright: [
  '1. Run: claude mcp add playwright -- npx @playwright/mcp@latest --headless',
  '2. Verify: claude mcp list | grep playwright',
  '3. Return here and run /pde:connect playwright --confirm',
  '   Note: Playwright MCP requires no authentication -- it runs a local browser.',
  '   Use "claude mcp add playwright -- npx @playwright/mcp@latest" (without --headless)',
  '   if you want to see the browser window during operation.',
],
```

---

## 8. Suggested Build Order

### Phase 1: Infrastructure (1 phase)

1. Add `playwright` to APPROVED_SERVERS in mcp-bridge.cjs
2. Add 10 TOOL_MAP entries (VERIFY_REQUIRED)
3. Add AUTH_INSTRUCTIONS entry
4. Update mcp-integration.md reference with Playwright enhancement recipe
5. Live-verify tool names (same validation pattern as Phase 44 for Stitch)
6. Write probe integration test

### Phase 2: Wireframe Integration (1 phase)

1. Wire wireframe.md Step 5d to use actual Playwright MCP calls
2. Implement screenshot capture for each wireframe HTML
3. Save screenshots to `.planning/design/ux/wireframes/screenshots/`
4. Test with `--no-playwright` degradation path
5. Update wireframe spec template with screenshot references

### Phase 3: Critique Integration (1 phase)

1. Add `browser_snapshot` call in critique accessibility perspective
2. Parse AOM tree for landmark, heading, and label analysis
3. Merge with existing Axe MCP results (when both available)
4. Test degradation: no Playwright, no Axe, neither

### Phase 4: Deploy Verification (1 phase)

1. Add post-deploy smoke test in deploy.md after Gate 4/4 success
2. Navigate to $DEPLOY_URL, take screenshot, check for expected sections
3. Write results to deploy-manifest.json
4. Handle timeout/failure gracefully (deploy may still be building)

---

## 9. WebMCP W3C Standard (Phase C -- Deferred Analysis)

### What WebMCP Actually Is

WebMCP is NOT browser automation. It is a W3C standard (`navigator.modelContext`) that lets websites declare structured tools for AI agent consumption. The relationship:

```
Traditional MCP:  Agent <-> MCP Server <-> Service
                  (Claude)  (stdio/http)  (GitHub API)

WebMCP:           Agent <-> Browser <-> Website
                  (Claude)  (Chrome 146)  (navigator.modelContext)
```

With WebMCP, the website itself registers tools via JavaScript:
```javascript
navigator.modelContext.registerTool({
  name: 'get_project_status',
  description: 'Get current PDE project status',
  handler: async () => { /* return project data */ }
});
```

### How It Would Apply to PDE

For PDE to expose state via WebMCP:
1. PDE needs to BE an MCP server first (v0.14 Phase B: EXT-05 through EXT-08)
2. A web frontend needs to exist that displays PDE data (Phase C: EXT-10)
3. That frontend registers tools via `navigator.modelContext.registerTool()` (EXT-09)
4. External browser-based AI agents can then discover and call those tools (EXT-11)

### Why Defer

| Factor | Status | Implication |
|--------|--------|------------|
| Chrome 146 support | Canary/early preview only | Not production-ready |
| Firefox support | 8-12 weeks from Chrome 146 | Cross-browser impossible today |
| Safari support | No timeline committed | Apple Watch-and-wait mode |
| Spec stability | W3C Draft Community Group Report | API surface may change |
| PDE-as-MCP-server | Does not exist yet | Hard prerequisite |

---

## 10. Critical Pitfalls

### Pitfall 1: Confusing Playwright MCP with WebMCP
**What goes wrong:** Building WebMCP exposure when the immediate need is browser automation
**Prevention:** Playwright MCP = PDE controls a browser. WebMCP = browser exposes PDE to external agents. Completely different directions.

### Pitfall 2: Headed browser in autonomous execution
**What goes wrong:** Subagent worktrees spawn visible Chrome windows, stealing focus and creating zombie processes
**Prevention:** Always pass `--headless` in APPROVED_SERVERS installCmd. Only use headed mode in interactive debugging.

### Pitfall 3: Tool name prefix mismatch
**What goes wrong:** Assuming tool names are `mcp__playwright__browser_navigate` when Claude Code may use a different namespace prefix
**Prevention:** All TOOL_MAP entries marked VERIFY_REQUIRED. Live verification phase before workflow integration.

### Pitfall 4: File:// URL restrictions
**What goes wrong:** Playwright MCP may restrict file:// navigation for security reasons
**Prevention:** Test file:// navigation in Phase 1 infrastructure work. If blocked, serve wireframes via `npx serve` (one-liner, no deps).

### Pitfall 5: Browser process cleanup
**What goes wrong:** Orphaned Chrome processes when Claude Code session crashes
**Prevention:** Playwright MCP handles process lifecycle internally. PDE does not manage browser processes. If orphans occur, they are Playwright MCP's responsibility, not PDE's.

---

## Sources

- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp) -- Official Microsoft repository (HIGH confidence)
- [Simon Willison: Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) -- Practical setup guide (HIGH confidence)
- [Builder.io: Playwright MCP Server with Claude Code](https://www.builder.io/blog/playwright-mcp-server-claude-code) -- Integration patterns (HIGH confidence)
- [WebMCP W3C Draft](https://webmachinelearning.github.io/webmcp/) -- Specification (LOW confidence -- draft status)
- [Patrick Brosset: WebMCP updates](https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/) -- Spec author clarifications (MEDIUM confidence)
- [Chrome 146 WebMCP early preview](https://venturebeat.com/infrastructure/google-chrome-ships-webmcp-in-early-preview-turning-every-website-into-a) -- Browser support (MEDIUM confidence)
- [WebMCP browser compatibility status](https://dev.to/ai-agent-economy/webmcp-in-2026-which-browsers-support-navigatormodelcontext-complete-compatibility-status-1oe4) -- Cross-browser status (MEDIUM confidence)
- PDE codebase: mcp-bridge.cjs, wireframe.md, critique.md, deploy.md, mockup.md, mcp-integration.md (verified from source)
