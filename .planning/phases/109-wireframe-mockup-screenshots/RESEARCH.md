# Phase 109: Wireframe + Mockup Screenshots — Research

**Researched:** 2026-03-23
**Domain:** Playwright MCP tool usage, workflow prose modification, file:// screenshot capture
**Confidence:** HIGH (verified against source files and official docs)

## Summary

Phase 109 is a **workflow prose modification phase**, not a library integration phase. The Playwright MCP server was fully registered in Phase 108 as the 7th APPROVED_SERVER with all 10 TOOL_MAP entries. Phase 109 only needs to expand the existing `### 5d` and `### 7f` stubs in `wireframe.md` and `mockup.md` into fully-specified screenshot capture loops — then write Nyquist tests that verify the prose exists at the right spots.

The core technical challenge is a constraint of the Playwright MCP `browser_take_screenshot` tool: the `filename` parameter accepts a **file name only**, not a path. The output directory is configured at MCP server launch time via `--output-dir`. Since PDE users install the server via `claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access` (no `--output-dir`), screenshots land in the MCP server's default location and Claude Code then copies/moves them into the target `screenshots/` subdirectory using the `Write` or `Bash` tool. The workflow agent reads the screenshot content from the returned tool response and writes it to the canonical path.

There is one open question to flag: REQUIREMENTS.md says mockup screenshots go to `.planning/design/visual/mockups/screenshots/` (MOK-02) but mockup HTML files live at `.planning/design/ux/mockups/`. The requirements path looks like a typo — the consistent location would be `.planning/design/ux/mockups/screenshots/`. The planner should use `.planning/design/ux/mockups/screenshots/` to match where the source HTML files are, and flag this for user confirmation.

**Primary recommendation:** Expand wireframe.md Step 5d and mockup.md Step 7f with explicit per-file screenshot loops using `mcp__playwright__browser_navigate` + `mcp__playwright__browser_take_screenshot` + `mcp__playwright__browser_close`. Use the bridge lookup pattern (`bridge.call('playwright:navigate', ...)`) to get tool names. Create a `screenshots/` subdirectory under the wireframe and mockup directories. Write WFR-tagged and MOK-tagged Nyquist structural tests verifying the prose additions.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WFR-01 | wireframe.md Step 5d wired to capture screenshots of each wireframe HTML via Playwright MCP | Expand Step 5d stub into full per-file loop using bridge `playwright:navigate` + `playwright:screenshot` tool calls |
| WFR-02 | Screenshots saved to `.planning/design/ux/wireframes/screenshots/` | `mkdir -p` before loop; Write tool persists screenshots to this path |
| WFR-03 | Multi-page wireframes handled (index.html + screen-*.html each screenshotted) | Step 5d loop must iterate: index.html + all WFR-{slug}.html files generated in this batch |
| WFR-04 | `--no-playwright` flag preserves existing degradation path (no screenshots, no error) | Already gated by PLAYWRIGHT_AVAILABLE check in Step 5d — preserve gate exactly |
| WFR-05 | Viewport configured for consistent wireframe dimensions (1280x800 default) | `browser_take_screenshot` does not accept viewport args directly; navigate to file:// URL and let the page render at default Chromium viewport (1280x720); or call a resize tool first — see pitfalls |
| MOK-01 | mockup.md captures screenshots of generated mockup HTML files via Playwright MCP | Expand Step 7f stub into full loop at same pattern as wireframe |
| MOK-02 | Screenshots saved to `.planning/design/visual/mockups/screenshots/` (per REQUIREMENTS.md) | FLAG: mockup HTML lives at `ux/mockups/`, not `visual/mockups/` — likely typo; use `ux/mockups/screenshots/` and flag for confirmation |
| MOK-03 | `--no-playwright` degradation path (mockup workflow completes without screenshots) | Same PLAYWRIGHT_AVAILABLE gate that already exists in Step 7f |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/mcp` | `@latest` (fallback: `0.0.41`) | Browser automation via MCP | Already registered in Phase 108 — only MCP-based browser tool in this project |
| `mcp-bridge.cjs` | internal | Canonical tool name lookup + policy enforcement | Phase 108 infrastructure — all MCP calls go through this bridge |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` / `Bash mkdir -p` | Node built-in | Create `screenshots/` directory before loop | Always — directory may not exist |
| `node:path` (in bridge bash blocks) | Node built-in | Construct absolute `file://` paths with `%20` encoding | Always — path has spaces |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright MCP via bridge | Direct `npx playwright` CLI | Violates PDE architecture — all browser calls go through MCP bridge |
| File name only + Write tool | `--output-dir` path in MCP install | PDE install command has no `--output-dir`; the screenshot content is returned in the tool response and written by the workflow agent |
| Multiple viewports (375/768/1440) | Single viewport at 1280x800 | WFR-05 specifies 1280x800 as the standard wireframe viewport; multi-viewport is Phase 110+ scope |

**Installation:** No new packages. Playwright MCP already installed by user via Phase 108 AUTH_INSTRUCTIONS.

---

## Architecture Patterns

### Recommended Project Structure

```
workflows/
├── wireframe.md     # Expand Step 5d (lines ~2121-2123)
└── mockup.md        # Expand Step 7f (lines ~1444-1458)

tests/
└── phase-109/
    └── wireframe-mockup-screenshots.test.mjs  # Nyquist structural tests

.planning/design/ux/wireframes/screenshots/    # WFR screenshot output (created at runtime)
.planning/design/ux/mockups/screenshots/       # MOK screenshot output (created at runtime)
```

### Pattern 1: Bridge Lookup + MCP Tool Call

**What:** Resolve the raw MCP tool name via `bridge.call()` in a bash block, then instruct Claude Code to call that tool in its execution context. The tool call itself is NOT inside a bash block.

**When to use:** Every MCP tool invocation in any PDE workflow.

**Example (matching the Figma pattern in wireframe-figma-context.md):**

```javascript
// Step 1: Resolve tool names via bridge (in bash block)
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
let navigateToolName = '', screenshotToolName = '', closeToolName = '';
try {
  navigateToolName  = b.call('playwright:navigate',   { url: 'about:blank' }).toolName;
  screenshotToolName = b.call('playwright:screenshot', {}).toolName;
  closeToolName     = b.call('playwright:close',       {}).toolName;
} catch (err) {
  // bridge.call throws if key not in TOOL_MAP — degrade silently
}
process.stdout.write(JSON.stringify({ navigateToolName, screenshotToolName, closeToolName }));
EOF

// Step 2: Claude Code calls the resolved tool names in its execution context (NOT in bash)
// "Use tool {navigateToolName} with url: 'file:///path/to/WFR-login.html'"
// "Use tool {screenshotToolName} with filename: 'WFR-login.png'"
// Write the screenshot content to .planning/design/ux/wireframes/screenshots/WFR-login.png
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
const root = process.env.CLAUDE_PLUGIN_ROOT; // e.g. /Users/.../Platform Development Engine
const htmlFile = 'WFR-login.html';
const absPath = resolve(root, '.planning/design/ux/wireframes', htmlFile);
const fileUrl = 'file://' + absPath.replace(/ /g, '%20');
process.stdout.write(JSON.stringify({ fileUrl, htmlFile }));
EOF
```

### Pattern 3: Per-File Screenshot Loop

**What:** For each HTML file in the batch, navigate → screenshot → close. Close between files to avoid session accumulation.

**When to use:** WFR-03 requires index.html + each WFR-{slug}.html to be screenshotted individually. Mockup requires each mockup-{screen}.html + index.html.

**Loop structure for wireframe Step 5d:**

```
Files to screenshot: [index.html] + [WFR-{slug}.html for each slug in SCREENS]
For each file:
  1. Construct file:// URL with %20 encoding
  2. Call mcp__playwright__browser_navigate with { url: <file_url> }
  3. Call mcp__playwright__browser_take_screenshot with { filename: '{slug}.png', type: 'png' }
  4. Screenshot content returned in tool response — write to screenshots/{slug}.png
  5. Call mcp__playwright__browser_close
  6. Log: "  -> Screenshot: .planning/design/ux/wireframes/screenshots/{slug}.png"
```

### Pattern 4: PLAYWRIGHT_AVAILABLE Guard (preserve existing gate)

**What:** wireframe.md and mockup.md already have `PLAYWRIGHT_AVAILABLE` flag set in Step 3 probe logic. Step 5d/7f must check this before attempting any MCP calls.

**When to use:** Always — the `--no-playwright` flag and probe failure both set `PLAYWRIGHT_AVAILABLE = false`.

**Structure:**

```
If PLAYWRIGHT_AVAILABLE is true AND --no-playwright is NOT set:
  [screenshot loop]
  Log: "  -> Screenshots saved to .planning/design/ux/wireframes/screenshots/"
Else:
  Log: "[Not validated — install Playwright MCP for automated browser testing]"
  (no error, continue workflow)
```

### Anti-Patterns to Avoid

- **Calling raw `mcp__playwright__*` tool names directly in workflow prose without bridge lookup:** Always use `bridge.call()` pattern to resolve names — this is the PDE contract (verified in wireframe-figma-context.md, handoff-create-linear-issues.md, etc.)
- **Putting MCP tool calls inside bash blocks:** MCP calls happen in Claude Code's execution context, not in `node` subprocess. The bash block only looks up the tool name; the actual call instruction is in prose to Claude Code.
- **Assuming screenshots are saved to a predictable default path:** The default MCP output dir (`/tmp/playwright-output/` or `.playwright-mcp/`) is environment-dependent. The returned tool response content must be written by the workflow agent to the canonical `screenshots/` path.
- **Using `filename` parameter with path components:** The Playwright MCP tool description says "file NAME ONLY — no directories allowed." Subdirectory paths in filename will be sanitized away. Use the tool's return content + Write tool instead.
- **Leaving browser session open between files:** Always call `browser_close` after each screenshot. Unclosed sessions accumulate and may cause the next navigate to render in the wrong session.
- **Not creating `screenshots/` directory before loop:** The Playwright MCP server writes to its own output dir. The PDE `screenshots/` directory must be created with `mkdir -p` before the Write tool writes screenshot content into it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML-to-PNG rendering | Custom puppeteer/canvas/html2canvas | `mcp__playwright__browser_take_screenshot` via Phase 108 bridge | Chromium rendering is the gold standard; Phase 108 already wired it up |
| Tool name resolution | Hardcoded `mcp__playwright__browser_navigate` strings | `bridge.call('playwright:navigate', {}).toolName` | TOOL_MAP_VERIFY_REQUIRED — names unverified; bridge layer provides single point of correction |
| File:// serving | `npx serve` localhost workaround | Direct `file://` URL with `--allow-unrestricted-file-access` flag | Already configured in Phase 108 AUTH_INSTRUCTIONS; no server needed |
| Screenshot content reading | Bash-based file copy from `/tmp/playwright-output/` | Write the base64/binary content returned by the screenshot tool | Avoids dependency on ephemeral temp dir location |

**Key insight:** Phase 108 infrastructure handles every browser-automation concern. Phase 109 only writes workflow prose that calls 3 tools in a loop: navigate, screenshot, close.

---

## Common Pitfalls

### Pitfall 1: Viewport Size Not Controllable via browser_take_screenshot

**What goes wrong:** WFR-05 requires 1280x800 viewport. `browser_take_screenshot` does not accept viewport dimensions — it screenshots the current viewport.

**Why it happens:** Playwright MCP's screenshot tool captures whatever the browser window currently shows. Viewport size is set at browser launch time or via a resize tool.

**How to avoid:** Check whether `mcp__playwright__browser_resize` exists in TOOL_MAP. If it does (it is listed in some Playwright MCP docs as `browser_resize`), call it before navigating. If not, the browser launches at Chromium's default (~1280x720). For wireframe screenshots this is close enough to the 1280x800 target. WFR-05 says "1280x800 default" — implement with a note that Chromium launches at 1280x720 unless a resize tool is available; document this as an accepted approximation.

**Warning signs:** Screenshots are taller than expected (full-page capture) or narrower than expected.

**Research note (MEDIUM confidence):** The Playwright MCP README lists `browser_resize` in some versions. The TOOL_MAP in Phase 108 does not include a `playwright:resize` entry. Phase 109 should either add one (LOW risk, small change) or proceed without it, noting the 1280x720 vs 1280x800 approximation.

### Pitfall 2: filename Parameter Cannot Contain Path Separators

**What goes wrong:** Workflow instructs `filename: 'screenshots/WFR-login.png'` — the slash is silently stripped or causes an error, landing the file at `WFR-loginpng` or similar.

**Why it happens:** The Playwright MCP tool description explicitly states "file NAME ONLY — no directories allowed." This was confirmed in GitHub Issue #1002 (September 2025).

**How to avoid:** Use just the basename (e.g., `WFR-login.png`). Then take the screenshot content from the tool response and write it to the correct path via Claude Code's Write tool.

**Warning signs:** Screenshot file not found in expected `screenshots/` subdirectory after workflow completes.

### Pitfall 3: Tool Name Prefix Not Live-Verified

**What goes wrong:** All 10 playwright TOOL_MAP entries are marked `TOOL_MAP_VERIFY_REQUIRED`. The `mcp__playwright__*` prefix is MEDIUM confidence from README/practitioner sources. If the actual installed version uses a different prefix (e.g., `mcp__playwright-mcp__*`), all tool calls will fail.

**Why it happens:** MCP-08 live verification gate was deferred in Phase 108 (auto-deferred per checkpoint override).

**How to avoid:** Workflow Step 5d should check for TOOL_MAP_VERIFY_REQUIRED markers before attempting screenshot calls (same pattern as Stitch in wireframe.md Step 3):

```javascript
const { TOOL_MAP } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const verified = !JSON.stringify(TOOL_MAP).includes('VERIFY_REQUIRED');
// If not verified, emit warning (don't halt — screenshots are optional)
```

**Warning signs:** `"No such tool available"` error from MCP bridge. User should run `claude mcp add playwright -- npx @playwright/mcp@0.0.41 --headless --allow-unrestricted-file-access` and run `/pde:connect playwright --confirm`.

### Pitfall 4: Space in Project Directory Path

**What goes wrong:** Navigating to `file:///Users/user/Platform Development Engine/.planning/...` fails because "Platform Development Engine" contains spaces.

**Why it happens:** `file://` URLs require percent-encoding of spaces as `%20`. Browsers won't handle unencoded spaces.

**How to avoid:** In the bash block that constructs the file URL, apply `.replace(/ /g, '%20')` to the absolute path before passing it to `browser_navigate`.

**Warning signs:** Browser navigates to blank page or 404-equivalent; screenshot shows empty content.

### Pitfall 5: MOK-02 Path Discrepancy

**What goes wrong:** REQUIREMENTS.md MOK-02 specifies screenshots at `.planning/design/visual/mockups/screenshots/` but mockup HTML files are at `.planning/design/ux/mockups/`. The `visual/` path is inconsistent with all other mockup artifacts.

**Why it happens:** Likely a typo in requirements — `visual/` vs `ux/`.

**How to avoid:** Use `.planning/design/ux/mockups/screenshots/` (consistent with source HTML location) and add a note in the plan asking the user to confirm. Do not create both directories.

**Warning signs:** If implemented as `visual/mockups/screenshots/`, users looking for screenshots in `ux/mockups/` won't find them.

### Pitfall 6: Screenshot Tool Returns Content, Not Just Saves to Disk

**What goes wrong:** Workflow assumes screenshot is on disk at a predictable location and tries to read it from `/tmp/playwright-output/` or `.playwright-mcp/`. The location is environment-dependent and may be `/tmp/playwright-output/` in Docker contexts.

**Why it happens:** The Playwright MCP `browser_take_screenshot` saves to `--output-dir` (default: `.playwright-mcp/` or `/tmp/playwright-output/`). The tool also returns the screenshot content in the MCP response.

**How to avoid:** Use the screenshot content returned in the tool response. Claude Code receives the image data and can write it to any path using the Write tool. Do not rely on disk location.

---

## Code Examples

Verified patterns from project source files:

### Bridge Lookup Pattern (from wireframe-figma-context.md — HIGH confidence)

```javascript
// Source: workflows/wireframe-figma-context.md lines 16-33
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
let toolName = '';
try {
  const lookup = b.call('playwright:navigate', { url: 'about:blank' });
  toolName = lookup.toolName; // resolves to mcp__playwright__browser_navigate
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ toolName }) + '\n');
EOF
```

### TOOL_MAP_VERIFY_REQUIRED Check (from wireframe.md Step 3 — HIGH confidence)

```javascript
// Source: workflows/wireframe.md lines 282-296
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { TOOL_MAP } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const verified = !JSON.stringify(TOOL_MAP).includes('VERIFY_REQUIRED');
process.stdout.write(JSON.stringify({ verified }));
EOF
// If verified: false — emit warning, do NOT halt (screenshots are optional enhancement)
```

### File:// URL Construction with %20 Encoding (from mcp-integration.md — HIGH confidence)

```javascript
// Source: references/mcp-integration.md line 311
// "The project directory contains a space ('Platform Development Engine').
//  When passing file:// URLs to browser_navigate, encode the space as %20"
const absPath = require('path').resolve(process.env.CLAUDE_PLUGIN_ROOT,
  '.planning/design/ux/wireframes', 'WFR-login.html');
const fileUrl = 'file://' + absPath.replace(/ /g, '%20');
// => file:///Users/user/Platform%20Development%20Engine/.planning/design/ux/wireframes/WFR-login.html
```

### Nyquist Test Structure for Workflow Prose (from tests/phase-108/ — HIGH confidence)

```javascript
// Source: tests/phase-108/mcp-bridge-playwright.test.mjs — structural test pattern
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
| wireframe.md 5d: single-line stub "open index.html for screenshot validation" | Per-file loop with navigate+screenshot+close | Phase 109 | Full screenshot capture for all generated HTML files |
| mockup.md 7f: single-line stub "open index.html in headless browser" | Per-file loop with navigate+screenshot+close | Phase 109 | Full screenshot capture for all generated mockup HTML files |
| Stitch screenshots saved directly by MCP server | Playwright screenshots written by workflow agent via Write tool | Phase 109 | Consistent with how the screenshot content is returned from Playwright MCP |

**Deprecated/outdated:**
- The "attempt to open index.html" wording in wireframe.md Step 5d — replace with explicit navigate/screenshot/close loop that handles all files
- The multi-breakpoint (375/768/1440) mockup Step 7f spec — superseded by WFR-05's 1280x800 single viewport requirement for Phase 109 (multi-breakpoint is Phase 110+ scope per mcp-integration.md Enhancement Recipes)

---

## Open Questions

1. **WFR-05: 1280x800 viewport — is browser_resize available?**
   - What we know: `browser_take_screenshot` captures the current viewport; TOOL_MAP has 10 entries, none named `playwright:resize`
   - What's unclear: Whether `mcp__playwright__browser_resize` exists in the installed version of Playwright MCP; whether the default Chromium viewport (1280x720) is acceptable as an approximation
   - Recommendation: Plan should note that `browser_resize` is not in current TOOL_MAP; implement screenshots at default Chromium viewport (~1280x720) and document as "approximately 1280x800"; if exact size is needed, add `playwright:resize` to TOOL_MAP and note VERIFY_REQUIRED

2. **MOK-02: Screenshot path `visual/mockups/screenshots/` vs `ux/mockups/screenshots/`**
   - What we know: REQUIREMENTS.md says `visual/mockups/screenshots/`; all mockup HTML is at `ux/mockups/`; no `visual/mockups/` directory exists
   - What's unclear: Whether this was intentional (separate visual artifact directory) or a typo
   - Recommendation: Use `ux/mockups/screenshots/` to co-locate screenshots with source HTML; flag in PLAN.md as "requirements path appears to be a typo — using ux/mockups/screenshots/ unless user specifies otherwise"

3. **PLAY-06 test (pending): Phase 109 test file or Phase 108?**
   - What we know: PLAY-06 (mcp-integration.md Playwright section with 7-server probe/degrade table) was marked incomplete in Phase 108; its Nyquist test is in tests/phase-108/
   - What's unclear: Whether Phase 109 should complete PLAY-06 or leave it for a cleanup phase
   - Recommendation: PLAY-06 is out of scope for Phase 109 (it's a docs requirement, not a screenshot requirement). Phase 109 plan should not touch it.

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
| WFR-05 | wireframe.md screenshot step references 1280 viewport dimension | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| MOK-01 | mockup.md Step 7f expanded with playwright bridge calls | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| MOK-02 | mockup.md references `screenshots/` directory creation | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |
| MOK-03 | mockup.md `--no-playwright` path unchanged | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | ❌ Wave 0 |

All tests are Nyquist-style structural tests: read the workflow file as text, assert presence of specific strings/patterns. No live Playwright MCP calls are made in tests (MCP runtime not available in test context).

### Sampling Rate

- **Per task commit:** `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs`
- **Per wave merge:** `node --test tests/phase-108/mcp-bridge-playwright.test.mjs tests/phase-109/wireframe-mockup-screenshots.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-109/wireframe-mockup-screenshots.test.mjs` — covers WFR-01 through WFR-05 and MOK-01 through MOK-03

*(No framework installation needed — `node:test` is built into Node.js)*

---

## Sources

### Primary (HIGH confidence)

- `workflows/wireframe.md` — Lines 2121-2125 (Step 5d stub), lines 256-276 (PLAYWRIGHT_AVAILABLE probe/gate), lines 282-296 (TOOL_MAP_VERIFY_REQUIRED check pattern)
- `workflows/mockup.md` — Lines 1444-1458 (Step 7f stub), lines 205-216 (PLAYWRIGHT_AVAILABLE probe/gate)
- `bin/lib/mcp-bridge.cjs` — TOOL_MAP playwright entries (lines 162-171), `call()` function (lines 355-363)
- `tests/phase-108/mcp-bridge-playwright.test.mjs` — Nyquist test pattern and structural test style
- `references/mcp-integration.md` — Playwright Enhancement Recipes (lines 317-326), %20 encoding note (line 311)
- `workflows/wireframe-figma-context.md` — Canonical bridge lookup + MCP call pattern (lines 16-98)
- `.planning/REQUIREMENTS.md` — WFR-01 through WFR-05, MOK-01 through MOK-03 (lines 20-32)

### Secondary (MEDIUM confidence)

- [GitHub Issue #1002: LLM confusion about file saving paths in browser_pdf_save and browser_take_screenshot](https://github.com/microsoft/playwright-mcp/issues/1002) — confirms `filename` is name-only, no directories; bug in path reporting fixed in latest version
- [Glama: browser_take_screenshot schema](https://glama.ai/mcp/servers/@nzjami/mcpPlaywright/tools/browser_take_screenshot) — full parameter list: `type`, `filename`, `element`, `ref`, `fullPage`
- [playwright-mcp README via WebFetch](https://github.com/microsoft/playwright-mcp) — `--output-dir` flag behavior, `--allow-unrestricted-file-access` requirement for file:// URLs

### Tertiary (LOW confidence)

- [GitHub Issue #1077: OutputDir no longer respected from config file](https://github.com/microsoft/playwright-mcp/issues/1077) — default output dir is `/tmp/playwright-output/` in Docker; for non-Docker Claude Code this may differ; do not rely on disk location

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phase 108 already wired everything; this phase only writes prose
- Architecture patterns: HIGH — verified directly from project source files (wireframe-figma-context.md pattern, mcp-bridge.cjs call() function, existing wireframe.md probe pattern)
- Pitfalls: HIGH for `filename`/path (confirmed in GitHub Issues); MEDIUM for viewport (browser_resize not in TOOL_MAP, inference from official README)
- MOK-02 path discrepancy: HIGH confidence it's a typo (no `visual/mockups/` directory exists, all mockup artifacts are under `ux/mockups/`)

**Research date:** 2026-03-23
**Valid until:** 2026-04-22 (30 days — stable infrastructure)
