# Phase 35: Design Elevation — Mockup Skill - Research

**Researched:** 2026-03-17
**Domain:** CSS animations, spring physics, scroll-driven animations, variable fonts, interaction states, single-file HTML artifacts
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOCK-01 | Mockup skill produces CSS spring physics animations (cubic-bezier approximations or GSAP CDN) for interactive elements — not linear/ease-only transitions | Spring physics three-level fidelity model already established in motion-design.md; research validates patterns and confirms GSAP is now fully free |
| MOCK-02 | Mockup skill generates scroll-driven animations using @scroll-timeline with progressive enhancement fallback via @supports | Browser support matrix verified: Chrome/Edge 115+, Safari 18+, Firefox flag-only; @supports guard is MANDATORY to prevent invisible content in Firefox |
| MOCK-03 | Mockup skill includes micro-interaction states for every interactive element: default, hover, focus, active, loading, disabled, error | All 7 states can be rendered CSS-only using :hover, :focus-visible, :active, [disabled], aria-disabled, aria-busy, :invalid patterns; loading state requires minimal JS or aria-busy trick |
| MOCK-04 | Mockup skill choreographs entrance animations tied to content meaning — elements appear in narrative order, not all-at-once or random stagger | GSAP timeline sequencing with precise overlap timing enables narrative order; CSS-only alternative uses animation-delay increments matching reading order |
| MOCK-05 | Mockup skill uses variable font features: weight animation on hover, optical size adjustment by context, width shifts for emphasis | font-variation-settings is Baseline Widely Available (2018+); wght/wdth/opsz axes documented; Google Fonts CDN supports variable font axis ranges via CSS2 API |
| MOCK-06 | Mockup skill includes at least one concept-specific "visual hook" — a distinctive interaction or visual element unique to the project concept, not a generic pattern | Visual hooks are AI-generated concept-specific patterns documented by name in the artifact; require a named comment convention and at least one non-generic interaction |
| MOCK-07 | Mockup skill produces 60fps-capable animations: no layout thrashing, GPU-composited transforms and opacity, will-change hints where appropriate | GPU-composited properties (transform, opacity) documented; will-change usage rules established; layout-thrashing properties enumerated |
</phase_requirements>

---

## Summary

Phase 35 elevates the `/pde:mockup` skill's HTML output from generic CSS transitions to production-quality, concept-specific animations. The core technology stack is well-established: GSAP 3.14 (fully free since Webflow acquisition), CSS scroll-driven animations with `animation-timeline: view()`, and `font-variation-settings` for variable font axis animation. All three domains have high confidence because the PDE project already has a `motion-design.md` reference file that documents verified patterns from prior research phases.

The most critical constraint in this phase is the **single-file HTML artifact context**: everything must be inline CSS/JS or loaded from public CDNs. This eliminates build tools, npm packages, and bundlers entirely. GSAP provides the highest-fidelity spring physics and entrance choreography via CDN. CSS scroll-driven animations work inline but require an `@supports` guard that is MANDATORY — without it, Firefox users see permanently hidden content. Variable fonts load via Google Fonts CDN CSS2 API, which supports axis range specification in the URL.

The current `workflows/mockup.md` implements only 4-5 of the 7 required interaction states (hover, focus, active, disabled are present; loading is shown as skeleton only; error is CSS-only `:invalid`). It uses generic `ease-out` transitions rather than spring physics. It has no scroll-driven animations, no variable font animation, no entrance choreography, and no concept-specific visual hooks. Phase 35 adds all of these to the skill's generation instructions.

**Primary recommendation:** Elevate `workflows/mockup.md` by adding six new generation directives covering spring physics, scroll-driven animations, all 7 interaction states, narrative entrance order, variable fonts, and the visual hook pattern. Load `references/motion-design.md` via `@` reference in `required_reading`. All patterns use inline CSS/GSAP CDN — no build tools required.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GSAP | 3.14 | Spring physics, timeline choreography, ScrollTrigger | Fully free (Webflow acquisition); unmatched performance and cross-browser; no build tools needed via CDN |
| ScrollTrigger (GSAP plugin) | 3.14 | Scroll-driven entrance animations with fallback | Handles Firefox's missing native CSS scroll-timeline support; works everywhere |
| CSS `animation-timeline: view()` | Native (no version) | CSS-only scroll-driven reveal (Chrome/Edge/Safari) | Zero dependencies when browser supports it; runs off main thread |
| `font-variation-settings` | Native | Variable font axis animation | Baseline Widely Available (2018+); all modern browsers |
| Google Fonts CSS2 API | Current | Variable font delivery via CDN | Supports axis range in URL (`wght@100..900`); single `<link>` tag |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `linear()` easing | Native | Multi-bounce spring physics | When GSAP is not loaded; requires Chrome/Firefox/Safari/Edge Dec 2023+ (88% support) |
| CSS `cubic-bezier(0.34, 1.56, 0.64, 1)` | Native | Single-overshoot spring | Universal fallback; always safe for button/card spring effect |
| CSS `@property` | Native (Chrome 85+, Firefox 128+, Safari 15.4+) | Typed custom property for animatable values | Advanced: enables smooth color/number transitions on custom properties |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GSAP ScrollTrigger | Intersection Observer + CSS classes | Lower fidelity; more JS boilerplate; acceptable but loses timeline sequencing |
| GSAP elastic.out | CSS `linear()` spring | CSS-only is lighter; but `linear()` has 88% support vs GSAP's 100% |
| Google Fonts variable fonts | System fonts | System fonts have no `wght`/`wdth` axes; variable animation not possible |
| GSAP Timeline | CSS `animation-delay` increments | CSS works but cannot be paused/reversed/scrubbed; no overlap control |

**Installation (CDN — for single-file HTML artifacts):**
```html
<!-- GSAP core + ScrollTrigger — fully free as of May 2025 -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/ScrollTrigger.min.js"></script>
<script>gsap.registerPlugin(ScrollTrigger);</script>

<!-- Variable font via Google Fonts CSS2 API — axis range in URL -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
```

---

## Architecture Patterns

### Recommended Structure for Single-File HTML Mockup

```
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- 1. Font CDN (Google Fonts variable font) -->
  <!-- 2. GSAP CDN + ScrollTrigger -->
  <style>
    /* 3. @layer declaration order */
    @layer tokens, mockup-layout, components, states, animations, utilities;

    /* 4. Spring physics custom properties */
    /* 5. Scroll-driven animation @supports block */
    /* 6. All 7 interaction states per component */
    /* 7. Variable font declarations */
    /* 8. prefers-reduced-motion override */
  </style>
</head>
<body>
  <!-- content in narrative reading order -->
  <script>
    /* 9. GSAP timeline for entrance choreography */
    /* 10. Visual hook implementation */
  </script>
</body>
```

### Pattern 1: Spring Physics — Three-Level Fidelity

**What:** Each interactive element uses spring easing, not generic `ease-out`. Three levels match browser capability.
**When to use:** Always for buttons, cards, toggles, navigation items, form controls.

```css
/* Source: references/motion-design.md — Spring Physics Three Levels */

/* Level 1: Universal — single overshoot spring */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Level 2: Multi-bounce spring — 88% browser support (Chrome/Firefox/Safari/Edge Dec 2023+) */
--ease-spring-bounce: linear(
  0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%,
  0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%,
  1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%,
  1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%,
  1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1
);

/* Level 3: GSAP elastic (full physics) */
/* gsap.to(el, { ease: 'elastic.out(1, 0.3)', duration: 1 }); */

/* Application on interactive element */
.btn-primary {
  transition:
    transform var(--duration-micro, 100ms) var(--ease-spring),
    background-color var(--duration-fast, 200ms) var(--ease-standard),
    box-shadow var(--duration-fast, 200ms) var(--ease-standard);
}
.btn-primary:hover  { transform: translateY(-1px) scale(1.02); }
.btn-primary:active { transform: scale(0.97); }
```

### Pattern 2: Scroll-Driven Animation with MANDATORY @supports Guard

**What:** Elements reveal as they scroll into view. CSS-native where supported; falls back to fully visible static state.
**When to use:** Every section reveal, card entrance, image reveal, stat counter.

```css
/* Source: references/motion-design.md — MANDATORY @supports guard */
/* CRITICAL: Without @supports, Firefox users see permanently hidden content */

/* Default: element visible (Firefox sees this) */
.reveal-on-scroll {
  opacity: 1;
  transform: none;
}

/* Enhanced: scroll-driven animation where supported */
@supports (animation-timeline: scroll()) {
  .reveal-on-scroll {
    opacity: 0;  /* Set to 0 ONLY inside @supports */
    transform: translateY(24px);
    animation: scroll-reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 60%;
  }
}

@keyframes scroll-reveal {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* IMPORTANT: animation-duration must be 'auto' for scroll timelines */
/* Do NOT set animation-duration in seconds for scroll-driven animations */
```

**Critical pitfall:** `animation-duration` set to a time value (e.g., `300ms`) does NOT work with scroll timelines. The spec requires `auto` duration or omission. The property `animation-timeline` must come AFTER the `animation` shorthand in the declaration order.

### Pattern 3: All Seven Interaction States

**What:** Every interactive element has distinct visual treatment for all 7 states.
**When to use:** Every button, link, form control, card — no exceptions.

```css
/* Source: ARIA patterns (interaction-patterns.md) + motion-design.md */

.interactive-el {
  /* DEFAULT: base appearance */
  transition: all var(--duration-fast) var(--ease-standard);
}

.interactive-el:hover {
  /* HOVER: visual lift, spring easing */
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.interactive-el:focus-visible {
  /* FOCUS: distinct from hover — outline, not lift */
  outline: 2px solid var(--color-focus-ring, #2563eb);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(37,99,235,0.15);
}

.interactive-el:active {
  /* ACTIVE: press depression */
  transform: scale(0.97) translateY(0);
  box-shadow: var(--shadow-sm);
  transition-duration: var(--duration-micro);
}

/* LOADING: aria-busy attribute selector (CSS-only hook) */
.interactive-el[aria-busy="true"] {
  opacity: 0.8;
  cursor: wait;
  pointer-events: none;
  position: relative;
}
.interactive-el[aria-busy="true"]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.2s ease-in-out infinite;
}
@keyframes loading-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* DISABLED: aria-disabled preferred over [disabled] for focus retention */
.interactive-el[aria-disabled="true"],
.interactive-el:disabled {
  opacity: var(--opacity-disabled, 0.45);
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
  box-shadow: none;
}

/* ERROR: field or button error state */
.interactive-el[aria-invalid="true"],
.interactive-el.is-error {
  border-color: var(--color-error, #dc2626);
  box-shadow: 0 0 0 3px rgba(220,38,38,0.15);
}
```

**Key insight on loading state:** Use `aria-busy="true"` as the CSS hook, not a `.loading` class. This provides accessibility semantics AND CSS styling in one attribute. Screen readers will announce "busy" to users.

### Pattern 4: Narrative Entrance Choreography

**What:** Elements animate into view in the sequence they should be read — eyebrow → headline → body → CTA — not all at once or with random stagger.
**When to use:** Hero sections, feature sections, content reveals.

```javascript
// Source: references/motion-design.md — GSAP Timeline Sequencing
// gsap.com/docs/v3/GSAP/Timeline/

// Narrative order: each element follows the reading sequence
const tl = gsap.timeline({
  defaults: { ease: 'power2.out', duration: 0.7 }
});

// Use negative overlap (-=0.3) to start next before previous finishes
// This creates visual flow without harsh sequential pauses
tl.from('.hero-eyebrow',  { opacity: 0, y: 16 })
  .from('.hero-headline', { opacity: 0, y: 24 }, '-=0.4')
  .from('.hero-body',     { opacity: 0, y: 16 }, '-=0.3')
  .from('.hero-cta',      { opacity: 0, y: 12, scale: 0.96 }, '-=0.2');

// For scroll-triggered sections: elements in DOM reading order
gsap.from('.feature-list > *', {
  opacity: 0,
  y: 32,
  duration: 0.6,
  ease: 'power2.out',
  stagger: { each: 0.1, from: 'start' }, // 'start' = DOM order = reading order
  scrollTrigger: {
    trigger: '.feature-list',
    start: 'top 75%',
    once: true
  }
});
```

**Anti-pattern:** `stagger: { from: 'random' }` or `stagger: { from: 'center' }` breaks reading order. Always use `from: 'start'` unless the concept explicitly requires a different pattern.

### Pattern 5: Variable Font Animation

**What:** Font axes animate on interaction — weight on hover, optical size by context, width for emphasis.
**When to use:** Navigation links, display headings, call-to-action text, interactive labels.

```css
/* Source: references/motion-design.md — Variable Font Axis Animation */
/* Requires variable font loaded with wght/wdth axis range in URL */

/* Google Fonts CSS2 API — axis range in URL */
/* https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap */

/* Weight animation on nav hover */
.nav-link {
  font-weight: 400;
  /* Note: font-weight IS directly animatable in modern browsers */
  transition: font-weight 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nav-link:hover,
.nav-link[aria-current="page"] {
  font-weight: 700;
}

/* Width axis animation — requires font with wdth axis (Roboto Flex, Barlow) */
.display-headline {
  font-variation-settings: 'wdth' 100;
  transition: font-variation-settings 400ms ease-out;
}
.display-headline:hover {
  font-variation-settings: 'wdth' 115;
}

/* Optical size by context — auto lets browser optimize */
.body-text    { font-optical-sizing: auto; }
.display-text { font-variation-settings: 'opsz' 48; }
.caption-text { font-variation-settings: 'opsz' 12; }
```

**Variable font prerequisite check:** Not all fonts support all axes. Inter supports `wght` only. Roboto Flex supports `wght`, `wdth`, `opsz`, `GRAD`, `slnt`. Source Sans 3 supports `wght`. Always specify what the loaded font actually supports in the artifact comment.

### Pattern 6: Named Visual Hook

**What:** A concept-specific interaction that is unique to the product concept. NOT a generic hover effect. Named by comment in the HTML.
**When to use:** At least one per mockup. The visual hook should be documented by name.

```html
<!-- VISUAL-HOOK: [concept-name] — [description of the unique interaction] -->
<!-- Example: VISUAL-HOOK: pulse-ring — When a notification arrives, the avatar
     emits a ring pulse animation that matches the notification urgency color.
     This hook is specific to the real-time collaboration concept. -->
```

```css
/* VISUAL-HOOK: pulse-ring */
@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 1; }
  70%  { transform: scale(1.4); opacity: 0; }
  100% { transform: scale(1);   opacity: 0; }
}

.avatar[data-has-notification]::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--notification-color, var(--color-action));
  animation: pulse-ring 2s ease-out infinite;
}
```

The visual hook naming convention enables the critique skill (Phase 34) to detect and evaluate concept-specificity. The `<!-- VISUAL-HOOK: ... -->` comment is the machine-parseable marker.

### Pattern 7: 60fps Performance

**What:** All animations use GPU-composited properties only.

```css
/* Source: references/motion-design.md — Animation Performance Rules */

/* GPU-composited: safe to animate */
/* transform, opacity — ALWAYS use these */

/* Layout-triggering: NEVER animate these */
/* width, height, top, left, margin, padding, border-width */

/* will-change: use sparingly, only on elements that WILL animate */
.hero-section {
  /* Apply before animation starts */
  will-change: transform, opacity;
}
/* Remove after animation ends via JavaScript: */
/* el.style.willChange = 'auto'; */

/* For GSAP: will-change is managed automatically; no need to set manually */
/* GSAP uses transform3d forcing GPU promotion internally */
```

### Anti-Patterns to Avoid

- **Generic stagger direction:** `stagger: { from: 'random' }` or `stagger: { from: 'center' }` — breaks narrative reading order
- **Missing @supports guard:** CSS scroll-driven animations outside `@supports` block — Firefox users see invisible content
- **animation-timeline after animation shorthand:** `animation` shorthand resets `animation-timeline` to `auto`; declare `animation-timeline` after `animation`
- **time-based duration on scroll timelines:** `animation-duration: 300ms` doesn't work with scroll timelines; omit duration or use `auto`
- **will-change: all:** Consumes excessive GPU memory; specify exact properties
- **Animating width/height:** Always causes layout recalculation; use `transform: scaleX()/scaleY()` instead
- **:disabled for loading state:** The `disabled` attribute removes pointer events AND focus; `aria-disabled="true"` is preferred for loading so focus is retained
- **Generic visual hooks:** A hover color change is not a visual hook; it must be concept-specific and named

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-bounce spring physics | Custom `requestAnimationFrame` spring solver | `linear()` or GSAP `elastic.out` | Spring physics requires mass/stiffness/damping math; subtle bugs cause jank or overshoot |
| Scroll-triggered entrance | IntersectionObserver + JS class toggling | GSAP ScrollTrigger or CSS `animation-timeline: view()` | ScrollTrigger handles scrub, pin, horizontal scroll, nested triggers; CSS native runs off main thread |
| Loading shimmer animation | Custom shimmer keyframe per component | CSS `::after` with `aria-busy` pattern | One keyframe definition works for all loading states via pseudo-element |
| Font delivery with axis ranges | Self-hosting variable fonts | Google Fonts CSS2 API | CDN handles caching, compression, font subsetting, browser detection — single `<link>` tag |
| Entrance choreography timing | Manual `setTimeout` chains | GSAP Timeline with overlap | GSAP handles pause/resume/reverse, overlap math, and runs off main thread |
| CSS property animation detection | Feature detect via JS | CSS `@supports (animation-timeline: scroll())` | Native browser feature detection; no JS required |

**Key insight:** The single-file HTML constraint eliminates npm packages but GSAP CDN provides more capability than most npm-installed alternatives. The constraint is actually enabling — everything needed is available via `<script>` and `<link>` tags.

---

## Common Pitfalls

### Pitfall 1: Firefox Invisible Content from Missing @supports

**What goes wrong:** Elements with `opacity: 0` (set for scroll animation start state) remain invisible in Firefox because `animation-timeline` is unknown and the animation never fires.
**Why it happens:** `animation-timeline` is not supported in Firefox (flag-only as of March 2026). If `opacity: 0` is declared outside `@supports`, Firefox sees it as a permanent style with no animation to undo it.
**How to avoid:** The `@supports (animation-timeline: scroll())` guard MUST wrap all scroll-driven animation styles. Default state (outside `@supports`) must be fully visible.
**Warning signs:** If you see `opacity: 0` in the main CSS block without `@supports` wrapping, the test will fail.

### Pitfall 2: animation-timeline Declaration Order

**What goes wrong:** `animation-timeline: view()` has no effect even in Chrome.
**Why it happens:** The `animation` shorthand resets `animation-timeline` to `auto`. If `animation-timeline` is declared before the `animation` shorthand (or within it), the shorthand overrides it.
**How to avoid:** Always declare `animation-timeline` as a separate property AFTER the `animation` shorthand.
```css
/* WRONG — shorthand resets animation-timeline */
.el {
  animation-timeline: view();
  animation: fade-in linear both;
}

/* CORRECT — animation-timeline after shorthand */
.el {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 60%;
}
```

### Pitfall 3: Time-based Duration on Scroll Timelines

**What goes wrong:** Scroll-driven animation does not progress; either plays instantly or not at all.
**Why it happens:** `animation-duration: 300ms` is a time value; scroll timelines use scroll position as progress, not time. The browser may apply the animation in a single frame.
**How to avoid:** For scroll-driven animations, do NOT set `animation-duration` to a time value. Let it default to `auto` or explicitly set `animation-duration: auto`.

### Pitfall 4: Variable Font Axis Not Available on Loaded Font

**What goes wrong:** `font-variation-settings: 'wdth' 120` has no effect.
**Why it happens:** The loaded font does not have the `wdth` axis. Inter, for example, only has `wght`. Width animation requires Roboto Flex or Barlow.
**How to avoid:** Document which axes are available for the chosen font in a comment. Check https://v-fonts.com before specifying axis animation.

### Pitfall 5: Spring Easing on Slow Transitions

**What goes wrong:** Spring easing creates visual overshoot artifacts on slow (500ms+) transitions.
**Why it happens:** Spring overshoot is designed for micro-duration interactions. On slow transitions, the overshoot period (the "bounce beyond 100%") is visually prominent and can cause layout shift on transform-based animations.
**How to avoid:** Use spring easing only on micro/fast durations (100-300ms). For slow/dramatic entrances, use `power2.out` or `ease-enter` cubic-bezier instead.

### Pitfall 6: `disabled` vs `aria-disabled` for Loading State

**What goes wrong:** Button becomes inaccessible during loading; screen readers lose focus position.
**Why it happens:** The HTML `disabled` attribute removes the element from tab order AND prevents pointer events. When used for loading state, focus jumps away from the button the user just activated.
**How to avoid:** Use `aria-disabled="true"` for loading state (not `disabled`). Use `pointer-events: none` + `cursor: wait` in CSS to prevent further clicks. Screen readers will announce the element as disabled without losing focus.

### Pitfall 7: GSAP `from` vs `to` for Entrance Animations

**What goes wrong:** Elements start visible on page load, then jump to hidden, then animate in — causing a "flash of unstyled content" on load.
**Why it happens:** `gsap.from()` sets the starting state immediately when script runs, but if script is at bottom of `<body>` and DOM renders before GSAP fires, elements are briefly visible at their natural state.
**How to avoid:** Set initial state in CSS (`opacity: 0`) for elements that GSAP will animate in with `gsap.to()`. Alternatively, add `autoAlpha: 0` in `gsap.from()` which combines opacity and visibility to prevent FOUC. GSAP's `autoAlpha` sets `visibility: hidden` initially and removes it on animation.

```javascript
// Preferred: gsap.from with autoAlpha prevents flash
gsap.from('.hero-headline', { autoAlpha: 0, y: 20, duration: 0.7 });
```

---

## Code Examples

Verified patterns from official sources and references/motion-design.md:

### Complete Spring Physics Button State Machine

```css
/* Source: references/motion-design.md + validated pattern */
:root {
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-micro: 100ms;
  --duration-fast: 200ms;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: var(--color-action, #2563eb);
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition:
    transform     var(--duration-micro)  var(--ease-spring),
    background    var(--duration-fast)   var(--ease-standard),
    box-shadow    var(--duration-fast)   var(--ease-standard),
    opacity       var(--duration-fast)   var(--ease-standard);
  will-change: transform;
}

/* DEFAULT: base state — no style needed, all above */

/* HOVER: lift with spring */
.btn-primary:hover:not([aria-disabled="true"]):not([aria-busy="true"]) {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 4px 12px rgba(37,99,235,0.3);
  background: #1d4ed8;
}

/* FOCUS: distinct ring, not lift */
.btn-primary:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(37,99,235,0.15);
}

/* ACTIVE: press down */
.btn-primary:active:not([aria-disabled="true"]):not([aria-busy="true"]) {
  transform: scale(0.97) translateY(0);
  box-shadow: none;
  transition-duration: var(--duration-micro);
}

/* LOADING: shimmer overlay, aria-busy hook */
.btn-primary[aria-busy="true"] {
  opacity: 0.85;
  cursor: wait;
  pointer-events: none;
  overflow: hidden;
}
.btn-primary[aria-busy="true"]::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,
    transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: btn-shimmer 1.2s ease-in-out infinite;
}
@keyframes btn-shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

/* DISABLED: aria-disabled retains focus, pointer-events blocked by CSS */
.btn-primary[aria-disabled="true"],
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
  box-shadow: none;
}

/* ERROR: concept-specific — button that submitted invalid form */
.btn-primary.is-error,
.btn-primary[data-error] {
  background: var(--color-error, #dc2626);
  animation: btn-error-shake 0.4s var(--ease-spring);
}
@keyframes btn-error-shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-4px); }
  75%       { transform: translateX(4px); }
}
```

### Scroll-Driven Animation with @supports

```css
/* Source: references/motion-design.md — scroll-driven animations */
/* Source: webkit.org/blog/17184/ — animation-range cheatsheet */

/* Step 1: Default state — fully visible (Firefox fallback) */
.section-reveal {
  opacity: 1;
  transform: translateY(0);
}

/* Step 2: Enhanced scroll-driven state inside @supports */
@supports (animation-timeline: scroll()) {
  .section-reveal {
    opacity: 0;
    transform: translateY(32px);

    /* CRITICAL: animation-timeline AFTER animation shorthand */
    animation: section-enter linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 65%;
    /* NO animation-duration — scroll timelines use position, not time */
  }
}

@keyframes section-enter {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Variable Font Headline with Weight Animation

```html
<!-- Source: Google Fonts CSS2 API — developers.google.com/fonts/docs/css2 -->
<!-- axis range syntax: wght@100..900 enables full range -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
```

```css
/* Source: css-irl.info/animating-variable-fonts — confirmed pattern */

/* Weight animation on hover */
.nav-link {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  transition: font-weight 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  /* font-weight IS animatable when variable font is loaded */
}
.nav-link:hover,
.nav-link[aria-current="page"] {
  font-weight: 700;
}

/* Optical size by context — auto is usually best */
.display-hero {
  /* For Inter: only wght axis; use explicit opsz only with Roboto Flex */
  font-weight: 800;
  font-size: clamp(2.5rem, 5vw, 4rem);
}

/* For fonts WITH wdth axis (Roboto Flex, Barlow) */
/* Load: fonts.googleapis.com/css2?family=Roboto+Flex:wdth,wght@75..125,100..900 */
.display-roboto {
  font-family: 'Roboto Flex', sans-serif;
  font-variation-settings: 'wdth' 100, 'wght' 400;
  transition: font-variation-settings 350ms ease-out;
}
.display-roboto:hover {
  font-variation-settings: 'wdth' 115, 'wght' 600;
}
```

### GSAP Narrative Entrance Timeline

```javascript
// Source: references/motion-design.md — GSAP timeline sequencing
// Source: gsap.com/docs/v3/GSAP/Timeline/

document.addEventListener('DOMContentLoaded', () => {
  // autoAlpha = opacity + visibility, prevents FOUC on page load
  const heroTl = gsap.timeline({ defaults: { ease: 'power2.out' } });

  heroTl
    .from('.hero-eyebrow',  { autoAlpha: 0, y: 12, duration: 0.5 })
    .from('.hero-headline', { autoAlpha: 0, y: 20, duration: 0.7 }, '-=0.3')
    .from('.hero-body',     { autoAlpha: 0, y: 14, duration: 0.6 }, '-=0.25')
    .from('.hero-cta-group',{ autoAlpha: 0, y: 10, scale: 0.97, duration: 0.5 }, '-=0.2');

  // Scroll-triggered section reveals in reading order
  gsap.from('.feature-card', {
    autoAlpha: 0,
    y: 40,
    duration: 0.6,
    ease: 'power2.out',
    stagger: { each: 0.1, from: 'start' }, // 'start' = DOM/reading order
    scrollTrigger: {
      trigger: '.features-section',
      start: 'top 75%',
      once: true
    }
  });
});
```

### Visual Hook Pattern

```html
<!-- VISUAL-HOOK: data-pulse — On feature card interaction, a concept-specific
     ambient glow pulses in the brand accent color, communicating "this is live data."
     Unique to this real-time analytics concept. -->
<div class="feature-card" data-pulse>...</div>
```

```css
/* VISUAL-HOOK: data-pulse */
@keyframes data-pulse {
  0%   { box-shadow: 0 0 0 0   rgba(var(--color-accent-rgb), 0.4); }
  70%  { box-shadow: 0 0 0 12px rgba(var(--color-accent-rgb), 0); }
  100% { box-shadow: 0 0 0 0   rgba(var(--color-accent-rgb), 0); }
}

[data-pulse]:hover {
  animation: data-pulse 1.5s ease-out infinite;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ease: ease-out` for all transitions | Spring physics three levels (cubic-bezier overshoot / linear() multi-bounce / GSAP elastic) | `linear()` shipped Dec 2023 in all major browsers | Natural physical motion vs mechanical feeling |
| ScrollReveal.js / AOS library | CSS `animation-timeline: view()` native | Chrome 115 (July 2023), Safari 18 (Sept 2024) | No JS dependency for scroll reveals; runs off main thread |
| GSAP Club membership required for premium plugins | All GSAP plugins including ScrollTrigger fully free | May 2025 (Webflow acquisition) | No licensing barrier for commercial use in mockups |
| Static font-weight at breakpoints | Continuous wght axis animation via `font-variation-settings` | Baseline since 2018; widespread animation use 2023+ | Typography responds kinetically to interaction |
| `.loading` class for loading state | `aria-busy="true"` attribute as CSS selector hook | ARIA specification matured ~2022 | Single attribute provides both accessibility semantics and CSS styling hook |
| `@scroll-timeline` (old spec name) | `animation-timeline: scroll()` / `animation-timeline: view()` | Spec renamed; Chrome 115 | `@scroll-timeline` is the OLD spec name — do NOT use it; use `animation-timeline` property |

**Deprecated/outdated:**
- `@scroll-timeline` at-rule: This was the old specification syntax. The current spec uses the `animation-timeline` CSS property with `scroll()` and `view()` functions. The REQUIREMENTS.md says "using @scroll-timeline" but this is the old name — the correct current API is `animation-timeline: scroll()` / `animation-timeline: view()`.
- AOS (Animate On Scroll) library: Unnecessary with CSS `animation-timeline: view()` available natively in 80%+ of browsers.
- ScrollReveal.js: Same as above; GSAP ScrollTrigger is the correct library choice when JS is needed.

**IMPORTANT NOTE on REQUIREMENTS.md language:** MOCK-02 says "using `@scroll-timeline`". This refers to the scroll-driven animation CAPABILITY, not specifically the `@scroll-timeline` at-rule syntax (which is deprecated). The implementation should use `animation-timeline: view()` and `animation-timeline: scroll()` as these are the current spec-compliant properties. The `@supports (animation-timeline: scroll())` guard is the correct feature detection.

---

## Open Questions

1. **Loading state without JavaScript**
   - What we know: `aria-busy="true"` as a CSS selector is the correct pattern; shimmer animation runs via CSS `::after`
   - What's unclear: The mockup skill currently runs in a "CSS-only interactive states" model per workflow comment. Loading state via `aria-busy` requires JS to add/remove the attribute during user interaction. In a static mockup, this may be represented as a visible variant panel rather than an interactive state.
   - Recommendation: Include loading state as a **static variant section** in the mockup HTML (a `<div class="state-demos">` section showing all 7 states simultaneously), plus the CSS for the dynamic state. The static variant allows visual review without JS interaction.

2. **Variable font availability for non-Google-Font projects**
   - What we know: Google Fonts CDN is the safe default; Inter (wght only), Roboto Flex (wght+wdth+opsz), Source Sans 3 (wght) are available
   - What's unclear: If the project specifies a custom font without variable font support, the weight animation pattern degrades to static font-weight (no continuous animation)
   - Recommendation: Document the font's available axes in a comment at the top of the mockup's `<style>` block. If no variable font is available, gracefully fall back to font-weight step changes.

3. **Visual hook generation quality**
   - What we know: The concept of a "visual hook" is defined; the naming convention (`<!-- VISUAL-HOOK: name -->`) enables machine parsing
   - What's unclear: How well will the LLM consistently generate concept-SPECIFIC (not generic) visual hooks? This is a prompt quality problem, not a technical one.
   - Recommendation: Provide 3-4 concrete visual hook examples in the workflow skill instructions, contrasting generic vs concept-specific. The critique skill (Phase 34) already checks for concept specificity — that provides the quality gate.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bash grep/awk scripts (project standard from phases 29-34) |
| Config file | none — scripts are standalone |
| Quick run command | `bash .planning/phases/35-design-elevation-mockup-skill/test_mock0N.sh` |
| Full suite command | `for f in .planning/phases/35-design-elevation-mockup-skill/test_mock*.sh; do bash "$f"; done` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOCK-01 | workflows/mockup.md contains spring physics directive | unit/grep | `grep -c 'cubic-bezier(0.34, 1.56' workflows/mockup.md` | ❌ Wave 0 |
| MOCK-01 | workflows/mockup.md references ease-spring token | unit/grep | `grep -c 'ease-spring' workflows/mockup.md` | ❌ Wave 0 |
| MOCK-02 | workflows/mockup.md contains @supports scroll guard | unit/grep | `grep -c '@supports.*animation-timeline' workflows/mockup.md` | ❌ Wave 0 |
| MOCK-02 | @supports guard wraps opacity:0 for scroll animation | unit/grep | see test_mock02.sh | ❌ Wave 0 |
| MOCK-03 | workflows/mockup.md contains all 7 state names | unit/grep | `grep -cE 'aria-busy|aria-disabled|aria-invalid' workflows/mockup.md` | ❌ Wave 0 |
| MOCK-04 | workflows/mockup.md references narrative/reading order | unit/grep | `grep -ci 'narrative\|reading order\|stagger.*start' workflows/mockup.md` | ❌ Wave 0 |
| MOCK-05 | workflows/mockup.md references font-variation-settings | unit/grep | `grep -c 'font-variation-settings' workflows/mockup.md` | ❌ Wave 0 |
| MOCK-06 | workflows/mockup.md contains VISUAL-HOOK naming convention | unit/grep | `grep -c 'VISUAL-HOOK' workflows/mockup.md` | ❌ Wave 0 |
| MOCK-07 | workflows/mockup.md forbids layout-thrashing animation properties | unit/grep | `grep -ci 'will-change\|GPU\|composited' workflows/mockup.md` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Quick grep against `workflows/mockup.md` for the specific requirement
- **Per wave merge:** Full suite: all `test_mock*.sh` scripts pass
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test_mock01_spring_physics.sh` — covers MOCK-01
- [ ] `test_mock02_scroll_driven.sh` — covers MOCK-02
- [ ] `test_mock03_interaction_states.sh` — covers MOCK-03
- [ ] `test_mock04_narrative_entrance.sh` — covers MOCK-04
- [ ] `test_mock05_variable_fonts.sh` — covers MOCK-05
- [ ] `test_mock06_visual_hook.sh` — covers MOCK-06
- [ ] `test_mock07_performance.sh` — covers MOCK-07

---

## Sources

### Primary (HIGH confidence)

- `references/motion-design.md` — spring physics three-level model, GSAP 3.14 CDN patterns, scroll-driven @supports guard, variable font axis animation (established in Phase 32, verified in Phase 34)
- `workflows/mockup.md` — current skill state, identifies exactly what is present vs missing
- MDN CSS scroll-driven animations — `@supports (animation-timeline: scroll())` feature detection syntax
- [developer.chrome.com/docs/css-ui/scroll-driven-animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations) — `animation-range: entry/exit` semantics, `animation-duration: auto` requirement
- [webkit.org/blog/17184/](https://webkit.org/blog/17184/so-many-ranges-so-little-time-a-cheatsheet-of-animation-ranges-for-your-next-scroll-driven-animation/) — animation-range cheatsheet, Safari support confirmation
- [gsap.com/pricing/](https://gsap.com/pricing/) — GSAP is 100% free for all users (verified)

### Secondary (MEDIUM confidence)

- [connect.mozilla.org/t5/discussions/why-doesn-t-firefox-support-the-css-animation-timeline/](https://connect.mozilla.org/t5/discussions/why-doesn-t-firefox-support-the-css-animation-timeline/) — Firefox flag-only status confirmed
- [developers.google.com/fonts/docs/css2](https://developers.google.com/fonts/docs/css2) — Google Fonts CSS2 API axis range syntax
- [css-irl.info/variable-font-animation-with-css-and-splitting-js](https://css-irl.info/variable-font-animation-with-css-and-splitting-js/) — variable font animation patterns
- MDN `font-variation-settings` — "Baseline Widely available" since 2018 confirmation
- WebSearch: GSAP 3.14 under standard-license after Webflow acquisition, all plugins free

### Tertiary (LOW confidence)

- WebSearch: Visual hook concept-specific patterns — no single authoritative source; synthesized from GSAP docs + Awwwards winner analysis patterns documented in Phase 34

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — GSAP CDN free status verified; motion-design.md already establishes all easing tokens; CSS scroll-driven support matrix confirmed
- Architecture patterns: HIGH — All 7 patterns derive from verified reference files already in the codebase + official Chrome/WebKit documentation
- Pitfalls: HIGH — @supports guard, declaration order, and duration issues all have official documentation support; loading state pattern confirmed via ARIA spec
- Variable fonts: HIGH — "Baseline Widely Available" per MDN; Google Fonts CSS2 API confirmed
- Visual hook concept: MEDIUM — Pattern is design-opinionated (concept-specificity); no authoritative source; grounded in Phase 34 AI aesthetic detection framework

**Research date:** 2026-03-17
**Valid until:** 2026-06-17 (stable — CSS scroll-driven spec unlikely to change; GSAP CDN URL stable; variable fonts API stable)

**Key finding summary for planner:**
1. The project already has `references/motion-design.md` with all verified patterns. The elevation is primarily a `workflows/mockup.md` edit + 7 Nyquist test scripts.
2. GSAP is fully free — no licensing concern.
3. `@supports` guard for scroll animations is MANDATORY and already documented as mandatory in motion-design.md.
4. REQUIREMENTS.md says "@scroll-timeline" but the current spec uses `animation-timeline: view()`/`scroll()` — the requirement maps to the correct current API.
5. All 7 interaction states can be done CSS-only except loading state (which needs JS or a static demo section).
6. The visual hook naming convention (`<!-- VISUAL-HOOK: name -->`) enables the existing critique skill to evaluate concept-specificity.
