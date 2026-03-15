# WCAG 2.2 Baseline Reference Library

> Curated WCAG 2.2 Level A and AA success criteria with techniques and quick-check rules for the `/pde:hig` skill.
> Loaded via `@` reference from `hig.md` using tiered depth selection.
>
> **Version:** 1.0
> **Scope:** All WCAG 2.2 Level A and AA success criteria (~56 criteria)
> **Ownership:** HIG (exclusive)
> **Boundary:** This file owns all WCAG compliance content. The critique skill defers to this via HIG skill. Dark mode audit methodology lives here. Color palette generation belongs in `color-systems.md`.

---

<!-- TIER: essentials -->

## Quick Reference: WCAG 2.2 Changes

**Added in WCAG 2.2** (6 criteria at A/AA):
- 2.4.11 Focus Not Obscured (Minimum) [AA]
- 2.5.7 Dragging Movements [AA]
- 2.5.8 Target Size (Minimum) [AA]
- 3.2.6 Consistent Help [A]
- 3.3.7 Redundant Entry [A]
- 3.3.8 Accessible Authentication (Minimum) [AA]

**Removed in WCAG 2.2:** 4.1.1 Parsing (obsolete -- modern HTML parsers handle malformed markup reliably)

## POUR Principles Overview

| Principle | A Criteria | AA Criteria | Total |
|-----------|-----------|-------------|-------|
| Perceivable | 9 | 10 | 19 |
| Operable | 12 | 10 | 22 |
| Understandable | 6 | 7 | 13 |
| Robust | 1 | 1 | 2 |
| **Total** | **28** | **28** | **~56** |

---

## 1. Perceivable

Information and user interface components must be presentable to users in ways they can perceive.

### 1.1 Text Alternatives

**1.1.1 Non-text Content** (Level A)
- **Requirement:** All non-text content has a text alternative serving the equivalent purpose
- **Quick-check:** Every `<img>` has `alt`, every icon-only button has `aria-label`, decorative images use `alt=""`
- **Technique:** Use `alt` for informative images; `alt=""` + `role="presentation"` for decorative
- **Common failure:** Missing alt on functional images (logos linking to home, icon buttons)

**Swift/Apple:** Use `.accessibilityLabel()` on `Image` views. Decorative: `.accessibilityHidden(true)`

### 1.2 Time-based Media

**1.2.1 Audio-only and Video-only (Prerecorded)** (Level A)
- **Requirement:** Provide transcript for audio-only; transcript or audio description for video-only
- **Quick-check:** Does every audio/video-only element have an associated transcript?
- **Technique:** Link transcript directly below media element
- **Common failure:** Auto-generated captions without review

**1.2.2 Captions (Prerecorded)** (Level A)
- **Requirement:** Captions provided for all prerecorded audio in synchronized media
- **Quick-check:** Video player shows CC option; captions include speaker identification and sound effects
- **Technique:** WebVTT captions synced to media timeline
- **Common failure:** Captions missing non-speech sounds (e.g., [door slams])

**1.2.3 Audio Description or Media Alternative (Prerecorded)** (Level A)
- **Requirement:** Audio description or full text alternative for prerecorded video
- **Quick-check:** Is visual-only information narrated or described in an alternative?
- **Technique:** Extended audio description track or full text transcript
- **Common failure:** Relying solely on dialogue when visual content conveys meaning

**1.2.4 Captions (Live)** (Level AA)
- **Requirement:** Captions for all live audio in synchronized media
- **Quick-check:** Live streams have real-time captioning
- **Technique:** CART (Communication Access Realtime Translation) or AI-assisted live captioning
- **Common failure:** No captioning for live events

**1.2.5 Audio Description (Prerecorded)** (Level AA)
- **Requirement:** Audio description for all prerecorded video in synchronized media
- **Quick-check:** Separate audio description track available
- **Technique:** Audio description narrating visual actions during natural pauses
- **Common failure:** Describing only on-screen text, not visual actions

**Swift/Apple:** AVPlayer supports `AVMediaCharacteristic.describesVideoForAccessibility` for audio description tracks.

<!-- TIER: standard -->

### 1.3 Adaptable

**1.3.1 Info and Relationships** (Level A)
- **Requirement:** Information, structure, and relationships conveyed through presentation are programmatically determinable
- **Quick-check:** Headings use `<h1>`-`<h6>`, lists use `<ul>/<ol>`, tables use `<th>`, form fields have `<label>`
- **Technique:** Semantic HTML elements; ARIA landmarks for page regions
- **Common failure:** Using visual styling (bold, size) for structure without semantic markup

**1.3.2 Meaningful Sequence** (Level A)
- **Requirement:** Reading/navigation order preserves meaning when CSS is disabled
- **Quick-check:** Disable CSS -- does content still make logical sense in DOM order?
- **Technique:** Source order matches visual presentation order
- **Common failure:** CSS Grid/Flexbox `order` property creating visual order that differs from DOM

**1.3.3 Sensory Characteristics** (Level A)
- **Requirement:** Instructions don't rely solely on shape, color, size, visual location, or sound
- **Quick-check:** Can a screen reader user follow all instructions?
- **Technique:** "Click the Submit button (below the form)" not "Click the green button"
- **Common failure:** "See the red warning above" without programmatic association

**1.3.4 Orientation** (Level AA)
- **Requirement:** Content not restricted to single display orientation unless essential
- **Quick-check:** Rotate device -- does content adapt? No forced landscape/portrait?
- **Technique:** Avoid `orientation: portrait` in CSS unless essential (e.g., piano app)
- **Common failure:** Locking orientation without essential justification

**1.3.5 Identify Input Purpose** (Level AA)
- **Requirement:** Input fields collecting personal info have programmatically determinable purpose
- **Quick-check:** Form fields use `autocomplete` attribute (e.g., `autocomplete="email"`)
- **Technique:** HTML `autocomplete` tokens for name, address, phone, email, etc.
- **Common failure:** Missing `autocomplete` on checkout/registration forms

**Swift/Apple:** Use `.textContentType()` modifier (e.g., `.textContentType(.emailAddress)`) for autofill support.

### 1.4 Distinguishable

**1.4.1 Use of Color** (Level A)
- **Requirement:** Color is not the only visual means of conveying information
- **Quick-check:** Grayscale test -- is all information still distinguishable?
- **Technique:** Combine color with icons, patterns, text labels, or underlines
- **Common failure:** Red/green-only error/success indicators without icons or text

**1.4.2 Audio Control** (Level A)
- **Requirement:** Auto-playing audio lasting > 3 seconds can be paused, stopped, or volume controlled
- **Quick-check:** Does any audio auto-play? Is there a visible control?
- **Technique:** Provide pause/mute button; prefer user-initiated playback
- **Common failure:** Background music/video with no controls

**1.4.3 Contrast (Minimum)** (Level AA)
- **Requirement:** Text contrast ratio at least 4.5:1 (normal text) or 3:1 (large text: 18pt+/14pt bold+)
- **Quick-check:** Check foreground/background color pairs using WCAG contrast formula
- **Technique:** Use OKLCH lightness calculations; test both light and dark modes
- **Common failure:** Light gray text on white backgrounds; placeholder text with insufficient contrast

**1.4.4 Resize Text** (Level AA)
- **Requirement:** Text resizable up to 200% without loss of content or functionality
- **Quick-check:** Zoom browser to 200% -- does content reflow? No horizontal scroll for single-column?
- **Technique:** Use relative units (`rem`, `em`, `%`), avoid fixed pixel heights for text containers
- **Common failure:** Fixed-height containers causing text overflow/clipping at 200%

**1.4.5 Images of Text** (Level AA)
- **Requirement:** Text is used instead of images of text (with exceptions for logos and customizable)
- **Quick-check:** Is any text rendered as an image that could be real text?
- **Technique:** Use web fonts, CSS styling instead of text images
- **Common failure:** Hero banners with text baked into images

**1.4.10 Reflow** (Level AA)
- **Requirement:** Content reflows at 320px width (400% zoom) without two-dimensional scrolling
- **Quick-check:** Set viewport to 320px -- does content reflow to single column? No horizontal scroll?
- **Technique:** Responsive design with CSS media/container queries; avoid fixed-width layouts
- **Common failure:** Data tables, code blocks, or images causing horizontal scroll

**1.4.11 Non-text Contrast** (Level AA)
- **Requirement:** UI components and graphical objects have at least 3:1 contrast against adjacent colors
- **Quick-check:** Check borders, icons, focus rings, chart elements against their backgrounds
- **Technique:** Ensure form field borders, custom checkboxes, and chart data points meet 3:1
- **Common failure:** Light border on input fields; low-contrast custom toggle switches

**1.4.12 Text Spacing** (Level AA)
- **Requirement:** No loss of content when user overrides: line height 1.5x, paragraph spacing 2x, letter spacing 0.12em, word spacing 0.16em
- **Quick-check:** Apply text spacing overrides via bookmarklet -- does content still display correctly?
- **Technique:** Avoid fixed heights on text containers; use CSS that accommodates spacing changes
- **Common failure:** Text clipped or overlapping when spacing is increased

**1.4.13 Content on Hover or Focus** (Level AA)
- **Requirement:** Hover/focus-triggered content is dismissible, hoverable, and persistent
- **Quick-check:** Can the tooltip be dismissed without moving pointer? Can you hover over the tooltip content? Does it stay until dismissed or trigger is removed?
- **Technique:** Tooltips stay visible when moused over; Esc key dismisses; persist until trigger loses hover/focus
- **Common failure:** Tooltips that disappear when trying to read them; no keyboard dismiss

**Swift/Apple:** Dynamic Type handles text resizing automatically. Use `.minimumScaleFactor()` cautiously. Test with Accessibility Inspector contrast checker.

---

## 2. Operable

User interface components and navigation must be operable.

### 2.1 Keyboard Accessible

**2.1.1 Keyboard** (Level A)
- **Requirement:** All functionality available via keyboard (except path-dependent input like freehand drawing)
- **Quick-check:** Tab through entire page -- can every interactive element be reached and activated?
- **Technique:** Use native interactive elements (`<button>`, `<a>`, `<input>`); add `tabindex="0"` + key handlers for custom widgets
- **Common failure:** Click-only interactions on `<div>` or `<span>` elements

**2.1.2 No Keyboard Trap** (Level A)
- **Requirement:** Keyboard focus can be moved away from any component using standard navigation
- **Quick-check:** Can you Tab/Shift+Tab out of every component? Are modal focus traps properly managed?
- **Technique:** Modal dialogs should trap focus but release on close; no infinite Tab loops
- **Common failure:** Custom modals or widgets that trap focus permanently

**2.1.4 Character Key Shortcuts** (Level A)
- **Requirement:** Single-character shortcuts can be turned off, remapped, or only active when component is focused
- **Quick-check:** Are there any single-key shortcuts (e.g., "s" for search)? Can they be disabled?
- **Technique:** Use modifier keys (Ctrl/Cmd + key) or scope shortcuts to focused components
- **Common failure:** Gmail-style single-key shortcuts without disable option

**Swift/Apple:** Use `.keyboardShortcut()` modifier with proper modifier keys. VoiceOver provides keyboard navigation automatically for standard SwiftUI controls.

### 2.2 Enough Time

**2.2.1 Timing Adjustable** (Level A)
- **Requirement:** Time limits can be turned off, adjusted (10x minimum), or extended (with 20-second warning)
- **Quick-check:** Does any content have a time limit? Can users extend it?
- **Technique:** Provide "extend time" option before session timeout; warn 20+ seconds before
- **Common failure:** Auto-logout without warning; timed quizzes without extension option

**2.2.2 Pause, Stop, Hide** (Level A)
- **Requirement:** Moving, blinking, scrolling, or auto-updating content can be paused, stopped, or hidden
- **Quick-check:** Any carousels, auto-scrolling, or live feeds? Can they be paused?
- **Technique:** Visible pause control on carousels; `prefers-reduced-motion` media query
- **Common failure:** Auto-advancing carousels without pause; infinite scroll with no stop

### 2.3 Seizures and Physical Reactions

**2.3.1 Three Flashes or Below Threshold** (Level A)
- **Requirement:** No content flashes more than 3 times per second (or is below general/red flash thresholds)
- **Quick-check:** Any animations, videos, or transitions that flash rapidly?
- **Technique:** Keep flash rate below 3/sec; respect `prefers-reduced-motion`; avoid large red flashes
- **Common failure:** Video content with strobe effects; aggressive loading animations

### 2.4 Navigable

**2.4.1 Bypass Blocks** (Level A)
- **Requirement:** Mechanism to bypass repeated navigation blocks
- **Quick-check:** Is there a "Skip to main content" link? ARIA landmarks defined?
- **Technique:** Skip link as first focusable element; `<main>`, `<nav>`, `<aside>` landmarks
- **Common failure:** No skip link; missing landmark roles

**2.4.2 Page Titled** (Level A)
- **Requirement:** Web pages have descriptive titles
- **Quick-check:** Does `<title>` describe the page purpose? Unique across pages?
- **Technique:** Pattern: "Page Name - Section - Site Name"
- **Common failure:** Generic "Untitled" or same title on every page

**2.4.3 Focus Order** (Level A)
- **Requirement:** Focus order preserves meaning and operability
- **Quick-check:** Tab through page -- does focus follow logical reading order?
- **Technique:** Source order matches visual order; avoid `tabindex > 0`
- **Common failure:** CSS visual reordering creating confusing Tab sequence

**2.4.4 Link Purpose (In Context)** (Level A)
- **Requirement:** Link purpose determinable from link text or link + programmatic context
- **Quick-check:** Do links make sense out of context? No "click here" or "read more" without context?
- **Technique:** Descriptive link text; `aria-describedby` if contextual
- **Common failure:** Multiple "Read more" links without distinguishing context

**2.4.5 Multiple Ways** (Level AA)
- **Requirement:** More than one way to locate a page within a set of pages
- **Quick-check:** Navigation menu + site search or sitemap available?
- **Technique:** Provide navigation, search, and/or sitemap
- **Common failure:** Single-path navigation with no search

**2.4.6 Headings and Labels** (Level AA)
- **Requirement:** Headings and labels describe topic or purpose
- **Quick-check:** Do headings accurately describe their sections? Do form labels describe the expected input?
- **Technique:** Descriptive, specific headings; labels matching the expected input
- **Common failure:** Generic headings ("Section 1"); placeholder-only form fields

**2.4.7 Focus Visible** (Level AA)
- **Requirement:** Keyboard focus indicator is visible
- **Quick-check:** Tab through page -- can you always see which element is focused?
- **Technique:** Custom `:focus-visible` styles with sufficient contrast; outline offset for clarity
- **Common failure:** `outline: none` without replacement focus style

**2.4.11 Focus Not Obscured (Minimum)** (Level AA) [NEW IN 2.2]
- **Requirement:** When a component receives focus, it is not entirely hidden by author-created content (sticky headers, footers, banners)
- **Quick-check:** Tab through page with sticky headers/footers -- is the focused element always at least partially visible?
- **Technique:** `scroll-padding-top` / `scroll-margin-top` accounting for sticky element height; adjust on focus events
- **Common failure:** Sticky navigation bar covering focused elements below it; cookie banners obscuring focused content

**Swift/Apple:** Focus visibility is automatic with VoiceOver cursor. For keyboard navigation, ensure `.focusable()` modifier on custom views. Use `.focusEffect()` for custom focus rings.

### 2.5 Input Modalities

**2.5.1 Pointer Gestures** (Level A)
- **Requirement:** Multi-point or path-based gestures have single-pointer alternatives
- **Quick-check:** Can pinch-zoom be done with +/- buttons? Can swipe be done with arrows?
- **Technique:** Provide button alternatives for all gesture-based actions
- **Common failure:** Map zoom only via pinch; carousel only via swipe

**2.5.2 Pointer Cancellation** (Level A)
- **Requirement:** Functions triggered by pointer: no down-event trigger, can abort/undo, up-event reverses
- **Quick-check:** Does clicking down and dragging away cancel the action?
- **Technique:** Trigger on `mouseup`/`click`, not `mousedown`; allow drag-off to cancel
- **Common failure:** Actions firing on mousedown with no cancel mechanism

**2.5.3 Label in Name** (Level A)
- **Requirement:** UI components with visible text labels have accessible names containing that text
- **Quick-check:** Does the `aria-label` or accessible name include the visible label text?
- **Technique:** Accessible name should start with or contain the visible label
- **Common failure:** `aria-label="Submit form data"` on button labeled "Submit"

**2.5.4 Motion Actuation** (Level A)
- **Requirement:** Functions triggered by device/user motion have UI alternatives and can be disabled
- **Quick-check:** Any shake-to-undo or tilt features? Do they have button alternatives?
- **Technique:** Provide UI control alongside motion trigger; respect device motion settings
- **Common failure:** Shake-to-undo without visible undo button

**2.5.7 Dragging Movements** (Level AA) [NEW IN 2.2]
- **Requirement:** Functionality using dragging can be achieved with a single pointer without dragging
- **Quick-check:** Can drag-and-drop be done with click-to-select then click-to-place? Are move-up/down buttons available?
- **Technique:** Provide arrow buttons or click-based reordering alongside drag; use `aria-grabbed` + keyboard controls
- **Common failure:** Sortable lists or kanban boards with drag-only reordering

**2.5.8 Target Size (Minimum)** (Level AA) [NEW IN 2.2]
- **Requirement:** Interactive targets are at least 24x24 CSS pixels, with exceptions for inline text links, user agent controls, and essential presentations
- **Quick-check:** Measure interactive element sizes -- do any fall below 24x24px? Is there at least 24px spacing between undersized targets?
- **Technique:** `min-width: 24px; min-height: 24px` on interactive elements; use padding to expand touch targets
- **Common failure:** Small icon buttons (16x16); tightly packed action icons in toolbars

**Swift/Apple:** Default tap targets in iOS are 44x44pt (exceeds 24px minimum). Use `.contentShape(Rectangle())` to expand tap areas on custom views.

---

## 3. Understandable

Information and operation of the user interface must be understandable.

### 3.1 Readable

**3.1.1 Language of Page** (Level A)
- **Requirement:** Default human language of the page is programmatically determinable
- **Quick-check:** Does `<html>` have a valid `lang` attribute?
- **Technique:** `<html lang="en">` or appropriate BCP 47 language tag
- **Common failure:** Missing `lang` attribute; wrong language code

**3.1.2 Language of Parts** (Level AA)
- **Requirement:** Language of passages or phrases in a different language is programmatically determinable
- **Quick-check:** Are foreign-language quotes or phrases marked with `lang` attribute?
- **Technique:** `<span lang="fr">Bonjour</span>` for inline language changes
- **Common failure:** Embedded foreign text without language annotation

**Swift/Apple:** Set `.accessibilityLanguage()` on views containing non-default language content.

### 3.2 Predictable

**3.2.1 On Focus** (Level A)
- **Requirement:** Receiving focus does not trigger a change of context
- **Quick-check:** Does focusing any element cause navigation, form submission, or new window?
- **Technique:** Focus only updates visual state; actions require explicit activation
- **Common failure:** Select menus that navigate on focus

**3.2.2 On Input** (Level A)
- **Requirement:** Changing a UI component setting does not automatically trigger a context change unless user is warned
- **Quick-check:** Do form controls auto-submit or auto-navigate on change?
- **Technique:** Use explicit submit buttons; warn if auto-behavior exists
- **Common failure:** Country dropdown auto-submitting form; checkbox auto-navigating

**3.2.3 Consistent Navigation** (Level AA)
- **Requirement:** Navigation repeated across pages occurs in the same relative order
- **Quick-check:** Is the main nav in the same position/order on every page?
- **Technique:** Consistent header/nav/footer layout across all pages
- **Common failure:** Navigation items reordering between pages

**3.2.4 Consistent Identification** (Level AA)
- **Requirement:** Components with the same functionality are identified consistently
- **Quick-check:** Is the search icon always labeled "Search"? Is the submit button always "Submit"?
- **Technique:** Same labels, icons, and patterns for same functions across pages
- **Common failure:** "Search" on one page, "Find" on another for the same function

**3.2.6 Consistent Help** (Level A) [NEW IN 2.2]
- **Requirement:** Help mechanisms (contact info, self-help options, chatbot) appear in the same relative order across pages
- **Quick-check:** Is the help/support link in the same position on every page? Does the help section order stay consistent?
- **Technique:** Place help links in consistent footer or header position; maintain same ordering of help options
- **Common failure:** Help link in header on some pages, footer on others; chat widget appearing inconsistently

### 3.3 Input Assistance

**3.3.1 Error Identification** (Level A)
- **Requirement:** Input errors are automatically detected and described in text
- **Quick-check:** Do form errors identify the specific field and describe the error?
- **Technique:** Inline error messages linked via `aria-describedby`; error summary at form top
- **Common failure:** Red border only without text explanation; generic "Form has errors"

**3.3.2 Labels or Instructions** (Level A)
- **Requirement:** Labels or instructions provided when content requires user input
- **Quick-check:** Does every input have a visible label? Are format requirements stated?
- **Technique:** `<label for="...">` associated with inputs; format hints in label or `aria-describedby`
- **Common failure:** Placeholder-only inputs (placeholder disappears on focus)

**3.3.3 Error Suggestion** (Level AA)
- **Requirement:** If an error is detected and suggestions are known, provide them (unless it compromises security)
- **Quick-check:** Do error messages suggest how to fix the problem?
- **Technique:** "Email must be in format: name@example.com" not "Invalid email"
- **Common failure:** "Invalid input" without correction guidance

**3.3.4 Error Prevention (Legal, Financial, Data)** (Level AA)
- **Requirement:** For legal/financial/test submissions: reversible, checkable, or confirmable
- **Quick-check:** Can users review before final submission? Is there an undo/cancel option?
- **Technique:** Confirmation page before submission; edit capability; time-limited reversal
- **Common failure:** One-click purchase with no confirmation or undo

**3.3.7 Redundant Entry** (Level A) [NEW IN 2.2]
- **Requirement:** Information previously entered by or provided to the user is auto-populated or available for selection
- **Quick-check:** Is shipping address auto-filled from billing? Is email pre-populated on subsequent forms?
- **Technique:** Auto-populate from previous entries; provide "Same as billing" checkbox; use session storage
- **Common failure:** Requiring re-entry of address, email, or phone across multi-step forms

**3.3.8 Accessible Authentication (Minimum)** (Level AA) [NEW IN 2.2]
- **Requirement:** No cognitive function test (puzzle, transcription, recall) required for authentication, unless an alternative exists, assistance is allowed, or object recognition is used
- **Quick-check:** Does login require CAPTCHAs, memory-based security questions, or puzzle solving? Are alternatives provided?
- **Technique:** Allow password managers (no paste blocking), passkeys/WebAuthn, SMS/email verification, biometric auth; allow copy-paste in auth fields
- **Common failure:** CAPTCHAs without audio/image recognition alternative; blocking password paste; requiring memorized security question answers

**Swift/Apple:** Use `ASWebAuthenticationSession` for web-based auth flows. Support Sign in with Apple for passkey-like authentication. Never block paste in `SecureField`.

---

## 4. Robust

Content must be robust enough to be interpreted by a wide variety of user agents, including assistive technologies.

> **Note:** 4.1.1 Parsing was **removed in WCAG 2.2** -- modern HTML parsers handle malformed markup reliably, making this criterion obsolete.

**4.1.2 Name, Role, Value** (Level A)
- **Requirement:** All UI components have accessible name, role, states, and properties programmatically determinable; notification of changes
- **Quick-check:** Do custom widgets have ARIA roles? Are state changes announced?
- **Technique:** Use native HTML elements where possible; add ARIA roles, states, properties for custom widgets
- **Common failure:** Custom dropdown without `role="listbox"`, `aria-expanded`, `aria-selected`

**4.1.3 Status Messages** (Level AA)
- **Requirement:** Status messages can be programmatically determined through role or properties so assistive technology can present them without receiving focus
- **Quick-check:** Are success/error notifications announced by screen readers? Do loading states communicate?
- **Technique:** Use `role="status"` (polite) or `role="alert"` (assertive) for dynamic messages; `aria-live` regions
- **Common failure:** Toast notifications not announced; "3 results found" not communicated

**Swift/Apple:** Use `.accessibilityAddTraits(.updatesFrequently)` for live-updating content. Post `UIAccessibility.Notification.announcement` for status messages.

<!-- TIER: comprehensive -->

---

## 5. Dark Mode Audit Methodology

Accessibility validation must cover both light and dark color modes.

### Contrast Checks Across Modes

| Check | Light Mode | Dark Mode | Notes |
|-------|-----------|-----------|-------|
| Text on background | 4.5:1 min (normal), 3:1 min (large) | Same ratios | Dark mode often uses slightly off-white text on dark gray -- verify ratio |
| UI component borders | 3:1 against adjacent | Same | Input field borders against dark backgrounds |
| Focus ring visibility | 3:1 against background | 3:1 against dark background | Blue focus rings may fail on dark blue backgrounds |
| Icon contrast | 3:1 against background | Same | Icons may need color adjustment per mode |
| Link differentiation | Underline or 3:1 against surrounding text | Same | Links in dark mode need underline or distinct color |

### Dark Mode Specific Concerns

**Focus Ring Visibility:**
- Default blue focus rings often fail contrast on dark backgrounds
- Use outline colors that contrast with dark surfaces: `oklch(0.85 0.15 250)` or white/yellow outlines
- Test with `outline-offset` to ensure ring doesn't blend with element background

**Shadow and Elevation:**
- Box shadows are invisible on dark backgrounds -- use subtle borders or luminance shifts instead
- Elevation hierarchy must use lightness increases (lighter = higher) not shadow depth
- Frosted glass / backdrop-filter effects need opacity adjustment per mode

**Color-Only Information Encoding:**
- Traffic-light status indicators (red/yellow/green) must work in both modes
- Chart colors must maintain distinguishability in dark mode
- Semantic colors (error red, success green) need dark mode variants with sufficient contrast

**Forced Colors / High Contrast Mode:**
- Test with Windows High Contrast mode (uses system colors, overrides all custom colors)
- Use `@media (forced-colors: active)` to adjust borders and custom indicators
- Transparent borders become visible in forced colors mode -- use as a technique

### Dark Mode Audit Checklist

1. Run all 1.4.x contrast checks in dark mode
2. Verify focus rings visible on dark backgrounds
3. Check shadow/elevation perception
4. Validate color-only indicators across modes
5. Test with forced colors / high contrast mode
6. Verify `prefers-color-scheme` media query is respected
7. Check mode toggle announces to screen readers (`aria-live` or status message)

**Swift/Apple:** SwiftUI automatically adapts system colors to dark mode. Custom colors need both light and dark appearances in Asset Catalog. Test with Accessibility Inspector > Color Contrast Calculator.

---

## 6. Platform-Specific Implementation Summary

### Web

| Category | Primary Technique |
|----------|------------------|
| Structure | Semantic HTML5 elements (`<main>`, `<nav>`, `<header>`, `<aside>`) |
| Labels | `<label for>`, `aria-label`, `aria-labelledby`, `aria-describedby` |
| Keyboard | Native interactive elements; `tabindex="0"` + key handlers for custom |
| Live regions | `aria-live="polite"`, `role="status"`, `role="alert"` |
| Focus management | `:focus-visible`, `focus()`, skip links |
| Color | `prefers-color-scheme`, `prefers-contrast`, `forced-colors` media queries |
| Motion | `prefers-reduced-motion` media query |
| Responsive | Container queries, `clamp()`, viewport-relative units |

### Swift/Apple (SwiftUI)

| Category | Primary Technique |
|----------|------------------|
| Labels | `.accessibilityLabel()`, `.accessibilityHint()`, `.accessibilityValue()` |
| Traits | `.accessibilityAddTraits()` -- `.isButton`, `.isHeader`, `.isLink`, `.isSelected` |
| Grouping | `.accessibilityElement(children: .combine)`, `.accessibilityElement(children: .contain)` |
| Hiding | `.accessibilityHidden(true)` for decorative elements |
| Focus | `@FocusState`, `.focused()`, `AccessibilityFocusState` |
| Dynamic Type | `.font(.body)` system fonts auto-scale; `.dynamicTypeSize()` for limits |
| VoiceOver | `.accessibilityAction()` for custom actions; `.accessibilityRotor()` for custom rotors |
| Announcements | `UIAccessibility.post(notification:argument:)` |
| Color | `Color(.label)` and semantic colors auto-adapt to dark mode |
| Reduce Motion | `@Environment(\.accessibilityReduceMotion)` |

---

## Citations

- [W3C WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/) -- Full success criteria, conformance requirements
- [W3C What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) -- New and removed criteria
- [W3C Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/) -- Intent and techniques per criterion
- [W3C WCAG 2.2 Techniques](https://www.w3.org/WAI/WCAG22/Techniques/) -- Sufficient and advisory techniques
- [Apple Accessibility Programming Guide](https://developer.apple.com/accessibility/) -- SwiftUI and UIKit accessibility APIs
- [MDN ARIA Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA) -- ARIA roles, states, properties

---

*Reference: wcag-baseline.md v1.0*
*Ownership: HIG (exclusive)*
*Last updated: 2026-03-10*
