<purpose>
Audit design artifacts against WCAG 2.2 Level AA criteria and platform Human Interface Guidelines (Apple HIG, Material Design, Web). Produces severity-rated findings covering all ~56 WCAG 2.2 criteria in full mode, or 5 mandatory checks in --light mode for critique delegation. Full mode writes HIG-audit-v{N}.md to .planning/design/review/. Light mode returns inline findings only. Consumed by /pde:critique (--light) and /pde:iterate (full).
</purpose>

<skill_code>HIG</skill_code>

<skill_domain>review</skill_domain>

<context_routing>

## Context Detection

Before beginning, load available context:

**Hard requirement (HALT if no auditable artifact found):**
- At least one design artifact to audit: wireframe HTML, mockup HTML, or design system artifact

**Soft dependencies (enrich analysis):**
- `.planning/design/ux/mockups/mockup-*.html` — highest fidelity, preferred audit target
- `.planning/design/ux/wireframes/wireframe-*-v*.html` or `.planning/design/ux/wireframes/*.html` — wireframe HTML
- `.planning/design/visual/SYS-system-v*.md` — design system artifact
- `.planning/design/strategy/BRF-brief-v*.md` — product context

**Routing logic:**
```
IF --light flag in $ARGUMENTS:
  SET LIGHT_MODE = true
  Log: "  -> --light mode: abbreviated pipeline for critique delegation"

ELSE:
  SET LIGHT_MODE = false

Scan for auditable artifacts in priority order:
  1. Mockup HTML: .planning/design/ux/mockups/mockup-*.html
  2. Wireframe HTML: .planning/design/ux/wireframes/*.html (exclude index.html)
  3. Design system: .planning/design/visual/SYS-system-v*.md

IF no artifact found:
  HALT with error:
    Error: No auditable artifact found.
      /pde:hig requires at least one design artifact (wireframe HTML, mockup HTML, or design system).
      Run /pde:wireframe or /pde:mockup first, then re-run /pde:hig.

Use highest-fidelity artifact found. Log which artifact(s) being audited and their fidelity level.
```

</context_routing>

<!-- Experience product type: physical HIG domains implemented in Step 4/7 — see productType gate. Required reading for experience mode: @references/experience-disclaimer.md -->

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/wcag-baseline.md
@references/interaction-patterns.md
@references/motion-design.md
@references/experience-disclaimer.md
</required_reading>

<flags>

## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--light` | Boolean | Abbreviated mode for critique delegation. Runs only 5 mandatory checks, outputs findings inline, skips Steps 5-7 (no artifact, no DESIGN-STATE, no manifest). Finding format matches critique Perspective 3 table exactly. |
| `--platform {web\|ios\|android}` | String | Target platform for HIG-specific checks. Default: web. iOS loads Apple HIG patterns from interaction-patterns.md. Android loads Material Design patterns. |
| `--dry-run` | Boolean | Show audit plan without executing. Runs Steps 1-3 but writes no files. |
| `--verbose` | Boolean | Show individual criterion check details. |
| `--quick` | Boolean | Skip non-essential MCP enhancements for faster execution. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode using training knowledge and local files only. |
| `--no-axe` | Boolean | Skip Axe a11y MCP specifically. Fall back to manual WCAG checklist from wcag-baseline.md. |
| `--force` | Boolean | Overwrite existing HIG artifact without prompting. |

</flags>

<process>

## /pde:hig — WCAG 2.2 AA + HIG Audit Pipeline

Check for flags in $ARGUMENTS before beginning: `--light`, `--platform`, `--dry-run`, `--verbose`, `--quick`, `--no-mcp`, `--no-axe`, `--force`.

**Flag resolution (resolve ONCE, use throughout):**
```
IF --light in $ARGUMENTS:    SET LIGHT_MODE = true
ELSE:                        SET LIGHT_MODE = false

IF --platform ios in $ARGUMENTS:     SET PLATFORM = ios
IF --platform android in $ARGUMENTS: SET PLATFORM = android
DEFAULT:                             SET PLATFORM = web
```

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
  Check that .planning/ exists and is writable, then re-run /pde:hig.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and detect mode

**Detect mode and fidelity:**

Check for `--light` flag. If present: set LIGHT_MODE=true, will short-circuit after Step 4.

Scan for auditable artifacts in priority order:
1. Mockup HTML: Use Glob to check `.planning/design/ux/mockups/mockup-*.html`. If found: FIDELITY_LEVEL = hifi.
2. Wireframe HTML: Use Glob to check `.planning/design/ux/wireframes/*.html` (exclude index.html). Read HTML to detect fidelity from `pde-layout--{fidelity}` class on `<body>`:
   - `pde-layout--hifi` → FIDELITY_LEVEL = hifi
   - `pde-layout--midfi` → FIDELITY_LEVEL = midfi
   - `pde-layout--lofi` → FIDELITY_LEVEL = lofi
   - No class detected → FIDELITY_LEVEL = lofi (default)
3. Design system only: FIDELITY_LEVEL = lofi

HALT if no artifact found (see context_routing error).

Log: `  -> Auditing: {artifact_path} (fidelity: {FIDELITY_LEVEL})`

Detect target platform from `--platform` flag (default: web). Log: `  -> Platform: {PLATFORM}`

**If not --light:** Check for existing HIG artifact:
- Use Glob to check `.planning/design/review/HIG-audit-v*.md`
- If none: N = 1
- If exists AND `--force` not present: prompt user to confirm version increment
- If exists AND `--force` present: N = max existing version + 1

**If `--dry-run` flag is active:** Display planned audit scope and HALT.

Display: `Step 2/7: Audit target identified. Fidelity: {FIDELITY_LEVEL}. Platform: {PLATFORM}. Mode: {full|light}. {if not light: Version: v{N}}`

---

### Step 3/7: Probe MCP availability

**Check flags first:**

```
IF --no-mcp in $ARGUMENTS:
  SET AXE_AVAILABLE = false
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SET ALL_MCP_DISABLED = true
  SKIP all MCP probes
  continue to Step 4

IF --quick in $ARGUMENTS:
  SET AXE_AVAILABLE = false
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP all MCP probes
  continue to Step 4

IF --no-axe in $ARGUMENTS:
  SET AXE_AVAILABLE = false
  SKIP Axe probe
```

**Probe Axe a11y MCP (if not skipped):**

Attempt to probe for a tool in the `mcp__a11y__*` namespace with a minimal test call.

- Timeout: 20 seconds
- If tool responds: SET `AXE_AVAILABLE = true`. Log: `  -> Axe MCP: available (automated WCAG scanning enabled)`
- If tool not found or errors: SET `AXE_AVAILABLE = false`. Log: `  -> Axe MCP: unavailable. Using manual WCAG checklist from wcag-baseline.md.`

**Probe Sequential Thinking MCP (if not skipped):**

Attempt to call `mcp__sequential-thinking__think` with test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Retry once on failure.
- If unavailable: SET `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (degraded mode)`

Display: `Step 3/7: MCP probes complete. Axe: {available|unavailable}. Sequential Thinking: {available|unavailable}.`

---

### Step 4/7: Execute audit

**Read PRODUCT_TYPE from design manifest:**

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

Parse `productType` from the JSON result.

**IF productType === "experience":**

  **Switch audit target to floor plan:**

  Use the Glob tool to check for `.planning/design/ux/wireframes/FLP-floor-plan-v*.html`.
  - If found: SET AUDIT_ARTIFACT = floor plan path (highest version). SET FIDELITY_LEVEL = lofi (floor plans are always schematic).
  - If not found: HALT with error:
    ```
    Error: No floor plan found for experience product HIG audit.
      /pde:hig for experience products requires the floor plan artifact (FLP).
      Run /pde:wireframe first to generate the floor plan, then re-run /pde:hig.
    ```

  Load @references/experience-disclaimer.md into context.

  **IF --light mode (LIGHT_MODE=true) AND productType === "experience":**

    Run abbreviated physical accessibility check only (matching critique Perspective 2 scope):
    - Step-free access routes to all primary zones
    - BSL interpreter sightlines at performance areas
    - Quiet/sensory zone presence
    - Wheelchair viewing platform presence
    - Accessible toilet facilities count

    Output using critique Perspective 3 table format:
    | Severity | Effort | Location | Issue | Suggestion | Reference |
    |----------|--------|----------|-------|------------|-----------|

    Tag output: `[Physical HIG -- /pde:hig --light experience mode]`

    **STOP HERE for --light experience mode. Do NOT proceed to Steps 5-7.**

  **IF full mode AND productType === "experience":**

    Run seven physical interface guideline domains:

    #### Physical HIG Domain 1: Wayfinding

    Checklist:
    - Signage at all decision points (entry -> main zones, zones -> toilets/bar/exit)
    - Low-light readability: retro-reflective or illuminated, 75mm letter height for 10m viewing distance [VERIFY WITH LOCAL AUTHORITY]
    - Multilingual support if international audience in brief
    - Accessibility wayfinding: step-free routes distinctly signed

    Severity ratings:
    - No signage at primary entry = Critical
    - Missing at secondary zones = Major
    - No low-light legibility for night event = Major
    - Missing multilingual for international audience = Minor

    #### Physical HIG Domain 2: Acoustic Zoning

    Checklist:
    - Conversation-possible zone at < 70dB adjacent to high-volume area [VERIFY WITH LOCAL AUTHORITY]
    - Zone transition: gradual buffer zones between high/low volume areas
    - Hearing protection notice posted for zones > 85dB sustained [VERIFY WITH LOCAL AUTHORITY]

    Severity ratings:
    - No conversation-possible zone = Major
    - Abrupt high/low volume adjacency without buffer = Minor

    #### Physical HIG Domain 3: Queue UX

    Checklist:
    - Wait time communication: status board positioned at entry gateline and bar
    - Weather protection: covered queue for entry gateline
    - Skip-queue tiers: separate VIP gateline if indicated in brief
    - Queue capacity: physical space for max queue length without extending into primary circulation paths

    #### Physical HIG Domain 4: Transaction Speed

    Checklist:
    - Bar order target < 90s per transaction [VERIFY WITH LOCAL AUTHORITY] — derive from bar station count and peak hourly attendance
    - Entry processing target < 30s per person [VERIFY WITH LOCAL AUTHORITY] — derive from gateline width and arrival peak distribution
    - Cashless vs cash: bar placement supports cashless-only operation if indicated in brief

    #### Physical HIG Domain 5: Toilet Ratio

    Checklist:
    - Female ratio minimum 1:75 [VERIFY WITH LOCAL AUTHORITY] — use 50/50 gender split if not specified in brief
    - Male ratio minimum 1:100 [VERIFY WITH LOCAL AUTHORITY]
    - Accessible facilities minimum 1 per provision unit [VERIFY WITH LOCAL AUTHORITY]
    - Distance: facilities within 150m from any zone [VERIFY WITH LOCAL AUTHORITY]

    Severity ratings:
    - Ratio below minimum = Critical
    - Accessible facilities absent = Critical
    - Distance > 150m from any zone = Major

    #### Physical HIG Domain 6: Hydration

    Checklist:
    - Free water points minimum 1 per 500 attendees [VERIFY WITH LOCAL AUTHORITY — some jurisdictions mandate at licensed events]
    - Visibility: water points positioned in high-traffic areas, not obscured by infrastructure
    - Signage: "Free Water" conspicuously signed at wayfinding decision points

    Severity ratings:
    - No free water points = Critical
    - Water points not signed = Major

    #### Physical HIG Domain 7: First Aid

    Checklist:
    - Response time: trained first aider reachable within 2 minutes from any point on site (approximately 170m walking distance) [VERIFY WITH LOCAL AUTHORITY]
    - First aid post clearly identified on floor plan with international medical symbol
    - Staffing ratio: 1 first aider per 100-250 attendees [VERIFY WITH LOCAL AUTHORITY]
    - Defibrillator (AED) positioned and signed [VERIFY WITH LOCAL AUTHORITY — mandatory in some jurisdictions for events over certain attendance thresholds]

    Severity ratings:
    - No first aid post identified on floor plan = Critical
    - First aider response time > 2 minutes from any point = Critical
    - No AED for events > 500 attendees = Major

    **SKIP all WCAG criteria and POUR analysis entirely.** Do NOT produce findings for color contrast, keyboard navigation, focus indicators, touch targets, or any WCAG criterion.

    Tag all output: `[Physical HIG -- /pde:hig experience mode]`

    Set PHYSICAL_HIG_MODE = true.

    Proceed to Step 5/7.

ELSE:

  **Standard WCAG/HIG audit path (existing behavior for software/hardware/hybrid products):**

**IF --light mode (LIGHT_MODE=true):**

Run ONLY these 5 mandatory checks:

1. **Color contrast (WCAG 1.4.3)** — text contrast >= 4.5:1 normal text, >= 3:1 large text (18pt+/14pt bold+)
   Apply fidelity calibration:
   - lofi: color contrast findings are severity `nit` only (placeholder colors — not real product colors)
   - midfi: color contrast findings are `minor` (placeholder colors still likely)
   - hifi: color contrast failures are `major` or `critical` (real product colors applied)

2. **Focus visibility (WCAG 2.4.11)** — focus indicators visible and not obscured by sticky headers/banners

3. **Touch targets (WCAG 2.5.8)** — interactive targets >= 24x24 CSS pixels

4. **Form labels** — all input elements have associated `<label for="id">` or `aria-label`

5. **Heading hierarchy** — h1-h6 sequence logical, no level skips

For each finding, output using this EXACT table format (matching critique Perspective 3):

```
| Severity | Effort | Location | Issue | Suggestion | Reference |
|----------|--------|----------|-------|------------|-----------|
| {critical|major|minor|nit} | {quick-fix|moderate|significant} | {element/location} | {description} | {actionable fix} | {WCAG criterion} |
```

Tag output: `[HIG skill -- /pde:hig --light]`

**STOP HERE for --light mode. Do NOT proceed to Steps 5-7. Do NOT write any artifact file.**

---

**IF full mode (LIGHT_MODE=false):**

Run comprehensive audit covering ALL WCAG 2.2 Level A and AA criteria (~56 criteria):

If AXE_AVAILABLE: run automated scan on artifact HTML using `mcp__a11y__*` tool. Tag findings with "[Enhanced by Axe MCP]".
If AXE_AVAILABLE=false: use manual checklist from wcag-baseline.md. Tag: "[Manual WCAG review]".

If SEQUENTIAL_THINKING_AVAILABLE: use `mcp__sequential-thinking__think` for deeper criterion-level analysis. Tag: `[Enhanced by Sequential Thinking MCP -- audit reasoning]`.

**4a. POUR Compliance Assessment**

Organize findings by POUR principle. For each principle, check all applicable WCAG 2.2 criteria from wcag-baseline.md:

**Perceivable** (19 criteria: 9 Level A + 10 Level AA):
- 1.1.1 Non-text Content (A)
- 1.2.1 Audio-only and Video-only (A)
- 1.2.2 Captions Prerecorded (A)
- 1.2.3 Audio Description or Media Alternative (A)
- 1.2.4 Captions Live (AA)
- 1.2.5 Audio Description Prerecorded (AA)
- 1.3.1 Info and Relationships (A)
- 1.3.2 Meaningful Sequence (A)
- 1.3.3 Sensory Characteristics (A)
- 1.3.4 Orientation (AA)
- 1.3.5 Identify Input Purpose (AA)
- 1.4.1 Use of Color (A)
- 1.4.2 Audio Control (A)
- 1.4.3 Contrast Minimum (AA) — MANDATORY CHECK
- 1.4.4 Resize Text (AA)
- 1.4.5 Images of Text (AA)
- 1.4.10 Reflow (AA)
- 1.4.11 Non-text Contrast (AA)
- 1.4.12 Text Spacing (AA)
- 1.4.13 Content on Hover or Focus (AA)

**Operable** (22 criteria: 12 Level A + 10 Level AA):
- 2.1.1 Keyboard (A)
- 2.1.2 No Keyboard Trap (A)
- 2.1.4 Character Key Shortcuts (A)
- 2.2.1 Timing Adjustable (A)
- 2.2.2 Pause Stop Hide (A)
- 2.3.1 Three Flashes or Below Threshold (A)
- 2.4.1 Bypass Blocks (A)
- 2.4.2 Page Titled (A)
- 2.4.3 Focus Order (A)
- 2.4.4 Link Purpose In Context (A)
- 2.4.5 Multiple Ways (AA)
- 2.4.6 Headings and Labels (AA)
- 2.4.7 Focus Visible (AA)
- 2.4.11 Focus Not Obscured Minimum (AA) — MANDATORY CHECK [NEW IN 2.2]
- 2.5.1 Pointer Gestures (A)
- 2.5.2 Pointer Cancellation (A)
- 2.5.3 Label in Name (A)
- 2.5.4 Motion Actuation (A)
- 2.5.7 Dragging Movements (AA) [NEW IN 2.2]
- 2.5.8 Target Size Minimum (AA) — MANDATORY CHECK [NEW IN 2.2]

**Understandable** (13 criteria: 6 Level A + 7 Level AA):
- 3.1.1 Language of Page (A)
- 3.1.2 Language of Parts (AA)
- 3.2.1 On Focus (A)
- 3.2.2 On Input (A)
- 3.2.3 Consistent Navigation (AA)
- 3.2.4 Consistent Identification (AA)
- 3.2.6 Consistent Help (A) [NEW IN 2.2]
- 3.3.1 Error Identification (A)
- 3.3.2 Labels or Instructions (A) — MANDATORY CHECK (form labels)
- 3.3.3 Error Suggestion (AA)
- 3.3.4 Error Prevention Legal Financial Data (AA)
- 3.3.7 Redundant Entry (A) [NEW IN 2.2]
- 3.3.8 Accessible Authentication Minimum (AA) [NEW IN 2.2]

**Robust** (2 criteria: 1 Level A + 1 Level AA):
- 4.1.2 Name Role Value (A)
- 4.1.3 Status Messages (AA)
- Note: 4.1.1 Parsing removed in WCAG 2.2

**4b. 5 Mandatory Checks** (same as --light, included in full report):
- Color contrast (1.4.3), Focus visibility (2.4.11), Touch targets (2.5.8), Form labels (3.3.2), Heading hierarchy

Apply fidelity calibration for color contrast:
- lofi: `nit` only
- midfi: `minor`
- hifi: `major` or `critical`

**4c. WCAG 2.2 New Criteria** (explicit checks, cross-reference with POUR findings):
- 2.4.11 Focus Not Obscured (Minimum) [AA]
- 2.5.7 Dragging Movements [AA]
- 2.5.8 Target Size (Minimum) [AA]
- 3.2.6 Consistent Help [A]
- 3.3.7 Redundant Entry [A]
- 3.3.8 Accessible Authentication (Minimum) [AA]

**4d. Platform-Specific HIG Checks** (based on PLATFORM):

**web:** Standard WCAG + ARIA patterns from interaction-patterns.md Tier 1-3
- Landmark regions: banner, main, nav, contentinfo
- Skip navigation: first focusable element
- ARIA patterns from Tier 1 (Button, Link, Checkbox, Switch, Radio Group, Disclosure)
- Tier 2 patterns if applicable (Tabs, Dialog, Alert, Menu Button, Toolbar, Tooltip, Breadcrumb)
- Tier 3 patterns if applicable (Combobox, Tree, Grid, Listbox, Menu/Menubar, Carousel, Slider, Table)
- Focus ring visibility (`:focus-visible`, not `outline: none`)
- Dark mode patterns if applicable

**ios:** Apple HIG patterns from interaction-patterns.md Swift sections
- `.accessibilityLabel()` on Image views; `.accessibilityHidden(true)` for decorative
- `.accessibilityAddTraits()` for correct trait assignment
- `.accessibilityElement(children:)` for grouping
- `@FocusState` and `.focused()` for focus management
- Dynamic Type: `.font(.body)` system fonts auto-scale
- Reduce Motion: `@Environment(\.accessibilityReduceMotion)`
- VoiceOver: `.accessibilityAction()`, `.accessibilityRotor()`
- `.textContentType()` for autofill
- iOS tap targets: 44x44pt minimum (exceeds WCAG 24px)
- `.contentShape(Rectangle())` to expand tap areas on custom views

**android:** Material Design patterns
- Content descriptions on icons and images
- Touch ripple feedback on interactive elements
- Elevation semantics and visual hierarchy
- Material Design 3 color system (surface levels for dark mode)
- Minimum 48dp touch targets for key actions

**4e. Component-Grouped View**

Group findings by UI component category:
- Navigation (header nav, breadcrumbs, skip links)
- Forms (inputs, labels, error messages, submit buttons)
- Cards and content (images, headings, alt text)
- Modals and overlays (focus trap, dismiss, announce)
- Interactive controls (buttons, links, toggles, menus)
- Data display (tables, lists, charts)
- Feedback (alerts, toasts, loading states)

**4f. Severity Rating**

Every finding MUST be rated using this EXACT scale (matches critique exactly):
- `critical`: Blocks access entirely (form has no labels, element not keyboard-reachable)
- `major`: Significant barrier (color contrast fails WCAG AA at hifi, focus indicator not visible, touch target < 24px)
- `minor`: Moderate issue (ARIA label imprecise, heading hierarchy skips one level)
- `nit`: Polish (aria-describedby could improve, decorative image alt handling)

Finding format:
| Severity | Effort | Location | Issue | Suggestion | Reference |
|----------|--------|----------|-------|------------|-----------|
| {critical|major|minor|nit} | {quick-fix|moderate|significant} | {element/location} | {description} | {actionable fix} | {WCAG criterion} |

**4g. Motion Accessibility Audit**

Load motion-design.md Animation Performance Rules.

WCAG criterion reference:
- 2.3.3 Animation from Interactions (Level AAA): motion triggered by interaction can be disabled — flag as "advisory best practice" not mandatory AA finding
- 2.2.2 Pause, Stop, Hide (Level A): auto-playing motion > 5 seconds must be pausable — this IS mandatory
- 2.5.4 Motion Actuation (Level A): device/user motion functions have UI alternatives — this IS mandatory

**prefers-reduced-motion compliance check:**

Scan artifact HTML/CSS for animation and transition declarations. For each animated element:
- Check: Is `@media (prefers-reduced-motion: reduce)` applied?
- Check: Does the reduced-motion version provide a meaningful fallback (fade/opacity) vs blank removal?
- Correct pattern:
  ```
  @media (prefers-reduced-motion: reduce) {
    .animated-element { animation: none; transition: opacity 0.3s ease; }
  }
  ```
- Wrong: omitting the media query entirely
- Wrong: `* { animation: none !important; }` — breaks functional animations (loading states)

If prefers-reduced-motion absent:
- Severity: minor (labeled "[WCAG 2.3.3 AAA — advisory]") at hifi
- Severity: nit at midfi/lofi
- NOT major or critical — 2.3.3 is AAA, not AA

If auto-playing animation > 5 seconds with no pause/stop control:
- Severity: major (labeled "[WCAG 2.2.2 Level A]")
- This IS a mandatory AA-level finding

**Vestibular trigger catalogue:**

The following motion types are HIGH-RISK for vestibular disorders. Scan artifact for each:

| Pattern | Description | Vestibular-Safe Alternative |
|---------|-------------|----------------------------|
| parallax-scroll | background moves at different rate than foreground while scrolling | fade-in on scroll (opacity transition only, no transform) |
| large-scale-transform | elements scale > 20% during scroll or on-load | opacity reveal without scale |
| spinning-continuous | rotation animations that loop indefinitely | pause/stop control required (WCAG 2.2.2); reduce to single rotation |
| viewport-pan | content pans laterally while user scrolls vertically | stationary reveal with content fade |

For any identified HIGH-RISK pattern:
- State: "Vestibular risk: [pattern name] on [element]"
- Required: "Vestibular-safe alternative: [substitute from table above]"
- Severity: major at hifi, minor at midfi, nit at lofi

---

**4h. Animation Performance Audit**

Load motion-design.md Animation Performance Rules.

**GPU-composited safe properties (no layout reflow):**
  transform, opacity
  These run on the compositor thread and never cause layout reflow.

**Layout-reflow properties (DO NOT animate):**
  width, height, top, left, right, bottom, margin, padding, border-width, font-size, line-height

**Repaint properties (cause repaint but not reflow — use sparingly):**
  color, background-color, visibility, border-radius, box-shadow, filter

For each animation found in the artifact:
1. Identify which CSS properties are being animated
2. If any layout-reflow property is animated:
   - Finding: "Animation on [element] animates [property] — causes layout reflow on every frame"
   - Severity: major (performance-critical element like hero, nav) / minor (decorative element)
   - Suggestion: "Replace [property] animation with transform equivalent"
   - Example: "Animating width: 0 to 100% — use transform: scaleX(0) to scaleX(1) with transform-origin: left"
   - Cite specific element name in finding (not generic "some animations may cause reflow")
3. If will-change is used:
   - Verify it targets a specific property (will-change: transform) not all (will-change: all)
   - Verify guidance that it should be removed after animation completes (via JS animationend)
   - Flag will-change: all as minor finding always

Citation: motion-design.md Animation Performance Rules section

---

**4i. Touch Target During Motion State**

Extends existing WCAG 2.5.8 touch target check (24x24 CSS pixels minimum).

During CSS transitions that move or resize interactive elements, check:
- Does the interactive element remain at minimum 24x24px throughout the transition?
- Is there a period where the element is too small or off-screen to tap?

Specific risk patterns:
- **scale(0) entrance animation:** element starts at 0px effective size, untappable during entrance
  Recommendation: reach 100% size rapidly (< 150ms) or use opacity-only entrance
- **off-screen slide-in:** element entering from off-viewport is unreachable during animation
  Recommendation: element should be focusable/tappable before animation completes
- **opacity: 0** is acceptable — element remains in DOM at full size, still tappable (not a violation)

Severity: minor for scale animations (brief untappable window < 150ms), major if element is permanently inaccessible due to transform positioning or long entrance duration (> 500ms at scale 0)

---

Display: `Step 4/7: Audit complete. {N} findings identified (critical: {c}, major: {m}, minor: {mi}, nit: {n}).`

---

### Step 5/7: Write HIG audit artifact (SKIP if --light)

**IMPORTANT: Skip this step entirely if LIGHT_MODE=true.**

Use the template structure from templates/hig-audit.md. Write to `.planning/design/review/HIG-audit-v{N}.md`.

**IF PHYSICAL_HIG_MODE = true (experience products):**

Use the following physical HIG artifact format:

**YAML Frontmatter:**
```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:hig (HIG)
Mode: physical-hig-experience
Version: v{N}
Status: draft
Artifact: Floor Plan FLP-v{N}
Fidelity: lofi
Enhanced By: "none"
---
```

**Sections in order:**
1. `# Physical HIG Audit: {project_name}` (or artifact name if no project name found)
2. `## Executive Summary` — overall physical compliance summary, critical finding count, recommended priority actions
3. `## Physical HIG Domains Summary` — table with all 7 domains:
   `| Domain | Status | Findings | Priority |` with one row per domain
4. `## Findings by Severity` — all findings sorted critical → major → minor → nit
5. `## Recommendations` — priority-ordered remediation actions

**Footer:**
```markdown
---

*Generated by PDE-OS /pde:hig | {ISO 8601 date} | Mode: physical-hig-experience | Artifact: Floor Plan FLP-v{N}*

[Physical HIG -- /pde:hig experience mode]
```

ELSE (standard software/hardware/hybrid products):

**YAML Frontmatter:**
```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:hig (HIG)
Version: v{N}
Status: draft
Platform: {web|ios|android}
Fidelity: {lofi|midfi|hifi}
Enhanced By: "{Axe MCP|Sequential Thinking MCP|none}"
---
```

**Sections in order:**
1. `# HIG Audit: {project_name}` (or artifact name if no project name found)
2. `## Executive Summary` — overall compliance rating, critical finding count, recommended priority actions
3. `## POUR Compliance Table` — pass/fail/N/A counts per principle with scores
4. `## Findings by Severity` — all findings sorted critical → major → minor → nit
5. `## Findings by Component` — component-grouped view from Step 4e
6. `## Platform-Specific Notes` — platform HIG findings from Step 4d
7. `## WCAG 2.2 New Criteria Results` — explicit section for 2022 additions (6 criteria)
8. `## Recommendations` — priority-ordered remediation actions

**Footer:**
```markdown
---

*Generated by PDE-OS /pde:hig | {ISO 8601 date} | Platform: {platform} | Fidelity: {fidelity}*

{If Axe MCP was used: "[Enhanced by Axe MCP -- automated WCAG 2.2 scan]"}
{If Axe MCP was unavailable: "[Manual accessibility review -- install a11y MCP for automated WCAG scanning]"}
```

Use the Write tool to create the artifact.

Display:
```
Step 5/7: HIG audit artifact written.
  -> Created: .planning/design/review/HIG-audit-v{N}.md
```

---

### Step 6/7: Update domain DESIGN-STATE (SKIP if --light)

**IMPORTANT: Skip this step entirely if LIGHT_MODE=true.**

Check for `.planning/design/review/DESIGN-STATE.md` using the Glob tool.

**If it does NOT exist:** Create it with the standard review domain structure:

```markdown
# Review Domain Design State

Updated: {YYYY-MM-DD}
Domain: review

## Artifact Index

| Code | Name | Skill | Status | Version | Enhanced By | Notes | Updated |
|------|------|-------|--------|---------|-------------|-------|---------|
| HIG | HIG Audit | /pde:hig | draft | v{N} | {MCPs used or none} | | {YYYY-MM-DD} |
```

**If it already exists:** Use the Edit tool to add or update the HIG row in the Artifact Index.

The HIG row format:
```
| HIG | HIG Audit | /pde:hig | draft | v{N} | {MCPs used or none} | | {YYYY-MM-DD} |
```

Display: `Step 6/7: Review DESIGN-STATE.md updated with HIG artifact entry.`

---

### Step 7/7: Update root DESIGN-STATE and manifest (SKIP if --light)

**IMPORTANT: Skip this step entirely if LIGHT_MODE=true.**

**Acquire write lock:**

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-hig)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 2 seconds, then retry once. If still false: warn and continue.

**Update root `.planning/design/DESIGN-STATE.md`:**

Read the current root DESIGN-STATE.md, then apply these updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add HIG row if not present:
   ```
   | HIG | review | wireframe/mockup HTML | current |
   ```

2. **Decision Log** — append entry:
   ```
   | HIG | HIG audit complete, platform: {platform}, fidelity: {fidelity}, {N} findings | {date} |
   ```

3. **Iteration History** — append entry:
   ```
   | HIG-audit-v{N} | v{N} | Created by /pde:hig | {date} |
   ```

**ALWAYS release write lock, even if an error occurred:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

**Update design manifest (7-call pattern):**

If PHYSICAL_HIG_MODE = true (experience products): set artifact type to `physical-hig-audit`.
ELSE (software/hardware/hybrid products): set artifact type to `hig-audit`.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG code HIG
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG name "HIG Audit"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG type {physical-hig-audit if PHYSICAL_HIG_MODE=true, else hig-audit}
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG domain review
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG path ".planning/design/review/HIG-audit-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG version {N}
```

Note: The `hasHigAudit: true` coverage flag name is the same regardless of mode (physical or software).

**Set coverage flag (pass-through-all — read-before-set to prevent clobber):**

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON result. Extract ALL 14 current coverage flag values (default absent fields to `false`):
- `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`

Then write the FULL 14-field JSON, setting `hasHigAudit` to `true` and passing all other flags through unchanged:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":true,"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**IMPORTANT:** Replace each `{current}` placeholder with the actual boolean value read from coverage-check. NEVER use dot-notation. ALWAYS write all 14 fields. Canonical field order: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.

Display: `Step 7/7: Root DESIGN-STATE and manifest updated. hasHigAudit: true.`

---

## Summary

Display the final summary table (always the last output):

```
## Summary

| Property | Value |
|----------|-------|
| Files created | {if full: .planning/design/review/HIG-audit-v{N}.md (Markdown, {size})} |
| Files modified | {if full: .planning/design/review/DESIGN-STATE.md, .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json} |
| Mode | {full|light} |
| Platform | {web|ios|android} |
| Fidelity | {lofi|midfi|hifi} |
| Findings | Critical: {c}, Major: {m}, Minor: {mi}, Nit: {n} |
| Next suggested skill | {/pde:iterate (if critical/major findings) | /pde:handoff (if clean)} |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {Axe MCP, Sequential Thinking MCP, or none} |
```

---

## Anti-Patterns (Guard Against)

- NEVER write artifact file in --light mode (critique delegation must not create side-effect files)
- NEVER proceed to Steps 5-7 when LIGHT_MODE=true
- NEVER use severity ratings other than critical/major/minor/nit (must match critique exactly)
- NEVER skip fidelity calibration for color contrast findings (lofi=nit, midfi=minor, hifi=major/critical)
- NEVER hard-fail when Axe MCP unavailable (manual checklist fallback is sufficient)
- NEVER skip coverage-check before writing designCoverage
- NEVER use dot-notation with manifest-set-top-level (always pass full JSON object)
- NEVER write only hasHigAudit to designCoverage — always pass all 13 fields
- Coverage flag name is `hasHigAudit` (not hasHIG, not hasHig, not hasHIGAudit)
- NEVER hard-fail when auditable artifact is absent — HALT with clear error message pointing to prerequisite skill
- ALWAYS release write lock (Step 7 lock-release) even if an error occurs during root DESIGN-STATE updates

</process>

<output>
**Full mode:**
- `.planning/design/review/HIG-audit-v{N}.md` — full WCAG 2.2 AA audit artifact with POUR compliance table, findings by severity, findings by component, platform-specific notes, WCAG 2.2 new criteria results, and recommendations
- `.planning/design/review/DESIGN-STATE.md` — review domain state (created if absent, updated with HIG entry)
- `.planning/design/DESIGN-STATE.md` — root state updated (Cross-Domain Dependency Map, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with HIG artifact entry and hasHigAudit: true in designCoverage

**Light mode:**
- Inline findings table only — no files written
- Finding format matches critique Perspective 3 exactly: | Severity | Effort | Location | Issue | Suggestion | Reference |
- Tagged: `[HIG skill -- /pde:hig --light]`
</output>
