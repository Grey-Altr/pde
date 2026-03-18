<purpose>
Synthesize all upstream design pipeline artifacts (brief, flows, screen inventory, wireframes with annotations, design system tokens, critique reports, iteration changelogs) into two implementation-ready outputs: a versioned HND-handoff-spec-v{N}.md document and a HND-types-v{N}.ts TypeScript interface declarations file. Reads STACK.md as a hard dependency for framework and TypeScript alignment. Checks annotation completeness before TypeScript interface generation. Registered in the design manifest under artifact code HND with hasHandoff coverage flag set via read-before-set pattern preserving all 7 designCoverage fields.
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/motion-design.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Runs Steps 1-3 only, shows planned output files, artifact discovery summary, version numbers. No files written. |
| `--quick` | Boolean | Skip MCP enhancements (Sequential Thinking). Apply minimal annotation reasoning. |
| `--verbose` | Boolean | Show detailed progress, timing per step, artifact loading details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP only. |
| `--force` | Boolean | Skip prerequisite warnings about missing upstream artifacts — proceed with whatever is available. |
</flags>

<process>

## /pde:handoff — Design-to-Code Handoff Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--quick`, `--verbose`, `--no-mcp`, `--no-sequential-thinking`, `--force`.

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
  Check that .planning/ exists and is writable, then re-run /pde:handoff.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and discover artifacts

This step has eleven sub-sections executed in order.

#### 2a. Read STACK.md (hard dependency)

Use the Read tool to read `.planning/research/STACK.md`.

If the file does not exist (Read returns an error or empty result): HALT with this exact error message:

```
Error: No STACK.md found at .planning/research/STACK.md.
  /pde:handoff requires STACK.md to align component APIs to your project's technology.
  Create .planning/research/STACK.md documenting your tech stack:
    - Framework: React | Vue | Svelte | none
    - TypeScript: true | false
    - Component import path pattern (e.g., src/components/{ComponentName}.tsx)
  Then re-run /pde:handoff.
```

If the file exists: store content as STACK_CONTENT. Extract the following with semantic reasoning (not mechanical string matching):

**Framework detection:** Search for table rows matching `| React |`, `| Vue |`, `| Svelte |` patterns OR explicit "Use X" directives. Apply semantic reasoning — a sentence like "Unlike React, this project uses Vue 3" should detect Vue, not React; "project is built on Svelte" detects Svelte. Set FRAMEWORK to one of: "React", "Vue", "Svelte", or "none". Default to "none" if ambiguous.

**TypeScript detection:** Look for `TypeScript: true`, `.tsx` file extension references, `"TypeScript"` column entries in tables, or `lang="ts"` patterns. Set TYPESCRIPT = true if detected, false otherwise.

**Import path detection:** Look for patterns like `src/components/{ComponentName}.tsx`, `@/components/`, `~/components/` or similar path conventions. Store as COMPONENT_IMPORT_PATTERN (or empty string if not found).

Display: `Step 2/7 (2a): STACK.md loaded. Framework: {FRAMEWORK}. TypeScript: {TYPESCRIPT}.`

#### 2b. Check coverage flags (soft — Glob fallback)

```bash
COV_RAW=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV_RAW" == @file:* ]]; then COV_RAW=$(cat "${COV_RAW#@file:}"); fi
```

Parse JSON from COV_RAW. Store all current flag values: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`. If coverage-check fails or returns invalid JSON, default all to `false` and continue.

#### 2c. Find design brief (soft dependency)

Use the Glob tool to find all files matching `.planning/design/strategy/BRF-brief-v*.md`. Sort by version number (parse the integer after "v" in the filename) descending. If found: store the path of the highest version as BRIEF_PATH and store a flag `BRIEF_AVAILABLE = true`. If absent: set `BRIEF_AVAILABLE = false`, emit warning unless `--force`:

```
Warning: No design brief found at .planning/design/strategy/BRF-brief-v*.md.
  Brief context improves handoff quality. Run /pde:brief first for richer output.
  (Continuing without brief...)
```

If BRIEF_AVAILABLE: use the Read tool to load BRIEF_PATH into BRIEF_CONTENT. Extract `productType` field: look for `Product Type:`, `productType:`, or table rows mentioning "software", "hardware", or "hybrid". Set PRODUCT_TYPE to "software", "hardware", or "hybrid". Default to "software" if not found.

#### 2d. Find user flows (soft dependency)

Use the Glob tool to find all files matching `.planning/design/ux/FLW-flows-v*.md`. Sort by version number descending. If found: store highest version path as FLOWS_PATH, set `FLOWS_AVAILABLE = true`. If absent: set `FLOWS_AVAILABLE = false`, emit warning unless `--force`:

```
Warning: No flows document found at .planning/design/ux/FLW-flows-v*.md.
  Route structure and screen context will be inferred from wireframes only.
  Run /pde:flows first for richer handoff output. (Continuing without flows...)
```

#### 2e. Find screen inventory (soft dependency)

Use the Glob tool to check for `.planning/design/ux/FLW-screen-inventory.json`. If found: store path as INVENTORY_PATH, set `INVENTORY_AVAILABLE = true`. If absent: set `INVENTORY_AVAILABLE = false`.

#### 2f. Find wireframes (primary input)

Use the Glob tool to find all `.html` files under `.planning/design/ux/wireframes/`, excluding `index.html`.

For version selection across wireframe variants: for each unique screen slug, collect all matching files (both `WFR-{screen}.html` and `WFR-{screen}-v*.html`). For each slug, prefer the highest versioned file (`WFR-{screen}-v{N}.html` with maximum N) over the original unversioned file (`WFR-{screen}.html`). Store the selected file per screen in WIREFRAME_FILES map (slug → path).

If no wireframes are found at all: emit warning and set `WIREFRAMES_AVAILABLE = false`.

#### 2g. Find design system tokens (soft dependency)

Use the Glob tool to check for `.planning/design/assets/tokens.css`. If found: set `TOKENS_AVAILABLE = true`, store path as TOKENS_PATH. If absent: set `TOKENS_AVAILABLE = false`.

#### 2h. Find critique report (soft dependency)

Use the Glob tool to find all files matching `.planning/design/review/CRT-critique-v*.md`. Sort by version number descending. If found: store highest version path as CRITIQUE_PATH, set `CRITIQUE_AVAILABLE = true`. If absent: set `CRITIQUE_AVAILABLE = false`.

#### 2i. Find iteration changelogs (soft dependency)

Use the Glob tool to find all files matching `.planning/design/review/ITR-changelog-v*.md`. Sort by version number descending. If found: store all paths as CHANGELOG_PATHS (ordered highest to lowest), set `CHANGELOGS_AVAILABLE = true`. If absent: set `CHANGELOGS_AVAILABLE = false`.

#### 2j. Annotation completeness check

For each wireframe file in WIREFRAME_FILES:

Use the Read tool to load the wireframe HTML content. Count two values:
1. STATE_DIV_COUNT: number of `<div class="pde-state--` occurrences (or `pde-state--` as a class prefix anywhere in the file)
2. ANNOTATION_COUNT: number of `<!-- ANNOTATION:` occurrences in the file

If STATE_DIV_COUNT > 0 and ANNOTATION_COUNT / STATE_DIV_COUNT < 0.5 (less than 50% coverage):

```
Warning: Low annotation coverage in {wireframe_filename} ({ANNOTATION_COUNT} annotations / {STATE_DIV_COUNT} state divs = {percentage}%).
  TypeScript interface quality may be degraded — interfaces will be inferred from wireframe structure rather than explicit annotations.
  Re-run /pde:wireframe to regenerate wireframes with full annotations for better TypeScript output.
```

Set `LOW_ANNOTATION_COVERAGE = true` if any wireframe has annotation coverage below 50%.

#### 2k. Version gate

Use the Glob tool to find all files matching `.planning/design/handoff/HND-handoff-spec-v*.md`. Parse the `v{N}` suffix from each filename (extract the integer after "v"). Find the maximum N among all matches.

- If no handoff spec files exist: set `HND_VERSION = 1`
- If files exist: set `HND_VERSION = max(N) + 1`

Also confirm no types file conflicts: Glob for `.planning/design/handoff/HND-types-v*.ts`. The types version mirrors the spec version (always same N).

Display: `Step 2/7: Prerequisites checked. Handoff spec v{HND_VERSION} will be generated.`

#### Hard stop check

If NONE of the following are available: BRIEF_AVAILABLE, FLOWS_AVAILABLE, WIREFRAMES_AVAILABLE (zero wireframes found), TOKENS_AVAILABLE:

```
Error: No design artifacts found.
  /pde:handoff requires at least one upstream design artifact to synthesize.
  Run the following skills before handoff:
    1. /pde:brief    -- defines product intent and personas
    2. /pde:flows    -- maps user journeys and screen inventory
    3. /pde:wireframe -- generates screen wireframes
  Then re-run /pde:handoff.
```

HALT. Do not proceed to Step 3.

If `--dry-run` flag is active after completing checks:

```
Dry run mode. No files will be written.

Planned output:
  Handoff spec: .planning/design/handoff/HND-handoff-spec-v{HND_VERSION}.md
  TypeScript interfaces: .planning/design/handoff/HND-types-v{HND_VERSION}.ts
  Version: v{HND_VERSION}
  Product type: {PRODUCT_TYPE}
  Framework: {FRAMEWORK}, TypeScript: {TYPESCRIPT}

Artifact discovery:
  Brief: {BRIEF_PATH or "not found"}
  Flows: {FLOWS_PATH or "not found"}
  Screen inventory: {INVENTORY_PATH or "not found"}
  Wireframes: {count} screen(s) found
  Tokens: {TOKENS_PATH or "not found"}
  Critique: {CRITIQUE_PATH or "not found"}
  Changelogs: {count of CHANGELOG_PATHS} found

Annotation coverage: {LOW_ANNOTATION_COVERAGE ? "LOW — TypeScript quality may be degraded" : "adequate"}
```

HALT. Do not proceed to Step 3.

---

### Step 3/7: Probe MCP availability

**Check flags first:**

```
IF --no-mcp in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP all MCP probes
  continue to Step 4

IF --quick in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP all MCP probes
  continue to Step 4

IF --no-sequential-thinking in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP Sequential Thinking probe
  continue to Step 4
```

#### 3a. Sequential Thinking MCP probe (if not skipped by flags above)

Attempt to call `mcp__sequential-thinking__think` with a simple test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds with reasoning: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Log: `  -> Sequential Thinking MCP: available`
- If tool not found or errors: retry once (same 30s timeout)
  - If retry succeeds: `SEQUENTIAL_THINKING_AVAILABLE = true`
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (continuing without)`

Display: `Step 3/7: MCP probes complete. Sequential Thinking: {yes|no}.`

---

### Step 4/7: Synthesize artifacts into spec content

This step reads all discovered artifacts and synthesizes them into structured content for writing. Work through each sub-section in order.

#### 4a. Load all discovered artifacts into memory

Use the Read tool to load each discovered artifact into memory:

- If BRIEF_AVAILABLE: Read BRIEF_PATH → store as BRIEF_CONTENT (if not already loaded in Step 2c)
- If FLOWS_AVAILABLE: Read FLOWS_PATH → store as FLOWS_CONTENT
- If INVENTORY_AVAILABLE: Read INVENTORY_PATH → store as INVENTORY_CONTENT (JSON)
- If TOKENS_AVAILABLE: Read TOKENS_PATH → store as TOKENS_CONTENT
- If CRITIQUE_AVAILABLE: Read CRITIQUE_PATH → store as CRITIQUE_CONTENT
- If CHANGELOGS_AVAILABLE: Read all CHANGELOG_PATHS → store as CHANGELOG_CONTENTS array (newest first)
- For each wireframe in WIREFRAME_FILES: Read each path if not already read in Step 2j → store by slug in WIREFRAME_CONTENTS map

Display: `Step 4/7 (4a): Loaded {count} artifacts into memory.`

#### 4b. Extract annotations from wireframes

For each wireframe slug in WIREFRAME_FILES:

From the WIREFRAME_CONTENTS[slug] HTML:

1. Find all `<!-- ANNOTATION: ... -->` blocks. These appear above `<div class="pde-state--*">` elements. Extract the full annotation text for each.

2. Find annotations on interactive elements: look for `<!-- ANNOTATION:` comments near `<button`, `<input`, `<select`, `<textarea`, `<a`, `<form` tags.

3. For each annotation, extract:
   - Component name hint (from surrounding `id`, `class`, or annotation text)
   - State description (default, loading, error, success, empty, etc.)
   - Props implied (e.g., "disabled: boolean", "isLoading: boolean", "error?: string")
   - Events implied (e.g., "onClick", "onSubmit", "onChange")
   - Payload shapes (from annotation text describing data passed)

4. Apply semantic reasoning (not mechanical regex) to map annotation text to TypeScript interface shapes. For example: "Shows spinner when data is loading" implies `isLoading: boolean`. "Displays error message from API" implies `error?: string`. "Fires callback with form values on submit" implies an event handler like `onSubmit?: (data: FormData) => void`.

Store per-screen annotation data as SCREEN_ANNOTATIONS[slug].

#### 4c. Parse screen inventory for route mappings

If INVENTORY_AVAILABLE: parse INVENTORY_CONTENT JSON. Extract for each screen:
- Route path (e.g., `/login`, `/dashboard/:id`)
- Screen name
- Journey step context
- Component context (if listed)

Store as ROUTE_MAP (route → screen name, components, references).

If not available: derive routes from wireframe slugs using kebab-case to path conversion (e.g., `login` → `/login`, `user-profile` → `/user-profile`).

#### 4d. Parse design system tokens

If TOKENS_AVAILABLE: parse TOKENS_CONTENT (CSS custom properties). Group tokens by category:
- Color tokens: `--color-*`
- Typography tokens: `--font-*`, `--text-*`
- Spacing tokens: `--space-*`, `--gap-*`, `--padding-*`
- Shadow tokens: `--shadow-*`
- Border/radius tokens: `--radius-*`, `--border-*`
- Motion tokens: `--duration-*`, `--ease-*`, `--transition-*`

Build GLOBAL_TOKEN_MAPPINGS table (token name, CSS property usage, value, usage context).

If not available: note "Design system tokens not available — token references will use placeholder names" in the spec.

#### 4e. Parse critique and changelog findings

If CRITIQUE_AVAILABLE: from CRITIQUE_CONTENT, extract:
- Summary scorecard (composite score, grade, maturity)
- "What Works" table entries (elements confirmed correct — these are implementation MUST-KEEP requirements)
- Open findings from Action List (unresolved issues to note as Completeness Warnings)

If CHANGELOGS_AVAILABLE: from the most recent changelog (CHANGELOG_CONTENTS[0]), extract:
- Applied changes (confirmed fixes to include in spec)
- Deferred findings (known issues to flag in Gap Analysis)

#### 4f. MCP-enhanced reasoning for sparse annotations

If SEQUENTIAL_THINKING_AVAILABLE AND LOW_ANNOTATION_COVERAGE is true:

For each screen with annotation coverage below 50%, use `mcp__sequential-thinking__think` with prompt:

```
"I am analyzing a wireframe for screen '{screen-slug}' in a {FRAMEWORK} application. The wireframe has limited annotation comments. Based on the wireframe HTML structure, reason through what TypeScript component interfaces would be appropriate. Consider: (1) interactive elements visible in the HTML (buttons, inputs, forms, links), (2) state variants present (loading, error, empty states), (3) data displayed (lists, tables, cards), (4) the screen's role in the user journey based on its slug name. Produce a list of component interface shapes with Props and events."
```

Merge the MCP reasoning output with any existing annotations for that screen.

#### 4g. Derive per-screen component specs

For each screen in WIREFRAME_FILES:

Using WIREFRAME_CONTENTS[slug], SCREEN_ANNOTATIONS[slug], ROUTE_MAP, and MCP reasoning if applicable, derive:

1. **Component list:** Name all UI components on the screen. Naming convention: PascalCase matching the screen context (e.g., LoginForm, DashboardHeader, UserCard).

2. **TypeScript Props interface:** For each component, compose interface fields with JSDoc comments:
   - Required props from annotation data (no `?`)
   - Optional props from annotation hints (with `?`)
   - Event handlers (`onEvent?: (payload: Type) => void`)
   - Children/slot typings if applicable

3. **Breakpoint spec:** Based on wireframe layout (columns, sidebars, navigation patterns), specify what transforms at: desktop (≥1024px), tablet (768-1023px), mobile (<768px). Note elements that stack, hide, collapse, or change to drawer patterns.

4. **Interaction spec:** For each interactive element (buttons, inputs, forms, modals, dropdowns), specify all states: Default, Hover, Focus, Active, Disabled, Loading, Error. Include transitions with duration and easing.

5. **Token mappings:** Map each element's visual properties to the appropriate token from GLOBAL_TOKEN_MAPPINGS.

6. **Accessibility requirements:** Specify ARIA roles, labels, keyboard shortcuts, focus order, screen reader announcements, and live regions.

7. **Test specs:** Identify key test scenarios (initial state, interaction, error state, loading state, success state).

#### Motion specification fields in TypeScript interfaces (HAND-01)

For each component in the per-screen spec: check whether the upstream mockup defined motion behavior for this component. A component has upstream motion if either:
- The `### Motion Specs` table for its screen has an entry for this component, OR
- A `<!-- VISUAL-HOOK: -->` comment in the upstream mockup references this component.

**If upstream motion exists:** Add the following motion spec block to the `export interface {Component}Props` declaration, separated by a `// --- Motion specification (from mockup motion annotations) ---` comment:

```typescript
// --- Motion specification (from mockup motion annotations) ---
/**
 * Entrance animation trigger for this component.
 * 'on-load' = plays on DOMContentLoaded (above-fold components)
 * 'on-scroll' = plays when component enters viewport
 * 'on-interaction' = plays on user action (hover, click)
 * @default 'on-load'
 */
motionTrigger?: 'on-load' | 'on-scroll' | 'on-interaction';

/**
 * Entrance animation duration in milliseconds.
 * Corresponds to design token: --duration-slow (500ms) or --duration-dramatic (800ms)
 * Reference: @references/motion-design.md — Duration Scale section
 * @default 700
 */
motionDuration?: number;

/**
 * CSS easing function name (maps to design token).
 * 'ease-enter' = cubic-bezier(0, 0, 0.2, 1) — recommended for entrances
 * 'spring' = cubic-bezier(0.34, 1.56, 0.64, 1) — for spring overshoot
 * @default 'ease-enter'
 */
motionEasing?: 'ease-standard' | 'ease-enter' | 'ease-exit' | 'spring';

/**
 * When true, skips all motion for users with prefers-reduced-motion.
 * Required for WCAG 2.2.2 compliance (Level A).
 * @default true
 */
respectReducedMotion?: boolean;
```

**If no upstream motion exists (static/data-display component):** Do NOT add motion fields. Instead, add a single comment at the end of the interface:
```typescript
// No motion annotations found in upstream mockup for this component.
```

**Critical rule:** Never invent motion props for components that have no upstream motion definition (e.g., a DataTable, NavigationLink, or TextBlock). Motion fields are only generated where mockup motion was explicitly defined.

Store per-screen derived specs as SCREEN_SPECS[slug].

#### 4h. Build global sections

**Design Coverage Summary:** Build a table listing each artifact type (Brief, Flows, Design System, Wireframes, HIG Audit, Hardware Spec) with availability, version, and status. Include Staleness Warnings for artifacts not recently updated. Include Completeness Warnings from critique Action List (unresolved findings) and any screens from brief/flows not covered by wireframes.

**Route Structure:** Build the route table from ROUTE_MAP with component lists per route, wireframe references (WFR-{slug}), and flow references (FLW-xxx).

**Shared Component APIs:** Identify components used across multiple screens. These are components appearing in SCREEN_SPECS for 2+ screens. Write their TypeScript interfaces here as the canonical definition; per-screen sections reference them.

**Accessibility Overview:** Compile the Global Requirements table (skip links, focus management, ARIA landmarks, color contrast, keyboard navigation, reduced motion). Add findings from critique accessibility perspective if CRITIQUE_AVAILABLE.

**Gap Analysis:** Compile missing backend endpoints (from flows, interactions, and annotations), state management needs (global, page, component scope), and API requirements (auth, real-time, file upload). Pull in deferred findings from CHANGELOG_CONTENTS as additional gap items.

**Test Specs Overview:** Compile end-to-end scenarios from the flows document (each user journey flow = one E2E scenario).

#### 4i. Apply productType conditional for hardware sections

Based on PRODUCT_TYPE:
- "software": include software component API sections, omit Hardware Handoff sections
- "hardware": omit software component API sections (replace with Note: "Software component APIs not applicable for hardware product"), include Hardware Handoff sections
- "hybrid": include both software and hardware sections
- If PRODUCT_TYPE unavailable (default "software"): include software sections only

---

### Step 5/7: Write output files with lock

#### 5a. Acquire write-lock

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-handoff)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 5 seconds, retry up to 3 times. If still false after 3 retries: warn and continue (do not halt):

```
Warning: Could not acquire write lock. Proceeding without lock.
  If concurrent writes occur, re-run /pde:handoff to repair state.
```

#### 5b. Write HND-handoff-spec-v{HND_VERSION}.md

Use the Write tool to write `.planning/design/handoff/HND-handoff-spec-v{HND_VERSION}.md`.

Follow `templates/handoff-spec.md` as the structural scaffold. All sections must be populated with synthesized content from Step 4. Do not leave template placeholder text in the output — replace all `{placeholder}` values with real content or "N/A" with explanation.

Document structure (following templates/handoff-spec.md order):

**Frontmatter:**
```yaml
---
Generated: "{YYYY-MM-DD}"
Skill: /pde:handoff (HND)
Version: v{HND_VERSION}
Status: draft
Product Type: "{PRODUCT_TYPE}"
Framework Detected: "{FRAMEWORK}"
Enhanced By: "{Sequential Thinking MCP or none}"
---
```

**Sections in order:**

1. `# Design-to-Code Handoff: {project_name}` (derive project name from brief or .planning/ directory name)

2. `## Design Coverage Summary` — table from 4h with Staleness Warnings and Completeness Warnings subsections

3. `## Route Structure` — table from 4h with routes, screens, components, wireframe refs, flow refs

4. `## Global Token Mappings` — table from 4d grouped by token category

5. `## Shared Component APIs` — TypeScript interface blocks from 4h for each shared component, with Slots/Children and Tokens Used notes

6. `## Accessibility Overview` — Global Requirements table from 4h

7. `## Motion System` — Global Transitions table (derived from token motion values or defaults if no motion tokens found)

8. `## Gap Analysis` — Missing Backend Endpoints, State Management Needs, API Requirements from 4h

9. `## Test Specs Overview` — End-to-End Scenarios table from 4h

10. `# Per-Screen Detail Specs` — for each screen in WIREFRAME_FILES, a complete screen section:
    - `## Screen: {Screen Name}` with Wireframe Ref and Route
    - `### Component APIs` — TypeScript interface blocks for each screen-specific component
    - `### Breakpoint Specs` — table with desktop/tablet/mobile behaviors
    - `### Interaction Specs` — table with element/state/appearance/transition

#### Implementation Notes subsection (HAND-02)

After `### Interaction Specs`, check whether this screen has concept-specific interactions identified in the upstream mockup. A screen has concept-specific interactions if:
- Any `<!-- VISUAL-HOOK: {id} -->` comment was present in the upstream mockup for this screen, OR
- The critique or iterate phase identified a distinctive, named interaction pattern for this screen.

**If concept-specific interactions exist:** Add a `### Implementation Notes` subsection immediately after `### Interaction Specs`:

```markdown
### Implementation Notes

**Concept-specific interactions detected in upstream mockup:**

| Interaction | VISUAL-HOOK ID | Description | Recommended Approach | Library |
|-------------|----------------|-------------|---------------------|---------|
| {interaction-name} | {visual-hook-id} | {brief description from mockup annotation} | {recommended CSS/JS approach with @supports guard if required} | {CSS only / GSAP ScrollTrigger 3.14 / View Transitions API} |

**Implementation guidance:** {Prose note for any interaction requiring a fallback, browser support caveat, or non-obvious implementation detail. Always include browser support for View Transitions API: Chrome 111+, Firefox 126+, Safari 18+ — ~75-80% coverage. Wrap in document.startViewTransition() feature detect with CSS fallback.}
```

**Vocabulary for Recommended Approach column** (draw from @references/motion-design.md):
- Scroll-driven parallax → "CSS `animation-timeline: view()` inside `@supports (animation-timeline: scroll())` guard. Fallback: static layout for Firefox. Or GSAP ScrollTrigger 3.14 (100% coverage)."
- Spring button feedback → "CSS `transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)` — no library needed."
- Variable font animation → "CSS `font-weight` transition (variable font required — confirm `wght` axis available for the loaded font)."
- Shared element transition → "`document.startViewTransition()` — Chrome 111+, Firefox 126+, Safari 18+. Feature detect required."
- Page/route transition → "GSAP timeline with `autoAlpha` for FOUC prevention. Or View Transitions API with fallback."

**If no concept-specific interactions exist:** Omit the `### Implementation Notes` subsection entirely. Do not emit an empty subsection.

**Important:** Do NOT duplicate content from `### Interaction Specs`. Interaction Specs documents the 7 states (hover, focus, active, etc.). Implementation Notes is exclusively for concept-specific visual hooks requiring named libraries or non-trivial CSS techniques.

    - `### Motion Specs` — table with trigger/duration/easing/property
    - `### Token Mappings` — table with element/property/token/fallback
    - `### Accessibility Requirements` — table with ARIA requirements
    - `### Component Stubs` — React, Vue, and Svelte stub blocks (language-appropriate based on FRAMEWORK — include all three for "none", include the detected framework first for known frameworks)
    - `### Test Specs` — table with component/state/interaction/expected

11. If PRODUCT_TYPE is "hardware" or "hybrid":
    `# Hardware Handoff` — BOM Export, Dimension Drawings, Materials & Finish Spec, DFM Notes, Assembly Sequence, Compliance Checklist, Supplier List, Prototyping Guide sections (populate from brief or hardware spec if available, otherwise use placeholder structure with notes)
    If PRODUCT_TYPE is "hybrid", add `## Cross-References (Hybrid Products)` table.

12. Footer:
    ```
    *Generated by PDE-OS /pde:handoff | {date} | Product Type: {PRODUCT_TYPE} | Framework: {FRAMEWORK}*
    {If Sequential Thinking was used: "[Enhanced by Sequential Thinking MCP — interface reasoning for low-annotation screens]"}
    {If Sequential Thinking was unavailable: "[Baseline interface generation — install Sequential Thinking MCP for enhanced reasoning on sparse wireframes]"}
    ```

Display: `Step 5/7 (5b): HND-handoff-spec-v{HND_VERSION}.md written.`

#### 5c. Write HND-types-v{HND_VERSION}.ts

Use the Write tool to write `.planning/design/handoff/HND-types-v{HND_VERSION}.ts`.

**Content rules (CRITICAL — must follow exactly):**
- ONLY TypeScript `interface {Name} { ... }` and `type {Name} = { ... }` declarations
- NO `export default` statements
- NO `const`, `let`, `var` declarations
- NO JSX or React imports
- NO `import` statements of any kind
- Section headers as `// ─── Section Name ───` comments (using box-drawing characters)
- JSDoc comments above each interface (`/** description */`) and on each field (`/** field description */`)
- `export` keyword on each interface declaration (e.g., `export interface ButtonProps { ... }`)

**Structure:**

```typescript
// ─── Global Types ───────────────────────────────────────────────────────────

/** Shared utility types used across components */

export type ComponentSize = 'sm' | 'md' | 'lg';
export type ComponentVariant = 'primary' | 'secondary' | 'destructive';
// ... other global types derived from tokens and patterns

// ─── Shared Components ──────────────────────────────────────────────────────

/** Interface for each shared component identified in Step 4h */
export interface {SharedComponentName}Props {
  /** ... */
}

// ─── Screen: {Screen Name} ──────────────────────────────────────────────────

/** Interfaces for {Screen Name} screen components */
export interface {ComponentName}Props {
  /** ... */
}

// ... repeat for each screen
```

Populate interfaces with ALL field data derived in Step 4g SCREEN_SPECS. Include JSDoc for every field explaining its purpose and accepted values.

Display: `Step 5/7 (5c): HND-types-v{HND_VERSION}.ts written.`

#### 5d. Release write-lock

**ALWAYS release, even if an error occurred:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release pde-handoff
```

Display: `Step 5/7: Handoff spec and TypeScript interfaces written. Lock released.`

---

### Step 6/7: Update handoff domain DESIGN-STATE

Use the Glob tool to check for `.planning/design/handoff/DESIGN-STATE.md`.

**If it does NOT exist:** Create it using the `templates/design-state-domain.md` scaffold structure:

```markdown
Schema: 1.0
Domain: handoff

# Handoff DESIGN-STATE

Updated: {YYYY-MM-DD}

## Artifact Index

| Code | Name | Skill | Status | Version | Enhanced By | Dependencies | Updated |
|------|------|-------|--------|---------|-------------|--------------|---------|
| HND | Design Handoff | /pde:handoff | draft | v{HND_VERSION} | {Sequential Thinking MCP or none} | {comma-separated list of used artifact codes: BRF, FLW, WFR, SYS, CRT, ITR} | {YYYY-MM-DD} |

## Staleness Tracker

| Artifact | Depends On | Upstream Version | Current Link | Stale? |
|----------|------------|------------------|--------------|--------|

## Open Critique Items

| Item | Source | Severity | Status |
|------|--------|----------|--------|

## Domain Notes
Handoff v{HND_VERSION} synthesized {count} upstream artifacts ({list of codes used}).
Framework: {FRAMEWORK}. TypeScript: {TYPESCRIPT}.

---

*Generated by PDE-OS | {YYYY-MM-DD}*
```

**If it already exists:** Use the Read tool to read it, then use the Edit tool to add or update the HND artifact row in the Artifact Index table:

```
| HND | Design Handoff | /pde:handoff | draft | v{HND_VERSION} | {MCPs used or none} | {upstream codes} | {YYYY-MM-DD} |
```

If an HND row already exists, replace it. If no HND row exists, append it.

Display: `Step 6/7: handoff/DESIGN-STATE.md updated with HND artifact row.`

---

### Step 7/7: Update root DESIGN-STATE + manifest + coverage flag

This step has four sub-sections.

#### 7a. Update root DESIGN-STATE.md

Use the Read tool to read `.planning/design/DESIGN-STATE.md`. Then use the Edit tool to apply:

1. **Pipeline Progress table:** Mark Handoff as complete with the current date. Find the row for Handoff (or "handoff") in the Pipeline Progress table and update the status to `complete` and date to today.

2. **Decision Log table:** Append this row:
   ```
   | HND | handoff v{HND_VERSION} generated, {count} screens, framework: {FRAMEWORK} | {YYYY-MM-DD} |
   ```

3. **Iteration History table:** Append this row:
   ```
   | HND-handoff-spec-v{HND_VERSION}.md | v{HND_VERSION} | Created by /pde:handoff | {YYYY-MM-DD} |
   ```

   If the root DESIGN-STATE.md does not have an Iteration History table, add one after the Decision Log section:
   ```markdown
   ## Iteration History

   | File | Version | Created By | Date |
   |------|---------|-----------|------|
   | HND-handoff-spec-v{HND_VERSION}.md | v{HND_VERSION} | Created by /pde:handoff | {YYYY-MM-DD} |
   ```

#### 7b. Register HND artifact in manifest (7 calls)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND code HND
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND name "Design Handoff"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND type handoff
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND domain handoff
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND path ".planning/design/handoff/"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND status complete
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND version ${HND_VERSION}
```

#### 7c. Set coverage flag (CRITICAL — read-before-set to prevent clobber)

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON output from coverage-check. Extract ALL thirteen current flag values: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`. Default any absent field to `false`. Merge `hasHandoff: true` while preserving all other twelve values. Then write the full merged thirteen-field object:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":true,"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

Replace each `{current}` with the actual value read from coverage-check output (true or false).

#### 7d. Output summary table

```
## /pde:handoff Summary

| Property | Value |
|----------|-------|
| Handoff Spec | .planning/design/handoff/HND-handoff-spec-v{HND_VERSION}.md |
| TypeScript Interfaces | .planning/design/handoff/HND-types-v{HND_VERSION}.ts |
| Screens Documented | {count of screens in WIREFRAME_FILES} |
| Product Type | {PRODUCT_TYPE} |
| Framework | {FRAMEWORK} |
| TypeScript | {TYPESCRIPT} |
| Artifacts Synthesized | {comma-separated list of artifact codes used} |
| Annotation Coverage | {LOW_ANNOTATION_COVERAGE ? "low (interface quality may be degraded)" : "adequate"} |
| Enhanced By | {MCP list or "none"} |

Next steps:
  - Review handoff spec: open .planning/design/handoff/HND-handoff-spec-v{HND_VERSION}.md
  - Use TypeScript interfaces: .planning/design/handoff/HND-types-v{HND_VERSION}.ts
  - Run /pde:build to orchestrate the full pipeline summary
```

Display: `Step 7/7: Manifest updated. Coverage: hasHandoff = true. Done.`

---

## Anti-Patterns

NEVER do any of the following:

- **Proceed without STACK.md:** The hard dependency check in Step 2a is mandatory. Producing component stubs without framework knowledge creates unusable output that engineers cannot integrate.

- **Use mechanical string matching for framework detection:** A sentence like "Unlike React, this project uses Vue 3" must detect Vue. Scan for explicit positive assertions, not incidental mentions of framework names.

- **Skip coverage-check before setting designCoverage:** `manifest-set-top-level` replaces the ENTIRE designCoverage object. Reading coverage-check first and preserving all 13 fields (hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations) is mandatory to avoid clobbering flags set by other skills.

- **Include non-interface TypeScript in HND-types-v{N}.ts:** The types file must ONLY contain interface and type alias declarations. No exports default, no const, no imports, no JSX. This file is imported by engineers directly; any non-interface content breaks TypeScript compilation.

- **Leave template placeholder text in output:** All `{placeholder}` values in the handoff spec must be replaced with real content or an explicit "N/A — [reason]" note. Engineers use this document directly; unfilled placeholders indicate incomplete synthesis.

- **Skip lock-release in Step 5d:** Always release the write lock via `lock-release pde-handoff` even if an error occurred during Steps 5b-5c. Failure to release leaves the design system locked for other skills.

- **Fail hard when upstream artifacts are missing:** Soft dependencies (brief, flows, tokens, critique, changelogs) should emit warnings and continue. Only STACK.md (hard dependency) and zero upstream artifacts (hard stop check) cause a halt.

- **Produce component stubs for wrong framework:** If FRAMEWORK is "React", primary stubs are React (.tsx pattern). If FRAMEWORK is "Vue", primary stubs are Vue SFC pattern. If FRAMEWORK is "Svelte", primary stubs are Svelte pattern. The detected framework's stub goes first. All three are included for completeness but the detected framework should be clearly labeled as primary.

- **Ignore productType for hardware sections:** Hardware and hybrid product handoffs require BOM Export, dimension drawings, materials spec, and assembly sequences. Software products never include these sections. Omitting or including the wrong sections creates confusion for implementation teams.

- **Select unversioned wireframe when versioned exists:** Always prefer `WFR-{screen}-v{N}.html` (highest N) over `WFR-{screen}.html` when both exist. The versioned file is the result of critique-driven iteration and contains the most refined content and annotations.

</process>

<output>
Files produced by /pde:handoff:

- `.planning/design/handoff/HND-handoff-spec-v{N}.md` — complete implementation specification with Design Coverage Summary, Route Structure, Global Token Mappings, Shared Component APIs, Accessibility Overview, Motion System, Gap Analysis, Test Specs Overview, Per-Screen Detail Specs (with React/Vue/Svelte stubs), and conditional Hardware Handoff sections
- `.planning/design/handoff/HND-types-v{N}.ts` — TypeScript interface declarations only: export interface declarations with JSDoc comments for all screen components and shared components, section headers as comments, no imports or runtime code
- `.planning/design/handoff/DESIGN-STATE.md` — handoff domain state: HND artifact row in Artifact Index with upstream dependencies listed
- `.planning/design/DESIGN-STATE.md` — root state updated: Pipeline Progress marks Handoff complete, Decision Log and Iteration History rows appended
- `.planning/design/design-manifest.json` — manifest updated with HND artifact entry and hasHandoff: true in designCoverage (all 13 fields preserved via read-before-set)
</output>
