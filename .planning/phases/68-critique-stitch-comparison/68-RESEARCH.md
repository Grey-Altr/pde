# Phase 68: Critique Stitch Comparison — Research

**Researched:** 2026-03-20
**Domain:** critique.md workflow modification, Stitch artifact detection, DTCG token suppression, multimodal PNG analysis
**Confidence:** HIGH (all infrastructure from Phases 65-67 is directly readable; critique.md is fully documented and traced)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRT-01 | `/pde:critique` detects Stitch-sourced artifacts (via `source: "stitch"` in manifest) and applies Stitch-aware evaluation mode | `manifest-read` command exists in pde-tools.cjs; manifest `artifacts` object stores per-artifact `source` field set by wireframe.md Phase 66; detection reads design-manifest.json before Step 4 begins |
| CRT-02 | Stitch-aware mode suppresses DTCG token-format consistency checks (Stitch uses hardcoded hex, not OKLCH custom properties) | `Token not applied` row in fidelity-severity calibration table (critique.md line 353) is the exact check that false-positives; suppression = flag that STITCH_SOURCE skips that finding type; hifi calibration makes these Major findings without suppression |
| CRT-03 | Multimodal critique uses Claude's image reading to analyze Stitch PNG screenshots alongside HTML source | Claude Code's `Read` tool natively reads PNG files as images; STH-{slug}.png already exists in `.planning/design/ux/wireframes/` (Phase 66); critique Step 2d glob already discovers `.html` files in that directory; PNG reading is additive: Read STH-{slug}.png after Read STH-{slug}.html |
| CRT-04 | Critique compares Stitch output against design system tokens and flags divergences as recommendations (not failures) | Design system tokens in `.planning/design/visual/SYS-tokens-v{N}.css` and `assets/tokens.json` (if exists); Stitch Comparison section is additive — appended after existing 4-perspective report sections; divergences are `## Stitch Comparison` not findings |

</phase_requirements>

---

## Summary

Phase 68 modifies `workflows/critique.md` in three targeted places. The work is entirely a workflow modification — no new pde-tools.cjs commands, no new mcp-bridge.cjs exports, no new Node.js scripts. The three insertion points are: (1) **Step 2d extension** — after discovering wireframes, read the manifest to classify each file as Stitch-sourced or Claude-sourced; (2) **Step 4 suppression gate** — when evaluating a Stitch artifact at hifi fidelity, skip the "Token not applied" finding type from the fidelity-severity calibration table and add a note that Stitch uses hardcoded hex values; and (3) **Step 5b extension** — after writing the standard 7-section report, append a `## Stitch Comparison` section for each Stitch-sourced artifact that includes: token compliance percentage, properties that deviate from the design system, novel patterns found in Stitch output, and patterns present in the design system but absent from Stitch output.

The multimodal image reading component (CRT-03) integrates at Step 4: for each Stitch-sourced HTML file, also read its paired PNG file (STH-{slug}.png) using the Read tool (which Claude Code natively handles as image content), then produce visual observations that reference what is visible in the screenshot rather than just the HTML structure.

The critical design insight is that the existing 4-perspective critique (`## Findings by Priority`, `## Detailed Findings by Perspective`, `## Summary Scorecard`) is preserved entirely. Phase 68 ADDS a Stitch Comparison section — it does NOT replace the existing structure. The composite score and letter grade still reflect the 4-perspective evaluation.

**Primary recommendation:** Implement as a single workflow-modification plan (critique.md only — three insertion points) plus a Nyquist test plan covering all 4 requirements.

---

## Standard Stack

### Core (all from Phases 65-66 — already shipped)

| Module | Version | Purpose | Why Standard |
|--------|---------|---------|--------------|
| `bin/pde-tools.cjs` | Phase 65 | `design manifest-read` — reads all artifact entries including `source` field | Only authorised way to read design-manifest.json; returns full JSON |
| `bin/pde-tools.cjs` | Phase 65 | `design coverage-check` + `manifest-set-top-level` | Read-before-set pattern for hasCritique coverage flag |
| Claude Code `Read` tool | Built-in | Reads `.html` files (HTML source) AND `.png` files (image content for multimodal analysis) | Read tool has native multimodal support — PNG files are rendered as images, not text |
| Node.js built-in test runner | Built-in | Nyquist tests | Established project pattern: `node --test tests/phase-68/*.test.mjs` |

### Supporting

| Module | Version | Purpose | When to Use |
|--------|---------|---------|-------------|
| `.planning/design/design-manifest.json` | Phase 66 | Contains `artifacts.STH-{slug}.source === "stitch"` and `artifacts.STH-{slug}.stitch_annotated === true` | Read via `pde-tools design manifest-read` in new Step 2g |
| `.planning/design/visual/SYS-tokens-v{N}.css` | Phase system | Project design tokens — OKLCH custom properties | Stitch Comparison section diffs against these token definitions |
| `assets/tokens.json` | Phase system | DTCG canonical token source (7 categories) | Secondary token source if CSS file not found |

### No New npm Dependencies

Zero-npm constraint is project policy (REQUIREMENTS.md Out of Scope). No new libraries needed.

---

## Architecture Patterns

### Workflow Insertion Map

Phase 68 adds exactly 3 insertion points to `workflows/critique.md`. All other steps run unchanged.

```
/pde:critique [screens] [flags]

Step 1/7: Initialize design directories             ← unchanged
Step 2/7: Check prerequisites + discover wireframes
  2a-2e: (unchanged)
  *** 2g. NEW: Read manifest, classify STH vs WFR artifacts ***
Step 3/7: Probe MCP availability                    ← unchanged
Step 3.5: Pencil screenshot                         ← unchanged
Step 4/7: Evaluate wireframes across four perspectives
  Per-file evaluation loop:
    Read HTML (unchanged)
    *** If STITCH_SOURCE: also Read PNG for multimodal analysis ***
    Perspective 1-4 evaluation (unchanged)
    *** DTCG token suppression: skip "Token not applied" for STITCH_SOURCE ***
Step 5/7: Write versioned critique report
  5b. Assemble report (existing 7 sections unchanged)
  *** 5b-STITCH. NEW: Append ## Stitch Comparison section ***
Step 6/7: Update ux DESIGN-STATE                    ← unchanged
Step 7/7: Update root DESIGN-STATE + manifest + coverage ← unchanged
```

### Pattern 1: Manifest-Based Stitch Detection (CRT-01)

**What:** After Step 2e (fidelity map built), read the manifest to classify each wireframe in WIREFRAME_FILES as Stitch-sourced or Claude-sourced.

**Step insertion:** New Step 2g, after Step 2f (version gate), before Step 3.

```markdown
#### 2g. Classify artifacts by source (Stitch vs Claude)

Read the design manifest:

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

Parse the JSON output. For each file in WIREFRAME_FILES:
- Extract the slug from the filename (e.g., `STH-login.html` → slug `STH-login`)
- Look up `manifest.artifacts[slug].source`
- If `source === "stitch"`: add slug to STITCH_ARTIFACTS list; note paired PNG path as `STH-{slug-without-prefix}.png`

Wait — the file is named `STH-login.html` but the manifest key is `STH-login`. The slug for PNG lookup uses the same stem: `STH-login.png`.

Correction: STH-{slug}.html is the full filename. The manifest code is `STH-{slug}`. The PNG is `STH-{slug}.png` in the same directory.

- If manifest read fails (file not found or invalid JSON): SET STITCH_ARTIFACTS = []. Log: "Warning: Could not read design manifest — Stitch artifact detection skipped."
- If WIREFRAME_FILES contains STH-*.html files but manifest entry has no `source` field: treat as non-Stitch (conservative — avoids false suppression).

SET STITCH_ARTIFACTS = [list of STH-{slug} codes where source === "stitch"]

Display: `Step 2/7: {N} Stitch artifact(s) detected: {slug-list}. Stitch-aware evaluation mode active.`
Or if empty: `Step 2/7: No Stitch artifacts detected. Standard evaluation mode.`
```

**Why `manifest-read` not `coverage-check`:** `coverage-check` returns only the 14 boolean flags — it does not expose per-artifact `source` fields. `manifest-read` returns the full `artifacts` object which includes `source: "stitch"` per entry.

### Pattern 2: DTCG Token Suppression in Step 4 Evaluation (CRT-02)

**What:** The fidelity-severity calibration table at critique.md line 353 includes "Token not applied | Skip | Minor | **Major**" — this row would fire for every Stitch hifi artifact because Stitch produces hardcoded hex values (e.g., `color: #3b82f6`) rather than OKLCH custom properties (`color: var(--color-action)`). The suppression gate prevents this from generating Major findings on Stitch artifacts.

**Insertion point:** In Step 4, inside the per-file evaluation loop, before Perspective 2 (Visual Hierarchy) evaluation begins. This is where "design token application" is checked.

```markdown
#### Stitch token-format suppression (when STITCH_SOURCE is true for current file)

IF current wireframe file is in STITCH_ARTIFACTS:
  SET STITCH_SOURCE = true

  Note in the evaluation context:
  "This artifact was generated by Google Stitch (source: stitch in manifest).
   Stitch produces hardcoded hex color values and numeric spacing values rather
   than OKLCH custom properties and CSS token references.
   DTCG token-format consistency findings (fidelity-severity row: 'Token not applied')
   are SUPPRESSED for this artifact. Token divergences will be reported in the
   ## Stitch Comparison section, not as findings."

  SUPPRESS_TOKEN_FINDINGS = true

IF SUPPRESS_TOKEN_FINDINGS is true AND finding type is "Token not applied" (any fidelity):
  Skip this finding. Do NOT add to findings list. Do NOT deduct from score.

ELSE: Apply standard fidelity-severity calibration (unchanged).
```

**The exact suppression scope:** Only the "Token not applied" finding type from the fidelity-severity calibration table is suppressed. All other finding types (color contrast, ARIA, CTA prominence, missing states, etc.) are evaluated normally even for Stitch artifacts. Color contrast findings at hifi still fire at Major/Critical severity — Stitch's hardcoded hex values make these checkable.

**Important distinction:** Color contrast (WCAG 1.4.3) remains active. It is the *token format compliance* check that is suppressed, not color usage evaluation. A Stitch artifact with poor contrast ratios still gets flagged.

### Pattern 3: Multimodal PNG Reading for Visual Analysis (CRT-03)

**What:** For each Stitch-sourced HTML file, also read the paired PNG screenshot using the Read tool. Claude Code's Read tool natively handles PNG files as multimodal image content — the file is rendered as an image in Claude's context, enabling visual observations about layout, color, spacing, and visual hierarchy that cannot be derived from HTML source alone.

**Insertion point:** In Step 4, per-file evaluation loop, immediately after `Use the Read tool to read the wireframe HTML content.`

```markdown
#### Read Stitch PNG for visual analysis (when STITCH_SOURCE is true)

IF current file is in STITCH_ARTIFACTS:
  Construct PNG path: replace `.html` with `.png` from current file path.
  E.g., `.planning/design/ux/wireframes/STH-login.html` → `.planning/design/ux/wireframes/STH-login.png`

  Use the Read tool to read the PNG file.

  If Read succeeds (image content returned):
    SET HAS_PNG = true
    Store image as STITCH_PNG_{slug} for use in evaluation
    Log: `  -> STH-{slug}.png loaded for visual evaluation.`

  If Read fails (file not found):
    SET HAS_PNG = false
    Log: `  -> Warning: STH-{slug}.png not found. Visual evaluation will use HTML source only.`

When writing findings for this artifact (all four perspectives):
  IF HAS_PNG:
    At least one visual observation per perspective MUST reference what is visible in the
    screenshot image rather than only what is in the HTML source.

    Examples of image-derived observations (valid for CRT-03 success criterion):
    - "In the screenshot, the primary CTA button appears visually low-contrast against the
       background despite the HTML source using color: #3b82f6"
    - "The screenshot shows that the card shadows create visible elevation, though the HTML
       uses box-shadow values not present in the design system"
    - "Visual inspection of the screenshot reveals that the navigation hierarchy reads clearly
       from left to right, consistent with the intended information architecture"
```

**Why this works:** Claude Code's Read tool documentation confirms that when reading image files (PNG, JPG, etc.), the file content is presented visually as multimodal input. This is distinct from reading HTML — the model receives the actual rendered image. Observations from the screenshot reference visual properties (apparent contrast, visual weight, composition, spacing perception) that are independent of HTML structure.

### Pattern 4: Stitch Comparison Section Format (CRT-04)

**What:** Appended after the standard 7-section report in Step 5b. One `## Stitch Comparison` section covers all Stitch artifacts in the run. This section contains the per-screen delta report.

**Insertion point:** After section 8 (Footer) in Step 5b, as section 9 — conditional on STITCH_ARTIFACTS being non-empty.

```markdown
#### 5b-STITCH. Append Stitch Comparison section (conditional)

IF STITCH_ARTIFACTS is non-empty:
  Read the project design tokens to build comparison baseline:
  1. Use Glob to find `.planning/design/visual/SYS-tokens-v*.css` — sort descending, read highest version
  2. If not found: use Glob to find `assets/tokens.json` — read if present
  3. If neither found: note "Design system tokens not available for comparison" in section header

  Write the ## Stitch Comparison section after the Footer:
```

```markdown
## Stitch Comparison

> This section compares Stitch-generated artifacts against the project design system.
> Divergences are reported as recommendations, not scored findings.
> The composite score above reflects the standard 4-perspective evaluation only.

{for each slug in STITCH_ARTIFACTS:}

### STH-{slug} Delta Report

**Source:** Google Stitch (hardcoded hex values, no OKLCH custom properties)
**Design System Baseline:** {SYS-tokens-v{N}.css path or "not available"}

#### Token Compliance

| Category | Stitch Value Found | Design System Token | Compliance |
|----------|--------------------|---------------------|-----------|
| Primary color | `{hex from HTML}` | `--color-primary-500: oklch(...)` | ❌ Non-compliant (hex vs OKLCH) |
| Background | `{hex from HTML}` | `--color-bg-default: oklch(...)` | ❌ / ✅ |
| Border radius | `{px value}` | `--radius-md: {value}` | ❌ / ✅ |
| Font family | `{font-family value}` | `--font-family-body: {value}` | ❌ / ✅ |
| {additional tokens found} | | | |

**Token compliance:** {N}% ({compliant_count}/{total_checked} token categories matched)

#### Properties Deviating from Design System

List each property where Stitch value diverges from the design system token:

- `color: #3b82f6` — use `var(--color-action)` (`oklch(0.59 0.21 264)`) instead
- `border-radius: 8px` — use `var(--radius-md)` if 8px matches, otherwise evaluate
- `font-family: Inter, sans-serif` — verify against `--font-family-body`

#### Novel Patterns in Stitch Output

List patterns present in the Stitch output that are NOT in the design system:

- {Pattern}: {description of what it does and whether it should be adopted}
- Example: "Stitch uses a `0.5px solid rgba(0,0,0,0.08)` border on cards — not in design system shadow/border tokens. Consider adding as --border-subtle."

If no novel patterns found: "No novel patterns detected. Stitch output aligns with existing design system conventions."

#### Patterns in Design System Absent from Stitch Output

List design system tokens that appear UNUSED in the Stitch output:

- `--color-secondary-*` palette: not referenced in Stitch output
- `--motion-*` tokens: no animation patterns in Stitch output
- Dark mode variables (`@media (prefers-color-scheme: dark)`): not implemented in Stitch output

If design system tokens not available: Skip this section. Note: "Run /pde:system first to generate design system tokens for comparison."

#### Recommendations

{1-3 actionable recommendations for reconciling Stitch output with the design system}

Example:
1. Run hex-to-OKLCH conversion on extracted color values before handoff (Phase 69 /pde:handoff --use-stitch implements this automatically)
2. Component {ComponentName} in Stitch uses a 12px radius vs design system 8px — align before handoff
3. Stitch's Inter-only typography is compatible with the design system body font; add display font for headings per design system spec

{end per-slug loop}
```

### Pattern 5: Recommendation vs Finding Distinction

**Critical:** Stitch Comparison content uses "recommendations" not "findings". This is a deliberate architectural decision from CRT-04. The rationale:

- **Findings** (in the 4-perspective section) = actionable items that affect the composite score, must be resolved before handoff, included in the Action List for /pde:iterate
- **Recommendations** (in the Stitch Comparison section) = informational divergences that inform Phase 69 handoff, do NOT affect the composite score, are NOT added to the Action List for /pde:iterate, are NOT added to DESIGN-STATE Open Critique Items

The Stitch Comparison section does NOT produce scored findings. It is a delta report. This is why CRT-02 says "flag divergences as recommendations (not failures)".

### Pattern 6: ESM createRequire for manifest-read

All bash blocks calling pde-tools.cjs in workflow context follow the existing critique.md pattern (bare `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs"` with shell variable interpolation — no ESM wrapper needed). The `manifest-read` command uses the same invocation pattern as all other pde-tools.cjs calls in critique.md:

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

This matches the `INIT`, `LOCK`, `COV` variable patterns already in critique.md. No `node --input-type=module` wrapper needed — pde-tools.cjs is a CJS module called directly, not via import.

### Anti-Patterns to Avoid

- **Replacing the 4-perspective evaluation for Stitch artifacts:** CRT requirements explicitly state Stitch mode ADDS a Stitch Comparison section without replacing the existing critique. Run all four perspectives on Stitch artifacts (with token suppression where applicable).
- **Suppressing color contrast findings for Stitch:** CRT-02 suppresses DTCG token-format checks (whether a custom property is used vs hardcoded hex). It does NOT suppress WCAG contrast ratio checks. Stitch hex values are fully checkable for 4.5:1 ratio.
- **Suppressing all token-related findings:** Only the "Token not applied" calibration row is suppressed. The "generic-gradient" AI aesthetic flag still fires if Stitch uses indigo-to-purple gradients.
- **Adding Stitch Comparison findings to the Action List:** The Action List is for /pde:iterate. Stitch divergences are reconciled by /pde:handoff (Phase 69), not iterate. Stitch Comparison recommendations must NOT appear in the Action List section.
- **Adding Stitch Comparison findings to DESIGN-STATE Open Critique Items:** Only Critical/Major findings from the 4-perspective evaluation go there. Stitch Comparison recommendations are excluded.
- **Failing if PNG is missing:** PNG reading is a best-effort enhancement. If STH-{slug}.png doesn't exist, critique still runs using HTML source only. Non-blocking.
- **Reading design-manifest.json directly:** Always use `pde-tools.cjs design manifest-read`. The pde-tools wrapper handles file location, parsing, and @file: prefix pattern.
- **Forgetting to preserve the 14-field designCoverage in Step 7c:** The existing `hasCritique: true` write in Step 7c is unchanged. Phase 68 does not add a new coverage flag. No changes to Step 7.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading the design manifest to detect `source: "stitch"` | Direct `fs.readFileSync(.planning/design/design-manifest.json)` in a bash block | `pde-tools.cjs design manifest-read` | Same wrapper used everywhere else; handles @file: pattern; avoids hardcoded path |
| Parsing design tokens from SYS-tokens CSS | Custom CSS parser | Read the file as text, regex-extract `--token-name: value;` lines | CSS custom property syntax is trivial to extract without a parser |
| Hex-to-OKLCH conversion | Custom color math | Document divergence as-is in the Stitch Comparison table | Phase 69 (handoff) has HND-02 for hex-to-OKLCH conversion; critique should report, not convert |
| Coverage flag update | Direct JSON write | `coverage-check` + `manifest-set-top-level` 14-field object (unchanged from existing Step 7c) | Mandatory read-before-set pattern prevents clobbering |
| Manifest source field lookup | Custom file scan | `manifest-read` JSON output: `manifest.artifacts[slug].source` | Authoritative source — Phase 66 wrote this field |
| PNG file existence check | Custom `fs.existsSync` bash block | Attempt `Read tool` on PNG path; handle gracefully if failed | Simpler — if Read fails, HAS_PNG = false; avoids extra bash probe |

**Key insight:** Phase 68 is nearly zero new infrastructure. The entire implementation is prose additions to critique.md at three insertion points, plus Nyquist tests that verify the prose additions by string-matching the workflow file.

---

## Common Pitfalls

### Pitfall 1: Token Suppression Scope Creep
**What goes wrong:** The DTCG suppression gate accidentally also suppresses color contrast findings, or the "generic-gradient" AI aesthetic flag, or ARIA label checks — making Stitch artifacts look better than they are.
**Why it happens:** Conflating "token format check" with "all visual quality checks."
**How to avoid:** The suppression gate targets exactly ONE row in the fidelity-severity calibration table: `| Token not applied | ... | Major |`. Check by name: `finding.type === 'token-not-applied'` or equivalent prose. All other calibration rows are unaffected.
**Warning signs:** CRT-02 Nyquist test passes, but Stitch artifacts score unrealistically high (no contrast failures, no ARIA issues, no AI aesthetic flags).

### Pitfall 2: Stitch Comparison Findings in Action List
**What goes wrong:** Recommendations from the `## Stitch Comparison` section appear in the `## Action List for /pde:iterate` section. The /pde:iterate workflow then tries to fix Stitch-specific color token divergences, which is not iterate's job.
**Why it happens:** The report assembly in Step 5b generates findings broadly, then the Action List section consolidates them.
**How to avoid:** The Action List section reads from the 4-perspective findings list explicitly. In Step 5b (Action List construction), state: "Only findings from the 4-perspective evaluation appear here. Stitch Comparison recommendations are NOT included in the Action List."
**Warning signs:** Action List contains items like "Replace `color: #3b82f6` with OKLCH token" — this is a handoff task, not an iterate task.

### Pitfall 3: PNG Read Blocking Critique
**What goes wrong:** PNG file doesn't exist (e.g., wireframe was generated before Phase 66 added PNG fetch, or user deleted it), causing critique to halt.
**Why it happens:** PNG reading fails and the workflow doesn't handle the failure gracefully.
**How to avoid:** PNG reading must be non-blocking. If Read tool fails on the PNG path, SET HAS_PNG = false, log a warning, continue with HTML-only evaluation. The CRT-03 requirement says "Claude reads the STH-{slug}.png screenshot file" — but the success criterion assumes the file exists from Phase 66. A missing PNG is a degraded-mode scenario, not a failure.
**Warning signs:** Critique halts with "file not found" on a PNG path.

### Pitfall 4: False Stitch Detection (stitch_annotated Without source Check)
**What goes wrong:** Critique applies Stitch-aware mode to a Claude-generated artifact that happens to have `stitch_annotated: true` set by error.
**Why it happens:** Detection logic checks `stitch_annotated` instead of `source`.
**How to avoid:** Detection MUST check `manifest.artifacts[slug].source === "stitch"`. The `stitch_annotated` flag is a downstream utility marker (for handoff). Only `source: "stitch"` is the authoritative Stitch indicator.
**Warning signs:** A WFR-{slug}.html artifact enters Stitch-aware mode unexpectedly.

### Pitfall 5: Composite Score Affected by Stitch Comparison
**What goes wrong:** Token compliance percentage from the Stitch Comparison section somehow feeds into the composite score calculation.
**Why it happens:** The report assembly logic doesn't isolate the Stitch Comparison section from the scoring path.
**How to avoid:** The composite score is calculated from the 4-perspective evaluation only. The Stitch Comparison section is written AFTER the score is finalized. Its content is purely informational. The frontmatter "Groups Evaluated" field does NOT include a "Stitch Comparison" group.
**Warning signs:** Composite score drops because token compliance is 0% for Stitch artifacts.

### Pitfall 6: Missing Design System Tokens for Comparison
**What goes wrong:** Stitch Comparison section crashes or omits the comparison table because SYS-tokens CSS and assets/tokens.json both don't exist.
**Why it happens:** User hasn't run /pde:system yet, or the project is in an early state.
**How to avoid:** Token availability is a soft dependency for the Stitch Comparison section. If no tokens file found, the section should state "Design system tokens not available for comparison. Run /pde:system first." and skip the comparison table, but still write the "Novel Patterns" and "Recommendations" subsections if possible.
**Warning signs:** Stitch Comparison section is empty or the workflow halts looking for tokens.

### Pitfall 7: Stitch Comparison Section After Every Run (Not Just Stitch Runs)
**What goes wrong:** The `## Stitch Comparison` section appears in non-Stitch critique runs, either empty or with misleading content.
**Why it happens:** The conditional check on STITCH_ARTIFACTS being non-empty is omitted.
**How to avoid:** The `## Stitch Comparison` section is ONLY written when `STITCH_ARTIFACTS` is non-empty. When all wireframes are Claude-generated, the report ends after the standard Footer. No `## Stitch Comparison` heading appears.
**Warning signs:** Non-Stitch critique reports contain a `## Stitch Comparison` section with "no artifacts found."

---

## Code Examples

Verified patterns from project codebase analysis:

### Step 2g: Manifest Read and Stitch Classification

```markdown
#### 2g. Classify artifacts by source (Stitch vs Claude)

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

Parse the JSON output. For each file path in WIREFRAME_FILES:
- Extract the artifact code from the filename stem (e.g., `STH-login.html` → code `STH-login`)
- Look up `manifest.artifacts["STH-login"].source` in the parsed JSON
- If `source === "stitch"`: add code to STITCH_ARTIFACTS

If manifest-read returns null or fails: SET STITCH_ARTIFACTS = []. Log warning. Continue.
```

### Step 4 Stitch Source Detection and Suppression Gate

```markdown
For each wireframe file in WIREFRAME_FILES:

  Use the Read tool to read the wireframe HTML content.
  Determine fidelity from FIDELITY_MAP for severity calibration.

  #### Stitch source gate

  Extract artifact code from current file path (e.g., `STH-login.html` → `STH-login`).
  IF artifact code is in STITCH_ARTIFACTS:
    SET STITCH_SOURCE = true
    SET SUPPRESS_TOKEN_FINDINGS = true

    Construct paired PNG path: same directory, replace `.html` with `.png`
    Use the Read tool to read the PNG file.
    - If PNG read succeeds (image content present): SET HAS_PNG = true
    - If PNG read fails: SET HAS_PNG = false. Log: "STH-{slug}.png not found — HTML evaluation only."
  ELSE:
    SET STITCH_SOURCE = false
    SET SUPPRESS_TOKEN_FINDINGS = false
    SET HAS_PNG = false
```

### Perspective 2 Token Suppression Application

```markdown
  #### Perspective 2: Visual Hierarchy (weight 1.0x)

  ...existing evaluation logic unchanged...

  For design token application checks:
  IF SUPPRESS_TOKEN_FINDINGS is true:
    Skip any findings of type "Token not applied" (fidelity-severity table row 5).
    Add inline note to Perspective 2 findings:
    "[Token-format findings suppressed: Stitch artifact uses hardcoded hex values —
    see ## Stitch Comparison for divergence report]"
  ELSE:
    Apply standard fidelity-severity calibration for "Token not applied" row.
```

### CRT-03 Visual Observation Requirements

```markdown
  #### Visual observations from screenshot (when HAS_PNG is true)

  After evaluating all four perspectives using HTML source:
  Review the screenshot image loaded by the Read tool.

  For EACH perspective, include at least one observation that references
  what is VISIBLE IN THE IMAGE (not derivable from HTML alone). Examples:

  - Perspective 1 (UX): "The screenshot reveals that the form submit button
    appears visually buried — the visual weight is similar to secondary actions
    despite the HTML marking it as primary"
  - Perspective 2 (Visual Hierarchy): "In the screenshot, the card grid
    lacks visual separation — the box-shadow values in HTML produce imperceptible
    elevation at screen resolution"
  - Perspective 3 (Accessibility): "Screenshot shows the checkbox controls
    use color alone (no border visible on light background) to convey checked state"
  - Perspective 4 (Business Alignment): "The screenshot shows the pricing CTA
    competes visually with the support link — both appear equal weight"
```

### Stitch Comparison Section Assembly

```markdown
#### 5b-STITCH. Stitch Comparison section (append after Footer — conditional)

IF STITCH_ARTIFACTS is empty: Skip this section entirely.

IF STITCH_ARTIFACTS is non-empty:
  Find design system tokens:
  ```bash
  # Using Glob tool: .planning/design/visual/SYS-tokens-v*.css
  # Sort descending by version, use highest version
  ```

  Write the ## Stitch Comparison section content (format per Architecture Pattern 4).

  For each artifact in STITCH_ARTIFACTS:
    Parse HTML source to extract all hardcoded color values (regex: /#[0-9a-fA-F]{3,8}/g),
    spacing values (regex: /:\s*\d+px/g), and border-radius values.

    If design system tokens available:
      Compare each extracted value against the tokens CSS file.
      Build compliance table row per category.
      Compute compliance percentage.

    Write the delta report in the format specified in Architecture Pattern 4.
```

### Nyquist Test Pattern (file parse assertions)

```javascript
// Source: Phase 67 test pattern — tests/phase-67/diverge-stitch-flag.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const critiqueMd = readFileSync(resolve(ROOT, 'workflows', 'critique.md'), 'utf8');

describe('CRT-01: Stitch artifact detection', () => {
  test('critique.md reads design manifest for source classification', () => {
    assert.ok(
      critiqueMd.includes('manifest-read'),
      'critique.md missing manifest-read command for Stitch detection'
    );
  });

  test('critique.md references STITCH_ARTIFACTS list', () => {
    assert.ok(
      critiqueMd.includes('STITCH_ARTIFACTS'),
      'critique.md missing STITCH_ARTIFACTS variable'
    );
  });

  test('critique.md checks source === "stitch" from manifest', () => {
    assert.ok(
      critiqueMd.includes('source') && critiqueMd.includes('stitch'),
      'critique.md missing source:stitch detection logic'
    );
  });
});

describe('CRT-02: Token suppression for Stitch', () => {
  test('SUPPRESS_TOKEN_FINDINGS variable present', () => {
    assert.ok(
      critiqueMd.includes('SUPPRESS_TOKEN_FINDINGS'),
      'critique.md missing SUPPRESS_TOKEN_FINDINGS gate'
    );
  });

  test('Token not applied suppressed for Stitch source', () => {
    assert.ok(
      critiqueMd.includes('Token not applied') && critiqueMd.includes('SUPPRESS'),
      'critique.md missing Token not applied suppression for Stitch'
    );
  });
});

describe('CRT-03: Multimodal PNG reading', () => {
  test('STH PNG path constructed from HTML path', () => {
    assert.ok(
      critiqueMd.includes('.png') && critiqueMd.includes('STH-'),
      'critique.md missing STH PNG path construction'
    );
  });

  test('HAS_PNG variable tracks PNG availability', () => {
    assert.ok(
      critiqueMd.includes('HAS_PNG'),
      'critique.md missing HAS_PNG variable'
    );
  });
});

describe('CRT-04: Stitch Comparison section', () => {
  test('## Stitch Comparison section present', () => {
    assert.ok(
      critiqueMd.includes('## Stitch Comparison'),
      'critique.md missing ## Stitch Comparison section'
    );
  });

  test('Stitch Comparison section is conditional on STITCH_ARTIFACTS', () => {
    const stitchSectionIdx = critiqueMd.indexOf('## Stitch Comparison');
    const stitch_artifacts_before = critiqueMd.lastIndexOf('STITCH_ARTIFACTS', stitchSectionIdx);
    assert.ok(
      stitch_artifacts_before !== -1,
      'critique.md Stitch Comparison section not gated on STITCH_ARTIFACTS'
    );
  });

  test('Stitch Comparison uses recommendations not findings', () => {
    assert.ok(
      critiqueMd.includes('recommendations') && critiqueMd.includes('Stitch Comparison'),
      'critique.md Stitch Comparison section does not distinguish recommendations from findings'
    );
  });

  test('Stitch Comparison section not included in Action List', () => {
    const actionListIdx = critiqueMd.indexOf('## Action List for /pde:iterate');
    const stitchNotInActionList = critiqueMd.indexOf('Stitch Comparison recommendations are NOT included', actionListIdx);
    assert.ok(
      stitchNotInActionList !== -1,
      'critique.md Action List does not explicitly exclude Stitch Comparison recommendations'
    );
  });
});
```

---

## Existing Code Integration Points

### critique.md — Three Insertion Points

**Insertion 1: New Step 2g** (after Step 2f, before Step 3)
- Add manifest-read command
- Build STITCH_ARTIFACTS classification list
- Log count of Stitch artifacts detected

**Insertion 2: Step 4 per-file evaluation loop** (two sub-insertions)
- After `Use the Read tool to read the wireframe HTML content.`
  → Add: Stitch source gate (check STITCH_ARTIFACTS, set STITCH_SOURCE, read PNG)
- In Perspective 2 evaluation (or as a pre-evaluation check before P1)
  → Add: `IF SUPPRESS_TOKEN_FINDINGS: skip "Token not applied" findings`
- The visual observation requirement (reference image in findings) applies when HAS_PNG is true

**Insertion 3: Step 5b report assembly**
- After existing section 8 (Footer)
  → Add: `5b-STITCH` sub-step (conditional on STITCH_ARTIFACTS non-empty)
  → Write `## Stitch Comparison` section content

**No changes to:** Steps 1, 3, 3.5, 6, 7 — all unchanged. The 4-perspective evaluation structure (P1-P4), scoring, Action List, DESIGN-STATE, manifest registration, and coverage flag are all unchanged.

### critique.md — Step 5b Frontmatter Update

When STITCH_ARTIFACTS is non-empty, update the Mode field in the critique report frontmatter:

```yaml
Mode: "{full|quick|focused} (Stitch-aware: {N} Stitch artifact(s))"
```

This documents that Stitch-aware mode was active for the run.

### design-manifest.json — Read-Only in Phase 68

Phase 68 reads the manifest (Step 2g) but does NOT modify per-artifact fields. The manifest update in Step 7b still registers the CRT artifact with standard fields. No new per-artifact fields are added by critique. The `source: "stitch"` field was written by Phase 66 and is consumed read-only here.

### pde-tools.cjs — No Modifications

`manifest-read` (subcommand) already exists at pde-tools.cjs line 520. No new CLI commands needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Critique applies identical evaluation to all artifacts | Critique detects Stitch source and applies token suppression | Phase 68 | Eliminates DTCG false positives for Stitch artifacts; honest scores |
| Critique reads only HTML for visual evaluation | Critique reads HTML + PNG for Stitch artifacts | Phase 68 | Visual observations derived from rendered image, not just DOM structure |
| Critique produces only scored findings | Critique produces findings (scored) + Stitch Comparison recommendations (unscored) | Phase 68 | Design system divergences documented for handoff without polluting iterate queue |
| No Stitch pipeline integration in downstream stages | Stitch artifacts flow from wireframe → critique → handoff via manifest | Phase 66-68-69 | End-to-end Stitch pipeline with appropriate evaluation at each stage |

**Relevant to Phase 68:**
- `manifest-read` exists in pde-tools.cjs and returns full JSON — use it (not custom file read)
- `pde-layout--{fidelity}` class detection in Step 2e: Stitch HTML may NOT have `pde-layout--hifi` body class (Stitch generates its own HTML, not PDE scaffold). Handle gracefully: if fidelity class absent from Stitch HTML, default to `hifi` (Stitch always generates hi-fi quality). The fidelity detection logic in Step 2e needs a Stitch-specific fallback.

---

## Open Questions

1. **Stitch HTML fidelity class detection**
   - What we know: PDE wireframes use `pde-layout--{fidelity}` body class. Stitch generates HTML without this class (it's Google's renderer, not PDE scaffold).
   - What's unclear: What happens in Step 2e when the fidelity regex doesn't find the class in an STH file? The current logic reads the class from the body element — if absent, the fidelity is undefined.
   - Recommendation: Add a Stitch-specific branch in Step 2e: "IF current file is detected as STH-*.html (code starts with STH-): default fidelity to `hifi` regardless of body class. Stitch always generates hi-fi quality output." Log: "STH-{slug}: no pde-layout class found — defaulting to hifi fidelity (Stitch-generated)."

2. **Annotation injection `<!-- @component: -->` presence in STH HTML**
   - What we know: Phase 66 injects `<!-- @component: ComponentName -->` before manifest registration. The HTML in `.planning/design/ux/wireframes/STH-{slug}.html` should contain these comments.
   - What's unclear: Whether these comments affect Perspective 1 (UX/Usability) evaluation — they are HTML comments and invisible to rendered UI, but visible in source.
   - Recommendation: No action needed. HTML comments are irrelevant to design critique. The annotations are for handoff extraction, not for critique analysis.

3. **How many CSS properties to check in the Stitch Comparison table**
   - What we know: Stitch HTML may have dozens of color values, spacing values, and typography declarations. Checking all would be impractical.
   - What's unclear: The right scope for the comparison table. Too few: misses important divergences. Too many: noise.
   - Recommendation: Focus on the 5 most impactful categories: primary color, background color, border radius, font family, and shadow values. These are the most visible design system signals. Additional properties may be noted in "Novel Patterns" if they stand out.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — tests run directly with `node --test` |
| Quick run command | `node --test tests/phase-68/*.test.mjs` |
| Full suite command | `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs tests/phase-67/*.test.mjs tests/phase-68/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRT-01 | critique.md reads manifest-read + builds STITCH_ARTIFACTS from source === "stitch" | unit (file parse) | `node --test tests/phase-68/stitch-detection.test.mjs` | ❌ Wave 0 |
| CRT-01 | Step 2g exists and appears after Step 2f (ordering check) | unit (indexOf order) | `node --test tests/phase-68/stitch-detection.test.mjs` | ❌ Wave 0 |
| CRT-02 | SUPPRESS_TOKEN_FINDINGS variable present in critique.md | unit (string match) | `node --test tests/phase-68/token-suppression.test.mjs` | ❌ Wave 0 |
| CRT-02 | Token suppression applies when STITCH_SOURCE is true | unit (file parse) | `node --test tests/phase-68/token-suppression.test.mjs` | ❌ Wave 0 |
| CRT-02 | Token suppression does NOT suppress color contrast findings | unit (file parse — color contrast mention after suppression gate) | `node --test tests/phase-68/token-suppression.test.mjs` | ❌ Wave 0 |
| CRT-03 | PNG path construction from HTML path documented in workflow | unit (file parse) | `node --test tests/phase-68/png-multimodal.test.mjs` | ❌ Wave 0 |
| CRT-03 | HAS_PNG variable tracked for fallback | unit (string match) | `node --test tests/phase-68/png-multimodal.test.mjs` | ❌ Wave 0 |
| CRT-03 | Visual observation requirement present for HAS_PNG case | unit (file parse — "visible in the image" or equivalent) | `node --test tests/phase-68/png-multimodal.test.mjs` | ❌ Wave 0 |
| CRT-04 | `## Stitch Comparison` section present in critique.md | unit (string match) | `node --test tests/phase-68/stitch-comparison-section.test.mjs` | ❌ Wave 0 |
| CRT-04 | Stitch Comparison section gated on STITCH_ARTIFACTS non-empty | unit (indexOf order check) | `node --test tests/phase-68/stitch-comparison-section.test.mjs` | ❌ Wave 0 |
| CRT-04 | Token compliance percentage documented in section format | unit (string match "compliance") | `node --test tests/phase-68/stitch-comparison-section.test.mjs` | ❌ Wave 0 |
| CRT-04 | Stitch Comparison recommendations NOT in Action List | unit (file parse — exclusion note in Action List) | `node --test tests/phase-68/stitch-comparison-section.test.mjs` | ❌ Wave 0 |
| CRT-04 | Stitch Comparison NOT in DESIGN-STATE Open Critique Items | unit (file parse — exclusion note) | `node --test tests/phase-68/stitch-comparison-section.test.mjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-68/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs tests/phase-67/*.test.mjs tests/phase-68/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-68/stitch-detection.test.mjs` — covers CRT-01 (manifest-read, STITCH_ARTIFACTS, Step 2g ordering)
- [ ] `tests/phase-68/token-suppression.test.mjs` — covers CRT-02 (SUPPRESS_TOKEN_FINDINGS, scope correct, color contrast preserved)
- [ ] `tests/phase-68/png-multimodal.test.mjs` — covers CRT-03 (PNG path construction, HAS_PNG, visual observation requirement)
- [ ] `tests/phase-68/stitch-comparison-section.test.mjs` — covers CRT-04 (section present, gated, compliance %, not in Action List, not in DESIGN-STATE items)

---

## Sources

### Primary (HIGH confidence)

- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/critique.md` — Full critique workflow: all 7 steps, fidelity-severity calibration table (line 353), Step 4 per-file evaluation structure, Step 5b report sections, Action List assembly, Step 7c coverage flag pattern
- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/pde-tools.cjs` (lines 515-540) — `manifest-read` subcommand confirmed at line 520; invocation pattern `pde-tools design manifest-read`
- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/design.cjs` (lines 196-245) — `readManifest` and `cmdManifestRead` implementation; reads `.planning/design/design-manifest.json`; returns null if missing
- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/wireframe.md` (lines 410-421) — `source stitch` and `stitch_annotated true` manifest-update calls confirming these fields exist in production
- `/Users/greyaltaer/code/projects/Platform Development Engine/templates/design-manifest.json` — Full manifest schema; `artifacts` object structure with per-artifact fields; `designCoverage` 14-field structure
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/REQUIREMENTS.md` — CRT-01, CRT-02, CRT-03, CRT-04 success criteria (verbatim, lines 58-61)
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/phases/66-wireframe-mockup-stitch-integration/66-RESEARCH.md` — Pattern 4 (manifest registration for STH artifacts): `source stitch`, `stitch_annotated true` confirmed field names; STH-{slug}.png stored in `.planning/design/ux/wireframes/`
- `/Users/greyaltaer/code/projects/Platform Development Engine/tests/phase-67/diverge-stitch-flag.test.mjs` — Nyquist test pattern for workflow file-parse assertions; all Phase 68 tests follow this pattern

### Secondary (MEDIUM confidence)

- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/STATE.md` — ESM createRequire requirement (Phase 66 decision); pde-tools.cjs uses plain `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs"` not ESM wrapper (verified from critique.md Step 7b pattern)
- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/critique-pencil-screenshot.md` — Confirmed that `Read` tool handles PNG files as multimodal input (sub-workflow uses base64 write, not Read tool for images, but the Pencil screenshot is appended to WIREFRAME_FILES for discovery by critique — confirming critique loop DOES process PNG files alongside HTML)

### Tertiary (LOW confidence)

- Claude Code Read tool multimodal behavior: documented in tool description that "This tool allows Claude Code to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Claude Code is a multimodal LLM." This is the basis for CRT-03. Confidence is MEDIUM-HIGH (it's in the tool description), but the specific behavior when processing images inline in workflow context (as opposed to user-initiated) is inferred rather than verified by a running test.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all infrastructure (pde-tools, manifest-read, critique.md structure) is directly verified from source files
- Architecture (three insertion points): HIGH — critique.md is fully traced; insertion points precisely located
- Stitch detection pattern: HIGH — `manifest-read` exists, artifact `source` field written by Phase 66 (directly verified)
- DTCG suppression scope: HIGH — fidelity-severity calibration table is explicit in critique.md; "Token not applied" row exactly identified
- Multimodal PNG reading: MEDIUM — `Read` tool documentation states PNG support; critique's WIREFRAME_FILES loop processes all files; inference that Read on PNG in workflow context produces image content for Claude is strongly supported but not verified by a running integration test
- Stitch Comparison section format: HIGH — derived from CRT-04 success criteria (verbatim); format is consistent with existing critique section patterns
- Nyquist test strategy: HIGH — follows exact Phase 67 pattern; file parse assertions on workflow markdown

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days — all dependencies are stable Phase 65-67 infrastructure; no external API changes expected)
