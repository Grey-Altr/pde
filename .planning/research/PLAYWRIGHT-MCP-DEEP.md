# Playwright MCP Deep Research: Integration Patterns for PDE Design Pipeline

**Domain:** Browser automation via @playwright/mcp for wireframe/mockup screenshots, a11y analysis, deploy verification
**Researched:** 2026-03-23
**Overall confidence:** HIGH (official GitHub README, npm package, GitHub issues, multiple practitioner reports)

---

## 1. Complete Tool Inventory

### Core Tools (Always Enabled -- 20 tools)

| Tool | Purpose | PDE Relevance |
|------|---------|---------------|
| `browser_navigate` | Load a URL | **PRIMARY** -- all 4 workflows start here |
| `browser_snapshot` | Get accessibility tree (ARIA snapshot) | **PRIMARY** -- a11y critique, deploy smoke test |
| `browser_take_screenshot` | Capture viewport/fullPage/element as PNG or JPEG | **PRIMARY** -- wireframe + mockup capture |
| `browser_click` | Click element by accessibility ref | Low -- not needed for screenshot workflows |
| `browser_type` | Type text into editable field | Not needed |
| `browser_fill_form` | Populate multiple form fields | Not needed |
| `browser_hover` | Hover over element | Not needed |
| `browser_drag` | Drag and drop | Not needed |
| `browser_select_option` | Select dropdown option | Not needed |
| `browser_press_key` | Simulate keyboard input | Not needed |
| `browser_evaluate` | Run JavaScript in page context | USEFUL -- could inject viewport meta, force layout |
| `browser_run_code` | Execute Playwright code snippet | USEFUL -- advanced automation if needed |
| `browser_file_upload` | Upload files | Not needed |
| `browser_handle_dialog` | Accept/dismiss alerts | Not needed |
| `browser_wait_for` | Wait for text/condition/timeout | USEFUL -- wait for page load before screenshot |
| `browser_resize` | Adjust viewport dimensions at runtime | **USEFUL** -- viewport control between screenshots |
| `browser_navigate_back` | Go back in history | Not needed |
| `browser_console_messages` | Get console output | USEFUL -- detect JS errors in wireframes |
| `browser_network_requests` | Get network activity | Not needed for file:// workflows |
| `browser_close` | Close active page | Cleanup |

### Optional Tools (Require --caps flag)

| Category | Flag | Tools | PDE Relevance |
|----------|------|-------|---------------|
| **Vision** | `--caps=vision` | `browser_mouse_click_xy`, `browser_mouse_move_xy`, `browser_mouse_drag_xy`, `browser_mouse_down`, `browser_mouse_up`, `browser_mouse_wheel` | Not needed |
| **PDF** | `--caps=pdf` | `browser_pdf_save` | LOW -- could export wireframes as PDF |
| **Testing** | `--caps=testing` | `browser_verify_element_visible`, `browser_verify_text_visible`, `browser_verify_list_visible`, `browser_verify_value`, `browser_generate_locator` | **USEFUL for deploy smoke tests** |
| **DevTools** | `--caps=devtools` | `browser_start_tracing`, `browser_stop_tracing`, `browser_start_video`, `browser_stop_video` | Not needed |
| **Network** | `--caps=network` | `browser_route`, `browser_route_list`, `browser_unroute`, `browser_network_state_set`, `browser_network_requests` | Not needed |
| **Storage** | `--caps=storage` | Cookie/localStorage/sessionStorage CRUD (15 tools) | Not needed |
| **Config** | `--caps=config` | `browser_get_config` | Debug only |

### Tab Management (Always enabled)

| Tool | Purpose |
|------|---------|
| `browser_tabs` | Create, close, select, list tabs |
| `browser_install` | Install browser binary |

### PDE Minimum Tool Set

For all 4 PDE workflows, only these tools are needed:

1. `browser_navigate` -- navigate to file:// or https:// URL
2. `browser_take_screenshot` -- capture PNG
3. `browser_snapshot` -- get accessibility tree
4. `browser_resize` -- set viewport dimensions
5. `browser_wait_for` -- ensure page is loaded
6. `browser_close` -- cleanup

Optional but valuable:
- `browser_evaluate` -- inject JS if needed
- `browser_console_messages` -- detect wireframe JS errors
- Testing tools (`--caps=testing`) -- for deploy smoke tests

---

## 2. file:// URL Navigation

### Default: BLOCKED

**Confidence: HIGH** (official README, verified)

> "access to file system is restricted to workspace root directories (or cwd if no roots are configured) only, and navigation to file:// URLs is blocked"

### Fix: --allow-unrestricted-file-access

This flag does two things:
1. Allows access to files outside workspace roots
2. Unblocks `file://` URL navigation

### Required PDE Configuration

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headless",
        "--allow-unrestricted-file-access",
        "--viewport-size", "1440x900"
      ]
    }
  }
}
```

### macOS-Specific Considerations

**Confidence: MEDIUM** (no specific reports of issues, but reasoning from platform knowledge)

- file:// URLs on macOS do NOT trigger Gatekeeper (that's for app bundles, not browser file access)
- Playwright uses Chromium by default, which handles file:// natively
- No sandbox restrictions apply to file:// in headless Chromium
- Absolute paths must be used: `file:///Users/greyaltaer/code/projects/.../wireframes/index.html`
- Spaces in paths: URL-encode them or use the absolute path (Playwright handles this)

### Navigation Pattern for Wireframes

```
file:///absolute/path/to/.planning/design/ux/wireframes/index.html
file:///absolute/path/to/.planning/design/ux/wireframes/screen-hero.html
file:///absolute/path/to/.planning/design/ux/wireframes/screen-features.html
```

---

## 3. browser_snapshot: Accessibility Tree Format

### What It Returns

**Confidence: HIGH** (Playwright official docs + MCP README)

`browser_snapshot` returns a YAML-style accessibility tree, NOT a visual screenshot. The output is a serialized representation of the Accessibility Object Model (AOM).

### Output Format

```yaml
- banner:
  - heading "Site Title" [level=1]
  - navigation "Main":
    - link "Home"
    - link "About"
    - link "Contact"
- main:
  - heading "Page Heading" [level=2]
  - paragraph: "Some text content"
  - img "Hero image description"
  - list:
    - listitem: "Item 1"
    - listitem: "Item 2"
  - button "Submit" [disabled]
- contentinfo:
  - paragraph: "Footer text"
```

### Key Format Details

- **Indentation** = hierarchy (parent-child nesting)
- **Roles** = ARIA landmark roles (`banner`, `main`, `contentinfo`, `navigation`) and widget roles (`button`, `link`, `heading`, `img`)
- **"Name"** = accessible name in quotes (exact match) or `/pattern/` (regex)
- **[attribute=value]** = ARIA states: `[level=1]`, `[checked]`, `[disabled]`, `[expanded=true]`, `[pressed=true]`, `[selected]`
- **ref: reference-id** = unique element reference for subsequent tool calls (click, type, etc.)

### How to Parse for A11y Analysis

The tree text is ideal for LLM analysis. For PDE critique workflow, parse for:

| A11y Check | What to Look For in Snapshot |
|------------|------------------------------|
| **Missing landmarks** | Absence of `banner`, `main`, `contentinfo`, `navigation` roles |
| **Heading hierarchy** | `[level=N]` should go 1->2->3 without skipping levels |
| **Unlabeled images** | `img` without accessible name (empty quotes or no name) |
| **Unlabeled form controls** | `textbox`, `button`, `checkbox` without accessible name |
| **Missing link text** | `link` with empty or generic name like "click here" |
| **Document structure** | Whether content is organized with semantic roles vs flat list |
| **Focus order** | Tree order = tab order (reading order through the tree) |

### Snapshot vs Axe MCP

| Aspect | browser_snapshot | Axe MCP |
|--------|-----------------|---------|
| What it provides | Full AOM tree structure | Specific WCAG violations |
| Good for | Structural analysis, landmark audit, heading hierarchy | Rule-based compliance checking |
| LLM-friendly | Very -- it IS text | Moderate -- JSON violation list |
| Complementary | Yes -- reveals structure | Yes -- reveals violations |

**Recommendation:** Use both in critique accessibility perspective. Axe catches specific WCAG violations. browser_snapshot reveals structural issues (missing landmarks, poor heading hierarchy) that rule-based tools miss.

---

## 4. Viewport Configuration

### At Server Start (--viewport-size flag)

**Confidence: HIGH** (official README)

```
--viewport-size "1440x900"
```

Format: `"WIDTHxHEIGHT"` in pixels. This sets the default viewport for all pages.

### At Runtime (browser_resize tool)

The `browser_resize` tool can change viewport dimensions between screenshots:

```
browser_resize width=1440 height=900
browser_resize width=375 height=812   // iPhone viewport
```

### Via Config File

```json
{
  "browser": {
    "contextOptions": {
      "viewport": { "width": 1440, "height": 900 }
    }
  }
}
```

### Device Emulation

The `--device` flag provides complete device profiles:

```
--device "iPhone 15"
--device "iPad Pro 11"
--device "Pixel 7"
```

### Recommended Viewport Dimensions for PDE

| Workflow | Viewport | Rationale |
|----------|----------|-----------|
| Wireframe (desktop) | 1440x900 | Standard design breakpoint |
| Wireframe (mobile) | 375x812 | iPhone viewport |
| Mockup (desktop) | 1440x900 | Consistent with wireframes |
| Deploy smoke test | 1440x900 | Desktop-first verification |

---

## 5. Screenshot Format Options

### browser_take_screenshot Parameters

**Confidence: HIGH** (GitHub source code + multiple sources)

| Parameter | Type | Description |
|-----------|------|-------------|
| `raw` | boolean | `true` = PNG (lossless), `false`/default = JPEG (compressed) |
| `filename` | string | Custom filename. Default: `page-{timestamp}.{png\|jpeg}` |
| `element` | string | Human-readable description of target element |
| `ref` | string | Element reference from browser_snapshot |
| `fullPage` | boolean | `true` = capture entire scrollable page, `false` = viewport only |

### Format Details

| Setting | Format | Quality | Use Case |
|---------|--------|---------|----------|
| `raw: true` | PNG | Lossless | Wireframe/mockup capture (pixel-perfect) |
| `raw: false` (default) | JPEG | Quality 50 | Quick previews, smaller files |

### Save Location

Screenshots save to `.playwright-mcp/` directory by default. Override with `--output-dir`:

```
--output-dir ".planning/design/screenshots"
```

### How Screenshots Return to Claude

The tool returns:
1. A text message confirming the screenshot was taken
2. The image data as a base64-encoded content block (when `--image-responses` is "allow" or "auto")
3. The file is also saved to disk at the specified/default location

**Important for PDE:** The `--image-responses` flag controls whether image data is sent back in the MCP response:
- `"allow"` -- always return image data (uses tokens)
- `"omit"` -- never return image data (just save to file)
- `"auto"` (default) -- model decides

For PDE workflows where we just need the file saved (not analyzed by Claude), use `--image-responses omit` to save context window tokens.

### Recommended PDE Screenshot Pattern

```
1. browser_navigate to file:///path/to/wireframe.html
2. browser_wait_for (text or timeout to ensure render)
3. browser_take_screenshot raw=true filename="wireframe-hero.png" fullPage=true
4. Copy/move from .playwright-mcp/ to .planning/design/ux/wireframes/screenshots/
```

---

## 6. Multi-Page Wireframe Sites

### Strategy: Sequential Navigation

Playwright MCP operates on a single browser context. For multi-page wireframe sites (index.html + screen-*.html), navigate sequentially:

```
1. browser_navigate file:///path/to/wireframes/index.html
2. browser_take_screenshot -> screenshots/index.png
3. browser_navigate file:///path/to/wireframes/screen-hero.html
4. browser_take_screenshot -> screenshots/screen-hero.png
5. browser_navigate file:///path/to/wireframes/screen-features.html
6. browser_take_screenshot -> screenshots/screen-features.png
... repeat for each screen
```

### Discovering Pages

PDE already knows the screen list from the wireframe generation step. The flow inventory in `.planning/design/ux/flow-inventory.md` lists all screens. The wireframe skill generates one HTML file per screen plus an index.html.

Pattern to enumerate:
```
ls .planning/design/ux/wireframes/screen-*.html
```

### Tab-Based Alternative (NOT recommended)

`browser_tabs` can create multiple tabs, but this adds complexity for no benefit -- screenshots must still be taken one at a time per tab, and tab switching introduces extra tool calls.

### Performance Consideration

Each `browser_navigate` + `browser_take_screenshot` pair is 2 tool calls. For a typical wireframe set of 5-8 screens, that's 10-16 tool calls. At ~2-5 seconds per tool call, expect 20-80 seconds for a full wireframe screenshot set. This is acceptable.

---

## 7. Error Handling Patterns

### Navigation Failures

**Confidence: MEDIUM** (inferred from timeout config + general MCP patterns)

| Error | Cause | Behavior |
|-------|-------|----------|
| Navigation timeout | Page doesn't load within `--timeout-navigation` (default 60s) | Tool returns error |
| Invalid URL | Malformed file:// path | Tool returns error |
| file:// blocked | `--allow-unrestricted-file-access` not set | Tool returns error stating file access is restricted |
| 404/network error | URL not found (deploy smoke test) | Navigation completes but page shows error |

### Timeout Configuration

```
--timeout-navigation 60000   # 60s for navigation (default)
--timeout-action 5000        # 5s for actions like click/type (default)
```

For file:// URLs, navigation is near-instant. For deploy smoke tests, 60s is generous. Consider lowering to 30000 for file:// workflows.

### PDE Error Handling Strategy

```
Workflow step:
1. Call browser_navigate
2. If error response contains "file access is restricted":
   -> FAIL with message: "Playwright MCP needs --allow-unrestricted-file-access flag"
3. If error response contains "timeout":
   -> RETRY once, then FAIL with message
4. If success:
   -> Proceed to screenshot/snapshot
5. Call browser_take_screenshot
6. If error:
   -> Log warning, continue without screenshot (graceful degradation)
```

### Graceful Degradation

PDE workflows already have `--no-playwright` flag support. When Playwright MCP is unavailable or errors occur, workflows should:
1. Log the failure
2. Skip the screenshot/snapshot step
3. Continue with remaining workflow steps
4. Note "Screenshot not captured" in output

---

## 8. Concurrency / Parallel Execution

### Single-Instance Limitation

**Confidence: HIGH** (GitHub issue #893, confirmed by Microsoft)

> "Multiple parallel Claude Code agents result in interference... fighting over the same tab in the same browser window"

Playwright MCP uses a **single browser context per server instance**. Multiple agents calling the same MCP server will interfere with each other.

### Impact on PDE

PDE uses worktree-based parallelism with multiple Claude Code agents. If two agents both try to use Playwright MCP simultaneously, they will conflict.

### Mitigation Options

**Option A: Sequential only (Recommended for now)**
- Only one agent uses Playwright MCP at a time
- PDE workflow orchestration already serializes screenshot steps
- No configuration changes needed

**Option B: Multiple named servers**
```json
{
  "mcpServers": {
    "playwright-1": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless", "--isolated", "--user-data-dir", "/tmp/pw-1"]
    },
    "playwright-2": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless", "--isolated", "--user-data-dir", "/tmp/pw-2"]
    }
  }
}
```

Problem: Tool names become `mcp__playwright-1__browser_navigate` and `mcp__playwright-2__browser_navigate`. This breaks TOOL_MAP's single-namespace assumption.

**Option C: playwright-parallel-mcp (community package)**
Third-party wrapper that spawns child processes per session. Not from Microsoft. Avoid for now -- adds dependency risk.

### Recommendation

Use Option A (sequential). PDE's wireframe and mockup workflows are single-agent operations. Deploy smoke tests are single-agent. The only scenario requiring parallel browser access would be running wireframe + mockup simultaneously, which is not a current requirement.

---

## 9. macOS file:// Specifics

### No Gatekeeper Issues

**Confidence: HIGH**

macOS Gatekeeper applies to application bundles (.app), not to browser file:// navigation. Chromium (Playwright's default browser) handles file:// URLs natively without any macOS security prompts.

### No Sandbox Restrictions

Playwright runs Chromium directly, not through the App Sandbox. The `--allow-unrestricted-file-access` flag is the only gate. Once set, file:// works without macOS-specific issues.

### Path Format

macOS file:// URLs use standard Unix paths:
```
file:///Users/greyaltaer/code/projects/Platform%20Development%20Engine/.planning/design/ux/wireframes/index.html
```

Note: spaces must be URL-encoded as `%20`. PDE project path contains a space ("Platform Development Engine"). This MUST be encoded in file:// URLs.

### Headless on macOS

`--headless` works without display server (no XQuartz needed). This is the recommended mode for PDE since we don't need to see the browser.

---

## 10. Tool Name Format in Claude Code

### Confirmed Format

**Confidence: HIGH** (GitHub issue #1359, practitioner blog posts, existing PDE TOOL_MAP)

The format is:
```
mcp__playwright__browser_navigate
mcp__playwright__browser_take_screenshot
mcp__playwright__browser_snapshot
mcp__playwright__browser_resize
mcp__playwright__browser_wait_for
mcp__playwright__browser_close
mcp__playwright__browser_evaluate
mcp__playwright__browser_console_messages
```

### How the Prefix is Determined

Claude Code derives the tool prefix from the **server name** used during `claude mcp add`:

```bash
claude mcp add playwright npx @playwright/mcp@latest
#              ^^^^^^^^^^
#              This becomes the namespace: mcp__playwright__*
```

If you named it differently:
```bash
claude mcp add my-browser npx @playwright/mcp@latest
# Tools become: mcp__my-browser__browser_navigate
```

### PDE TOOL_MAP Entries (VERIFIED)

The existing TOOL_MAP entries in WEBMCP-ARCHITECTURE.md are CORRECT assuming the server is registered as "playwright":

```javascript
'playwright:probe':      'mcp__playwright__browser_snapshot',
'playwright:navigate':   'mcp__playwright__browser_navigate',
'playwright:screenshot':  'mcp__playwright__browser_take_screenshot',
'playwright:snapshot':    'mcp__playwright__browser_snapshot',
'playwright:click':       'mcp__playwright__browser_click',
'playwright:type':        'mcp__playwright__browser_type',
'playwright:wait':        'mcp__playwright__browser_wait_for',
'playwright:evaluate':    'mcp__playwright__browser_evaluate',
'playwright:pdf':         'mcp__playwright__browser_pdf_save',
'playwright:close':       'mcp__playwright__browser_close',
```

### Version Compatibility Warning

**Confidence: HIGH** (GitHub issue #1359)

There is a known issue: recent versions of @playwright/mcp (0.0.56+) may not work correctly with Claude Code. Symptoms: "No such tool available" errors.

**Workaround:** Pin to a known-good version:
```bash
claude mcp add playwright npx @playwright/mcp@0.0.41
```

**Status as of 2026-03-23:** This issue may be resolved in newer versions. Test with `@latest` first, fall back to `0.0.41` if tools are unavailable.

---

## 11. Recommended PDE Configuration

### Server Registration

```bash
claude mcp add playwright npx @playwright/mcp@latest \
  --headless \
  --allow-unrestricted-file-access \
  --viewport-size "1440x900" \
  --image-responses omit \
  --output-dir ".playwright-mcp" \
  --snapshot-mode full \
  --caps testing
```

### Flag Rationale

| Flag | Why |
|------|-----|
| `--headless` | No browser window needed for automated screenshots |
| `--allow-unrestricted-file-access` | Required for file:// wireframe/mockup navigation |
| `--viewport-size "1440x900"` | Consistent desktop viewport for screenshots |
| `--image-responses omit` | Save context window tokens -- we want files, not inline images |
| `--output-dir ".playwright-mcp"` | Known output location for screenshot files |
| `--snapshot-mode full` | Full accessibility tree each time (PDE doesn't maintain sessions) |
| `--caps testing` | Enable verify tools for deploy smoke tests |

### Configuration File Alternative

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": { "headless": true }
  },
  "capabilities": ["testing"],
  "snapshot": { "mode": "full" },
  "imageResponses": "omit",
  "network": {
    "allowedOrigins": ["file://*"]
  }
}
```

---

## 12. Workflow-Specific Patterns

### Workflow 1: Wireframe Screenshot Capture

```
PRE: Wireframe HTML files exist at .planning/design/ux/wireframes/

STEP 1: Probe
  Call mcp__playwright__browser_snapshot (about:blank or any URL)
  If error -> set PLAYWRIGHT_AVAILABLE=false, skip remaining steps

STEP 2: Navigate to index
  Call mcp__playwright__browser_navigate
    url: "file:///absolute/path/to/.planning/design/ux/wireframes/index.html"

STEP 3: Screenshot index
  Call mcp__playwright__browser_take_screenshot
    raw: true
    filename: "wireframe-index.png"
    fullPage: true

STEP 4: For each screen-*.html
  Call mcp__playwright__browser_navigate
    url: "file:///absolute/path/to/.planning/design/ux/wireframes/screen-{name}.html"
  Call mcp__playwright__browser_take_screenshot
    raw: true
    filename: "wireframe-{name}.png"
    fullPage: true

STEP 5: Move screenshots
  mv .playwright-mcp/wireframe-*.png .planning/design/ux/wireframes/screenshots/

STEP 6: Cleanup
  Call mcp__playwright__browser_close
```

### Workflow 2: Mockup Screenshot Capture

Same pattern as wireframe, different paths:
- Source: `.planning/design/visual/mockups/*.html`
- Destination: `.planning/design/visual/mockups/screenshots/`

### Workflow 3: Critique Accessibility Tree

```
PRE: Wireframe or mockup HTML exists

STEP 1: Navigate
  Call mcp__playwright__browser_navigate
    url: "file:///path/to/wireframe.html"

STEP 2: Get accessibility tree
  Call mcp__playwright__browser_snapshot
  -> Returns YAML-style AOM tree

STEP 3: Parse tree for a11y issues
  - Check for landmark roles (banner, main, contentinfo, navigation)
  - Verify heading hierarchy (h1 -> h2 -> h3, no skips)
  - Find unlabeled images (img without name)
  - Find unlabeled controls (button/textbox without name)
  - Check reading order makes semantic sense

STEP 4: Combine with Axe MCP results
  If Axe MCP available: merge structural findings with WCAG violations
  If Axe MCP unavailable: browser_snapshot is sole a11y data source
```

### Workflow 4: Deploy Smoke Test

```
PRE: $DEPLOY_URL is set from deploy workflow

STEP 1: Navigate to deploy
  Call mcp__playwright__browser_navigate
    url: "$DEPLOY_URL"

STEP 2: Wait for load
  Call mcp__playwright__browser_wait_for
    text: (expected heading or section text)
    timeout: 30000

STEP 3: Verify structure
  Call mcp__playwright__browser_snapshot
  -> Parse for expected sections from wireframe inventory

STEP 4: Screenshot for record
  Call mcp__playwright__browser_take_screenshot
    raw: true
    filename: "deploy-verification.png"
    fullPage: true

STEP 5 (if --caps=testing enabled):
  Call mcp__playwright__browser_verify_text_visible
    text: "expected heading"
  Call mcp__playwright__browser_verify_element_visible
    role: "navigation"
    name: "Main"
```

---

## 13. Key Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Version incompatibility (issue #1359) | HIGH | Pin version, test on setup, document fallback to 0.0.41 |
| file:// blocked by default | HIGH | Always include `--allow-unrestricted-file-access` in config |
| Spaces in file path | MEDIUM | URL-encode "Platform Development Engine" as "Platform%20Development%20Engine" |
| Context window bloat from screenshots | MEDIUM | Use `--image-responses omit` to prevent base64 images in responses |
| Parallel agent interference | MEDIUM | Keep Playwright usage sequential (one agent at a time) |
| Snapshot mode `incremental` confusion | LOW | Use `--snapshot-mode full` since PDE workflows are stateless |
| JPEG default quality (50) | LOW | Always pass `raw: true` for PNG lossless |
| Large page snapshots filling context | LOW | Use `--snapshot-mode none` when only screenshots needed |

---

## 14. Open Questions for Live Verification

These items CANNOT be resolved through research alone and require live testing:

1. **Exact version compatibility:** Does `@playwright/mcp@latest` (current) work with the current Claude Code version? Or must we pin to 0.0.41?
2. **Screenshot file location:** When `--output-dir` is set, does the filename parameter create the file at `{output-dir}/{filename}` or somewhere else?
3. **URL encoding:** Does `browser_navigate` handle spaces in file:// paths automatically, or must the workflow URL-encode them?
4. **fullPage behavior on file:// HTML:** Does `fullPage: true` capture the entire page content correctly for wireframe HTML files (which may have viewport-height sections)?
5. **browser_resize persistence:** After calling `browser_resize`, does the new size persist across `browser_navigate` calls, or must it be set per-page?
6. **Snapshot size for complex pages:** How large (in tokens) is a typical browser_snapshot for a wireframe with 10-20 elements?

---

## Sources

- [microsoft/playwright-mcp GitHub](https://github.com/microsoft/playwright-mcp) -- Official repository, README (HIGH confidence)
- [Playwright ARIA Snapshots docs](https://playwright.dev/docs/aria-snapshots) -- Official snapshot format (HIGH confidence)
- [GitHub Issue #1359: Claude Code compatibility](https://github.com/microsoft/playwright-mcp/issues/1359) -- Version pinning (HIGH confidence)
- [GitHub Issue #893: Parallel agent interference](https://github.com/microsoft/playwright-mcp/issues/893) -- Concurrency limitations (HIGH confidence)
- [Simon Willison TIL: Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) -- Practical patterns (MEDIUM confidence)
- [alexop.dev: Building AI QA Engineer](https://alexop.dev/posts/building_ai_qa_engineer_claude_code_playwright/) -- Tool name format confirmation (MEDIUM confidence)
- [Shipyard: Taking screenshots with Playwright MCP](https://shipyard.build/blog/playwright-mcp-screenshots/) -- Screenshot save patterns (MEDIUM confidence)
- [DeepWiki: microsoft/playwright-mcp](https://deepwiki.com/microsoft/playwright-mcp) -- Complete tool inventory (MEDIUM confidence)
- [Builder.io: Playwright MCP with Claude Code](https://www.builder.io/blog/playwright-mcp-server-claude-code) -- Integration guide (MEDIUM confidence)
