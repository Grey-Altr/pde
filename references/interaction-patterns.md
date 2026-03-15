# Interaction Patterns Reference Library

> Curated ARIA design patterns, keyboard navigation, focus management, motion, and dark mode interaction knowledge for the `/pde:hig` skill.
> Loaded via `@` reference from `hig.md` using tiered depth selection.
>
> **Version:** 1.0
> **Scope:** ARIA design patterns, keyboard navigation, focus management, motion, dark mode interaction
> **Ownership:** HIG (exclusive)
> **Boundary:** Interaction behavior patterns. Visual design tokens are owned by SYS.

---

<!-- TIER: essentials -->

## ARIA Pattern Tiers

### Tier 1 -- Simple (6 patterns)

Foundational interactive patterns. Every project needs these.

---

#### Button

**Roles/Properties:** `role="button"` (or native `<button>`), `aria-pressed` (toggle), `aria-expanded` (controls disclosure), `aria-disabled`

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter | Activate button |
| Space | Activate button |

**Focus:** Receives focus via Tab. No special focus management.

**Web Example:**
```html
<button type="button" aria-pressed="false">Toggle Dark Mode</button>

<!-- Custom element as button -->
<div role="button" tabindex="0" aria-pressed="false">Toggle</div>
```

**Swift/Apple:**
```swift
Button("Toggle Dark Mode") { toggleDarkMode() }
    .accessibilityAddTraits(.isToggle)
    .accessibilityValue(isDark ? "On" : "Off")
```

**Anti-patterns:** `<div onclick="...">` without `role="button"` and `tabindex="0"`. Using `<a href="#">` as a button.

---

#### Link

**Roles/Properties:** Native `<a href>`. `aria-current="page"` for current page in navigation.

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter | Follow link |

**Focus:** Receives focus via Tab. Distinguishable from buttons (typically underlined).

**Web Example:**
```html
<a href="/about">About Us</a>
<a href="/dashboard" aria-current="page">Dashboard</a>
```

**Swift/Apple:**
```swift
Link("About Us", destination: URL(string: "/about")!)
    .accessibilityAddTraits(.isLink)
```

---

#### Checkbox

**Roles/Properties:** `role="checkbox"` (or native `<input type="checkbox">`), `aria-checked` (`true`/`false`/`mixed`)

**Keyboard:**
| Key | Action |
|-----|--------|
| Space | Toggle checked state |

**Focus:** Receives focus via Tab. Group related checkboxes with `role="group"` and `aria-labelledby`.

**Web Example:**
```html
<fieldset>
  <legend>Notification preferences</legend>
  <label><input type="checkbox" name="email"> Email</label>
  <label><input type="checkbox" name="sms"> SMS</label>
</fieldset>
```

**Swift/Apple:**
```swift
Toggle("Email notifications", isOn: $emailEnabled)
Toggle("SMS notifications", isOn: $smsEnabled)
```

---

#### Switch

**Roles/Properties:** `role="switch"`, `aria-checked` (`true`/`false`). Distinct from checkbox -- represents on/off state.

**Keyboard:**
| Key | Action |
|-----|--------|
| Space | Toggle on/off |
| Enter | Toggle on/off (optional) |

**Web Example:**
```html
<button role="switch" aria-checked="true" aria-label="Dark mode">
  <span aria-hidden="true">On</span>
</button>
```

**Swift/Apple:**
```swift
Toggle("Dark mode", isOn: $isDarkMode)
    .toggleStyle(.switch)
```

---

#### Radio Group

**Roles/Properties:** `role="radiogroup"` on container, `role="radio"` on items, `aria-checked` on selected item.

**Keyboard:**
| Key | Action |
|-----|--------|
| Tab | Move focus to/from radio group |
| Arrow Down/Right | Move to next radio, select it |
| Arrow Up/Left | Move to previous radio, select it |
| Space | Select focused radio (if not auto-selected on arrow) |

**Focus:** Single Tab stop for the group. Arrow keys move within group.

**Web Example:**
```html
<div role="radiogroup" aria-labelledby="plan-label">
  <span id="plan-label">Select plan:</span>
  <div role="radio" tabindex="0" aria-checked="true">Free</div>
  <div role="radio" tabindex="-1" aria-checked="false">Pro</div>
  <div role="radio" tabindex="-1" aria-checked="false">Enterprise</div>
</div>
```

**Swift/Apple:**
```swift
Picker("Select plan", selection: $plan) {
    Text("Free").tag(Plan.free)
    Text("Pro").tag(Plan.pro)
    Text("Enterprise").tag(Plan.enterprise)
}.pickerStyle(.radioGroup)
```

---

#### Disclosure (Show/Hide)

**Roles/Properties:** Trigger button with `aria-expanded` (`true`/`false`), `aria-controls` pointing to content ID.

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter / Space | Toggle disclosure |

**Web Example:**
```html
<button aria-expanded="false" aria-controls="details-panel">Show Details</button>
<div id="details-panel" hidden>Details content here</div>

<!-- Or native: -->
<details>
  <summary>Show Details</summary>
  <p>Details content here</p>
</details>
```

**Swift/Apple:**
```swift
DisclosureGroup("Show Details", isExpanded: $isExpanded) {
    Text("Details content here")
}
```

---

<!-- TIER: standard -->

### Tier 2 -- Moderate (10 patterns)

Common interactive patterns for most applications.

---

#### Tabs

**Roles/Properties:** `role="tablist"` on container, `role="tab"` on each tab, `role="tabpanel"` on content panels, `aria-selected`, `aria-controls`, `aria-labelledby`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Tab | Move focus into/out of tab list |
| Arrow Left/Right | Move between tabs (horizontal) |
| Arrow Up/Down | Move between tabs (vertical) |
| Home | Move to first tab |
| End | Move to last tab |
| Space/Enter | Activate tab (manual activation) |

**Focus:** Roving tabindex within tablist. Active tab has `tabindex="0"`, others `tabindex="-1"`.

**Web Example:**
```html
<div role="tablist" aria-label="Project settings">
  <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1" tabindex="0">General</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2" tabindex="-1">Security</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">General settings...</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>Security settings...</div>
```

**Swift/Apple:**
```swift
TabView {
    GeneralSettings().tabItem { Label("General", systemImage: "gear") }
    SecuritySettings().tabItem { Label("Security", systemImage: "lock") }
}
```

---

#### Accordion

**Roles/Properties:** Each header is a button with `aria-expanded` and `aria-controls`. Content region has `role="region"` (or native `<details>`/`<summary>`).

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter / Space | Toggle section |
| Arrow Down | Next accordion header |
| Arrow Up | Previous accordion header |
| Home | First accordion header |
| End | Last accordion header |

**Web Example:**
```html
<div class="accordion">
  <h3><button aria-expanded="true" aria-controls="sect1">Section 1</button></h3>
  <div id="sect1" role="region" aria-labelledby="sect1-btn">Content 1</div>
  <h3><button aria-expanded="false" aria-controls="sect2">Section 2</button></h3>
  <div id="sect2" role="region" aria-labelledby="sect2-btn" hidden>Content 2</div>
</div>
```

---

#### Dialog (Modal)

**Roles/Properties:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (title), `aria-describedby` (description).

**Keyboard:**
| Key | Action |
|-----|--------|
| Tab / Shift+Tab | Cycle focus within dialog (trapped) |
| Escape | Close dialog |

**Focus:** On open: move focus to first focusable element (or dialog itself). On close: return focus to trigger element. Trap focus inside dialog.

**Web Example:**
```html
<div role="dialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-desc">
  <h2 id="dlg-title">Confirm Delete</h2>
  <p id="dlg-desc">This action cannot be undone.</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

**Swift/Apple:**
```swift
.sheet(isPresented: $showDialog) {
    VStack {
        Text("Confirm Delete").font(.headline)
        Text("This action cannot be undone.")
        HStack {
            Button("Cancel") { showDialog = false }
            Button("Delete", role: .destructive) { deleteItem() }
        }
    }
}
```

---

#### Alert

**Roles/Properties:** `role="alert"` (assertive live region). Content announced immediately to screen readers.

**Web Example:**
```html
<div role="alert">Your session will expire in 2 minutes.</div>
```

**Swift/Apple:**
```swift
.accessibilityAnnouncement("Your session will expire in 2 minutes.")
// Or: UIAccessibility.post(notification: .announcement, argument: "Session expiring")
```

---

#### Alert Dialog

**Roles/Properties:** `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`. Combines alert urgency with dialog interaction.

**Keyboard:** Same as Dialog -- Tab cycles within, Escape closes.

**Focus:** On open, focus moves to the least destructive action button (e.g., Cancel).

---

#### Menu Button

**Roles/Properties:** Trigger: `<button>` with `aria-haspopup="true"`, `aria-expanded`. Menu: `role="menu"`, items: `role="menuitem"`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter / Space / Arrow Down | Open menu, focus first item |
| Arrow Up | Open menu, focus last item |
| Arrow Down/Up (in menu) | Navigate items |
| Enter / Space (in menu) | Activate item |
| Escape | Close menu, return focus to button |

---

#### Toolbar

**Roles/Properties:** `role="toolbar"`, `aria-label` or `aria-labelledby`. Contains buttons, toggles, or other controls.

**Keyboard:**
| Key | Action |
|-----|--------|
| Tab | Move focus to/from toolbar (single Tab stop) |
| Arrow Left/Right | Move between controls within toolbar |
| Home / End | First/last control |

**Focus:** Roving tabindex within toolbar.

---

#### Tooltip

**Roles/Properties:** `role="tooltip"` on tooltip element, `aria-describedby` on trigger pointing to tooltip ID.

**Keyboard:**
| Key | Action |
|-----|--------|
| Escape | Dismiss tooltip |
| (Focus) | Show tooltip on focus |
| (Hover) | Show tooltip on hover |

**Important:** Tooltips must be hoverable (user can mouse over tooltip content) and persistent (stay visible until trigger loses hover/focus or Escape pressed) per WCAG 1.4.13.

---

#### Breadcrumb

**Roles/Properties:** `<nav aria-label="Breadcrumb">`, `<ol>` list structure, current page uses `aria-current="page"`.

**Web Example:**
```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/products/shoes" aria-current="page">Shoes</a></li>
  </ol>
</nav>
```

---

#### Meter

**Roles/Properties:** Native `<meter>` or `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`.

**Web Example:**
```html
<label for="disk">Disk usage:</label>
<meter id="disk" min="0" max="100" value="72" aria-label="Disk usage: 72%">72%</meter>
```

**Swift/Apple:**
```swift
Gauge(value: diskUsage, in: 0...100) {
    Text("Disk usage")
} currentValueLabel: {
    Text("\(Int(diskUsage))%")
}
```

---

<!-- TIER: comprehensive -->

### Tier 3 -- Complex (14 patterns)

Advanced interactive patterns. Load only when building these specific component types.

---

#### Combobox

**Roles/Properties:** `role="combobox"` on input, `aria-expanded`, `aria-controls` (listbox), `aria-activedescendant`, `aria-autocomplete`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Down | Open listbox / move to next option |
| Arrow Up | Move to previous option |
| Enter | Select highlighted option |
| Escape | Close listbox, clear or revert |
| Type characters | Filter list (autocomplete) |

**Focus:** Focus stays on input; `aria-activedescendant` tracks visual highlight in listbox.

---

#### Tree View

**Roles/Properties:** `role="tree"` on container, `role="treeitem"` on items, `aria-expanded` on parent nodes, `aria-level`, `aria-setsize`, `aria-posinset`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Down | Next visible treeitem |
| Arrow Up | Previous visible treeitem |
| Arrow Right | Expand closed node / move to first child |
| Arrow Left | Collapse open node / move to parent |
| Home / End | First / last visible item |
| Enter | Activate item |
| * | Expand all siblings |

---

#### Treegrid

**Roles/Properties:** Combines tree and grid. `role="treegrid"`, rows with `role="row"`, cells with `role="gridcell"`. Supports both tree navigation (expand/collapse) and grid navigation (cell-to-cell).

**Keyboard:** Tree navigation for rows + Arrow Left/Right for cell navigation within rows.

---

#### Grid

**Roles/Properties:** `role="grid"`, `role="row"`, `role="gridcell"` (or `role="columnheader"`/`role="rowheader"`).

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow keys | Navigate between cells |
| Home / End | First / last cell in row |
| Ctrl+Home / Ctrl+End | First / last cell in grid |
| Page Up / Page Down | Scroll by visible rows |

**Focus:** Cell-level focus with `aria-activedescendant` or roving tabindex.

---

#### Listbox

**Roles/Properties:** `role="listbox"`, `role="option"`, `aria-selected`, `aria-multiselectable` (if applicable).

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Down/Up | Move highlight |
| Space | Toggle selection (multiselect) |
| Shift+Arrow | Extend selection |
| Ctrl+A | Select all (multiselect) |
| Home / End | First / last option |
| Type character | Jump to matching option |

---

#### Menu / Menubar

**Roles/Properties:** `role="menubar"` (horizontal), `role="menu"` (dropdown), `role="menuitem"`, `role="menuitemcheckbox"`, `role="menuitemradio"`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Right/Left | Next/previous menubar item |
| Arrow Down | Open submenu / next item in submenu |
| Arrow Up | Previous item in submenu |
| Enter / Space | Activate item |
| Escape | Close submenu, focus parent |

---

#### Carousel

**Roles/Properties:** Container with `role="group"` or `role="region"`, `aria-roledescription="carousel"`, `aria-label`. Slides: `role="group"`, `aria-roledescription="slide"`, `aria-label="N of M"`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Left/Right or Previous/Next buttons | Navigate slides |
| Tab | Move to carousel controls |

**Important:** Must have pause control per WCAG 2.2.2. Auto-rotation pauses on hover/focus.

---

#### Feed

**Roles/Properties:** `role="feed"`, articles with `role="article"`, `aria-setsize`, `aria-posinset`, `aria-label`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Page Down | Next article |
| Page Up | Previous article |

**Focus:** Focus management as new content loads. Announce new content count via live region.

---

#### Slider

**Roles/Properties:** `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` (human-readable value), `aria-label`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Right/Up | Increase by step |
| Arrow Left/Down | Decrease by step |
| Page Up / Page Down | Increase/decrease by large step |
| Home / End | Set to min / max |

**Swift/Apple:**
```swift
Slider(value: $volume, in: 0...100, step: 1) {
    Text("Volume")
} minimumValueLabel: { Text("0") }
  maximumValueLabel: { Text("100") }
```

---

#### Multi-Thumb Slider

**Roles/Properties:** Two `role="slider"` elements within a group. Each thumb has independent `aria-valuenow`, constrained so min thumb cannot exceed max thumb.

**Keyboard:** Same as Slider per thumb. Tab moves between thumbs.

---

#### Spinbutton

**Roles/Properties:** `role="spinbutton"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Up | Increment |
| Arrow Down | Decrement |
| Page Up / Page Down | Large increment/decrement |
| Home / End | Min / max value |

---

#### Table

**Roles/Properties:** Native `<table>`, `<th>` with `scope="col"` or `scope="row"`, `<caption>`. For sortable: `aria-sort="ascending|descending|none"` on header cells.

**Web Example:**
```html
<table>
  <caption>User accounts</caption>
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">Name</th>
      <th scope="col">Email</th>
      <th scope="col">Role</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>alice@example.com</td><td>Admin</td></tr>
  </tbody>
</table>
```

---

#### Window Splitter

**Roles/Properties:** `role="separator"` with `aria-valuenow` (position), `aria-valuemin`, `aria-valuemax`, `aria-orientation`, `tabindex="0"`.

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Left/Right (horizontal) | Move splitter |
| Arrow Up/Down (vertical) | Move splitter |
| Home | Collapse to minimum |
| End | Expand to maximum |
| Enter | Toggle between current and previous position |

---

#### Landmarks

**Roles/Properties:** Structure the page into navigable regions.

| Landmark | HTML Element | ARIA Role |
|----------|-------------|-----------|
| Banner | `<header>` (top-level) | `role="banner"` |
| Navigation | `<nav>` | `role="navigation"` |
| Main | `<main>` | `role="main"` |
| Complementary | `<aside>` | `role="complementary"` |
| Content Info | `<footer>` (top-level) | `role="contentinfo"` |
| Search | `<search>` (HTML5.2+) | `role="search"` |
| Form | `<form>` (with accessible name) | `role="form"` |
| Region | `<section>` (with accessible name) | `role="region"` |

**Best practice:** Every page should have at minimum: banner, navigation, main, contentinfo. Label duplicate landmarks with `aria-label` (e.g., `<nav aria-label="Primary">`, `<nav aria-label="Footer">`).

**Swift/Apple:**
```swift
NavigationSplitView {
    // Sidebar (navigation landmark equivalent)
} detail: {
    // Main content
}
.accessibilityElement(children: .contain)
```

---

## Keyboard Shortcut Design Guidelines

### Conventions

| Modifier Pattern | Usage |
|-----------------|-------|
| No modifier | Only for single-key shortcuts scoped to focused component (e.g., arrow keys in listbox) |
| Ctrl/Cmd + key | Primary actions (Ctrl+S save, Ctrl+Z undo) |
| Ctrl/Cmd + Shift + key | Alternate/inverse actions (Ctrl+Shift+Z redo) |
| Alt/Option + key | Menu/toolbar access; avoid for actions due to screen reader conflicts |

### Conflict Detection Rules

1. Never override browser/OS shortcuts (Ctrl+T, Ctrl+W, Ctrl+L, Cmd+Q)
2. Never override screen reader shortcuts (Insert+key for JAWS/NVDA, VO+key for VoiceOver)
3. Single-character shortcuts must be disableable or remappable (WCAG 2.1.4)
4. Document all shortcuts in accessible help dialog (Shift+? convention)
5. Test with screen readers active -- some key combos are consumed by AT

### Modifier Key Usage Across Platforms

| Action | Web (Windows) | Web (macOS) | SwiftUI (macOS) |
|--------|--------------|-------------|-----------------|
| Save | Ctrl+S | Cmd+S | `.keyboardShortcut("s")` |
| Undo | Ctrl+Z | Cmd+Z | `.keyboardShortcut("z")` |
| Redo | Ctrl+Y / Ctrl+Shift+Z | Cmd+Shift+Z | `.keyboardShortcut("z", modifiers: .shift)` |
| Find | Ctrl+F | Cmd+F | `.keyboardShortcut("f")` |

---

## Screen Reader Testing Checklist

### Per-Component Checklist

**Tier 1 Components:**

| Component | VoiceOver Should Announce | NVDA/JAWS Should Announce |
|-----------|--------------------------|---------------------------|
| Button | Role + label + state (pressed/expanded) | Same |
| Link | "Link" + text | Same |
| Checkbox | Label + "checkbox" + checked/unchecked | Same |
| Switch | Label + "switch" + on/off | Same |
| Radio Group | Label + "radio button" + selected + position | Same |
| Disclosure | Label + "button" + expanded/collapsed | Same |

**Tier 2 Components:**

| Component | Announce on Focus | Announce on State Change |
|-----------|-------------------|--------------------------|
| Tab | Tab label + "tab" + selected + position (1 of N) | Selected tab change |
| Dialog | Dialog label + first content/description | N/A (focus moves into) |
| Alert | Content immediately (assertive) | N/A |
| Tooltip | Described-by content when trigger focused | N/A |
| Menu Button | Label + "menu button" + expanded/collapsed | Menu opened/closed |

### VoiceOver vs NVDA Differences

| Behavior | VoiceOver (macOS/iOS) | NVDA (Windows) |
|----------|----------------------|----------------|
| Navigation mode | VO cursor (VO+arrows) | Browse mode (arrows) vs Focus mode (Tab) |
| Toggle forms mode | Automatic in web | Insert+Space to toggle |
| Live region | Speaks immediately | May queue behind current speech |
| Table navigation | VO+arrows | Ctrl+Alt+arrows |
| Heading navigation | VO+Cmd+H | H key in browse mode |

---

## Dark Mode Interaction Patterns

### Focus Rings on Dark Backgrounds

Default browser focus rings (blue outline) often fail contrast on dark backgrounds.

**Recommended approach:**
```css
:focus-visible {
  outline: 2px solid oklch(0.85 0.18 90); /* high-visibility yellow */
  outline-offset: 2px;
}

@media (prefers-color-scheme: dark) {
  :focus-visible {
    outline-color: oklch(0.90 0.15 90); /* slightly brighter for dark bg */
  }
}
```

### Interactive State Contrast

| State | Light Mode | Dark Mode | Min Contrast |
|-------|-----------|-----------|-------------|
| Default | Border on white | Border on dark gray | 3:1 (non-text) |
| Hover | Background shift | Lightness increase | Distinguishable from default |
| Active/Pressed | Darker background | Lighter surface | Distinguishable from hover |
| Disabled | Reduced opacity | Reduced opacity | Not required but should be visible |
| Selected | Brand color background | Brand color (adjusted lightness) | 3:1 against surrounding |

### Shadow and Transparency in Dark Mode

- Box shadows invisible on dark backgrounds -- use border or surface lightness instead
- Backdrop blur/frosted glass: increase opacity in dark mode (0.6 minimum vs 0.4 light mode)
- Elevation = lightness in dark mode (Material Design 3 pattern): surface+1, surface+2, surface+3 get progressively lighter

**Swift/Apple:**
```swift
// System materials auto-adapt to dark mode
.background(.ultraThinMaterial) // frosted glass, adapts automatically
.background(Color(.systemBackground)) // adapts to dark mode
```

---

## Anti-Patterns

### Critical Anti-Patterns (Never Do)

| Anti-Pattern | Why It Fails | Fix |
|-------------|-------------|-----|
| `<div onclick>` without role/tabindex | Not keyboard accessible, no AT announcement | Use `<button>` or add `role="button" tabindex="0"` + keydown handler |
| `tabindex > 0` | Forces unnatural tab order, maintenance nightmare | Use `tabindex="0"` and manage focus via DOM order |
| `aria-label` on non-interactive `<div>` | Most AT ignores aria-label on generic elements | Use `aria-label` only on interactive elements or landmarks |
| `role="presentation"` on interactive elements | Removes element from accessibility tree | Never use on focusable/interactive elements |
| `aria-hidden="true"` on focusable elements | Element focusable but invisible to AT -- "ghost focus" | Remove from tab order if hiding, or don't hide |
| Disabling zoom: `maximum-scale=1` | Prevents users who need magnification | Remove viewport zoom restrictions |
| `outline: none` without replacement | Removes keyboard focus visibility | Always provide `:focus-visible` alternative style |

### Subtle Anti-Patterns (Common Mistakes)

| Anti-Pattern | Issue | Better Approach |
|-------------|-------|-----------------|
| Aria-label overriding visible text | Screen reader says different text than visible | Use `aria-labelledby` pointing to visible text |
| `aria-live="assertive"` on non-urgent updates | Interrupts screen reader constantly | Use `aria-live="polite"` for most status messages |
| Focus management on SPA route change | New page content not announced | Move focus to `<h1>` or main content on route change; use `aria-live` region for page title |
| Auto-playing carousels | Fails 2.2.2, distracting, cognitive load | Default to paused; respect `prefers-reduced-motion` |
| Tooltip on hover only | Keyboard users cannot access | Show on focus AND hover; make tooltip hoverable |

---

## Citations

- [W3C ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) -- Pattern specs, keyboard interaction, examples
- [W3C ARIA 1.2 Specification](https://www.w3.org/TR/wai-aria-1.2/) -- Roles, states, properties definitions
- [MDN ARIA Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA) -- Browser support, usage guidance
- [Apple Accessibility for Developers](https://developer.apple.com/accessibility/) -- SwiftUI and UIKit accessibility APIs
- [Apple Human Interface Guidelines - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) -- Platform-specific guidance
- [Deque University ARIA Patterns](https://dequeuniversity.com/) -- Testing guidance and best practices
- [WebAIM Screen Reader Survey](https://webaim.org/projects/screenreadersurvey/) -- Usage statistics and AT behavior differences

---

*Reference: interaction-patterns.md v1.0*
*Ownership: HIG (exclusive)*
*Last updated: 2026-03-10*
