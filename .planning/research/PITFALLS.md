# Pitfalls Research: Stakeholder Presentation Generation Engine

**Domain:** Adding automated report/presentation generation with LLM narratives, 10 personas, dual HTML+Markdown output, auto-generation, chart generation, and cross-project portfolio synthesis to an existing Claude Code plugin (PDE v0.22)
**Researched:** 2026-03-29
**Confidence:** HIGH (patterns verified against LLM hallucination research, SVG generation benchmarks, HTML report engineering post-mortems, hook system source analysis, and cross-project state sync community discussions)

---

## Context: Why Presentation Generation Is Different From Everything Else PDE Does

Every prior PDE feature generates *artifacts that describe future intent* (plans, wireframes, tokens) or *records actual actions* (event logs, git commits). Presentation generation is the first feature that synthesizes those artifacts into *claims about what happened*. This inversion creates a category of failure that does not exist anywhere else in the codebase: the output can be coherent, well-formatted, and completely wrong about the project's actual state. A broken chart is obvious; a chart showing the wrong velocity is not.

The six failure categories below are ordered by damage-before-detection — the worst failures are those that survive review.

---

## Critical Pitfalls

### Pitfall 1: LLM Narrative Hallucination About Project State

**What goes wrong:**
The synthesis agent generates fluent, plausible-sounding narrative prose that contradicts the actual project record. Examples that have been observed in analogous systems: "All planned features were delivered on time" when RECONCILIATION.md shows scope reductions; "The team resolved three major blockers" when STATE.md shows two blockers are still open; "Tests pass at 98% coverage" when the actual figure is from a different milestone. The prose reads professionally and passes a casual review.

**Why it happens:**
LLMs interpolate between structured data points using training priors. When the prompt instructs "write an executive summary," the model fills gaps with what executive summaries usually say rather than what the data actually shows. PDE artifact files use markdown with inconsistent schemas across milestones (e.g., the RECONCILIATION.md format changed between v0.17 and v0.19). When the parser finds a missing field, the LLM infers a plausible value instead of surfacing a gap. Research confirms GPT-class models hallucinate 28–39% of references even when given source material (Stanford Legal RAG study, 2025).

**How to avoid:**
- Separate data extraction from narrative generation. Extract all quantitative claims (phases completed, requirements count, dates, test counts) into a structured JSON object *first*, using deterministic code — not the LLM. Verify each field against its source file before passing the JSON to the narrative stage.
- Prompt the narrative LLM with: "Generate narrative only from the structured data below. If a field is null or missing, say '[data not available]' rather than inferring a value."
- Add a post-generation verification pass: extract all numeric claims from the generated prose using regex, compare each against the source JSON, and block output if any claim differs by more than a threshold.
- Never allow the LLM to read raw .planning/ files directly. Always mediate through the structured extraction layer.

**Warning signs:**
- Generated prose mentions milestone names, dates, or version numbers that differ from the source STATE.md.
- Narrative uses round numbers (100%, "on time", "all requirements") when source data shows partial completion.
- Different runs of the same generation produce different claims about the same project state.

**Phase to address:**
Data extraction layer phase (Phase 1 of roadmap). The extraction → verification → narrative pipeline must be the architectural foundation before any persona output is built. Building personas first and adding verification later consistently fails.

---

### Pitfall 2: Chart Data Divergence From Actual Records

**What goes wrong:**
Velocity charts, milestone progress bars, and burndown graphs display values that differ from what the underlying PDE records contain. The most common failure: a velocity chart shows commits-per-day trending upward, but the git log shows the final week had no commits because the project was complete. Or a phases-completed chart shows 8/8 phases done, but the STATE.md shows 7 completed and 1 archived without completion. The chart is SVG and looks correct; the data it encodes is wrong.

**Why it happens:**
Two mechanisms cause this. First, if chart data extraction is LLM-assisted, the model rounds, interpolates, or infers missing data points — confirmed failure mode in SVG generation benchmarks (VectorGym, 2025: LLMs produce "inaccurate path counts" and "incomplete SVGs" when generating complex graphics). Second, even with deterministic extraction, different source files can contradict each other: MILESTONES.md may list phase 7 as complete while STATE.md still shows it in-progress due to a sync gap between writes.

**How to avoid:**
- All chart data must come from a single authoritative source per metric. Define the source-of-truth for each chart type: phase completion count → STATE.md frontmatter only; commit velocity → git log command only; requirement count → PROJECT.md requirements section only. Document these mappings explicitly and enforce them in the extraction module.
- Validate extracted numbers against cross-references before rendering: if STATE.md says 8/8 phases complete but MILESTONES.md has 7 entries, surface a data conflict rather than silently choosing one.
- Never generate chart data from narrative text (e.g., reading "we completed 8 phases" from a summary). Always go to the primary structured source.
- SVG chart rendering must be done with deterministic code (a minimal SVG generator function, not an LLM call). The LLM determines the narrative; the code generates the chart from verified numbers.

**Warning signs:**
- Chart values differ from what `grep` of STATE.md frontmatter would produce.
- Charts show "perfect" trends (linear progress, no gaps) that real projects never exhibit.
- Re-running generation with the same project state produces different chart values.

**Phase to address:**
Chart generation phase. All chart types must pass a "data matches source" assertion in the Nyquist test suite before any persona can use them. A chart with wrong data is worse than no chart.

---

### Pitfall 3: Auto-Generation Firing on Every Hook Event Creates Workflow Noise

**What goes wrong:**
Presentation auto-generation is wired to the existing PostToolUse hook (which fires on every Write/Edit to `.planning/`). During a normal `/pde:plan-phase` execution, 20–40 individual Write calls touch `.planning/` files. Each triggers auto-generation, blocking with LLM calls or queuing N generation jobs. The user's workflow stalls waiting for reports that become stale before they finish generating. The tmux dashboard fills with generation status events. Worse: the user opens a presentation that was generated mid-execution and reads "Phase 3 complete" when Phase 3 was still being written at generation time.

**Why it happens:**
The context-sync-hook.cjs pattern (SHA-256 hash comparison to skip redundant regeneration) works well for context file sync because that operation is fast (<2s, deterministic CJS). LLM generation is 5–30s and non-deterministic. Applying the same hook wiring to slow generation creates a different class of problem: the hash check prevents redundant starts, but each individual write still queues a generation if the hash changed — and it changes on every file write.

**How to avoid:**
- Auto-generation must NOT fire on PostToolUse. Wire to SessionEnd only (already in hooks.json as a lifecycle event) or implement a cooldown/debounce: after the last .planning/ write, wait a configurable idle period (default: 30s) before triggering generation. This prevents mid-execution stale reports.
- Add an explicit gate: auto-generation only fires when STATE.md frontmatter shows `status: Completed` or `status: Milestone complete`. Do not generate during active execution phases.
- Support manual-trigger-only mode as the default (`auto_generate: false` in config.json), with opt-in auto-generation. Developers who want quiet workflows get quiet workflows.
- Emit generation events to the event bus (NDJSON) so they appear in the tmux dashboard — but do not write to stdout, preserving the zero-stdout contract.

**Warning signs:**
- `pde-events-*.ndjson` session file grows by `presentation_generate` events during active planning phases.
- Generation lock files accumulate in `.planning/presentations/` without corresponding completions.
- User reports that `/pde:plan-phase` feels slower than before the feature was added.

**Phase to address:**
Auto-generation trigger phase. The trigger logic must be designed before any generation code runs, because retrofitting debounce onto an already-wired hook requires coordinated changes across hooks.json, the hook handler, and the generation entry point.

---

### Pitfall 4: Premature Persona Abstraction Creates an Untestable Engine

**What goes wrong:**
The synthesis engine is designed upfront with a fully abstract persona system: a `PersonaConfig` type, a `renderForPersona(data, persona)` function, a registry of 10 persona definitions. Each persona is tested only as "a persona instance." Testing reveals the engine produces correct structure for all 10 personas but incorrect content for 6 of them, because the abstraction obscures the specific data requirements each persona has. Fixing one persona breaks another because they share state through the common config object.

**Why it happens:**
Ten personas sound like a classic case for an abstraction. But the personas differ not in rendering logic but in *what data they need and how they weight it*: an investor update needs velocity and technical moat; a sprint review needs what shipped and what demos exist; a case study needs before/after outcomes. A "shared engine" that handles all of these through a single interface ends up with all 10 data requirements in scope for every persona, creating a config object that is never fully populated for any single persona and confusing the extraction layer.

**How to avoid:**
- Build two personas end-to-end first (recommended: executive summary and case study — the poles of the internal/external spectrum). Identify exactly what data each needs. Only then extract the common patterns into shared abstractions.
- Persona configuration should be additive (each persona declares what it needs), not subtractive (a full config with fields zeroed out for unused personas).
- The shared engine should handle: reading source artifacts, LLM call management, output format rendering, file writing. Each persona should own: data requirements declaration, narrative prompt template, section ordering. Keep persona-specific logic inside the persona module, not inside the shared engine conditionals.
- Test each persona independently against a fixed project state fixture before integration testing the shared engine.

**Warning signs:**
- The shared `PersonaConfig` type has more than 20 fields.
- A persona test must mock more than 3 other persona's data requirements to run.
- Adding a new persona requires changes to the shared engine's core logic rather than only adding a new persona module.

**Phase to address:**
Shared engine architecture phase (Phase 2 of roadmap, after data extraction). Build the first two personas as fully independent implementations, then extract shared abstractions only where duplication is confirmed.

---

### Pitfall 5: Self-Contained HTML Breaks Silently in Edge Cases

**What goes wrong:**
The generated HTML presentation opens correctly in the developer's browser, passes internal review, and is then sent to a stakeholder who opens it in a corporate environment and sees: a blank page (Content Security Policy blocked inline scripts), missing chart sections (the inline SVG exceeded a browser-specific rendering threshold), or broken layout (the base64-encoded fonts pushed the file to 8MB and the mail client truncated it). These failures are invisible until the presentation reaches an external recipient.

**Why it happens:**
Self-contained HTML reports have known failure modes at scale. Real-world reports have grown from 7MB to 310MB (cucumber/html-formatter issue #62). Inline SVG charts with complex paths can hit browser memory limits. Base64 fonts dramatically inflate file size. Some corporate email clients strip `<style>` blocks entirely. CSP headers in some organizations block all inline scripts, breaking interactive charts. The file appears valid from the generator's perspective and fails at the recipient's.

**How to avoid:**
- Set a hard file size budget for the generated HTML: 500KB maximum for the complete presentation (no fonts embedded, SVG charts only with path-count limits, no base64 images unless explicitly enabled). Fail generation with a clear error if the budget is exceeded.
- No inline `<script>` blocks in generated HTML. All interactivity must work without JavaScript (CSS-only transitions, static SVG charts). This eliminates the CSP failure class entirely.
- Test HTML output in at least: Chrome (latest), Safari (latest), and a text-based renderer (lynx or w3m) to verify the document degrades gracefully. Add this as a Nyquist assertion.
- Use `<style>` blocks (not inline style attributes) for layout, but ensure the document renders acceptably without styles by using semantic HTML structure. This handles the "mail client strips styles" failure.
- Never embed external URLs in generated HTML (fonts from Google Fonts CDN, chart libraries from CDN). Every resource must be inline or absent. A report that requires network access to render is not self-contained.

**Warning signs:**
- Generated HTML file exceeds 1MB.
- HTML includes `<script src=` or `<link rel="stylesheet" href=` pointing to external URLs.
- Charts are generated using a JavaScript charting library (Chart.js, D3, Highcharts) rather than static SVG.
- The file renders differently when opened from the filesystem vs. a web server.

**Phase to address:**
HTML rendering phase. File size budget and no-JavaScript constraint must be established before any HTML template is built. Retrofitting these constraints breaks all existing templates.

---

### Pitfall 6: Cross-Project Portfolio Synthesis With Path Assumptions

**What goes wrong:**
The portfolio synthesis feature is built assuming all PDE projects follow the current `.planning/` schema. When run against older projects (v0.15 schema had 16 designCoverage fields vs v0.21's 21 fields), the extractor either crashes on missing fields or silently returns zeros. A portfolio presentation that shows Project A with "0 phases completed" because that project's STATE.md used an older frontmatter key is worse than not including that project at all.

**Why it happens:**
PDE's schema has evolved across every milestone. STATE.md frontmatter added the `milestone_name` key in v0.17. MILESTONES.md replaced a flat format with a structured table in v0.18. designCoverage grew from 16 to 21 fields across v0.12–v0.21. Cross-project reading assumes schema homogeneity that does not exist across a real user's project history. Additionally, projects may be on different drives, use symlinks, or have `.planning/` in non-standard locations.

**How to avoid:**
- Implement a schema version detector: read the `gsd_state_version` field from STATE.md frontmatter (currently `1.0`). For each project, select the appropriate extraction adapter based on schema version. Define extractors for versions 1.0 and a fallback "unknown" mode that returns only fields provably present.
- All cross-project extraction must use defensive reads: if a field is absent, return `null` explicitly, not a default value. Distinguish "field absent" from "field is zero."
- The portfolio synthesis must not crash if any individual project extraction fails. Wrap each project extraction in a try/catch, include the project in the portfolio with a `[data unavailable — schema incompatible]` marker, and continue.
- Path resolution: accept project roots as explicit paths (absolute). Never attempt to discover sibling projects automatically by traversing the filesystem. Auto-discovery creates false positives (finding `.planning/` dirs inside `node_modules`, test fixtures, or archived projects).
- Respect file system permissions: attempt to read each project path and surface a clear error if access is denied rather than silently omitting the project.

**Warning signs:**
- Portfolio extractor uses `.planning/STATE.md` keys without version checking.
- Tests for cross-project synthesis only use projects at the current schema version.
- The synthesis feature accepts a glob pattern (`~/projects/*/.planning`) rather than an explicit list of project roots.
- An older PDE project directory appears in the portfolio with all metrics showing 0.

**Phase to address:**
Cross-project synthesis phase (last major phase). All single-project extraction must be stable before attempting cross-project. Schema version detection should be a prerequisite gate before the phase begins.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Let LLM read .planning/ files directly | No extraction code to write | Hallucinated claims about project state in every presentation | Never |
| Generate HTML with Chart.js from CDN | Rich interactive charts quickly | Breaks offline, fails CSP, adds external dependency | Never — use static SVG |
| Build all 10 personas simultaneously | Feature-complete at launch | 6+ personas with wrong data requirements, untestable abstraction | Never — build 2 first |
| Auto-generate on every PostToolUse | Always-fresh presentations | Workflow blocked, stale mid-execution snapshots, dashboard noise | Never |
| Skip schema version detection for cross-project | Simpler code | Silent zero-data for older projects, misleading portfolio | Never — schema has changed 6x |
| Embed base64 fonts in HTML output | Matches design spec fonts exactly | File size explosion, broken in email clients | Never — use system fonts stack |
| Share narrative LLM context across persona calls | Fewer LLM calls | Persona A's phrasing bleeds into Persona B's output, inconsistent tone | Only for shared data extraction, not narrative |

## Integration Gotchas

Common mistakes when connecting to the existing PDE hook/event system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PostToolUse hook | Wiring generation directly to Write/Edit events | Gate on SessionEnd or cooldown timer; never fire during active execution |
| hooks.json | Adding `async: false` to generation hook to ensure completion | Always `async: true` — generation must never block Claude Code execution |
| emit-event.cjs pattern | Writing to stdout from generation hook | Zero stdout contract is absolute; write only to NDJSON event bus |
| context-sync-hook.cjs hash check | Assuming hash check prevents all redundant generation | Hash changes on every file write during planning; LLM generation needs a different debounce strategy |
| NDJSON session log | Appending large JSON blobs to event bus for generation output | Emit small status events only (generation_started, generation_complete, generation_failed); store output in separate file |
| config.json | Reading project config without cwd resolution | Use `hookData.cwd || process.cwd()` — same pattern as existing hooks |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous LLM calls in hook handler | Hook stalls Claude Code for 5–30s per Write event | Always `async: true`; generation runs in background process | Immediately on first use |
| Loading all .planning/ files for every generation | 15s+ startup time as project grows | Selective loading: each persona declares which files it needs | Projects with 50+ planning files |
| Embedding screenshots/images in HTML without size check | 50MB+ HTML files that fail to open | Hard file size budget (500KB) enforced before write | First project with design artifacts |
| Re-running full extraction on every auto-generation trigger | LLM costs multiply with event frequency | Cache extraction results with STATE.md modification time as cache key | Projects with frequent saves |
| Cross-project synthesis without parallel extraction | Portfolio generation takes minutes for 5+ projects | Run project extractions in parallel; set per-project timeout (10s) | Portfolios with more than 3 projects |

## Security Mistakes

Domain-specific security issues for a tool that reads project state and generates external-facing documents.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Including raw API keys or secrets from .planning/ files in generated presentations | Secrets in stakeholder-readable HTML/Markdown | Scrub patterns matching common secret formats (API keys, tokens, passwords) before passing to LLM; never include raw .env or config.json content |
| Writing generated presentations to a world-readable path | Portfolio documents accessible outside project boundary | Write to `.planning/presentations/` only; respect the same path isolation as existing artifacts |
| Cross-project path traversal via user-supplied project roots | Access to arbitrary filesystem paths | Validate each supplied project root is an absolute path with a readable `.planning/` directory; reject paths containing `..` |
| Generated HTML containing user-supplied content without sanitization | XSS if the HTML is served via a web server | Escape all project-sourced string values when inserting into HTML templates; treat all .planning/ content as untrusted |

## UX Pitfalls

Common experience mistakes when adding generation to a developer tool.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generation runs without any progress indication | User runs command, waits 30s with no feedback, assumes it crashed | Emit progress events: "Extracting project data...", "Generating executive summary...", "Writing HTML..." |
| Output file overwrites previous version without warning | Stakeholder-reviewed version replaced by new generation mid-milestone | Version outputs by timestamp suffix; never overwrite; user explicitly promotes a version |
| All 10 personas generated by default | 10 files written, most irrelevant to user's current need, confusion about which to share | Default to one persona (executive summary); explicit flag to generate others |
| Persona output includes PDE-internal terminology | Stakeholder reads about "Nyquist tests", "designCoverage fields", "RECONCILIATION.md" | Persona prompt must translate all PDE-internal terms to audience-appropriate language |
| Markdown and HTML outputs tell slightly different stories | Reader opens both formats, finds inconsistencies, loses trust in both | Generate Markdown first from structured data; render HTML from Markdown, not from a separate LLM call |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Data extraction layer:** Often missing cross-reference validation — verify that extracted values are checked against at least 2 source files before passing to LLM
- [ ] **Chart generation:** Often missing data accuracy test — verify that every chart value has a corresponding assertion against the source file it was extracted from
- [ ] **HTML output:** Often missing no-JavaScript constraint verification — verify document renders correctly with JavaScript disabled in Chrome
- [ ] **Auto-generation trigger:** Often missing mid-execution protection — verify that generation does not fire while a pde:plan-phase execution is in progress
- [ ] **Persona narrative:** Often missing post-generation claim verification — verify that all numeric claims in prose match the extracted data JSON
- [ ] **Cross-project synthesis:** Often missing schema version gate — verify that extraction of a v0.15-era project returns null for absent fields rather than zeros or defaults
- [ ] **File size budget:** Often missing at completion — verify that generated HTML file is below 500KB for a typical project state
- [ ] **Markdown/HTML consistency:** Often missing format parity check — verify that summary statistics (phase count, requirement count, dates) are identical between the two output formats

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| LLM hallucinated project facts in distributed presentation | HIGH | Immediately retract presentation; regenerate with stricter extraction-first prompt; add post-generation claim verification to prevent recurrence; manually verify next 3 generations |
| Chart data diverged from source | MEDIUM | Identify which source file was authoritative for the incorrect metric; add explicit source-of-truth annotation to chart extraction module; regenerate and diff against previous output |
| Auto-generation noise blocked workflow | LOW | Disable auto_generate in config.json; clear generation queue; re-enable with cooldown configured |
| HTML broke for stakeholder due to CSP/size | MEDIUM | Regenerate without inline scripts; check file size budget; send Markdown version as fallback while HTML is fixed |
| Cross-project portfolio showed wrong data for old project | MEDIUM | Add schema version detection for that project's version; re-run portfolio extraction with explicit null returns for absent fields; regenerate |
| 10-persona abstraction broke when adding persona 3 | HIGH | Revert to 2-persona baseline; extract shared abstractions only from confirmed duplication; rebuild personas 3–10 against stable shared layer |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| LLM narrative hallucination | Phase 1: Data extraction layer | Assertion: every LLM-generated numeric claim matches corresponding extraction JSON field |
| Chart data divergence | Phase 2: Chart generation with source-of-truth mapping | Assertion: chart values for standard project state match `grep` of STATE.md frontmatter |
| Auto-generation workflow noise | Phase 1: Hook integration design | Assertion: PostToolUse hook does NOT trigger generation; SessionEnd or idle gate does |
| Premature persona abstraction | Phase 2: Two reference personas before shared engine | Assertion: executive summary and case study pass all tests before PersonaRegistry abstraction is introduced |
| Self-contained HTML edge cases | Phase 3: HTML rendering | Assertion: output file < 500KB, no external URLs, passes render with JS disabled |
| Cross-project path/schema assumptions | Phase 4: Portfolio synthesis | Assertion: extraction of v0.15-era fixture returns null for absent fields; extraction of non-existent path returns structured error, not exception |

## Sources

- LLM hallucination rates: Stanford Legal RAG Hallucinations (2025) — 28–39% hallucination rates even with source material provided
- SVG generation pitfalls: VectorGym benchmark (OpenReview, 2025) — "inaccurate path counts", "incomplete SVGs" in LLM-generated vector graphics
- Self-contained HTML file size: cucumber/html-formatter issue #62 (GitHub) — reports growing from 7MB to 310MB; Allure issue #755 on single-file portability
- Abstraction maintenance overhead: "The Double-Edged Sword of Abstraction in Software Engineering" (blog.chinaza.dev, 2024)
- Event hook noise patterns: Cursor 1.7 Hooks release (InfoQ, 2025); Claude Code hook contracts from PDE's own context-sync-hook.cjs
- Cross-project sync pitfalls: MintLify monorepo guide and kinsta.com monorepo-vs-multi-repo (2024) — "breaking changes surface late" in cross-repo dependency
- HTML CSS rendering inconsistencies: designmodo.com "HTML and CSS in Emails: What Works in 2026" — inline CSS, no-flex, no-grid constraints

---
*Pitfalls research for: Stakeholder Presentation Generation Engine (PDE v0.22)*
*Researched: 2026-03-29*
