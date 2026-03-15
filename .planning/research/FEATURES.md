# Feature Research

**Domain:** AI-assisted design pipeline (brief → flows → system → wireframe → critique → iterate → handoff)
**Researched:** 2026-03-15
**Confidence:** HIGH (output formats, pipeline structure), MEDIUM (competitive positioning), MEDIUM (iteration/critique patterns)

---

> **Scope note:** This file replaces the v1.0 platform-level feature research. It focuses exclusively on the v1.1 design pipeline addition. The 7 skills are: `/pde:brief`, `/pde:flows`, `/pde:system`, `/pde:wireframe`, `/pde:critique`, `/pde:iterate`, `/pde:handoff`. Each section covers table stakes, differentiators, anti-features, expected output, and complexity for that skill.

---

## Pipeline Overview

The design pipeline is a linear dependency chain where each stage consumes the previous stage's output:

```
brief → flows → system → wireframe → critique → iterate → handoff
```

All stages also work standalone (ad-hoc invocation without running the full pipeline). The orchestrated `/pde:build` pipeline runs them sequentially with human verification gates between stages.

---

## Skill 1: Problem Framing (`/pde:brief`)

**What it does:** Converts a raw idea, user request, or product description into a structured design brief that defines the problem, users, goals, constraints, and success criteria.

**Primary output:** `.planning/design/brief.md` — a structured markdown document.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Problem statement generation | Users expect AI to synthesize a crisp "who / what / why" from loose input | LOW | Classic HMW (How Might We) + Jobs-to-be-Done format |
| User persona identification | Every design tool prompts for target user; missing it = brief is incomplete | LOW | 1-3 primary personas with role, goal, pain point |
| Success criteria definition | "How will we know it worked?" is required before flows make sense | LOW | 3-5 measurable outcomes |
| Constraint capture | Tech constraints (must use existing stack), business constraints (timeline, scope) | LOW | Pulled from PROJECT.md + user input |
| Design goals vs non-goals | Without explicit non-goals, scope creeps into every subsequent stage | LOW | Explicit "out of scope" section |
| Structured markdown output | Downstream stages (flows, system) parse the brief; must be consistent format | LOW | Fixed sections: problem, users, goals, constraints, success, non-goals |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Requirements traceability back to REQUIREMENTS.md | Brief should validate against and reference existing project requirements | MEDIUM | Cross-link to .planning/REQUIREMENTS.md; flags gaps |
| Persona-to-JTBD mapping | Converts persona + goal into a Jobs-to-be-Done statement for each user type | LOW | "When I [context] I want to [goal] so I can [outcome]" |
| Assumption surfacing | Forces explicit listing of untested assumptions before flows are designed | LOW | Assumptions that would invalidate the design if wrong |
| Existing design artifact detection | If brief.md already exists, diffs with current input rather than overwriting | MEDIUM | Supports iteration without losing prior decisions |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Competitive analysis during brief | "Research competitors" seems like part of framing | Wrong stage; competitors belong in research phase, not brief | Brief references SUMMARY.md from research phase if it exists |
| Auto-generating user personas from thin air | "Just create personas for me" | Fabricated personas encode false assumptions that corrupt every downstream stage | Ask for target user description; generate persona structure, not personas from nothing |
| Pixel-level constraints in brief | "What colors should we use?" | Too early; system design handles this; brief defines goals, not solutions | Redirect to `/pde:system` |

**Output format:**
```markdown
# Design Brief: [Project Name]

## Problem Statement
[1-2 sentences: who has what problem in what context]

## Target Users
- **[Persona 1]:** [role], needs [goal], struggles with [pain]
- **[Persona 2]:** ...

## Jobs to Be Done
- When [context], I want to [action] so I can [outcome]

## Design Goals
1. [Measurable goal]

## Success Criteria
- [ ] [Metric / observable outcome]

## Constraints
- Technical: [stack, platform, access limitations]
- Scope: [what is explicitly excluded]

## Assumptions
- [Assumption that, if wrong, changes the design direction]

## Non-Goals
- [Feature / concern explicitly out of scope]
```

**Complexity:** LOW — structured elicitation, no visual output, well-understood patterns.

---

## Skill 2: User Flow Mapping (`/pde:flows`)

**What it does:** Produces a structured map of the paths users take through the product — entry points, decision nodes, happy paths, error states, and exit points — without specifying visual design.

**Primary output:** `.planning/design/flows.md` — text-based flow diagrams per user journey.

**Consumes:** `brief.md` (personas, JTBD, goals)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Happy path per persona | The primary use case must be mapped for each defined persona | LOW | Linear sequence of steps from entry to goal completion |
| Decision branch mapping | Every "if/else" moment a user hits (login vs signup, success vs error) | MEDIUM | Decision nodes with labeled branches |
| Error state coverage | What happens when the happy path fails; missing = incomplete spec | MEDIUM | At minimum: empty state, validation error, network failure |
| Entry point enumeration | All ways a user can arrive at a flow (direct nav, email link, notification) | LOW | Affects how each screen must handle cold vs warm entry |
| Flow-to-screen labeling | Each step in the flow should name the screen or component it maps to | LOW | Enables wireframe stage to treat flows as an inventory |
| Markdown text diagram output | LLMs cannot produce Figma files; ASCII/text flows work for all downstream consumers | LOW | Mermaid or indented list format; no image dependencies |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Edge case annotation | Flags known edge cases (power user, first-time user, empty state) explicitly at each node | MEDIUM | Adds "edge:" annotations to nodes without bloating main flow |
| Cross-flow dependencies | When Flow A produces state that Flow B depends on (e.g., onboarding → main app), makes that dependency explicit | MEDIUM | Avoids flows that assume unreachable states |
| Gap flagging against brief goals | After generating flows, checks whether each success criterion from brief.md has at least one flow that achieves it | MEDIUM | Outputs unmapped goals as explicit gaps |
| Flow complexity scoring | Simple (3-5 steps), Medium (6-10), Complex (10+); flags complex flows for wireframe prioritization | LOW | Informs which flows need the most wireframe attention |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Generating visual flowcharts (PNG, SVG) | Flows feel more "real" as graphics | Requires image rendering infrastructure; LLMs cannot reliably produce correct images | Mermaid syntax — renders in most markdown viewers and GitHub; text is parseable by downstream stages |
| Full happy-path-only flows | Simpler, faster | Error states missed in flow stage are missed in wireframe and handoff; technical debt compounds | Require at minimum 3 error states per major flow |
| One giant flow document | "Put all flows in one place" | Monolithic flows obscure dependencies; hard to critique section by section | Separate flow per major user journey; index at top of flows.md |

**Output format:**
```markdown
# User Flows: [Project Name]

## Flow Index
1. [Flow name] — [persona] — [goal]

---

## Flow 1: [Name]
**Persona:** [from brief]
**Goal:** [JTBD from brief]
**Entry points:** [direct URL, email link, notification]

### Happy Path
1. [Step] → [Screen/Component]
2. [Decision] → Yes: [Step A] | No: [Step B]
3. [Step] → [Screen/Component]
4. [Outcome: goal achieved]

### Error States
- [Trigger] → [Error screen/message] → [Recovery path]

### Edge Cases
- edge: [condition] → [altered path]

### Unmapped Goals (gaps)
- [ ] [Success criterion from brief not covered by any flow]
```

**Complexity:** MEDIUM — requires reasoning about user mental models, state machines, and error coverage; not just content generation.

---

## Skill 3: Design System Generation (`/pde:system`)

**What it does:** Produces a design token set and component inventory for the product — color, typography, spacing, and the named components flows reference — without generating visual assets.

**Primary output:** `.planning/design/system.md` — design tokens in structured markdown; component catalog.

**Consumes:** `brief.md` (brand/constraint context), `flows.md` (component names from flow labels)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Color token set | Every design system starts with a semantic color palette; missing = visual chaos | LOW | primary, secondary, surface, error, warning, success, text-* tokens |
| Typography scale | Font size hierarchy is non-negotiable; devs need this to write CSS | LOW | xs, sm, base, lg, xl, 2xl + font-weight, line-height |
| Spacing scale | Consistent spacing prevents component-by-component margin negotiation | LOW | 4px base unit; t-shirt sizes (xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48) |
| Component inventory from flows | Every screen label in flows.md becomes a component entry with props | MEDIUM | Ensures wireframe + handoff have a shared vocabulary |
| Semantic naming convention | Tokens named by intent (color-feedback-error) not value (#FF0000) | LOW | Required for AI-parseable tokens per W3C Design Tokens spec (2025 stable) |
| CSS variable export format | The canonical output format for browser-based implementation | LOW | `--color-primary: #value;` block; devs paste directly |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Derived tokens from base tokens | Generates full semantic palette from 2-3 brand colors (primary, accent, neutral) using lightness/saturation algorithms | MEDIUM | Avoids user needing color theory knowledge |
| Component prop interface generation | For each component in inventory, generates a TypeScript-style prop interface stub | MEDIUM | Feeds directly into handoff stage; reduces double-work |
| Accessibility check at token level | Flags any color pair (text/background) that fails WCAG AA contrast | LOW | Check color-text-primary on color-surface; surface+primary; etc. |
| Conflict detection against existing system | If project already has CSS variables or a design system file, diffs rather than overwrites | HIGH | Prevents clobbering existing conventions |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Generating actual image assets (icons, logos) | "Include brand assets" | LLMs cannot generate reliable image assets; SVG generation is error-prone | Document icon library to use (e.g., Lucide, Heroicons) by name; do not generate SVGs |
| Full Figma-compatible token file export | "Export to Figma" | Requires MCP/Figma API integration; out of scope for v1.1 | Output W3C design token JSON format; comment as "Figma-compatible when MCP integration added" |
| Generating a complete component library | "Build all our components" | Implementation work, not design work; crosses into code territory | System defines the what (component inventory + props); handoff generates the code stubs |

**Output format:**
```markdown
# Design System: [Project Name]

## Tokens

### Color
| Token | Value | Usage |
|-------|-------|-------|
| color-primary | #value | Primary actions, links |
| color-surface | #value | Page/card backgrounds |
| color-feedback-error | #value | Validation errors |

### Typography
| Token | Value | Usage |
|-------|-------|-------|
| text-base | 16px/1.5 | Body copy |
| text-lg | 20px/1.4 | Subheadings |

### Spacing
| Token | Value |
|-------|-------|
| space-sm | 8px |
| space-md | 16px |

## CSS Variables
\`\`\`css
:root {
  --color-primary: #value;
  --space-md: 16px;
}
\`\`\`

## Component Inventory
| Component | From Flow | Props (stub) | Notes |
|-----------|-----------|--------------|-------|
| LoginForm | Flow 1 step 2 | email, password, onSubmit | Error state required |

## Accessibility Flags
- [ ] [Token pair]: [contrast ratio] — fails WCAG AA
```

**Complexity:** MEDIUM — token generation is structured; component inventory from flows requires parsing flow output; accessibility checking requires color math.

---

## Skill 4: Wireframing (`/pde:wireframe`)

**What it does:** Produces text-based (ASCII/Unicode box-drawing) wireframes for the screens identified in the flows, at a controlled fidelity level. No visual design — layout, hierarchy, and component placement only.

**Primary output:** `.planning/design/wireframes/[screen-name].md` — one file per screen.

**Consumes:** `flows.md` (screen inventory), `system.md` (component names)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One wireframe per named screen in flows | Flows define the screen inventory; wireframe covers it completely | MEDIUM | Missing screens = incomplete spec for handoff |
| ASCII/Unicode box-drawing layout | LLMs can produce reliable text wireframes; this is proven (BareMinimum, Mockdown, AsciiKit tools confirm the pattern) | LOW | Box-drawing chars: ┌ ─ ┐ │ └ ┘; fallback to [COMPONENT] labels |
| Component label → system component mapping | Each element in the wireframe labeled with its system.md component name | LOW | `[LoginForm]`, `[Button: primary]`, not vague "box here" |
| Fidelity control (lo / mid) | Lo-fi = layout only; mid-fi = labels + rough content areas | LOW | Default lo-fi; `--fidelity=mid` flag for stakeholder review versions |
| Annotation layer | Behaviors, interactions, and state notes below each wireframe | MEDIUM | "On submit: show loading state → success state or inline error" |
| Screen index file | `wireframes/index.md` lists all wireframes with flow references | LOW | Navigation aid for critique and handoff stages |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Responsive breakpoint variants | Desktop and mobile layouts for screens where layout differs significantly | MEDIUM | Controlled: only when brief specifies multi-device |
| State variants per screen | Happy state, error state, empty state, loading state as separate wireframe blocks in same file | MEDIUM | Matches the error states documented in flows; ensures parity |
| Interactive annotation (click targets) | Labels which elements are tappable/clickable and what they trigger | LOW | `[Button → triggers: flow-1-step-3]` |
| Mermaid fallback for complex flows | For information-heavy screens (dashboards), a Mermaid diagram of data relationships | HIGH | Only when ASCII wireframe would be illegible at required scale |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| High-fidelity mockups | "Make it look real" | LLMs cannot produce reliable high-fi visual design; this is the wrong tool for that job | Define this as explicitly out of scope in /pde:wireframe help text; recommend Figma/Framer for hi-fi |
| Pixel-precise measurements | "Add pixel dimensions to every element" | Premature specificity; wireframes establish hierarchy, not measurements; measurements belong in handoff | Spacing tokens (space-md, space-lg) rather than pixels in wireframe annotations |
| Auto-generating all screens at once without review | "Generate every screen in one pass" | Individual screens need review before the next; batch generation produces compounding errors | Generate screens in flow order; pause for verification between flows |

**Output format (per screen):**
```
# Wireframe: [Screen Name]
**Flow:** [Flow name, step N]
**Fidelity:** lo-fi
**Component used:** [system.md component name]

## Layout

┌──────────────────────────────────────┐
│  [Logo]           [Nav: main]        │
├──────────────────────────────────────┤
│                                      │
│  [Heading: page title]               │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [LoginForm]                  │  │
│  │  [Input: email]               │  │
│  │  [Input: password]            │  │
│  │  [Button: primary "Sign In"]  │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Link: "Forgot password?"]          │
└──────────────────────────────────────┘

## Annotations
- On submit: show [Spinner] → success → redirect to [Dashboard screen]
- On error: show inline [AlertBanner: error] within LoginForm
- "Forgot password?" → triggers Flow 3

## States
- Default (empty form)
- Loading (submit in progress)
- Error (validation failed)
```

**Complexity:** MEDIUM — ASCII layout generation is reliable for LLMs (confirmed by BareMinimum, AsciiKit patterns); state coverage and annotation require discipline.

---

## Skill 5: Design Critique (`/pde:critique`)

**What it does:** Evaluates the wireframes against the brief goals, flow coverage, design system consistency, and usability heuristics — from multiple perspectives (user, hierarchy, accessibility, flow coverage).

**Primary output:** `.planning/design/critique.md` — structured issue list with severity and fix recommendations.

**Consumes:** `brief.md` (goals, success criteria), `flows.md` (coverage check), `system.md` (consistency check), `wireframes/` (subject of critique)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Heuristic evaluation against Nielsen's 10 | Industry-standard baseline; any UX critique tool references these | MEDIUM | Visibility, user control, consistency, error prevention, etc. |
| Coverage check: wireframes vs flows | Every screen in flows.md must have a wireframe; gaps listed explicitly | LOW | Mechanical check; no subjective judgment needed |
| Goal validation: does each wireframe advance at least one brief goal? | Brief exists so designs stay purposeful | MEDIUM | Cross-references success criteria from brief.md |
| Severity rating per issue | Critical (blocks task completion), High (degrades experience), Medium (friction), Low (polish) | LOW | Enables prioritization in iterate stage |
| Fix recommendation per issue | Issues without suggestions are noise; fixes are what iterate consumes | MEDIUM | "Issue: X → Suggested fix: Y" format |
| System consistency check | Components used in wireframes match component inventory in system.md | LOW | Mechanical name-matching; flags unknown component references |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-perspective critique structure | User perspective, visual hierarchy perspective, accessibility perspective, flow logic perspective — each as a distinct section | MEDIUM | Research (arxiv 2507.02306) shows AI critique finds 73-77% of usability issues vs 57-63% for 5 humans; structured perspectives improve coverage |
| Assumption violation check | Cross-references brief.md assumptions against wireframe design; flags designs that embed a false assumption | MEDIUM | High-value catch that human review often misses |
| Positive findings section | Not just problems — what works well and should be preserved across iterations | LOW | Prevents iterate stage from accidentally breaking good decisions |
| Issue deduplication | When the same root problem causes multiple surface symptoms, group them | LOW | Reduces iterate scope bloat |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Heatmap / eye-tracking simulation | "Show where users will look" | No reliable text-based equivalent; image-based analysis requires visual input PDE doesn't have | Describe visual hierarchy in annotations; note heading weight and CTA placement in critique |
| Scoring / rating the overall design numerically | "Give it a 7/10" | Single scores mask which dimensions are good vs bad; provides false precision | Severity counts by category (critical: 2, high: 3, medium: 5) are more actionable |
| Generating critique from wireframe images | "Upload a screenshot to critique" | PDE is text-native; image interpretation is unreliable for structural critique | Critique the markdown wireframe source; it has more structural information than a screenshot |

**Output format:**
```markdown
# Design Critique: [Project Name]
**Critiqued:** [list of wireframes reviewed]
**Date:** [date]

## Coverage Gaps
- [ ] [Screen from flows.md] has no wireframe

## Summary
- Critical issues: N
- High issues: N
- Medium issues: N
- Low issues: N

## Perspective: User (Task Completion)
### Issue C-01 [Critical]
**Screen:** [screen name]
**Heuristic:** [Nielsen heuristic]
**Observed:** [what the wireframe shows]
**Problem:** [why this fails the user]
**Fix:** [specific recommendation]

## Perspective: Visual Hierarchy
...

## Perspective: Accessibility
...

## Perspective: Flow Logic
...

## What Works (Preserve in Iteration)
- [Element/pattern that is correct and should not be changed]

## Assumption Violations
- [Assumption from brief] ↔ [Design decision that contradicts it]
```

**Complexity:** MEDIUM — heuristic application and multi-perspective structuring require careful prompting; mechanical checks (coverage, consistency) are LOW complexity.

---

## Skill 6: Critique-Driven Iteration (`/pde:iterate`)

**What it does:** Takes the critique issue list and produces updated wireframes that address the flagged problems, with a change log documenting what changed and why.

**Primary output:** Updated files in `.planning/design/wireframes/` + `.planning/design/iterate-[N].md` change log.

**Consumes:** `critique.md` (issue list), existing wireframes (subject of change)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Issue-by-issue resolution | Each critique issue should be addressed or explicitly deferred with rationale | MEDIUM | Prevents critique becoming a "noted and ignored" list |
| Change log per iteration | What changed, which issue it resolves, what the before state was | LOW | Enables reviewing decisions across multiple iterations |
| Iteration numbering | Multiple critique/iterate cycles must be distinguishable | LOW | iterate-1.md, iterate-2.md; wireframes labeled with version |
| Deferred issue list | Not every issue gets fixed in every iteration; deferrals need documented rationale | LOW | "Deferred: [issue] — [reason]" |
| Regression check | Verify that fixing Issue A didn't break the pattern that was working (from "What Works" in critique) | MEDIUM | Cross-references the Preserve list from critique.md |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Scope-controlled iteration | User can specify "address only Critical and High issues" to avoid over-editing | LOW | `--severity=critical,high` filter on which issues to resolve |
| Before/after diff in change log | Change log shows the old wireframe annotation and new annotation side by side | MEDIUM | Makes the change auditable without needing to re-read both versions |
| Recommendation to re-critique | After iteration, flags whether the changes introduced new issues worth a second critique pass | LOW | "Changes to [screen] may warrant re-critique: [reason]" |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatically re-running critique after iterate | "Just loop until no more issues" | Unconstrained critique-iterate loops diverge; human judgment needed to decide when good enough is good enough | Explicit human verification gate between iterate and any subsequent critique; do not automate the loop |
| Wholesale redesign from critique | "The critique was bad; redesign everything" | Throws away correct decisions along with incorrect ones | Scope iteration to issue resolution; if redesign is truly needed, run a new `/pde:brief` → full pipeline pass |
| Silent wireframe updates without change log | "Just update the files" | Loses the rationale for every decision; handoff engineers have no context for why things look the way they do | Change log is non-optional output of every iterate run |

**Output format:**
```markdown
# Design Iteration 1: [Project Name]
**Issues addressed:** [N of M from critique.md]
**Date:** [date]

## Changes

### Issue C-01 [Critical] — RESOLVED
**Screen:** [screen name]
**Change:** [what was modified]
**Before:** [old annotation or layout note]
**After:** [new annotation or layout note]

### Issue H-03 [High] — DEFERRED
**Reason:** [why not addressed now]
**Planned for:** [next iteration / handoff decision]

## Regression Check
- Preserved: [element from critique Preserve list] — confirmed unchanged

## Re-critique Recommended
- [ ] [Screen name]: [reason change may have introduced new issue]
```

**Complexity:** MEDIUM — issue-targeted editing of wireframes requires precise scoping; change log generation is LOW complexity.

---

## Skill 7: Design-to-Code Handoff (`/pde:handoff`)

**What it does:** Converts the final design artifacts (system tokens, component inventory, wireframes, annotations) into implementation-ready specifications: TypeScript interfaces, component API contracts, file structure recommendations, and task breakdown for the implementation phase.

**Primary output:** `.planning/design/handoff.md` — implementation spec; `.planning/design/interfaces/[component].ts.md` — typed prop interfaces.

**Consumes:** All prior design artifacts (`brief.md`, `flows.md`, `system.md`, `wireframes/`, `critique.md`, latest `iterate-N.md`)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| TypeScript interface per component | The #1 thing dev handoff must produce in 2026 TypeScript-first workflows | MEDIUM | Props, optional vs required, union types for variants (e.g., `variant: 'primary' \| 'ghost'`) |
| CSS variable block | Tokens from system.md formatted as CSS custom properties ready to paste | LOW | Already generated in system.md; handoff consolidates and marks as final |
| Component tree / composition map | Which components contain which child components; defines the render tree | MEDIUM | Derived from wireframe layout; `LoginPage → [Header, LoginForm → [Input, Input, Button]]` |
| Screen-by-screen implementation task list | Ordered list of what to build, in dependency order | MEDIUM | Leaf components first, compositions after; each item is a concrete implementation task |
| File path recommendations | Where each component lives in the project's existing directory structure | LOW | Reads existing codebase conventions from .planning/ or asks user |
| Behavior specification | Interaction behaviors, state transitions, event handlers — the logic spec a developer needs | MEDIUM | Pulled from wireframe annotations and flow error states |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Implementation task → PDE task injection | Generates tasks formatted for `/pde:quick` or the next milestone's plan | HIGH | Closes the loop: design produces work items the PDE workflow engine can execute |
| Existing component detection | Cross-checks component inventory against any existing component files in the codebase | HIGH | Prevents building LoginForm if auth/LoginForm.tsx already exists |
| Accessibility implementation notes | WCAG requirements per component (aria-label, role, keyboard nav) from critique accessibility perspective | MEDIUM | Derived from critique.md accessibility section |
| Storybook story stub generation | For each component, generates a minimal Storybook story skeleton showing each variant | MEDIUM | Optional; only when project uses Storybook (detected from package.json) |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Generating actual component implementation code | "Just write the components" | Implementation is for the coding phase; mixing design handoff with code generation conflates two phases and skips verification | Handoff produces the spec; coding phase executes it; this is the separation GSD enforces |
| Figma export / design file generation | "Export to Figma for the team" | Requires Figma MCP integration (out of scope for v1.1) | Mark this as a v1.2 enhancement target when MCP integrations are added |
| One-page mega-spec | "Put everything in one handoff doc" | Monolithic specs are not searchable; engineers skip to their component and miss cross-cutting notes | Per-component interface files + index handoff.md that links to each |

**Output format:**
```markdown
# Handoff: [Project Name]
**Design version:** iterate-[N]
**Date:** [date]

## Implementation Order
1. [Leaf component] — no dependencies
2. [Component] — depends on #1
3. [Screen] — depends on #1, #2

## Component Interfaces

### [ComponentName]
\`\`\`typescript
interface [ComponentName]Props {
  // required
  label: string;
  onSubmit: (data: FormData) => void;
  // optional
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}
\`\`\`
**Location:** `src/components/[path]/[ComponentName].tsx`
**Behaviors:**
- [Interaction → state transition]
**Accessibility:**
- role="[role]", aria-label="[label]"

## CSS Variables (final)
\`\`\`css
:root { /* from system.md — finalized */ }
\`\`\`

## Tasks for Implementation Phase
- [ ] Implement [Component] — [estimated scope: small/medium/large]
- [ ] Implement [Component] — depends on [Component]
```

**Complexity:** HIGH — requires synthesizing all prior artifacts, detecting existing code, generating typed interfaces, and producing ordered task lists. Most complex stage in the pipeline.

---

## Feature Dependencies

```
[/pde:brief — brief.md]
    └──required by──> [/pde:flows — flows.md]
                          └──required by──> [/pde:system — system.md (component inventory)]
                          └──required by──> [/pde:wireframe — wireframes/]
                                                └──required by──> [/pde:critique — critique.md]
                                                                      └──required by──> [/pde:iterate — iterate-N.md + updated wireframes]
                                                                                            └──required by──> [/pde:handoff — handoff.md]

[/pde:system — system.md]
    └──required by──> [/pde:wireframe] (component vocabulary)
    └──required by──> [/pde:handoff] (CSS variables, prop interfaces)

[/pde:critique — critique.md]
    └──enhances──> [/pde:iterate] (issue list drives changes)
    └──feeds──> [/pde:handoff] (accessibility notes, preserved patterns)

[/pde:iterate]
    └──may loop back to──> [/pde:critique] (human-gated; not automatic)
```

### Dependency Notes

- **brief.md is the foundation:** Every stage derives context from it. A weak brief produces compounding errors in every downstream stage.
- **flows.md drives the screen inventory:** Wireframe and system component lists are derived from flow stage labels. Running wireframe without flows means inventing the screen list from scratch.
- **system.md must precede wireframe:** Component names in wireframes must match component names in system.md or handoff will find mismatches.
- **critique is optional in the pipeline but strongly recommended:** Wireframe → handoff is possible, but skips the only structured quality gate before code is written.
- **iterate is optional and repeatable:** 0 to N iterations. Each iteration requires another human verification decision before proceeding.
- **handoff requires all prior artifacts:** It synthesizes everything; running handoff without complete prior stages produces an incomplete spec.

---

## Standalone vs Orchestrated Use

Each skill works in two modes:

| Mode | How invoked | What it reads | What it writes |
|------|-------------|---------------|----------------|
| Standalone | `/pde:[skill]` directly | Whatever design artifacts exist in `.planning/design/` | Its own output file; skips stages not yet run |
| Orchestrated | Via `/pde:build` pipeline | Full chain from prior stage output | Full chain; human verification gate between each stage |

Standalone mode must be tolerant of missing upstream artifacts: if `flows.md` does not exist when `/pde:wireframe` is invoked, the command should ask the user for the screen list rather than failing.

---

## MVP Definition

### Launch With (v1.1)

All 7 skills at their table-stakes feature level, standalone and orchestrated.

- [ ] `/pde:brief` — structured brief elicitation with fixed output format
- [ ] `/pde:flows` — happy path + error states + edge cases per persona
- [ ] `/pde:system` — color/type/spacing tokens + component inventory + CSS variables
- [ ] `/pde:wireframe` — ASCII wireframes for all screens in flows + state variants + annotations
- [ ] `/pde:critique` — heuristic evaluation + coverage check + severity-rated issues + fix recommendations
- [ ] `/pde:iterate` — issue-targeted wireframe updates + change log + deferred issue list
- [ ] `/pde:handoff` — TypeScript interfaces + implementation order + CSS variables + task list
- [ ] `/pde:build` — orchestrated pipeline with human verification gates
- [ ] `.planning/design/` artifact directory with consistent naming

### Add After Validation (v1.2)

- [ ] Assumption violation detection in critique — needs proven brief format stability
- [ ] Existing component detection in handoff — needs codebase indexing capability
- [ ] Implementation task injection into PDE workflow engine — needs handoff-to-plan bridge
- [ ] Figma MCP export from handoff — requires MCP integration milestone
- [ ] Responsive wireframe variants — add when users report mobile design as blocker
- [ ] Storybook story stub generation — add when users report Storybook usage

### Future Consideration (v2+)

- [ ] Competitive analysis as part of brief stage — requires research agent integration
- [ ] AI-generated persona research from user interview transcripts — requires external data access
- [ ] Image/screenshot-based design critique — requires reliable vision model integration
- [ ] High-fidelity mockup generation — requires image generation pipeline

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `/pde:brief` — structured brief | HIGH | LOW | P1 |
| `/pde:flows` — text flow diagrams | HIGH | MEDIUM | P1 |
| `/pde:system` — token generation | HIGH | MEDIUM | P1 |
| `/pde:wireframe` — ASCII wireframes | HIGH | MEDIUM | P1 |
| `/pde:critique` — heuristic review | HIGH | MEDIUM | P1 |
| `/pde:iterate` — targeted updates | HIGH | MEDIUM | P1 |
| `/pde:handoff` — TypeScript interfaces + task list | HIGH | HIGH | P1 |
| `/pde:build` — orchestrated pipeline | HIGH | MEDIUM | P1 |
| Existing component detection | MEDIUM | HIGH | P2 |
| Figma/MCP export | HIGH | HIGH | P2 (v1.2) |
| Assumption violation detection | MEDIUM | MEDIUM | P2 |
| Image-based critique | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Add in v1.2 after v1.1 validated
- P3: v2+ consideration

---

## Competitor Feature Analysis

| Feature | Figma AI | v0/Bolt/Lovable | UX Pilot / Uizard | PDE Approach |
|---------|----------|-----------------|-------------------|--------------|
| Problem framing / brief | No | No | No | `/pde:brief` — explicit structured stage |
| User flow mapping | Basic (FigJam) | No | UX Pilot: flow diagrams | Text-native flows with error state coverage |
| Design system generation | Yes (Figma variables) | Minimal | Partial | Token-first; CSS variables; component inventory |
| Wireframing | Yes (hi-fi) | Yes (generates UI) | Yes (lo-fi AI) | Text/ASCII; LLM-native; versioned in markdown |
| Design critique | No (manual) | No | UX Pilot: AI review | Multi-perspective; heuristic + goal + coverage |
| Critique-driven iteration | No (manual) | No | No | Explicit iterate stage with change log |
| Design-to-code handoff | Figma Dev Mode | Yes (generates code) | Partial | TypeScript interfaces + ordered task list |
| File-based state / markdown artifacts | No | No | No | Core PDE differentiator; design lives in .planning/design/ |
| Integration with dev workflow | Figma plugin ecosystem | Ship directly | No | Tasks feed PDE plan; same planning/ directory |
| Offline / no-server | No | No | No | Yes — markdown files, no external services |

**Key gap PDE fills:** No existing tool runs a complete brief-to-handoff design pipeline in text-native, file-based form that integrates with a development workflow engine. Figma handles hi-fi design but has no brief or flow stage. v0/Bolt skip design entirely and go to code. UX Pilot has wireframing and critique but no handoff or workflow integration.

---

## Sources

- [BareMinimum — Free AI ASCII Wireframe Generator](https://bareminimum.design) — confirms ASCII wireframe as valid LLM-native format (HIGH confidence)
- [Mockdown — ASCII Wireframe Editor for AI Coding](https://www.mockdown.design/about) — markdown-based wireframe format patterns (HIGH confidence)
- [AsciiKit — Wireframe with AI Using ASCII](https://asciikit.com/) — validates Claude/ChatGPT ASCII wireframe capability (HIGH confidence)
- [Markdown UI DSL — GitHub](https://github.com/MegaByteMark/markdown-ui-dsl) — spec-driven markdown wireframe schema (MEDIUM confidence)
- [Design Tokens Specification Reaches First Stable Version — W3C Community Group](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/) — canonical token format reference (HIGH confidence)
- [Design Tokens and AI: Scaling UX with Dynamic Systems — Medium](https://medium.com/@marketingtd64/design-tokens-and-ai-scaling-ux-with-dynamic-systems-316afa240f6f) — AI token generation patterns (MEDIUM confidence)
- [Synthetic Heuristic Evaluation — arxiv 2507.02306](https://arxiv.org/abs/2507.02306) — AI critique finds 73-77% of usability issues vs 57-63% human baseline (HIGH confidence; peer-reviewed)
- [Agentic Design Review System — arxiv 2508.10745](https://arxiv.org/pdf/2508.10745) — multi-perspective critique structure for AI design review (HIGH confidence; peer-reviewed)
- [Rethinking Design Critiques in the Age of AI Prototyping — Designative](https://www.designative.info/2025/11/10/rethinking-design-critiques-in-the-age-of-ai-prototyping/) — critique workflow patterns in AI tools (MEDIUM confidence)
- [AI Design-to-Code Tools: Complete Guide 2026 — Banani](https://www.banani.co/blog/ai-design-to-code-tools) — handoff format survey (MEDIUM confidence)
- [10 Best Design-to-Code Tools for Developer Handoff 2026 — Subframe](https://www.subframe.com/tips/best-design-to-code-tools-handoff-export) — TypeScript interface generation as table stakes (MEDIUM confidence)
- [Top AI Tools for UX Designers 2026 — Figma](https://www.figma.com/resource-library/ai-tools-for-ux-designers/) — competitor feature analysis (HIGH confidence)
- [AI User Flow Diagram Generator — Eraser.io](https://www.eraser.io/ai/user-flow-diagram-generator) — text-based flow output formats (MEDIUM confidence)
- [Jobs to Be Done Framework — User Interviews](https://www.userinterviews.com/ux-research-field-guide-chapter/jobs-to-be-done-jtbd-framework) — JTBD statement structure for brief output (HIGH confidence)
- [What is a Problem Statement in UX — CareerFoundry](https://careerfoundry.com/en/blog/ux-design/problem-statement-ux/) — problem statement format (HIGH confidence)

---

*Feature research for: v1.1 design pipeline (brief → flows → system → wireframe → critique → iterate → handoff)*
*Researched: 2026-03-15*
