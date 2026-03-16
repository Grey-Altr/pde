# Pitfalls Research

**Domain:** Adding advanced design skills (ideation, competitive analysis, opportunity scoring, mockups, HIG audit, tool discovery) to an existing 7-stage PDE design pipeline
**Researched:** 2026-03-16
**Confidence:** HIGH (grounded in direct inspection of v1.1 codebase, workflow contracts, manifest schema, and orchestrator anti-patterns; no external research required — the pitfalls emerge from the system's own structure)

---

## Critical Pitfalls

### Pitfall 1: Orchestrator Stage Count Mismatch Silently Corrupts Pipeline State

**What goes wrong:**
The existing `build.md` orchestrator hardcodes "7 stages" in its display messages, stage tables, completion check (`if ALL 7 stages are complete`), the next-stage name lookup table, and the final summary block. When the pipeline expands to 12 stages, the orchestrator still reads designCoverage for 7 flags, reports "7/7 complete" after the original pipeline finishes, and halts — never invoking the 5 new stages (mockup, HIG, etc.). The new stages appear to be skipped by design rather than by broken logic, so the bug is invisible unless you count stage invocations.

**Why it happens:**
The build workflow was written with explicit stage counts baked into prose. Every "7 stages" reference is a magic number — not derived from the stage list. When adding stages, developers update the stage list but miss the half-dozen prose references to the old count. The orchestrator appears to work because all existing artifacts pass their checks, and the new stages just never run.

**How to avoid:**
Stage count must be derived dynamically in the orchestrator. The canonical stage list is the source of truth — the "N stages" number in all display messages should be `count(STAGE_LIST)`, not a hardcoded literal. Before implementing any new stage, audit `build.md` for all numeric literals (7, "7 stages", "7/7", `7 - N`) and replace with derived values. Add a `--dry-run` test as a verification step: stage count in dry-run output must match the number of skills being invoked.

**Warning signs:**
- `/pde:build --dry-run` shows "7 stages" after pipeline expansion
- Running `/pde:build` after all original stages complete shows "Pipeline finished" without running mockup or HIG
- `designCoverage` JSON has flags for new stages but build orchestrator never reads them

**Phase to address:** Phase implementing the expanded `/pde:build` orchestrator — before any new stage is wired up, fix stage-count derivation and audit all magic numbers.

---

### Pitfall 2: Pre-Pipeline Stages (Ideation, Competitive, Opportunity) Have No Coverage Flags in the Existing Schema

**What goes wrong:**
The `design-manifest.json` `designCoverage` object currently has 7 boolean flags: `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasHardwareSpec`. The new pre-pipeline stages (ideate, competitive, opportunity) need coverage flags so the orchestrator can determine whether they are complete and whether to skip them on resume. If the flags are absent, the orchestrator has no coverage check to perform — so it re-runs these stages on every `/pde:build` invocation, even when the user already has a complete ideation doc and a competitive analysis they spent an hour on.

**Why it happens:**
The `coverage-check` CLI command reads a fixed schema from `design-manifest.json`. New flags must be explicitly added to the schema and the CLI command. The v1.1 implementation pattern is "read-before-set" to avoid clobbering sibling flags — every skill reads ALL fields before writing. When new fields are added without updating this pattern in existing skills, the first existing skill to run after an upgrade will clobber the new flags back to `undefined` (which the orchestrator then treats as `false`).

**How to avoid:**
Step 1: Define the full v1.2 coverage schema before implementing any new skill — add `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit` to the schema (minimum; the orchestrator determines which new stages require flags). Step 2: Update the `coverage-check` command to emit these fields with a `false` default when absent. Step 3: Update ALL existing skills' read-before-set patterns to include the new fields in their merge operation. Do this schema migration as a standalone phase before any skill implementation.

**Warning signs:**
- Running `/pde:competitive` then `/pde:brief` then checking coverage shows `hasCompetitive: undefined`
- Existing skills' manifest-set-top-level calls do not include the new flag names
- `/pde:build --dry-run` shows pre-pipeline stages as pending even when their output files exist

**Phase to address:** Schema migration phase — must run before the first new skill is implemented. Blocking dependency for all v1.2 skill phases.

---

### Pitfall 3: Ideation Diverge→Converge Is Treated as a Single LLM Pass

**What goes wrong:**
The multi-phase diverge→converge model requires at least two structurally distinct phases: broad exploration (diverge) and narrowing/selection (converge). If the ideation workflow is implemented as a single LLM prompt that "first diverges then converges," the LLM produces output that is simultaneously shallow on ideas (because it knows it must converge) and premature on selection (because divergence was not fully explored). The result looks like an ideation document but contains 3-5 ideas with no real exploration — essentially a summary of the obvious. The competitive analysis and opportunity scoring stages then operate on weak input, magnifying the quality deficit downstream.

**Why it happens:**
Implementing two distinct phases requires two separate user interactions or explicit intermediate checkpoints. Developers collapse it into one pass to reduce workflow complexity. The LLM happily complies — it will generate a "diverge" section and a "converge" section in one response, but the cognitive pressure to converge inhibits divergent generation.

**How to avoid:**
Implement ideation as a two-pass workflow with an explicit checkpoint between phases. Pass 1: generate N ideas (configurable; default 8-12) with NO winnowing — breadth only, no evaluative language, no ranking. Write IDT-ideation-v{N}.md with status `diverge-complete`. Pass 2 (separate invocation or explicit step): present ideas to user for reaction, then apply converge logic to narrow to the top 2-4 with rationale. This checkpoint is where `recommend` (tool discovery) integrates — tool suggestions surface during diverge so the user sees what's feasible before converge. The two-pass structure must be explicit in the workflow file, not collapsed into one step.

**Warning signs:**
- Ideation document has fewer than 6 distinct ideas in the diverge section
- Ideas in the diverge section include evaluative language ("best option", "most viable") — this signals premature convergence
- The workflow does not write an intermediate file between diverge and converge phases

**Phase to address:** Phase implementing `/pde:ideation` — the two-pass structure is the core design of the skill, not an enhancement.

---

### Pitfall 4: Competitive Analysis Output Is Not Wired Into Downstream Brief Input

**What goes wrong:**
`/pde:competitive` produces a detailed landscape analysis with gap analysis, competitor strengths/weaknesses, and positioning opportunities. `/pde:opportunity` consumes competitive gaps as candidate inputs. But `/pde:brief` — which already exists in v1.1 — has no awareness of competitive analysis output. The brief agent writes market context, personas, and product positioning from scratch, ignoring the competitive landscape already documented. The result is a brief that is internally coherent but factually inconsistent with the competitive analysis (e.g., the brief says "no existing tools do X" while the competitive analysis notes three competitors who do X).

**Why it happens:**
`/pde:brief` is a v1.1 skill with a fixed `<required_reading>` block. New upstream skills are not automatically added to existing skills' required reading. The brief skill predates the competitive and opportunity skills — it cannot read files that did not exist when it was written.

**How to avoid:**
Update `brief.md` workflow to check for and optionally inject competitive and opportunity documents as soft-dependency context. In Step 2 (prerequisite check), add: check for `CMP-competitive-v*.md` in `.planning/design/strategy/` and `OPP-opportunity-v*.md`. If present, read them and inject into brief generation context with explicit instruction: "The competitive landscape analysis and opportunity scoring are upstream context — incorporate their market positioning and gap analysis into the brief's market context and differentiation sections." Mark as soft dependency — brief still runs without them, but with a warning that it will lack competitive grounding.

**Warning signs:**
- Brief's market context section makes claims that contradict the competitive analysis
- Brief persona section does not reference the positioning opportunities identified in the opportunity evaluation
- Brief is generated before competitive/opportunity, but no warning is issued

**Phase to address:** Phase updating `/pde:brief` for v1.2 context injection — this is an update to an existing skill, not a new skill, and must be planned as its own phase.

---

### Pitfall 5: HIG Dual-Mode Is Implemented as Two Separate Skills Instead of One Parameterized Skill

**What goes wrong:**
The requirement is "HIG light in critique vs HIG full standalone." If this is implemented as two separate code paths — one embedded in the critique workflow and one in the standalone HIG skill — the two diverge over time. Light HIG in critique gets updated when critique is updated; full HIG in the standalone skill gets updated when someone specifically works on HIG. They end up checking different things, using different scoring, and producing findings that contradict each other when a user runs both. A user who runs critique (gets light HIG feedback) then runs `/pde:hig` (gets full HIG audit) sees different severity ratings for the same issues, which destroys trust in both outputs.

**Why it happens:**
Embedding HIG logic in critique.md is the path of least resistance during critique implementation. Then when the standalone skill is built, it replicates the logic independently rather than calling shared code. Both implementations work in isolation; the divergence only becomes visible when a user uses both in sequence.

**How to avoid:**
Define HIG audit logic once, in the HIG skill workflow. The critique skill invokes a partial HIG pass by calling `Skill("pde:hig", args="--light --screens {wireframe_list}")` or equivalent, rather than embedding HIG evaluation logic inline in the critique workflow. "Light mode" is a flag on the HIG skill, not a separate code path. This means the HIG skill must be built before critique is updated to include HIG integration — plan the phase order accordingly.

**Warning signs:**
- `critique.md` contains HIG evaluation criteria written inline (not delegated to `hig.md`)
- Light HIG findings in critique use different severity labels than full HIG findings in standalone
- A finding is Critical in `/pde:hig` output and Major in `/pde:critique` output for the same element

**Phase to address:** Phase implementing `/pde:hig` — design the --light flag as a first-class mode from the start. Do not embed HIG logic in critique.

---

### Pitfall 6: Mockup Skill Treats Wireframe as Source of Truth for Layout, Ignoring Iterate Revisions

**What goes wrong:**
`/pde:mockup` is a post-iterate skill — it generates hi-fi HTML/CSS from the iterated wireframe. If the mockup skill discovers wireframes by globbing for `WFR-*-v1.html` (the original wireframe naming) instead of `WFR-*-v{MAX}.html` (the most recent iterated version), it generates a hi-fi mockup from the original pre-critique wireframe. The mockup looks polished but embeds all the UX issues that iterate was supposed to fix. This bug is hard to detect because the mockup is visually impressive — users may not notice the structural regression until development review.

**Why it happens:**
The wireframe naming convention uses version suffixes (WFR-login-v1.html, WFR-login-v2.html, WFR-login-v3.html). Iterate creates new versions; it does not overwrite. Mockup must select the highest version, which requires parsing version numbers from filenames — a step that is easy to skip in favor of a simple glob.

**How to avoid:**
Mockup's artifact discovery step must use the same version-sorting logic already implemented in critique.md and iterate.md (sort by parsed `v{N}` suffix, select MAX). This logic is already written — it must not be reimplemented independently. Extract the version-sort logic into a `pde-tools.cjs design latest-artifact {code}` command that all skills call, so version resolution is centralized. Additionally, mockup should verify that the selected wireframe is the output of an iterate pass (check `ITR-changelog-v*.md` exists) and warn if generating from a pre-iterate wireframe.

**Warning signs:**
- Mockup output filename contains a lower version number than the most recent iterate output
- Running mockup immediately after a fresh wireframe (no iterate) produces same-version mockup as running after three iterate cycles
- Mockup step in the orchestrator is marked as complete but the source wireframe version does not match the iterate output version

**Phase to address:** Phase implementing `/pde:mockup` — version-aware artifact discovery must be implemented from the start, not retrofitted.

---

### Pitfall 7: Recommend (Tool Discovery) Is Implemented as a Standalone Report, Not as an Ideation Flow Input

**What goes wrong:**
The requirement states: "Recommend skill for MCP/tool discovery (integrated into ideation)." If `/pde:recommend` is implemented as a standalone tool that generates a static recommendations list and stops, it produces output but does not surface recommendations at the moment they are needed — during ideation diverge, when the user is deciding which ideas are feasible given available tools. The user runs ideation, then separately runs recommend, then tries to reconcile the two manually. The integration value — "this idea is now feasible because MCP X exists" — is lost.

**Why it happens:**
Standalone implementation is simpler to build and test. Integration into an existing workflow (ideation) requires understanding the ideation workflow's lifecycle and inserting a probe at the right checkpoint. Developers default to standalone because it ships faster.

**How to avoid:**
The recommend skill must expose two modes: (1) standalone report mode (for users who want tool discovery outside ideation) and (2) ideation-integration mode, which the ideation workflow calls after diverge-complete and before converge. In integration mode, recommend reads the IDT-ideation-v{N}.md diverge section, scans for tool/technology mentions in each idea, and produces a short per-idea feasibility annotation ("Idea 3 requires real-time data sync — Context7 MCP covers this; install with `npx @context7/mcp`"). The ideation workflow's converge step reads these annotations. This requires designing the ideation workflow and the recommend skill together — they share an interface.

**Warning signs:**
- `/pde:recommend` can be run on any project with no reference to an ideation document
- Ideation workflow does not call recommend at any step
- Recommend output format is a standalone report, not a per-idea annotation format readable by ideation

**Phase to address:** Phase implementing `/pde:ideation` AND `/pde:recommend` — these two skills must be designed together. Implement recommend first, since ideation calls it.

---

### Pitfall 8: RICE Scoring Numbers Are Invented, Not Grounded in Brief Constraints

**What goes wrong:**
The RICE formula requires Reach (number of users), Impact (0.25–3 scale), Confidence (0.5–1.0), and Effort (person-weeks). When the opportunity skill runs before the brief is complete, the LLM invents plausible-sounding RICE numbers that have no basis in the actual product's persona definitions, stated constraints, or delivery timeline. Scores look precise (e.g., "Feature A: RICE 82.5, Feature B: RICE 47.3") but are numerologically fictional. Product decisions made on fictional RICE scores are worse than decisions made by intuition, because they carry false quantitative authority.

**Why it happens:**
The LLM will produce RICE scores for any input — it is pattern-matching to the scoring formula, not reasoning about the actual product. Without explicit grounding constraints injected from the brief and competitive analysis, every number is a plausible fiction.

**How to avoid:**
The opportunity skill must treat RICE inputs as interactive user inputs, not LLM-generated values. The workflow must prompt the user to supply or confirm each score dimension before calculating. For Reach: extract the target persona count from the brief (if present) as a starting anchor and ask the user to confirm. For Effort: require the user to supply person-week estimates. For Confidence: offer a structured checklist that determines confidence from evidence quality (has competitive data? → 0.8; user research? → 1.0; assumption-only? → 0.5). The LLM's role is structuring the scoring process and providing the ranking output — not generating the input numbers.

**Warning signs:**
- Opportunity evaluation output was generated without a single user-facing prompt for input
- RICE Reach values are not referenced against any persona count from the brief
- Confidence values are all 0.8 (a suspiciously round default suggesting LLM fabrication)

**Phase to address:** Phase implementing `/pde:opportunity` — interactive input collection must be designed as the core mechanic, not an optional enhancement.

---

### Pitfall 9: HIG Full Audit Blocks Handoff Instead of Gating It

**What goes wrong:**
The pipeline order is: mockup → HIG(full) → handoff. If the HIG full audit is implemented as a blocking hard dependency for handoff (handoff refuses to run if HIG is not complete), users who want to deliver a handoff for a web product where HIG Apple guidelines are irrelevant are blocked. Alternatively, if HIG is soft-optional, teams doing iOS/macOS apps skip it under time pressure and ship non-compliant designs. Neither outcome is right — the correct behavior is "HIG audit is required for platform-relevant products and advisory for others."

**Why it happens:**
Boolean blocking logic is easier to implement than conditional blocking based on platform context. Developers either hard-block all handoffs (too strict) or make HIG fully optional (too permissive).

**How to avoid:**
The HIG skill must read the brief's platform field (set during `/pde:brief`) and determine whether HIG audit is platform-applicable. For `platform: web` or `platform: android`: HIG audit is advisory — running it is recommended but not required for handoff. For `platform: ios` or `platform: macos`: HIG audit is a required gate — handoff checks for `hasHigAudit: true` in designCoverage. The handoff workflow must implement this platform-conditional gate. The brief must require a `platform` field (currently it does not enforce one) — add this to the brief template as a required field.

**Warning signs:**
- Web-only projects are blocked from handoff because HIG is not marked complete
- iOS projects proceed to handoff without a HIG audit flag
- The platform field is optional in the brief template

**Phase to address:** Phase implementing `/pde:hig` (define the platform-conditional gating logic) and phase updating `/pde:brief` (enforce the platform field).

---

### Pitfall 10: New Stage Coverage Flags Are Clobbered by Existing Skills Running After New Stages

**What goes wrong:**
This is the most insidious integration pitfall in the existing codebase, already documented as a critical anti-pattern in v1.1. The read-before-set pattern in designCoverage updates was established specifically to prevent flag clobbering. But the pattern only protects fields that existed when each skill was written. When v1.2 adds `hasIdeation`, `hasCompetitive`, etc., the existing skills (brief.md, system.md, flows.md, etc.) still perform their read-before-set including only 7 fields. If any existing skill runs AFTER a new v1.2 skill has set `hasIdeation: true`, the existing skill's manifest-set-top-level call will write a 7-field object without `hasIdeation` — effectively deleting the new flag.

**Why it happens:**
The read-before-set pattern reads `coverage-check` and extracts named fields. The extraction is field-by-field, not pass-through-all. When the schema adds fields, the extraction step silently ignores them. The developer implementing v1.2 adds new flags but forgets to update the merge operation in all 7 existing skill workflows.

**How to avoid:**
Change the manifest-set-top-level call pattern in all skills to use a pass-through-all approach: read the full designCoverage JSON as a blob, merge only the specific field being set, write back the full blob. This means the merge operation in every skill becomes `Object.assign({}, parsedCoverageBlob, { thisSkillsFlag: true })` rather than an explicit enumeration of all 7+ fields. Make this the established pattern in skill-style-guide.md before any v1.2 skill is written, so new skills inherit the correct pattern. Then update all 7 existing skills to use pass-through-all.

**Warning signs:**
- After running `/pde:ideation` (sets hasIdeation), then `/pde:brief` (existing skill), check `hasIdeation` — if it is `false` or `undefined`, the clobber bug is present
- Any skill's workflow that lists all coverage flags explicitly by name (hasDesignSystem, hasFlows, etc.) is vulnerable
- The skill-style-guide.md still documents the explicit-enumeration pattern from v1.1

**Phase to address:** Schema migration phase — fix the coverage update pattern across all existing skills before any new skill can set new flags. This must be the first phase of v1.2 implementation.

---

### Pitfall 11: Competitive Analysis Is Run with Stale Training Data Without User Verification

**What goes wrong:**
`/pde:competitive` generates a competitive landscape from the LLM's training data. Claude's training cutoff is August 2025. By the time v1.2 ships, major competitors may have shipped or pivoted. Pricing models change. Market leaders change. If the competitive analysis is presented as current without surfacing the staleness caveat clearly, product decisions are made on outdated intelligence. This is not a code bug — it is an output quality and trust problem. Users who later discover their competitive analysis was wrong lose confidence in the entire pipeline.

**Why it happens:**
LLMs answer competitive questions confidently and in the present tense. Without an explicit staleness warning in the output, users read "Competitor X charges $49/month" as a current fact.

**How to avoid:**
Every competitive analysis output must include a prominent "Data Currency" notice in the template frontmatter (already present in the v1.1 `competitive-landscape.md` template — it reads `"Analysis based on data available as of {date}. Verify critical data points before strategic decisions."`). The workflow must also inject the model's known training cutoff into the generation prompt so the LLM acknowledges temporal uncertainty in any market share, pricing, or feature claims. Additionally, the competitive skill should check for the Brave Search or WebSearch MCP availability and, if present, probe current competitor data to supplement training-data claims. Label all training-data-only claims with `[Training data — verify]`.

**Warning signs:**
- Competitive analysis output contains no data currency caveat
- Pricing or market share numbers are stated as current facts without a source or date
- The workflow never checks for web search MCP availability

**Phase to address:** Phase implementing `/pde:competitive` — staleness caveat is a required feature, not a disclaimer.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding stage count (7, 12) in build orchestrator | No changes needed to orchestrator logic | Every pipeline expansion requires a manual audit of magic numbers across build.md | Never — derive count from stage list |
| Embedding HIG evaluation logic inline in critique.md | Faster critique shipping | HIG light and HIG full diverge over time; trust-destroying severity inconsistencies | Never — HIG logic lives in hig.md only |
| Single-pass ideation (diverge + converge in one LLM call) | Simpler implementation | Shallow ideas; premature convergence; weak input to competitive and opportunity | Never for production; acceptable only in a throwaway prototype |
| LLM-generated RICE numbers without user input | No user interaction required | Fictional quantitative precision; decisions with false authority | Never — RICE inputs must be user-confirmed |
| Skipping coverage schema migration before new skill implementation | Can start coding new skills immediately | New flags clobbered by first existing skill that runs; pipeline corrupted silently | Never — schema migration is a blocking precondition |
| Recommend as standalone-only (not integrated into ideation) | Simpler to build and test | Tool discovery value lost; integration benefit requires manual reconciliation | Acceptable as intermediate release state (standalone first, integration in next iteration) |
| Treating HIG as universally required gate | Simple boolean logic | Web/Android projects blocked from handoff on irrelevant platform guidelines | Never — platform-conditional gate from the start |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Existing `/pde:brief` skill | Not injecting competitive/opportunity context into brief generation | Update `brief.md` to soft-depend on `CMP-*` and `OPP-*` artifacts; read them before brief generation if present |
| `designCoverage` schema | Adding new flags without updating existing skills' read-before-set merges | Fix all 7 existing skills to use pass-through-all merge pattern before adding any new flag |
| Ideation ↔ Recommend integration | Recommend runs after ideation instead of during converge phase | Recommend must be invoked by ideation workflow at the diverge→converge checkpoint, not run separately |
| Mockup ↔ Iterate version selection | Mockup globs for v1 wireframe instead of max-version | Use `pde-tools.cjs design latest-artifact WFR` pattern already used by critique and iterate |
| HIG in critique vs. HIG standalone | Inline HIG logic in critique produces different results than standalone | Critique invokes HIG skill with `--light` flag; no inline HIG logic in critique.md |
| Opportunity ↔ Competitive gap | Opportunity candidates are LLM-invented instead of drawn from competitive gaps | Opportunity skill reads `CMP-*.md` gap analysis section as primary candidate source |
| Brief platform field ↔ HIG gate | Platform field absent from brief; HIG gate has no conditional logic | Add required platform field to brief template; HIG gate reads platform from brief frontmatter |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running competitive analysis as one context-window pass for 8+ competitors | Context exhaustion; shallow competitor profiles; LLM starts confabulating details | Process competitors in batches of 3-4; aggregate after each batch | When competitor count exceeds 5 (typical mid-market product space) |
| Ideation generating 12+ ideas in one pass | Ideas become variations on the same theme; divergence is shallow after idea #7 | Cap single-pass idea count at 6; run two passes for breadth; let user inject themes between passes | Any time a single LLM call is asked to produce more than 6 structurally distinct ideas |
| Mockup generating full hi-fi HTML for all screens in one call | Context exhaustion; incomplete HTML; inconsistent token application | Generate mockup HTML one screen at a time; use the same per-screen batching pattern as wireframe.md | When wireframe count exceeds 3 screens |
| HIG full audit loading all wireframes + all tokens + full brief in one context | Context limit reached; audit produces generic findings after first few screens | Load one screen at a time; use the per-screen evaluation loop pattern from critique.md | When wireframe count exceeds 2 or token file exceeds 3KB |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Ideation outputs 12 ideas with no guidance on how to converge | User overwhelmed; picks arbitrarily or asks for help | Converge step must actively narrow with rationale — do not present all ideas as equal |
| Competitive analysis without "so what" implications | User reads facts but has no actionable direction | Every competitor finding must map to an implication: "Competitor X does not support Y — this is an opportunity for differentiation" |
| RICE scoring with fabricated numbers | User presents scores to stakeholders; scores are challenged; trust lost | Interactive input collection for all RICE dimensions; confidence labels on all scores |
| Mockup labeled as final design | Developers implement mockup without checking for pending handoff annotations | Mockup status field must be `draft` until HIG audit is clean; never auto-promote to `final` |
| HIG audit producing 40+ findings | User does not know where to start; deferred entirely | HIG output must prioritize: Critical first, then Major; Minor findings collapsed by default; max 10 actionable items in summary |
| Recommend outputting tool list with no project-relevance context | User does not know which tools apply to their situation | Every recommendation must include "Why for this project" rationale, not just generic tool description |

---

## "Looks Done But Isn't" Checklist

- [ ] **Pipeline stage count:** `/pde:build --dry-run` shows exactly 12 stages (or whatever the final count is) — not 7 — verify by counting rows in the stage status table
- [ ] **Coverage schema migration:** After running `/pde:ideation` then `/pde:brief`, check `designCoverage` — `hasIdeation` must still be `true` — verify with `node bin/pde-tools.cjs design coverage-check`
- [ ] **Ideation two-pass structure:** IDT-ideation-v{N}.md contains a distinct "Diverge" section with 6+ ideas and a separate "Converge" section — verify that the diverge section was written before the converge section (check intermediate file or step output)
- [ ] **Competitive staleness caveat:** `CMP-competitive-v*.md` frontmatter contains a `Data Currency` field with the current date — verify file was written with staleness language, not silently omitted
- [ ] **Brief receives competitive context:** `/pde:brief` output references at least one finding from the competitive analysis when CMP doc exists — verify by checking brief market context section for competitor references
- [ ] **RICE user interaction:** Running `/pde:opportunity` prompts the user for at least one score dimension — verify by running with no prep and confirming at least one `AskUserQuestion` is triggered
- [ ] **HIG light in critique:** Running `/pde:critique` on an iOS project produces HIG findings — verify that these findings match the severity/content of what `/pde:hig --light` would produce on the same wireframe
- [ ] **HIG platform gate:** Running `/pde:handoff` on an iOS project with `hasHigAudit: false` is blocked — verify with a dry-run on an iOS brief
- [ ] **Mockup uses max-version wireframe:** Running `/pde:mockup` after 3 iterate cycles produces a mockup sourced from v3 wireframe, not v1 — verify `Source Wireframe` field in mockup frontmatter
- [ ] **Recommend integration point:** During `/pde:ideation`, tool recommendations surface between diverge and converge — verify that the IDT document contains a "Tool Availability" or equivalent section populated before the converge selection
- [ ] **Opportunity sourced from competitive gaps:** OPP-opportunity-v{N}.md Evaluation Candidates table lists items traced to `CMP-*.md` gap analysis — verify at least one candidate has `Source: competitive gap` label

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stage count mismatch discovered after orchestrator ships | MEDIUM | Audit build.md for all numeric literals; update to derived count; re-test dry-run |
| Coverage flags clobbered by existing skill | HIGH | Run schema migration (fix all skills to pass-through-all); re-run the new skill to re-set its flag; verify with coverage-check |
| Single-pass ideation producing thin ideas | MEDIUM | Delete IDT artifact; re-run ideation with explicit two-pass prompt enforcement; no downstream impact if caught before brief |
| RICE scores found to be fabricated post-scoring | HIGH | Re-run opportunity scoring with interactive mode; if RICE was used in stakeholder decisions, flag all decisions as requiring revalidation |
| Competitive analysis data found to be stale | MEDIUM | Re-run with web search MCP enabled; update CMP artifact in-place; downstream OPP and brief may need spot-updates |
| Mockup sourced from wrong wireframe version | MEDIUM | Delete MCK artifact; re-run mockup; no cascade impact (mockup is pre-handoff) |
| HIG light and HIG full diverge (different findings for same issue) | HIGH | Delete inline HIG logic from critique.md; implement HIG delegation to hig.md; re-run critique to regenerate CRT with consistent HIG findings |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Orchestrator stage count mismatch (Pitfall 1) | Phase expanding `/pde:build` | `/pde:build --dry-run` shows correct stage count matching stage list |
| Pre-pipeline coverage flags absent (Pitfall 2) | Schema migration phase (first v1.2 phase) | `coverage-check` emits all v1.2 flags with `false` default; existing skills preserve new flags |
| Ideation single-pass collapse (Pitfall 3) | Phase implementing `/pde:ideation` | IDT document contains 6+ ideas in diverge section; intermediate checkpoint exists |
| Competitive output not wired into brief (Pitfall 4) | Phase updating `/pde:brief` for v1.2 context | Brief market context references CMP document when present |
| HIG dual-mode divergence (Pitfall 5) | Phase implementing `/pde:hig` (before critique HIG integration) | Same wireframe produces identical severity findings via `--light` and via critique HIG section |
| Mockup uses stale wireframe version (Pitfall 6) | Phase implementing `/pde:mockup` | Mockup Source Wireframe field matches max-version iterate output |
| Recommend not integrated into ideation (Pitfall 7) | Phase implementing `/pde:recommend` (before ideation) | Ideation workflow calls recommend at diverge→converge checkpoint; IDT doc contains tool annotations |
| RICE numbers invented (Pitfall 8) | Phase implementing `/pde:opportunity` | Opportunity workflow prompts user for at least Reach and Effort inputs |
| HIG blocking non-platform-applicable products (Pitfall 9) | Phase implementing `/pde:hig` and phase updating `/pde:brief` | Web brief proceeds to handoff without HIG; iOS brief is gated on HIG |
| Coverage flags clobbered by existing skills (Pitfall 10) | Schema migration phase (first v1.2 phase — blocking) | Running any existing skill after a new v1.2 skill preserves the new skill's flag |
| Competitive analysis staleness (Pitfall 11) | Phase implementing `/pde:competitive` | CMP output includes Data Currency frontmatter; staleness language appears in output |

---

## Sources

- Direct inspection of PDE v1.1 codebase: `build.md` orchestrator, `critique.md`, `iterate.md`, `handoff.md`, `design-manifest.json` schema, `pde-tools.cjs` design subcommands — HIGH confidence (primary source)
- PDE `PROJECT.md` v1.2 requirements and out-of-scope decisions — HIGH confidence
- PDE v1.1 `PITFALLS.md` (previous research: 2026-03-15) — HIGH confidence, basis for coverage clobber and stage count pitfalls
- Direct inspection of stub commands: `competitive.md`, `mockup.md`, `hig.md`, `opportunity.md`, `recommend.md` — all currently "Status: Planned" — HIGH confidence (these stubs reveal no existing logic, confirming clean-slate implementation)
- `templates/competitive-landscape.md`, `templates/opportunity-evaluation.md`, `templates/hig-audit.md`, `templates/mockup-spec.md`, `templates/recommendations.md` — templates already exist; pitfalls emerge from workflow-to-template integration gaps — HIGH confidence
- LLM output consistency patterns for multi-phase workflows — known diverge/converge collapse risk with single-pass prompts — MEDIUM confidence (consistent with established prompt engineering literature)

---

*Pitfalls research for: Adding advanced design skills (ideation, competitive, opportunity, mockup, HIG, recommend) to existing PDE v1.1 design pipeline*
*Researched: 2026-03-16*
