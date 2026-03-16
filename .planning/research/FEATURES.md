# Feature Research

**Domain:** AI-assisted advanced design skills (ideation, competitive analysis, opportunity scoring, hi-fi mockup, HIG/WCAG audit, tool discovery)
**Researched:** 2026-03-16
**Confidence:** HIGH (RICE framework, WCAG 2.2, HIG structure), MEDIUM (ideation diverge/converge patterns, competitive analysis dimensions), MEDIUM (mockup fidelity bridge from lofi wireframes)

---

> **Scope note:** This file covers ONLY the six new v1.2 skills and the expanded `/pde:build` orchestrator. Existing v1.1 skills (brief, flows, system, wireframe, critique, iterate, handoff) are documented in the previous version of this file and are treated here as stable dependencies.

---

## Extended Pipeline Context

The v1.2 skills extend the pipeline in two directions: upstream (ideation, competitive, opportunity — run before brief) and downstream (mockup, hig — run after iterate, before handoff). Recommend is a utility skill integrated into ideation but also callable standalone.

```
[NEW] ideate → competitive → opportunity → [EXISTING] brief → system → flows → wireframe → critique(+HIG light) → iterate → [NEW] mockup → [NEW] hig(full) → [EXISTING] handoff
```

The `/pde:build` orchestrator must be expanded from 7 stages to 12 stages covering the full pipeline.

---

## Skill A: Multi-Phase Ideation (`/pde:ideate`)

**What it does:** Runs structured diverge→converge exploration before the brief is written. Produces a ranked set of product directions — each with concept description, key bets, risks, and fit against user need — plus a "recommended direction" for brief generation.

**Primary output:** `.planning/design/strategy/IDT-ideation-v{N}.md`

**Depends on:** Nothing (entry point); benefits from PROJECT.md for product type context

**Integrates:** `/pde:recommend` (tool/MCP discovery during ideation to surface research tools)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Divergent idea generation (minimum 5 distinct directions) | Ideation without breadth is just refinement; users expect exploration | MEDIUM | Each direction: concept name, 2-sentence description, key bets, target user |
| Convergence scoring/ranking against stated goal | Divergence without selection criteria produces unusable output | MEDIUM | Criteria: goal fit, feasibility, differentiability, scope; weighted sum |
| Recommended direction output | AI must make a recommendation, not just list options | LOW | Single clear recommendation with rationale; not a committee |
| Assumption capture per direction | Each direction rests on assumptions; surfaces them early before brief commits | LOW | "This direction assumes [X]" per concept |
| Handoff to `/pde:brief` | Ideation output feeds brief.md as the chosen direction context | LOW | Recommended direction populates brief's problem statement seed |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-phase structure (diverge round 1 → reflect → diverge round 2 → converge) | Single-pass ideation anchors on first ideas; multi-phase overcomes anchoring bias | HIGH | Research: progressive ideation frameworks produce higher-novelty concepts (arxiv 2601.00475) |
| HMW (How Might We) reframe per direction | Forces problem-first framing before solution generation | LOW | "How might we [verb] [user] so that [outcome]?" per direction |
| Analogous domain import | Explicitly looks for parallel solutions from non-adjacent industries | MEDIUM | "How does [banking / healthcare / gaming] solve this?" — expands solution space |
| Concept combination pass | After round 1, generates hybrid concepts by combining strongest elements of multiple directions | MEDIUM | Hybrid concepts often outperform any single direction |
| Risk typology per direction | Technical risk, market risk, execution risk scored per direction | LOW | Informs opportunity scoring; directions with all-HIGH risks need evidence |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Immediately picking a winner in round 1 | "Skip to the answer" | Premature convergence produces uncreative output; users learn to game the first prompt | Two explicit phases: diverge (no judgment) then converge (scoring) |
| Generating 20+ concepts | "More is better" | Cognitive overload; users don't evaluate 20 directions; selection quality drops | Cap at 5-8 divergent directions; quality > quantity |
| Including implementation details in ideation | "What tech stack would each use?" | Premature technical framing anchors to familiar tech and kills novel directions | Ideation stays at concept level; system stage handles tech; stack is a brief constraint, not an ideation variable |
| Auto-advancing to brief without user confirmation | "Save the click" | Ideation → brief is a high-value human decision point; AI should not bypass it | Gate: present recommended direction, require user confirmation before brief proceeds |

**Output format:**
```markdown
# Ideation: [Project Name]
**Phase:** Ideation
**Directions explored:** N

## Divergence Round 1

### Direction A: [Name]
**Concept:** [2 sentences]
**HMW:** How might we [verb] [user] so that [outcome]?
**Key bets:** [What must be true for this to work]
**Assumptions:** [What we're assuming about user, market, tech]
**Risks:** Technical: [H/M/L] | Market: [H/M/L] | Execution: [H/M/L]
**Analogous domain:** [Where this pattern already works]

[... Directions B through E ...]

## Divergence Round 2 (Hybrids + Refinements)

### Direction AB: [Hybrid name]
...

## Convergence

### Scoring Matrix
| Direction | Goal Fit | Feasibility | Differentiation | Scope | Total |
|-----------|----------|-------------|-----------------|-------|-------|
| A | 4 | 3 | 4 | 3 | 14 |

### Recommended Direction: [Name]
**Rationale:** [Why this direction wins on the scoring criteria]
**Key assumption to validate:** [The single most critical assumption before committing]

## Next Step
Run `/pde:competitive` to validate market positioning, or `/pde:brief` to start the design pipeline with this direction.
```

**Complexity:** HIGH — multi-phase structure, concept generation, cross-domain analogies, hybrid synthesis, and convergence scoring all require careful prompting and sequential thinking MCP.

---

## Skill B: Competitive Analysis (`/pde:competitive`)

**What it does:** Produces a structured landscape evaluation of competing products — identifying their strengths, weaknesses, and positioning gaps — to inform the product's differentiation strategy.

**Primary output:** `.planning/design/strategy/CMP-competitive-v{N}.md`

**Depends on:** Ideation output (IDT-ideation) OR brief.md for problem space context; soft dependency only

**Typical dimensions researched:** Features, UX, pricing model, target user, onboarding, key differentiators, weaknesses, market positioning

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Competitor identification (minimum 3 direct, 2 indirect) | Analysis with fewer than 3 competitors lacks credibility | LOW | Direct = same problem/user; indirect = same user, different problem |
| Feature matrix across competitors | Users expect a table: Feature A → which competitors have it | MEDIUM | ~10-15 features evaluated; binary or H/M/L scoring |
| Positioning map | Two-axis perceptual map showing where competitors cluster and where gaps are | MEDIUM | Axes derived from the most differentiating dimensions, not arbitrary |
| Explicit gap identification | "Where no competitor plays well" is the actionable output | MEDIUM | 2-4 opportunity gaps with supporting evidence |
| Evidence basis (not fabricated) | Training data often has stale competitor feature info; must flag confidence level per claim | MEDIUM | Marks claims as [training data — verify] when not confirmed via MCP/web search |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| UX pattern analysis (not just features) | Feature lists miss HOW competitors solve problems; UX patterns are harder to copy | HIGH | Navigation model, onboarding approach, error recovery pattern per competitor |
| Competitor weakness typology | "Hard to copy" vs "won't fix" vs "known issue they're working on" | MEDIUM | Changes strategy: attack won't-fix weaknesses, not known-issue ones |
| Market segment mapping | Which competitor serves which user segment; identifies underserved segments | MEDIUM | Segment × competitor coverage matrix |
| Feeds opportunity scoring | Each gap in the competitive matrix becomes an input to RICE scoring | LOW | CMP output consumed directly by `/pde:opportunity` |
| WebSearch MCP integration | Uses live search to verify current competitor feature state | HIGH | Training data for competitor features can be 6-18 months stale; web search is the right source |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Exhaustive competitor survey (10+ competitors) | "Be thorough" | Analysis paralysis; 10+ competitors obscures the signal; most don't matter for differentiation | Cap at 5 competitors (3 direct + 2 indirect); document why others were excluded |
| Evaluating competitors on dimensions irrelevant to product | "Include pricing, team size, funding" | These matter for business strategy, not product design decisions | Scope strictly to dimensions that affect design: features, UX, user segment, onboarding |
| Claiming live competitor features without web verification | Training data may be wrong or 18 months stale | Produces false competitive intelligence that corrupts gap analysis | Every competitor feature claim must be marked with confidence level; web verify top claims |

**Output format:**
```markdown
# Competitive Analysis: [Project Name]
**Date:** [date]
**Problem space:** [from ideation or brief]

## Competitor Landscape

### Direct Competitors
| Competitor | Target User | Core Value Prop | Key Features | Notable UX Pattern |
|------------|-------------|-----------------|--------------|-------------------|
| [Name] | [who] | [what they do best] | [top 3-5] | [how they do it] |

### Indirect Competitors
...

## Feature Matrix

| Feature | [Comp A] | [Comp B] | [Comp C] | [Our Direction] |
|---------|----------|----------|----------|-----------------|
| [Feature 1] | Yes | Yes | No | Planned |
| [Feature 2] | Yes | No | No | Planned |

## Positioning Map

**Axes:** [Dimension 1] vs [Dimension 2]
[Text description of where each competitor falls]

**Clusters:**
- Cluster 1: [Comp A, Comp B] — [description]
- Gap: [Where nobody plays well]

## Opportunity Gaps

### Gap 1: [Name]
**Where:** [Position on the map]
**Evidence:** [Why this gap exists and is real]
**Design implication:** [How this shapes what to build]
**Confidence:** [HIGH/MEDIUM/LOW] — [source: training data/web search/official docs]

## Next Step
Run `/pde:opportunity` to score these gaps using RICE, or `/pde:brief` to begin the pipeline with this direction.
```

**Complexity:** MEDIUM — structured evaluation against known dimensions; HIGH if WebSearch MCP integration is used for live competitor verification.

---

## Skill C: Opportunity Scoring (`/pde:opportunity`)

**What it does:** Scores identified feature opportunities using the RICE framework (Reach × Impact × Confidence ÷ Effort) to produce a prioritized opportunity list. Inputs come from ideation direction, competitive gaps, and user-supplied opportunity list.

**Primary output:** `.planning/design/strategy/OPP-opportunity-v{N}.md`

**Depends on:** Ideation (IDT) and/or competitive (CMP) outputs for opportunity list; can also accept user-defined opportunities as input

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| RICE score per opportunity | RICE is the dominant PM prioritization framework; any opportunity scoring tool uses it | LOW | Formula: (Reach × Impact × Confidence) ÷ Effort |
| Scoring criteria definition before scoring | Criteria must be defined upfront or scores are meaningless | LOW | Document: what counts as "Reach = 5" vs "Reach = 1" for this product |
| Ranked output with score visibility | Users expect to see the ranked list AND the component scores (not just totals) | LOW | Table: opportunity, Reach, Impact, Confidence, Effort, RICE Score, Rank |
| Rationale per score component | "Why Reach = 4?" must be answerable; otherwise scores are fabricated | MEDIUM | One sentence of evidence per component |
| MVP recommendation from top-scored opportunities | "What should we build first?" is the output users need | LOW | Top 3 opportunities by RICE score as MVP candidates |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Confidence calibration against competitive analysis | Confidence score explicitly informed by competitive gap evidence | MEDIUM | "Confidence = 4 because gap confirmed by competitive analysis; no competitor does this well" |
| Effort normalization across opportunities | Effort scores must be on a shared scale; absolute hours are useless without anchoring | LOW | Anchor: "Effort = 3 = a 2-week sprint for one engineer" |
| Sensitivity analysis | Shows which score component drives the result; "this opportunity ranks #1 primarily on low effort" | MEDIUM | Prevents false precision; surfaces which estimates need tightest validation |
| Feeds brief.md and flows.md | Top-ranked opportunities become goals and success criteria in brief stage | LOW | OPP output explicitly references which opportunities brief.md should address |
| Score update pattern | As validation evidence arrives, scores update; changelog tracks why they changed | LOW | RICE scores should not be locked; they're hypotheses |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Pure numerical objectivity ("the RICE score decides") | RICE feels objective | RICE scores are estimates, not measurements; treating them as final decisions suppresses human judgment | Always present RICE as input to decision, not the decision itself; "RICE suggests X but note Y" |
| Scoring 20+ opportunities at once | Thoroughness | With 20 items, scoring quality degrades and the ranked list is unwieldy; users act on top 5 anyway | Cap at 10 opportunities; if more exist, cluster into themes before scoring |
| Single scoring session as final | "Score once and ship" | Market conditions change; new evidence arrives | Document scoring date and evidence basis; prompt re-score when brief or competitive analysis updates |

**Output format:**
```markdown
# Opportunity Scoring: [Project Name]
**Date:** [date]
**Scoring criteria:**
- Reach: number of users affected per quarter at launch scale
- Impact: 1=marginal, 2=low, 3=medium, 4=high, 5=massive
- Confidence: 1=guess, 3=validated pattern, 5=confirmed need
- Effort: 1=days, 3=2-week sprint, 5=quarter+

## Opportunities Scored

| Opportunity | Reach | Impact | Confidence | Effort | RICE Score | Rank |
|-------------|-------|--------|------------|--------|------------|------|
| [Opp A] | 4 | 3 | 4 | 2 | 24 | #1 |
| [Opp B] | 3 | 4 | 3 | 3 | 12 | #2 |

### Score Rationale

**[Opportunity A]**
- Reach = 4: [evidence]
- Impact = 3: [evidence]
- Confidence = 4: [evidence; cross-references competitive gap if applicable]
- Effort = 2: [evidence]

## Sensitivity Analysis

**[Opportunity A]** rank is primarily driven by low effort (Effort=2). If effort estimate is wrong (Effort=4), score drops to 12 and falls to #2.

## MVP Candidates (Top 3)

1. [Opp A] — RICE: 24 — [one-line rationale]
2. [Opp B] — RICE: 12 — [one-line rationale]
3. [Opp C] — RICE: 10 — [one-line rationale]

## Next Step
Run `/pde:brief` using these opportunities as goal inputs.
```

**Complexity:** MEDIUM — RICE math is trivial; the value and complexity is in calibrated rationale and sensitivity analysis.

---

## Skill D: Hi-Fi Mockup Generation (`/pde:mockup`)

**What it does:** Upgrades iterated wireframes (WFR lofi/midfi) to high-fidelity browser-viewable HTML/CSS mockups with design system tokens applied, real interactions, and pixel-precise styling. Produces one self-contained HTML file per screen plus a navigation index.

**Primary output:** `.planning/design/visual/MCK-{screen}-v{N}.html` (one per screen) + `MCK-index.html`

**Depends on:** Wireframes (WFR — post-iterate), design system tokens (SYS — tokens.css), brief (for platform context)

**Position in pipeline:** After iterate, before handoff. The current `/pde:wireframe --hifi` produces high-fidelity wireframes but not interactive mockups; this skill is the dedicated hi-fi output stage.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Design token application (tokens.css consumed) | Hi-fi must use the project's actual design system tokens, not hardcoded values | LOW | Import tokens.css from assets/; use CSS custom properties throughout |
| Real interactive states | Button hover, focus ring, disabled, loading spinner — browser-rendered via CSS | MEDIUM | Each interactive element gets :hover, :focus, :disabled states |
| All state variants per screen | Default, loading, error, empty — each as a distinct section or toggle in the HTML file | MEDIUM | Matches the state variants documented in wireframe annotations |
| Self-contained HTML (no server required) | File:// URL compatibility is a PDE invariant; devs and stakeholders open files directly | LOW | All CSS inline or in `<style>` block; no external CDN dependencies |
| Navigation index | MCK-index.html links all screens; opens in browser as a clickable prototype | LOW | Same pattern as WFR-index.html already produced by wireframe skill |
| Wireframe annotation preservation | Annotations from wireframe HTML files copied into mockup HTML as developer comments | LOW | Ensures handoff stage can still read annotations from mockup files |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| CSS-only interactions (no JavaScript required) | Keeps mockup files simple; JS-heavy mockups are hard to inspect and extend | MEDIUM | :hover, :focus, :checked, CSS transitions cover ~80% of interactive states; JS only for modal toggle |
| Responsive layout at defined breakpoints | Mockup shows desktop AND mobile at breakpoints defined in design system | HIGH | CSS Grid + media queries; breakpoints from SYS tokens or brief --platform flag |
| Component annotation comments | Each component block in HTML annotated with its system.md component name and props | LOW | `<!-- [LoginForm] props: email, onSubmit | source: WFR-login-v2 -->` |
| Playwright screenshot validation | If Playwright MCP available, take screenshots of each state for stakeholder review | MEDIUM | Screenshots stored alongside HTML; referenced in MCK-index.html |
| Figma push (when Figma MCP available) | Upload mockup tokens and layout to Figma for team collaboration | HIGH | Optional enhancement; Figma MCP integration required; degrade gracefully |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full JavaScript application logic | "Make it work like the real app" | Mockup is a design artifact, not a prototype; implementing logic is building, not mocking | Document interactions in annotation comments; use CSS-only state simulation; full logic is the implementation phase |
| Pixel-perfect image generation (PNG/SVG exports) | "Export screens as images for the deck" | Image generation from HTML is a Playwright/screenshot job, not a design stage output | Superpowers MCP browser preview or Playwright screenshot; don't bundle image generation into mockup skill |
| Auto-generating mockup without iterate completing | "Skip to hi-fi directly from wireframe" | Skipping critique/iterate means hi-fi embeds unvalidated design decisions that are expensive to change | Hard prerequisite: check for iterate artifact (hasIterate flag); warn if not present |
| Inline all design decisions (override tokens) | "This screen needs its own color" | One-off inline overrides create divergence from design system; handoff then has contradictions | Always use CSS custom properties from tokens.css; if a token is missing, add it to the system first |

**Output format (single screen HTML structure):**
```html
<!DOCTYPE html>
<!-- MCK-{screen}-v{N}.html -->
<!-- Generated by /pde:mockup | Source: WFR-{screen}-v{N}.html | Date: {date} -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Screen Name] — [Project] Mockup</title>
  <style>
    /* Inline tokens from assets/tokens.css */
    :root { --color-primary: ...; }
    /* Component styles using tokens */
    .login-form { padding: var(--space-md); }
  </style>
</head>
<body>
  <!-- [LoginForm] props: email, password, onSubmit | source: WFR-login-v2 annotation line 12 -->
  <main>
    <!-- DEFAULT STATE -->
    <section data-state="default"> ... </section>
    <!-- LOADING STATE -->
    <section data-state="loading" hidden> ... </section>
    <!-- ERROR STATE -->
    <section data-state="error" hidden> ... </section>
  </main>
</body>
</html>
```

**Complexity:** HIGH — applying design tokens, CSS interactive states, responsive layout, and annotation preservation across multiple screen files requires significant prompt engineering and validation.

---

## Skill E: HIG + WCAG Audit (`/pde:hig`)

**What it does:** Audits design artifacts against Apple Human Interface Guidelines (HIG) and WCAG 2.2 AA standards. Operates in two modes: light (fast check integrated into critique pass) and full (comprehensive gate before handoff).

**Primary output:** `.planning/design/review/HIG-audit-v{N}.md`

**Depends on:** Wireframes (WFR) or mockups (MCK) as subject; design system tokens (SYS) for color contrast; brief (for platform context — iOS vs web vs both)

**Dual mode:**
- Light mode: Called by `/pde:critique` with `--hig` flag; adds HIG/WCAG findings to the critique report
- Full mode: Standalone `/pde:hig` invocation; comprehensive gate before `/pde:handoff`

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Color contrast check (WCAG 1.4.3 AA) | Contrast failure is the #1 most common WCAG violation; any audit tool checks this | LOW | Text on background must be ≥4.5:1 (normal) or ≥3:1 (large); read from tokens.css |
| Focus visibility check (WCAG 2.4.11) | New in WCAG 2.2; focus indicators must be visible; often missing in custom designs | LOW | Check that :focus styles exist; flag if focus-visible only without :focus fallback |
| Touch target sizing (HIG + WCAG 2.5.8) | iOS HIG: 44×44pt minimum; WCAG 2.5.8 new in 2.2; critical for mobile | LOW | Check all interactive elements in wireframes/mockups for target size annotations |
| Form labels (WCAG 1.3.1, 3.3.2) | Every input must have a visible or programmatic label; missing labels are ubiquitous | LOW | Check wireframe annotations for label elements; flag placeholders used as labels |
| Heading hierarchy (WCAG 1.3.1) | h1 > h2 > h3 — skipping levels is a structural error | LOW | Check each screen wireframe/mockup for heading level notes |
| Severity-rated findings | Critical (blocks access), Major (significant barrier), Minor (friction), Nit (best practice) | LOW | Same severity typology as /pde:critique for consistency |
| HIG compliance check (when platform = ios/ipados) | Apple App Review checks HIG compliance; violations cause rejection | MEDIUM | Navigation patterns, safe area respect, system font usage, SF Symbols reference |
| Remediation suggestion per finding | Finding without fix is noise; remediation is what makes the audit actionable | MEDIUM | "Issue: [what] → Fix: [how]" per finding |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dual-mode architecture (light in critique, full standalone) | Light check catches critical issues early without cost of full audit; full audit is comprehensive gate | HIGH | Light mode: ~10 highest-impact checks; Full mode: all 87 WCAG 2.2 AA criteria coverage |
| Platform-aware audit scope | iOS HIG rules differ from web WCAG; platform from DESIGN-STATE.md controls which rules apply | MEDIUM | platform=web → WCAG only; platform=ios → HIG + WCAG; platform=web,ios → both |
| Axe MCP integration for automated detection | Axe a11y MCP can run programmatic checks on HTML mockups; catches contrast/ARIA issues automatically | HIGH | Baseline mode covers structure/semantic checks; Axe MCP adds automated contrast math and ARIA validation |
| WCAG criterion cross-reference | Every finding links to the specific WCAG criterion number and success criterion | LOW | "Issue: contrast → WCAG 1.4.3 (Level AA)" — enables engineers to verify |
| Pre-handoff gate integration | Full HIG audit is a required gate in `/pde:build` before handoff; cannot be skipped without `--force` | MEDIUM | hasHIG coverage flag in design manifest; handoff warns if not set |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Claiming "WCAG 2.2 AA compliant" from a text audit | Users want a compliance badge | Text/AI audits catch 30-57% of WCAG violations (automation limit); claiming compliance is false | Output is "audit findings — [N] issues found" not "compliant"; note manual testing requirement |
| Auditing against WCAG 3.0 | "Use the latest" | WCAG 3.0 is not published; guidelines are WCAG 2.2 AA as of 2026; referencing 3.0 creates confusion | Audit against WCAG 2.2 AA explicitly; flag any WCAG 3.0 candidate criteria as advisory only |
| Including non-design issues (server-side, backend) | "Check everything for accessibility" | HIG/WCAG audit in design stage covers design decisions only; runtime accessibility (ARIA live regions, focus management on navigation) is implementation scope | Clearly scope: "This audit covers design-stage artifacts; runtime accessibility testing belongs in /pde:test" |

**Output format:**
```markdown
# HIG + WCAG Audit: [Project Name]
**Mode:** Full / Light
**Platform:** [web / ios / web,ios]
**Artifacts audited:** [list of WFR or MCK files]
**Date:** [date]

## Summary
- Critical: N (blocks access)
- Major: N (significant barrier)
- Minor: N (friction)
- Nit: N (best practice)

## Findings

### [HIG-01] [Critical] Touch Target Too Small
**Criterion:** HIG: 44×44pt minimum / WCAG 2.5.8 (AA, new in 2.2)
**Screen:** [screen name]
**Finding:** [ButtonComponent] has 32×24pt tap target per annotation
**Fix:** Increase to minimum 44×44pt; use padding to expand hit area without changing visual size
**Confidence:** HIGH — size annotation explicit in wireframe

### [ACC-01] [Major] Insufficient Color Contrast
**Criterion:** WCAG 1.4.3 (Level AA)
**Token:** color-text-secondary on color-surface
**Finding:** Computed ratio 3.2:1; required 4.5:1 for normal text
**Fix:** Darken color-text-secondary from #767676 to #595959 (achieves 4.6:1)
**Confidence:** HIGH — computed from tokens.css values

## Platform Notes (iOS-specific if applicable)
- Safe area insets respected: [Yes/No — finding if No]
- System font (SF Pro) or documented custom font: [Yes/No]

## Audit Scope
- Automated checks (Axe MCP): [available/unavailable]
- Manual checks performed: color contrast, heading hierarchy, form labels, focus visibility, touch targets
- Manual checks NOT performed (require live browser + screen reader): keyboard traps, screen reader flow, live region announcements
```

**Complexity:** MEDIUM — structural checks against known criteria are systematic; HIGH for dual-mode architecture and Axe MCP integration path.

---

## Skill F: Tool/MCP Discovery (`/pde:recommend`)

**What it does:** Analyzes project context (STACK.md, PROJECT.md, DESIGN-STATE.md, active milestone) and recommends relevant MCPs and tools that would enhance the development workflow. Also surfaces any MCP tools not yet configured in the project's MCP environment.

**Primary output:** `.planning/design/strategy/REC-recommend-v{N}.md` (when run standalone); inline section appended to IDT-ideation (when called during ideation)

**Depends on:** STACK.md (tech stack detection), PROJECT.md (product type), DESIGN-STATE.md (MCP availability snapshot)

**Integration points:** Called by `/pde:ideate` to discover research MCPs at start of ideation; callable standalone at any time

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Current MCP availability check | Users expect to know what's active vs what's missing | LOW | Read MCP Availability from DESIGN-STATE.md; compare against known MCP list |
| Stack-matched tool recommendations | "Given you're using React + TypeScript, here are the relevant MCPs" | MEDIUM | STACK.md detection → recommendation mapping per tech |
| Installation instructions per recommendation | Recommendation without install path is not actionable | LOW | `claude mcp add [name] [command]` per recommendation |
| Rationale per recommendation | "Why do I need this?" — each recommendation explains the workflow benefit | LOW | "Playwright MCP: enables screenshot validation in /pde:wireframe and /pde:mockup" |
| Deduplication against already-installed MCPs | Don't recommend what's already there | LOW | Read DESIGN-STATE.md MCP Availability before recommending |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Context-aware recommendation (milestone + phase aware) | Recommendations differ based on where you are in the pipeline | MEDIUM | Mid-design: prioritize Playwright + Axe; pre-ideation: prioritize web search + Context7; pre-handoff: prioritize Figma |
| MCP tool search integration | With Claude Code's tool search feature (enabled by default), can discover MCPs via keyword search rather than only from known list | HIGH | Claude Code tool search defers tools; recommend can search for design-relevant MCP tools on demand |
| Confidence level per recommendation | Some MCP tools are well-documented (Context7, Playwright); others have unstable APIs | LOW | HIGH confidence for official Anthropic MCPs; MEDIUM for community MCPs |
| Priority ordering | Not all MCPs are equally valuable; rank by impact for this project type | LOW | P1 = universal (Sequential Thinking, Superpowers); P2 = design-specific (Playwright, Axe, Figma); P3 = optional |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-installing MCPs without confirmation | "Just set it up" | Installing MCPs modifies the user's Claude Code environment; requires explicit consent | Always present recommendations with install command; never auto-execute `claude mcp add` |
| Recommending MCPs for every possible use case | "Be comprehensive" | 20 recommendations creates decision paralysis; users install nothing | Top 5 recommendations sorted by impact for current context; full list in appendix |
| Recommending MCPs that conflict with user's constraints | "Here's the best tool" | Some MCPs require paid APIs, Docker, specific OS; context-blind recommendations create friction | Check STACK.md and .planning/config.json for constraints before recommending |

**Output format (standalone):**
```markdown
# Tool Recommendations: [Project Name]
**Context:** [current pipeline stage + active milestone]
**Generated:** [date]

## Currently Available MCPs
[From DESIGN-STATE.md MCP Availability snapshot]

## Recommended Additions

### P1 (High Impact — Universal)

#### Sequential Thinking MCP
**Why:** Enables multi-step reasoning in ideation, critique, and handoff stages
**Benefit:** Ideation quality improves significantly; critique finds more issues
**Install:** `claude mcp add sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking`
**Confidence:** HIGH — official Anthropic MCP

### P2 (High Impact — Design Pipeline)

#### Playwright MCP
**Why:** Screenshot validation in /pde:wireframe and /pde:mockup
**Benefit:** Catches layout rendering issues before stakeholder review
**Install:** `claude mcp add playwright npx -y @modelcontextprotocol/server-playwright`
**Confidence:** HIGH — official Anthropic MCP

[...]

## Full MCP Catalog
[Table: MCP name, purpose, confidence, install command]
```

**Complexity:** LOW — primarily reading existing state files and matching against a recommendation catalog; MEDIUM when MCP tool search is used for dynamic discovery.

---

## Expanded Orchestrator (`/pde:build` v1.2)

**What it does:** Extends the existing 7-stage build pipeline to a 12-stage pipeline covering the full ideate → competitive → opportunity → brief → system → flows → wireframe → critique(+HIG light) → iterate → mockup → hig(full) → handoff sequence.

**Depends on:** All 12 skill workflows; design manifest coverage flags

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Resume from last complete stage (all 12 stages) | Existing behavior must be preserved and extended | MEDIUM | Coverage flags: hasIdeation, hasCompetitive, hasOpportunity + existing 7 |
| New upstream stages optional (enter at brief) | Not every project needs ideation + competitive first; brief remains a valid entry point | LOW | If brief exists and ideation/competitive/opportunity are absent, treat them as skipped |
| New downstream stages in correct order | mockup → hig(full) → handoff order must be enforced | LOW | mockup requires iterate (hasIterate); hig requires mockup or wireframes; handoff requires hig |
| `--dry-run` shows all 12 stages with status | Users need visibility into the full pipeline state | LOW | Extend existing stage table from 7 to 12 rows |
| HIG light mode triggered during critique stage | Critique now includes a fast HIG check; orchestrator passes `--hig` flag to critique | MEDIUM | Adds HIG findings to critique report without a separate stage |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Configurable entry point (`--from=brief`) | Power users can start anywhere without dry-running through all 12 stages | MEDIUM | `--from=[stage]` flag skips pre-stages; records in run log |
| Stage grouping display | Three groups: Research (ideate/competitive/opportunity), Design (brief/system/flows/wireframe), Quality (critique/iterate/mockup/hig/handoff) | LOW | Cleaner user experience than a flat 12-stage list |
| Recommend integration pre-ideation | Before running ideate, orchestrator calls recommend to surface relevant research MCPs | MEDIUM | Ensures user has best tools before starting |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-running all 12 stages without gates | "One click to design" | Without human verification at stage transitions, errors compound; a bad ideation → bad competitive → bad brief → everything downstream is wrong | Human verification gates remain between each stage group; no skipping gates without --force |
| Treating research stages as required for existing projects | "Everything must run ideation first" | Projects that already have a brief and flows shouldn't be forced through ideation | Detection: if BRF artifact exists, research stages marked as optional/skipped by default |

**Updated pipeline stage table:**
```
Stage | Skill              | Coverage Flag     | Status
1/12  | /pde:ideate        | hasIdeation       | complete / pending / skipped
2/12  | /pde:competitive   | hasCompetitive    | complete / pending / skipped
3/12  | /pde:opportunity   | hasOpportunity    | complete / pending / skipped
4/12  | /pde:brief         | Glob BRF-brief    | complete / pending
5/12  | /pde:system        | hasDesignSystem   | complete / pending
6/12  | /pde:flows         | hasFlows          | complete / pending
7/12  | /pde:wireframe     | hasWireframes     | complete / pending
8/12  | /pde:critique+HIG  | hasCritique       | complete / pending
9/12  | /pde:iterate       | hasIterate        | complete / pending
10/12 | /pde:mockup        | hasMockup         | complete / pending
11/12 | /pde:hig (full)    | hasHIG            | complete / pending
12/12 | /pde:handoff       | hasHandoff        | complete / pending
```

**Complexity:** MEDIUM — extend existing orchestrator pattern; does not add skill logic, only stage detection and invocation. New coverage flags (hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHIG) must be added to design manifest schema.

---

## Feature Dependencies

```
[/pde:ideate — IDT-ideation]
    └──feeds──> [/pde:competitive] (problem space context)
    └──feeds──> [/pde:brief] (recommended direction as seed)
    └──integrates──> [/pde:recommend] (tool discovery at ideation start)

[/pde:competitive — CMP-competitive]
    └──feeds──> [/pde:opportunity] (gap list as opportunity inputs)
    └──feeds──> [/pde:brief] (positioning context)

[/pde:opportunity — OPP-opportunity]
    └──feeds──> [/pde:brief] (scored opportunities as goal inputs)

[/pde:brief → /pde:system → /pde:flows → /pde:wireframe — EXISTING]
    └──required by──> [/pde:critique]
    └──required by──> [/pde:mockup] (wireframes as source)

[/pde:critique (+ HIG light)]
    └──required by──> [/pde:iterate]

[/pde:iterate — updated wireframes]
    └──required by──> [/pde:mockup] (hi-fi source)
    └──strongly recommended by──> [/pde:hig] (full)

[/pde:mockup — MCK artifacts]
    └──required by (soft)──> [/pde:hig] (full audit on hi-fi; can also audit WFR if no MCK)
    └──feeds──> [/pde:handoff] (hi-fi annotations for implementation spec)

[/pde:hig (full) — HIG-audit]
    └──gate before──> [/pde:handoff] (accessibility gate in build orchestrator)

[/pde:recommend]
    └──enhances──> [/pde:ideate] (called inline)
    └──standalone——> [any stage] (callable anytime)

[SYS tokens.css]
    └──required by──> [/pde:mockup] (token application)
    └──required by──> [/pde:hig] (contrast calculations)
```

### Dependency Notes

- **Upstream research stages (ideate, competitive, opportunity) are optional but synergistic:** Each stage's output is consumed by the next and ultimately seeds brief.md. If a project starts at brief without running them, brief quality suffers but the pipeline works.
- **Mockup requires iterate completion:** Running mockup before critique/iterate means encoding unvalidated design decisions in hi-fi form — expensive to change. This is a soft warning in standalone mode, a hard gate in build mode.
- **HIG audit can run on wireframes OR mockups:** Full audit is richer against mockup (has actual token values); light audit in critique runs against wireframes. Both modes share the same output format.
- **Recommend has no hard dependencies:** It reads context but doesn't require any design artifacts. It can run before anything else.
- **Design manifest schema must be extended:** Five new coverage flags (hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHIG) must be added to pde-tools.cjs design coverage-check before any new skill can set them.

---

## MVP Definition

### Launch With (v1.2)

All six new skills at table-stakes feature level, standalone AND orchestrated through extended `/pde:build`.

- [ ] `/pde:ideate` — multi-phase diverge/converge with HMW reframes, assumption capture, ranked output
- [ ] `/pde:competitive` — 3 direct + 2 indirect competitor evaluation, feature matrix, gap identification
- [ ] `/pde:opportunity` — RICE scoring with calibrated rationale and MVP candidate output
- [ ] `/pde:mockup` — hi-fi HTML/CSS from wireframes with token application, interactive states, self-contained
- [ ] `/pde:hig` — dual mode (light in critique, full standalone), WCAG 2.2 AA + platform HIG, severity-rated
- [ ] `/pde:recommend` — MCP availability check, stack-matched recommendations, install commands
- [ ] `/pde:build` expanded to 12 stages with new coverage flags in design manifest

### Add After Validation (v1.2.x)

- [ ] Concept combination (hybrid) pass in ideation — needs proven single-phase output quality first
- [ ] WebSearch MCP integration in competitive — live competitor data; requires verifiable cite per claim
- [ ] Axe MCP integration in HIG — automated contrast/ARIA detection; depends on Axe MCP stability
- [ ] Figma MCP push from mockup — depends on Figma MCP availability; defer until MCP integration milestone
- [ ] Sensitivity analysis in opportunity scoring — add after user feedback on base RICE output

### Future Consideration (v2+)

- [ ] Interview synthesis in ideation — feeding user research transcripts into ideation context
- [ ] Competitive monitoring (re-run competitive at intervals) — requires persistent state and scheduling
- [ ] Full WCAG 3.0 criteria when published — standard not yet finalized as of 2026

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `/pde:ideate` — multi-phase diverge/converge | HIGH | HIGH | P1 |
| `/pde:competitive` — landscape evaluation | HIGH | MEDIUM | P1 |
| `/pde:opportunity` — RICE scoring | HIGH | MEDIUM | P1 |
| `/pde:mockup` — hi-fi HTML/CSS from wireframes | HIGH | HIGH | P1 |
| `/pde:hig` — dual-mode audit | HIGH | MEDIUM | P1 |
| `/pde:recommend` — tool discovery | MEDIUM | LOW | P1 |
| `/pde:build` extended to 12 stages | HIGH | MEDIUM | P1 |
| HIG light mode in critique | MEDIUM | LOW | P1 (adds to existing skill) |
| WebSearch MCP in competitive | MEDIUM | MEDIUM | P2 |
| Axe MCP in HIG | MEDIUM | MEDIUM | P2 |
| Figma push from mockup | HIGH | HIGH | P2 (v1.2.x — MCP dependency) |
| Concept hybrid synthesis in ideation | MEDIUM | MEDIUM | P2 |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Add after v1.2 validated; candidate for v1.2.x or v1.3
- P3: v2+ consideration

---

## Competitor Feature Analysis

| Feature | Figma AI | v0 / Bolt | UX Pilot / Uizard | Notion AI | PDE v1.2 Approach |
|---------|----------|-----------|-------------------|-----------|-------------------|
| Multi-phase ideation | No | No | No | No | `/pde:ideate` — diverge/converge with convergence scoring |
| Competitive analysis | No | No | No | No | `/pde:competitive` — structured matrix + gap identification |
| RICE opportunity scoring | No | No | No | No | `/pde:opportunity` — full RICE with calibrated rationale |
| Hi-fi mockup from wireframe | Yes (Figma native) | Yes (generates UI) | Partial | No | `/pde:mockup` — tokens-applied HTML/CSS; file:// compatible |
| HIG/WCAG audit | No (manual) | No | Partial (contrast only) | No | `/pde:hig` — dual mode, 2.2 AA, severity-rated, platform-aware |
| Tool/MCP discovery | No | No | No | No | `/pde:recommend` — stack-aware, install commands |
| File-based state / markdown | No | No | No | No | Core PDE differentiator unchanged |
| Integrated with dev workflow engine | No | Partial | No | No | Full pipeline ideate → handoff in same `.planning/` dir |

**Key differentiation v1.2 adds:** No tool on the market runs a complete ideate → competitive → opportunity → design → quality → handoff pipeline in a text-native, file-based, development-workflow-integrated form. Figma has hi-fi mockup but requires Figma app, has no ideation or RICE scoring, and does not produce developer handoff files. PDE v1.2 closes the gap between research, design, and implementation in a single plugin.

---

## Sources

- [Progressive Ideation using Agentic AI Framework — arxiv 2601.00475](https://arxiv.org/html/2601.00475v1) — multi-phase ideation framework; concept combination improves novelty (MEDIUM confidence — preprint)
- [Convergent vs divergent thinking: practical team guide 2026 — Monday.com](https://monday.com/blog/project-management/convergent-vs-divergent-thinking/) — diverge/converge workflow structure (MEDIUM confidence — industry source)
- [RICE Scoring Model — Intercom (original)](https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/) — RICE formula and criteria definition; authoritative primary source (HIGH confidence)
- [RICE Prioritization Framework — ProductPlan glossary](https://www.productplan.com/glossary/rice-scoring-model/) — standard RICE component definitions; score calculation (HIGH confidence)
- [WCAG 2.2 Checklist 2026 — LevelAccess](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/) — WCAG 2.2 AA criteria list; automated coverage limits (HIGH confidence)
- [Accessibility Audit Checklist 50+ WCAG Checks 2026 — web-accessibility-checker.com](https://web-accessibility-checker.com/en/blog/accessibility-audit-checklist) — automated vs manual scope; 30-57% automation coverage stat (MEDIUM confidence)
- [Apple Human Interface Guidelines — Apple Developer](https://developer.apple.com/design/human-interface-guidelines/) — authoritative HIG reference; Liquid Glass 2025-2026 updates (HIGH confidence)
- [Apple HIG: Meet the new Human Interface Guidelines — Apple Developer News](https://developer.apple.com/news/?id=v8a3aetj) — HIG 2025 structural updates (HIGH confidence — official source)
- [Competitive Analysis Framework — Toptal Product Designer Guide](https://www.toptal.com/product-managers/product-consultant/product-designer-guide-to-competitive-analysis) — competitive analysis dimensions for product designers (MEDIUM confidence)
- [MCP Tool Search — Claude Code Docs](https://code.claude.com/docs/en/mcp) — deferred tool discovery, 85% token reduction; tool search enabled by default (HIGH confidence — official Anthropic docs)
- [MCP Tool Discovery Feature Request — Claude Code GitHub #27208](https://github.com/anthropics/claude-code/issues/27208) — hierarchical deferred tool discovery context (MEDIUM confidence — issue thread)
- [High Fidelity Wireframes — Moqups Blog](https://moqups.com/blog/high-fidelity-wireframes/) — hi-fi wireframe vs mockup distinction; design system as bridge (MEDIUM confidence)
- [A Comprehensive Guide to Wireframing and Prototyping — Smashing Magazine](https://www.smashingmagazine.com/2018/03/guide-wireframing-prototyping/) — fidelity levels and progression; HTML/CSS as final prototyping medium (HIGH confidence — authoritative source)

---

*Feature research for: v1.2 advanced design skills (ideate, competitive, opportunity, mockup, hig, recommend + build orchestrator expansion)*
*Researched: 2026-03-16*
