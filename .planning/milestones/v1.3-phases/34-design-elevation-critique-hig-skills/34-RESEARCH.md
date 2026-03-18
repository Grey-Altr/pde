# Phase 34: Design Elevation — Critique & HIG Skills - Research

**Researched:** 2026-03-18
**Domain:** Prompt engineering for design critique systems — Awwwards rubric application, AI aesthetic detection, motion choreography assessment, WCAG motion accessibility, CSS animation performance auditing
**Confidence:** HIGH (all major claims verified against existing project references, W3C official docs, and MDN; motion accessibility confirmed against W3C WCAG 2.1 Understanding docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRIT-01 | Critique skill evaluates against Awwwards 4-dimension rubric with specific findings per dimension | quality-standards.md already contains full rubric; elevation wires it into Step 4 critique perspectives with explicit dimension mapping |
| CRIT-02 | Critique skill flags "AI aesthetic" patterns with specific remediation guidance | quality-standards.md AI Aesthetic Flags column documents 5+ named patterns per dimension; elevation adds a named-pattern detection pass to each perspective evaluation |
| CRIT-03 | Critique skill assesses motion choreography quality: purposeful/narrative vs decorative/random | motion-design.md contains choreography patterns; research identifies 4 diagnostic criteria for purposefulness |
| CRIT-04 | Critique skill evaluates typography pairing quality: documented contrast rationale vs size differentiation only | composition-typography.md Type Pairing Classification section; research confirms Vox-ATypI classification is the assessment axis |
| HIG-01 | HIG skill audits motion accessibility: prefers-reduced-motion compliance, vestibular-safe alternatives | WCAG 2.3.3 (AAA) + WCAG 2.2.2 (A) + CSS prefers-reduced-motion pattern; vestibular triggers catalogued |
| HIG-02 | HIG skill validates animation performance: layout reflow detection, GPU-composited property verification | motion-design.md Animation Performance Rules; reflow property list verified against MDN/Smashing Magazine |
| HIG-03 | HIG skill checks touch target sizing against motion state | WCAG 2.5.8 (AA) 24px minimum; animation-state consideration is novel requirement in this phase |
</phase_requirements>

---

## Summary

Phase 34 elevates two existing PDE skills — `/pde:critique` and `/pde:hig` — to produce specific, named findings rather than generic checklist output. The implementation domain is **prompt engineering**: the skills are structured prompt files (workflows/critique.md, workflows/hig.md), not application code. Elevation means adding decision layers to the existing pipelines that enforce specificity: map every finding to a named rubric dimension, detect AI patterns by name, assess motion against choreography criteria, and cite specific CSS properties when flagging performance issues.

The key insight from reviewing the existing workflows is that the structural machinery is complete. Both skills have 7-step pipelines, fidelity-aware finding formats, and severity rating systems. What they lack are the **domain knowledge layers** that turn "vague observation" into "specific finding mapped to a rubric." The elevation is additive: insert named-pattern lookup tables, Awwwards dimension mapping instructions, and explicit diagnostic criteria into the evaluation steps. No new pipeline steps are needed — both skills have natural insertion points (Step 4 in critique, Step 4 in HIG).

The second key insight is that all the reference material this elevation needs **already exists in the project**. `references/quality-standards.md` contains the complete Awwwards rubric with AI Aesthetic Flags pre-populated per dimension. `references/motion-design.md` contains animation performance rules and composited-property lists. `references/composition-typography.md` contains type pairing classification with Vox-ATypI taxonomy. The elevation is wiring these references into the skills' evaluation passes, plus adding the prefers-reduced-motion pattern and vestibular trigger catalogue to the HIG skill.

**Primary recommendation:** Add an Awwwards dimension mapping block to Step 4/7 of `workflows/critique.md` (loading `@references/quality-standards.md`), and add a motion accessibility audit block to Step 4/7 of `workflows/hig.md`. Both changes are additive. The Nyquist tests grep the skill files for required content patterns — same pattern established in Phase 33.

---

## Standard Stack

### Core References Already in Project

These references are confirmed present and loaded via `@` include. No new dependencies needed.

| Reference | Path | What It Provides | Loaded By | Confidence |
|-----------|------|-----------------|-----------|------------|
| quality-standards.md | `references/quality-standards.md` | Full Awwwards 4-dimension rubric, score band criteria, AI Aesthetic Flags per dimension | critique.md (must add to required_reading) | HIGH |
| composition-typography.md | `references/composition-typography.md` | Type pairing classification (Vox-ATypI), pairing rationale format, APCA thresholds | critique.md (already in wireframe; add to critique) | HIGH |
| motion-design.md | `references/motion-design.md` | Animation performance rules, GPU-composited vs layout-reflow property list, choreography patterns | hig.md (must add to required_reading) | HIGH |
| wcag-baseline.md | `references/wcag-baseline.md` | All WCAG 2.2 criteria including 2.3.3, 2.2.2, 2.5.4, 2.5.8 | hig.md (already in required_reading) | HIGH |
| design-principles.md | `references/design-principles.md` | Nielsen/Shneiderman/Gestalt frameworks | critique.md (already in required_reading) | HIGH |

### What CRIT Needs Added to required_reading

The current `workflows/critique.md` required_reading block is:
```
@references/skill-style-guide.md
@references/mcp-integration.md
@references/design-principles.md
@references/wcag-baseline.md
```

Must add:
```
@references/quality-standards.md
@references/composition-typography.md
```

### What HIG Needs Added to required_reading

The current `workflows/hig.md` required_reading block is:
```
@references/skill-style-guide.md
@references/mcp-integration.md
@references/wcag-baseline.md
@references/interaction-patterns.md
```

Must add:
```
@references/motion-design.md
```

### No New External Dependencies

This elevation requires no npm packages, no new tools, and no new reference files. Everything is already in the project.

---

## Architecture Patterns

### Elevation Pattern (from Phase 33)

Phase 33 established the canonical elevation pattern:

1. Add `@references/{ref}.md` to `required_reading` block
2. Add a named decision block within the relevant pipeline step (e.g., Step 4f)
3. The decision block contains: lookup tables, diagnostic criteria, annotation format instructions
4. HTML comment-style annotations for inline output (critique uses markdown finding format)
5. Nyquist tests grep the skill file for required content patterns (not runtime output)

Phase 34 follows this exact pattern for both critique and HIG.

### Critique Elevation: Awwwards Dimension Mapping Block

**Where:** Step 4/7 in `workflows/critique.md`, within each of the four perspective evaluations

**Pattern:** After each perspective's findings are identified, a dimension-mapping sub-step maps the finding to its Awwwards dimension and score impact.

```
Step 4/7: Evaluate wireframes — Awwwards Mapping Sub-Step (add to each perspective):

For each finding identified in this perspective:
  1. Map to Awwwards dimension using quality-standards.md Section 3:
     - Visual execution issues (typography, color, spacing) → Design (40%)
     - Navigation, interaction, feedback, accessibility issues → Usability (30%)
     - Conceptual originality, pattern repetition, template use → Creativity (20%)
     - Content-design integration, copy quality, information density → Content (10%)
  2. State the dimension explicitly: "Awwwards dimension: Design | Score impact: -0.5 in Design band"
  3. Check AI Aesthetic Flags column in quality-standards.md Section 3:
     - If the finding matches a named flag: cite the flag by name in the finding
     - Named flags: "generic gradient (indigo-to-purple)", "Poppins/Inter single-font",
       "symmetric 3-column equal grid", "border-radius: 8px uniform", "hero: centered heading + CTA + gradient",
       "3-column feature: icon + heading + text", "scroll animation on every element equally"
  4. Include current Awwwards band score for this dimension based on evidence found
```

### Critique Elevation: AI Aesthetic Detection Pass

**Where:** New sub-step 4e in `workflows/critique.md` Step 4/7, executing AFTER the four perspective evaluations

```
Step 4e: AI Aesthetic Pattern Detection Pass

Load quality-standards.md AI Aesthetic Flags (all four dimensions).

For each wireframe examined, check for these named patterns by scanning the HTML artifact:

DESIGN flags:
  - "generic-gradient": indigo-to-purple (#6366f1 → #8b5cf6), teal-to-blue, any 2-stop diagonal gradient background
    Remediation: "Replace with single OKLCH color or perceptual harmony palette; gradients require documented rationale"
  - "single-neutral-font": Poppins or Inter used as sole typeface with no second font for display/brand purposes
    Remediation: "Add display/brand typeface with documented contrast rationale; Inter may remain for UI/body"
  - "uniform-radius": border-radius: 8px applied globally across cards, buttons, inputs, modals
    Remediation: "Vary radius by component role: micro (2-4px) for inputs, standard (8px) for cards, full (9999px) for pills"
  - "tailwind-shadow": box-shadow values matching Tailwind defaults (e.g., 0 1px 3px rgba(0,0,0,0.1))
    Remediation: "Design concept-specific shadow system with documented elevation model"

CREATIVITY flags:
  - "hero-pattern-1": hero section with centered heading + subheading + CTA button + gradient/image background
    Remediation: "Introduce concept-specific visual hook: off-grid headline position, unexpected grid, motion hook"
  - "feature-pattern-2": feature section with 3 equal columns, each with icon + heading + text paragraph
    Remediation: "Break equal columns with asymmetric weighting; vary information density per feature importance"
  - "equal-stagger-scroll": scroll animation applied to every element with identical stagger/entrance behavior
    Remediation: "Hierarchy-based choreography: primary elements enter first, secondary follow with narrative stagger"

USABILITY flags:
  - "missing-focus-styles": no :focus-visible styles or outline: none without replacement
    Remediation: "Add focus ring with minimum 3:1 contrast; use outline-offset: 2px for visual separation"
  - "mobile-reflowed-desktop": mobile layout is the desktop layout with narrowed columns
    Remediation: "Redesign mobile as distinct composition: stack to single column with reordered content priority"

CONTENT flags:
  - "generic-copy": "Transform your workflow", "Powerful features for your team", lorem ipsum in visible sections
    Remediation: "Replace with concept-specific copy that could only describe this product"
  - "size-only-hierarchy": headings differentiated from body only by font-size, not weight/style/classification
    Remediation: "Add weight contrast (400 body → 700 heading) or classification contrast (sans body → serif heading)"

Each detected pattern:
  - Named by flag name (e.g., "AI aesthetic: hero-pattern-1")
  - Located specifically (element path)
  - Severity: major (always — AI aesthetic patterns are design-intent failures)
  - Awwwards dimension cited
  - Specific remediation instruction included
```

### Critique Elevation: Motion Choreography Assessment

**Where:** New sub-step 4f in `workflows/critique.md` Step 4/7

Motion choreography assessment diagnoses whether animations have **narrative intent** or are **decorative filler**.

Four diagnostic criteria for purposeful motion:

| Criterion | Purposeful | Decorative/Random |
|-----------|-----------|-------------------|
| Hierarchical sequencing | Primary elements animate first; secondary follow in reading order | All elements animate simultaneously or with identical stagger |
| Functional trigger | Animation responds to a specific user action or content reveal moment | Animation plays on page load regardless of context |
| Spatial continuity | Related elements move in consistent directions (shared axis) | Elements move in arbitrary or conflicting directions |
| Temporal narrative | Timing creates a story arc: setup → content reveal → rest | Timing is arbitrary; no arc |

```
Step 4f: Motion Choreography Assessment

Examine the artifact for any animation/transition indicators (CSS transitions, GSAP patterns,
@keyframes, JS animation hooks found in HTML or <style> blocks):

IF motion patterns present:
  Evaluate against 4 diagnostic criteria above.
  State verdict: "Motion choreography: [purposeful/decorative/absent]"
  For each animation found:
    - Name the element animated
    - State which criterion it satisfies or fails
    - If decorative: provide specific remediation referencing motion-design.md choreography patterns

IF no motion patterns present (common at lofi/midfi):
  State: "Motion: not specified at this fidelity. At mockup fidelity, assess: [list 2-3 concept-specific
  motion opportunities based on the artifact's content type]"
  This proactive suggestion is the deliverable — not a finding.
```

### Critique Elevation: Typography Pairing Assessment

**Where:** Within Perspective 2 (Visual Hierarchy) in Step 4/7

```
Typography Pairing Sub-Step (add to Perspective 2):

Load composition-typography.md Type Pairing Classification section.

For each typeface combination found in the artifact:
  1. Identify the classification of each font: serif/sans/slab/display/monospace + Vox-ATypI subtype
  2. Check if pairing provides CONTRAST (classification contrast, x-height contrast, structural contrast,
     purpose contrast) OR only SIZE differentiation
  3. Verdict: "Pairing: [documented-contrast / size-only / single-font / undocumented]"

If size-only or single-font:
  Finding: "Typography pairing: only font-size distinguishes heading from body — no classification,
  weight, or style contrast documented"
  Severity: major (at hifi) / minor (at midfi) / nit (at lofi)
  Suggestion: Provide specific pairing recommendation using Vox-ATypI framework from composition-typography.md
  Awwwards dimension: Design
```

### HIG Elevation: Motion Accessibility Audit Block

**Where:** New sub-step 4g in `workflows/hig.md` Step 4/7 (append after existing 4a-4f)

```
Step 4g: Motion Accessibility Audit

Load motion-design.md Animation Performance Rules.

WCAG criterion reference:
  - 2.3.3 Animation from Interactions (Level AAA): motion triggered by interaction can be disabled
  - 2.2.2 Pause, Stop, Hide (Level A): auto-playing motion > 5 seconds must be pausable
  - 2.5.4 Motion Actuation (Level A): device/user motion functions have UI alternatives
  Note: 2.3.3 is AAA — audit as "advisory best practice" not mandatory AA finding

Motion pattern scan (examine artifact HTML/CSS for these patterns):

PATTERN: prefers-reduced-motion compliance
  Check: Is @media (prefers-reduced-motion: reduce) applied to all animations and transitions?
  Check: Does the reduced-motion version provide a meaningful fallback (fade/opacity) vs blank removal?
  Correct pattern:
    @media (prefers-reduced-motion: reduce) {
      .animated-element { animation: none; transition: opacity 0.3s ease; }
    }
  Wrong: omitting the media query entirely
  Wrong: * { animation: none !important; } — may break functional animations (loading states)
  Severity if missing: major (at hifi, real interactions present) / minor (at midfi) / nit (at lofi)

PATTERN: Vestibular trigger catalogue
  The following motion types are HIGH-RISK for vestibular disorders:
    - parallax-scroll: background moves at different rate than foreground while scrolling
    - large-scale-transform: elements scale > 20% during scroll or on-load
    - spinning-continuous: rotation animations that loop indefinitely
    - viewport-pan: content that pans laterally while user scrolls vertically

  For any identified HIGH-RISK pattern:
    State: "Vestibular risk: [pattern name] on [element]"
    Required alternative: "Reduced-motion alternative: [substitute]"
    Vestibular-safe substitutes by pattern:
      parallax-scroll → fade-in on scroll (opacity transition only, no transform)
      large-scale-transform → opacity reveal without scale
      spinning-continuous → pause/stop control required (WCAG 2.2.2); reduce to single rotation
      viewport-pan → stationary reveal with content fade
```

### HIG Elevation: Animation Performance Audit Block

**Where:** New sub-step 4h in `workflows/hig.md` Step 4/7

```
Step 4h: Animation Performance Audit

GPU-composited safe properties (no layout reflow):
  transform, opacity
  — these run on the compositor thread; never cause reflow

Layout-reflow properties (DO NOT animate these):
  width, height, top, left, right, bottom, margin, padding,
  border-width, font-size, line-height

Repaint properties (cause repaint but not reflow — use sparingly):
  color, background-color, visibility, border-radius, box-shadow, filter

For each animation found in the artifact:
  1. Identify which CSS properties are being animated
  2. If any layout-reflow property is animated:
     Finding: "Animation on [element] animates [property] — causes layout reflow on every frame"
     Severity: major (performance-critical element) / minor (decorative)
     Suggestion: "Replace [property] animation with transform: translate/scale equivalent"
     Example: "Animating width: 0→100% → use transform: scaleX(0)→scaleX(1) with transform-origin: left"
  3. If will-change is used:
     Verify it targets a specific property (will-change: transform) not all properties (will-change: all)
     Verify it is removed after animation completes (via JS animationend listener)
     Flagging will-change: all as minor finding always

Citation: motion-design.md Animation Performance Rules section (already in project)
```

### HIG Elevation: Touch Target During Motion

**Where:** Extend Step 4/7 existing WCAG 2.5.8 check in `workflows/hig.md`

```
Touch Target Motion State Extension:

Existing check: interactive targets >= 24x24 CSS pixels (WCAG 2.5.8 AA)

Additional check (HIG-03):
  During CSS transitions that move or resize interactive elements:
    - Does the interactive element remain at minimum 24x24px throughout the transition?
    - Is there a period where the element is too small or off-screen to tap?

  Specific risk patterns:
    - scale(0) entrance animation: element starts at 0px effective size, untappable during entrance
    - off-screen slide-in: element entering from off-viewport is unreachable during animation
    - opacity: 0 not sufficient — element remains in DOM at full size; this is acceptable

  Recommendation: Entrance animations that scale from 0 should reach 100% size rapidly
  (< 150ms) to minimize the untappable window. Or use opacity-only entrance.

  Severity: minor for scale animations (brief window), major if element is permanently
  inaccessible due to transform positioning
```

### Nyquist Test Pattern (from Phase 33)

Nyquist tests in this phase follow the Phase 33 pattern: bash scripts that grep the skill workflow file for required content patterns. Tests validate the skill DEFINITION contains the required knowledge — not runtime output.

```bash
#!/usr/bin/env bash
set -euo pipefail
PASS=0; FAIL=0

check() { if grep -q "$1" "$2"; then PASS=$((PASS+1)); else echo "FAIL: $3"; FAIL=$((FAIL+1)); fi; }

# Example: CRIT-01 test
check "quality-standards.md" "workflows/critique.md" "quality-standards.md not in required_reading"
check "Awwwards dimension" "workflows/critique.md" "Missing Awwwards dimension mapping instruction"
check "Design.*40\|Design (40" "workflows/critique.md" "Missing Design dimension weight reference"

echo "CRIT-01: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Awwwards rubric scoring criteria | Custom scoring system | `references/quality-standards.md` | Already built in Phase 29 with score bands, AI flags, weighted dimensions |
| AI aesthetic pattern taxonomy | New pattern catalog | AI Aesthetic Flags in quality-standards.md | Per-dimension flags already enumerated; this is the canonical source |
| CSS GPU-composited property list | Custom reference table | `references/motion-design.md` Animation Performance Rules | Already contains correct/wrong property pairs with rationale |
| WCAG 2.2 criteria list | Re-documenting WCAG | `references/wcag-baseline.md` | Complete ~56 criteria already documented; HIG skill already loads it |
| Type pairing classification | Custom font taxonomy | `references/composition-typography.md` Type Pairing Classification | Vox-ATypI classification + 5 pairing types already documented |
| Vestibular disorder risk list | Researching vestibular triggers | The 4-pattern list in this research | HIGH-RISK patterns: parallax-scroll, large-scale-transform, spinning-continuous, viewport-pan |
| Choreography assessment rubric | New evaluation framework | The 4-diagnostic-criteria framework from this research | Hierarchical sequencing, functional trigger, spatial continuity, temporal narrative |

**Key insight:** All reference material this phase needs exists in the project already. The elevation's value is in **wiring the references into decision logic** inside the skill pipelines — not in creating new reference content.

---

## Common Pitfalls

### Pitfall 1: Vague Dimension Mapping

**What goes wrong:** Critique produces findings like "improve the typography" without mapping to a specific Awwwards dimension.

**Why it happens:** The four perspectives (UX, Hierarchy, Accessibility, Business Alignment) in the existing critique skill do not map 1:1 to the four Awwwards dimensions (Design, Usability, Creativity, Content). Without explicit mapping instructions, the skill applies perspective labels but not dimension labels.

**How to avoid:** Add explicit dimension-mapping decision logic: "typography findings → Design dimension", "interaction feedback → Usability dimension", "pattern originality → Creativity dimension", "copy quality → Content dimension". The mapping block must run for EVERY finding, not just at the summary level.

**Warning signs:** A critique output that says "Visual Hierarchy score: 7/10" but doesn't say "Design dimension: 6.5/10" has failed to map to Awwwards dimensions.

### Pitfall 2: Generic AI Flag Detection

**What goes wrong:** Critique says "the design uses generic patterns" without naming a specific pattern from the AI Aesthetic Flags taxonomy.

**Why it happens:** The skill has the rubric loaded but doesn't execute a named-pattern lookup pass — it makes general observations instead.

**How to avoid:** Require the AI aesthetic detection pass to work from the named flag list in quality-standards.md, citing the flag name verbatim (e.g., "AI aesthetic: hero-pattern-1" not "the hero section looks generic"). Every flagged item must include the specific remediation instruction from the research, not a generic "be more creative" suggestion.

**Warning signs:** Finding text "The hero section uses a common layout pattern" without naming the pattern or specifying what "common pattern #1" looks like.

### Pitfall 3: Motion Choreography Without Artifact Evidence

**What goes wrong:** HIG or critique says "motion is not purposeful" based on assumption rather than artifact evidence.

**Why it happens:** Lofi and midfi wireframes rarely contain motion specifications. The skill must handle the case where motion is simply absent.

**How to avoid:** The motion choreography assessment step must check first whether motion IS present in the artifact before evaluating it. If absent: deliver a proactive suggestion about concept-appropriate motion opportunities, not a "motion is decorative" finding. Findings require evidence from the artifact.

**Warning signs:** Motion choreography verdict issued for a lofi wireframe that has no animation code.

### Pitfall 4: WCAG Level Confusion on Motion

**What goes wrong:** HIG audit flags prefers-reduced-motion absence as a WCAG Level AA violation when it is actually AAA.

**Why it happens:** WCAG 2.3.3 (Animation from Interactions) is Level AAA — more stringent than the mandatory AA level. Misclassifying it as AA misleads users about their legal compliance obligations.

**How to avoid:** WCAG 2.3.3 must be flagged as "AAA — advisory best practice, not required for AA conformance". However, WCAG 2.2.2 Pause/Stop/Hide (Level A) applies to auto-playing animations > 5 seconds — this IS a mandatory check. Keep these distinct. The prefers-reduced-motion check is best practice / AAA, not AA.

**Correct severity labeling:**
- Absence of prefers-reduced-motion: `minor` finding labeled "[WCAG 2.3.3 AAA — advisory]"
- Auto-playing animation > 5s with no pause control: `major` finding labeled "[WCAG 2.2.2 Level A]"

**Warning signs:** HIG audit reports prefers-reduced-motion absence as "critical" or "major WCAG AA violation".

### Pitfall 5: Performance Audit Without Specific Element Names

**What goes wrong:** HIG produces "some animations may cause layout reflow" without naming the specific element or property.

**Why it happens:** The skill is instructed to check for reflow-causing properties but doesn't enforce that element names are included in every performance finding.

**How to avoid:** The HIG finding format requires Location field (element path). Performance findings are no exception. Every performance finding MUST cite: specific element, specific CSS property being animated, why it causes reflow, and specific remediation. Generic warnings are disallowed by the existing anti-pattern rule in hig.md.

**Warning signs:** Finding text "Consider using transform instead of position" without citing the element.

### Pitfall 6: Typography Assessment at Wrong Fidelity

**What goes wrong:** Critique applies "size-only typography pairing" as a major finding on a lofi wireframe where placeholder fonts are expected.

**Why it happens:** The fidelity-severity calibration table in critique.md is for layout/interaction findings; typography findings need equivalent calibration.

**How to avoid:** Apply the same fidelity calibration to typography findings:
- lofi: typography pairing is `nit` (placeholder fonts expected)
- midfi: typography pairing with no contrast is `minor` (token references should appear)
- hifi: typography pairing failures are `major` (real product typefaces applied)

---

## Code Examples

Verified patterns from project references and official sources:

### prefers-reduced-motion Correct Implementation

```css
/* Source: W3C WCAG 2.1 Technique C39, web.dev/prefers-reduced-motion */

/* Approach 1: Reduce (recommended — preserve functional animations) */
.animated-element {
  animation: slide-in 0.6s ease-out both;
  transition: transform 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: fade-in 0.3s ease both; /* opacity only — no transform */
    transition: opacity 0.3s ease;
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Approach 2: Complete disable (only for decorative animations) */
@media (prefers-reduced-motion: reduce) {
  .decorative-particle { animation: none; display: none; }
}

/* WRONG: global kill-switch (breaks functional animations) */
/* @media (prefers-reduced-motion: reduce) { * { animation: none !important; } } */
```

### Vestibular-Safe Parallax Alternative

```css
/* Source: web.dev/prefers-reduced-motion, MDN prefers-reduced-motion */

/* Standard parallax — HIGH vestibular risk */
.parallax-hero {
  background-attachment: fixed;
  /* or scroll-driven animation with translateY */
}

/* Vestibular-safe alternative: fade only, no transform */
@media (prefers-reduced-motion: reduce) {
  .parallax-hero {
    background-attachment: scroll; /* removes parallax */
  }
  .parallax-layer {
    animation: none;
    transform: none; /* remove translateY from scroll animation */
    opacity: 1;
  }
}
```

### GPU-Composited Animation vs Layout Reflow

```css
/* Source: references/motion-design.md Animation Performance Rules */

/* CORRECT: GPU-composited — no reflow */
.card-enter {
  transform: translateY(24px);
  opacity: 0;
  transition: transform 0.3s ease-out, opacity 0.3s ease;
}
.card-enter.visible {
  transform: translateY(0);
  opacity: 1;
}

/* WRONG: Layout reflow on every frame */
.card-enter-wrong {
  margin-top: 24px; /* causes reflow */
  height: 0;        /* causes reflow */
  transition: margin-top 0.3s, height 0.3s;
}

/* Width expansion: reflow → composited equivalent */
/* WRONG: */ .progress { width: 0; transition: width 0.3s; }
/* RIGHT: */ .progress { transform: scaleX(0); transform-origin: left; transition: transform 0.3s; }
```

### Awwwards Dimension Finding Format

```markdown
<!-- Source: quality-standards.md Section 3 + this research -->

**Finding CRIT-03: Typography — Single Font, No Contrast Differentiation**
- **Location:** global > body, heading elements
- **Severity:** major | **Effort:** moderate
- **Awwwards Dimension:** Design (40%) | **Score Impact:** -1.0 band (Professional → Functional)
- **AI Aesthetic Flag:** single-neutral-font (Poppins as sole typeface, no display/brand pairing)
- **Issue:** All text uses Poppins at varying sizes only. No classification contrast between body and display roles. Heading hierarchy achieved by size alone — weight and style are identical.
- **Suggestion:** Add a display/brand typeface with documented Vox-ATypI classification contrast. Example: Poppins (geometric sans, UI/body) + Clash Display (geometric display, brand/hero) — purpose contrast. Document: "Clash Display for 32px+ display headers; Poppins for 16px body and UI text."
- **Reference:** Awwwards Design dimension criteria (quality-standards.md); composition-typography.md Type Pairing Classification
```

### Motion Choreography Finding Format

```markdown
<!-- Source: this research, motion-design.md choreography patterns -->

**Finding CRIT-11: Motion — Equal Stagger on All Elements (No Hierarchy)**
- **Location:** features-section > .feature-card (all 6 instances)
- **Severity:** major | **Effort:** moderate
- **Awwwards Dimension:** Creativity (20%) | **Score Impact:** -0.5
- **AI Aesthetic Flag:** equal-stagger-scroll (identical stagger applied to every section element)
- **Motion Choreography Diagnosis:** Decorative — fails hierarchical sequencing criterion.
  Primary feature (card 1) enters simultaneously with secondary features (cards 2-6). No narrative arc.
- **Suggestion:** Restructure stagger to reflect content importance: hero feature (card 1) appears at 0ms,
  supporting features stagger at 120ms intervals (0ms, 120ms, 240ms, 360ms...). Use GSAP stagger: 0.12
  or CSS animation-delay: calc(0.12s * var(--index)).
- **Reference:** motion-design.md Choreographed Entrance with Stagger pattern; Awwwards Creativity criteria
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact on This Phase |
|--------------|-----------------|--------------|---------------------|
| prefers-reduced-motion: disable all | prefers-reduced-motion: reduce (use fade alternatives) | 2020–2023 shift | HIG elevation uses the reduce approach, not nuclear disable |
| Custom design rubric for critique | Established Awwwards 4-dimension framework | Project Phase 29 | quality-standards.md is authoritative; no custom rubric |
| Generic "use transform not top" advice | Specific element + property citation required | Phase 34 requirement | Performance findings must name element and property |
| WCAG 2.3.3 confused with AA | WCAG 2.3.3 is AAA; AA coverage comes from 2.2.2 and 2.5.4 | WCAG 2.1 published 2018 | Severity labeling in HIG elevation must be accurate |
| motion-design.md loaded by mockup only | motion-design.md also loaded by hig.md | Phase 34 elevation | HIG gains GPU/reflow property list from motion reference |

**Key clarification on WCAG motion levels:**
- WCAG 2.2.2 Pause, Stop, Hide — Level **A** (mandatory): auto-playing animation > 5 seconds must be pausable
- WCAG 2.5.4 Motion Actuation — Level **A** (mandatory): device motion functions need UI alternatives
- WCAG 2.3.3 Animation from Interactions — Level **AAA** (advisory): prefers-reduced-motion best practice
- Source: W3C WCAG 2.1 specification (confirmed HIGH confidence)

---

## Open Questions

1. **Awwwards Dimension → Critique Perspective Mapping Ambiguity**
   - What we know: Critique has 4 perspectives (UX, Hierarchy, Accessibility, Business); Awwwards has 4 dimensions (Design, Usability, Creativity, Content). They are NOT 1:1 identical.
   - What's unclear: A "missing hover state" finding from the UX perspective could map to either Usability dimension (friction) or Design dimension (incomplete interactive state design).
   - Recommendation: The planning step should define the canonical cross-walk. Suggested mapping: UX perspective findings → Usability dimension primarily; Hierarchy perspective → Design dimension primarily; some findings will map across two dimensions — the dominant dimension should be cited.

2. **Motion Assessment at Lofi Fidelity**
   - What we know: Most wireframes at lofi have no animation code. The motion assessment must handle this gracefully.
   - What's unclear: Should a lofi critique produce "motion opportunities" proactively, or remain silent?
   - Recommendation: Produce 2-3 concept-appropriate motion opportunity suggestions at lofi (proactive, not findings). These become narrative context for the mockup skill.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bash grep tests (same as Phase 33) |
| Config file | none — tests are standalone .sh scripts |
| Quick run command | `bash .planning/phases/34-design-elevation-critique-hig-skills/test_crit01_awwwards.sh` |
| Full suite command | `for f in .planning/phases/34-design-elevation-critique-hig-skills/test_*.sh; do bash "$f"; done` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRIT-01 | critique.md loads quality-standards.md and contains Awwwards dimension mapping | grep unit | `bash test_crit01_awwwards.sh` | Wave 0 |
| CRIT-02 | critique.md contains AI aesthetic flag names from quality-standards.md | grep unit | `bash test_crit02_ai_aesthetic.sh` | Wave 0 |
| CRIT-03 | critique.md contains motion choreography diagnostic criteria | grep unit | `bash test_crit03_motion.sh` | Wave 0 |
| CRIT-04 | critique.md loads composition-typography.md and contains typography pairing assessment | grep unit | `bash test_crit04_typography.sh` | Wave 0 |
| HIG-01 | hig.md contains prefers-reduced-motion pattern and vestibular trigger catalogue | grep unit | `bash test_hig01_motion_a11y.sh` | Wave 0 |
| HIG-02 | hig.md loads motion-design.md and contains layout-reflow property list | grep unit | `bash test_hig02_performance.sh` | Wave 0 |
| HIG-03 | hig.md contains touch target motion state check | grep unit | `bash test_hig03_touch_target.sh` | Wave 0 |

### Sampling Rate

- **Per task commit:** Run the 7 test scripts for the requirement being addressed
- **Per wave merge:** `for f in .planning/phases/34-design-elevation-critique-hig-skills/test_*.sh; do bash "$f"; done`
- **Phase gate:** All 7 tests green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test_crit01_awwwards.sh` — covers CRIT-01
- [ ] `test_crit02_ai_aesthetic.sh` — covers CRIT-02
- [ ] `test_crit03_motion.sh` — covers CRIT-03
- [ ] `test_crit04_typography.sh` — covers CRIT-04
- [ ] `test_hig01_motion_a11y.sh` — covers HIG-01
- [ ] `test_hig02_performance.sh` — covers HIG-02
- [ ] `test_hig03_touch_target.sh` — covers HIG-03

All 7 test scripts are Wave 0 deliverables — created before skill file edits, following Phase 33 pattern.

---

## Sources

### Primary (HIGH confidence)

- `references/quality-standards.md` — Awwwards 4-dimension rubric, AI Aesthetic Flags per dimension, score bands (in-project, Phase 29)
- `references/motion-design.md` — Animation performance rules, GPU-composited property list, choreography patterns (in-project, Phase 29)
- `references/composition-typography.md` — Type pairing classification, Vox-ATypI taxonomy (in-project, Phase 29)
- `references/wcag-baseline.md` — Full WCAG 2.2 criteria including 2.3.3, 2.2.2, 2.5.4, 2.5.8 (in-project, Phase 29)
- W3C WCAG 2.1 Understanding 2.3.3 — https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html — Level AAA confirmation, vestibular disorder impact
- W3C WCAG 2.1 Technique C39 — https://www.w3.org/WAI/WCAG22/Techniques/css/C39 — prefers-reduced-motion implementation

### Secondary (MEDIUM confidence)

- web.dev/prefers-reduced-motion — https://web.dev/articles/prefers-reduced-motion — vestibular-safe parallax pattern (verified against W3C spec)
- Smashing Magazine GPU Animation — https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/ — layout reflow vs composited property list (CSS fundamentals, stable)
- Pope Tech accessible animation — https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/ — reduce vs disable pattern (2025 publication)

### Tertiary (LOW confidence — training knowledge)

- Awwwards SOTD criteria analysis — per-score band criteria are inferred from SOTD winner analysis per quality-standards.md metadata (NOT published by Awwwards)
- AI aesthetic pattern taxonomy — the specific named patterns (hero-pattern-1, feature-pattern-2, etc.) in quality-standards.md are derived from Phase 29 analysis; not an external published taxonomy

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all references are in-project files created in Phase 29, confirmed readable
- Architecture patterns: HIGH — follows Phase 33 elevation pattern exactly; Nyquist test pattern confirmed working
- Pitfalls: HIGH — WCAG level confusion (AAA vs AA) confirmed against W3C spec; fidelity calibration is direct extension of existing system
- Motion accessibility: HIGH — WCAG 2.3.3 AAA level confirmed; vestibular triggers confirmed against W3C Understanding doc
- AI aesthetic taxonomy: MEDIUM — quality-standards.md is authoritative for this project; external validation would require Awwwards publishing criteria they don't publish

**Research date:** 2026-03-18
**Valid until:** 2026-06-18 (90 days — stable domain; WCAG 2.2 is current spec through 2025+)
