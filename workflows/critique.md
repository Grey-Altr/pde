<purpose>
Multi-perspective design critique of wireframes grounded in the project's brief and flows. Evaluates from four perspectives (UX/usability, visual hierarchy, accessibility, business alignment) with weighted scoring (UX: 1.5x, Visual Hierarchy: 1.0x, Accessibility: 1.5x, Business Alignment: 1.0x). Produces versioned CRT-critique-v{N}.md in .planning/design/review/ with severity-rated findings (critical/major/minor/nit), concrete actionable recommendations, a mandatory "What Works" section preserving intentional design decisions, and an Action List for /pde:iterate consumption. Hard-blocks when both brief and flows are absent (CRT-02), warns and continues when only one prerequisite is missing. Registered in the design manifest under artifact code CRT with hasCritique coverage flag set via read-before-set pattern.
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/design-principles.md
@references/wcag-baseline.md
@references/quality-standards.md
@references/composition-typography.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Runs Steps 1-3 only, shows planned critique scope, prerequisite status, MCP availability. No report written. |
| `--quick` | Boolean | Skip MCP enhancements (Axe, Sequential Thinking). Use design-principles.md and wcag-baseline.md directly. |
| `--verbose` | Boolean | Show detailed progress, timing per step, reference loading details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP only. |
| `--no-axe` | Boolean | Skip Axe a11y MCP specifically. Fall back to manual WCAG checklist from wcag-baseline.md. |
| `--force` | Boolean | Skip confirmation when critique report already exists — overwrite without prompting. |
| `--focused "perspective"` | String | Evaluate only the named perspective(s). Comma-separated. Valid values: ux, hierarchy, accessibility, business. |
</flags>

<process>

## /pde:critique — Design Critique Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--quick`, `--verbose`, `--no-mcp`, `--no-sequential-thinking`, `--no-axe`, `--force`, `--focused`.

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
  Check that .planning/ exists and is writable, then re-run /pde:critique.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and discover wireframes

This step has six sub-sections executed in order.

#### 2a. Check for design brief (soft dependency)

Use the Glob tool to check for `.planning/design/strategy/BRF-brief-v*.md`. Sort all matches descending by version number (parse the `v{N}` suffix), read the highest version using the Read tool.

- If absent: set `BRIEF_AVAILABLE = false`
- If present: set `BRIEF_AVAILABLE = true`, store brief content as BRIEF_CONTEXT

#### 2b. Check for user flows (soft dependency)

Use the Glob tool to check for `.planning/design/ux/FLW-flows-v*.md`. Sort all matches descending by version number, read the highest version using the Read tool.

- If absent: set `FLOWS_AVAILABLE = false`
- If present: set `FLOWS_AVAILABLE = true`, store flows content as FLOWS_CONTEXT

#### 2c. Hard-block check (CRT-02)

```
IF BRIEF_AVAILABLE is false AND FLOWS_AVAILABLE is false:
  Output EXACTLY this error message:
  ---
  Error: Critique requires product context to avoid generic UI feedback.

    Missing: Design brief (.planning/design/strategy/BRF-brief-v*.md)
    Missing: User flows (.planning/design/ux/FLW-flows-v*.md)

    Without these artifacts, /pde:critique can only apply generic UI heuristics
    that ignore your product's goals, personas, and intended user journeys.

    Run in order:
      1. /pde:brief    -- defines product intent, personas, and constraints
      2. /pde:flows    -- maps user journeys and screen inventory
      3. /pde:wireframe -- generates screen wireframes (if not already done)
      4. /pde:critique -- re-run after the above complete
  ---
  HALT. Do not proceed to Step 3.

IF BRIEF_AVAILABLE is false (but flows present):
  Output: "Warning: Design brief not found. Critique will proceed using flows and wireframes for context. Run /pde:brief first for richer product-aligned critique. (Continuing without brief...)"

IF FLOWS_AVAILABLE is false (but brief present):
  Output: "Warning: User flows not found. Critique will proceed using brief and wireframes for context. Run /pde:flows first for richer journey-aligned critique. (Continuing without flows...)"

IF both available:
  Display: "Step 2/7: Prerequisites verified. Brief v{N} and Flows v{M} loaded."
```

#### 2d. Discover wireframes to critique

- If a screen argument is provided in $ARGUMENTS (comma-separated list of slugs): filter to those slugs only from `.planning/design/ux/wireframes/`
- If no screen argument: use the Glob tool to find all `.html` files in `.planning/design/ux/wireframes/` excluding `index.html`. Also check if `.planning/design/ux/wireframes/pencil-canvas.png` exists (Pencil screenshot from a prior run) and append it to the file list if present.
- If no wireframes found: HALT with error:
  ```
  Error: No wireframes found in .planning/design/ux/wireframes/. Run /pde:wireframe first.
  ```
- Store list as WIREFRAME_FILES
- Note: `pencil-canvas.png` (if captured in Step 3.5 during the current run) will be appended to WIREFRAME_FILES at that step, not here

#### 2e. Read fidelity level from each wireframe

For each wireframe file in WIREFRAME_FILES:
- Use the Read tool to read the HTML file content
- Extract fidelity from the `pde-layout--{fidelity}` class on the `<body>` element (values: lofi, midfi, hifi)
- If mixed fidelity detected across files: note in report frontmatter Mode field as "full (mixed fidelity: lofi/hifi)" etc.
- Store per-file fidelity as FIDELITY_MAP for severity calibration in Step 4

#### 2f. Version gate

Use the Glob tool to check for existing `CRT-critique-v*.md` in `.planning/design/review/`.

- If found AND `--force` not present: prompt user:
  ```
  Critique report v{N} already exists. Overwrite? (Use --force to skip this prompt)
  ```
  If user confirms: set VERSION = max existing version + 1.
- If `--force` present: set VERSION = max existing version + 1 silently.
- If no existing reports: set VERSION = 1.

Display: `Step 2/7: {N} wireframe(s) discovered at {fidelity} fidelity. Critique v{VERSION} will be generated.`

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
```

Note: `--no-axe` flag is passed through to /pde:hig --light when Perspective 3 delegates to the HIG workflow. The Axe probe is handled inside the HIG skill, not here.

#### 3a. Sequential Thinking MCP probe (if not skipped by flags above)

Attempt to call `mcp__sequential-thinking__think` with a simple test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds with reasoning: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Log: `  -> Sequential Thinking MCP: available`
- If tool not found or errors: retry once (same 30s timeout)
  - If retry succeeds: `SEQUENTIAL_THINKING_AVAILABLE = true`
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (continuing without)`

**If `--dry-run` flag is active:** Display planned critique scope and HALT. Do not proceed to Step 4:

```
Dry run mode. No files will be written.

Planned output:
  File: .planning/design/review/CRT-critique-v{VERSION}.md

Brief: {brief path or "not found"}
Flows: {flows path or "not found"}
Wireframes ({count}): {comma-separated file list}
Fidelity: {detected fidelity or "mixed"}
Perspectives: {all four or focused list}
Sequential Thinking MCP: {available | unavailable}
Accessibility: delegated to /pde:hig --light (Axe MCP handled by HIG skill)
```

Display: `Step 3/7: MCP probes complete. Sequential Thinking: {yes|no}.`

---

### Step 3.5: Capture Pencil canvas screenshot (conditional — PEN-02)

Check if Pencil is connected and capture a canvas screenshot for inclusion in the visual evaluation.

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const pen = conn.connections && conn.connections.pencil;
const status = pen && pen.status || 'not_configured';
process.stdout.write(JSON.stringify({ pencilConnected: status === 'connected' }));
EOF
```

Parse the JSON output. If `pencilConnected` is `true`:

Display: `Pencil is connected. Capturing canvas screenshot for visual evaluation...`

Follow @workflows/critique-pencil-screenshot.md exactly. The screenshot workflow handles its own error recovery and degraded mode — if it fails, /pde:critique continues to Step 4 normally. The screenshot file (if written) will be discovered by Step 2d's wireframe glob on subsequent runs. For the current run, if a screenshot was captured and written to `.planning/design/ux/wireframes/pencil-canvas.png`, append it to WIREFRAME_FILES so it is included in Step 4 evaluation immediately.

If `pencilConnected` is `false`:

Display: `Pencil not connected — skipping canvas screenshot. Run /pde:connect pencil to enable.`

Continue to Step 4/7.

**Important:** This dispatch is non-blocking. If critique-pencil-screenshot.md encounters any error, /pde:critique must still proceed to Step 4 evaluation. The Pencil screenshot is an enhancement to the critique, not a hard dependency.

---

### Step 4/7: Evaluate wireframes across four perspectives

Load evaluation references into context:
- `@references/design-principles.md` — Nielsen H1-H10, Shneiderman S1-S8, Norman's principles, Gestalt laws, Fitts/Hick/Miller
- `@references/wcag-baseline.md` — WCAG 2.2 Level A/AA criteria and POUR principles
- `@templates/critique-report.md` — output format reference

If `--focused` flag present: evaluate only the named perspective(s). Valid values: ux, hierarchy, accessibility, business. Otherwise evaluate all four.

For each wireframe file in WIREFRAME_FILES:

  Use the Read tool to read the wireframe HTML content.
  Determine fidelity from FIDELITY_MAP for severity calibration.

  Display progress: `Step 4/7: Evaluating {screen_slug} ({N} of {total})...`

  #### Perspective 1: UX / Usability (weight 1.5x)

  Evaluation frameworks:
  - Nielsen's 10 Heuristics (H1-H10): Visibility of system status, match with real world, user control and freedom, consistency and standards, error prevention, recognition over recall, flexibility and efficiency, aesthetic and minimalist design, help users recognize/diagnose/recover, help and documentation
  - Shneiderman's 8 Golden Rules (S1-S8): Strive for consistency, enable frequent users to use shortcuts, offer informative feedback, design dialogs to yield closure, prevent errors, permit easy reversal, support internal locus of control, reduce short-term memory load

  Evaluate against:
  - BRIEF_CONTEXT: Do screens serve the personas' stated goals? Does the interaction model reflect the product type and constraints?
  - FLOWS_CONTEXT: Does this screen serve its designated journey step? Are entry points clear? Are exit paths obvious?
  - Wireframe layout: Affordances, signifiers, feedback mechanisms, error recovery paths, cognitive load

  Key evaluation questions:
  - Does this screen clearly serve the persona's primary goal?
  - Is there visible feedback for all user actions? (H1)
  - Is the language consistent with users' mental models? (H2)
  - Are there emergency exits for mistaken actions? (H3)
  - Is the interaction model consistent across screens? (H4, S1)
  - Does the design prevent errors before they occur? (H5)
  - Is information presented at point of need — no memory load? (H6)
  - Are affordances clear — does it look clickable/interactive? (Norman)
  - Is error recovery supported with clear actions? (H9, S5, S6)

  Severity escalation: H1 violations on screens with async operations are never below Major.

  If SEQUENTIAL_THINKING_AVAILABLE: for complex or ambiguous findings, use `mcp__sequential-thinking__think` with prompt: `"For screen '{screen_slug}', evaluate this finding: '{finding description}'. Reason through: (1) the severity given the screen's role in the journey, (2) whether this is a structural issue or a content issue, (3) the most actionable suggestion given the current fidelity level."` Use the output to refine finding severity and suggestion.

  #### Perspective 2: Visual Hierarchy (weight 1.0x)

  Evaluation frameworks:
  - Gestalt principles: proximity (related elements grouped), similarity (interactive elements look consistent), continuity (visual flow guides attention), closure (incomplete shapes perceived as whole), figure-ground (content distinct from background), common region (groupings by bounding regions)
  - Norman's principles: affordance, signifiers, constraints, mapping, feedback, conceptual models
  - Fitts's Law: interactive target size and distance affects usability — primary actions need to be large and close
  - Hick's Law: decision time grows with number of options — too many choices slows users
  - Miller's Law: working memory holds ~7 (plus or minus 2) items — chunk information accordingly

  Evaluate against:
  - Wireframe visual layout: spacing, grouping, hierarchy, information density
  - Design token application (at midfi/hifi): correct token usage, consistent visual weight
  - Navigation and layout patterns: progressive disclosure, visual flow from primary to secondary content

  Key evaluation questions:
  - Is the primary action visually prominent — the most prominent interactive element on screen?
  - Are related elements visually grouped via proximity or common region? (Gestalt)
  - Is cognitive load appropriate for this step in the user journey? (Miller, Hick)
  - Are interactive elements visually distinguishable from static content? (Gestalt similarity)
  - Do primary actions satisfy Fitts's Law — appropriately sized and positioned?
  - Does whitespace create meaningful groupings that guide comprehension?
  - Is the visual flow natural — does the eye move from most to least important?
  - Does information density match the user's context at this journey step?

  #### Typography Pairing Assessment

  Load composition-typography.md Type Pairing Classification section.

  For each typeface combination found in the artifact:
  1. Identify the classification of each font: serif/sans/slab/display/monospace + Vox-ATypI subtype
  2. Check if pairing provides CONTRAST (classification contrast, x-height contrast, structural contrast, purpose contrast) OR only SIZE differentiation
  3. Verdict: "Pairing: [documented-contrast / size-only / single-font / undocumented]"

  If size-only or single-font:
    Finding with:
    - Issue: "Typography pairing: only font-size distinguishes heading from body — no classification, weight, or style contrast documented"
    - Severity: major (at hifi) / minor (at midfi) / nit (at lofi)
    - Suggestion: Provide specific pairing recommendation using Vox-ATypI framework from composition-typography.md
    - Awwwards dimension: Design (40%)

  #### Perspective 3: Accessibility (weight 1.5x)

  IF `workflows/hig.md` exists (check with Glob):
    Load @workflows/hig.md with --light in $ARGUMENTS context
    Execute only the --light abbreviated pipeline (5 mandatory checks: color contrast 1.4.3, focus visibility 2.4.11, touch targets 2.5.8, form labels, heading hierarchy)
    The HIG workflow will apply fidelity calibration automatically based on artifact fidelity level
    Embed returned findings directly as Accessibility perspective findings
    Tag: [HIG skill -- /pde:hig --light]
  ELSE (fallback -- workflows/hig.md not found):
    Fall back to manual WCAG checklist:
    - Load @references/wcag-baseline.md
    - Check: Color contrast (WCAG 1.4.3), Focus visibility (2.4.11), Touch targets (2.5.8), Form labels, Heading hierarchy
    - Apply fidelity calibration from the calibration table below:
      - At lofi: color contrast findings are severity "nit" (placeholder colors only — not real product colors)
      - At midfi: color contrast findings are "minor" (placeholder colors still likely, but layout should use token references)
      - At hifi: color contrast failures are "major" or "critical" (real product colors applied)
    Tag: [Manual WCAG review -- install /pde:hig for enhanced accessibility audit]

  #### Perspective 4: Business Alignment (weight 1.0x)

  Evaluate against:
  - BRIEF_CONTEXT: product type, business goals, personas, constraints, scope boundaries, success metrics
  - FLOWS_CONTEXT: business outcomes per journey step, conversion checkpoints, drop-off risk points

  Key evaluation questions:
  - Do screens support the user journeys defined in the flows document?
  - Does feature emphasis match the product's positioning from the brief?
  - Are any out-of-scope features present? (check brief Scope Boundaries section)
  - Do primary CTAs align with persona goals stated in the brief?
  - Are product type constraints visible in the interaction model? (e.g., offline-first, B2B workflow, consumer onboarding)
  - Are brief constraints reflected? (e.g., platform constraints, accessibility requirements, data residency)
  - Does the screen sequence reflect the intended conversion funnel?

---

#### Fidelity-severity calibration table

Executors MUST apply this calibration when assigning severity to findings:

| Finding Type | Lo-fi Severity | Mid-fi Severity | Hi-fi Severity |
|--------------|----------------|-----------------|----------------|
| Missing screen for journey step | Critical | Critical | Critical |
| Color contrast failure | Skip (nit only if exact colors used) | Minor (placeholder colors) | Major/Critical |
| CTA prominence (visual weight) | Minor (structure only) | Major | Major |
| ARIA label missing | Major (structure visible in HTML) | Major | Critical |
| Token not applied | Skip | Minor | Major |
| Missing state variant (loading/error) | Minor | Major | Critical |
| Out-of-scope feature present | Major | Major | Major |
| Navigation inconsistency | Minor | Major | Major |

---

#### Score calculation per perspective

```
Score = 100 - (sum of finding penalties)
  Critical finding: -25 points
  Major finding: -10 points
  Minor finding: -4 points
  Nit: -1 point
  Floor: 0 (score never goes negative)
```

---

#### Finding format (every finding MUST include all fields)

Every finding produced in Step 4 MUST have ALL of the following:

- **Location:** screen-slug.html > section > element (CSS-selector-like path, e.g., `login.html > main > form > button.submit`)
- **Severity:** `critical` | `major` | `minor` | `nit`
- **Effort:** `quick-fix` | `moderate` | `significant`
- **Issue:** Specific description of what is wrong or problematic
- **Suggestion:** Concrete actionable fix with specific values — e.g., "Change font-size from `var(--font-size-xs)` to `var(--font-size-sm)`" NOT "increase font size"
- **Reference:** The standard or principle supporting this finding — e.g., "Nielsen H1", "WCAG 2.5.8", "Gestalt proximity"
- **Perspective:** Which of the four perspectives produced this finding (UX/Usability, Visual Hierarchy, Accessibility, Business Alignment)
- **Weight:** Perspective weight (1.5x for UX and Accessibility, 1.0x for Visual Hierarchy and Business Alignment)

---

#### Awwwards Dimension Mapping (apply to EVERY finding)

For each finding identified in any perspective, map it to one Awwwards dimension using quality-standards.md:

| Perspective Finding Type | Primary Awwwards Dimension | Weight |
|--------------------------|---------------------------|--------|
| Visual execution (typography, color, spacing, layout) | Design (40%) | Highest impact |
| Navigation, interaction, feedback, accessibility | Usability (30%) | Second impact |
| Conceptual originality, pattern repetition, template use | Creativity (20%) | Third impact |
| Content-design integration, copy quality, information density | Content (10%) | Fourth impact |

For each finding, state explicitly:
- **Awwwards dimension:** {Design | Usability | Creativity | Content}
- **Score impact:** {-N.N in [dimension] band} (e.g., "-0.5 in Design band")

Cross-reference the AI Aesthetic Flags column in quality-standards.md. If the finding matches a named flag, cite the flag name in the finding (see Step 4e below).

---

#### "What Works" identification (mandatory — CRT success criterion)

For each perspective evaluated, identify 1-3 specific intentional design decisions that are correct and MUST be preserved during iteration. This section is mandatory. Do not omit it.

Format as a table:

| Element | What's Working | Perspective | Keep It |
|---------|----------------|-------------|---------|
| {screen-slug.html > element} | {specific observation about what is correct and why} | {perspective name} | Yes — do not change in iteration |

Purpose: The /pde:iterate workflow reads this table to avoid undoing correct decisions while addressing findings.

---

#### Step 4e: AI Aesthetic Pattern Detection Pass

Load quality-standards.md AI Aesthetic Flags (all four dimensions).

For each wireframe examined, scan the HTML artifact for these named patterns:

**DESIGN flags:**
- **generic-gradient**: indigo-to-purple (#6366f1 to #8b5cf6), teal-to-blue, any 2-stop diagonal gradient background
  Remediation: "Replace with single OKLCH color or perceptual harmony palette from system tokens; gradients require documented rationale"
- **single-neutral-font**: Poppins or Inter used as sole typeface with no second font for display/brand purposes
  Remediation: "Add display/brand typeface with documented Vox-ATypI classification contrast rationale; Inter may remain for UI/body"
- **uniform-radius**: border-radius: 8px applied globally across cards, buttons, inputs, modals
  Remediation: "Vary radius by component role: micro (2-4px) for inputs, standard (8px) for cards, full (9999px) for pills"
- **tailwind-shadow**: box-shadow values matching Tailwind defaults (e.g., 0 1px 3px rgba(0,0,0,0.1))
  Remediation: "Design concept-specific shadow system with documented elevation model"

**CREATIVITY flags:**
- **hero-pattern-1**: hero section with centered heading + subheading + CTA button + gradient/image background
  Remediation: "Introduce concept-specific visual hook: off-grid headline position, unexpected grid, motion hook"
- **feature-pattern-2**: feature section with 3 equal columns, each with icon + heading + text paragraph
  Remediation: "Break equal columns with asymmetric weighting; vary information density per feature importance"
- **equal-stagger-scroll**: scroll animation applied to every element with identical stagger/entrance behavior
  Remediation: "Hierarchy-based choreography: primary elements enter first, secondary follow with narrative stagger"

**USABILITY flags:**
- **missing-focus-styles**: no :focus-visible styles or outline: none without replacement
  Remediation: "Add focus ring with minimum 3:1 contrast; use outline-offset: 2px for visual separation"
- **mobile-reflowed-desktop**: mobile layout is the desktop layout with narrowed columns
  Remediation: "Redesign mobile as distinct composition: stack to single column with reordered content priority"

**CONTENT flags:**
- **generic-copy**: "Transform your workflow", "Powerful features for your team", lorem ipsum in visible sections
  Remediation: "Replace with concept-specific copy that could only describe this product"
- **size-only-hierarchy**: headings differentiated from body only by font-size, not weight/style/classification
  Remediation: "Add weight contrast (400 body to 700 heading) or classification contrast (sans body to serif heading)"

Each detected AI aesthetic pattern:
- Named by flag name (e.g., "AI aesthetic: hero-pattern-1")
- Located specifically (element path in wireframe HTML)
- Severity: always major (AI aesthetic patterns are design-intent failures)
- Awwwards dimension cited
- Specific remediation instruction included (from list above, not generic "be more creative")

---

#### Step 4f: Motion Choreography Assessment

Examine the artifact for any animation/transition indicators (CSS transitions, GSAP patterns, @keyframes, JS animation hooks found in HTML or style blocks).

Four diagnostic criteria for purposeful motion:

| Criterion | Purposeful | Decorative/Random |
|-----------|-----------|-------------------|
| Hierarchical sequencing | Primary elements animate first; secondary follow in reading order | All elements animate simultaneously or with identical stagger |
| Functional trigger | Animation responds to a specific user action or content reveal moment | Animation plays on page load regardless of context |
| Spatial continuity | Related elements move in consistent directions (shared axis) | Elements move in arbitrary or conflicting directions |
| Temporal narrative | Timing creates a story arc: setup then content reveal then rest | Timing is arbitrary with no arc |

IF motion patterns present in the artifact:
  Evaluate against all 4 diagnostic criteria.
  State verdict: "Motion choreography: [purposeful/decorative/absent]"
  For each animation found:
    - Name the element animated
    - State which criterion it satisfies or fails
    - If decorative: provide specific remediation referencing motion-design.md choreography patterns
  Awwwards dimension: Creativity (20%)

IF no motion patterns present (common at lofi/midfi):
  State: "Motion: not specified at this fidelity. At mockup fidelity, assess: [list 2-3 concept-specific motion opportunities based on the artifact content type]"
  This proactive suggestion is the deliverable at lower fidelities, not a finding.

---

### Step 5/7: Write versioned critique report

#### 5a. Acquire write-lock

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire critique)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 5 seconds, retry up to 3 times. If still false after 3 retries: warn and continue (do not halt):
  ```
  Warning: Could not acquire write lock. Proceeding without lock.
    If concurrent writes occur, re-run /pde:critique to repair manifest state.
  ```

#### 5b. Assemble and write critique report

Assemble the full critique report using `@templates/critique-report.md` as the structural scaffold.

**Frontmatter:**
```yaml
---
Generated: "{ISO date, e.g., 2026-03-15}"
Skill: /pde:critique (CRT)
Version: v{VERSION}
Status: draft
Mode: "{full|quick|focused} ({fidelity note if mixed fidelity detected})"
Groups Evaluated: "UX/Usability, Visual Hierarchy, Accessibility, Business Alignment"
Enhanced By: "{list of MCPs used, e.g., 'Sequential Thinking MCP, Axe MCP' or 'none'}"
---
```

**Sections in order:**

1. `# Critique Report: Wireframes v{VERSION} ({fidelity})`

2. `## Summary Scorecard`

   Table:
   | Group | Score | Weight | Weighted |
   |-------|-------|--------|----------|
   | UX / Usability | {score}/100 | 1.5x | {score * 1.5} |
   | Visual Hierarchy | {score}/100 | 1.0x | {score * 1.0} |
   | Accessibility | {score}/100 | 1.5x | {score * 1.5} |
   | Business Alignment | {score}/100 | 1.0x | {score * 1.0} |
   | **Composite** | | | **{composite_score}** |

   Composite calculation: `(UX*1.5 + hierarchy*1.0 + a11y*1.5 + business*1.0) / 5.0`

   Letter grade:
   - 90-100: A (handoff-ready)
   - 80-89: B (iteration-recommended)
   - 70-79: C (iteration-required)
   - 60-69: D (major-revision-required)
   - Below 60: F (major-revision-required)

   Display: `**Overall:** {letter} | {numeric}/100 | {maturity_level}`

3. `## What Works`

   The table populated during Step 4's "What Works" identification. MUST NOT be omitted, even if sections were skipped via --focused. Minimum one row required.

4. `## Findings by Priority`

   All findings from Step 4 sorted by:
   - Primary: severity (critical first, then major, then minor, then nit)
   - Secondary: weight (1.5x before 1.0x within same severity)
   - Tertiary: effort (quick-fix ranked higher for actionability)

   Table columns: `#`, `Severity`, `Effort`, `Location`, `Issue`, `Suggestion`, `Perspective`, `Weight`

5. `## Detailed Findings by Perspective Group`

   A subsection for each perspective evaluated:
   ```
   ### UX / Usability

   **Score:** {score}/100
   **Rationale:** {1-2 sentence scoring rationale}

   **Finding {n}: {concise finding title}**
   - **Location:** {screen-slug.html > element path}
   - **Severity:** {severity} | **Effort:** {effort}
   - **Issue:** {detailed description}
   - **Suggestion:** {concrete fix with specific values}
   - **Reference:** {standard or principle}
   ```

6. `## Action List for /pde:iterate`

   Priority-ordered checkbox list for iterate consumption:
   ```
   - [ ] {finding_summary} — {severity}/{effort}
   ```
   Critical findings first, then major, then minor, then nits.

7. `## Resolved Findings (Cumulative)`

   Empty on first run. Populated by /pde:iterate on subsequent runs.
   ```
   *No resolved findings yet. Re-run /pde:critique after /pde:iterate to populate.*
   ```

8. Footer:
   ```
   *Generated by PDE-OS /pde:critique | {date} | Mode: {mode} | Groups: {group_list}*
   {If HIG skill was used for Perspective 3: "[Accessibility by /pde:hig --light]"}
   {If fallback WCAG checklist was used: "[Manual WCAG review -- install /pde:hig for enhanced accessibility audit]"}
   ```

Use the Write tool to write to `.planning/design/review/CRT-critique-v{VERSION}.md`.

#### 5c. Release write-lock

**ALWAYS release, even if an error occurred:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release critique
```

Display: `Step 5/7: Critique report written to .planning/design/review/CRT-critique-v{VERSION}.md`

---

### Step 6/7: Update ux domain DESIGN-STATE

Use the Glob tool to check for `.planning/design/ux/DESIGN-STATE.md`.

**If it does NOT exist:** Create it with the standard ux domain structure including an "Open Critique Items" table:

```markdown
# UX Domain Design State

Updated: {YYYY-MM-DD}
Domain: ux

## Artifact Index

| Code | Name | Skill | Status | Version | Enhanced By | Notes | Updated |
|------|------|-------|--------|---------|-------------|-------|---------|
| CRT | Design Critique | /pde:critique | draft | v{VERSION} | {MCPs used or none} | | {YYYY-MM-DD} |

## Open Critique Items

| ID | Source | Severity | Status |
|----|--------|----------|--------|
```

**If it already exists:** Use the Read tool to read it, then use the Edit tool to apply these updates:

1. Add or update the CRT row in the Artifact Index table:
   ```
   | CRT | Design Critique | /pde:critique | draft | v{VERSION} | {MCPs used or none} | | {YYYY-MM-DD} |
   ```

2. Find the "Open Critique Items" table section. For each Critical and Major finding from the critique report:
   ```
   | {finding_id, e.g., CRT-01} | CRT-critique-v{VERSION}.md | {critical|major} | open |
   ```

   Minor and nit findings are NOT added to DESIGN-STATE. This keeps the Open Critique Items table focused on action-required items only.

Display: `Step 6/7: {N} critical/major findings added to ux/DESIGN-STATE.md Open Critique Items.`

---

### Step 7/7: Update root DESIGN-STATE + manifest + coverage flag

#### 7a. Update root DESIGN-STATE.md

Use the Read tool to read `.planning/design/DESIGN-STATE.md`. Then use the Edit tool to update the Pipeline Progress table to mark Critique as complete with the current date.

Add or update the CRT row in any artifact tracking tables. Add an entry to the Decision Log:
```
| CRT | critique generated, fidelity: {fidelity}, {screen_count} screens, score: {composite}/100 | {YYYY-MM-DD} |
```

Add an entry to the Iteration History:
```
| CRT-critique-v{VERSION}.md | v{VERSION} | Created by /pde:critique | {YYYY-MM-DD} |
```

#### 7b. Register CRT artifact in manifest (7 calls — same pattern as wireframe.md)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT code CRT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT name "Design Critique"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT type critique
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT domain review
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT path ".planning/design/review/CRT-critique-v${VERSION}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT version ${VERSION}
```

#### 7c. Set coverage flag (CRITICAL — read-before-set to prevent clobber)

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON output from coverage-check. Extract ALL thirteen current flag values: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations. Default any absent field to `false`. Merge `hasCritique: true` while preserving all other twelve values. Then write the full merged thirteen-field object:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":true,"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

#### 7d. Output summary table (per skill-style-guide.md)

```
## /pde:critique Summary

| Property | Value |
|----------|-------|
| Report | .planning/design/review/CRT-critique-v{VERSION}.md |
| Screens Critiqued | {N} |
| Fidelity | {fidelity} |
| Composite Score | {score}/100 ({letter}) |
| Maturity | {maturity_level} |
| Critical Findings | {count} |
| Major Findings | {count} |
| Total Findings | {count} |
| What Works | {count} items preserved |
| Enhanced By | {MCP list or 'none'} |

Next steps:
  - Review critique: open .planning/design/review/CRT-critique-v{VERSION}.md
  - Run /pde:iterate to address findings
  - Re-run /pde:critique after iteration to verify improvements
```

Display: `Step 7/7: Manifest updated. Coverage: hasCritique = true. Done.`

---

## Anti-Patterns

NEVER do any of the following:

- Proceed past Step 2c when BRIEF_AVAILABLE is false AND FLOWS_AVAILABLE is false — the hard-block error is mandatory and protects output quality
- Omit the "What Works" section — it is mandatory even when --focused flag narrows perspectives; minimum one row required
- Set designCoverage without reading coverage-check first — `manifest-set-top-level` replaces the ENTIRE designCoverage object; skipping coverage-check resets flags set by other skills
- Use perspective-only vague suggestions — every suggestion MUST include specific values (token names, exact numbers, concrete element changes)
- Add Minor or Nit findings to DESIGN-STATE Open Critique Items — only Critical and Major findings belong there
- Skip the lock-release in Step 5c — always release the lock even on error
- Invoke /pde:hig --light when wireframe files are not confirmed present — HIG --light requires an auditable artifact; verify artifacts exist before delegation
- Produce findings without Reference field — every finding needs a grounding standard (Nielsen heuristic, WCAG criterion, Gestalt principle, etc.)
- Apply hifi severity calibration to lofi wireframes — fidelity calibration table in Step 4 is mandatory
- Omit the Action List for /pde:iterate section — the iterate skill reads this checklist to know what to address

</process>

<output>
- `.planning/design/review/CRT-critique-v{N}.md` — versioned critique report with Summary Scorecard, What Works, Findings by Priority, Detailed Findings by Perspective, Action List for /pde:iterate, and Resolved Findings (empty on first run)
- `.planning/design/ux/DESIGN-STATE.md` — ux domain state updated with CRT artifact row; Critical and Major findings added to Open Critique Items table
- `.planning/design/DESIGN-STATE.md` — root state updated (Pipeline Progress, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with CRT artifact entry and hasCritique: true in designCoverage
</output>
