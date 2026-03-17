# Phase 29: Quality Infrastructure — Research

**Researched:** 2026-03-17
**Domain:** Design quality standards, motion design, composition/typography principles, file protection patterns, infrastructure extension
**Confidence:** HIGH (Awwwards rubric, GSAP, APCA thresholds verified against official/authoritative sources); MEDIUM (CSS scroll-driven animation edge cases — Firefox still not shipping by default)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | Awwwards rubric reference file: 4-dimension scoring (Design 40%, Usability 30%, Creativity 20%, Content 10%) with concrete measurable criteria per score level 1-10 | Awwwards official rubric confirmed; per-level criteria synthesized from official evaluation page + SOTD analysis |
| QUAL-02 | Motion design reference file: animation timing scales, easing curves (cubic-bezier + spring physics), scroll-driven effect techniques, GSAP 3.14 CDN patterns, variable font axis animation | GSAP 3.14 verified as current version, now fully free post-Webflow acquisition; CSS linear() for spring physics confirmed at 88% browser support; scroll-driven animations confirmed Chrome/Edge/Safari 26+, NOT Firefox |
| QUAL-03 | Composition and typography reference file: grid systems, visual weight analysis, type pairing contrast rationale, spatial asymmetry principles, APCA contrast checking | APCA Lc thresholds verified from authoritative APCA documentation; grid system naming conventions confirmed |
| QUAL-04 | protected-files.json mechanism preventing self-improvement agents from modifying core files — with explicit allowed-write-directories | Pattern design researched; no existing standard — PDE must define its own convention based on Claude Code sandbox limitations |
| QUAL-05 | Model profile entries in bin/lib/model-profiles.cjs for new agent types | Existing file structure confirmed; three new entries required |
| QUAL-06 | Skill registry entries (AUD, IMP, PRT) added to skill-registry.md | Existing registry format confirmed; codes not yet in use |
</phase_requirements>

---

## Summary

Phase 29 delivers the foundational quality infrastructure that all subsequent v1.3 phases depend on. It creates three reference files consumed by design skills via `@references/` includes, a protected-files mechanism guarding against self-modification corruption, and minimal infrastructure extensions (model profiles and skill registry entries).

The most technically demanding deliverable is `references/quality-standards.md` — the Awwwards rubric. The 4-dimension structure (Design 40%, Usability 30%, Creativity 20%, Content 10%) is publicly confirmed, but granular per-score-level criteria require synthesis from official Awwwards evaluation documentation, SOTD winner analysis, and first-principles expert judgment. Awwwards does not publish a detailed 1-10 scoring rubric publicly; the reference file must infer score-level criteria from what distinguishes SOTD winners (8.0+) from Honorable Mentions (6.5+) from non-award submissions.

The most technically current deliverable is `references/motion-design.md`. GSAP 3.14 is the current version (as of March 2026), now fully free after Webflow's 2024 acquisition. CSS scroll-driven animations are production-ready in Chrome 115+, Edge, and Safari 26, but Firefox does NOT support them by default — `@supports` progressive enhancement is mandatory, not optional. CSS `linear()` for spring physics approximation has 88% browser support (all major browsers since December 2023) and is the recommended pure-CSS spring approach.

The `protected-files.json` mechanism does not follow a pre-existing standard — Claude Code's sandbox only enforces write restrictions for the Bash tool (not Write/Edit tools directly). The protected-files mechanism in PDE context is a convention enforced by explicit agent prompt instructions and workflow guards — not OS-level filesystem protection. The reference file and JSON file must define the pattern, and all fleet agent prompts must explicitly honor it.

**Primary recommendation:** Write all three reference files as prescriptive, LLM-consumable documents modeled on `references/typography.md` and `references/color-systems.md` — concrete values, named patterns, code examples, and explicit "use X" instructions. Avoid general principles without implementation specifics.

---

## Standard Stack

### Core

| Component | Version/Format | Purpose | Why Standard |
|-----------|----------------|---------|--------------|
| Markdown + YAML | (no version) | Reference file format | Native Claude Code @ include format; all existing references use this |
| JSON | (no version) | protected-files.json | Zero-dependency; machine-readable by Node.js without parsing library |
| CommonJS .cjs | Node.js 20.x LTS | model-profiles.cjs extension | Required by existing file; ESM incompatible with Claude Code plugin invocation |
| GSAP | 3.14.x (current) | Motion examples in motion-design.md | Fully free post-Webflow acquisition; ScrollTrigger plugin now included |
| CSS `linear()` | Baseline (88%) | Spring physics easing in pure CSS | All major browsers since December 2023; replaces cubic-bezier for multi-point easing |
| CSS `animation-timeline: scroll()` | Chrome 115+, Safari 26+, NOT Firefox | Scroll-driven animations | Progressive enhancement mandatory; `@supports` guard required |
| DTCG `transition` type | DTCG 2025.10 spec | Motion token format | Extends existing DTCG color/typography tokens; no new tooling |
| APCA Lc scale | WCAG 3.0 candidate | Contrast checking | More perceptually accurate than WCAG 2.x ratios; referenced in SYS-04, QUAL-03 |

### Supporting

| Component | Version/Format | Purpose | When to Use |
|-----------|----------------|---------|-------------|
| CSS `cubic-bezier()` | Universal | Spring approximation fallback | When `linear()` is unavailable; single-overshoot spring only |
| `font-variation-settings` | Universal | Variable font axis animation | All variable font axis animation — weight, width, optical size |
| `@supports` | Universal | Progressive enhancement guard | Always wrap scroll-driven animations and any Chrome-first feature |
| WCAG 2.x ratios | 4.5:1 AA | Fallback contrast when APCA unavailable | Include alongside APCA values for tool compatibility |

### Alternatives Considered

| Standard | Alternative | Why Standard Wins |
|----------|-------------|-------------------|
| GSAP 3.14 CDN | CSS-only animation | GSAP required for complex scroll choreography; mockup skill needs it |
| CSS `linear()` spring | Framer Motion / react-spring | PDE mockups are HTML/CSS handoff docs — no React dependencies |
| APCA Lc values | WCAG 2.x contrast ratios | APCA is perceptually accurate for screen; WCAG 2.x conflates perceived contrast |
| protected-files.json + prompt convention | OS-level sandboxing | Claude Code Write/Edit tools bypass bwrap filesystem sandbox; prompt-level enforcement is the only reliable mechanism |

---

## Architecture Patterns

### Reference File Structure (Pattern from Existing Files)

All reference files in `references/` follow this anatomy, established by `typography.md` and `color-systems.md`:

```
references/
├── quality-standards.md   # NEW — Awwwards rubric (QUAL-01)
├── motion-design.md       # NEW — Motion patterns (QUAL-02)
├── composition-typography.md  # NEW — Grid + type pairing (QUAL-03)
├── typography.md          # EXISTING — consumed by system.md
├── color-systems.md       # EXISTING — consumed by system.md
└── design-principles.md   # EXISTING — consumed by critique.md
```

### Pattern 1: LLM-Consumable Reference File Anatomy

**What:** Reference files are structured for consumption by LLM agents via `@references/filename.md` in `<required_reading>` blocks — not for human-only reading.

**When to use:** All three new reference files must follow this pattern.

**Structure:**
```markdown
# [Reference Name]

> [One-line description of what this covers]
> Loaded via `@` reference from [skill].md during [operation].

---

**Version:** 1.0
**Scope:** [explicit scope]
**Ownership:** [skill code(s) that use this]
**Boundary:** [what this file DOES NOT cover, to prevent scope creep]

---

## [Section 1: Concrete Values]

| Name | Value | Use Case |
|------|-------|----------|
| ... | ... | ... |

## [Section 2: Named Patterns with Code Examples]

### Pattern Name

**What:** [description]
**When:** [use case]

```[language]
// Source: [URL]
[code example]
```

## Citations

| Source | URL | Used In |
|--------|-----|---------|
```

### Pattern 2: Protected-Files Convention (Prompt-Level Enforcement)

**What:** `protected-files.json` lists file paths and directories that must never be modified by fleet agents. Enforcement is via explicit agent prompt instructions — NOT via OS-level sandbox (which does not apply to Claude Code Write/Edit tools).

**Critical insight:** Claude Code's bwrap/bubblewrap sandbox only enforces `allowWrite` restrictions for the Bash tool. The Write and Edit tools run in-process via `fs.writeFileSync` and bypass sandbox filesystem isolation. Therefore, protected-files enforcement MUST be written into fleet agent system prompts as explicit negative constraints.

**JSON format:**
```json
{
  "protected": [
    "references/quality-standards.md",
    "references/skill-style-guide.md",
    "references/tooling-patterns.md",
    "workflows/improve.md",
    "bin/lib/model-profiles.cjs",
    "bin/pde-tools.cjs",
    "protected-files.json",
    "CLAUDE.md",
    ".claude/settings.json"
  ],
  "protected_directories": [
    "bin/",
    ".claude/"
  ],
  "allowed_write_directories": [
    ".planning/improvements/",
    ".planning/audit-report.md",
    ".planning/skill-builder-log.md",
    "commands/",
    "workflows/"
  ],
  "enforcement": "prompt",
  "note": "Claude Code Write/Edit tools bypass bwrap sandbox. Enforcement is via agent system prompt instructions only. All fleet agent prompts MUST explicitly reference this file."
}
```

**What goes in protected list:** Files that must remain stable across all self-improvement cycles. Specifically:
- The quality rubric itself (`references/quality-standards.md`) — circular evaluation prevention
- The skill style guide and tooling patterns — format stability
- The improve workflow — prevents self-modification of the improvement loop
- All `bin/` scripts — runtime infrastructure
- `protected-files.json` itself — meta-protection

### Pattern 3: Model Profile Extension

**What:** Add new agent entries to the `MODEL_PROFILES` object in `bin/lib/model-profiles.cjs`.

**New entries required:**

```javascript
// In MODEL_PROFILES object:
'pde-output-quality-auditor': { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
'pde-skill-linter':           { quality: 'sonnet', balanced: 'haiku',  budget: 'haiku' },
'pde-design-quality-evaluator': { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
'pde-template-auditor':       { quality: 'sonnet', balanced: 'haiku',  budget: 'haiku' },
```

**Rationale for model selection:**
- `pde-output-quality-auditor`: Pattern matching against rubric — sonnet sufficient for quality, haiku for budget
- `pde-skill-linter`: Structural lint checks — haiku sufficient at balanced/budget
- `pde-design-quality-evaluator`: Qualitative design judgment — opus at quality, sonnet at balanced (most expensive reasoning task)
- `pde-template-auditor`: Template completeness checking — haiku sufficient at balanced/budget

**Important:** Also update `references/model-profiles.md` to mirror the new entries (the comment in `model-profiles.cjs` notes this should be kept in sync).

### Pattern 4: Skill Registry Extension

**What:** Add three new rows to `skill-registry.md` for the new agent skill codes.

```markdown
| AUD | /pde:audit | workflows/audit.md | tooling | pending |
| IMP | /pde:improve | workflows/improve.md | tooling | pending |
| PRT | /pde:pressure-test | workflows/pressure-test.md | tooling | pending |
```

**Note:** Status is `pending` (not `active`) because the workflows don't exist until Phase 30 and 31. The codes must be registered now so QUAL-06 is complete and LINT-010 validation can check for uniqueness.

### Anti-Patterns to Avoid

- **Generic principles without values:** "Use good contrast" is useless to an LLM. "Use Lc 90 for body text, Lc 75 minimum" is actionable.
- **Aspirational descriptions:** "Create visually stunning motion" produces nothing. "Use `cubic-bezier(0.34, 1.56, 0.64, 1)` for spring entrance on interactive elements" produces CSS.
- **Scope creep in reference files:** Each reference file has an explicit boundary. APCA contrast rules in `composition-typography.md` must not duplicate the WCAG content in `wcag-baseline.md`.
- **Non-LLM-consumable format:** Human prose paragraphs without tables and code examples are harder for the agent to act on. Tables and code examples first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spring physics easing | Custom JS spring physics system | CSS `linear()` with spring values OR GSAP with spring parameters | `linear()` is at 88% browser support; GSAP is now free and handles the JS path |
| Scroll-driven animations | IntersectionObserver + GSAP JS workaround | CSS `animation-timeline: scroll()` + `@supports` fallback | Native CSS is GPU-composited, no main-thread JS required; GSAP as fallback only |
| Awwwards scoring rubric | AI-generated evaluation criteria | Human-authored reference file before any agent exists | Circular evaluation: AI-generated rubric is influenced by training distribution; human-authored rubric provides external fixed standard |
| APCA contrast calculations | Custom lightness math | APCA lookup table + `myndex.com/APCA` calculator | APCA uses a non-trivial perceptual model; the Lc lookup table is the artifact we need |
| Type pairing logic | "Pick fonts that look good together" instruction | Named pairing rationale (classification contrast + proportion match) | LLMs need categorical rules; "looks good" produces Inter + Inter |
| Variable font axis values | Per-project custom animation values | Named axis ranges with recommended transition parameters | Standardized in the reference file; skill reads and applies without reinventing |

**Key insight:** Phase 29 is documentation and infrastructure, not implementation. The "don't hand-roll" principle applies to the CONTENT of the reference files — don't invent values when authoritative sources exist (Awwwards scoring, APCA thresholds, GSAP API).

---

## Common Pitfalls

### Pitfall 1: APCA Lc Polarity Confusion

**What goes wrong:** APCA Lc values can be positive or negative depending on text/background polarity. Dark text on light background = positive Lc; light text on dark background = negative Lc. The absolute value is what matters for readability comparison.

**Why it happens:** Designers used to WCAG's unsigned ratio (4.5:1) expect a single unsigned number.

**How to avoid:** Always document Lc as an absolute value in the reference file. State "body text requires |Lc| ≥ 90" not "Lc 90." The APCA calculator at myndex.com/APCA automatically handles polarity.

**Warning signs:** Reference file says "Lc 90" without specifying it's an absolute value.

### Pitfall 2: CSS Scroll-Driven Animation — Firefox Missing

**What goes wrong:** Mockup skill generates CSS scroll-driven animations that work in Chrome/Safari but are completely invisible in Firefox. Awwwards judges use multiple browsers.

**Why it happens:** Firefox still has scroll-driven animations behind a preference flag (not enabled by default) as of March 2026. Chrome shipped in v115 (2023), Safari shipped in Safari 26 (2025), Firefox remains unshipped.

**How to avoid:** The `motion-design.md` reference file MUST document the `@supports` guard as mandatory, not optional. The pattern is:

```css
@supports (animation-timeline: scroll()) {
  .element {
    animation-timeline: scroll();
    animation-range: 0% 100%;
  }
}
/* Fallback: element is statically visible without animation */
```

**Warning signs:** Reference file shows scroll-driven animation CSS without the `@supports` wrapper.

### Pitfall 3: GSAP Club Plugins — Now All Free

**What goes wrong:** Historical documentation says ScrollTrigger required Club GreenSock membership. Outdated references may still recommend workarounds.

**Why it happens:** Webflow acquired GreenSock in late 2024 and made all GSAP plugins (including ScrollTrigger, SplitText, DrawSVG, MorphSVG) completely free as of May 2025.

**How to avoid:** The `motion-design.md` reference file should document GSAP as fully free with all plugins available via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/ScrollTrigger.min.js"></script>
<script>gsap.registerPlugin(ScrollTrigger);</script>
```

**Warning signs:** Reference file says "ScrollTrigger requires Club membership" or recommends older GSAP versions.

### Pitfall 4: Protected-Files Enforcement Does Not Apply to Write/Edit Tools

**What goes wrong:** `protected-files.json` with `sandbox.filesystem.allowWrite` restrictions is assumed to block Write and Edit tool calls. It does not — bwrap only restricts the Bash tool.

**Why it happens:** Claude Code's sandbox documentation is ambiguous; the Write/Edit tools run in-process via `fs.writeFileSync` and bypass filesystem isolation.

**How to avoid:** The `protected-files.json` file must include an explicit `"enforcement": "prompt"` key explaining that enforcement is via agent system prompt instructions only. Every fleet agent prompt must include a negative constraint like: "You MUST NOT write to any path listed in protected-files.json. Check protected-files.json before every Write or Edit tool call."

**Warning signs:** `protected-files.json` exists but fleet agent prompts don't reference it.

### Pitfall 5: Awwwards Rubric 1-10 Scale — Most Is Inference

**What goes wrong:** The reference file attempts to document specific numeric criteria for each score level (1-10) per dimension. Awwwards does not publish a detailed public rubric at that granularity.

**Why it happens:** The official evaluation page confirms the 4 dimensions and weights but not per-score criteria.

**How to avoid:** The `quality-standards.md` reference file should document: (a) confirmed criteria with HIGH confidence, (b) inferred score-level distinctions clearly labeled as "inferred from SOTD analysis," and (c) the binary award thresholds that are confirmed (SOTD ≥ 8.0, Honorable Mention ≥ 6.5). Don't present inferred criteria as if they were published standards.

**Warning signs:** Reference file presents all per-score criteria as "Awwwards official" without distinguishing confirmed from inferred.

### Pitfall 6: CSS `linear()` vs `cubic-bezier()` for Spring Effects

**What goes wrong:** Reference file recommends `cubic-bezier()` for spring physics. A single cubic-bezier cannot produce multi-bounce spring effects — it can only produce a single overshoot.

**Why it happens:** `linear()` is newer and less well-known. `cubic-bezier` is the historically universal easing tool.

**How to avoid:** The `motion-design.md` reference must document both:
- `cubic-bezier(0.34, 1.56, 0.64, 1)` — single-overshoot spring approximation (works everywhere, limited fidelity)
- `linear()` with 40-50 data points — accurate multi-bounce spring (88% browser support as of late 2025)
- GSAP's spring easing — full physics simulation (JS required, unlimited fidelity)

**Warning signs:** Reference file only lists cubic-bezier values and calls them "spring physics."

---

## Code Examples

Verified patterns from authoritative sources:

### GSAP 3.14 CDN Setup with ScrollTrigger

```html
<!-- Source: gsap.com/docs/v3/Plugins/ScrollTrigger/ and jsdelivr.com -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/ScrollTrigger.min.js"></script>
<script>
  gsap.registerPlugin(ScrollTrigger);

  gsap.to('.hero-headline', {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top 80%',
      end: 'bottom 20%',
      scrub: false
    }
  });
</script>
```

### CSS Scroll-Driven Animation with Mandatory @supports

```css
/* Source: MDN CSS scroll-driven animations + WebKit.org guide (Safari 26 confirmed) */
@supports (animation-timeline: scroll()) {
  .reveal-on-scroll {
    animation: fade-in linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fallback: element visible without animation in Firefox */
.reveal-on-scroll {
  opacity: 1;
  transform: none;
}
```

### CSS Spring Physics: Three Levels

```css
/* Level 1: Single-overshoot spring — works everywhere */
/* Source: CSS specification, cubic-bezier reference */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Level 2: Multi-bounce spring approximation via linear() */
/* Source: joshwcomeau.com/animation/linear-timing-function/ */
/* 88% browser support as of December 2023 */
--ease-spring-bounce: linear(
  0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%,
  0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%,
  1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%,
  1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%,
  1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1
);

/* Level 3: GSAP spring with physics parameters */
/* Source: gsap.com docs — requires GSAP loaded */
/* gsap.to(el, { ease: 'elastic.out(1, 0.3)', duration: 1 }); */
```

### Variable Font Axis Animation

```css
/* Source: MDN font-variation-settings, css-irl.info variable font animation */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

.nav-link {
  font-weight: 400;
  transition: font-weight 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-link:hover {
  font-weight: 700;
}

/* Width axis animation (requires font with wdth axis) */
.hero-headline {
  font-variation-settings: 'wdth' 100;
  transition: font-variation-settings 400ms ease-out;
}

.hero-headline:hover {
  font-variation-settings: 'wdth' 120;
}
```

### APCA Contrast Check Pattern

```
/* Source: git.apcacontrast.com/documentation/APCA_in_a_Nutshell */

APCA Lc Minimum Values by Context:
  Body text (fluent reading): |Lc| ≥ 90 (preferred), |Lc| ≥ 75 (minimum)
  Content text: |Lc| ≥ 60
  Large headlines (36px+ normal, 24px+ bold): |Lc| ≥ 45
  Spot-readable (placeholders, disabled): |Lc| ≥ 30
  Non-semantic (dividers, focus outlines): |Lc| ≥ 15

Font-Size/Weight Minimums at Lc 75:
  24px/weight 300 — minimum for lc75 body
  18px/weight 400 — minimum for lc75 body
  16px/weight 500
  14px/weight 700

Calculator: https://www.myndex.com/APCA/
Note: Positive Lc = dark text on light bg; negative Lc = light text on dark bg.
Use absolute value |Lc| for readability assessment.
```

### DTCG Motion Token Format

```json
/* Source: designtokens.org DTCG 2025.10 spec — transition type */
{
  "motion": {
    "duration": {
      "micro":     { "$type": "duration", "$value": "80ms",   "$description": "Icon state changes, checkbox ticks" },
      "quick":     { "$type": "duration", "$value": "150ms",  "$description": "Tooltip show/hide, hover feedback" },
      "default":   { "$type": "duration", "$value": "250ms",  "$description": "Button press, toggle, card expand" },
      "moderate":  { "$type": "duration", "$value": "400ms",  "$description": "Panel slide, dropdown open" },
      "slow":      { "$type": "duration", "$value": "600ms",  "$description": "Page transitions, modal entrance" },
      "dramatic":  { "$type": "duration", "$value": "1000ms", "$description": "Hero entrance, scroll-driven reveals" }
    },
    "easing": {
      "standard":    { "$type": "cubicBezier", "$value": [0.2, 0, 0, 1], "$description": "Default — quick accel, slow decel" },
      "enter":       { "$type": "cubicBezier", "$value": [0, 0, 0.2, 1], "$description": "Elements entering screen" },
      "exit":        { "$type": "cubicBezier", "$value": [0.4, 0, 1, 1], "$description": "Elements leaving screen" },
      "spring":      { "$type": "cubicBezier", "$value": [0.34, 1.56, 0.64, 1], "$description": "Single-overshoot spring" },
      "spring-full": { "$type": "string",      "$value": "linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%, 0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%, 1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%, 1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%, 1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1)", "$description": "Multi-bounce spring via CSS linear()" }
    },
    "delay": {
      "none":      { "$type": "duration", "$value": "0ms" },
      "short":     { "$type": "duration", "$value": "50ms",  "$description": "Stagger between adjacent items" },
      "medium":    { "$type": "duration", "$value": "100ms", "$description": "Stagger across a list" },
      "narrative": { "$type": "duration", "$value": "200ms", "$description": "Delay for semantic sequencing (headline then body)" }
    },
    "transition": {
      "button-hover": {
        "$type": "transition",
        "$value": {
          "duration": "{motion.duration.quick}",
          "delay": "{motion.delay.none}",
          "timingFunction": "{motion.easing.standard}"
        }
      }
    }
  }
}
```

### Grid Systems: Named Options for Wireframe Annotation

```
Named Grid Systems (use exact names in wireframe annotations):

1. "12-column symmetric"
   - 12 equal columns, identical gutters
   - Rationale: Maximum layout flexibility, divides evenly into 2/3/4/6 columns
   - Use when: Content-heavy layouts requiring dense information hierarchy

2. "Golden ratio split"
   - Primary column: 61.8% width; Secondary column: 38.2% width
   - Ratio: 1:1.618 (phi)
   - Rationale: Asymmetric visual tension with perceptually balanced proportions
   - Use when: Hero sections, editorial layouts, portfolio pages with mixed content types

3. "Rule-of-thirds"
   - 3-column equal split; key content at intersection points
   - Rationale: Focal points at 1/3 and 2/3 horizontal positions create visual interest
   - Use when: Photography-forward layouts, landing pages with strong imagery

4. "Modular"
   - Equal horizontal AND vertical divisions creating cell grid
   - Rationale: Magazine-style layouts requiring both column and row control
   - Use when: Dashboard tiles, card-grid layouts, magazine-style article pages

5. "Asymmetric explicit"
   - Named proportions (e.g., 2:5:3, 3:7, 1:4:1) with explicit rationale
   - Rationale: Deliberate visual tension; one column meaningfully wider/narrower than others
   - Use when: Any Awwwards-targeting layout — default symmetric grids are a low-score signal
```

### Type Pairing Contrast Rationale (Classification-Based)

```
Type Pairing Rules (contrast rationale must use these categories):

CLASSIFICATION CONTRAST (primary pairing signal):
  - Humanist serif + Geometric sans: organic warmth vs. systematic precision
    Example: Literata + Inter — warmth-precision tension
  - Old-style serif + Neo-grotesque: historical authority vs. modern neutrality
    Example: EB Garamond + Helvetica Neue
  - Transitional serif + Humanist sans: structured formality vs. approachable warmth
    Example: Source Serif 4 + DM Sans
  - Slab serif + Grotesque: industrial weight vs. utilitarian clarity
    Example: Rockwell + Aktiv Grotesk

PROPORTION MATCH (secondary pairing signal):
  - Match x-height across display + body faces (visual cohesion at body size)
  - Match optical weight (both light-feeling or both substantial)
  - Do NOT match classification AND proportion — creates zero contrast

PAIRING DOCUMENTATION FORMAT (required in critique/handoff output):
  Display: [Name] ([Classification])
  Body: [Name] ([Classification])
  Contrast rationale: [Classification A] vs [Classification B] — [what tension this creates]
  X-height match: [similar/mismatched — acceptable if intentional]
```

### Awwwards Score-Level Criteria (Synthesized)

```
CONFIRMED thresholds (from official Awwwards evaluation page):
  SOTD (Site of the Day): overall weighted score ≥ 8.0
  Honorable Mention: ≥ 6.5
  Developer Award: developer score component evaluated separately

SCORING FORMULA:
  Overall = (Design × 0.40) + (Usability × 0.30) + (Creativity × 0.20) + (Content × 0.10)

INFERRED per-level criteria from SOTD winner analysis:

DESIGN dimension (40%):
  9-10: Custom typeface or sophisticated variable font usage; deliberate asymmetric composition;
        design system holds identically across all pages; refined micro-details at cursor level
  7-8:  Strong visual hierarchy; cohesive palette; consistent spacing rhythm
  5-6:  Stock components visible; inconsistent detail across pages
  1-4:  Template patterns, no design system cohesion

USABILITY dimension (30%):
  9-10: LCP <1.5s; CLS <0.05; INP <100ms; mobile-first (not retrofit); 60fps animations throughout
  7-8:  Core Web Vitals green; functional on mobile; keyboard navigable
  5-6:  Loads within 3s; mobile usable but not optimized; some keyboard issues
  1-4:  >5s load time; breaks on mobile; no keyboard navigation

CREATIVITY dimension (20%):
  9-10: One "signature moment" — a custom, concept-driven interaction not seen before;
        custom cursor behavior; WebGL/Three.js OR CSS-only equivalent visual distinctiveness
  7-8:  Custom scroll behavior; non-standard navigation pattern; concept serves content
  5-6:  Scroll animations present but generic; standard interaction patterns
  1-4:  No custom interactions; seen-before patterns throughout

CONTENT dimension (10%):
  9-10: Original copy written for the web; custom photography/illustration; content-design integration
        (writing reads designed, not pasted in)
  7-8:  Strong original copy; real imagery; consistent voice
  5-6:  Adequate copy; some stock imagery; minor gaps
  1-4:  Lorem ipsum; stock photography; content-design disconnect

AI AESTHETIC FLAGS (automatic low-score signals in critique):
  - Generic gradient: purple-to-teal or blue-to-purple with no concept rationale
  - Symmetric hero: perfectly centered content with symmetric whitespace on both sides
  - Inter-only: no typeface contrast or classification pairing
  - Decorative motion: animations that convey no meaning (random stagger, all-at-once entrance)
  - Missing visual hook: no interaction or visual element that is specific to this concept
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GSAP Club membership required for ScrollTrigger | All GSAP plugins free, CDN available | May 2025 (Webflow acquisition) | Remove all membership warnings from docs |
| `cubic-bezier()` for spring physics | `linear()` with 40-50 points for accurate spring | December 2023 (all major browsers) | 88% support; use for production spring effects |
| WCAG 2.x contrast ratio (4.5:1) | APCA Lc scale (perceptually uniform) | 2020-present; WCAG 3.0 candidate | APCA accounts for font weight and size; more accurate for screens |
| CSS scroll animations via IntersectionObserver + JS | Native CSS `animation-timeline: scroll()` | Chrome 115 (2023), Safari 26 (2025) | Firefox still not shipping; `@supports` mandatory |
| Single CDN URL for GSAP plugins | `npm gsap@3.14` or `cdn.jsdelivr.net/npm/gsap@3.14` | 3.12+ (licensing change) | Previously required Club CDN URL for premium plugins |

**Deprecated/outdated:**
- `@scroll-timeline` (spec name): Replaced by `animation-timeline: scroll()` and `view()`. The `@scroll-timeline` at-rule was the old draft syntax — do not use.
- GSAP `TweenMax`/`TweenLite`: Replaced by unified `gsap.*` API in GSAP 3.x (2019). If existing code uses TweenMax, it's pre-3.0.
- WCAG 2.x 4.5:1 as the only contrast metric: Still required for legal compliance, but APCA is the perceptually correct metric. Document both.

---

## Open Questions

1. **Awwwards per-score-level criteria (QUAL-01)**
   - What we know: Confirmed 4 dimensions, confirmed SOTD ≥ 8.0 and HM ≥ 6.5 thresholds, confirmed sub-score criteria from winner analysis
   - What's unclear: Awwwards does not publish a public 1-10 rubric per dimension. The per-level criteria in `quality-standards.md` will be inferred from SOTD/HM analysis, not from an official document.
   - Recommendation: Label inferred criteria explicitly in the reference file ("inferred from SOTD winner analysis") so downstream agents don't present them as official Awwwards requirements.

2. **Firefox scroll-driven animations timeline**
   - What we know: Not shipped by default as of March 2026. Safari 26 shipped. Chrome/Edge shipped 2023. Firefox is tracking.
   - What's unclear: When Firefox will ship. The `@supports` guard is non-negotiable until it does.
   - Recommendation: `motion-design.md` must make `@supports` wrapping non-negotiable, not a "nice to have." Flag Firefox gap explicitly in the browser support table.

3. **protected-files.json enumeration completeness**
   - What we know: The minimum protected set is clear. `quality-standards.md`, `skill-style-guide.md`, `improve.md`, all `bin/` scripts, `protected-files.json` itself.
   - What's unclear: Whether additional files in `commands/` or `workflows/` should be protected. The principle is: files that fleet agents could corrupt and that would disable the quality system itself.
   - Recommendation: Start with a conservative list (minimum required for circular evaluation prevention and tool stability). Allow human expansion later. Do NOT protect `commands/` and `workflows/` wholesale — fleet agents need write access to these.

4. **GSAP ScrollTrigger vs. CSS scroll-driven animations — which to recommend**
   - What we know: CSS scroll-driven animations are native and GPU-composited, but Firefox-unsupported. GSAP ScrollTrigger works across all browsers but requires JS.
   - What's unclear: The `motion-design.md` reference needs to make a prescriptive recommendation.
   - Recommendation: Default to CSS scroll-driven with `@supports` for simple effects; recommend GSAP ScrollTrigger for complex scroll choreography (scrub, pinning, callbacks). Document both in the reference file with explicit use-case boundaries.

---

## Validation Architecture

Phase 29 produces files (reference files, JSON, .cjs, .md) — there is no executable code to test. Nyquist validation applies differently here: the "tests" are structural completeness checks.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | `references/quality-standards.md` exists with 4 dimensions and score criteria | Existence + structure | `node -e "const fs=require('fs'); const c=fs.readFileSync('references/quality-standards.md','utf8'); console.assert(c.includes('Design 40%') && c.includes('Usability 30%') && c.includes('Creativity 20%') && c.includes('Content 10%'), 'Missing dimension weights'); console.log('QUAL-01 PASS');"` | ❌ Wave 0 |
| QUAL-02 | `references/motion-design.md` exists with GSAP CDN patterns and scroll-driven examples | Existence + content | `node -e "const fs=require('fs'); const c=fs.readFileSync('references/motion-design.md','utf8'); console.assert(c.includes('gsap@3.14') && c.includes('@supports'), 'Missing GSAP CDN or @supports'); console.log('QUAL-02 PASS');"` | ❌ Wave 0 |
| QUAL-03 | `references/composition-typography.md` exists with APCA Lc values | Existence + content | `node -e "const fs=require('fs'); const c=fs.readFileSync('references/composition-typography.md','utf8'); console.assert(c.includes('Lc') && c.includes('golden ratio'), 'Missing APCA or grid systems'); console.log('QUAL-03 PASS');"` | ❌ Wave 0 |
| QUAL-04 | `protected-files.json` exists with `protected` and `allowed_write_directories` keys | JSON validity + keys | `node -e "const p=require('./protected-files.json'); console.assert(Array.isArray(p.protected) && Array.isArray(p.allowed_write_directories), 'Missing required keys'); console.log('QUAL-04 PASS');"` | ❌ Wave 0 |
| QUAL-05 | model-profiles.cjs includes all 4 new agent entries | Code inspection | `node -e "const {MODEL_PROFILES}=require('./bin/lib/model-profiles.cjs'); const agents=['pde-output-quality-auditor','pde-skill-linter','pde-design-quality-evaluator','pde-template-auditor']; agents.forEach(a=>console.assert(a in MODEL_PROFILES, \`Missing: \${a}\`)); console.log('QUAL-05 PASS');"` | ❌ Wave 0 |
| QUAL-06 | skill-registry.md includes AUD, IMP, PRT codes | Content check | `node -e "const fs=require('fs'); const c=fs.readFileSync('skill-registry.md','utf8'); ['AUD','IMP','PRT'].forEach(code=>console.assert(c.includes('| '+code+' |'), \`Missing code: \${code}\`)); console.log('QUAL-06 PASS');"` | ❌ Wave 0 |

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js inline assertions (zero-dependency, matches PDE stack) |
| Config file | none — inline node -e commands |
| Quick run command | `node -e "[inline assertion]"` (per requirement) |
| Full suite command | Run all 6 inline assertions sequentially |

### Wave 0 Gaps

- [ ] All 6 test commands above — these are created at task completion time by running the assertions against the newly created files, not pre-created test files.
- No separate test file infrastructure needed — Node.js inline `node -e` assertions are sufficient and zero-dependency.

*(No test framework install required — all Node.js built-ins.)*

---

## Sources

### Primary (HIGH confidence)

- [Awwwards Evaluation System](https://www.awwwards.com/about-evaluation/) — 4-dimension structure, weights, SOTD/HM thresholds confirmed
- [APCA Nutshell Documentation](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html) — Lc threshold table verified (Lc 90, 75, 60, 45, 30, 15)
- [GSAP npm package](https://www.npmjs.com/package/gsap) — version 3.14.2 current version confirmed
- [jsDelivr GSAP CDN](https://www.jsdelivr.com/package/npm/gsap) — CDN URL pattern confirmed: `cdn.jsdelivr.net/npm/gsap@3.14/dist/`
- [MDN CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations) — browser support, @supports pattern, Firefox not shipping confirmed
- [MDN font-variation-settings](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variation-settings) — variable font axis animation properties confirmed
- [WebKit.org scroll-driven animations guide](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/) — Safari 26 support confirmed
- PDE codebase direct inspection — `bin/lib/model-profiles.cjs` structure, `skill-registry.md` format, `references/typography.md` format pattern
- [GSAP Tumult Forum — 3.14 is now free](https://forums.tumult.com/t/gsap-3-14-is-now-free/24779) — Webflow acquisition, free licensing confirmed May 2025
- [Claude Code sandbox issue #29048](https://github.com/anthropics/claude-code/issues/29048) — confirmed Write/Edit tools bypass bwrap sandbox; prompt-level enforcement is the only reliable mechanism

### Secondary (MEDIUM confidence)

- [Utsubo.com Awwwards scoring guide](https://www.utsubo.com/blog/award-winning-website-design-guide) — per-dimension SOTD criteria (verified against official dimension weights but per-level criteria are editorial synthesis, not official)
- [Josh W. Comeau — CSS linear() easing](https://www.joshwcomeau.com/animation/linear-timing-function/) — CSS `linear()` spring values and 88% browser support claim (Dec 2023)
- [GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) — core API properties (trigger, start, end, scrub, pin)

### Tertiary (LOW confidence)

- Material Design 3 motion token values — page content inaccessible in fetch; duration/easing values in the DTCG examples above are inferred from M2 spec + Carbon Design System and need validation against M3 official token file
- Per-score-level criteria (score 1-10 per Awwwards dimension) — synthesized from SOTD winner analysis; Awwwards does not publish this level of granularity publicly

---

## Metadata

**Confidence breakdown:**
- Awwwards rubric structure (4 dimensions, weights, thresholds): HIGH — official evaluation page confirmed
- Per-level score criteria (1-10): LOW — synthesized from winner analysis, not official document
- GSAP 3.14 CDN patterns and free licensing: HIGH — npm, jsDelivr, and forum confirmation
- CSS scroll-driven animation browser support: HIGH — MDN and WebKit official confirmation
- CSS linear() spring physics browser support: MEDIUM — Josh Comeau article, not MDN primary source
- APCA Lc thresholds: HIGH — official APCA documentation verified
- protected-files.json Write/Edit bypass behavior: HIGH — GitHub issue #29048 confirmed
- Type pairing classification contrast rationale: MEDIUM — typography first principles, multiple sources

**Research date:** 2026-03-17
**Valid until:** 2026-06-17 (90 days — stable domains, but scroll-driven animation Firefox support may change)
