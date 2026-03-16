<purpose>
Generate hi-fi interactive HTML/CSS mockups from refined wireframes. Applies design tokens from tokens.css via a relative `<link>` tag, adds CSS-only interactive states (:hover, :focus-visible, :active, :checked pseudo-classes), and preserves wireframe annotations as HTML comments for handoff traceability. Produces per-screen mockup-{screen}.html files and a navigation index.html in .planning/design/ux/mockups/. Consumes wireframe HTML and design system tokens. Consumed by /pde:critique and /pde:handoff.
</purpose>

<skill_code>MCK</skill_code>

<skill_domain>ux</skill_domain>

<context_routing>

## Context Detection

Before beginning, load available context:

**Hard requirement (HALT if missing):** None. Wireframes are a soft dependency -- mockup generation proceeds from brief and flows context if wireframes are absent.

**Soft dependencies (enrich generation):**
- `.planning/design/ux/wireframe-*-v*.html` or `.planning/design/ux/wireframes/WFR-*.html` -- wireframe screens to evolve to hi-fi
- `.planning/design/assets/tokens.css` -- design tokens for visual polish
- `.planning/design/visual/SYS-system-v*.md` -- design system artifact for token values and component patterns
- `.planning/design/strategy/BRF-brief-v*.md` -- product context for realistic content

**Routing logic:**

```
IF wireframe HTML files found:
  List all screens, parse each as base HTML for hi-fi evolution
  Extract all <!-- WIREFRAME-ANNOTATION: ... --> comments from each
  Log: "  -> Found {N} wireframe screens for hi-fi evolution"
ELSE:
  Emit warning: "No wireframes found. Generating mockup from brief and flows context.
    Run /pde:wireframe --hifi first for wireframe-traceable mockup output."
  Proceed without wireframe source traceability markers

IF tokens.css NOT found:
  Emit warning: "Design tokens not found. Using system defaults.
    Run /pde:system first for token-accurate mockups."
  Proceed with CSS custom property fallbacks inline

IF --screen flag present:
  Filter to the single named screen only
  All other discovery steps apply to that screen only
```

</context_routing>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/web-modern-css.md
@references/interaction-patterns.md
</required_reading>

<flags>

## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Show planned output without generating. Runs Steps 1-3 (init, prerequisites, MCP probe) but writes NO files. Displays planned file paths, screen count, token status, estimated token usage. |
| `--screen {name}` | Value | Generate a single named screen only. Accepts the screen slug (e.g., `--screen login`). |
| `--verbose` | Boolean | Show detailed progress, token mapping details, MCP probe results, timing per step. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode using training knowledge and local files only. |
| `--no-playwright` | Boolean | Skip Playwright MCP specifically while allowing other MCPs. |
| `--force` | Boolean | Overwrite existing mockup files without prompting for confirmation. |
| `--quick` | Boolean | Skip MCP enhancements for faster execution. |

</flags>

<process>

## /pde:mockup -- Hi-Fi Mockup Generation Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--screen`, `--verbose`, `--no-mcp`, `--no-playwright`, `--force`, `--quick`.

---

### Step 1/7: Initialize design directories

```bash
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse the JSON result. If the result contains an error field or the command exits non-zero:

```
Error: Failed to initialize design directories.
  The design directory structure could not be created.
  Check that .planning/ exists and is writable, then re-run /pde:mockup.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and discover wireframes

#### 2a. Discover wireframe source files

Use the Glob tool to search for wireframe HTML files in these locations (in order):

1. `.planning/design/ux/wireframes/WFR-*.html` (standard wireframe output location)
2. `.planning/design/ux/wireframe-*-v*.html` (alternate naming pattern)

For each match, identify the screen slug and highest version. Store as WIREFRAMES array.

**If wireframes found:** Log for each: `  -> Found wireframe: {filename} (screen: {slug})`

**If wireframes NOT found:**
```
Warning: No wireframes found at .planning/design/ux/wireframes/ or .planning/design/ux/.
  Generating mockup from brief and flows context. Run /pde:wireframe first for
  wireframe-traceable mockup output with annotation preservation.
```
Set WIREFRAMES = [] and WIREFRAME_TRACEABILITY = false. Proceed.

#### 2b. Apply --screen filter

If `--screen {name}` flag is present, filter WIREFRAMES to only the matching slug. If the named screen is not found in WIREFRAMES (and wireframes exist), emit warning and halt:

```
Error: Screen "{name}" not found in discovered wireframes.
  Available screens: {comma-separated slug list}
  Check spelling or run /pde:wireframe first to generate this screen.
```

If wireframes are absent and `--screen` is present, set SCREENS = [{slug: name}] with no source file.

#### 2c. Check for existing mockup files and determine version

Use the Glob tool to check for `.planning/design/ux/mockups/mockup-*.html`.

- If **no mockup files exist**: proceed, version N = 1.
- If **mockup files exist AND `--force` NOT present**: prompt the user:
  ```
  Mockup files already exist in .planning/design/ux/mockups/.
  Overwrite? (yes / no)
  ```
  If user answers "no": display `Aborted. Existing mockups preserved.` and halt.
  If user answers "yes": proceed.
- If **mockup files exist AND `--force` present**: log: `  -> --force flag detected, overwriting existing mockups.`

Determine version N: scan for existing `MCK-mockup-spec-v*.md` in `.planning/design/ux/mockups/`. N = max existing version + 1, or 1 if none exist.

#### 2d. Read design system and brief (soft dependencies)

Use the Glob tool to check for `.planning/design/visual/SYS-system-v*.md`. If found, load the highest-version file for token values and component patterns.

Use the Glob tool to check for `.planning/design/strategy/BRF-brief-v*.md`. If found, load the highest-version file for PRODUCT_NAME, PRODUCT_TYPE, and key product context.

If neither brief nor design system is found, use PROJECT.md as fallback context:
```
Warning: No design brief or design system found.
  Mockup will use generic content. Run /pde:brief and /pde:system first for richer output.
```
Use the Read tool to load `.planning/PROJECT.md` as fallback.

**If `--dry-run` flag is active:** Display planned output and HALT:

```
Dry run mode. No files will be written.

Planned output:
  Files: .planning/design/ux/mockups/mockup-{screen}.html (one per screen)
  File: .planning/design/ux/mockups/index.html
  File: .planning/design/ux/mockups/MCK-mockup-spec-v{N}.md

Screens ({count}): {comma-separated slug list or "none -- will generate from brief context"}
Token status: {tokens-available | tokens-fallback}
Wireframe traceability: {enabled | disabled -- no wireframes found}
MCP enhancements planned: Playwright (visual validation)

Estimated token usage: ~{estimate}
```

Display: `Step 2/7: Prerequisites checked. Screens: {count}. Version: v{N}.`

---

### Step 3/7: Probe MCP availability

**Check flags first:**

```
IF --no-mcp in $ARGUMENTS OR --quick in $ARGUMENTS:
  SET PLAYWRIGHT_AVAILABLE = false
  SET ALL_MCP_DISABLED = true
  SKIP all MCP probes
  continue to Step 4

IF --no-playwright in $ARGUMENTS:
  SET PLAYWRIGHT_AVAILABLE = false
  SKIP Playwright probe
```

**Probe Playwright MCP** (if not skipped by flags above):

Attempt to call a tool in the `mcp__playwright__*` namespace with a minimal probe (navigate to about:blank).

- Timeout: 30 seconds
- If tool responds: SET `PLAYWRIGHT_AVAILABLE = true`. Log: `  -> Playwright MCP: available (visual validation enabled)`
- If tool not found or errors: SET `PLAYWRIGHT_AVAILABLE = false`. Log: `  -> Playwright MCP: unavailable (continuing without browser validation -- install Playwright MCP for automated screenshot validation)`

Display: `Step 3/7: MCP probes complete. Playwright: {available | unavailable}.`

---

### Step 4/7: Generate hi-fi HTML/CSS mockups

This is the core generation step. For EACH screen in the SCREENS array (from wireframes or derived from brief context):

#### 4a. Read wireframe source and extract annotations

If a source wireframe HTML file exists for this screen:

1. Use the Read tool to load the wireframe HTML file completely.
2. Extract ALL `<!-- WIREFRAME-ANNOTATION: ... -->` comments. Store the full comment text and its approximate position in the document (head, header, main, footer section).
3. Extract the wireframe version number from the `data-version` attribute on `<body>`.
4. Note the wireframe filename for WIREFRAME-SOURCE traceability.

If no source wireframe:
- Set WIREFRAME_SOURCE = null
- ANNOTATION list = []

#### 4b. Generate the mockup HTML

Generate the complete HTML for this screen following this exact structure:

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Screen Name} -- {PRODUCT_NAME} Mockup</title>
  <!-- WIREFRAME-SOURCE: {wireframe-filename} | Generated: {YYYY-MM-DD} -->
  <link rel="stylesheet" href="../../assets/tokens.css">
  <style>
    /* All custom styles inline -- self-contained per MOCK-01 */
    /* CSS-only interactive states -- no JavaScript per MOCK-02 */
    @layer tokens, mockup-layout, components, utilities;

    @layer mockup-layout {
      /* ------------------------------------------ */
      /* Mockup: {screen-slug} -- Hi-Fi             */
      /* Source: {wireframe-filename or "generated"} */
      /* ------------------------------------------ */

      /* Base reset and layout */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: var(--font-family-body, system-ui, sans-serif);
        background: var(--color-bg-default, #f9fafb);
        color: var(--color-text-primary, #1f2937);
        line-height: var(--leading-normal, 1.5);
        min-height: 100dvh;
      }

      /* Skip link */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: var(--color-action, #2563eb);
        color: #fff;
        padding: 0.5rem 1rem;
        z-index: 100;
        text-decoration: none;
        border-radius: var(--radius-sm, 0.25rem);
      }
      .skip-link:focus-visible {
        top: 0;
      }

      /* Page layout */
      .pde-header {
        background: var(--color-surface, #ffffff);
        border-bottom: 1px solid var(--color-border, #e5e7eb);
        padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        z-index: 50;
        box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
      }

      .pde-nav {
        display: flex;
        gap: var(--space-2, 0.5rem);
        align-items: center;
      }

      .pde-nav a {
        color: var(--color-text-secondary, #6b7280);
        text-decoration: none;
        font-size: var(--font-size-sm, 0.875rem);
        padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
        border-radius: var(--radius-sm, 0.25rem);
        transition: color 150ms ease-out, background-color 150ms ease-out;
      }

      .pde-nav a:hover {
        color: var(--color-text-primary, #1f2937);
        background: var(--color-surface-alt, #f3f4f6);
      }

      .pde-nav a:focus-visible {
        outline: 2px solid var(--color-focus-ring, #2563eb);
        outline-offset: 2px;
      }

      main {
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--space-6, 1.5rem) var(--space-4, 1rem);
      }

      /* Primary action button -- CSS-only interactive states */
      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2, 0.5rem);
        background: var(--color-action, #2563eb);
        color: var(--color-on-action, #ffffff);
        border: none;
        border-radius: var(--radius-md, 0.375rem);
        padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: var(--font-weight-medium, 500);
        cursor: pointer;
        text-decoration: none;
        transition: background-color 150ms ease-out, transform 100ms ease-out, box-shadow 150ms ease-out;
      }
      .btn-primary:hover {
        background: var(--color-action-hover, #1d4ed8);
        box-shadow: var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1));
      }
      .btn-primary:focus-visible {
        outline: 3px solid var(--color-focus-ring, #2563eb);
        outline-offset: 2px;
        background: var(--color-action-hover, #1d4ed8);
      }
      .btn-primary:active {
        transform: scale(0.98);
        background: var(--color-action-active, #1e40af);
      }
      .btn-primary:disabled,
      .btn-primary[aria-disabled="true"] {
        opacity: var(--opacity-disabled, 0.5);
        cursor: not-allowed;
        transform: none;
      }

      /* Secondary button */
      .btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2, 0.5rem);
        background: transparent;
        color: var(--color-action, #2563eb);
        border: 1px solid var(--color-action, #2563eb);
        border-radius: var(--radius-md, 0.375rem);
        padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: var(--font-weight-medium, 500);
        cursor: pointer;
        text-decoration: none;
        transition: background-color 150ms ease-out, color 150ms ease-out;
      }
      .btn-secondary:hover {
        background: var(--color-action-subtle, #eff6ff);
        color: var(--color-action-hover, #1d4ed8);
        border-color: var(--color-action-hover, #1d4ed8);
      }
      .btn-secondary:focus-visible {
        outline: 3px solid var(--color-focus-ring, #2563eb);
        outline-offset: 2px;
      }
      .btn-secondary:active {
        transform: scale(0.98);
        background: var(--color-action-subtle, #eff6ff);
      }

      /* Form elements -- CSS-only states */
      .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--space-1, 0.25rem);
      }

      .form-label {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: var(--font-weight-medium, 500);
        color: var(--color-text-primary, #1f2937);
      }

      .form-input {
        padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-md, 0.375rem);
        font-size: var(--font-size-base, 1rem);
        color: var(--color-text-primary, #1f2937);
        background: var(--color-surface, #ffffff);
        transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
        width: 100%;
      }
      .form-input:hover {
        border-color: var(--color-border-hover, #d1d5db);
      }
      .form-input:focus-visible {
        outline: none;
        border-color: var(--color-action, #2563eb);
        box-shadow: 0 0 0 3px var(--color-focus-ring-subtle, rgba(37,99,235,0.15));
      }
      .form-input:disabled {
        background: var(--color-surface-alt, #f3f4f6);
        color: var(--color-text-disabled, #9ca3af);
        cursor: not-allowed;
      }
      .form-input:invalid:not(:placeholder-shown) {
        border-color: var(--color-error, #dc2626);
      }
      .form-input:valid:not(:placeholder-shown) {
        border-color: var(--color-success, #16a34a);
      }

      .form-helper {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-text-secondary, #6b7280);
      }

      .form-error {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-error, #dc2626);
        display: none;
      }

      /* Show error message when input is invalid and user has interacted */
      .form-input:invalid:not(:placeholder-shown) ~ .form-error {
        display: block;
      }

      /* Checkbox -- CSS-only checked state */
      .form-checkbox {
        display: flex;
        align-items: center;
        gap: var(--space-2, 0.5rem);
        cursor: pointer;
      }
      .form-checkbox input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
        accent-color: var(--color-action, #2563eb);
        cursor: pointer;
      }
      .form-checkbox input[type="checkbox"]:focus-visible {
        outline: 2px solid var(--color-focus-ring, #2563eb);
        outline-offset: 2px;
      }

      /* Card component */
      .pde-card {
        background: var(--color-surface, #ffffff);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-lg, 0.5rem);
        padding: var(--space-4, 1rem) var(--space-6, 1.5rem);
        box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
        transition: box-shadow 200ms ease-out;
      }
      .pde-card:hover {
        box-shadow: var(--shadow-md, 0 4px 6px rgba(0,0,0,0.07));
      }

      .pde-card--interactive {
        cursor: pointer;
      }
      .pde-card--interactive:focus-visible {
        outline: 2px solid var(--color-focus-ring, #2563eb);
        outline-offset: 2px;
      }

      /* Badge / status indicator -- CSS-only */
      .badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1, 0.25rem);
        padding: 0.125rem var(--space-2, 0.5rem);
        border-radius: var(--radius-full, 9999px);
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: var(--font-weight-medium, 500);
      }
      .badge--success {
        background: var(--color-success-subtle, #dcfce7);
        color: var(--color-success-text, #15803d);
      }
      .badge--warning {
        background: var(--color-warning-subtle, #fef9c3);
        color: var(--color-warning-text, #854d0e);
      }
      .badge--error {
        background: var(--color-error-subtle, #fee2e2);
        color: var(--color-error-text, #b91c1c);
      }
      .badge--info {
        background: var(--color-info-subtle, #dbeafe);
        color: var(--color-info-text, #1d4ed8);
      }

      /* Details/summary -- CSS-only disclosure */
      details.pde-disclosure {
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-md, 0.375rem);
        overflow: hidden;
      }
      details.pde-disclosure summary {
        padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
        cursor: pointer;
        font-weight: var(--font-weight-medium, 500);
        background: var(--color-surface-alt, #f9fafb);
        list-style: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background-color 150ms ease-out;
      }
      details.pde-disclosure summary:hover {
        background: var(--color-surface-hover, #f3f4f6);
      }
      details.pde-disclosure summary:focus-visible {
        outline: 2px solid var(--color-focus-ring, #2563eb);
        outline-offset: -2px;
      }
      details.pde-disclosure summary::after {
        content: "+";
        font-size: 1.25rem;
        line-height: 1;
        color: var(--color-text-secondary, #6b7280);
        transition: transform 200ms ease-out;
      }
      details.pde-disclosure[open] summary::after {
        transform: rotate(45deg);
      }
      details.pde-disclosure .disclosure-body {
        padding: var(--space-4, 1rem);
        border-top: 1px solid var(--color-border, #e5e7eb);
      }

      /* Navigation tab bar -- CSS-only active states via :checked */
      .tab-bar {
        display: flex;
        border-bottom: 2px solid var(--color-border, #e5e7eb);
        gap: 0;
        overflow-x: auto;
      }
      .tab-bar a {
        padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
        color: var(--color-text-secondary, #6b7280);
        text-decoration: none;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: var(--font-weight-medium, 500);
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: color 150ms ease-out, border-color 150ms ease-out;
        white-space: nowrap;
      }
      .tab-bar a:hover {
        color: var(--color-text-primary, #1f2937);
        border-bottom-color: var(--color-border-hover, #d1d5db);
      }
      .tab-bar a:focus-visible {
        outline: 2px solid var(--color-focus-ring, #2563eb);
        outline-offset: -2px;
        border-radius: var(--radius-sm, 0.25rem) var(--radius-sm, 0.25rem) 0 0;
      }
      .tab-bar a[aria-current="page"] {
        color: var(--color-action, #2563eb);
        border-bottom-color: var(--color-action, #2563eb);
      }

      /* Error state banner */
      .error-banner {
        background: var(--color-error-subtle, #fee2e2);
        border: 1px solid var(--color-error-border, #fca5a5);
        border-radius: var(--radius-md, 0.375rem);
        padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
        color: var(--color-error-text, #b91c1c);
        display: flex;
        align-items: flex-start;
        gap: var(--space-3, 0.75rem);
      }

      /* Loading skeleton -- CSS animation */
      @keyframes pde-shimmer {
        from { background-position: -200% 0; }
        to { background-position: 200% 0; }
      }
      .skeleton {
        background: linear-gradient(
          90deg,
          var(--color-surface-alt, #f3f4f6) 25%,
          var(--color-border, #e5e7eb) 50%,
          var(--color-surface-alt, #f3f4f6) 75%
        );
        background-size: 200% 100%;
        animation: pde-shimmer 1.5s ease-in-out infinite;
        border-radius: var(--radius-sm, 0.25rem);
      }

      /* State variant display control */
      .pde-state--loading,
      .pde-state--error,
      .pde-state--empty {
        display: none;
      }

      /* Dark mode */
      [data-theme="dark"] {
        --color-bg-default: var(--color-neutral-900, #111827);
        --color-surface: var(--color-neutral-800, #1f2937);
        --color-surface-alt: var(--color-neutral-700, #374151);
        --color-text-primary: var(--color-neutral-50, #f9fafb);
        --color-text-secondary: var(--color-neutral-400, #9ca3af);
        --color-border: var(--color-neutral-700, #374151);
        --color-border-hover: var(--color-neutral-600, #4b5563);
      }

      /* Screen-specific layout styles */
      {screen-specific layout styles for this screen}
    }

    /* Responsive breakpoints */
    @media (min-width: 640px) {
      /* sm: {layout adjustments} */
    }
    @media (min-width: 768px) {
      /* md: {layout adjustments} */
    }
    @media (min-width: 1024px) {
      /* lg: {desktop layout} */
    }
    @media (min-width: 1280px) {
      /* xl: {wide screen layout} */
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --color-bg-default: var(--color-neutral-900, #111827);
        --color-surface: var(--color-neutral-800, #1f2937);
        --color-surface-alt: var(--color-neutral-700, #374151);
        --color-text-primary: var(--color-neutral-50, #f9fafb);
        --color-text-secondary: var(--color-neutral-400, #9ca3af);
        --color-border: var(--color-neutral-700, #374151);
      }
    }
  </style>
</head>
<body class="pde-layout--hifi" data-screen="{screen-slug}" data-version="{N}">
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <!-- WIREFRAME-ANNOTATION: {preserved annotation text from wireframe if present} -->

  <header role="banner" class="pde-header">
    <div class="pde-header__brand">
      <a href="index.html" aria-label="{PRODUCT_NAME} home">
        <strong style="font-size: var(--font-size-lg, 1.125rem); color: var(--color-action, #2563eb);">{PRODUCT_NAME}</strong>
      </a>
    </div>
    <nav aria-label="Main navigation" class="pde-nav">
      {Navigation links to all screens -- link to each mockup-{slug}.html}
    </nav>
    <div class="pde-header__actions">
      <button
        type="button"
        aria-pressed="false"
        aria-label="Toggle dark mode"
        onclick="toggleTheme()"
        style="background:none;border:1px solid var(--color-border,#e5e7eb);border-radius:var(--radius-md,.375rem);padding:var(--space-1,.25rem) var(--space-2,.5rem);cursor:pointer;font-size:var(--font-size-xs,.75rem);color:var(--color-text-secondary,#6b7280);">
        Dark mode
      </button>
    </div>
  </header>

  <main role="main" id="main-content">

    <!-- WIREFRAME-ANNOTATION: {any wireframe annotation for the main content area} -->
    <!-- State: default (visible) -->
    <div class="pde-state pde-state--default" aria-live="polite">
      {Primary hi-fi screen content -- evolved from wireframe using design tokens, real content, CSS-only interactions}
      {All interactive elements use CSS pseudo-classes: :hover, :focus-visible, :active, :checked}
      {No <script> tags, no onclick attributes except the theme toggle above}
      {Use var(--color-*), var(--space-*), var(--font-*), var(--radius-*), var(--shadow-*) throughout}
    </div>

    <!-- WIREFRAME-ANNOTATION: {any wireframe annotation for loading state} -->
    <!-- State: loading (hidden by default) -->
    <div class="pde-state pde-state--loading" hidden>
      {Skeleton screens using .skeleton class for shimmer animation}
      {Match layout structure of default state exactly}
      {Pure CSS animation -- no JavaScript}
    </div>

    <!-- WIREFRAME-ANNOTATION: {any wireframe annotation for error state} -->
    <!-- State: error (hidden by default) -->
    <div class="pde-state pde-state--error" hidden>
      <div role="alert" class="error-banner">
        <span aria-hidden="true" style="font-size:1.25rem;">!</span>
        <div>
          <strong>{Specific error message from product context}</strong>
          <p style="margin-top: var(--space-1, 0.25rem); font-size: var(--font-size-sm, 0.875rem);">{Recovery instruction}</p>
        </div>
      </div>
      <button type="button" class="btn-secondary" style="margin-top: var(--space-3, 0.75rem);">Retry {action}</button>
    </div>

    <!-- State: empty (hidden by default) -->
    <div class="pde-state pde-state--empty" hidden>
      <div style="text-align:center;padding:var(--space-12,3rem) var(--space-4,1rem);color:var(--color-text-secondary,#6b7280);">
        <p style="font-size:var(--font-size-lg,1.125rem);font-weight:var(--font-weight-medium,500);color:var(--color-text-primary,#1f2937);margin-bottom:var(--space-2,.5rem);">No {resource} yet</p>
        <p style="margin-bottom:var(--space-4,1rem);">{Motivating empty state message}</p>
        <a href="#" class="btn-primary">Create your first {resource}</a>
      </div>
    </div>

  </main>

  <footer role="contentinfo" class="pde-footer" style="border-top:1px solid var(--color-border,#e5e7eb);padding:var(--space-4,1rem) var(--space-6,1.5rem);margin-top:auto;color:var(--color-text-secondary,#6b7280);font-size:var(--font-size-xs,.75rem);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-2,.5rem);">
    <span>&copy; {year} {PRODUCT_NAME}. All rights reserved.</span>
    <nav aria-label="Footer navigation" style="display:flex;gap:var(--space-4,1rem);">
      <a href="#" style="color:var(--color-text-secondary,#6b7280);text-decoration:none;">Privacy</a>
      <a href="#" style="color:var(--color-text-secondary,#6b7280);text-decoration:none;">Terms</a>
      <a href="#" style="color:var(--color-text-secondary,#6b7280);text-decoration:none;">Help</a>
    </nav>
  </footer>

  <script>
    /* Theme toggle -- user-controlled only. No other JavaScript permitted in mockup output. */
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
      const btn = document.querySelector('[aria-label="Toggle dark mode"]');
      if (btn) btn.setAttribute('aria-pressed', current !== 'dark' ? 'true' : 'false');
    }
  </script>
</body>
</html>
```

**Key generation rules (MANDATORY):**

1. **ONLY external dependency:** `../../assets/tokens.css` -- same relative path as wireframes. NEVER link to other external CSS files.
2. **ALL custom CSS in `<style>` block** -- no external CSS bundle. mockup.css does NOT exist. Self-contained per MOCK-01.
3. **NO `<script>` tags except the theme toggle** -- no JavaScript event listeners, no onclick attributes on content elements, no fetch calls. Interactive states are CSS-only per MOCK-02.
4. **CSS-only interaction states:** Use `:hover`, `:focus-visible`, `:active`, `:checked`, `:disabled`, `[open]` for details/summary, `:invalid`, `:valid` -- never simulate with classes toggled by JavaScript.
5. **Body class:** `pde-layout--hifi` (distinguishes from wireframe's `pde-layout--{fidelity}`)
6. **First comment in `<head>`:** `<!-- WIREFRAME-SOURCE: {wireframe-filename} | Generated: {date} -->` (omit if no source wireframe)
7. **Every wireframe `<!-- WIREFRAME-ANNOTATION: ... -->` preserved** at corresponding location in mockup HTML
8. **Design tokens:** Use `var(--color-*)`, `var(--space-*)`, `var(--font-*)`, `var(--radius-*)`, `var(--shadow-*)` throughout. Include fallback values for all vars.
9. **Responsive:** CSS Grid/Flexbox, media queries for 640px/768px/1024px/1280px breakpoints
10. **Accessibility:** All interactive elements have `:focus-visible` styles, semantic HTML, proper ARIA roles. `role="banner"` on header, `role="main"` on main, `role="contentinfo"` on footer. Skip link as first body child.
11. **Near-real content:** Use actual PRODUCT_NAME, actual feature names, real product messaging from brief. NOT lorem ipsum.
12. **All 4 state variants:** default (visible) + loading (hidden) + error (hidden) + empty (hidden). No exceptions.
13. **Dark mode:** `[data-theme="dark"]` token overrides in CSS. `@media (prefers-color-scheme: dark)` respects OS setting.

#### 4c. Write each screen HTML file

Use the Write tool to write the generated HTML to `.planning/design/ux/mockups/mockup-{screen-slug}.html`.

Display per screen: `  -> Created: .planning/design/ux/mockups/mockup-{screen-slug}.html`

#### 4d. Generate navigation index.html

After all screen mockups are written, generate `.planning/design/ux/mockups/index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{PRODUCT_NAME} -- Mockup Index</title>
  <link rel="stylesheet" href="../../assets/tokens.css">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; background: var(--color-bg-default, #f9fafb); color: var(--color-text-primary, #1f2937); }
    h1 { border-bottom: 2px solid var(--color-border, #e5e7eb); padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
    .meta { color: var(--color-text-secondary, #6b7280); margin-bottom: 2rem; font-size: 0.875rem; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.75rem 0; border-bottom: 1px solid var(--color-surface-alt, #f3f4f6); }
    a { color: var(--color-action, #2563eb); text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    a:focus-visible { outline: 2px solid var(--color-focus-ring, #2563eb); outline-offset: 2px; border-radius: 0.125rem; }
    .badge { font-size: 0.75rem; color: var(--color-text-secondary, #6b7280); margin-left: 0.5rem; }
    .fidelity-tag { display: inline-block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: var(--color-action-subtle, #eff6ff); border: 1px solid var(--color-action, #2563eb); border-radius: 0.25rem; padding: 0.1rem 0.4rem; margin-left: 0.4rem; color: var(--color-action, #2563eb); }
  </style>
</head>
<body>
  <h1>{PRODUCT_NAME} -- Hi-Fi Mockups</h1>
  <p class="meta">Fidelity: <strong>hi-fi</strong> | Generated: {YYYY-MM-DD} | Version: v{N} | Screens: {count}</p>
  <ul>
    {For each screen generated:}
    {<li><a href="mockup-{slug}.html">{Screen Label}</a> <span class="fidelity-tag">hi-fi</span> <span class="badge">Wireframe source: {wireframe-filename or "generated from context"}</span></li>}
  </ul>
</body>
</html>
```

Use the Write tool to write the index.html file.

Display: `Step 4/7: Generated {N} mockup screen(s) + index.html.`

---

### Step 5/7: Write mockup specification artifact

Write the mockup specification to `.planning/design/ux/mockups/MCK-mockup-spec-v{N}.md`.

Use the structure from templates/mockup-spec.md as a base but adapt the Dependencies section to remove references to mockup.js and mockup.css (these do not exist -- mockup HTML is self-contained). The Dependencies section MUST only reference:

| Dependency | Type | Path |
|------------|------|------|
| Source Wireframes | recommended | .planning/design/ux/wireframes/ |
| Design Tokens | recommended | .planning/design/assets/tokens.css |
| Brand Assets | optional | .planning/design/assets/brand/ |

**YAML Frontmatter:**
```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:mockup (MCK)
Version: v{N}
Status: draft
Enhanced By: "{Playwright MCP | none}"
---
```

**Spec content includes:**
- Screens generated (list with source wireframe references)
- Token categories applied (color, typography, spacing, radius, shadow)
- Interaction states implemented (:hover, :focus-visible, :active, :checked, :disabled)
- Wireframe annotations preserved (count and screen-level list)
- Accessibility features (focus management, ARIA landmarks, skip links, dark mode)
- Responsive breakpoints (640px, 768px, 1024px, 1280px)

Use the Write tool to create the file.

Display: `Step 5/7: Mockup specification written to MCK-mockup-spec-v{N}.md`

---

### Step 6/7: Update ux domain DESIGN-STATE

Use the Glob tool to check for `.planning/design/ux/DESIGN-STATE.md`.

**If it does NOT exist:** Create it with this structure:

```markdown
# UX Domain Design State

Updated: {YYYY-MM-DD}
Domain: ux

## Artifact Index

| Code | Name | Skill | Status | Version | Enhanced By | Notes | Updated |
|------|------|-------|--------|---------|-------------|-------|---------|
| MCK | Hi-Fi Mockup | /pde:mockup | draft | v{N} | {Playwright MCP or none} | {count} screens | {YYYY-MM-DD} |
```

**If it already exists:** Use the Read tool to read it, then use the Edit tool to:
- Add a MCK row if no MCK row exists, or update the existing MCK row in place
- MCK row format:
  ```
  | MCK | Hi-Fi Mockup | /pde:mockup | draft | v{N} | {Playwright MCP or none} | {count} screens | {YYYY-MM-DD} |
  ```

Use the Write or Edit tool as appropriate.

Display: `Step 6/7: UX DESIGN-STATE updated with MCK artifact entry.`

---

### Step 7/7: Update root DESIGN-STATE and manifest

#### 7a. Acquire write lock

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-mockup)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 2 seconds, retry once:
  ```bash
  sleep 2
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-mockup)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false`:
  ```
  Error: Could not acquire write lock for root DESIGN-STATE.md.
    Another process may be writing to the design state.
    Wait a moment and retry /pde:mockup.
  ```
  Release lock and halt.

#### 7b. Update root DESIGN-STATE.md

Read `.planning/design/DESIGN-STATE.md` using the Read tool, then apply updates using the Edit tool:

1. **Cross-Domain Dependency Map** -- add MCK row if not already present:
   ```
   | MCK | ux | WFR (soft), SYS (soft) | current |
   ```

2. **Decision Log** -- append entry:
   ```
   | MCK | hi-fi mockup complete, {N} screens, v{N} | {YYYY-MM-DD} |
   ```

3. **Iteration History** -- append entry:
   ```
   | MCK-mockup-spec-v{N} | v{N} | Created by /pde:mockup | {YYYY-MM-DD} |
   ```

#### 7c. ALWAYS release write lock, even if an error occurred

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

#### 7d. Manifest registration (7-call pattern for MCK)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MCK code MCK
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MCK name "Hi-Fi Mockup"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MCK type mockup
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MCK domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MCK path ".planning/design/ux/mockups/mockup-{screen}.html"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MCK status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MCK version {N}
```

#### 7e. Coverage flag (read-before-set -- CRITICAL)

First, read all 13 current coverage flags to avoid overwriting others:

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON result. Extract all 13 flags. Default any absent flag to `false`:
- `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`

Then write the FULL 13-field JSON, setting `hasMockup` to `true` and passing all other flags through unchanged:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":true,"hasHigAudit":{current},"hasRecommendations":{current}}'
```

**IMPORTANT:** Replace each `{current}` placeholder with the actual boolean value read from coverage-check. NEVER use dot-notation for this field. ALWAYS write all 13 fields. Canonical field order: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations.

#### 7f. Optional Playwright validation

If PLAYWRIGHT_AVAILABLE is true AND `--no-playwright` is not set:

Attempt to open `index.html` in headless browser. Take screenshots at:
- Mobile: 375px width
- Tablet: 768px width
- Desktop: 1440px width

Check for broken layouts, missing token references, content overflow. Report findings inline.

Tag: `[Validated by Playwright MCP]`

If Playwright unavailable:
Tag: `[Not validated -- install Playwright MCP for automated browser testing]`

#### 7g. Display final summary table

```
## Summary

| Property | Value |
|----------|-------|
| Files created | .planning/design/ux/mockups/mockup-{screen}.html ({count} screens), .planning/design/ux/mockups/index.html, .planning/design/ux/mockups/MCK-mockup-spec-v{N}.md |
| Files modified | .planning/design/ux/DESIGN-STATE.md, .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:critique |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {Playwright MCP | none} |
```

Display: `Step 7/7: Root DESIGN-STATE and manifest updated. hasMockup: true.`

---

## Anti-Patterns (Guard Against)

- **Never use `<script>` tags or JavaScript in mockup output** except the single theme toggle function. MOCK-02 requires all interactive states to be CSS-only. JavaScript event listeners, onclick attributes on content elements, fetch calls, and DOM manipulation are all prohibited.
- **Never reference mockup.js or mockup.css** in any link or script tag. These files do not exist. All styles are inline `<style>` block per MOCK-01.
- **Never skip wireframe annotation preservation.** Every `<!-- WIREFRAME-ANNOTATION: ... -->` comment from the source wireframe MUST appear in the mockup HTML at the corresponding location. MOCK-03 traceability depends on this.
- **Never omit WIREFRAME-SOURCE comment in `<head>`.** This comment establishes the version link between wireframe and mockup. Format: `<!-- WIREFRAME-SOURCE: wireframe-{screen}-v{N}.html | Generated: {date} -->`. Omit only if no source wireframe exists.
- **Never skip coverage-check before writing designCoverage.** Always read existing flags and pass all 13 through. Writing only `{"hasMockup":true}` will erase the other 12 flags.
- **Never use dot-notation with `manifest-set-top-level`** (e.g., `manifest-set-top-level designCoverage.hasMockup true` is WRONG). Always pass the full JSON object.
- **Never hard-fail when wireframes are absent.** Wireframes are a soft dependency. Emit the warning and continue generating from brief/flows context.
- **Never write to root DESIGN-STATE.md without first acquiring the write lock** via `pde-tools.cjs design lock-acquire pde-mockup`. Writing without the lock risks concurrent write corruption.
- **Always release the write lock** (Step 7 lock-release) even if an error occurs during root DESIGN-STATE.md updates.
- **Never omit the navigation index.html.** Even for single-screen mockup runs, always write index.html.
- **Never omit the empty state variant.** All four state variants (default, loading, error, empty) are required in hi-fi mockups.

</process>

<output>
- `.planning/design/ux/mockups/mockup-{screen-slug}.html` -- one self-contained HTML/CSS file per screen; opens in browser via file:// with no server required; only external dependency is ../../assets/tokens.css
- `.planning/design/ux/mockups/index.html` -- navigation index linking all generated screen mockups
- `.planning/design/ux/mockups/MCK-mockup-spec-v{N}.md` -- mockup specification artifact documenting screens, token usage, interactions, and annotation traceability
- `.planning/design/ux/DESIGN-STATE.md` -- ux domain state updated with MCK artifact entry (created if absent)
- `.planning/design/DESIGN-STATE.md` -- root state updated (Cross-Domain Dependency Map, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` -- manifest updated with MCK artifact entry and hasMockup: true in designCoverage
</output>
