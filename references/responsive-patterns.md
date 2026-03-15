# Responsive Patterns Reference Library

> Curated page-level layout and component-level adaptive patterns for the `/pde:hig` skill.
> Loaded via `@` reference from `hig.md`.
>
> **Version:** 1.0
> **Scope:** Page-level layout patterns and component-level adaptive behavior
> **Ownership:** HIG (exclusive)
> **Boundary:** Layout behavior patterns. Visual tokens and fidelity levels are owned by SYS/WFR.

---

## Breakpoint Strategy

### Standard Breakpoints (Aligned with Design System Tokens)

| Token | Width | Target |
|-------|-------|--------|
| `--bp-xs` | 0-479px | Small phones |
| `--bp-sm` | 480-639px | Large phones |
| `--bp-md` | 640-767px | Small tablets |
| `--bp-lg` | 768-1023px | Tablets, small laptops |
| `--bp-xl` | 1024-1279px | Laptops, desktops |
| `--bp-2xl` | 1280px+ | Large desktops |

### Mobile-First Principle

Always write base styles for smallest screen, then add complexity upward:

```css
/* Base: mobile */
.layout { display: flex; flex-direction: column; }

/* Tablet and up */
@media (min-width: 768px) {
  .layout { flex-direction: row; }
}
```

### When to Use Container Queries vs Media Queries

| Use | When |
|-----|------|
| **Media queries** | Page-level layout changes, global navigation shifts |
| **Container queries** | Component-level adaptation regardless of viewport (cards in sidebar vs main content) |

```css
/* Container query: component adapts to its container, not viewport */
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { display: grid; grid-template-columns: 200px 1fr; }
}
```

---

## Page-Level Layout Patterns

### Stack (Mobile-First Vertical Flow)

**When to use:** Default for mobile; base layout for all responsive designs.

**Pattern:** All content in a single column, full width, stacked vertically.

```css
.stack-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 1rem);
  max-width: 100%;
  padding-inline: var(--space-md, 1rem);
}
```

**Anti-pattern:** Setting a narrow `max-width` on mobile that wastes horizontal space.

---

### Sidebar (Collapsible Side Panel)

**When to use:** Admin panels, documentation sites, settings pages.

**Pattern:** Main content + sidebar. Sidebar collapses below breakpoint to either hidden (hamburger) or stacked above/below main.

```css
.sidebar-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg, 1.5rem);
}

@media (min-width: 768px) {
  .sidebar-layout {
    grid-template-columns: minmax(200px, 280px) 1fr;
  }
}
```

**Swift/Apple:**
```swift
NavigationSplitView {
    SidebarView()
} detail: {
    ContentView()
}
// Automatically adapts: sidebar overlay on compact, side-by-side on regular
```

**Anti-pattern:** Fixed-width sidebar that doesn't collapse, causing horizontal scroll on mobile.

---

### Holy Grail (Header + Sidebar + Main + Sidebar + Footer)

**When to use:** Complex applications with navigation, content, and supplementary panels.

**Pattern:** Classic five-region layout. On mobile, collapses to single column in logical order.

```css
.holy-grail {
  display: grid;
  grid-template-areas:
    "header"
    "nav"
    "main"
    "aside"
    "footer";
  grid-template-columns: 1fr;
}

@media (min-width: 1024px) {
  .holy-grail {
    grid-template-areas:
      "header header header"
      "nav    main   aside"
      "footer footer footer";
    grid-template-columns: minmax(180px, 240px) 1fr minmax(180px, 240px);
    grid-template-rows: auto 1fr auto;
    min-height: 100dvh;
  }
}
```

**Anti-pattern:** Both sidebars visible on tablet, squeezing main content too narrow.

---

### Dashboard (Grid-Based Multi-Panel)

**When to use:** Analytics, monitoring, admin overviews with multiple data panels.

**Pattern:** Auto-flowing grid of cards/widgets. Cards reflow from multi-column to single column.

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: var(--space-lg, 1.5rem);
}

/* Featured/large panels span multiple columns */
.dashboard-grid .panel--featured {
  grid-column: span min(2, var(--dashboard-cols, 1));
}
```

**Swift/Apple:**
```swift
LazyVGrid(columns: [
    GridItem(.adaptive(minimum: 300, maximum: 500))
], spacing: 16) {
    ForEach(widgets) { widget in
        WidgetCard(widget: widget)
    }
}
```

**Anti-pattern:** Fixed column count that either wastes space or overflows.

---

### Responsive Typography (Fluid Type)

**When to use:** Everywhere. Text should scale smoothly between breakpoints.

**Pattern:** Use `clamp()` for fluid sizing between a minimum and maximum.

```css
:root {
  /* Fluid body text: 16px at 320px viewport, 18px at 1280px viewport */
  --font-size-body: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);

  /* Fluid heading: 24px to 40px */
  --font-size-h1: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);

  /* Fluid spacing that scales with type */
  --space-md: clamp(0.75rem, 0.5rem + 1vw, 1.5rem);
}
```

**Anti-pattern:** Using `vw` units alone (no minimum/maximum, unusable at extremes). Using `px` for all type sizes.

**Swift/Apple:** Dynamic Type handles this automatically. Use `.font(.body)` and system text styles. For custom sizes: `.dynamicTypeSize(.large ... .accessibility3)`.

---

## Component-Level Adaptive Patterns

### Navigation Collapse

**When to use:** Primary site navigation on small screens.

**Patterns (choose one):**

| Pattern | Best For | Interaction |
|---------|----------|-------------|
| Hamburger menu | Most sites; limited nav items (< 8) | Toggle icon reveals overlay/slide-in menu |
| Priority+ | Sites with many nav items | Show as many as fit, overflow to "More" dropdown |
| Bottom nav | Mobile apps (iOS/Android convention) | Tab bar fixed at bottom, 3-5 items max |

**Hamburger menu example:**
```html
<nav aria-label="Primary">
  <button aria-expanded="false" aria-controls="nav-menu" aria-label="Menu">
    <svg aria-hidden="true"><!-- hamburger icon --></svg>
  </button>
  <ul id="nav-menu" hidden>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

```css
@media (min-width: 768px) {
  nav button[aria-controls] { display: none; }
  #nav-menu { display: flex !important; gap: var(--space-md); }
}
```

**Anti-pattern:** Hamburger on desktop (hides primary navigation unnecessarily). Bottom nav with > 5 items.

**Swift/Apple:**
```swift
// Compact: Tab bar (bottom nav)
// Regular: Sidebar navigation
@Environment(\.horizontalSizeClass) var sizeClass

if sizeClass == .compact {
    TabView { /* tab items */ }
} else {
    NavigationSplitView { /* sidebar */ } detail: { /* content */ }
}
```

---

### Responsive Table Strategies

**When to use:** Data tables that exceed mobile viewport width.

**Patterns:**

| Pattern | Best For | Trade-off |
|---------|----------|-----------|
| Horizontal scroll | Complex data, many columns | Requires scroll awareness |
| Stack cards | Simple data, few columns | Loses comparison ability |
| Column toggle | Medium data, some columns optional | Adds UI complexity |
| Priority columns | Mixed importance columns | Requires column priority assessment |

**Horizontal scroll (recommended default):**
```css
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Shadow hint for scrollable content */
.table-responsive {
  background:
    linear-gradient(to right, white 30%, transparent),
    linear-gradient(to left, white 30%, transparent),
    linear-gradient(to right, rgba(0,0,0,.15), transparent),
    linear-gradient(to left, rgba(0,0,0,.15), transparent);
  background-position: left, right, left, right;
  background-size: 40px 100%, 40px 100%, 14px 100%, 14px 100%;
  background-repeat: no-repeat;
  background-attachment: local, local, scroll, scroll;
}
```

**Stack cards (for simple tables):**
```css
@media (max-width: 639px) {
  table, thead, tbody, th, td, tr { display: block; }
  thead { position: absolute; clip: rect(0 0 0 0); }
  td::before {
    content: attr(data-label);
    font-weight: 700;
    display: inline-block;
    width: 120px;
  }
}
```

**Anti-pattern:** Shrinking font size to fit table on mobile (unreadable).

---

### Card Reflow

**When to use:** Product grids, feature lists, team member grids.

**Pattern:** Cards in a grid that reflow from multi-column to single column.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: var(--space-lg, 1.5rem);
}
```

**Container query version (card adapts internally):**
```css
.card { container-type: inline-size; }

@container (min-width: 350px) {
  .card-inner {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: var(--space-md);
  }
}

@container (max-width: 349px) {
  .card-inner {
    display: flex;
    flex-direction: column;
  }
}
```

**Anti-pattern:** Fixed three-column grid that doesn't reflow.

---

### Form Stacking

**When to use:** Multi-column forms (registration, checkout, settings).

**Pattern:** Side-by-side fields on desktop, single column on mobile.

```css
.form-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md, 1rem);
}

@media (min-width: 640px) {
  .form-row--pair {
    grid-template-columns: 1fr 1fr;
  }
  .form-row--address {
    grid-template-columns: 2fr 1fr 1fr; /* street, city, zip */
  }
}
```

**Accessibility note:** Form field order in DOM must match visual order. Labels must remain associated with inputs in both layouts.

**Anti-pattern:** Side-by-side labels and inputs that break association when stacked.

---

### Image and Media Adaptation

**When to use:** Hero images, galleries, embedded media.

**Patterns:**

```css
/* Responsive images */
img {
  max-width: 100%;
  height: auto;
}

/* Art direction with <picture> */
<picture>
  <source srcset="hero-wide.jpg" media="(min-width: 1024px)">
  <source srcset="hero-medium.jpg" media="(min-width: 640px)">
  <img src="hero-narrow.jpg" alt="Product showcase">
</picture>

/* Responsive video embed */
.video-wrapper {
  aspect-ratio: 16 / 9;
  width: 100%;
}
.video-wrapper iframe {
  width: 100%;
  height: 100%;
}
```

**Swift/Apple:**
```swift
AsyncImage(url: imageURL) { image in
    image
        .resizable()
        .aspectRatio(contentMode: .fit)
} placeholder: {
    ProgressView()
}
.frame(maxWidth: .infinity)
```

**Anti-pattern:** Fixed-dimension images that overflow on mobile. Missing `alt` text on responsive images.

---

## Platform-Specific Responsive Patterns

### SwiftUI Adaptive Layout

```swift
// Size class detection
@Environment(\.horizontalSizeClass) var hSizeClass
@Environment(\.verticalSizeClass) var vSizeClass

var body: some View {
    if hSizeClass == .compact {
        // Phone layout: stacked
        VStack { content }
    } else {
        // Tablet/Mac: side-by-side
        HStack { content }
    }
}
```

### iOS/iPadOS Size Classes

| Device | Horizontal | Vertical |
|--------|-----------|----------|
| iPhone portrait | Compact | Regular |
| iPhone landscape | Compact (most) / Regular (Plus/Max) | Compact |
| iPad portrait | Regular | Regular |
| iPad landscape | Regular | Regular |
| iPad Split View | Compact or Regular (depends on split) | Regular |

### macOS Window Resizing

```swift
// Minimum window size
.frame(minWidth: 600, minHeight: 400)

// Adaptive toolbar
.toolbar {
    ToolbarItem(placement: .automatic) {
        // System decides placement based on window size
    }
}

// Window group for multi-window support
WindowGroup("Dashboard") {
    DashboardView()
}
.defaultSize(width: 1200, height: 800)
```

### macOS Toolbar Adaptation

- Toolbars collapse items into overflow menu when window narrows
- Use `.toolbar` with system-provided placements for automatic adaptation
- `.toolbarRole(.editor)` for document-based apps (adapts to narrow widths)

---

## Cross-Cutting Responsive Concerns

### Touch Target Sizes

| Platform | Minimum Size | Recommended |
|----------|-------------|-------------|
| Web (WCAG 2.5.8) | 24x24 CSS px | 44x44 CSS px |
| iOS (Apple HIG) | 44x44 pt | 44x44 pt |
| Android (Material) | 48x48 dp | 48x48 dp |

### Spacing Scale Adaptation

Use CSS custom properties with `clamp()` for fluid spacing:

```css
:root {
  --space-xs: clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem);
  --space-sm: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
  --space-md: clamp(0.75rem, 0.6rem + 0.75vw, 1.25rem);
  --space-lg: clamp(1rem, 0.8rem + 1vw, 2rem);
  --space-xl: clamp(1.5rem, 1rem + 2.5vw, 3rem);
}
```

### Print Styles

```css
@media print {
  nav, footer, .no-print { display: none; }
  body { font-size: 12pt; color: #000; background: #fff; }
  a[href]::after { content: " (" attr(href) ")"; font-size: 0.8em; }
  .page-break { break-before: page; }
}
```

---

## Citations

- [MDN Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) -- Container query syntax and browser support
- [CSS Tricks: A Complete Guide to CSS Grid](https://css-tricks.com/snippets/css/complete-guide-grid/) -- Grid layout patterns
- [Every Layout](https://every-layout.dev/) -- Intrinsic responsive layout patterns (Stack, Sidebar, Switcher)
- [Utopia: Fluid Responsive Design](https://utopia.fyi/) -- Fluid type and space scales with clamp()
- [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) -- iOS/macOS layout guidance
- [Apple HIG: Responsive Design](https://developer.apple.com/design/human-interface-guidelines/layout#Best-practices) -- Size classes and adaptive layouts
- [W3C WCAG 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) -- 320px reflow requirement

---

*Reference: responsive-patterns.md v1.0*
*Ownership: HIG (exclusive)*
*Last updated: 2026-03-10*
