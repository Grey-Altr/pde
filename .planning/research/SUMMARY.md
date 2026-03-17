# Project Research Summary

**Project:** Platform Development Engine (PDE) — v1.3 Self-Improvement & Design Excellence
**Domain:** AI-powered Claude Code plugin with self-improvement capabilities and Awwwards-level design pipeline
**Researched:** 2026-03-17
**Confidence:** HIGH (stack and architecture — direct source inspection); MEDIUM (design quality outcomes, self-improvement patterns)

## Executive Summary

PDE v1.3 adds self-improvement capabilities, a skill builder, and Awwwards-level design elevation to an already-functioning 13-stage design pipeline. The core insight from combined research is that v1.3 is an augmentation milestone, not a restructuring one: all new capabilities extend the existing plugin architecture via reference injection and new top-level commands — nothing in the stable 13-stage pipeline is restructured. The recommended build order flows from the quality bar outward: define measurable Awwwards criteria first (reference files), build the audit fleet that uses those criteria second, elevate the design pipeline against those criteria third, build the skill builder that creates post-elevation-quality skills fourth, and validate everything with a pressure test fifth.

The single biggest technical risk is circular self-evaluation: if the agents that evaluate improved skills were also involved in generating them, they will consistently approve their own output, producing a "self-improvement loop" that improves nothing. Research is unambiguous that the quality rubric must be a human-authored artifact, written before any self-improvement agent exists, protected from modification by those agents, and used as an external fixed standard. A second related risk is generic AI aesthetic: LLMs trained on the modal web produce statistically average design output — technically correct, compositionally timid, immediately recognizable as AI-generated. Countering this requires the design elevation prompts to specify named, measurable Awwwards criteria (typography contrast rationale, choreographed motion, spatial asymmetry, visual hook) rather than asking for "high quality design."

The stack constraint is a feature: PDE is zero-dependency CommonJS Node.js and must remain so. All v1.3 additions — reference files, workflow modifications, new commands, new agent entries in model-profiles.cjs — follow the established pattern. No new npm dependencies. No architectural divergence. The self-improvement fleet uses the same Task()/resolve-model pattern already proven in `workflows/audit-milestone.md`. The skill builder uses the same read-modify-write pattern used by `/pde:update`. Build on what works.

## Key Findings

### Recommended Stack

PDE's stack is locked by Claude Code plugin constraints: zero-dependency CommonJS Node.js (20.x LTS), Markdown + YAML frontmatter for skill definitions, JSON for config, and LLM-generated content for all design artifacts. v1.3 adds no new npm dependencies. The additions are: three new reference files (loaded via `@` at skill runtime), five modified workflow files (additive `<required_reading>` entries only), three new commands (`audit`, `improve`, `pressure-test`), and four new agent type entries in `bin/lib/model-profiles.cjs`.

For v1.3 specifically, the reference injection pattern is the key architectural mechanism: design quality elevation is achieved by upgrading `<required_reading>` reference files, not by rewriting skill logic. This is additive and lower risk than logic changes.

**Core technologies:**
- Node.js 20.x LTS + CommonJS (.cjs): runtime and module format — required for Claude Code plugin compatibility; ESM is incompatible with the plugin invocation pattern
- Markdown + YAML frontmatter: skill/workflow/agent definitions — Claude Code's native format; all new commands follow this pattern
- Task() + resolve-model pattern: self-improvement fleet agent spawning — proven in `workflows/audit-milestone.md`; appropriate for analysis agents; distinct from Skill() for named PDE commands
- DTCG JSON with `transition` token type: motion token format — extends existing color/typography token output; zero new tooling
- Reference injection via `@`: design quality elevation mechanism — adds new knowledge to skill prompts without changing 7-step anatomy

### Expected Features

**Must have (table stakes for v1.3 to close):**
- `/pde:audit` tool audit skill — scans commands, agents, templates, references for quality gaps; produces structured report with severity levels (CRITICAL/HIGH/MEDIUM/LOW); diagnostic foundation for all other features; measures tool effectiveness, not just availability
- `/pde:improve` skill builder — creates and updates SKILL.md-conforming skill files; reads skill-style-guide.md as constraint; writes to `commands/` and `workflows/`; runs `validate-skill` as mandatory post-generation gate
- Self-improvement agent fleet — three core types: Auditor (read-only, produces gap list against fixed rubric), Improver (proposes changes to `.planning/improvements/` staging, never live files), Validator (checks proposals against quality rubric); reflection loop pattern (Auditor → Improver → Validator → revise if fail → human queue if pass)
- `references/quality-standards.md` — Awwwards 4-dimension rubric as shared reference (Design 40%, Usability 30%, Creativity 20%, Content 10%); human-authored before any agent exists; listed in `protected-files.json`; loaded by fleet agents and elevated design skills
- Design quality elevation — `system.md` (motion tokens, variable font axes, advanced OKLCH palette depth), `wireframe.md` (composition annotations, grid documentation), `mockup.md` (spring physics CSS, scroll-driven animations, micro-interaction states), `critique.md` (Awwwards 4-dimension rubric as evaluation framework), `hig.md` (motion accessibility audit)
- `/pde:pressure-test` — full 13-stage pipeline run on a real user project (not PDE itself); two-tier evaluation: process compliance (artifact existence, coverage flags) AND quality rubric evaluation (specific findings per artifact); produces `.planning/pressure-test-report.md`

**Should have (competitive differentiators):**
- Motion tokens in DTCG `transition` format — animation duration scale, easing curves, delay tokens added to system skill output; most design token systems omit animation entirely
- Per-stage quality gates — hook quality checking into each design pipeline stage; requires audit + improvement agents to be stable first; deferred to v1.3.x
- Skill discovery scan — audit also identifies missing skills the gap report recommends but do not yet exist
- Self-auditing pipeline — automated per-stage quality evaluation integrated with critique skill

**Defer (v1.3.x or v2+):**
- CI/CD integration for skill quality — requires Git hook infrastructure that does not exist
- Cross-project skill registry — blocked by PLUG-01 marketplace registration tech debt
- Sound design guidance — outside current HTML/CSS mockup output format
- Skill versioning/rollback system — Git history already serves this function; adding a version store is unnecessary complexity

### Architecture Approach

v1.3 adds a self-improvement layer above the existing 13-stage pipeline without touching it. The three new commands (`/pde:audit`, `/pde:improve`, `/pde:pressure-test`) are tooling-domain operations — they produce reports in `.planning/` (not design artifacts in `.planning/design/`), they do not set `designCoverage` flags, and they do not appear in `design-manifest.json`. Five modified workflow files change only by adding new reference files to `<required_reading>` — the 7-step skill anatomy, flag set, artifact paths, and coverage flag handling are all unchanged.

**Major components:**
1. `references/quality-standards.md` (NEW) — Awwwards-level criteria; single source of truth for all quality evaluation; loaded by fleet agents and elevated design skills; human-authored; in `protected-files.json`
2. Self-improvement fleet (NEW) — four Task() subagents in `bin/lib/model-profiles.cjs`: `pde-output-quality-auditor`, `pde-skill-linter`, `pde-design-quality-evaluator`, `pde-template-auditor`; spawned by `/pde:audit`; write scope constrained to their target files only; no writes to manifest or shared state
3. `/pde:audit` workflow (NEW) — orchestrates fleet in parallel for independent audits; aggregates findings; writes `.planning/audit-report.md`; evaluates tool effectiveness (representative query execution) not just availability
4. `/pde:improve` workflow (NEW) — two modes: `create` (new skill from description) and `improve` (targeted quality elevation of existing skill); reads skill-style-guide.md + tooling-patterns.md; runs `validate-skill` automatically; writes `.planning/skill-builder-log.md`
5. Design elevation via reference injection (MODIFIED x5) — `system.md`, `wireframe.md`, `mockup.md`, `critique.md`, `hig.md` load new references; no structural changes to these workflows; elevation is additive
6. `/pde:pressure-test` (NEW) — observer pattern; invokes `/pde:build` then evaluates artifacts against quality-standards.md; read-only against design state; all writes to `.planning/pressure-test-report.md` only

### Critical Pitfalls

1. **Circular self-evaluation** — agents rating their own generated output consistently approve it. Prevention: `references/quality-standards.md` human-authored before any agent exists; add to `protected-files.json`; audit agents return structured verdicts against the rubric, never free-text quality ratings; rubric must be written by humans as an input to the system, not as an output of it.

2. **Skill builder generates invalid plugin-format skills** — broken skills fail silently at invocation in Claude Code (no error at install time). Prevention: implement `pde-tools.cjs validate-skill {path}` that checks frontmatter YAML validity, allowed-tools list validity, workflow path existence, and skill code uniqueness in skill-registry.md; skill builder must call this automatically and reject invalid output before presenting to user.

3. **Generic AI aesthetic — technically correct, distinctively generic** — LLMs produce statistically modal design: Inter/Geist, purple-teal gradients, symmetric grids, decorative motion. Prevention: design elevation prompts must specify named, measurable criteria — typeface contrast with documented rationale (not just size contrast), motion choreographed to content meaning, deliberate asymmetric whitespace in at least one axis, one named visual hook per project; these are pass/fail gates in the critique skill, not suggestions.

4. **Pressure test measures completeness, not quality** — all coverage flags true does not equal quality pipeline. Prevention: pressure test must require both phases: (1) process compliance (artifact existence, flag state) and (2) rubric-based quality evaluation with specific findings; "passed" requires both to pass; no numeric score from tier 1 serves as proxy for tier 2 quality.

5. **Meta-prompt drift via iterative self-modification** — iterative self-modification optimizes away constraints over time without the system detecting degradation. Prevention: `protected-files.json` lists `workflows/improve.md`, `references/quality-standards.md`, `references/skill-style-guide.md`; fleet has an explicit allowed-write-directories list that excludes `bin/`, plugin root config, and shared planning state files; these files are human-only edits.

6. **Design elevation applied to mockup only, missing system and wireframe** — mockup quality ceiling is set by upstream token and layout quality; downstream quality cannot exceed upstream quality. Prevention: design elevation must follow system → wireframe → critique/iterate → mockup order; system skill must produce type pairing with documented rationale before mockup elevation begins; system and wireframe elevation are Phase 3 prerequisites for mockup.

## Implications for Roadmap

Based on combined research, a five-phase structure follows directly from the dependency graph in FEATURES.md and the build order recommendation in ARCHITECTURE.md.

### Phase 1: Quality Bar Infrastructure

**Rationale:** Everything in v1.3 depends on having measurable quality criteria. The fleet agents cannot audit against a standard that does not exist. The design elevation workflows cannot load references that have not been written. The pressure test cannot evaluate against a rubric that is not defined. This phase must ship before any other phase can proceed — it is the only hard blocker.

**Delivers:** Three new reference files (`references/quality-standards.md`, `references/awwwards-patterns.md`, `references/motion-design.md`); four new agent type entries in `bin/lib/model-profiles.cjs` and mirrored in `references/model-profiles.md`; three new skill registry entries (AUD, IMP, PRT) in `skill-registry.md`; `protected-files.json` with quality rubric and core workflow files protected.

**Addresses:** Awwwards scoring rubric (P1 feature); prevents Pitfalls 1, 3, 7 (circular evaluation, AI aesthetic, rubric drift) by establishing fixed external standards before any agent or elevation work begins.

**Avoids:** Building the audit fleet before the rubric exists (which would force the rubric to be AI-generated, creating the circular evaluation problem immediately).

### Phase 2: Self-Improvement Fleet and Audit Command

**Rationale:** Build the audit capability before building the skill builder. The audit produces the gap list that the skill builder acts on. Without an audit baseline, the skill builder has no grounded findings and produces arbitrary improvements rather than targeted ones. The baseline audit report also serves as the before-state measurement for Phase 3 — without it, there is no measurable delta from design elevation.

**Delivers:** `commands/audit.md`, `workflows/audit.md`; `templates/skill-audit-report.md`; working `/pde:audit` command that spawns fleet agents and writes `.planning/audit-report.md`; effectiveness criteria for each tool (Context7, agent prompts, templates) — not just availability checks; fleet write scope constrained before any agent runs.

**Addresses:** Tool audit skill (P1); self-improvement agents Auditor type (P1); Pitfall 6 (tool effectiveness vs availability); Pitfall 11 (fleet write scope and race conditions).

**Avoids:** Skipping the audit baseline before design elevation — the before/after comparison is the only way to confirm elevation actually improved output quality.

### Phase 3: Design Quality Elevation

**Rationale:** Reference injection is lower risk than skill restructuring — changes are additive, the 7-step anatomy is unchanged. Run `/pde:audit` at the start of this phase for a baseline. Elevate in dependency order: system → wireframe → critique/iterate → mockup. Elevating mockup without elevating system first produces mockup output constrained by a generic token foundation (Pitfall 10). Re-run `/pde:audit` after this phase to confirm measurable delta against the baseline.

**Delivers:** Modified `workflows/system.md` (motion tokens, variable font axes, advanced OKLCH depth, `@references/awwwards-patterns.md` and `@references/motion-design.md` added to required_reading); `workflows/wireframe.md` (composition annotations, grid system documentation, `@references/awwwards-patterns.md`); `workflows/mockup.md` (spring physics CSS, scroll-driven animations via @scroll-timeline, micro-interaction states, variable font usage, `@references/motion-design.md`); `workflows/critique.md` (Awwwards 4-dimension rubric as evaluation framework, `@references/quality-standards.md`); `workflows/hig.md` (motion accessibility audit, prefers-reduced-motion compliance, `@references/motion-design.md`).

**Addresses:** Design quality elevation features (P1 for mockup + critique; P2 for system); motion tokens in DTCG format (P2); prevents Pitfalls 4, 8, 10 (AI aesthetic, false confidence from automated metrics, mockup-only elevation).

**Avoids:** Any structural changes to existing skills — only `<required_reading>` additions and output instruction text extensions.

### Phase 4: Skill Builder

**Rationale:** The skill builder comes after design elevation for a deliberate quality reason: it creates skills by reading existing skills as pattern examples. Building it after Phase 3 means any skill it creates will be modeled on the elevated versions of system, mockup, and critique — not the pre-elevation versions. The `validate-skill` command is a Phase 4 deliverable (not deferred) because the skill builder without validation is a broken-skills generator.

**Delivers:** `pde-tools.cjs validate-skill` command (frontmatter YAML, allowed-tools validity, workflow path existence, skill code uniqueness checks); `commands/improve.md`, `workflows/improve.md`; working `/pde:improve` in both `create` and `improve` modes; `.planning/skill-builder-log.md` output; skill builder has explicit write scope (commands/, workflows/ only; bin/ and protected files excluded).

**Addresses:** Skill builder capability (P1); Pitfall 2 (invalid skill generation via mandatory validation gate); Pitfall 3 (skill upgrades breaking in-progress projects — improve mode defaults to additive-only changes).

**Avoids:** Skill builder with write access to protected files (protected-files.json from Phase 1 enforces this); generating skills before the quality bar exists (would produce pre-elevation-quality skills as the template).

### Phase 5: Pressure Test and Validation

**Rationale:** The pressure test validates Phases 1-4. It must run after design elevation so quality scores reflect elevated output. Test fixtures (greenfield state, partially-complete state, re-run state) must be built as the first deliverable of this phase — before any test execution. The pressure test is the final gate for the v1.3 milestone; it either confirms the milestone is complete or surfaces gaps requiring another improvement cycle before close.

**Delivers:** `templates/pressure-test-report.md`; `commands/pressure-test.md`, `workflows/pressure-test.md`; test fixtures for three pipeline entry states (greenfield, partially-complete with 5-8 stages done, re-run of a completed stage); two-tier evaluation pass (process compliance + rubric-based quality evaluation with specific findings); `.planning/pressure-test-report.md` from a real user project run.

**Addresses:** End-to-end pressure test (P1); Pitfalls 5 and 9 (completeness-only measurement, greenfield-only testing).

**Avoids:** Running the pressure test on the PDE plugin directory itself (anti-pattern: PDE is a tool, not a product with users; its planning state is development roadmap data, not a product design brief); declaring success on process compliance alone without quality evaluation tier.

### Phase Ordering Rationale

- Phase 1 before everything: quality rubric is a shared dependency for fleet agents, elevated design skills, and the pressure test; building any of them before the rubric exists forces AI-generated rubric criteria (circular evaluation)
- Phase 2 before Phase 3: audit baseline enables measurable before/after comparison; without it, design elevation produces unmeasurable improvement claims
- Phase 3 before Phase 4: skill builder models output on existing skills as examples; elevated skills produce better templates for new skill generation
- Phase 3 elevation order: system → wireframe → critique/iterate → mockup (upstream quality sets downstream ceiling; do not elevate mockup before system)
- Phase 4 before Phase 5: pressure test validates all previous phases; running it earlier validates a pre-elevation state and provides false milestone confidence
- Phases 3 and 4 have low coupling — if Phase 3 scope expands, Phase 4 is not blocked; they share only the reference files from Phase 1

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (audit fleet — effectiveness criteria):** The research identifies the requirement that tool effectiveness criteria must be defined before the audit runs, but does not enumerate the specific criteria for Context7, Brave Search, agent prompts, and templates. These are domain-specific and require the team to define what "an effective Context7 query" looks like within PDE's agent prompt patterns before the audit workflow can implement the effectiveness check.
- **Phase 3 (mockup elevation — custom interaction design):** Research explicitly flags that translating "custom interaction design" into AI-generatable instructions is "genuinely hard." The CSS @scroll-timeline spec and spring physics easing patterns need concrete implementation examples authored into `references/motion-design.md` before mockup elevation can produce Awwwards-differentiating output. Plan extra iteration cycles for this skill specifically.
- **Phase 5 (pressure test — quality evaluation tier):** Research establishes the two-tier requirement but does not resolve whether Tier 2 (qualitative rubric evaluation) is human-executed or AI-with-rubric. The team must decide this before Phase 5 planning. If AI-with-rubric, the quality evaluator agent needs a more prescriptive system prompt than current research specifies; if human-executed, the test plan must define a structured review protocol.

Phases with standard patterns (skip research-phase):
- **Phase 1 (reference files):** Writing reference files is documentation and research synthesis. Awwwards criteria are publicly documented. No implementation unknowns — this is human authoring work.
- **Phase 4 (skill builder):** The Claude Code SKILL.md format is verified from official docs (HIGH confidence). The skill builder pattern follows the established read-modify-write convention already used by `/pde:update`. Standard 7-step skill anatomy.
- **Phase 5 (pressure test process compliance tier):** Boolean coverage flag checks are mechanical. The `--from` flag behavior is already implemented and documented. Standard pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct source inspection of PDE codebase. Zero-dependency Node.js constraint is structural. DTCG format, Mermaid generation approach, v1.1/v1.2 patterns all verified against source. Claude Code SKILL.md format verified from official docs. |
| Features | HIGH (table stakes), MEDIUM (differentiators) | Table stakes derived directly from PROJECT.md active requirements — these are explicit. Awwwards criteria verified from official rubric (Design 40%/Usability 30%/Creativity 20%/Content 10%). Implementation complexity of "custom interaction design" is genuinely uncertain — this is the high-risk feature. |
| Architecture | HIGH | All architecture decisions grounded in direct source inspection. Build order is dependency-derived. Task()/resolve-model pattern is proven in existing `workflows/audit-milestone.md`. No speculation or training-data inference in ARCHITECTURE.md. |
| Pitfalls | HIGH (structural), MEDIUM (design quality) | Structural pitfalls (circular evaluation, skill format compliance, manifest corruption, fleet write scope) are mechanical and grounded in codebase inspection. Design quality pitfalls (AI aesthetic, Awwwards criteria application) rely on industry research with medium confidence — consistent with first-principles LLM behavior but not verified against PDE-specific outputs. |

**Overall confidence:** HIGH for build order, architecture, and stack; MEDIUM for design quality outcomes (whether reference injection achieves Awwwards-level output is probabilistic and requires iteration cycles).

### Gaps to Address

- **"Custom interaction design" in AI-generatable terms:** Research identifies this as the single biggest Awwwards differentiator but does not resolve how to specify it prescriptively enough for reliable LLM output. Recommend authoring `references/awwwards-patterns.md` with concrete named patterns (specific scroll effect types, type animation techniques, spatial tension approaches with examples) rather than general principles. Validate during Phase 3 by running mockup skill against rubric before declaring elevation complete — expect multiple critique/iterate cycles.

- **Pressure test quality evaluation tier design:** Research establishes the two-tier requirement (process compliance + quality evaluation) but does not specify the quality evaluation mechanism. Must be resolved before Phase 5 planning. Options: (a) human review pass against rubric criteria — higher accuracy, requires time; (b) AI judge agent with prescriptive rubric — scalable, needs careful prompt design to avoid circular evaluation. Either way, the quality evaluation must produce specific design findings, not numeric scores.

- **`protected-files.json` complete enumeration:** Research identifies the need for this file and its purpose but does not enumerate the complete protected list. At minimum: `workflows/improve.md`, `references/quality-standards.md`, `references/skill-style-guide.md`, all `bin/lib/*.cjs`, `bin/pde-tools.cjs`, plugin root config files. The complete list should be defined and committed in Phase 1 before any fleet agent has write access to any file.

- **Skill builder "improve" mode depth boundary:** Research does not specify how deeply "improve" mode should modify existing skills — cosmetic compliance fixes vs. substantive output instruction rewrites. This scope decision directly affects backward-compatibility risk (Pitfall 3). Recommend defaulting to additive-only improvements (adding missing required fields, extending output instructions) with full rewrites requiring explicit user confirmation flag (`--rewrite`). Define this boundary in Phase 4 planning before implementation.

## Sources

### Primary (HIGH confidence)
- PDE codebase direct inspection — `bin/lib/model-profiles.cjs`, `references/tooling-patterns.md`, `references/skill-style-guide.md`, `workflows/audit-milestone.md`, `workflows/critique.md`, `workflows/system.md`, `workflows/mockup.md`, `skill-registry.md`, `templates/design-manifest.json`, `.planning/PROJECT.md`
- Claude Code official docs (code.claude.com/docs/en/skills) — SKILL.md format, frontmatter fields, supporting files structure, invocation control, subagent patterns
- designtokens.org DTCG 2025.10 spec — $value/$type token format, `transition` token type for motion

### Secondary (MEDIUM confidence)
- Awwwards official rubric — Design 40%, Usability 30%, Creativity 20%, Content 10%; 8.0+ SOTD threshold; custom interaction as primary differentiator (from utsubo.com/blog analysis + Awwwards annual awards page)
- Google Cloud agentic AI architecture docs — reflection loop pattern, self-evaluation, auditor-improver patterns
- Databricks agent system design patterns — loop pattern, critic pattern, self-improvement workflows
- Anthropic skills public repo (github.com/anthropics/skills) — AgentSkills open standard, plugin skills/ directory structure
- Awwwards animation techniques analysis — scroll-triggered effects, variable font animation, motion choreography (Medium, Design Bootcamp)
- Smashing Magazine, "The AI Dilemma in Graphic Design: Typography and Beyond" (2024) — AI-generated design's generic aesthetic problem

### Tertiary (LOW confidence)
- AI design quality benchmarks (typeface.ai) — limited to brand/image quality, not web design composition; used only to understand the gap in existing evaluation approaches
- "AI Agent Versioning and Lifecycle Management" (2025) — tool versioning as production failure cause; single source, not verified against official documentation
- Intuition Labs meta-prompting guide (2025) — circular reasoning risk when same model generates and evaluates; consistent with first-principles analysis but limited to single source

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
