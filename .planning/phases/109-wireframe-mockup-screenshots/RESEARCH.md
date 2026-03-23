# Phase 109: Wireframe + Mockup Screenshots — Research

**Researched:** 2026-03-23 (MAXDEPTH update)
**Domain:** Playwright MCP tool usage, workflow prose modification, file:// screenshot capture
**Confidence:** HIGH (verified against source code, npm registry, and project source files)

## Summary

Phase 109 is a **workflow prose modification phase**, not a library integration phase. The Playwright MCP server was fully registered in Phase 108 as the 7th APPROVED_SERVER with all 10 TOOL_MAP entries. Phase 109 only needs to expand the existing `### 5d` and `### 7f` stubs in `wireframe.md` and `mockup.md` into fully-specified screenshot capture loops — then write Nyquist tests that verify the prose exists at the right spots.

**Three findings from this maxdepth research update prior research:**

First, `browser_resize` IS available in the current `@playwright/mcp` package. It is defined in `common.js` with `{ width: number, height: number }` parameters and calls `page.setViewportSize()`. This resolves the WFR-05 viewport uncertainty. Add `playwright:resize` to TOOL_MAP and call it before navigating to set 1280x800.

Second, the `filename` parameter in `browser_take_screenshot` is **not name-only**. The parameter description says "Prefer relative file names to stay within the output directory." The source code calls `workspaceFile()` when `suggestedFilename` is provided, resolving it relative to the Claude Code workspace root. A relative path like `.planning/design/ux/wireframes/screenshots/WFR-login.png` will save directly to that path — but the directory must already exist (no auto-mkdir). This is a correction to prior research: subdirectory paths in `filename` DO work when relative to workspace.

Third, the image is returned as base64 in the MCP tool response regardless of whether a filename is provided (via `registerImageResult` → `content.push({ type: "image", data: scaledData.toString("base64") })`). Claude Code receives both the file-link text AND the image content.

**Primary recommendation:** Expand wireframe.md Step 5d and mockup.md Step 7f with explicit per-file screenshot loops: (1) `mkdir -p` the screenshots directory, (2) `browser_resize` to 1280x800, (3) for each HTML file: `browser_navigate` to file:// URL, `browser_take_screenshot` with relative filename path, `browser_close`. Add `playwright:resize` TOOL_MAP entry. Write WFR-tagged and MOK-tagged Nyquist structural tests.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WFR-01 | wireframe.md Step 5d wired to capture screenshots of each wireframe HTML via Playwright MCP | Expand Step 5d stub into full per-file loop using bridge `playwright:resize` + `playwright:navigate` + `playwright:screenshot` + `playwright:close` tool calls |
| WFR-02 | Screenshots saved to `.planning/design/ux/wireframes/screenshots/` | `mkdir -p` before loop; use relative filename path in `browser_take_screenshot` |
| WFR-03 | Multi-page wireframes handled (index.html + screen-*.html each screenshotted) | Step 5d loop must iterate: index.html + all WFR-{slug}.html files generated in this batch |
| WFR-04 | `--no-playwright` flag preserves existing degradation path (no screenshots, no error) | Already gated by PLAYWRIGHT_AVAILABLE check in Step 5d — preserve gate exactly |
| WFR-05 | Viewport configured for consistent wireframe dimensions (1280x800 default) | Call `browser_resize { width: 1280, height: 800 }` before navigate loop — confirmed available in current source |
| MOK-01 | mockup.md captures screenshots of generated mockup HTML files via Playwright MCP | Expand Step 7f stub into full loop at same pattern as wireframe |
| MOK-02 | Screenshots saved to `.planning/design/visual/mockups/screenshots/` (per REQUIREMENTS.md) | FLAG: mockup HTML lives at `ux/mockups/`, not `visual/mockups/` — likely typo; use `ux/mockups/screenshots/` and flag for confirmation |
| MOK-03 | `--no-playwright` degradation path (mockup workflow completes without screenshots) | Same PLAYWRIGHT_AVAILABLE gate that already exists in Step 7f |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/mcp` | `0.0.68` (latest as of 2026-03-23) | Browser automation via MCP | Already registered in Phase 108 — only MCP-based browser tool in this project |
| `mcp-bridge.cjs` | internal | Canonical tool name lookup + policy enforcement | Phase 108 infrastructure — all MCP calls go through this bridge |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` / `Bash mkdir -p` | Node built-in | Create `screenshots/` directory before loop | Always — `workspaceFile()` does NOT auto-create directories; they must exist |
| `node:path` (in bridge bash blocks) | Node built-in | Construct absolute `file://` paths with `%20` encoding | Always — project path has spaces |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright MCP via bridge | Direct `npx playwright` CLI | Violates PDE architecture — all browser calls go through MCP bridge |
| Relative filename path in `browser_take_screenshot` | Write tool from response content | Both work; relative filename is simpler and saves a step; directory must exist |
| `browser_resize` before each file | `--viewport-size` at server launch | Server launch args not under workflow control; `browser_resize` is the runtime approach |

**Installation:** No new packages. Playwright MCP already installed by user via Phase 108 AUTH_INSTRUCTIONS. Current version `0.0.68` confirmed via `npm view @playwright/mcp version`.

**Version note:** The fallback version in AUTH_INSTRUCTIONS is `0.0.41`. The current latest is `0.0.68`. The instruction `@latest` is correct. The pin `0.0.41` is now stale; if a newer pin is needed, use `0.0.68`.

---

## Architecture Patterns

### Recommended Project Structure

```
workflows/
├── wireframe.md     # Expand Step 5d (lines ~2121-2123)
└── mockup.md        # Expand Step 7f (lines ~1444-1458)

bin/lib/
└── mcp-bridge.cjs   # Add playwright:resize entry (one new line)

tests/
└── phase-109/
    └── wireframe-mockup-screenshots.test.mjs  # Nyquist structural tests

.planning/design/ux/wireframes/screenshots/    # WFR screenshot output (created at runtime)
.planning/design/ux/mockups/screenshots/       # MOK screenshot output (created at runtime)
```

### Pattern 1: Bridge Lookup + MCP Tool Call

**What:** Resolve raw MCP tool names via `bridge.call()` in a bash block, then instruct Claude Code to call those tools in its execution context. The tool call itself is NOT inside a bash block.

**When to use:** Every MCP tool invocation in any PDE workflow.

**Example:**

```javascript
// Step 1: Resolve tool names via bridge (in bash block)
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
let resizeToolName = '', navigateToolName = '', screenshotToolName = '', closeToolName = '';
try {
  resizeToolName    = b.call('playwright:resize',     { width: 1280, height: 800 }).toolName;
  navigateToolName  = b.call('playwright:navigate',   { url: 'about:blank' }).toolName;
  screenshotToolName = b.call('playwright:screenshot', {}).toolName;
  closeToolName     = b.call('playwright:close',       {}).toolName;
} catch (err) {
  // bridge.call throws if key not in TOOL_MAP — degrade silently
}
process.stdout.write(JSON.stringify({ resizeToolName, navigateToolName, screenshotToolName, closeToolName }));
EOF

// Step 2: Claude Code calls the resolved tool names in its execution context (NOT in bash)
// "Use tool {resizeToolName} with { width: 1280, height: 800 }"
// "Use tool {navigateToolName} with { url: 'file:///path/to/WFR-login.html' }"
// "Use tool {screenshotToolName} with { filename: '.planning/design/ux/wireframes/screenshots/WFR-login.png', type: 'png' }"
// "Use tool {closeToolName}"
```

### Pattern 2: file:// URL Construction with %20 Encoding

**What:** The project directory name "Platform Development Engine" contains spaces. Spaces in `file://` URLs must be encoded as `%20` or the browser will fail to navigate.

**When to use:** Always when constructing file:// URLs for wireframe or mockup HTML.

**Example:**

```javascript
// In a bash block, construct the file:// URL
node --input-type=module <<'EOF'
import { resolve } from 'path';
const root = process.env.CLAUDE_PLUGIN_ROOT;
const htmlFile = 'WFR-login.html';
const absPath = resolve(root, '.planning/design/ux/wireframes', htmlFile);
const fileUrl = 'file://' + absPath.replace(/ /g, '%20');
process.stdout.write(JSON.stringify({ fileUrl, htmlFile }));
EOF
```

### Pattern 3: Per-File Screenshot Loop (Updated)

**What:** Before the loop: `mkdir -p` the screenshots dir, then call `browser_resize` once to set 1280x800. For each HTML file, navigate → screenshot → close.

**When to use:** WFR-03 requires index.html + each WFR-{slug}.html to be screenshotted individually.

**Loop structure for wireframe Step 5d:**

```
Pre-loop:
  1. mkdir -p .planning/design/ux/wireframes/screenshots/
  2. Call {resizeToolName} with { width: 1280, height: 800 }

Files to screenshot: [index.html] + [WFR-{slug}.html for each slug in SCREENS]
For each file:
  1. Construct file:// URL with %20 encoding
  2. Call {navigateToolName} with { url: <file_url> }
  3. Call {screenshotToolName} with {
       filename: '.planning/design/ux/wireframes/screenshots/{slug}.png',
       type: 'png'
     }
     (Relative to workspace root; directory must pre-exist from step Pre-loop.1)
  4. Screenshot saved to workspace-relative path AND returned as base64 in tool response
  5. Call {closeToolName}
  6. Log: "  -> Screenshot: .planning/design/ux/wireframes/screenshots/{slug}.png"
```

### Pattern 4: PLAYWRIGHT_AVAILABLE Guard (preserve existing gate)

**What:** wireframe.md and mockup.md already have `PLAYWRIGHT_AVAILABLE` flag set in Step 3 probe logic. Step 5d/7f must check this before attempting any MCP calls.

**When to use:** Always — the `--no-playwright` flag and probe failure both set `PLAYWRIGHT_AVAILABLE = false`.

**Structure:**

```
If PLAYWRIGHT_AVAILABLE is true AND --no-playwright is NOT set:
  [mkdir -p screenshots/]
  [browser_resize 1280x800]
  [screenshot loop]
  Log: "  -> Screenshots saved to .planning/design/ux/wireframes/screenshots/"
Else:
  Log: "[Not validated — install Playwright MCP for automated browser testing]"
  (no error, continue workflow)
```

### Anti-Patterns to Avoid

- **Calling raw `mcp__playwright__*` tool names directly without bridge lookup:** Always use `bridge.call()` to resolve names — all TOOL_MAP entries are still TOOL_MAP_VERIFY_REQUIRED.
- **Putting MCP tool calls inside bash blocks:** MCP calls happen in Claude Code's execution context. The bash block only looks up the tool name.
- **Skipping `mkdir -p` before screenshot loop:** The `workspaceFile()` function in Playwright MCP resolves the filename relative to workspace but does NOT create missing directories. If `screenshots/` doesn't exist, the write will fail.
- **Calling `browser_resize` after `browser_navigate`:** Resize before navigation; navigating to a page may trigger a layout that bakes in the old viewport size before the resize takes effect.
- **Leaving browser session open between files:** Always call `browser_close` after each screenshot. Unclosed sessions accumulate.
- **Using absolute paths in the `filename` parameter:** The source code's `checkFile()` function throws if the resolved path is outside the output directory AND outside the workspace. Absolute paths outside the workspace will error. Use workspace-relative paths.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML-to-PNG rendering | Custom puppeteer/canvas/html2canvas | `mcp__playwright__browser_take_screenshot` via bridge | Chromium rendering is the gold standard; Phase 108 already wired it up |
| Tool name resolution | Hardcoded `mcp__playwright__browser_navigate` strings | `bridge.call('playwright:navigate', {}).toolName` | TOOL_MAP_VERIFY_REQUIRED — names unverified; bridge is single point of correction |
| File:// serving | `npx serve` localhost workaround | Direct `file://` URL with `--allow-unrestricted-file-access` flag | Already configured in Phase 108 AUTH_INSTRUCTIONS |
| Viewport sizing | Custom browser launch options | `browser_resize { width: 1280, height: 800 }` tool call | Confirmed available in current source (common.js); runtime resize is the standard approach |

**Key insight:** Phase 108 infrastructure handles every browser-automation concern. Phase 109 writes workflow prose that calls 4 tools: resize (once), then navigate + screenshot + close per file.

---

## Common Pitfalls

### Pitfall 1: Missing `mkdir -p` Before Screenshot Loop

**What goes wrong:** The screenshot tool saves to `workspaceFile()` which resolves the path but does NOT auto-create the parent directory. If `.planning/design/ux/wireframes/screenshots/` doesn't exist, the file write fails with `ENOENT`.

**Why it happens:** Unlike `outputFile()` (the no-filename path), `workspaceFile()` has no `mkdir -p`. The source confirms this: `outputFile` calls `await fs.promises.mkdir(path.dirname(resolvedFile), { recursive: true })` but `workspaceFile` does not.

**How to avoid:** Always run `mkdir -p .planning/design/ux/wireframes/screenshots/` (and mockup equivalent) in a bash block before the screenshot loop.

**Warning signs:** `ENOENT: no such file or directory` error from Playwright MCP tool response.

### Pitfall 2: Tool Names Not Live-Verified (TOOL_MAP_VERIFY_REQUIRED)

**What goes wrong:** All 10 playwright TOOL_MAP entries are marked `TOOL_MAP_VERIFY_REQUIRED`. The `mcp__playwright__*` prefix is MEDIUM confidence. If the actual installed version uses a different prefix, all tool calls will fail.

**Why it happens:** MCP-08 live verification gate was deferred in Phase 108.

**How to avoid:** Workflow Step 5d should check for TOOL_MAP_VERIFY_REQUIRED markers before attempting screenshot calls:

```javascript
const { TOOL_MAP } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const verified = !JSON.stringify(TOOL_MAP).includes('VERIFY_REQUIRED');
// If not verified, emit warning (don't halt — screenshots are optional)
```

**Warning signs:** "No such tool available" error. User should run `/pde:connect playwright --confirm`.

### Pitfall 3: Space in Project Directory Path

**What goes wrong:** Navigating to `file:///Users/user/Platform Development Engine/.planning/...` fails — spaces in `file://` URLs must be percent-encoded.

**Why it happens:** `file://` URLs require `%20` for spaces. Browsers won't handle raw spaces.

**How to avoid:** Apply `.replace(/ /g, '%20')` to the absolute path before passing to `browser_navigate`.

**Warning signs:** Browser navigates to blank/error page; screenshot shows empty content.

### Pitfall 4: MOK-02 Path Discrepancy

**What goes wrong:** REQUIREMENTS.md MOK-02 specifies `visual/mockups/screenshots/` but all mockup HTML lives at `ux/mockups/`. No `visual/mockups/` directory exists.

**Why it happens:** Likely a typo in requirements — `visual/` instead of `ux/`.

**How to avoid:** Use `.planning/design/ux/mockups/screenshots/` (consistent with source HTML location). Add a note in the plan flagging this for user confirmation.

**Warning signs:** Users looking for screenshots at `ux/mockups/` won't find them if `visual/` path is used.

### Pitfall 5: `browser_resize` Not in Current TOOL_MAP

**What goes wrong:** `playwright:resize` is not in the current TOOL_MAP in `mcp-bridge.cjs` (only 10 entries, none for resize). Calling `bridge.call('playwright:resize', ...)` throws a "key not found" error.

**Why it happens:** Phase 108 registered 10 tools but did not include `browser_resize` since WFR-05 wasn't in scope then.

**How to avoid:** Phase 109 plan must add one line to TOOL_MAP: `'playwright:resize': 'mcp__playwright__browser_resize', // TOOL_MAP_VERIFY_REQUIRED`. This is a small addition to mcp-bridge.cjs as part of Phase 109.

**Warning signs:** `bridge.call()` throws at `playwright:resize` lookup before any screenshot attempt.

### Pitfall 6: Calling `browser_resize` After Session Close

**What goes wrong:** `browser_close` closes the entire browser context. If `browser_resize` is called after a `browser_close`, there is no active page and the resize will fail or open a new context at default size.

**Why it happens:** The resize/navigate/screenshot/close pattern requires a live browser context. After `close`, the context is gone.

**How to avoid:** Call `browser_resize` once at the start of the screenshot section (before the file loop), then loop navigate → screenshot → close. If `browser_close` is called inside the loop, call `browser_resize` again at the start of each iteration, or use `browser_navigate` directly without closing between files (close only at end of loop).

**Preferred pattern:** Resize once, then loop: navigate → screenshot → close. Each `browser_close` ends the context; the next navigate will open a fresh context at the default viewport, so if using close-per-file, resize at the top of each iteration.

---

## Code Examples

Verified patterns from official source and project files:

### browser_resize Source (confirmed in common.js — HIGH confidence)

```javascript
// Source: playwright/lib/mcp/browser/tools/common.js
// Tool name: browser_resize
// Parameters: { width: number, height: number }
// Action: calls page.setViewportSize({ width, height })
// Usage: call before browser_navigate to set viewport for screenshot
```

### browser_take_screenshot filename Behavior (confirmed in response.js — HIGH confidence)

```javascript
// Source: playwright/lib/mcp/browser/response.js + config.js
// When filename param is provided: workspaceFile() resolves relative to Claude Code workspace root
// When filename param is absent: outputFile() resolves to output-dir/.playwright-mcp/
// workspaceFile() does NOT create directories — run mkdir -p first
// checkFile() requires resolved path to be within outputDir OR workspace — use relative paths
// Image content is ALSO returned as base64 in tool response (registerImageResult)

// Correct usage:
// filename: '.planning/design/ux/wireframes/screenshots/WFR-login.png'
// (relative to workspace root = /path/to/Platform Development Engine)
// Directory .planning/design/ux/wireframes/screenshots/ must exist before this call
```

### Bridge Lookup Pattern (from wireframe-figma-context.md — HIGH confidence)

```javascript
// Source: workflows/wireframe-figma-context.md lines 16-33
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
let resizeToolName = '', navigateToolName = '', screenshotToolName = '', closeToolName = '';
try {
  resizeToolName     = b.call('playwright:resize',     { width: 1280, height: 800 }).toolName;
  navigateToolName   = b.call('playwright:navigate',   { url: 'about:blank' }).toolName;
  screenshotToolName = b.call('playwright:screenshot', {}).toolName;
  closeToolName      = b.call('playwright:close',      {}).toolName;
} catch (err) {
  resizeToolName = navigateToolName = screenshotToolName = closeToolName = '';
}
process.stdout.write(JSON.stringify({ resizeToolName, navigateToolName, screenshotToolName, closeToolName }) + '\n');
EOF
```

### File:// URL Construction (from mcp-integration.md — HIGH confidence)

```javascript
// Source: references/mcp-integration.md line 311
const absPath = require('path').resolve(process.env.CLAUDE_PLUGIN_ROOT,
  '.planning/design/ux/wireframes', 'WFR-login.html');
const fileUrl = 'file://' + absPath.replace(/ /g, '%20');
// => file:///Users/user/Platform%20Development%20Engine/.planning/design/ux/wireframes/WFR-login.html
```

### Nyquist Test Structure (from tests/phase-108/ — HIGH confidence)

```javascript
// Source: tests/phase-108/mcp-bridge-playwright.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..', '..');

describe('WFR-01: wireframe.md Step 5d screenshot loop', () => {
  const wireframeContent = readFileSync(resolve(ROOT, 'workflows/wireframe.md'), 'utf-8');

  test('wireframe.md Step 5d contains "screenshots/" directory reference', () => {
    assert.ok(wireframeContent.includes('screenshots/'),
      'wireframe.md Step 5d does not reference screenshots/ directory');
  });

  test('wireframe.md Step 5d contains "playwright:navigate" bridge call', () => {
    assert.ok(wireframeContent.includes("playwright:navigate"),
      'wireframe.md Step 5d does not call playwright:navigate via bridge');
  });

  test('wireframe.md Step 5d contains "playwright:resize" bridge call', () => {
    assert.ok(wireframeContent.includes("playwright:resize"),
      'wireframe.md Step 5d does not call playwright:resize via bridge');
  });

  test('wireframe.md Step 5d contains "playwright:screenshot" bridge call', () => {
    assert.ok(wireframeContent.includes("playwright:screenshot"),
      'wireframe.md Step 5d does not call playwright:screenshot via bridge');
  });

  test('wireframe.md Step 5d contains "playwright:close" bridge call', () => {
    assert.ok(wireframeContent.includes("playwright:close"),
      'wireframe.md Step 5d does not call playwright:close via bridge');
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| wireframe.md 5d: "attempt to open index.html for screenshot validation" | Per-file loop with resize+navigate+screenshot+close | Phase 109 | Full screenshot capture for all generated HTML files at consistent 1280x800 viewport |
| mockup.md 7f: "take screenshots at 375/768/1440px widths" | Single 1280x800 screenshot per mockup HTML | Phase 109 | Consistent with WFR-05; multi-breakpoint is Phase 110+ scope |
| `filename` parameter: "name-only, no directories" (prior research) | Relative workspace paths allowed (subdirs OK if directory exists) | Confirmed in source — prior research was incorrect | Simpler implementation: pass full relative path to filename, skip manual Write step |
| `browser_resize` availability uncertain (prior research) | `browser_resize` confirmed in source with `{ width, height }` params | Confirmed 2026-03-23 | WFR-05 fully implementable with a single tool call |
| Fallback pin: `npx @playwright/mcp@0.0.41` | Latest: `0.0.68` | npm registry 2026-03-23 | Pin version if needed: `0.0.68` (not `0.0.41`) |

**Deprecated/outdated:**
- "browser_resize not in TOOL_MAP" — it needs to be added as part of Phase 109
- "filename accepts name-only, no directories" — subdirectory relative paths work; directory must pre-exist
- The `0.0.41` version pin in troubleshooting notes — update to `0.0.68`

---

## Open Questions

1. **MOK-02: Screenshot path `visual/mockups/screenshots/` vs `ux/mockups/screenshots/`**
   - What we know: REQUIREMENTS.md says `visual/mockups/screenshots/`; all mockup HTML is at `ux/mockups/`; no `visual/mockups/` directory exists
   - What's unclear: Whether this was intentional (separate visual artifact directory) or a typo
   - Recommendation: Use `ux/mockups/screenshots/` to co-locate screenshots with source HTML; flag in PLAN.md as "requirements path appears to be a typo — using ux/mockups/screenshots/ unless user specifies otherwise"

2. **PLAY-06 (incomplete in Phase 108): Is it in scope for Phase 109?**
   - What we know: PLAY-06 (mcp-integration.md Playwright section with 7-server probe/degrade table) was marked incomplete; its Nyquist test exists in tests/phase-108/
   - Recommendation: PLAY-06 is out of scope for Phase 109 (it's a docs requirement, not a screenshot requirement). Leave for a later phase.

3. **browser_resize after browser_close — per-file resize needed?**
   - What we know: `browser_close` closes the entire context; next navigate opens a fresh context at default viewport; `browser_resize` must be called after each close to maintain 1280x800
   - Recommendation: In the loop, call resize before each navigate (not once before loop) to handle the post-close fresh context correctly. Or, use navigate-screenshot without close between files, closing only at the end of the batch.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — tests run via `node --test` |
| Quick run command | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` |
| Full suite command | `node --test tests/phase-108/mcp-bridge-playwright.test.mjs tests/phase-109/wireframe-mockup-screenshots.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WFR-01 | wireframe.md Step 5d expanded with playwright bridge calls | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| WFR-02 | wireframe.md references `screenshots/` directory creation | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| WFR-03 | wireframe.md loops over index.html + screen HTML files | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| WFR-04 | wireframe.md `--no-playwright` path unchanged | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| WFR-05 | wireframe.md Step 5d references `playwright:resize` and `1280` | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| MOK-01 | mockup.md Step 7f expanded with playwright bridge calls | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| MOK-02 | mockup.md references `screenshots/` directory creation | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| MOK-03 | mockup.md `--no-playwright` path unchanged | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |

All tests are Nyquist-style structural tests: read the workflow file as text, assert presence of specific strings/patterns. No live Playwright MCP calls in tests (MCP runtime not available in test context).

### Sampling Rate

- **Per task commit:** `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs`
- **Per wave merge:** `node --test tests/phase-108/mcp-bridge-playwright.test.mjs tests/phase-109/wireframe-mockup-screenshots.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-109/wireframe-mockup-screenshots.test.mjs` — covers WFR-01 through WFR-05 and MOK-01 through MOK-03
- [ ] `bin/lib/mcp-bridge.cjs` — add `playwright:resize` TOOL_MAP entry (one line, Wave 0 prerequisite for WFR-05)

*(No framework installation needed — `node:test` is built into Node.js)*

---

## Sources

### Primary (HIGH confidence)

- `playwright/lib/mcp/browser/tools/common.js` (npm cached) — `browser_resize` tool definition with `{ width, height }` params, `page.setViewportSize()` implementation
- `playwright/lib/mcp/browser/tools/screenshot.js` (npm cached) — `browser_take_screenshot` schema: filename is "Prefer relative file names"; calls `workspaceFile()` when filename provided
- `playwright/lib/mcp/browser/response.js` (npm cached) — `workspaceFile()` does NOT auto-mkdir; `registerImageResult()` returns base64 in response
- `playwright/lib/mcp/browser/config.js` (npm cached) — `workspaceFile()` resolves relative to workspace root; `checkFile()` rejects paths outside workspace/outputDir
- `bin/lib/mcp-bridge.cjs` — TOOL_MAP playwright entries (lines 162-171); no `playwright:resize` present
- `workflows/wireframe.md` lines 2121-2125 — Step 5d stub text
- `workflows/mockup.md` lines 1444-1458 — Step 7f stub text
- `npm view @playwright/mcp version` → `0.0.68` (verified 2026-03-23)

### Secondary (MEDIUM confidence)

- [GitHub Issue #1002](https://github.com/microsoft/playwright-mcp/issues/1002) — confirms path reporting was fixed; `filename` parameter resolved from workspace; "Prefer relative file names" guidance
- [Glama: browser_take_screenshot schema](https://glama.ai/mcp/servers/@nzjami/mcpPlaywright/tools/browser_take_screenshot) — full parameter list confirms `type`, `filename`, `element`, `ref`, `fullPage`
- [playwright-mcp README via WebFetch](https://github.com/microsoft/playwright-mcp) — `--allow-unrestricted-file-access` requirement for file:// URLs; `--viewport-size` CLI flag; `--image-responses` flag

### Tertiary (LOW confidence)

- [GitHub Issue #1077](https://github.com/microsoft/playwright-mcp/issues/1077) — default output dir is `/tmp/playwright-mcp-output/` in Docker; non-Docker Claude Code uses `.playwright-mcp/` relative to workspace root

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry confirmed version 0.0.68; source code read directly from npm cache
- Architecture patterns: HIGH — verified directly from project source files and playwright-mcp source
- Pitfalls: HIGH for `mkdir -p` requirement (confirmed from source); HIGH for `browser_resize` needing TOOL_MAP entry (confirmed from bridge + source); HIGH for filename relative path behavior (confirmed from source)
- MOK-02 path discrepancy: HIGH confidence it's a typo (no `visual/mockups/` directory exists)

**Key corrections from prior research:**
1. `browser_resize` IS available — add `playwright:resize` to TOOL_MAP as part of Phase 109
2. `filename` accepts relative subdirectory paths (not name-only) — use `.planning/design/ux/wireframes/screenshots/slug.png` directly
3. `workspaceFile()` does NOT auto-mkdir — `mkdir -p` is mandatory before screenshot loop
4. Version pin `0.0.41` is stale — latest is `0.0.68`

**Research date:** 2026-03-23
**Valid until:** 2026-04-22 (30 days — stable infrastructure)
