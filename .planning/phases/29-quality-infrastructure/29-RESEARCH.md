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

---

## Deep Dive Research

*Added 2026-03-17 — expanded precision research across 7 areas.*

---

### DD-1: Awwwards Scoring Specifics — Per-Dimension Score Patterns

**Confidence:** MEDIUM — synthesized from winner analysis (Utsubo editorial guide + Awwwards winner observation). Official per-level rubric does not exist publicly.

#### What Separates 9+ from 7-8 from Below 6 Per Dimension

**DESIGN dimension (weight: 40%)**

The Utsubo scoring guide (the most detailed synthesis available) differentiates levels as follows:

| Score Range | Telltale Signs |
|-------------|---------------|
| **9-10** | Custom typeface OR variable font with non-default axis usage; every page maintains identical spacing rhythm; micro-details at cursor level (custom cursor, pixel-level hover states); design system is demonstrably intentional, not Figma template |
| **7-8** | Strong visual hierarchy; palette is cohesive and serves brand identity; spacing is consistent on primary pages; transitions are present and consistent |
| **5-6** | Stock UI components recognizable (Shadcn default, MUI default); inconsistent detail — hero is polished, inner pages are not; spacing rhythm absent or random |
| **1-4** | Template patterns (Webflow template, Framer template); no evidence of a design system; copy-paste components across unrelated sections |

**Specific 9 vs 7 differentiator in Design:** At 9, every interactive state (hover, focus, active, loading) has a distinct, purposeful visual treatment. At 7, hover states exist but focus/active may be browser defaults.

**USABILITY dimension (weight: 30%)**

| Score Range | Telltale Signs |
|-------------|---------------|
| **9-10** | LCP < 1.5s (not just <2.5s); CLS < 0.05; INP < 100ms; mobile layout was designed mobile-first (not scaled down desktop); all animations run at 60fps on mid-range Android |
| **7-8** | Core Web Vitals in green thresholds (LCP <2.5s, CLS <0.1); mobile usable; keyboard navigation works; animations may drop frames on low-end devices |
| **5-6** | 3-4 second load; mobile is responsive but clearly desktop-first; some keyboard traps; CLS visible during load |
| **1-4** | >5 second load; breaks on mobile; no keyboard navigation; layout shift during page load |

**Specific 9 vs 7 differentiator in Usability:** A 9 has tested on actual mobile hardware, not just DevTools responsive mode. Navigation is discoverable within 3 seconds without prior knowledge.

**CREATIVITY dimension (weight: 20%)**

| Score Range | Telltale Signs |
|-------------|---------------|
| **9-10** | One "signature moment" — a single interaction or visual that is not seen anywhere else; this is concept-specific, not a generic pattern; examples: a morphing SVG logo tied to scroll depth, a custom cursor that reveals content, a text scramble that reads the user's hesitation |
| **7-8** | Custom scroll behavior (pinning, horizontal scroll, parallax layers); non-standard navigation pattern (mega-menu isn't non-standard; a navigation that IS the content is); the creative concept serves the product story |
| **5-6** | Scroll animations are present but generic (fade-in from below is not creative); standard interaction patterns executed cleanly |
| **1-4** | No custom interactions; every interaction is seen on 10,000 other sites; creativity = stock gradient + stock font |

**Specific 9 vs 7 differentiator in Creativity:** At 9, there is one interaction that a jury member will mention in their notes because they have never seen it. At 7, all the interactions are recognizable patterns executed well. The 9 requires a concept-specific idea — it cannot be lifted from a CodePen.

**CONTENT dimension (weight: 10%)**

| Score Range | Telltale Signs |
|-------------|---------------|
| **9-10** | Original photography/illustration; copy is written for the web (scannable, brand-voiced, not press release); content integrates with design (line breaks are intentional, not accidental) |
| **7-8** | Real content throughout; copy quality is acceptable; imagery is real but possibly mixed with light stock |
| **5-6** | Some stock imagery; adequate copy with minor brand misalignment; content feels inserted post-design |
| **1-4** | Lorem ipsum visible; obvious stock photography; machine translation artifacts; content-design disconnect |

#### Named Patterns Observed in SOTD Winners (Inferred)

These named patterns recur in SOTD winner analysis. They are descriptive categories, not official Awwwards terminology:

1. **Scroll-as-narrative:** Scroll position controls content reveal in a meaningful sequence — not random; the user is being told a story, not shown features
2. **Single-signature-moment:** One interaction that is concept-specific and non-generic; the site has earned its award with this one thing
3. **Micro-detail saturation:** Every element has a purposeful hover/active state; nothing was left at browser defaults
4. **Typography-as-layout:** Type is the primary visual element, not decoration; oversized type creates composition, not just hierarchy
5. **Performance-first motion:** Animations are GPU-composited (transform, opacity), never layout-thrashing; complex motion doesn't sacrifice Usability score

---

### DD-2: Motion Design Patterns — Named Choreography

**Confidence:** HIGH (GSAP docs verified) / MEDIUM (pattern naming is community convention, not official spec)

#### Named Animation Patterns with Implementations

**Pattern 1: Staggered Reveal Choreography**

Stagger with directional control — not just `stagger: 0.1` on everything.

```javascript
// Source: gsap.com/docs/v3/Plugins/SplitText/ + Codrops 2025
// Stagger direction: "start" | "center" | "end" | "edges" | "random"
gsap.from('.card', {
  opacity: 0,
  y: 40,
  duration: 0.6,
  ease: 'power2.out',
  stagger: {
    each: 0.08,     // 80ms between each element
    from: 'start',  // Direction: first card animates first
    ease: 'power1.in'  // Stagger timing itself eases in
  }
});

// For center-out stagger (expands from middle):
stagger: { each: 0.08, from: 'center' }

// For random stagger (organic, non-mechanical feel):
stagger: { each: 0.08, from: 'random' }

// Alternating direction values (odd left, even right):
gsap.from('.item', {
  x: gsap.utils.wrap([-50, 50]),  // alternates -50, 50, -50, 50...
  opacity: 0,
  stagger: 0.1
});
```

**Pattern 2: Text Split Animation with Masking (Stagger Reveal)**

The standard award-winning text entrance. Masks prevent characters from being visible before animation starts.

```javascript
// Source: gsap.com/docs/v3/Plugins/SplitText/ (v3.13+ required for mask)
// CDN: cdn.jsdelivr.net/npm/gsap@3.14/dist/SplitText.min.js

gsap.registerPlugin(SplitText);

// Headline word-by-word reveal with clipping mask:
SplitText.create('.hero-headline', {
  type: 'words,lines',
  mask: 'words',           // wraps each word in a clipping container
  onSplit(self) {
    return gsap.from(self.masks, {
      duration: 0.7,
      yPercent: 110,       // slides up from below the mask
      stagger: 0.06,
      ease: 'power3.out'
    });
  }
});

// Character-level stagger (for short words, display type only):
SplitText.create('.tagline', {
  type: 'chars',
  mask: 'chars',
  onSplit(self) {
    return gsap.from(self.masks, {
      duration: 0.5,
      yPercent: 100,
      stagger: { each: 0.03, from: 'start' },
      ease: 'power2.out'
    });
  }
});
```

**Pattern 3: Parallax Depth Layering**

Multiple elements at different scroll speeds create perceived depth. The data-speed pattern decouples speed definition from JS.

```html
<!-- HTML: data-speed attribute drives parallax ratio -->
<section class="hero">
  <div class="hero__bg"      data-speed="0.3"><!-- background moves slowest --></div>
  <div class="hero__midground" data-speed="0.6"><!-- mid layer --></div>
  <div class="hero__headline" data-speed="1.0"><!-- moves at scroll speed --></div>
  <div class="hero__fg"      data-speed="1.4"><!-- foreground moves fastest --></div>
</section>
```

```javascript
// Source: GSAP ScrollTrigger parallax pattern (gsap.com/docs/v3/Plugins/ScrollTrigger/)
gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll('[data-speed]').forEach(el => {
  const speed = parseFloat(el.dataset.speed);
  gsap.to(el, {
    yPercent: -20 * speed,  // adjust range as needed
    ease: 'none',
    scrollTrigger: {
      trigger: el.closest('section'),
      start: 'top bottom',
      end: 'bottom top',
      scrub: true          // ties animation to scroll position 1:1
    }
  });
});
```

**Pattern 4: ScrollTrigger Pinned Horizontal Scroll**

Used in award-winning portfolio sites for project galleries. Pins the section and scrolls content horizontally while page scroll position advances.

```javascript
// Source: GSAP ScrollTrigger docs — horizontal scroll with pin
const sections = gsap.utils.toArray('.panel');
const container = document.querySelector('.horizontal-container');

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: container,
    pin: true,             // pins the section during scroll
    scrub: 1,              // 1-second smoothing lag
    snap: 1 / (sections.length - 1),  // snap to each panel
    end: () => `+=${container.offsetWidth}`
  }
});
```

**Pattern 5: Morphing SVG Transition (DrawSVG + MorphSVG)**

Signature moments: a logo that morphs on scroll, or an icon that transitions between states.

```javascript
// Source: gsap.com/docs/v3/Plugins/DrawSVGPlugin/ + MorphSVGPlugin/
// CDN: cdn.jsdelivr.net/npm/gsap@3.14/dist/DrawSVGPlugin.min.js
// CDN: cdn.jsdelivr.net/npm/gsap@3.14/dist/MorphSVGPlugin.min.js

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin);

// Draw an SVG path on scroll (logo reveal or illustration):
gsap.from('.logo-path', {
  drawSVG: 0,        // animates FROM 0% drawn TO 100%
  duration: 1.5,
  ease: 'power2.inOut',
  scrollTrigger: {
    trigger: '.logo-wrapper',
    start: 'top 80%',
    toggleActions: 'play none none reverse'
  }
});

// Draw from center outward (for icons, more dynamic):
gsap.fromTo('.icon-path',
  { drawSVG: '50% 50%' },
  { drawSVG: '0% 100%', duration: 0.8, ease: 'power2.out' }
);

// Morph between two SVG shapes:
gsap.to('#shape-from', {
  duration: 1,
  ease: 'power2.inOut',
  morphSVG: {
    shape: '#shape-to',
    type: 'rotational',  // smoother for organic shapes
    shapeIndex: 'auto'   // auto-calculates best point alignment
  }
});
```

**Pattern 6: Timeline-Based Entrance Choreography (Narrative Order)**

The anti-pattern is animating everything at once. Award-winning motion tells a story: headline first, then supporting content, then CTAs.

```javascript
// Source: GSAP timeline documentation + Codrops best practices
// Narrative entrance: headline → subtext → image → CTA
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.section',
    start: 'top 70%',
    once: true  // fires once, then kills trigger
  }
});

tl.from('.section__headline', {
    opacity: 0, y: 30, duration: 0.7, ease: 'power2.out'
  })
  .from('.section__body', {
    opacity: 0, y: 20, duration: 0.6, ease: 'power2.out'
  }, '-=0.3')   // overlaps by 0.3s — creates flow, not sequential rigidity
  .from('.section__image', {
    opacity: 0, scale: 0.95, duration: 0.8, ease: 'power2.out'
  }, '-=0.4')
  .from('.section__cta', {
    opacity: 0, y: 15, duration: 0.5, ease: 'power2.out'
  }, '-=0.2');
```

---

### DD-3: GSAP 3.14 Plugin API Specifics

**Confidence:** HIGH — fetched directly from gsap.com official documentation

#### CDN URL Reference (All Major Plugins)

**Pattern:** `https://cdn.jsdelivr.net/npm/gsap@3.14/dist/[PluginName].min.js`

All these plugins are free as of May 2025 (Webflow acquisition). No Club membership required.

```html
<!-- Core (required first) -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js"></script>

<!-- Scroll plugins -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/ScrollSmoother.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/ScrollToPlugin.min.js"></script>

<!-- Text plugins -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/SplitText.min.js"></script>

<!-- SVG plugins -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/DrawSVGPlugin.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/MorphSVGPlugin.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/MotionPathPlugin.min.js"></script>

<!-- UI plugins -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/Flip.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/Draggable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/Observer.min.js"></script>

<!-- Easing -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/CustomEase.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/EasePack.min.js"></script>

<!-- All plugins registered at once: -->
<script>
  gsap.registerPlugin(
    ScrollTrigger, ScrollSmoother, SplitText,
    DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin,
    Flip, Draggable, Observer, CustomEase
  );
</script>
```

**Alternative CDN (cdnjs — confirmed at v3.13.0, may lag behind jsDelivr):**
```
https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js
https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js
https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/SplitText.min.js
https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/DrawSVGPlugin.min.js
https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/MorphSVGPlugin.min.js
```

**Recommendation:** Use jsDelivr (not cdnjs) — cdnjs confirmed at 3.13.0, jsDelivr tracks npm releases immediately. Pin to `@3.14` (minor-pinned) not `@latest`.

#### ScrollTrigger Full API (3.14.1)

```javascript
// Source: gsap.com/docs/v3/Plugins/ScrollTrigger/
ScrollTrigger.create({
  trigger: '.element',         // element or selector whose position determines activation
  start: 'top 80%',           // "trigger-edge scroller-edge" — trigger top at 80% of viewport
  end: '+=500',                // relative: 500px after start
  scrub: 1,                    // true = instant scrub; number = smoothing seconds
  pin: true,                   // pin element during active range
  pin: '.other-element',       // pin a different element instead
  markers: true,               // development: shows start/end/trigger lines
  toggleActions: 'play pause resume reset',  // onEnter onLeave onEnterBack onLeaveBack
  snap: 0.5,                   // snap to nearest 50% progress increment
  snap: { snapTo: 'labels', duration: { min: 0.2, max: 3 } },
  once: true,                  // kill trigger after first enter
  onEnter: (self) => {},       // callback when entering forward
  onLeave: (self) => {},       // callback when leaving forward
  onEnterBack: (self) => {},   // callback when entering backward
  onLeaveBack: (self) => {},   // callback when leaving backward
  onUpdate: (self) => {},      // every progress change
  scroller: '.scroll-container', // custom scroll container (not window)
  horizontal: false,           // horizontal scroll mode
  invalidateOnRefresh: true    // recalculate on ScrollTrigger.refresh()
});

// Instance methods:
const st = ScrollTrigger.create({...});
st.progress;         // 0-1 normalized progress (read-only)
st.direction;        // 1 (forward) or -1 (backward)
st.isActive;         // boolean
st.getVelocity();    // px/s scroll speed
st.refresh();        // recalculate after DOM changes
st.kill();           // remove instance

// Static methods:
ScrollTrigger.getAll();          // array of all instances
ScrollTrigger.refresh();         // recalculate all instances
ScrollTrigger.batch('.cards', {  // coordinated group animation
  onEnter: (elements) => gsap.from(elements, { opacity: 0, y: 40, stagger: 0.1 })
});
ScrollTrigger.isScrolling();     // current scroll state boolean
```

#### SplitText Full API (3.13+ — major rewrite)

```javascript
// Source: gsap.com/docs/v3/Plugins/SplitText/
// Note: SplitText underwent major rewrite in 3.13.0 — use SplitText.create(), not new SplitText()

SplitText.create(selector, {
  type: 'chars,words,lines',  // what to split into (comma-delimited)
  tag: 'div',                 // wrapper element type
  wordsClass: 'word',         // CSS class for word elements
  charsClass: 'char',         // CSS class for char elements
  linesClass: 'line++',       // "++" = auto-increments: line1, line2, etc.
  mask: 'lines',              // clipping: "lines" | "words" | "chars" — prevents flash
  autoSplit: true,            // re-splits on font load or container width change
  aria: 'auto',               // accessibility: "auto" | "hidden" | "none"
  deepSlice: true,            // handles nested elements (default: true)
  propIndex: false,           // adds CSS var --word: 1, --char: 5, etc.
  smartWrap: false,           // prevents orphaned chars when splitting chars-only
  ignore: '.dont-split',      // descendant elements to exclude
  onSplit(self) {             // fires on each split — put animation here
    return gsap.from(self.masks, { yPercent: 110, stagger: 0.05 });
  }
});

// Instance properties (after split):
instance.chars   // array of char elements
instance.words   // array of word elements
instance.lines   // array of line elements
instance.masks   // array of mask wrapper elements (when mask is set)

// Instance methods:
instance.split()   // re-execute split logic
instance.revert()  // restore original HTML
instance.kill()    // remove without revert
```

**3.14 change vs 3.12:** SplitText 3.14.2 checks if targets were already split by another SplitText instance and automatically reverts first to avoid duplicate wrapping. In 3.12 and earlier, double-splitting caused nested DOM pollution.

#### DrawSVGPlugin API

```javascript
// Source: gsap.com/docs/v3/Plugins/DrawSVGPlugin/
// Animates stroke-dashoffset and stroke-dasharray to reveal/conceal SVG strokes

// drawSVG value formats:
// "0"           = 0% drawn (invisible)
// "100%" / true = fully drawn (100% visible)
// "20% 80%"     = shows stroke from 20% to 80% of total length
// "50% 50%"     = completely collapsed at midpoint
// "0 50%"       = shows first half

gsap.from('.path', { drawSVG: 0, duration: 1 });        // 0% to 100%
gsap.to('.path', { drawSVG: '0% 100%', duration: 1 });  // same thing
gsap.fromTo('.path',
  { drawSVG: '50% 50%' },   // start at center (collapsed)
  { drawSVG: '0% 100%', duration: 0.8, ease: 'power2.out' }  // expand outward
);

// Staggered multi-path draw:
gsap.from('.illustration path', {
  drawSVG: 0,
  duration: 0.8,
  stagger: 0.15,
  ease: 'power1.inOut'
});
```

#### MorphSVGPlugin API

```javascript
// Source: gsap.com/docs/v3/Plugins/MorphSVGPlugin/
// Morphs SVG <path> d attribute between shapes

// morphSVG property accepts:
// - Selector string: "#target-shape"
// - Element reference: document.querySelector('#target')
// - Raw path data string: "M47.1,0.8 73.3,0.8..."

// type: "linear" (default) | "rotational" (better for organic shapes)
// shapeIndex: auto | number | "log" (logs auto-calculated value to console)

gsap.to('#circle', {
  duration: 1,
  ease: 'power2.inOut',
  morphSVG: '#star'  // simplest form
});

gsap.to('#shape-a', {
  duration: 1.2,
  ease: 'power2.inOut',
  morphSVG: {
    shape: '#shape-b',
    type: 'rotational',   // smoother for non-rectangular organic shapes
    shapeIndex: 'auto',   // auto-finds best alignment; use 'log' to capture value
    smooth: { points: 80, redraw: true }  // smoother interpolation
  }
});

// Convert non-path SVG elements to paths first:
MorphSVGPlugin.convertToPath('circle, rect, ellipse');
```

#### What Changed from 3.12 to 3.14

| Area | 3.12 | 3.14 |
|------|------|------|
| SplitText API | `new SplitText()` constructor | `SplitText.create()` static factory (still accepts `new` but create() preferred) |
| SplitText double-split | Silent DOM pollution | Auto-reverts previous split before re-splitting |
| SplitText masking | Manual wrapper divs | Built-in `mask` option with `.masks` array |
| SplitText autoSplit | Manual resize listener needed | `autoSplit: true` handles resize automatically |
| Pricing | Club GSAP required for SplitText/DrawSVG/MorphSVG | 100% free, CDN available |

---

### DD-4: Spring Physics Math — Exact CSS linear() Values

**Confidence:** MEDIUM — spring values from Josh Comeau's analysis of spring-easing ecosystem. Exact pixel values depend on spring parameters; these are the recommended parameter sets and their characteristic linear() output patterns.

#### Spring Physics Primer

Three spring behaviors, defined by damping ratio (ζ):

| Type | Damping Ratio | Behavior | Use Case |
|------|--------------|----------|----------|
| **Underdamped** | ζ < 1 | Bounces past target, oscillates | Interactive feedback, playful UI |
| **Critically damped** | ζ = 1 | Fastest settle, no overshoot | Navigation, focus states, professional UI |
| **Overdamped** | ζ > 1 | Slow settle, no overshoot, sluggish | Heavy/deliberate UI, can feel laggy |

**Parameter conventions across libraries:**
- `stiffness` (k): spring strength — higher = faster, snappier
- `damping` (d): resistance — higher = less oscillation
- `mass` (m): inertia — higher = slower start/end

**Critical damping condition:** `d = 2 * √(k * m)` (e.g., for k=100, m=1: d = 2*√100 = 20)

#### Recommended Parameter Sets

| Spring Type | Stiffness | Damping | Mass | Character |
|------------|-----------|---------|------|-----------|
| Bouncy (underdamped) | 200 | 10 | 1 | 3-4 bounces, energetic |
| Standard bounce | 100 | 8 | 1 | 1-2 bounces, playful |
| Snappy (near-critical) | 300 | 25 | 1 | Fast, one small overshoot |
| Critically damped | 100 | 20 | 1 | Clean settle, no bounce |
| Smooth/slow | 60 | 12 | 1 | Gentle entrance |
| Heavy (overdamped) | 100 | 30 | 1 | Deliberate, weighty |

#### Copy-Paste CSS Values

**Underdamped (bouncy spring) — stiffness: 100, damping: 8, mass: 1**

This is the value from Josh Comeau's reference article, representing a typical underdamped spring:

```css
/* Source: joshwcomeau.com/animation/linear-timing-function/ */
/* Underdamped spring: stiffness=100, damping=8, mass=1 */
/* Duration: ~800ms */
--spring-bounce: linear(
  0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%,
  0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%,
  1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%,
  1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%,
  1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1
);
```

**Critically damped (clean settle) — stiffness: 100, damping: 20, mass: 1**

No bounce, fastest possible settle without overshoot:

```css
/* Critically damped spring: stiffness=100, damping=20, mass=1 */
/* Duration: ~600ms */
/* Use linear() generator at linear-easing-generator.netlify.app with these params */
--spring-settle: cubic-bezier(0.2, 0, 0, 1);
/* Note: cubic-bezier is a valid approximation for critically-damped — no overshoot */
/* For precise critically-damped, use GSAP: ease: "power3.out" approximates well */
```

**Overdamped (heavy/deliberate) — stiffness: 100, damping: 30, mass: 1**

Slower-than-critical, never bounces, feels weighty:

```css
/* Overdamped: use a slower ease-out cubic-bezier */
/* Linear() is rarely needed for overdamped — ease-out covers it */
--spring-heavy: cubic-bezier(0.4, 0, 0.6, 1);  /* slow in, slow out */
--spring-heavy-out: cubic-bezier(0.0, 0, 0.2, 1);  /* quick start, very slow settle */
```

#### How Many Keyframes for Smooth 60fps

For CSS `linear()`:
- **20 data points** = acceptable smoothness for simple motion (150ms or less)
- **40-50 data points** = good for most animations (300-800ms)
- **100+ data points** = required for multi-bounce springs with long duration (1000ms+)

The spring animation in the existing research (20 data points) is appropriate for the 800ms bounce spring above.

#### GSAP Spring Easing (Full Physics, No CSS Required)

```javascript
// GSAP provides true spring simulation via ease strings
// Source: gsap.com/docs/v3/Eases/

// elastic.out(amplitude, period)
// amplitude: 1.0 = minimal overshoot, 3.0 = large overshoot
// period: 0.3 = tight bounce, 0.8 = loose/slow bounce
gsap.to(el, { ease: 'elastic.out(1, 0.3)', duration: 1 });   // standard bounce
gsap.to(el, { ease: 'elastic.out(1.2, 0.4)', duration: 1 }); // bigger bounce

// back.out(overshoot)
// overshoot: 1.7 = default, 3.0 = dramatic pullback
gsap.to(el, { ease: 'back.out(1.7)', duration: 0.6 });  // snappy single overshoot

// power curves for critically-damped feel
gsap.to(el, { ease: 'power3.out', duration: 0.5 });  // no overshoot, quick settle
```

#### Tool Recommendation for Generating Custom linear() Values

The canonical tool for generating spring `linear()` values is Jake Archibald's **Linear Easing Generator**:
- Live tool: https://linear-easing-generator.netlify.app/
- GitHub: https://github.com/jakearchibald/linear-easing-generator

**Workflow:** Set spring parameters (stiffness, damping, mass) → tool generates the `linear()` string with optimal data point density → copy CSS variable.

**Always comment the parameters with the output:**
```css
/* spring: stiffness=200, damping=10, mass=1 | generated: linear-easing-generator.netlify.app */
--spring-bouncy: linear(0, 0.006, 0.025 2.8%, ...);
```

---

### DD-5: Typography Pairing — Specific Pairings with Documented Rationale

**Confidence:** MEDIUM — pairing rationale is typography first principles (verifiable), specific font choices are community/expert synthesis (not official Awwwards data)

#### Pairing Framework: The Two-Signal Model

Every pairing must have two signals — one contrast signal and one harmony signal:

| Signal Type | What It Is | Example |
|-------------|------------|---------|
| **Contrast signal** | Classification difference (serif vs sans, geometric vs humanist) | Slab serif headline + neo-grotesque body |
| **Harmony signal** | Optical relationship (x-height, weight, proportion) | Both have similar x-height at body size |

Fail: two fonts that match on both signals = zero tension (boring)
Fail: two fonts that contrast on both signals = visual fighting

#### Named Pairings — Copy-Paste Ready

**Pairing 1: Fraunces + Inter**
```
Display: Fraunces (Quirky humanist serif, optical size axis — expressive at large sizes)
Body: Inter (Neo-grotesque, high x-height, screen-optimized)
Contrast rationale: Expressive quirky serif vs. systematic neutral grotesque — warmth vs. precision
X-height match: SIMILAR — both have high x-height; cohesion at body size
Axes available: Fraunces has `opsz` (optical size), `SOFT`, `WONK` axes for display variation
Use for: Creative agency, portfolio, editorial product with personality
Awwwards relevance: Fraunces has won Typography Honors for Source Investments, Consider It Flowers
Google Fonts: Both available free
```

**Pairing 2: PP Neue Montreal + PP Editorial New**
```
Display: PP Editorial New (High-contrast transitional serif, sharp hairlines — luxury feel)
Body: PP Neue Montreal (Geometric grotesque, clean, neutral — workhorse sans)
Contrast rationale: High-contrast sharp serif vs. low-contrast clean grotesque — editorial authority vs. digital clarity
X-height match: MISMATCHED — Editorial New has lower x-height (intentional — creates scale distinction)
Use for: Luxury brands, fashion, high-end agency, editorial
Awwwards relevance: Widely used in 2024-2025 SOTD winners for fashion/luxury brands
Source: Pangram Pangram Foundry (free for personal, paid for commercial)
```

**Pairing 3: Clash Display + General Sans**
```
Display: Clash Display (Geometric variable display, architectural bones, unapologetic weight)
Body: General Sans (Geometric sans, rounded terminals, approachable — same design family as Clash)
Contrast rationale: Heavy architectural display vs. approachable body sans — drama vs. accessibility
X-height match: SIMILAR — same foundry (Indian Type Foundry), designed to pair
Use for: Fashion, music, events, branding with attitude
Note: Same-family pairing — contrast comes from weight/size, not classification
Source: Indian Type Foundry / fonts.google.com (free)
```

**Pairing 4: EB Garamond + DM Sans**
```
Display: EB Garamond (Old-style serif, classical proportions, open source)
Body: DM Sans (Humanist sans, optical adjustments for small sizes, designed by Colophon)
Contrast rationale: Historical old-style serif vs. contemporary humanist sans — authority vs. warmth
X-height match: SIMILAR at body size — both have moderate x-height
Use for: Editorial content, publishing, news, professional services
Google Fonts: Both available free
```

**Pairing 5: Literata + Geist**
```
Display: Literata (Humanist serif, excellent readability, optical size awareness — Google's serif)
Body: Geist (Geometric sans by Vercel, designed for developer tools/interfaces)
Contrast rationale: Organic humanist serif vs. systematic geometric sans — warmth vs. precision
X-height match: SIMILAR — both optimized for screen readability
Use for: Technical products with editorial ambition, developer-adjacent products
Note: Geist is free/open-source, Literata is Google Fonts
```

#### The Inter-Only Anti-Pattern

When the reference file flags "Inter-only" as an AI aesthetic signal, it specifically means:
- Using Inter for BOTH display and body text
- Not using Inter itself (Inter is excellent as a body face)
- The failure is zero classification contrast — Inter with Inter creates no visual tension

**Correction pattern:** Keep Inter as body, pair with ANY serif for display. Even a system serif (Georgia) is better than Inter + Inter.

#### Variable Font Considerations for Pairings

When both fonts in a pair are variable fonts, additional pairing opportunity:
- Animate one axis on scroll (weight or optical size)
- Keep the other font static — animate only one element in a pairing to avoid visual chaos

```css
/* Fraunces display: animate weight and WONK axis on hero entry */
.hero-headline {
  font-family: 'Fraunces', serif;
  font-variation-settings: 'wght' 300, 'WONK' 0;
  animation: headline-entrance 1s forwards;
}

@keyframes headline-entrance {
  to {
    font-variation-settings: 'wght' 900, 'WONK' 1;
  }
}

/* Inter body: STATIC — never animate the body font */
.hero-body {
  font-family: 'Inter', sans-serif;
  font-weight: 400;  /* fixed */
}
```

---

### DD-6: Protected-Files Enforcement via Claude Code Hooks

**Confidence:** HIGH — Claude Code hooks documentation fetched directly from code.claude.com/docs/en/hooks

#### Key Finding: Hooks CAN Intercept Write and Edit Tools

Previous research stated that Write/Edit tools bypass bwrap sandbox (confirmed true). However, **Claude Code PreToolUse hooks DO intercept Write and Edit tool calls** — this is a stronger enforcement mechanism that was not documented in the initial research.

Source: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)

#### How PreToolUse Hooks Work for File Protection

**Configuration in `.claude/settings.json`:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/enforce-protected-files.sh"
          }
        ]
      }
    ]
  }
}
```

**JSON passed to hook stdin (Write tool):**
```json
{
  "session_id": "abc123",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content here"
  }
}
```

**JSON passed to hook stdin (Edit tool):**
```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "old_string": "original text",
    "new_string": "replacement text",
    "replace_all": false
  }
}
```

**Exit codes:**
| Exit Code | Effect |
|-----------|--------|
| 0 (no JSON) | Allow the tool call |
| 0 (with JSON) | Allow/deny/ask based on JSON `permissionDecision` |
| 2 | BLOCK the tool call — stderr text shown as error |

#### Complete Hook Script: enforce-protected-files.sh

```bash
#!/bin/bash
# .claude/hooks/enforce-protected-files.sh
# PreToolUse hook: blocks Write and Edit calls to protected file paths
# Requires: jq installed in environment

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract file path (same field for both Write and Edit)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# If no file path in input, allow (shouldn't happen for Write/Edit)
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Load protected files list
PROTECTED_JSON="$CLAUDE_PROJECT_DIR/protected-files.json"
if [ ! -f "$PROTECTED_JSON" ]; then
  exit 0  # no protection config = allow
fi

# Normalize to relative path from project root
REL_PATH="${FILE_PATH#$CLAUDE_PROJECT_DIR/}"

# Check individual protected files
PROTECTED=$(jq -r '.protected[]' "$PROTECTED_JSON")
while IFS= read -r protected_path; do
  if [ "$REL_PATH" = "$protected_path" ]; then
    echo "BLOCKED: $REL_PATH is in protected-files.json" >&2
    echo "Protected files cannot be modified by fleet agents." >&2
    echo "To modify, update protected-files.json first (human action required)." >&2
    exit 2
  fi
done <<< "$PROTECTED"

# Check protected directories
PROTECTED_DIRS=$(jq -r '.protected_directories[]' "$PROTECTED_JSON" 2>/dev/null || echo "")
while IFS= read -r protected_dir; do
  if [[ "$REL_PATH" == "$protected_dir"* ]]; then
    echo "BLOCKED: $REL_PATH is inside protected directory $protected_dir" >&2
    exit 2
  fi
done <<< "$PROTECTED_DIRS"

# Not protected — allow
exit 0
```

#### Critical Limitation: Bash Tool Bypass

**GitHub Issue #29709** revealed that Claude Code can circumvent PreToolUse:Edit hooks by using the Bash tool instead:

```bash
# When Edit is blocked by hook, Claude Code may fall back to:
python -c "open('protected-file.py', 'w').write('content')"
# or:
sed -i 's/old/new/g' protected-file.py
```

**Therefore, the hook approach alone is insufficient.** The complete enforcement strategy must be layered:

| Layer | Mechanism | Catches |
|-------|-----------|---------|
| **Layer 1** | PreToolUse hook (`Write\|Edit` matcher) | Direct Write/Edit tool calls |
| **Layer 2** | PreToolUse hook (`Bash` matcher) | Bash commands writing to protected paths |
| **Layer 3** | Agent system prompt instruction | Behavioral constraint — agent won't try to bypass |

**Layer 2 addition — Bash hook:**

```bash
#!/bin/bash
# .claude/hooks/check-bash-writes.sh
# Checks Bash tool calls for file write operations targeting protected paths

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Look for write operations in bash commands
if echo "$COMMAND" | grep -qE '(> |>>|sed -i|python.*open.*w|echo.*>)'; then
  # Has a write pattern — check if targeting protected paths
  PROTECTED_JSON="$CLAUDE_PROJECT_DIR/protected-files.json"
  if [ -f "$PROTECTED_JSON" ]; then
    PROTECTED=$(jq -r '.protected[]' "$PROTECTED_JSON")
    while IFS= read -r path; do
      if echo "$COMMAND" | grep -q "$path"; then
        echo "BLOCKED: Bash command appears to write to protected file: $path" >&2
        exit 2
      fi
    done <<< "$PROTECTED"
  fi
fi

exit 0
```

**Updated settings.json:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/enforce-protected-files.sh"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-bash-writes.sh"
          }
        ]
      }
    ]
  }
}
```

**Layer 3 — agent prompt instruction (still required even with hooks):**
```
You MUST NOT modify any file listed in protected-files.json or in any
directory listed in protected_directories. Read protected-files.json
before every Write or Edit call to verify the target path is not protected.
If a file is protected, inform the user and stop — do not attempt an
alternative approach (Bash, Python, etc.) to achieve the same write.
```

#### Updated Assessment: Hooks Provide Meaningful Enforcement

**Revised from initial research:** The claim that "prompt-level enforcement is the ONLY reliable mechanism" is now nuanced:

- PreToolUse hooks DO intercept Write and Edit — stronger than prompt-only
- Bash tool remains a bypass vector (Issue #29709 confirmed)
- Full enforcement requires hooks + agent prompt instructions (both layers)
- Hooks are in `.claude/settings.json` which is a protected file itself — chicken-and-egg: protect the hook config by protecting `.claude/settings.json`

**Recommendation for QUAL-04:** The `protected-files.json` mechanism should document BOTH enforcement approaches and include the hook script as a companion artifact.

---

### DD-7: APCA Implementation in Pure JavaScript

**Confidence:** HIGH — algorithm extracted directly from the canonical apca-introduction repository, verified against the Myndex SAPC-APCA documentation

#### The Complete APCA Algorithm (Pure JS, Zero Dependencies)

This is the full APCA-W3 v0.0.98G-4g algorithm, implementable without any npm packages. Source: [github.com/xi/apca-introduction](https://github.com/xi/apca-introduction)

```javascript
/**
 * APCA (Accessible Perceptual Contrast Algorithm) — W3 version 0.0.98G-4g
 * Source: github.com/xi/apca-introduction
 * License: W3C Community License (see apca-w3 npm package)
 *
 * Zero dependencies. Works in any JavaScript environment.
 */

/**
 * Convert sRGB [0-255] color to perceptual luminance Y.
 * @param {number[]} srgb - Array of [r, g, b] values in range 0-255
 * @returns {number} Luminance Y in range 0-1
 */
function sRGBtoY(srgb) {
  // Step 1: Normalize to 0-1 and apply 2.4 gamma (sRGB linearization)
  const r = Math.pow(srgb[0] / 255, 2.4);
  const g = Math.pow(srgb[1] / 255, 2.4);
  const b = Math.pow(srgb[2] / 255, 2.4);

  // Step 2: Luminance weights (ITU-R BT.709 / sRGB primaries)
  let y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;

  // Step 3: Dark color soft clip — boosts very dark colors perceptually
  // Threshold: 0.022 (approximately #313131 on dark backgrounds)
  if (y < 0.022) {
    y += Math.pow(0.022 - y, 1.414);
  }

  return y;
}

/**
 * Calculate APCA Lc contrast between foreground and background colors.
 * @param {number[]} fg - Foreground color [r, g, b] in range 0-255
 * @param {number[]} bg - Background color [r, g, b] in range 0-255
 * @returns {number} Lc contrast value, range approximately -108 to +105
 *   Positive: dark text on light background
 *   Negative: light text on dark background
 *   |Lc| is the readability value (use absolute value for threshold comparison)
 */
function APCAcontrast(fg, bg) {
  const yfg = sRGBtoY(fg);
  const ybg = sRGBtoY(bg);

  let c = 1.14;  // base multiplier

  if (ybg > yfg) {
    // Light background (positive Lc = normal polarity)
    // Background exponent: 0.56 | Foreground exponent: 0.57
    c *= Math.pow(ybg, 0.56) - Math.pow(yfg, 0.57);
  } else {
    // Dark background (negative Lc = reverse polarity)
    // Background exponent: 0.65 | Foreground exponent: 0.62
    c *= Math.pow(ybg, 0.65) - Math.pow(yfg, 0.62);
  }

  // Clip low-contrast values to zero (below perceptible threshold)
  if (Math.abs(c) < 0.1) {
    return 0;
  }

  // Apply polarity offset (±0.027)
  if (c > 0) {
    c -= 0.027;
  } else {
    c += 0.027;
  }

  // Scale to Lc units (×100)
  return c * 100;
}

// Usage examples:
const blackOnWhite = APCAcontrast([0, 0, 0], [255, 255, 255]);
// → approximately 106 (maximum contrast)

const whiteOnBlack = APCAcontrast([255, 255, 255], [0, 0, 0]);
// → approximately -108 (reverse polarity)

const bodyTextCheck = APCAcontrast([30, 30, 30], [255, 255, 255]);
// Check: Math.abs(bodyTextCheck) >= 90 for body text fluency
```

#### OKLCH to sRGB to APCA (Full Pipeline)

PDE uses OKLCH color system. To check APCA contrast from OKLCH values, the pipeline is: OKLCH → OKLab → Linear sRGB → sRGB → APCA.

```javascript
/**
 * Convert OKLCH to sRGB [0-255] for APCA input.
 * All intermediate math uses the OKLab color space specification.
 * Source: bottosson.github.io/posts/oklab/
 */
function oklchToSRGB(l, c, h) {
  // Step 1: OKLCH → OKLab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // Step 2: OKLab → Linear sRGB (via LMS)
  // OKLab to LMS (cone responses)
  const lms_l = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
  const lms_m = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
  const lms_s = Math.pow(l - 0.0894841775 * a - 1.2914855480 * b, 3);

  // LMS to Linear sRGB (D65 illuminant)
  const r_lin =  4.0767416621 * lms_l - 3.3077115913 * lms_m + 0.2309699292 * lms_s;
  const g_lin = -1.2684380046 * lms_l + 2.6097574011 * lms_m - 0.3413193965 * lms_s;
  const b_lin = -0.0041960863 * lms_l - 0.7034186147 * lms_m + 1.7076147010 * lms_s;

  // Step 3: Linear sRGB → sRGB (gamma compression)
  function linearToSRGB(x) {
    if (x <= 0.0031308) return 12.92 * x;
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  }

  // Clamp to [0, 1] and scale to [0, 255]
  const clamp = (x) => Math.max(0, Math.min(1, x));
  return [
    Math.round(clamp(linearToSRGB(r_lin)) * 255),
    Math.round(clamp(linearToSRGB(g_lin)) * 255),
    Math.round(clamp(linearToSRGB(b_lin)) * 255)
  ];
}

/**
 * Check APCA contrast between two OKLCH colors.
 * @param {Object} fg - { l, c, h } foreground
 * @param {Object} bg - { l, c, h } background
 * @returns {number} Absolute Lc value (use for threshold comparison)
 */
function oklchAPCAcontrast(fg, bg) {
  const fgRGB = oklchToSRGB(fg.l, fg.c, fg.h);
  const bgRGB = oklchToSRGB(bg.l, bg.c, bg.h);
  return Math.abs(APCAcontrast(fgRGB, bgRGB));
}

// Example usage:
const textColor = { l: 0.2, c: 0.02, h: 260 };   // dark blue-grey
const bgColor   = { l: 0.98, c: 0.01, h: 100 };   // near-white warm
const lc = oklchAPCAcontrast(textColor, bgColor);
// lc >= 90 → suitable for body text
// lc >= 75 → suitable for large content text
// lc >= 60 → suitable for large headlines
```

#### Key APCA Coefficients (All in One Place)

| Coefficient | Value | Purpose |
|-------------|-------|---------|
| sRGB gamma | 2.4 | Linearization exponent |
| R luminance weight | 0.2126729 | BT.709 red channel |
| G luminance weight | 0.7151522 | BT.709 green channel |
| B luminance weight | 0.0721750 | BT.709 blue channel |
| Dark clip threshold | 0.022 | Below this, apply dark boost |
| Dark boost exponent | 1.414 | √2 — dark area perceptual correction |
| Base multiplier | 1.14 | Overall Lc scale factor |
| Light bg exponent (Ybg) | 0.56 | Normal polarity background |
| Light bg exponent (Yfg) | 0.57 | Normal polarity foreground |
| Dark bg exponent (Ybg) | 0.65 | Reverse polarity background |
| Dark bg exponent (Yfg) | 0.62 | Reverse polarity foreground |
| Low-contrast clip | 0.1 | Below this absolute value → return 0 |
| Polarity offset | ±0.027 | Applied after clip, before ×100 |
| Final scale | ×100 | Result range: ~-108 to +105 |

#### APCA Lc Lookup Table

```
Lc thresholds by use case (use |Lc| absolute value):

|Lc| ≥ 90   Body text, fluent reading (paragraphs, articles)
|Lc| ≥ 75   Content text (product descriptions, lists, captions)
|Lc| ≥ 60   Large headlines (36px+ normal weight, 24px+ bold)
|Lc| ≥ 45   Display-only text (hero headlines, decorative type)
|Lc| ≥ 30   Spot-readable (placeholders, disabled states)
|Lc| ≥ 15   Non-text (decorative borders, dividers, focus outlines)
|Lc| < 15   Not readable — avoid for any text use

Font size/weight minimums at |Lc| = 75:
  300 weight → 24px minimum
  400 weight → 18px minimum
  500 weight → 16px minimum
  700 weight → 14px minimum

Note: These are WCAG 3.0 candidate values — not yet normative standard.
For legal compliance, also check WCAG 2.x 4.5:1 ratio in parallel.
```

---

### DD-8: Updated Source Additions (Deep Dive)

| Source | URL | Confidence | Used In |
|--------|-----|------------|---------|
| Claude Code Hooks Documentation | https://code.claude.com/docs/en/hooks | HIGH | DD-6 — PreToolUse hook API, stdin JSON format, exit codes |
| Claude Code Issue #29709 | https://github.com/anthropics/claude-code/issues/29709 | HIGH | DD-6 — Bash tool bypass of PreToolUse hooks confirmed |
| APCA Introduction Repository | https://github.com/xi/apca-introduction | HIGH | DD-7 — Complete APCA algorithm with all coefficients |
| GSAP ScrollTrigger Docs | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ | HIGH | DD-3 — Full API reference, stagger examples |
| GSAP SplitText Docs | https://gsap.com/docs/v3/Plugins/SplitText/ | HIGH | DD-3 — Complete SplitText API, mask feature, onSplit callback |
| GSAP DrawSVGPlugin Docs | https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/ | HIGH | DD-3 — drawSVG property values, center-outward pattern |
| GSAP MorphSVGPlugin Docs | https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/ | HIGH | DD-3 — morphSVG property, type, shapeIndex |
| cdnjs.com GSAP library | https://cdnjs.com/libraries/gsap | HIGH | DD-3 — confirmed DrawSVG, MorphSVG, SplitText CDN URLs at 3.13.0 |
| Utsubo Awwwards Scoring Guide | https://www.utsubo.com/blog/award-winning-website-design-guide | MEDIUM | DD-1 — per-dimension score-level criteria (editorial synthesis) |
| Codrops GSAP Tips 2025 | https://tympanus.net/codrops/2025/09/03/7-must-know-gsap-animation-tips-for-creative-developers/ | MEDIUM | DD-2 — stagger direction syntax, gsap.utils.wrap |
| Josh Comeau — CSS linear() | https://www.joshwcomeau.com/animation/linear-timing-function/ | MEDIUM | DD-4 — spring parameters, tool recommendation |
| Felix Runquist — Spring Design | https://felixrunquist.com/posts/designing-spring-animations-for-the-web | MEDIUM | DD-4 — underdamped/critically-damped/overdamped parameter sets |
| Jake Archibald Linear Generator | https://linear-easing-generator.netlify.app/ | HIGH | DD-4 — canonical tool for generating linear() spring values |
| OKLab Color Space Spec | https://bottosson.github.io/posts/oklab/ | HIGH | DD-7 — OKLCH to OKLab to linear sRGB conversion matrices |
