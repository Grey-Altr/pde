# Design Principles Reference Library

> Universal design principles and heuristic evaluation frameworks for the `/pde:critique` skill.
> Loaded via `@` reference from `critique.md` during perspective evaluation.

---

**Version:** 1.0
**Scope:** Universal design principles and heuristic evaluation frameworks
**Ownership:** CRT (exclusive)
**Boundary:** This file provides evaluation criteria for critique perspectives. It does NOT own WCAG/accessibility content (that belongs to HIG's wcag-baseline.md).

---

## Nielsen's 10 Usability Heuristics

Developed by Jakob Nielsen in 1994. The most widely used heuristic evaluation framework in interaction design.

### H1: Visibility of System Status

**Definition:** The system should always keep users informed about what is going on, through appropriate feedback within reasonable time.

**Audit checklist:**
- [ ] Does the interface show loading states for operations > 1 second?
- [ ] Are progress indicators provided for multi-step processes?
- [ ] Does the system confirm successful actions (save, submit, delete)?
- [ ] Are error states immediately visible when they occur?
- [ ] Is the user's current location clear in the navigation hierarchy?

**Common violations:**
- Silent form submission with no confirmation or error feedback
- File upload with no progress indicator
- Navigation that does not indicate the active page or section

**Industry example:** Gmail displays "Sending..." then "Message sent. Undo." with a timed undo action -- immediate feedback with recovery option (Nielsen Norman Group, 2020).

### H2: Match Between System and the Real World

**Definition:** The system should speak the user's language, using words, phrases, and concepts familiar to the user, rather than system-oriented terms. Follow real-world conventions, making information appear in a natural and logical order.

**Audit checklist:**
- [ ] Does the interface use terminology the target audience understands?
- [ ] Are icons and metaphors consistent with real-world conventions?
- [ ] Is information presented in a logical, expected order?
- [ ] Are units, formats, and conventions appropriate for the locale?

**Common violations:**
- Technical jargon in consumer-facing UI ("Error 500: Internal Server Error")
- Calendar starting on Monday when the locale convention is Sunday
- Using a floppy disk icon for "save" in contexts where users have never seen one

**Industry example:** Airbnb uses "Check in / Check out" instead of "Start Date / End Date" -- matching hospitality language users already know (Airbnb Design, 2019).

### H3: User Control and Freedom

**Definition:** Users often choose system functions by mistake and need a clearly marked "emergency exit" to leave the unwanted state without having to go through an extended process.

**Audit checklist:**
- [ ] Can users undo and redo actions?
- [ ] Are there clear exit paths from modal dialogs and multi-step flows?
- [ ] Can users cancel in-progress operations?
- [ ] Is destructive content (drafts, uploads) recoverable for a reasonable period?

**Common violations:**
- No undo after deleting a list item or record
- Modal dialogs that lack a close button or escape-key dismissal
- Multi-step wizards with no back button

**Industry example:** Google Docs provides unlimited undo history and version history -- users can recover any previous state without anxiety (Google Design, 2021).

### H4: Consistency and Standards

**Definition:** Users should not have to wonder whether different words, situations, or actions mean the same thing. Follow platform conventions.

**Audit checklist:**
- [ ] Are similar actions triggered by the same UI pattern throughout the product?
- [ ] Do interactive elements follow platform conventions (e.g., underlined links on web)?
- [ ] Is visual styling (colors, spacing, typography) consistent across all views?
- [ ] Are label names and terminology used consistently?
- [ ] Do keyboard shortcuts follow platform standards (Cmd+S, Ctrl+Z)?

**Common violations:**
- "Save" in one view, "Submit" in another for the same operation
- Buttons styled inconsistently (ghost in one place, filled in another for same action level)
- Custom scrollbars that break platform scroll behavior

**Industry example:** Apple's Human Interface Guidelines mandate consistent use of system controls across all native apps -- a toggle switch always looks and behaves the same (Apple HIG, 2024).

### H5: Error Prevention

**Definition:** Even better than good error messages is a careful design that prevents a problem from occurring in the first place. Eliminate error-prone conditions or check for them and present users with a confirmation option before they commit to the action.

**Audit checklist:**
- [ ] Are destructive actions guarded by confirmation dialogs?
- [ ] Does form validation happen inline before submission?
- [ ] Are constraints communicated upfront (password requirements, character limits)?
- [ ] Are dangerous options visually distinguished from safe ones?

**Common violations:**
- Allowing form submission with known-invalid data, then showing errors post-submit
- "Delete Account" adjacent to "Log Out" with identical styling
- No autosave on long forms, risking data loss on accidental navigation

**Industry example:** GitHub requires typing the repository name to confirm deletion -- a slip-prevention mechanism that eliminates accidental destructive actions (GitHub Docs, 2023).

### H6: Recognition Rather Than Recall

**Definition:** Minimize the user's memory load by making objects, actions, and options visible. The user should not have to remember information from one part of the interface to another.

**Audit checklist:**
- [ ] Are recently used items, searches, or selections easily accessible?
- [ ] Do dropdown menus show all options rather than requiring typed input?
- [ ] Is contextual help available where complex input is needed?
- [ ] Are related pieces of information co-located rather than spread across views?

**Common violations:**
- Requiring users to remember an ID from one screen to enter on another
- Empty search fields with no recent searches or suggestions
- Complex forms that reference instructions on a separate page

**Industry example:** VS Code shows recently opened files, command palette with fuzzy search, and inline parameter hints -- every feature reduces recall burden (Microsoft, 2023).

### H7: Flexibility and Efficiency of Use

**Definition:** Accelerators -- unseen by the novice user -- may speed up the interaction for the expert user such that the system can cater to both inexperienced and experienced users.

**Audit checklist:**
- [ ] Are keyboard shortcuts available for frequent actions?
- [ ] Can users customize or personalize their workspace?
- [ ] Are there shortcuts (bulk actions, templates, presets) for repetitive tasks?
- [ ] Does the interface support both mouse and keyboard workflows equally?

**Common violations:**
- No keyboard shortcuts for any action
- Requiring five clicks for a frequently performed action with no shortcut
- One-size-fits-all layout with no density or customization options

**Industry example:** Figma offers both menu navigation for beginners and extensive keyboard shortcuts (K for scale, R for rectangle) for power users -- dual access paths for every action (Figma, 2023).

### H8: Aesthetic and Minimalist Design

**Definition:** Interfaces should not contain information that is irrelevant or rarely needed. Every extra unit of information in an interface competes with the relevant units of information and diminishes their relative visibility.

**Audit checklist:**
- [ ] Is every visible element necessary for the current task?
- [ ] Are secondary actions de-emphasized relative to primary actions?
- [ ] Is whitespace used effectively to reduce visual noise?
- [ ] Are progressive disclosure patterns used for advanced options?

**Common violations:**
- Dashboard showing 20+ metrics when users regularly use 3-5
- Equal visual weight given to primary and tertiary actions
- Dense forms showing all optional fields by default

**Industry example:** Stripe's dashboard prioritizes key metrics (balance, recent activity) and uses progressive disclosure for detailed data -- information density matches task frequency (Stripe Design, 2022).

### H9: Help Users Recognize, Diagnose, and Recover from Errors

**Definition:** Error messages should be expressed in plain language (no codes), precisely indicate the problem, and constructively suggest a solution.

**Audit checklist:**
- [ ] Do error messages explain what went wrong in plain language?
- [ ] Do error messages suggest specific corrective action?
- [ ] Are errors visually associated with the relevant input field?
- [ ] Is the error state visually distinct (color, icon, position)?

**Common violations:**
- "An error occurred. Please try again." with no specifics
- Form errors shown only at the top of the page, far from the problematic field
- Error codes without human-readable explanations

**Industry example:** Stripe's API error responses include the error type, a human-readable message, the specific parameter that caused the issue, and a documentation link -- a model for developer-facing error design (Stripe API Docs, 2023).

### H10: Help and Documentation

**Definition:** Even though it is better if the system can be used without documentation, it may be necessary to provide help and documentation. Such information should be easy to search, focused on the user's task, list concrete steps, and not be too large.

**Audit checklist:**
- [ ] Is contextual help available (tooltips, inline hints) for complex features?
- [ ] Is documentation searchable?
- [ ] Are help articles task-oriented rather than feature-oriented?
- [ ] Is onboarding provided for first-time users of complex features?

**Common violations:**
- No tooltips on icon-only buttons
- Help documentation organized by feature name rather than user task
- No onboarding for features requiring specialized knowledge

**Industry example:** Notion provides inline slash-command help, contextual tooltips on every block type, and an interactive onboarding checklist -- layered help from discovery to mastery (Notion, 2023).

---

## Shneiderman's 8 Golden Rules

Formulated by Ben Shneiderman in "Designing the User Interface" (1986, 6th edition 2016). Complementary to Nielsen's heuristics with emphasis on interaction mechanics.

### S1: Strive for Consistency

**Definition:** Consistent sequences of actions should be required in similar situations. Identical terminology should be used in prompts, menus, and help screens. Consistent color, layout, capitalization, and font conventions should be observed throughout.

**Audit checklist:**
- [ ] Are action sequences for similar tasks identical across the application?
- [ ] Is terminology, capitalization, and formatting uniform?
- [ ] Do similar components behave identically regardless of context?
- [ ] Are visual patterns (card layouts, list items) reused consistently?

**Common violations:**
- Date pickers using different formats in different forms
- Navigation patterns changing between sections of the same app
- Inconsistent capitalization (Title Case vs. sentence case) across labels

### S2: Seek Universal Usability

**Definition:** Recognize the needs of diverse users -- novice to expert, young to elderly, varying abilities. Provide shortcuts for frequent users, informative feedback for novice users, and features for users with diverse needs.

**Audit checklist:**
- [ ] Are accelerators provided for expert users?
- [ ] Is the interface usable with assistive technologies?
- [ ] Are text sizes and targets appropriate for diverse motor abilities?
- [ ] Does the interface work across input modalities (mouse, keyboard, touch, voice)?

**Common violations:**
- Touch targets below 44x44px on mobile interfaces
- No keyboard navigation path for any workflow
- Fixed font sizes that cannot be scaled by user preference

### S3: Offer Informative Feedback

**Definition:** For every user action, there should be system feedback. For frequent and minor actions, the response can be modest. For infrequent and major actions, the response should be more substantial.

**Audit checklist:**
- [ ] Do all interactive elements provide visual feedback on hover, focus, and activation?
- [ ] Are state changes (toggle, select, expand) immediately reflected visually?
- [ ] Is feedback proportional to action significance?
- [ ] Are background processes communicated to the user?

**Common violations:**
- Buttons with no hover or active state
- Toggle switches that change state without visual confirmation
- Background sync completing silently with no notification

### S4: Design Dialogs to Yield Closure

**Definition:** Sequences of actions should be organized into groups with a beginning, middle, and end. Informative feedback at the completion of a group of actions gives users the satisfaction of accomplishment, a sense of relief, and a signal to prepare for the next group of actions.

**Audit checklist:**
- [ ] Do multi-step processes show progress and a clear completion state?
- [ ] Are success screens provided after significant workflows (checkout, onboarding)?
- [ ] Is the user guided to their next logical action after completion?
- [ ] Are intermediate save states available in long flows?

**Common violations:**
- Checkout flow that returns to the homepage with no confirmation
- Wizard that ends without summarizing what was configured
- No "next steps" guidance after completing onboarding

### S5: Prevent Errors

**Definition:** Design the system so users cannot make serious errors. If they do, the system should detect the error and offer simple, constructive instructions for recovery.

**Audit checklist:**
- [ ] Are form fields constrained to valid input types (date pickers, numeric inputs)?
- [ ] Are gray-out/disable states used for unavailable actions?
- [ ] Does the system prevent invalid state combinations?
- [ ] Are dangerous zones visually separated from safe zones?

**Common violations:**
- Free-text fields for structured data (phone numbers, dates)
- Clickable buttons that lead to error states because preconditions are not met
- No validation until final submission

### S6: Permit Easy Reversal of Actions

**Definition:** As much as possible, actions should be reversible. This feature relieves anxiety and encourages exploration, since the user knows errors can be undone.

**Audit checklist:**
- [ ] Can single actions be undone (Ctrl/Cmd+Z or undo button)?
- [ ] Can sequences of actions be reversed?
- [ ] Is deleted content recoverable (trash/archive vs. permanent delete)?
- [ ] Are version histories available for edited content?

**Common violations:**
- Permanent deletion with no recovery option
- Form resets that clear all entered data with no way to restore
- Settings changes that take effect immediately with no revert option

### S7: Keep Users in Control

**Definition:** Experienced users strongly desire the sense that they are in charge of the interface and that the interface responds to their actions. Design the system to make users the initiators of actions rather than the responders.

**Audit checklist:**
- [ ] Does the interface respond to user-initiated actions rather than forcing workflows?
- [ ] Can users skip, postpone, or dismiss non-critical system prompts?
- [ ] Are automated actions (auto-save, auto-advance) configurable?
- [ ] Can users override system defaults and suggestions?

**Common violations:**
- Auto-advancing carousels with no pause control
- Forced tutorials that cannot be skipped
- System-initiated popups that interrupt the user's current task

### S8: Reduce Short-Term Memory Load

**Definition:** Humans' limited short-term memory capacity (typically 7 +/- 2 chunks) requires that displays be kept simple, multiple page displays be consolidated, window-motion frequency be reduced, and sufficient training time be allotted for codes, mnemonics, and sequences of actions.

**Audit checklist:**
- [ ] Are navigation menus limited to 7 +/- 2 top-level items?
- [ ] Is context preserved when moving between views (scroll position, selections)?
- [ ] Are comparison tasks supported by side-by-side views rather than sequential views?
- [ ] Are codes and IDs supplemented with human-readable labels?

**Common violations:**
- Navigation with 15+ top-level items
- Losing form state when navigating away and returning
- Requiring users to memorize codes or identifiers across screens

---

## Gestalt Principles of Visual Perception

Foundational perceptual principles from Gestalt psychology (Wertheimer, Koffka, Kohler, early 20th century). Essential for evaluating visual hierarchy, layout composition, and information grouping in UI design.

### Proximity

**Definition:** Elements that are close together are perceived as belonging to the same group. Spatial distance is the strongest grouping cue.

**Visual hierarchy application:** Form labels should be closer to their associated input than to adjacent fields. Related actions should be spatially grouped. Card content should have tighter internal spacing than the gaps between cards.

**Violation indicators:**
- Equal spacing between all elements (no grouping signal)
- Labels equidistant between two fields (ambiguous association)
- Related actions scattered across distant regions of the interface

### Similarity

**Definition:** Elements that share visual characteristics (color, shape, size, texture) are perceived as related or belonging to the same group.

**Visual hierarchy application:** Clickable elements should share visual traits (color, underline) distinct from static text. Status indicators should use consistent color coding. Primary actions should look alike across the interface.

**Violation indicators:**
- Interactive and non-interactive elements styled identically
- Inconsistent color coding for same status across views
- Unrelated elements sharing the same distinctive style

### Continuity

**Definition:** The eye follows lines, curves, and paths. Elements arranged along a continuous line or curve are perceived as more related than elements not on the line.

**Visual hierarchy application:** Step indicators should use connected lines. Reading flow should follow natural left-to-right, top-to-bottom paths. Alignment creates implicit lines that group content.

**Violation indicators:**
- Misaligned elements that break the visual flow
- Progress steps without connecting lines or visual continuity
- Content blocks at irregular horizontal positions

### Closure

**Definition:** The mind tends to perceive complete shapes even when parts are missing. Incomplete forms are mentally "closed" into recognizable wholes.

**Visual hierarchy application:** Card borders do not need to be fully drawn if corners and shadows imply the container. Icon design can use implied shapes. Loading skeletons use closure to suggest content structure before it loads.

**Violation indicators:**
- Ambiguous containers where boundaries are unclear
- Icons missing enough visual information to be recognizable
- Skeleton screens that do not suggest the eventual content layout

### Figure-Ground

**Definition:** The mind separates visual fields into a dominant figure (foreground) and a receding ground (background). Clear figure-ground separation is essential for readability.

**Visual hierarchy application:** Modal overlays should dim the background to establish figure-ground. Primary content should have sufficient contrast against its background. Active/selected states should visually "lift" above surrounding content.

**Violation indicators:**
- Modals without backdrop dimming or elevation
- Text on busy backgrounds with insufficient contrast
- Active states indistinguishable from inactive states

### Common Region

**Definition:** Elements within a shared bounded area (border, background color, or visual enclosure) are perceived as grouped together.

**Visual hierarchy application:** Card containers group related content. Bordered sections organize form fields. Sidebar regions separate navigation from main content.

**Violation indicators:**
- Related content lacking any visual container
- Overly nested containers creating visual clutter
- Inconsistent use of enclosure (some groups bordered, others not)

---

## Norman's Design Principles

From Don Norman's "The Design of Everyday Things" (1988, revised 2013). Foundational principles for how people interact with designed objects and interfaces.

### Affordance

**Definition:** The properties of an object or interface element that suggest how it can be used. A button affords pressing; a slider affords dragging. In digital interfaces, perceived affordance (what appears possible) matters more than actual affordance.

**Evaluation criteria:**
- [ ] Do interactive elements look interactive (raised, colored, underlined)?
- [ ] Do non-interactive elements avoid signaling interactivity?
- [ ] Are drag handles, resize grips, and other manipulation affordances visually communicated?
- [ ] Does the visual treatment match the interaction model (swipe cards look swipeable)?

### Signifiers

**Definition:** Indicators that communicate where and how to act. While affordances determine what actions are possible, signifiers communicate where the action should take place. Labels, icons, arrows, and visual cues are signifiers.

**Evaluation criteria:**
- [ ] Do buttons have clear labels or universally recognized icons?
- [ ] Are clickable areas indicated by cursor changes, underlines, or color?
- [ ] Are scroll indicators present when content extends beyond the viewport?
- [ ] Are gesture-based interactions discoverable through visual hints?

### Constraints

**Definition:** Limiting the range of possible interactions to prevent errors. Physical constraints (a USB plug fits one way), semantic constraints (conventions dictate behavior), and logical constraints (graying out invalid options) all reduce mistakes.

**Evaluation criteria:**
- [ ] Are invalid options disabled or hidden rather than leading to error states?
- [ ] Do input fields constrain to valid types (numeric keyboards, date pickers)?
- [ ] Are sequential steps enforced when order matters?
- [ ] Are destructive actions gated behind confirmation or additional input?

### Mapping

**Definition:** The relationship between controls and their effects. Natural mapping leverages spatial and logical correspondence -- a volume slider that moves up to increase volume uses natural mapping.

**Evaluation criteria:**
- [ ] Do spatial layouts map naturally to their effects (up = more, left = previous)?
- [ ] Are toggle states visually mapped to their meaning (on/off, yes/no)?
- [ ] Do scroll directions match content movement expectations?
- [ ] Are control positions logically associated with what they affect?

### Feedback

**Definition:** Communicating the results of an action. Every action should produce an immediate, obvious, and understandable response. Feedback must be timely, informative, and proportional.

**Evaluation criteria:**
- [ ] Is every user action acknowledged within 100ms?
- [ ] Is feedback proportional to the significance of the action?
- [ ] Are state changes animated to show causality and direction?
- [ ] Is feedback accessible (not relying solely on color or sound)?

### Conceptual Models

**Definition:** The mental model a user forms about how a system works. Good design makes the conceptual model obvious through the system image -- what the user can see, hear, and interact with.

**Evaluation criteria:**
- [ ] Can a new user predict what will happen before acting?
- [ ] Does the interface metaphor remain consistent throughout?
- [ ] Are hidden states and system behavior made visible when needed?
- [ ] Does the organizational structure match how users think about the domain?

---

## Quantitative Laws

Empirically validated laws that provide measurable criteria for design evaluation.

### Fitts's Law

**Formula:** `T = a + b * log2(D/W + 1)`

Where T = movement time, D = distance to target, W = width of target, a and b are empirically determined constants.

**Rule:** The time to reach a target is a function of the distance to the target divided by the target's size. Larger, closer targets are faster to acquire.

**Application to design critique:**
- [ ] Are frequently used targets large enough for quick acquisition (minimum 44x44px touch, 24x24px pointer)?
- [ ] Are primary actions positioned near the user's likely cursor/finger position?
- [ ] Are destructive actions placed away from (not adjacent to) frequently-used actions?
- [ ] Do infinite-edge targets (screen edges, corners) leverage Fitts's advantage for menus and toolbars?
- [ ] Are targets in mobile interfaces within comfortable thumb reach zones?

**WCAG connection:** WCAG 2.5.8 Target Size (Minimum) requires interactive targets of at least 24x24 CSS pixels (AA level). Fitts's Law provides the theoretical foundation for this requirement -- undersized targets increase error rates and interaction time for all users, disproportionately affecting users with motor impairments.

### Hick's Law

**Formula:** `T = b * log2(n + 1)`

Where T = decision time, n = number of equally probable choices, b is an empirically determined constant.

**Rule:** The time to make a decision increases logarithmically with the number of choices. More options = slower decisions = higher cognitive load.

**Application to design critique:**
- [ ] Are navigation menus limited to a manageable number of items (7 +/- 2)?
- [ ] Are complex feature sets organized with progressive disclosure?
- [ ] Are default selections provided for common choices?
- [ ] Are options categorized or grouped to reduce effective choice count?
- [ ] Do search/filter mechanisms supplement long option lists?

**WCAG connection:** Relates to WCAG 3.2.6 Consistent Help -- consistent placement of help mechanisms reduces the decision space for finding assistance.

### Miller's Law

**Rule:** The average person can hold 7 +/- 2 (typically 4-5 in modern research) chunks of information in working memory at one time.

**Source:** George A. Miller, "The Magical Number Seven, Plus or Minus Two" (Psychological Review, 1956). Modern cognitive science (Cowan, 2001) suggests the effective limit is closer to 4 chunks for complex items.

**Application to design critique:**
- [ ] Are information groups limited to 5-9 items (or 3-5 for complex items)?
- [ ] Is chunking used to organize related information (phone numbers: 555-867-5309)?
- [ ] Are comparison tasks limited or supported by side-by-side presentation?
- [ ] Is critical information persistent (not requiring memorization across views)?
- [ ] Are codes, IDs, and reference numbers supplemented with meaningful labels?

**WCAG connection:** Relates to WCAG 3.3.7 Redundant Entry -- not requiring users to re-enter previously provided information respects working memory limitations.

---

## Citations

| Source | URL | Used In |
|--------|-----|---------|
| Nielsen's 10 Usability Heuristics | https://www.nngroup.com/articles/ten-usability-heuristics/ | H1-H10 |
| Shneiderman's 8 Golden Rules | https://www.cs.umd.edu/~ben/goldenrules.html | S1-S8 |
| Don Norman, "The Design of Everyday Things" (revised ed., 2013) | https://mitpress.mit.edu/9780262525671/ | Norman's Principles |
| Gestalt Principles in UI Design | https://www.nngroup.com/articles/gestalt-principles/ | Gestalt section |
| Fitts's Law | https://www.interaction-design.org/literature/topics/fitts-law | Fitts's Law |
| Hick's Law | https://www.interaction-design.org/literature/topics/hick-s-law | Hick's Law |
| Miller's Law (1956) | https://psycnet.apa.org/record/1957-02914-001 | Miller's Law |
| Cowan, "The Magical Number 4" (2001) | https://doi.org/10.1017/S0140525X01003922 | Miller's Law (modern update) |
| WCAG 2.2 Specification | https://www.w3.org/TR/WCAG22/ | Quantitative Laws WCAG connections |
| Apple Human Interface Guidelines | https://developer.apple.com/design/human-interface-guidelines/ | H4 example |
| GitHub Repository Deletion Confirmation | https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository | H5 example |
| Stripe Dashboard Design | https://stripe.com/docs/dashboard | H8 example |
| Stripe API Error Handling | https://docs.stripe.com/api/errors | H9 example |
