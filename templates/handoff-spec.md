---
Generated: "{date}"
Skill: /pde:handoff (HND)
Version: v{N}
Status: draft
Product Type: "{software|hardware|hybrid}"
Framework Detected: "{React|Vue|Svelte|none}"
Enhanced By: "{MCP list or none}"
---

# Design-to-Code Handoff: {project_name}

---

## Design Coverage Summary

| Artifact Type | Available | Version | Last Updated | Status |
|---------------|-----------|---------|-------------|--------|
| Design Brief | {yes/no} | v{N} | {date} | {draft/critiqued/finalized} |
| User Flows | {yes/no} | v{N} | {date} | {status} |
| Design System | {yes/no} | v{N} | {date} | {status} |
| Wireframes | {yes/no} | v{N} | {date} | {status} |
| HIG Audit | {yes/no} | v{N} | {date} | {status} |
| Hardware Spec | {yes/no} | v{N} | {date} | {status} |

### Staleness Warnings

- {artifact} was last updated {date} -- {N days} since last change. Consider re-running /pde:{skill} before implementation.

### Completeness Warnings

- [ ] {artifact} has not been critiqued -- quality not verified
- [ ] {critical finding} from critique is unresolved
- [ ] {flow/screen} referenced in brief but no wireframe exists

---

## Route Structure

| Route | Screen | Components | Wireframe Ref | Flow Ref |
|-------|--------|------------|---------------|----------|
| {/path} | {Screen Name} | {Component1, Component2} | {WFR-xxx} | {FLW-xxx} |
| {/path/:id} | {Screen Name} | {Component1, Component2} | {WFR-xxx} | {FLW-xxx} |

---

## Global Token Mappings

Design system tokens mapped to CSS custom properties for implementation.

| Token Category | Token Name | CSS Property | Value | Usage |
|---------------|------------|-------------|-------|-------|
| Color | {--color-primary-500} | {background-color, color} | {value} | {primary actions, links} |
| Typography | {--font-size-lg} | {font-size} | {value} | {headings} |
| Spacing | {--space-4} | {padding, margin, gap} | {value} | {component padding} |
| Shadow | {--shadow-md} | {box-shadow} | {value} | {cards, modals} |
| Border | {--radius-md} | {border-radius} | {value} | {buttons, inputs} |

---

## Shared Component APIs

Components used across multiple screens. Per-screen overrides documented in detail specs below.

### {ComponentName}

```typescript
interface {ComponentName}Props {
  /** {description} */
  {prop}: {type};
  /** {description} */
  {prop}?: {type};
  /** {description} */
  {onEvent}?: ({params}: {types}) => void;
}
```

**Slots/Children:**
- `{slot}`: {description, expected content}

**Tokens Used:** `{--token-1}`, `{--token-2}`

---

## Accessibility Overview

### Global Requirements

| Requirement | Implementation | Reference |
|-------------|---------------|-----------|
| Skip Links | Skip to main content link, visible on focus | WCAG 2.4.1 |
| Focus Management | Visible focus indicator on all interactive elements | WCAG 2.4.7 |
| ARIA Landmarks | `<main>`, `<nav>`, `<header>`, `<footer>` semantic regions | WCAG 1.3.1 |
| Color Contrast | All text meets 4.5:1 (normal) / 3:1 (large) ratios | WCAG 1.4.3 |
| Keyboard Navigation | All functionality accessible via keyboard | WCAG 2.1.1 |
| Reduced Motion | Respect `prefers-reduced-motion` media query | WCAG 2.3.3 |

---

## Motion System

### Global Transitions

| Trigger | Duration | Easing | CSS Property | Notes |
|---------|----------|--------|-------------|-------|
| Hover | {ms} | {easing function} | {property} | {description} |
| Focus | {ms} | {easing function} | {property} | {description} |
| Page transition | {ms} | {easing function} | {property} | {description} |
| Modal open | {ms} | {easing function} | {property} | {description} |
| Modal close | {ms} | {easing function} | {property} | {description} |

**Reduced motion behavior:** Replace animations with instant transitions or opacity-only fades.

---

## Gap Analysis

### Missing Backend Endpoints

| Endpoint | Method | Purpose | Required By Screen | Priority |
|----------|--------|---------|-------------------|----------|
| {/api/path} | {GET/POST/PUT/DELETE} | {description} | {screen name} | {P0/P1/P2} |

### State Management Needs

| State | Scope | Type | Notes |
|-------|-------|------|-------|
| {state name} | {global/page/component} | {server/client/derived} | {notes on complexity} |

### API Requirements

| Requirement | Details | Impact |
|-------------|---------|--------|
| {auth} | {what auth system is needed} | {which screens are affected} |
| {real-time} | {WebSocket/SSE needs} | {which features need it} |
| {file upload} | {upload requirements} | {size limits, formats} |

---

## Test Specs Overview

### End-to-End Scenarios

| Flow | Steps | Expected Outcome | Priority |
|------|-------|-------------------|----------|
| {user flow name} | {step 1 -> step 2 -> step 3} | {expected end state} | {P0/P1/P2} |

*Detailed per-component test specs in screen detail sections below.*
*These feed directly into `/pde:add-tests` for test generation.*

---

# Per-Screen Detail Specs

---

## Screen: {Screen Name}

**Wireframe Ref:** {WFR-xxx}
**Route:** {/path}

### Component APIs

#### {ComponentName}

```typescript
interface {ComponentName}Props {
  /** {description} */
  {prop}: {type};
  /** {description} */
  {prop}?: {type};
  /** Callback fired when {event description} */
  {onEvent}?: ({params}: {ParamType}) => void;
}
```

**Events:**
| Event | Payload | When Fired |
|-------|---------|------------|
| {onEvent} | `{type}` | {trigger description} |

**Slots:**
| Slot | Content | Required |
|------|---------|----------|
| {slot name} | {expected content type} | {yes/no} |

### Breakpoint Specs

| Element | >= 1024px (Desktop) | 768-1023px (Tablet) | < 768px (Mobile) |
|---------|-------|--------|--------|
| {element} | {layout behavior} | {layout behavior} | {layout behavior} |

**What transforms:**
- {element}: {stacks vertically / hides / collapses to icon / changes to drawer}

### Interaction Specs

| Element | State | Appearance | Transition |
|---------|-------|-----------|------------|
| {element} | Default | {description} | -- |
| {element} | Hover | {description} | {duration, easing} |
| {element} | Focus | {description} | {duration, easing} |
| {element} | Active | {description} | {duration, easing} |
| {element} | Disabled | {description} | -- |
| {element} | Loading | {description} | {duration, easing} |
| {element} | Error | {description} | {duration, easing} |

### Motion Specs

| Trigger | Duration | Easing | CSS Property | Notes |
|---------|----------|--------|-------------|-------|
| {trigger} | {ms} | {cubic-bezier()} | {transform/opacity/etc.} | {description} |

### Token Mappings

| Element | Property | Token | Fallback |
|---------|----------|-------|----------|
| {element} | {CSS property} | {--token-name} | {fallback value} |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| ARIA Role | {role} on {element} |
| ARIA Label | {aria-label / aria-labelledby strategy} |
| Keyboard Shortcut | {key combo}: {action} |
| Focus Order | {tab order specification} |
| Screen Reader | {announcement on state change} |
| Live Region | {aria-live="polite/assertive"} on {element} |

### Component Stubs

#### React

```tsx
import type { FC } from 'react';
// Token imports
import '{tokens-path}';

interface {ComponentName}Props {
  {prop}: {type};
  {prop}?: {type};
}

export const {ComponentName}: FC<{ComponentName}Props> = ({
  {prop},
  {prop},
}) => {
  // TODO: Implement component logic
  // TODO: Add event handlers
  // TODO: Add accessibility attributes

  return (
    {/* TODO: Implement markup */}
  );
};
```

#### Vue

```vue
<script setup lang="ts">
// Token imports
import '{tokens-path}';

interface Props {
  {prop}: {type};
  {prop}?: {type};
}

const props = defineProps<Props>();
const emit = defineEmits<{
  {event}: [{payload-type}];
}>();

// TODO: Implement component logic
</script>

<template>
  <!-- TODO: Implement markup -->
</template>
```

#### Svelte

```svelte
<script lang="ts">
  // Token imports
  import '{tokens-path}';

  export let {prop}: {type};
  export let {prop}: {type} = {default};

  // TODO: Implement component logic
</script>

<!-- TODO: Implement markup -->
```

### Test Specs

| Component | State | Interaction | Expected |
|-----------|-------|-------------|----------|
| {component} | {initial state} | {click/type/focus} | {expected behavior} |
| {component} | {error state} | {submit} | {error message shown} |
| {component} | {loading state} | {wait} | {spinner, disabled inputs} |

---

*Repeat per-screen detail spec for each screen in the application*

---

# Hardware Handoff

*(When product type is hardware or hybrid)*

---

## BOM Export

**Format:** CSV
**Columns:** Item, Description, Material, Quantity, Unit Cost, Supplier, Part Number, Lead Time, MOQ, Notes

```csv
Item,Description,Material,Qty,Unit Cost,Supplier,Part Number,Lead Time,MOQ,Notes
{item},{desc},{material},{qty},{cost},{supplier},{part_no},{lead_time},{moq},{notes}
```

**File:** `{output_root}/handoff/HND-bom-export-v{N}.csv`

---

## Dimension Drawings

SVG orthographic views extracted from hardware spec.

**Files:**
- `{output_root}/handoff/HND-front-view-v{N}.svg`
- `{output_root}/handoff/HND-side-view-v{N}.svg`
- `{output_root}/handoff/HND-top-view-v{N}.svg`

---

## Materials & Finish Spec

| Part | Material | Grade | Finish | Color | Tolerance |
|------|----------|-------|--------|-------|-----------|
| {part} | {material} | {grade} | {process} | {Pantone/RAL} | {tolerance} |

---

## DFM Notes

{Extracted from hardware spec -- process-specific manufacturing notes}

---

## Assembly Sequence

{Extracted from hardware spec -- numbered assembly steps with fastener callouts}

---

## Compliance Checklist

| Standard | Region | Status | Testing Required | Lab |
|----------|--------|--------|-----------------|-----|
| {standard} | {region} | {status} | {test type} | {lab name} |

---

## Supplier List

| Component | Primary | Alternative | Lead Time | MOQ | Contact |
|-----------|---------|-------------|-----------|-----|---------|
| {component} | {supplier} | {alt supplier} | {weeks} | {qty} | {email/URL} |

---

## Prototyping Guide

| Stage | Purpose | Process | Timeline | Budget Estimate |
|-------|---------|---------|----------|-----------------|
| Form Factor | {what to validate} | {3D print/CNC} | {weeks} | ${X} |
| Electronics | {what to validate} | {breadboard/PCB} | {weeks} | ${X} |
| Functional | {what to validate} | {integrated build} | {weeks} | ${X} |

---

## Cross-References (Hybrid Products)

*(When product type is hybrid: links between hardware and software packages)*

| Hardware Element | Software Artifact | Interface Type | Notes |
|-----------------|-------------------|----------------|-------|
| {display module} | {WFR-xxx wireframe} | {display output} | {resolution, touch spec} |
| {button array} | {FLW-xxx flow} | {input event} | {debounce, mapping} |
| {LED indicators} | {state management} | {output signal} | {color codes, patterns} |

---

*Generated by PDE-OS /pde:handoff | {date} | Product Type: {software|hardware|hybrid}*
