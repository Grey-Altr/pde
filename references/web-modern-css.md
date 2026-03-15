# Modern CSS Reference

**Version:** 1.0
**Scope:** Cascade layers, container queries, CSS nesting, custom properties, selectors, layout, animation mechanics, responsive patterns
**Ownership:** Shared by /pde:system (SYS) and /pde:wireframe (WFR)
**Boundary:** CSS animation mechanics (syntax, properties) are covered here. Motion design guidelines (when/why to animate, easing curves, duration scales) belong in HIG's interaction-patterns.md.

---

## Cascade Layers (@layer)

Cascade layers provide architectural control over CSS specificity. Later layers always win over earlier layers, regardless of selector specificity within each layer.

### Declaration

```css
/* Declare layer order upfront — later layers have higher priority */
@layer tokens, components, utilities;
```

### Design System Layer Pattern

```css
/* Layer 1: Token values (lowest priority — base values) */
@layer tokens {
  :root {
    --color-action: oklch(0.55 0.18 250);
    --space-4: 1rem;
    --font-size-base: 1rem;
  }
}

/* Layer 2: Component styles (override tokens when needed) */
@layer components {
  .pde-btn {
    background: var(--color-action);
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
  }

  .pde-card {
    padding: var(--space-4);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }
}

/* Layer 3: Utility overrides (highest priority — always win) */
@layer utilities {
  .u-hidden { display: none; }
  .u-flex { display: flex; }
  .u-gap-4 { gap: var(--space-4); }
  .u-text-center { text-align: center; }
}
```

### Why Cascade Layers Matter

- **Eliminates specificity wars.** A utility in the `utilities` layer always beats a component in the `components` layer, even if the component selector is more specific.
- **No `!important` needed.** Layer ordering handles override logic architecturally.
- **Predictable third-party integration.** Wrap third-party CSS in its own layer: `@layer vendor { @import "lib.css"; }`.
- **Unlayered CSS wins over all layers.** Styles not in any layer have highest priority — use this intentionally for critical overrides only.

### Wireframe Layer Extension

When wireframes need layout-specific styles that should not override tokens or components:

```css
@layer tokens, wireframe-layout, components, utilities;

@layer wireframe-layout {
  /* Screen layout rules — higher than tokens, lower than components */
  .pde-layout--lofi .pde-placeholder {
    background: var(--color-neutral-200);
    border: 2px dashed var(--color-neutral-400);
  }
}
```

### Browser Support

| Browser | Version | Released |
|---------|---------|----------|
| Chrome  | 99+     | Mar 2022 |
| Firefox | 97+     | Feb 2022 |
| Safari  | 15.4+   | Mar 2022 |
| Edge    | 99+     | Mar 2022 |

**Source:** [MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer), [CSS-Tricks Cascade Layers Guide](https://css-tricks.com/css-cascade-layers/)

---

## Container Queries

Container queries allow components to respond to their container's size rather than the viewport. Essential for truly reusable design system components.

### Setup

```css
/* Step 1: Define a containment context on the parent */
.pde-card {
  container-type: inline-size;
}

/* Step 2: Query the container from child styles */
@container (min-width: 400px) {
  .pde-card__layout {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

### Named Containers

```css
/* Name the container for explicit targeting */
.pde-card {
  container-type: inline-size;
  container-name: card;
}

/* Query by name — avoids ambiguity with nested containers */
@container card (min-width: 400px) {
  .pde-card__body {
    font-size: var(--font-size-lg);
  }
}

@container card (max-width: 399px) {
  .pde-card__body {
    font-size: var(--font-size-sm);
  }
}
```

### Container Query Units

| Unit | Meaning |
|------|---------|
| `cqi` | 1% of container's inline size |
| `cqw` | 1% of container's width |
| `cqh` | 1% of container's height |
| `cqb` | 1% of container's block size |
| `cqmin` | Smaller of cqi and cqb |
| `cqmax` | Larger of cqi and cqb |

```css
/* Container-relative font sizing */
.pde-card__title {
  font-size: clamp(1rem, 4cqi, 1.5rem);
}
```

### Combining with Viewport Queries

Use viewport queries for page-level layout and container queries for component-level adaptation:

```css
/* Viewport: page layout */
@media (min-width: 768px) {
  .page-grid {
    grid-template-columns: 250px 1fr;
  }
}

/* Container: component adaptation */
.sidebar .pde-card,
.main-content .pde-card {
  container-type: inline-size;
}

@container (min-width: 350px) {
  .pde-card__layout { flex-direction: row; }
}

@container (max-width: 349px) {
  .pde-card__layout { flex-direction: column; }
}
```

### Use Cases for Design Systems

- **Card components:** Horizontal layout in wide containers, vertical in narrow.
- **Navigation:** Full labels in wide sidebars, icons-only in collapsed state.
- **Data tables:** Full table in wide containers, stacked cards in narrow.
- **Form layouts:** Side-by-side fields in wide containers, stacked in narrow.

### Browser Support

Chrome 105+, Firefox 110+, Safari 16+, Edge 105+ (all 2022-2023).

**Source:** [MDN Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries), [Can I Use container queries](https://caniuse.com/css-container-queries)

---

## CSS Nesting

Native CSS nesting reduces repetition and groups related styles. Supported without preprocessors.

### Basic Nesting

```css
.pde-btn {
  background: var(--color-action);
  color: var(--color-on-action);
  padding: var(--space-2) var(--space-4);

  /* Pseudo-classes nest with & */
  &:hover {
    background: var(--color-action-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
  }
}
```

### BEM-Style Nesting

```css
.pde-btn {
  /* Base styles... */

  /* Modifier: size variants */
  &--sm {
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
  }

  &--lg {
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-lg);
  }

  /* Modifier: visual variants */
  &--primary {
    background: var(--color-action);
    color: var(--color-on-action);
  }

  &--secondary {
    background: transparent;
    border-color: var(--color-action);
    color: var(--color-action);
  }

  /* Element: icon inside button */
  &__icon {
    width: 1em;
    height: 1em;
    margin-inline-end: var(--space-1);
  }
}
```

### Nesting with Media/Container Queries

```css
.pde-card {
  padding: var(--space-4);

  @media (min-width: 768px) {
    padding: var(--space-6);
  }

  @container (min-width: 400px) {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

### Nesting Rules

- **Specificity:** Nested selectors have the same specificity as if written flat.
- **`&` is required** for pseudo-classes (`&:hover`), pseudo-elements (`&::before`), and compound selectors (`&.active`).
- **`&` is optional** for descendant selectors (`.child` inside a rule block nests as a descendant).
- **Max depth: 3 levels.** Deeper nesting hurts readability and signals overly specific selectors.

### Browser Support

Chrome 120+, Firefox 117+, Safari 17.2+, Edge 120+ (all late 2023).

**Source:** [MDN CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting)

---

## CSS Custom Properties (Advanced Patterns)

Beyond basic variable declaration, custom properties enable powerful theming and dynamic behavior.

### Inheritance and Scoping

```css
/* Global tokens — inherited by all descendants */
:root {
  --color-text-primary: oklch(0.15 0 0);
  --space-base: 0.25rem;
}

/* Component-scoped tokens — override within component subtree */
.pde-card--compact {
  --space-base: 0.125rem;
}

/* Utility override — most specific scope */
[data-density="comfortable"] {
  --space-base: 0.375rem;
}
```

### Fallback Values

```css
/* Single fallback */
color: var(--color-brand, oklch(0.55 0.18 250));

/* Chained fallback (var within var) */
color: var(--color-custom, var(--color-action, blue));

/* Fallback for optional tokens */
border-radius: var(--radius-override, var(--radius-md));
```

### Computed Values with calc()

```css
:root {
  --space-base: 0.25rem;
}

.pde-stack > * + * {
  margin-block-start: calc(var(--space-base) * 4);  /* 1rem */
}

.pde-container {
  padding: calc(var(--space-base) * 6);  /* 1.5rem */
  max-width: calc(var(--space-base) * 320);  /* 80rem = 1280px */
}
```

### Dark Mode Token Swapping

```css
:root {
  /* Light mode semantic tokens */
  --color-bg-default: var(--color-neutral-50);
  --color-bg-surface: var(--color-neutral-100);
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-600);
  --color-border: var(--color-neutral-200);
}

/* OS-level dark mode detection */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-default: var(--color-neutral-900);
    --color-bg-surface: var(--color-neutral-800);
    --color-text-primary: var(--color-neutral-50);
    --color-text-secondary: var(--color-neutral-300);
    --color-border: var(--color-neutral-700);
  }
}

/* User-controlled toggle via data attribute */
[data-theme="dark"] {
  --color-bg-default: var(--color-neutral-900);
  --color-bg-surface: var(--color-neutral-800);
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-300);
  --color-border: var(--color-neutral-700);
}
```

### @property for Typed Custom Properties

```css
/* Register a custom property with type, inheritance, and initial value */
@property --color-action {
  syntax: "<color>";
  inherits: true;
  initial-value: oklch(0.55 0.18 250);
}

@property --animation-progress {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}
```

Typed properties enable CSS transitions/animations on custom properties (which otherwise cannot be interpolated) and provide validation.

### Browser Support

Custom properties: all modern browsers (2017+). `@property`: Chrome 85+, Firefox 128+, Safari 15.4+.

**Source:** [MDN Custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables), [MDN @property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property)

---

## :has() Selector

The "parent selector" CSS never had — allows selecting elements based on their descendants or siblings.

### Parent Selection

```css
/* Style cards that contain images differently */
.pde-card:has(img) {
  padding: 0;
  overflow: hidden;
}

.pde-card:has(img) .pde-card__body {
  padding: var(--space-4);
}

/* Cards without images */
.pde-card:not(:has(img)) {
  border-left: 3px solid var(--color-action);
}
```

### Form Validation Patterns

```css
/* Highlight label when its input is invalid */
.pde-field:has(input:invalid) .pde-label {
  color: var(--color-error);
}

/* Show error message when input is invalid and focused */
.pde-field:has(input:invalid:focus) .pde-error {
  display: block;
}

/* Style required field markers */
.pde-field:has(input:required) .pde-label::after {
  content: " *";
  color: var(--color-error);
}
```

### Layout Adaptation

```css
/* Grid changes based on child count */
.pde-grid:has(> :nth-child(4)) {
  grid-template-columns: repeat(2, 1fr);
}

.pde-grid:has(> :nth-child(7)) {
  grid-template-columns: repeat(3, 1fr);
}

/* Empty state styling */
.pde-list:not(:has(li)) {
  display: grid;
  place-items: center;
  min-height: 200px;
}

.pde-list:not(:has(li))::after {
  content: "No items yet";
  color: var(--color-text-secondary);
}
```

### Browser Support

Chrome 105+, Firefox 121+, Safari 15.4+, Edge 105+.

**Source:** [MDN :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has)

---

## Subgrid

Allows nested grids to participate in their parent's grid track sizing. Critical for card grids where internal elements must align across cards.

### Basic Subgrid

```css
.pde-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.pde-card {
  display: grid;
  /* Inherit row tracks from parent — internal elements align across cards */
  grid-template-rows: subgrid;
  grid-row: span 3; /* Card spans 3 rows: header, body, footer */
}
```

### Aligned Card Internals

```css
/* Parent grid defines columns */
.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

/* Each product card inherits row sizing */
.product-card {
  display: grid;
  grid-row: span 4;
  grid-template-rows: subgrid;
  gap: 0; /* Manage gaps internally */
}

/* Card sections align across all cards in the grid */
.product-card__image { /* row 1 — all images same height */ }
.product-card__title { /* row 2 — all titles align */ }
.product-card__description { /* row 3 — descriptions align */ }
.product-card__actions { /* row 4 — buttons align at bottom */ }
```

### Browser Support

Chrome 117+, Firefox 71+, Safari 16+, Edge 117+.

**Source:** [MDN subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid)

---

## CSS Animation Mechanics

Technical reference for animation syntax and properties. Motion design guidelines (when to animate, easing curves, duration scales) belong in HIG's interaction-patterns.md.

### Transitions

```css
/* Simple state change animations */
.pde-btn {
  transition: background-color 150ms ease-out, transform 100ms ease-out;

  &:hover {
    background-color: var(--color-action-hover);
  }

  &:active {
    transform: scale(0.98);
  }
}

/* Transition shorthand: property | duration | timing-function | delay */
.pde-card {
  transition: box-shadow 200ms ease-out, transform 200ms ease-out;

  &:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }
}
```

### @keyframes

```css
/* Define animation sequence */
@keyframes pde-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pde-spin {
  to { transform: rotate(360deg); }
}

/* Apply animation */
.pde-toast {
  animation: pde-fade-in 300ms ease-out forwards;
}

.pde-spinner {
  animation: pde-spin 1s linear infinite;
}
```

### Animation Shorthand

```css
/* animation: name | duration | timing-function | delay | iteration-count | direction | fill-mode */
.element {
  animation: pde-fade-in 300ms ease-out 0ms 1 normal forwards;
}
```

### Transform Functions

| Function | Usage | Example |
|----------|-------|---------|
| `translate(x, y)` | Move element | `translate(0, -8px)` |
| `translateX(x)` | Horizontal move | `translateX(100%)` for slide |
| `translateY(y)` | Vertical move | `translateY(-2px)` for lift |
| `scale(n)` | Uniform scale | `scale(0.98)` for press effect |
| `rotate(deg)` | Rotation | `rotate(180deg)` for flip |
| `skew(x, y)` | Skew transform | Rarely used in UI |

### Performance: will-change

```css
/* Hint browser to optimize for upcoming animation */
.pde-modal {
  will-change: transform, opacity;
}

/* Remove after animation completes (JavaScript) */
/* element.style.willChange = 'auto'; */
```

**Rules for will-change:**
- Only apply to elements that WILL animate.
- Apply just before animation starts, remove after.
- Do not apply to many elements simultaneously (memory cost).
- `transform` and `opacity` are GPU-composited — cheapest to animate.

### Accessibility: prefers-reduced-motion

```css
/* MUST respect user's motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Alternative: selective reduction (preserve essential motion) */
@media (prefers-reduced-motion: reduce) {
  .pde-toast {
    animation: none;
    opacity: 1;
  }

  .pde-spinner {
    /* Keep spinner — essential for conveying loading state */
    animation-duration: 2s; /* Slow down instead of remove */
  }
}
```

**Source:** [MDN CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations), [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

---

## Responsive Patterns

### Viewport Breakpoints

```css
/* Standard breakpoints (Tailwind convention) */
/* sm:  640px  — Large phones / small tablets */
/* md:  768px  — Tablets */
/* lg:  1024px — Laptops */
/* xl:  1280px — Desktops */
/* 2xl: 1536px — Large desktops */

/* Mobile-first: min-width media queries */
.pde-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Breakpoint Custom Properties

```css
/* Token-based breakpoints for consistency */
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Note: custom properties cannot be used in media query conditions.
   Use them in container queries or calc() expressions instead.
   Media queries require literal values. */
```

### Fluid Typography with clamp()

```css
/* clamp(minimum, preferred, maximum) */
:root {
  /* Body text: 16px at small, scales with viewport, caps at 18px */
  --font-size-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);

  /* Headings: more dramatic scaling */
  --font-size-3xl: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
  --font-size-4xl: clamp(2rem, 1.2rem + 4vw, 3.5rem);
}

/* Fluid spacing */
:root {
  --space-section: clamp(2rem, 1rem + 5vw, 6rem);
}
```

### Logical Properties

```css
/* Use logical properties for RTL support */
.pde-btn__icon {
  /* Instead of: margin-right: var(--space-2); */
  margin-inline-end: var(--space-2);
}

.pde-card {
  /* Instead of: padding: 1rem 1.5rem; */
  padding-block: var(--space-4);
  padding-inline: var(--space-6);
}

.pde-sidebar {
  /* Instead of: border-right: 1px solid var(--color-border); */
  border-inline-end: 1px solid var(--color-border);
}

/* Logical dimension properties */
.pde-modal {
  max-inline-size: 640px;  /* Instead of max-width */
  min-block-size: 200px;   /* Instead of min-height */
}
```

**Source:** [MDN Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)

---

## Modern Layout

### CSS Grid: auto-fit / auto-fill with minmax

```css
/* Responsive grid without media queries */
.pde-auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-4);
}

/* auto-fit vs auto-fill:
   auto-fill: creates empty tracks (preserves grid structure)
   auto-fit: collapses empty tracks (items stretch to fill) */
.pde-auto-grid--stretch {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
```

### Named Grid Areas

```css
/* Page layout with named areas */
.pde-page {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;

  @media (max-width: 767px) {
    grid-template-areas:
      "header"
      "main"
      "footer";
    grid-template-columns: 1fr;
  }
}

.pde-header { grid-area: header; }
.pde-sidebar { grid-area: sidebar; }
.pde-main { grid-area: main; }
.pde-footer { grid-area: footer; }
```

### Flexbox with gap

```css
/* Horizontal group with consistent spacing */
.pde-btn-group {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

/* Stack with flexible sizing */
.pde-toolbar {
  display: flex;
  gap: var(--space-4);
  align-items: center;

  .pde-toolbar__search {
    flex: 1;  /* Takes remaining space */
  }
}
```

### Grid + Flexbox Combination

Use grid for page-level layout and flexbox for component internals:

```css
/* Grid: page structure */
.pde-dashboard {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: 64px 1fr;
  min-height: 100dvh;
}

/* Flexbox: component internals */
.pde-stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.pde-stat-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### Dynamic Viewport Units

```css
/* dvh accounts for mobile browser chrome (URL bar) */
.pde-hero {
  min-height: 100dvh;
}

/* svh: smallest possible viewport (URL bar visible) */
/* lvh: largest possible viewport (URL bar hidden) */
/* dvh: dynamic — changes as URL bar appears/disappears */
```

**Source:** [MDN CSS grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout), [MDN Flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout)

---

## Curated Industry Examples

### How Leading Design Systems Use Modern CSS

**Linear** (linear.app)
- Uses CSS custom properties extensively for theming with instant dark/light switching.
- Component styles are scoped with clear token consumption patterns.
- Minimal, high-contrast design with systematic spacing.

**Stripe** (stripe.com)
- Cascade layers separate their design system tiers.
- Complex gradient and animation systems built on CSS custom properties with computed values.
- Responsive components use container queries for embedded payment forms that must work at any width.

**Vercel** (vercel.com / Geist design system)
- Geist design system uses CSS custom properties with semantic naming (--geist-foreground, --geist-background).
- Dark mode via `[data-theme]` attribute swapping semantic tokens.
- Container queries for dashboard widgets that adapt to panel sizing.
- Fluid typography with clamp() for marketing pages.

### Pattern Takeaways

| Pattern | Used By | Benefit |
|---------|---------|---------|
| Semantic token naming | All three | Tokens communicate purpose, not raw values |
| `[data-theme]` attribute | Vercel, Linear | User-controlled theme toggle independent of OS setting |
| Container queries | Stripe, Vercel | Components work in any container width |
| Cascade layers | Stripe | Architectural specificity control |
| Fluid typography | Vercel | Smooth scaling without breakpoint jumps |

---

## Quick Reference: Feature Support Matrix

| Feature | Chrome | Firefox | Safari | Edge | Safe to Use |
|---------|--------|---------|--------|------|-------------|
| Cascade Layers | 99+ | 97+ | 15.4+ | 99+ | Yes |
| Container Queries | 105+ | 110+ | 16+ | 105+ | Yes |
| CSS Nesting | 120+ | 117+ | 17.2+ | 120+ | Yes |
| :has() | 105+ | 121+ | 15.4+ | 105+ | Yes |
| Subgrid | 117+ | 71+ | 16+ | 117+ | Yes |
| @property | 85+ | 128+ | 15.4+ | 85+ | Yes |
| oklch() | 111+ | 113+ | 15.4+ | 111+ | Yes |
| dvh/svh/lvh | 108+ | 101+ | 15.4+ | 108+ | Yes |
| clamp() | 79+ | 75+ | 13.1+ | 79+ | Yes |
| Logical Properties | 89+ | 66+ | 15+ | 89+ | Yes |
| gap (flexbox) | 84+ | 63+ | 14.1+ | 84+ | Yes |

All features listed in this reference are safe for modern browser targets (2023+).

---

## Citations

- [MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer) — Cascade layers specification and usage
- [MDN Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) — Container query syntax and examples
- [MDN CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting) — Native nesting specification
- [MDN Custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables) — CSS variables reference
- [MDN :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has) — Parent selector
- [MDN subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid) — Subgrid specification
- [MDN CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations) — Animation and transition reference
- [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) — Motion accessibility
- [MDN Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) — RTL-safe properties
- [MDN CSS grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) — Grid layout reference
- [CSS-Tricks Cascade Layers Guide](https://css-tricks.com/css-cascade-layers/) — Layer architecture patterns
- [CSS-Tricks Organizing with Cascade Layers](https://css-tricks.com/organizing-design-system-component-patterns-with-css-cascade-layers/) — Design system layer patterns
- [Can I Use](https://caniuse.com/) — Browser support data for all features

---

*Reference for PDE-OS /pde:system and /pde:wireframe skills*
