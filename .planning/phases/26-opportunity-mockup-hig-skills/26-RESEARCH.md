# Phase 26: Opportunity, Mockup & HIG Skills — Research

**Researched:** 2026-03-16
**Domain:** Claude Code plugin skill authoring — three workflow files replacing planned stubs, covering RICE opportunity scoring, hi-fi HTML/CSS mockup generation, and WCAG 2.2 AA / HIG audit
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OPP-01 | User can score feature opportunities using RICE framework via `/pde:opportunity` | Command stub exists; workflow stub replaces "Status: Planned" content; templates/opportunity-evaluation.md fully specifies output format |
| OPP-02 | RICE scoring collects interactive user input for each dimension | strategy-frameworks.md defines all scale tables; workflow guides interactive Reach/Impact/Confidence/Effort collection via conversational steps |
| OPP-03 | Opportunity output includes sensitivity analysis and priority bucketing | templates/opportunity-evaluation.md already has Scenario Models and Now/Next/Later buckets sections with exact format |
| MOCK-01 | User can generate hi-fi interactive HTML/CSS mockup from refined wireframe via `/pde:mockup` | Command stub exists; templates/mockup-spec.md defines spec artifact; wireframe.md provides HTML output pattern to evolve |
| MOCK-02 | Mockup applies design tokens from tokens.css with CSS-only interactive states | tokens.css at `.planning/design/assets/tokens.css`; wireframe.md uses `../../assets/tokens.css` link pattern; interaction-patterns.md has CSS-only state guidance |
| MOCK-03 | Mockup preserves wireframe annotations as HTML comments for handoff consumption | wireframe.md uses HTML comment annotations pattern; mockup must carry forward and expand these as traceability markers |
| HIG-01 | User can run full WCAG 2.2 AA + HIG compliance audit via `/pde:hig` | Command stub exists; templates/hig-audit.md fully specifies output format; wcag-baseline.md and interaction-patterns.md provide complete criterion knowledge |
| HIG-02 | HIG light mode integrates into critique stage as enhanced accessibility perspective | critique.md has Perspective 3 (Accessibility) inline logic that must be refactored to call `/pde:hig --light`; STATE.md notes "HIG skill must be complete before critique.md is updated" |
| HIG-03 | HIG findings are severity-rated and platform-aware | templates/hig-audit.md has Platform field; wcag-baseline.md covers WCAG 2.2 new criteria; interaction-patterns.md covers Swift/Apple platform variants |
</phase_requirements>

---

## Summary

Phase 26 implements three new skills — `/pde:opportunity`, `/pde:mockup`, and `/pde:hig` — all as fully realized workflow files replacing the "Status: Planned" stubs in their respective command files. This is a pure prompt-engineering phase: no new Node.js code, no new npm packages, no schema changes (Phase 24 handles all of that). The infrastructure — pde-tools.cjs, design.cjs, the 13-field manifest schema, and the `ux/mockups` output directory — is complete.

The three skills are architecturally different in their complexity. The opportunity skill is primarily a conversation-driven scoring workflow with rich artifact output (scored candidates, sensitivity scenarios, Now/Next/Later buckets). The mockup skill is an HTML generation skill — the hi-fi successor to wireframe, consuming the wireframe's HTML as input and applying tokens plus CSS-only interactions. The HIG skill is a multi-criteria checklist evaluator that both runs standalone as a full audit and runs as a `--light` mode called by `/pde:critique` for its Accessibility perspective.

The HIG skill's `--light` integration with critique is the highest-risk item in this phase. The critique workflow currently has Perspective 3 (Accessibility) implemented inline. Phase 26 must: (1) ship `/pde:hig` as a complete skill, (2) ship a `--light` flag that produces a condensed accessibility summary matching critique's exact severity ratings (critical/major/minor/nit), and (3) update `workflows/critique.md` to delegate its Accessibility perspective to `/pde:hig --light` instead of using inline WCAG logic. The success criterion is explicit: standalone `/pde:hig` output and critique's accessibility findings must use identical severity ratings for the same issue.

**Primary recommendation:** Build all three skills in dependency order — OPP first (isolated, no inter-skill dependencies), then MOCK (depends on wireframe output path), then HIG (must be complete before critique.md is modified). Treat the critique.md delegation update as a fourth deliverable in the same phase.

---

## Standard Stack

### Core

| Component | Source | Purpose | Authority |
|-----------|--------|---------|-----------|
| Skill command file | `commands/{name}.md` | YAML frontmatter + `@workflows/{name}.md` delegation | All 11 existing implemented skills follow this pattern |
| Workflow file | `workflows/{name}.md` | Full skill logic in `<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, `<flags>`, `<process>`, `<output>` sections | `workflows/critique.md` and `workflows/wireframe.md` are canonical references for this phase |
| Template files | `templates/opportunity-evaluation.md`, `templates/mockup-spec.md`, `templates/hig-audit.md` | Output artifact structure — all three already exist with full section definitions | Confirmed by direct file read: all three templates are complete |
| pde-tools.cjs | `bin/pde-tools.cjs` | design ensure-dirs, lock-acquire, lock-release, coverage-check, manifest-update, manifest-set-top-level | Phase 24 extended to include all 13 coverage flags and ux/mockups directory |
| design-manifest.json | `.planning/design/design-manifest.json` | 13-field designCoverage schema — hasOpportunity, hasMockup, hasHigAudit are the Phase 26 flags | Phase 24 SUMMARY.md confirms 13-field schema is live in bin/lib/design.cjs and templates/design-manifest.json |

### Supporting

| Component | Source | Purpose | When to Use |
|-----------|--------|---------|-------------|
| `references/strategy-frameworks.md` | Existing reference | Full RICE formula, design extensions, scenario modeling, calibration guidance | Load via `@` in opportunity workflow |
| `references/wcag-baseline.md` | Existing reference | All ~56 WCAG 2.2 Level A and AA criteria with quick-check rules | Load via `@` in HIG workflow (both full and --light modes) |
| `references/interaction-patterns.md` | Existing reference | ARIA patterns, keyboard navigation, Swift/Apple HIG patterns | Load via `@` in HIG workflow |
| `references/mcp-integration.md` | Existing reference | Probe/use/degrade patterns for Sequential Thinking, Axe, Playwright MCPs | Load via `@` in all three workflows |
| `references/skill-style-guide.md` | Existing reference | Output formatting, flags, error patterns, summary table | Load via `@` in all three workflows |
| `references/web-modern-css.md` | Existing reference | Modern CSS patterns for hi-fi mockup generation | Load via `@` in mockup workflow |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS-only interactive states | JavaScript interactions | Phase requirement MOCK-02 explicitly requires CSS-only — this is locked, not a choice |
| Calling `/pde:hig --light` from critique | Keeping critique's inline Accessibility perspective | SC5 requires identical severity ratings; the only safe way to guarantee this is delegation — inline logic diverges over time |
| Single HTML file per screen (wireframe pattern) | Multi-file mockup with shared CSS/JS bundle | mockup-spec.md template references `ux/mockups/mockup.js` and `ux/mockups/mockup.css` as shared bundle; but MOCK-01 says "self-contained HTML/CSS file" — need to verify at planning time |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

Phase 26 adds/modifies these files:

```
commands/
  opportunity.md      # UPDATED: replace stub with @workflows/opportunity.md
  mockup.md           # UPDATED: replace stub with @workflows/mockup.md
  hig.md              # UPDATED: replace stub with @workflows/hig.md

workflows/
  opportunity.md      # NEW: full RICE scoring pipeline
  mockup.md           # NEW: hi-fi HTML/CSS mockup generation pipeline
  hig.md              # NEW: WCAG 2.2 AA + HIG audit pipeline (--light flag for critique delegation)
  critique.md         # MODIFIED: Perspective 3 (Accessibility) delegated to /pde:hig --light

Output paths:
  .planning/design/strategy/OPP-opportunity-v{N}.md   # opportunity evaluation
  .planning/design/ux/mockups/mockup-{screen}.html    # per-screen hi-fi mockup
  .planning/design/ux/mockups/index.html              # navigation page
  .planning/design/review/HIG-audit-v{N}.md           # HIG audit report
```

No new directories. No new binaries. No schema changes.

### Pattern 1: Skill Command File (thin stub, identical for all three)

**What:** The command file contains only YAML frontmatter and a `<process>` block with `@workflows/{name}.md` delegation.
**When to use:** Always — every implemented PDE skill follows this exact pattern.

```markdown
---
name: pde:opportunity
description: Score feature opportunities using RICE and market signal analysis
argument-hint: ""
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Execute the /pde:opportunity command.
</objective>

<process>
@workflows/opportunity.md
@references/skill-style-guide.md
</process>
```

Source: `commands/brief.md`, `commands/critique.md` — exact same structure used by all 11 implemented skills.

### Pattern 2: 7-Step Workflow Pipeline (canonical)

**What:** All three skills follow the same 7-step pipeline established in critique.md and wireframe.md.
**When to use:** Every new PDE skill workflow file.

```
Step 1/7: Initialize design directories (pde-tools.cjs design ensure-dirs)
Step 2/7: Check prerequisites, discover source artifacts, version gate
Step 3/7: Probe MCP availability (check --no-mcp and --no-{name} flags first)
Step 4/7: Core skill logic (RICE scoring / mockup generation / WCAG audit)
Step 5/7: Write versioned artifact with lock-acquire / lock-release
Step 6/7: Update domain DESIGN-STATE (create if absent)
Step 7/7: Update root DESIGN-STATE + manifest + coverage flag (read-before-set)
```

Source: `workflows/critique.md` and `workflows/wireframe.md` — both confirmed to follow this structure.

### Pattern 3: 13-Field Coverage Write (read-before-set — CRITICAL)

**What:** Every v1.2 skill reads the current coverage flags before writing, then writes all 13 fields with only its own flag set to `true`.
**When to use:** All three skills in Phase 26 — setting `hasOpportunity`, `hasMockup`, `hasHigAudit` respectively.

```bash
# Step 1: Read current coverage state
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Step 2: Parse all 13 current values, default absent fields to false
# (parse from JSON output: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec,
#  hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity,
#  hasMockup, hasHigAudit, hasRecommendations)

# Step 3: Write full 13-field object, setting only THIS skill's flag to true
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":true,"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

Source: `workflows/critique.md` Step 7c — exact implementation confirmed complete in Phase 24.

### Pattern 4: Canonical Field Order (CRITICAL — must not deviate)

The 13-field canonical order from Phase 24 SUMMARY.md (24-02) is:

```
hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate,
hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit,
hasRecommendations
```

This order must be used verbatim in every manifest-set-top-level call. The exact flag names for Phase 26 skills are `hasOpportunity` (OPP), `hasMockup` (MCK), and `hasHigAudit` (HIG).

Source: Phase 24 SUMMARY.md 24-02, canonical field order confirmed.

### Pattern 5: Opportunity Scoring Interaction Pattern

**What:** The opportunity skill collects Reach, Impact, Confidence, and Effort values interactively from the user per candidate before computing scores.
**When to use:** OPP workflow Step 4.

```markdown
## Interactive Input Collection Pattern

For each candidate in the candidates list:

Display: "Scoring: {candidate_name}"

Ask user:
1. "Reach: How many users affected in one quarter? (e.g., 10000 = all users, 5000 = majority, 1000 = significant segment)"
   → Accept integer. Store as Reach.
2. "Impact: How much does this move the needle per user? [3=Massive / 2=High / 1=Medium / 0.5=Low / 0.25=Minimal]"
   → Accept one of: 3, 2, 1, 0.5, 0.25. Store as Impact.
3. "Confidence: How sure are you about these estimates? [1.0=High (data) / 0.8=Medium (some data) / 0.5=Low (gut feel)]"
   → Accept one of: 1.0, 0.8, 0.5. Store as Confidence.
4. "Effort: T-shirt size estimate? [XS=0.5mo / S=1mo / M=2mo / L=4mo / XL=8mo]"
   → Accept T-shirt label, map to numeric. Store as Effort.
5. "UX Differentiation: Design advantage over competitors? [3=Breakthrough / 2=Strong / 1=Moderate / 0=None]"
   → Accept 0-3. Store as UX_Diff.
6. "Accessibility Impact: [3=Critical barrier removed / 2=Significant / 1=Moderate / 0=None]"
   → Accept 0-3. Store as A11y_Impact.
7. "Design System Leverage: [3=Creates 5+ reusable components / 2=Moderate / 1=Low / 0=None]"
   → Accept 0-3. Store as DS_Leverage.

After each candidate: compute scores immediately and show preview.
After all candidates: show ranked table, then sensitivity scenarios.
```

Source: `references/strategy-frameworks.md` — all scales defined there. `templates/opportunity-evaluation.md` — defines the output format.

### Pattern 6: Mockup HTML Generation (hi-fi evolution of wireframe)

**What:** Mockup HTML files are self-contained (no server required), link to tokens.css, and use CSS-only `:hover`, `:focus`, `:active`, `:checked` pseudo-classes for interactive states. Wireframe annotations are preserved as HTML comments.
**When to use:** MCK workflow Step 4.

```html
<!-- Source: wireframe-{screen}-v{N}.html | PDE Wireframe annotation: {annotation text} -->
<!-- WIREFRAME-ANNOTATION: {original annotation from wireframe file} -->
<header class="app-header" role="banner">
  <!-- ... -->
</header>

<!-- CSS-only interactive state example (no JavaScript required) -->
<style>
  .btn-primary:hover { background-color: var(--color-primary-600); }
  .btn-primary:focus-visible {
    outline: 3px solid var(--color-focus-ring);
    outline-offset: 2px;
  }
  .btn-primary:active { transform: scale(0.98); }
</style>
```

Token link pattern (same as wireframe):
```html
<link rel="stylesheet" href="../../assets/tokens.css">
```

Source: `workflows/wireframe.md` Steps 4-5 — HTML structure, tokens link, annotation comment pattern.

### Pattern 7: HIG --light Mode (critique delegation interface)

**What:** When called with `--light`, the HIG skill produces a condensed accessibility summary using the same severity ratings (critical/major/minor/nit) as critique.md. The critique workflow invokes this mode to replace its inline Perspective 3 logic.
**When to use:** `--light` flag triggers abbreviated pipeline — skip POUR table, skip component-grouped view, output only the findings list in critique-compatible format.

```markdown
## --light Mode Output Contract

When --light is active, /pde:hig produces:
- 5 mandatory checks only: color contrast (1.4.3), focus visibility (2.4.11),
  touch targets (2.5.8), form labels (all inputs labeled), heading hierarchy
- Same severity scale as critique: critical / major / minor / nit
- Same finding format as critique Perspective 3:
  | Severity | Effort | Location | Issue | Suggestion | Reference |
- No POUR compliance table
- No component-grouped view
- No platform-tailored HIG document section
- Produces NO artifact file — returns findings inline for critique to embed

## Critique Delegation Pattern (in critique.md Perspective 3)

IF HIG_WORKFLOW_AVAILABLE:
  Run: /pde:hig --light on current wireframe/mockup files
  Embed returned findings as Accessibility perspective findings
  Tag: [HIG skill — /pde:hig --light]
ELSE (HIG skill file not found):
  Fall back to inline WCAG checklist from wcag-baseline.md
  (This fallback is temporary until Phase 26 lands)
```

Source: Phase 26 success criteria SC5 — "running /pde:critique now delegates its HIG perspective to /pde:hig --light rather than applying inline logic; critique output and standalone HIG output use identical severity ratings for the same issue."

### Anti-Patterns to Avoid

- **Setting coverage flag without reading coverage-check first:** `manifest-set-top-level` replaces the ENTIRE `designCoverage` object — skipping read clobbers other skills' flags.
- **Writing root DESIGN-STATE without a write lock:** every root DESIGN-STATE write must go through `lock-acquire` / `lock-release`.
- **Using --light for /pde:hig output files:** `--light` mode must NOT write a HIG-audit artifact. It provides inline findings only for critique to consume.
- **Critique's inline accessibility logic remaining after Phase 26:** critique.md Perspective 3 must be updated to delegate to `/pde:hig --light` — leaving both paths active causes identical issues to be rated differently.
- **Hard-failing when Axe MCP unavailable:** HIG skill must complete using manual WCAG checklist from wcag-baseline.md. Axe is enhancement, not requirement.
- **JavaScript in mockup output:** MOCK-02 explicitly requires CSS-only interactive states. Do not use `<script>` tags or event listeners for state transitions.
- **Mockup not tracing to wireframe version:** MOCK-03 requires wireframe annotations as HTML comments traceable to the originating wireframe version. Each screen's mockup must embed `<!-- WIREFRAME-SOURCE: wireframe-{screen}-v{N}.html -->` as the first HTML comment inside `<body>`.
- **Missing lint-required sections:** Every workflow must contain `<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, and `<process>`. Skill codes: OPP, MCK, HIG.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RICE score calculation | Inline formula | Load `@references/strategy-frameworks.md` | Formula, scale tables, calibration rules, design extensions, and composite formula already fully defined |
| Sensitivity/scenario analysis | Custom logic | Use template format from `templates/opportunity-evaluation.md` Scenario Models section | Format already defined with before/after rank-change table |
| Opportunity bucket logic | Custom sorting | Use Now/Next/Later criteria from `templates/opportunity-evaluation.md` | Bucket criteria (top 30%/60%, Effort threshold, blocker check) already defined |
| WCAG criterion checklist | Build from scratch | Load `@references/wcag-baseline.md` | All ~56 WCAG 2.2 criteria with quick-check rules, techniques, common failures, and Swift/Apple HIG variants already documented |
| ARIA pattern requirements | Inline definitions | Load `@references/interaction-patterns.md` | Tier 1-3 ARIA patterns with keyboard, focus, ARIA attributes, web and Swift examples already documented |
| Design directory initialization | Custom mkdir | `pde-tools.cjs design ensure-dirs` | Creates all 8 dirs including `ux/mockups` introduced in Phase 24 |
| Write lock management | File-based mutex | `pde-tools.cjs design lock-acquire` / `lock-release` | 60s TTL, retry logic, battle-tested across all v1.1 skills |
| Manifest artifact registration | Direct JSON writes | `pde-tools.cjs design manifest-update` | 7 calls pattern per artifact (code, name, type, domain, path, status, version) — same as critique.md and recommend.md |
| Coverage flag update | Dot-notation JSON patch | `pde-tools.cjs design coverage-check` then `manifest-set-top-level` | Must read-before-set to avoid clobbering other skills' flags |
| MCP probe/use/degrade | Custom retry logic | Follow `mcp-integration.md` probe pattern exactly | Timeout values, retry counts, and log format already standardized |
| Mockup design tokens CSS | Generate from scratch | Link `../../assets/tokens.css` | Exists at `.planning/design/assets/tokens.css` when design system has been run; mockup links it exactly as wireframe does |

**Key insight:** This phase is 100% prompt engineering. All infrastructure, templates, reference content, and tooling is complete. The task is to write high-quality workflow files that follow established patterns and fully implement the stub commands.

---

## Common Pitfalls

### Pitfall 1: Coverage Flag Name for HIG Must Be `hasHigAudit` (Not `hasHIG` or `hasHig`)

**What goes wrong:** The canonical flag name for HIG is `hasHigAudit` (mixed case "ig", camelCase suffix). Multiple documents use different names ("hasHIG", "hasHig", "hasHigAudit").
**Why it happens:** HIG is an acronym, making camelCase ambiguous. Phase 24 resolution: use `hasHigAudit` with mixed case.
**How to avoid:** Use `hasHigAudit` — this is confirmed in Phase 24 SUMMARY.md 24-01: "adds hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations."
**Warning signs:** coverage-check returns `hasHigAudit: false` after HIG skill run, or manifest has `hasHIG: true` (wrong capitalization).

### Pitfall 2: Mockup Skill Code Must Be MCK (Not MOCK or MOK)

**What goes wrong:** The natural skill code for "mockup" is "MOCK" or "MOK" but the template file uses "MCK".
**Why it happens:** `templates/mockup-spec.md` frontmatter says `Skill: /pde:mockup (MCK)` — MCK is the registered code.
**How to avoid:** Use skill code MCK in `<skill_code>` section and in all manifest-update calls. Skill domain is `ux` (output path is `ux/mockups/`).
**Warning signs:** LINT-010 fails: "skill_code in file does not match entry in skill-registry.md."

### Pitfall 3: The `design-manifest.json` in `.planning/design/` Is the Initialized Instance, Not the Template

**What goes wrong:** The `.planning/design/design-manifest.json` file shows only 7 coverage flags because it was initialized BEFORE Phase 24 ran. The template at `templates/design-manifest.json` was updated by Phase 24 to 13 fields.
**Why it happens:** Phase 24 updated the template used for new projects. Existing project instances are not auto-migrated — they must be manually updated or re-initialized.
**How to avoid:** The Phase 26 skills must handle both cases: (1) coverage-check returns 7 fields (old instance), or (2) returns 13 fields (Phase 24 migrated). The read-before-set pattern handles this correctly — absent fields default to `false`. This is not a bug in the workflow authoring — just understanding the context.
**Warning signs:** coverage-check returns `{"hasDesignSystem": false, ...}` without the 6 v1.2 flags — this is the pre-Phase-24 initialized instance and is still valid to work with.

### Pitfall 4: Opportunity Sensitivity Analysis Must Show Rank Changes, Not Just Score Changes

**What goes wrong:** `templates/opportunity-evaluation.md` Scenario Models section shows `Rank Change` column. A naive implementation shows `Adjusted Score` only without computing rank reorders.
**Why it happens:** It's easy to compute adjusted scores without sorting the full candidate set and computing rank deltas.
**How to avoid:** For each scenario, compute adjusted scores for ALL candidates, sort by adjusted score, compare to original ranking, and output the rank change as `+N/-N/--`. The "Finding" narrative must say which items are fragile (rank drops with small perturbation) vs. robust.
**Warning signs:** Scenario Models section shows score changes but `Rank Change` column is `--` for all candidates.

### Pitfall 5: HIG --light Mode Must Not Write an Artifact File

**What goes wrong:** The full `/pde:hig` writes `HIG-audit-v{N}.md` to `.planning/design/review/`. The `--light` mode called by critique must NOT write an artifact — it provides inline findings only.
**Why it happens:** The 7-step pipeline pattern always writes an artifact in Step 5. `--light` is an exception that must skip Steps 5-7 entirely.
**How to avoid:** The HIG workflow's Step 2 must check for `--light` flag. If `--light`: skip artifact write (Step 5), skip domain DESIGN-STATE update (Step 6), skip manifest update (Step 7). Output only the findings table inline.
**Warning signs:** Running `/pde:critique` causes a `HIG-audit-v{N}.md` to appear in `.planning/design/review/` — the --light mode should not produce file side-effects.

### Pitfall 6: Mockup HTML Must Be Self-Contained (No External Dependencies Except tokens.css)

**What goes wrong:** `templates/mockup-spec.md` lists `ux/mockups/mockup.js` and `ux/mockups/mockup.css` as "shared bundle" dependencies. This conflicts with MOCK-01 requirement for "self-contained HTML/CSS file."
**Why it happens:** The template spec was designed before the self-contained requirement was locked. The spec template describes a dependency that cannot exist for self-contained output.
**How to avoid:** Mockup HTML must be self-contained — all CSS inline or in a `<style>` block, all interactive state handling via CSS pseudo-classes only, no external JS bundle references. The `mockup.js` / `mockup.css` bundle references in the template spec are aspirational and must NOT be used. The ONLY external dependency is `../../assets/tokens.css` (tokens link, consistent with wireframe pattern).
**Warning signs:** Generated mockup HTML has `<script src="ux/mockups/mockup.js">` or `<link href="ux/mockups/mockup.css">` — these files do not exist.

### Pitfall 7: Critique.md Update Is Part of Phase 26, Not Phase 27 or Later

**What goes wrong:** The HIG delegation update to `critique.md` gets treated as a separate task or deferred to a future phase.
**Why it happens:** The dependency chain is: HIG must exist before critique can delegate. Developers may write HIG first and then forget the critique update.
**How to avoid:** The Phase 26 plans must explicitly include a task for updating `workflows/critique.md` Perspective 3 to call `/pde:hig --light`. This is captured in STATE.md: "HIG skill (Phase 26) must be complete before critique.md is updated to delegate --light mode." The update happens IN Phase 26 after HIG ships.
**Warning signs:** Phase 26 completes without any commits modifying `workflows/critique.md`.

### Pitfall 8: Opportunity Candidates Pre-Population from Competitive Output

**What goes wrong:** OPP-01 says users "provide Reach and Effort values interactively" but the opportunity template also says "Pre-populated from `/pde:competitive` gap analysis when available." If competitive output exists, candidates should be pre-loaded before asking for RICE inputs.
**Why it happens:** Phase 25 Phase 02 (SUMMARY 25-02) established that the `## Opportunity Highlights` section in competitive artifacts is structured for machine consumption. The OPP skill must read this section as candidate input.
**How to avoid:** Step 2 of the OPP workflow must check for existing competitive artifact (`CMP-competitive-v{N}.md` in `.planning/design/strategy/`). If found, parse the `## Opportunity Highlights` numbered list (Source / Estimated reach / Competitive advantage sub-fields) and pre-populate the candidates table. Then present to user for confirmation/adjustment before scoring.
**Warning signs:** Opportunity skill ignores existing competitive output and starts from an empty candidate list.

---

## Code Examples

Verified patterns from codebase:

### Lint-Required Sections (all five required in every workflow)

```markdown
<purpose>
[One paragraph describing what the skill produces, what inputs it reads, what downstream skills consume it]
</purpose>

<skill_code>OPP</skill_code>

<skill_domain>strategy</skill_domain>

<context_routing>
[Mode detection: check for competitive artifact, existing opportunity evaluations, project brief]
</context_routing>

<flags>
## Supported Flags
| Flag | Type | Behavior |
...
</flags>

<process>
...
</process>

<output>
- [list of files written]
</output>
```

Source: LINT-001 through LINT-005 in `references/tooling-patterns.md` — all five sections required.

### Coverage Write (13-field read-before-set, OPP example)

```bash
# Read current state
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse {"hasDesignSystem": false, "hasWireframes": false, ...} — default absent fields to false

# Write with hasOpportunity: true, all others preserved
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":true,"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

Source: `workflows/critique.md` Step 7c — exact same pattern, confirmed in Phase 24.

### Manifest Artifact Registration (7-call pattern)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP code OPP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP name "Opportunity Evaluation"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP type opportunity
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP path ".planning/design/strategy/OPP-opportunity-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP version {N}
```

Source: `workflows/critique.md` Step 7b — 7-call pattern confirmed as standard across all design skills.

### Opportunity RICE Score Computation

```
# From references/strategy-frameworks.md (confirmed present)

RICE_base = (Reach * Impact * Confidence) / Effort
Design_bonus = (UX_diff * 0.5) + (A11y_impact * 0.3) + (DS_leverage * 0.2)
Final_score = RICE_base * (1 + Design_bonus / 10)

# The design bonus acts as multiplier capped at 1.3x (when all design scores are 3)
# This ensures design quality improves rankings without overwhelming business fundamentals
```

Source: `references/strategy-frameworks.md` Composite Formula section — exact formula confirmed.

### Mockup Token Link Pattern

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Screen Name} — {Product Name} Mockup</title>
  <!-- Wireframe source traceability -->
  <!-- WIREFRAME-SOURCE: wireframe-{screen}-v{N}.html | Generated: {date} -->
  <link rel="stylesheet" href="../../assets/tokens.css">
  <style>
    /* Inline styles for CSS-only interactive states */
    .btn-primary:hover { background: var(--color-primary-600); }
    .btn-primary:focus-visible {
      outline: 3px solid var(--color-focus-ring);
      outline-offset: 2px;
    }
  </style>
</head>
<body class="pde-layout--hifi" data-screen="{screen-slug}" data-version="{N}">
  <!-- WIREFRAME-ANNOTATION: {preserved wireframe comment text} -->
```

Source: `workflows/wireframe.md` HTML templates (lines ~284, ~492) — exact same `../../assets/tokens.css` path and `pde-layout--{fidelity}` body class pattern.

### HIG Severity Rating Scale (matching critique scale)

```markdown
## Severity Definitions (identical to /pde:critique Perspective 3)

| Severity | When to Use |
|----------|-------------|
| critical | Blocks access entirely for some users — e.g., form has no labels (keyboard/screen reader unusable), interactive element not keyboard-reachable |
| major | Significant barrier — e.g., color contrast fails WCAG AA, focus indicator not visible, touch target < 24px |
| minor | Moderate issue — e.g., ARIA label present but imprecise, heading hierarchy skips one level |
| nit | Polish — e.g., aria-describedby could improve but not required, empty alt text on decorative image is correct but could note role="presentation" |

The same issue found by /pde:hig --light and /pde:critique Perspective 3 MUST receive the same severity rating.
```

Source: `workflows/critique.md` finding format section (critical/major/minor/nit scale) + Phase 26 SC5 requirement.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stub commands ("Status: Planned") | Full workflow implementation | Phase 26 | All three commands become operational |
| critique.md inline Accessibility perspective | Delegate to /pde:hig --light | Phase 26 | Identical severity ratings guaranteed across both paths |
| 7-field designCoverage schema | 13-field schema with hasOpportunity, hasMockup, hasHigAudit | Phase 24 | Phase 26 skills can write their coverage flags without clobbering v1.1 flags |
| Wireframe HTML as final design output | Mockup HTML as hi-fi successor with CSS-only interactions | Phase 26 | Token-accurate, interaction-ready output for developer handoff review |
| Manual RICE scoring in spreadsheets | Interactive in-terminal RICE session with design extensions | Phase 26 | Scored artifact machine-readable for pipeline integration |

**Deprecated/outdated:**
- The "Status: Planned" stub content in `commands/opportunity.md`, `commands/mockup.md`, `commands/hig.md` — the entire `<process>` section body gets replaced with `@workflows/{name}.md`.
- The inline WCAG logic in `critique.md` Perspective 3 — replaced by `/pde:hig --light` delegation after Phase 26 lands.
- References to `ux/mockups/mockup.js` and `ux/mockups/mockup.css` shared bundle in `templates/mockup-spec.md` — these files do not exist; mockup HTML must be self-contained per MOCK-01.

---

## Open Questions

1. **Skill domain for HIG and Mockup**
   - What we know: Opportunity domain is `strategy` (output in `.planning/design/strategy/`). HIG output goes to `.planning/design/review/` (same as critique). Mockup output goes to `.planning/design/ux/mockups/`.
   - Recommendation: HIG skill domain = `review`. Mockup skill domain = `ux`. These match the output directory names and the domain convention used by all existing skills.

2. **Does the `--light` flag in HIG need to invoke via Skill() or via file loading?**
   - What we know: The critique workflow uses Task() subagents for complex per-perspective analysis. The `--light` integration could work either as an in-context section execution or as a subprocess call.
   - Recommendation: Implement `--light` as an in-context mode flag — check for it in Step 2 of HIG workflow, short-circuit the pipeline at Step 4 to run only the 5 mandatory checks, output findings inline, and skip Steps 5-7. Critique calls this by loading `@workflows/hig.md` with the `--light` context variable set, not as a separate subprocess. This is simpler and avoids shell invocation complexity.

3. **What wireframe HTML is the mockup's input when no wireframes have been run?**
   - What we know: MOCK-01 says "generate hi-fi interactive mockup from refined wireframe." If no wireframes exist, the mockup skill must either halt with an error or generate from brief/flows context alone.
   - Recommendation: Wireframe is a soft dependency (warning, not error). If no wireframes: emit "Warning: No wireframes found. Generating mockup from brief and flows context. Run /pde:wireframe --hifi first for wireframe-traceable mockup output." This keeps the skill consistent with the PDE pattern where prerequisites are always soft.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PDE `/pde:test` (skill lint + smoke tests) |
| Config file | none — tests are defined in `references/tooling-patterns.md` and executed by the `/pde:test` skill itself |
| Quick run command | `/pde:test opportunity,mockup,hig --lint` |
| Full suite command | `/pde:test opportunity,mockup,hig` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPP-01 | `/pde:opportunity` produces scored artifact with RICE table | smoke | `/pde:test opportunity` | ❌ Wave 0 (workflow to be built) |
| OPP-02 | Interactive Reach/Effort/Impact/Confidence collection | smoke | `/pde:test opportunity` with mock input | ❌ Wave 0 |
| OPP-03 | Output includes sensitivity analysis and Now/Next/Later buckets | smoke | `/pde:test opportunity` + section check | ❌ Wave 0 |
| MOCK-01 | `/pde:mockup` produces self-contained HTML file per screen | smoke | `/pde:test mockup` | ❌ Wave 0 (workflow to be built) |
| MOCK-02 | Mockup links tokens.css and uses CSS-only states | smoke | `/pde:test mockup` + HTML grep | ❌ Wave 0 |
| MOCK-03 | Mockup HTML preserves wireframe annotations as HTML comments | smoke | `/pde:test mockup` + comment grep | ❌ Wave 0 |
| HIG-01 | `/pde:hig` produces severity-rated audit with WCAG 2.2 AA coverage | smoke | `/pde:test hig` | ❌ Wave 0 (workflow to be built) |
| HIG-02 | `/pde:critique` delegates Accessibility to `/pde:hig --light` | integration | Manual — compare critique output with standalone HIG output for same issue | Manual |
| HIG-03 | HIG findings severity-rated and platform-aware | smoke | `/pde:test hig` + severity field check | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `/pde:test opportunity,mockup,hig --lint` (lint validation only, fast)
- **Per wave merge:** `/pde:test opportunity,mockup,hig` (lint + smoke)
- **Phase gate:** Full suite lint-clean before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `workflows/opportunity.md` — full workflow to be built (covers OPP-01, OPP-02, OPP-03)
- [ ] `workflows/mockup.md` — full workflow to be built (covers MOCK-01, MOCK-02, MOCK-03)
- [ ] `workflows/hig.md` — full workflow to be built (covers HIG-01, HIG-02, HIG-03)
- [ ] `commands/opportunity.md` — update stub to `@workflows/opportunity.md` delegation
- [ ] `commands/mockup.md` — update stub to `@workflows/mockup.md` delegation
- [ ] `commands/hig.md` — update stub to `@workflows/hig.md` delegation
- [ ] `workflows/critique.md` — update Perspective 3 to delegate to `/pde:hig --light`
- [ ] Skill registry entries for OPP, MCK, HIG (covers LINT-010)

---

## Sources

### Primary (HIGH confidence)

- Codebase: `commands/opportunity.md`, `commands/mockup.md`, `commands/hig.md` — confirmed "Status: Planned" stubs, YAML frontmatter, allowed-tools list
- Codebase: `templates/opportunity-evaluation.md` — full artifact structure with scoring table, per-item breakdowns, scenario models, Now/Next/Later buckets confirmed
- Codebase: `templates/mockup-spec.md` — full spec artifact structure; confirms skill code MCK; confirms tokens.css dependency
- Codebase: `templates/hig-audit.md` — full audit artifact structure with POUR view, component-grouped view, token-aware checks, action summary; confirms Axe MCP integration
- Codebase: `references/strategy-frameworks.md` — RICE formula, design extensions, composite formula, scenario modeling
- Codebase: `references/wcag-baseline.md` — WCAG 2.2 changes (6 new criteria), all POUR criteria with quick-check rules
- Codebase: `references/interaction-patterns.md` — ARIA patterns, keyboard requirements, Swift/Apple HIG platform variants
- Codebase: `references/mcp-integration.md` — Sequential Thinking (opportunity), Axe (HIG), Playwright (mockup) enhancement recipes
- Codebase: `references/skill-style-guide.md` — lint rules, output conventions, MCP source tags
- Codebase: `references/tooling-patterns.md` — LINT-001 through LINT-042
- Codebase: `workflows/critique.md` — canonical reference for Perspective 3 inline logic (to be replaced), 13-field coverage write pattern, lock-acquire/release pattern
- Codebase: `workflows/wireframe.md` — canonical reference for HTML output pattern, tokens.css link, annotation comment pattern
- Codebase: `bin/lib/design.cjs` — confirmed `ux/mockups` in DOMAIN_DIRS (8 dirs), `cmdCoverageCheck` implementation
- Phase 24 SUMMARY.md (24-01, 24-02) — confirmed 13-field schema in templates and design.cjs; canonical field order; flag names `hasOpportunity`, `hasMockup`, `hasHigAudit`
- Phase 25 SUMMARY.md (25-01, 25-02) — confirmed workflow file pattern; confirmed `## Opportunity Highlights` structured format in competitive output for OPP candidate pre-population
- `.planning/STATE.md` — "HIG skill (Phase 26) must be complete before critique.md is updated to delegate --light mode"
- `.planning/REQUIREMENTS.md` — OPP-01/02/03, MOCK-01/02/03, HIG-01/02/03 requirements verbatim

### Secondary (MEDIUM confidence)

- Codebase: `.planning/design/design-manifest.json` — shows initialized instance has 7 fields (pre-Phase-24 instance); template has been updated per Phase 24 SUMMARY; both must be handled
- Codebase: `workflows/recommend.md` (Phase 25 output) — confirms current lint-compliant workflow structure includes `<skill_code>`, `<skill_domain>`, `<context_routing>` as additional required sections beyond the 5 in tooling-patterns.md

### Tertiary (LOW confidence)

- Codebase: `templates/mockup-spec.md` reference to `ux/mockups/mockup.js` / `ux/mockups/mockup.css` shared bundle — these files do not exist; mockup-spec.md is aspirational; MOCK-01 self-contained requirement takes precedence. Flagged as contradiction to resolve in planning.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified by direct codebase inspection; no guesswork
- Architecture patterns: HIGH — direct reading of 9+ implemented skill workflows confirms 7-step pipeline, coverage write pattern, lint sections
- Pitfalls: HIGH — discovered by cross-referencing actual files (manifest instance vs template, mockup.js non-existence, critique delegation requirement)
- Validation architecture: MEDIUM — `/pde:test` framework confirmed; skill registry gaps are known but exact format must be verified when writing skills

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (30 days — stable patterns; Phase 25 output is a dependency that is now complete)
