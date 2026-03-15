---
Generated: "{date}"
Skill: /pde:wireframe (WFR)
Version: v{N}
Fidelity: "{lofi|midfi|hifi}"
Status: draft
Enhanced By: "{MCP list or none}"
---

# Wireframe: {screen_name}

---

## Screen Purpose

{What this screen does in the user flow}

## Key Interactions

| Element | Interaction | Behavior |
|---------|-------------|----------|
| {element name} | {click/hover/input/submit} | {what happens} |

## Fidelity Notes

### Lo-fi
- Gray boxes with dimension labels for images and media
- Text labels only ("Username", "Submit", "Navigation")
- Dashed borders on placeholder regions
- Click-through navigation between pages active

### Mid-fi
- Real layout with proper spacing and alignment
- Realistic placeholder content (fake names, sample data)
- Icon/silhouette placeholders indicating content type
- Basic chart shapes for data visualization (bar/line/pie outlines)
- Primary + empty states
- Microcopy: realistic button labels, validation messages

### Hi-fi
- Design tokens applied from assets/tokens.css
- Near-real content pulling from brief (product name, features, messaging)
- Stock imagery matching product context
- Rendered charts with sample data via inline SVG
- Primary + empty + loading + error states
- Full microcopy with tooltips

## HTML Structure

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Product Name} - {Screen Name}</title>
  <link rel="stylesheet" href="../../assets/tokens.css">
  <style>
    /* Screen-specific layout styles */
    @layer wireframe {
      /* Layout rules scoped to this screen */
      /* Tokens are consumed via var(--token-name) */
      /* Never override token values in this layer */
    }

    /* Fidelity-specific styles */
    .pde-layout--lofi {
      /* Placeholder styling: gray boxes, dashed borders, labels */
    }

    .pde-layout--midfi {
      /* Refined layout: proper spacing, realistic proportions */
    }

    .pde-layout--hifi {
      /* Full token application: colors, typography, shadows */
    }

    /* Responsive layout */
    @media (min-width: 640px) {
      /* sm breakpoint adjustments */
    }

    @media (min-width: 768px) {
      /* md breakpoint adjustments */
    }

    @media (min-width: 1024px) {
      /* lg breakpoint adjustments */
    }

    @media (min-width: 1280px) {
      /* xl breakpoint adjustments */
    }
  </style>
</head>
<body class="pde-layout pde-layout--{fidelity}">
  <header class="pde-header" role="banner">
    {header content per fidelity level}
    <!-- Lo-fi: placeholder box with "Logo" label + "Navigation" label -->
    <!-- Mid-fi: SVG logo placeholder + text navigation links -->
    <!-- Hi-fi: branded logo + styled navigation with tokens applied -->
  </header>

  <nav aria-label="Main navigation">
    {navigation with working inter-page links}
    <!-- All fidelities: <a href="other-screen.html"> links work -->
    <!-- Index link always present: <a href="index.html">All Screens</a> -->
  </nav>

  <main role="main">
    {screen content per fidelity level}
    <!-- Semantic HTML structure: sections, articles, forms -->
    <!-- ARIA landmarks and roles on all interactive elements -->
    <!-- Tabindex management for focus order -->
  </main>

  <footer class="pde-footer" role="contentinfo">
    {footer content per fidelity level}
  </footer>

  <script>
    /* Theme toggle for hi-fi wireframes */
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    }
  </script>
</body>
</html>
```

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Base (mobile) | < 640px | {single column, stacked layout} |
| sm | >= 640px | {describe layout change} |
| md | >= 768px | {describe layout change} |
| lg | >= 1024px | {describe layout change} |
| xl | >= 1280px | {describe layout change} |

## Accessibility Notes

| Feature | Implementation |
|---------|---------------|
| Landmarks | `role="banner"`, `role="main"`, `role="contentinfo"`, `aria-label` on nav |
| Focus Order | Logical tab order following visual layout; skip-to-main link |
| Form Labels | All inputs have associated `<label>` elements via `for` attribute |
| Alt Text | All images have descriptive `alt` attributes (or `alt=""` for decorative) |
| Color Contrast | WCAG 2.2 AA minimum: 4.5:1 normal text, 3:1 large text and UI components |
| Motion | `prefers-reduced-motion` respected for any animations |

## Token Dependency

| Status | Description |
|--------|-------------|
| **tokens-available** | Design tokens found at assets/tokens.css — full token integration |
| **tokens-fallback** | No tokens found — using product-type-aware fallback palette |

{If fallback: "Run /pde:system to generate design tokens. Next wireframe run will automatically pick up real tokens."}

---

*Generated by PDE-OS /pde:wireframe | {date}*

{If Playwright MCP was used: "[Validated by Playwright MCP]"}
{If Playwright MCP was unavailable: "[Not validated -- install Playwright MCP for automated browser testing]"}
