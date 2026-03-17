# Feature Research

**Domain:** Self-improving AI systems, skill builders, and Awwwards-level design generation for Claude Code plugin (PDE v1.3)
**Researched:** 2026-03-17
**Confidence:** HIGH (Claude Code skills API — verified against official docs), MEDIUM (Awwwards criteria — verified with official scoring rubric + multiple sources), MEDIUM (self-improvement agent patterns — verified with Google Cloud, Databricks architecture docs), LOW (design quality metrics for AI-generated output — emerging field, limited official standards)

---

> **Scope note:** This file covers ONLY the six new v1.3 capability areas. The v1.1 and v1.2 skills (all 13 pipeline stages, build orchestrator, design state tracking) are treated as stable dependencies that already exist.

---

## Existing System Baseline

Before mapping features, the existing capabilities that v1.3 builds on:

```
Skills (commands):          34 /pde: slash commands
Design pipeline:            13 stages: recommend → competitive → opportunity → ideate →
                            brief → system → flows → wireframe → critique → iterate →
                            mockup → hig → handoff
State tracking:             DESIGN-STATE.md, design-manifest.json (13 coverage flags)
Agent types:                12 agent types, parallel wave orchestration
Build orchestrator:         /pde:build --from [stage]
Plugin format:              Claude Code plugin with commands/ directory
Node.js runtime:            CommonJS, bin/pde-tools.cjs, bin/lib/*.cjs
References:                 typography.md, color-systems.md, design-principles.md,
                            skill-style-guide.md, tooling-patterns.md, etc.
```

v1.3 adds capabilities ON TOP of this. It does not restructure the existing system.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist for the v1.3 milestone to be considered complete. Missing these means the milestone does not meet its stated goals.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Tool audit skill (`/pde:audit`) | "Audit PDE tooling" is explicitly listed as an active requirement in PROJECT.md. Without this, there is no mechanism to detect quality gaps. | MEDIUM | Reads commands/, workflows/, references/, templates/, bin/lib/; produces structured report |
| Skill builder capability (`/pde:skill-build`) | Explicitly listed as active requirement: "Build skill-builder capability — PDE can create, update, and improve its own skills and user project skills." | HIGH | Claude Code SKILL.md format (verified: name, description, frontmatter, supporting files structure); needs skill-style-guide.md as constraint reference |
| Self-improvement agents (audit, validate, elevate) | Explicitly listed: "Build self-improvement fleet." Without agent definitions, self-improvement is manual only. | HIGH | Existing 12 agent types serve as template; new agents extend that registry |
| Design quality elevation (typography, color, motion, composition) | Explicitly listed: "Elevate design quality — upgrade design pipeline output to Awwwards-level." This is the primary design goal of the milestone. | HIGH | All 13 existing design skills are targets; system.md, wireframe.md, mockup.md are highest impact |
| Awwwards-quality scoring rubric | Without a measurable rubric, "Awwwards-level" is subjective. The pressure test needs criteria to pass/fail. | MEDIUM | References the existing design-principles.md, color-systems.md; new scoring dimensions added |
| End-to-end pressure test (`/pde:pressure-test` or documented procedure) | Explicitly listed: "Pressure test — full end-to-end pipeline on a real project, measured against professional design standards." | MEDIUM | Runs the full 13-stage pipeline; requires all quality elevations to be in place first |

### Differentiators (Competitive Advantage)

Features that set PDE apart from other AI-assisted design tools and other Claude Code plugins.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Skill creator that writes conforming SKILL.md files | Most Claude Code users write skills manually. PDE can create correctly-structured, style-guide-conforming skills programmatically. This is unique in the ecosystem. | HIGH | Must produce SKILL.md files matching Claude Code's YAML frontmatter spec (verified: name, description, disable-model-invocation, allowed-tools, context, agent fields). Must also produce supporting files directories. |
| Self-auditing design pipeline | PDE audits its own output quality after each stage — not just at the end. If a mockup fails Awwwards criteria, it flags before handoff. | HIGH | Requires per-stage quality gate integration into the critique skill and/or a new audit hook |
| Awwwards-specific design scoring as a skill | No known AI tool outputs structured Awwwards-criteria scoring (Design 40%, Usability 30%, Creativity 20%, Content 10%). PDE can produce this as a machine-readable score on its own output. | MEDIUM | Scoring weights are verified from official Awwwards rubric. Must score 8.0+ average to meet SOTD standard. |
| Reflection-loop agents for design critique | Self-improvement agents that generate output, then switch into critic mode to assess it, then revise — all within one agent invocation. This is the "reflection pattern" from agentic AI literature. | HIGH | Distinct from existing critique skill (which is human-facing). This is automated quality cycling. |
| Tool optimization pass (Context7, agent prompts, templates) | Active scanning of all agent prompts and templates against discovered best practices, with automated improvement proposals. | MEDIUM | Requires reading all workflow/*.md and templates/**/*.md files systematically |
| Motion and animation tokens in DTCG format | Current design system produces DTCG typography + color tokens. Adding motion tokens (duration, easing, delay, transform curves) makes the system Awwwards-competitive. Most design token systems skip animation. | MEDIUM | Extends existing tokens output from system skill; motion reference does not yet exist |
| Pressure test scorecard with pass/fail criteria | A structured document that lets users validate their full pipeline output against professional standards before shipping. | MEDIUM | Requires defining what "pass" means across all 13 pipeline stages |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Fully autonomous self-modification (PDE rewrites its own commands) | Seems like the ultimate self-improvement | AI systems that rewrite their own core logic without human review create unpredictable behavior and break reproducibility. The file-based state model makes this especially risky — corrupted commands would corrupt all user projects using PDE. | Propose improvements as files in `.planning/improvements/` for human review and merge. Never auto-apply to live commands. |
| Generic LLM quality metrics (BLEU, ROUGE, perplexity) | Borrowed from NLP evaluation literature | These metrics measure text similarity, not design quality. Awwwards judges care about visual hierarchy, interaction design, and creativity — none of which BLEU captures. | Domain-specific rubric: Awwwards criteria (Design 40%, Usability 30%, Creativity 20%, Content 10%) applied to design artifacts directly. |
| Continuous background self-improvement loop | Sounds like "always getting better" | Claude Code is session-based. Background loops have no persistent state across sessions. Trying to implement them causes confusion about when improvement happened and which session triggered it. | Explicit skill invocations that users run intentionally: `/pde:audit`, `/pde:skill-build`, `/pde:improve`. |
| Three.js / WebGL / WebGPU in mockup output | Awwwards winners heavily use 3D and WebGL. Seems like a path to high creativity scores. | PDE mockups are HTML/CSS static files used as handoff references for engineers. Embedding Three.js creates unrunnable artifacts without a dev server, explodes file size, and moves away from the mockup's purpose (communicate design intent, not implement interaction). | Document Three.js/WebGL as implementation recommendations in handoff spec. The HANDOFF artifact is the right place to specify "this animation requires Three.js r171." |
| Automated Awwwards submission | Completes the pipeline end-to-end | Awwwards judges human-to-human authenticity and concept-driven design. Automated submissions are detectable (judges explicitly train for this) and would damage credibility. The goal is output quality that could win — not automated submission. | Pressure test produces a scorecard. User decides whether to submit. |
| Skill versioning / rollback system | Sounds like safe self-improvement | Adds significant infrastructure complexity (a version store, diff system, rollback mechanism) to a file-based plugin that has no database. Git serves this role already — skills live in version-controlled files. | Document that git history serves as skill version history. The skill builder writes new versions with `v{N}` suffixes following existing PDE naming patterns. |

---

## Feature Dependency Map

```
[EXISTING: 13-stage design pipeline]
    └──read-by──> [Tool Audit Skill]
                      └──produces──> [Audit Report]
                                         └──inputs──> [Skill Builder]
                                                          └──produces──> [Improved SKILL.md files]

[EXISTING: design pipeline output: system, wireframe, mockup]
    └──evaluated-by──> [Awwwards Scoring Rubric]
                           └──used-by──> [Self-Improvement Agents]
                                             └──produces──> [Design Quality Elevation]

[Design Quality Elevation]
    └──depends-on──> [Motion Tokens Reference] (new)
    └──depends-on──> [Awwwards Scoring Rubric] (new)
    └──updates──> [EXISTING: system.md skill] (upgraded output)
    └──updates──> [EXISTING: mockup.md skill] (upgraded output)
    └──updates──> [EXISTING: critique.md skill] (upgraded criteria)

[Pressure Test Procedure]
    └──requires──> [Design Quality Elevation] (must be in place first)
    └──requires──> [Awwwards Scoring Rubric] (scorecard criteria)
    └──exercises──> [EXISTING: full 13-stage pipeline]
    └──produces──> [Pass/Fail Scorecard]

[Skill Builder]
    └──requires──> [Tool Audit] (knows what to build/improve)
    └──reads──> [EXISTING: skill-style-guide.md] (output format constraints)
    └──reads──> [Claude Code SKILL.md spec] (verified format: YAML frontmatter + markdown)
    └──writes──> [new SKILL.md files in commands/ or skills/ directory]

[Self-Improvement Agents]
    └──requires──> [EXISTING: agent registry / 12 agent types] (as template pattern)
    └──uses-pattern──> [Reflection Loop] (generate → critique → revise)
    └──uses-pattern──> [Orchestrator → Auditor → Improver] (multi-agent audit chain)
```

### Dependency Notes

**Tool Audit must run before Skill Builder:** The audit produces the gap list that the builder acts on. Building skills without an audit produces arbitrary improvements rather than targeted ones. These should be sequential in the roadmap.

**Design Quality Elevation must run before Pressure Test:** The pressure test validates the elevated design pipeline. Running it on the unimproved pipeline is a baseline measurement, not a validation.

**Awwwards Scoring Rubric is a shared dependency:** Both the Self-Improvement Agents and the Pressure Test need this rubric. It should be a new reference file (`references/awwwards-criteria.md`) rather than embedded in any single skill.

**Motion Tokens are a sub-dependency of Design Quality Elevation:** The system skill needs motion token generation before the mockup skill can reference them. Motion tokens first, then mockup elevation.

**Skill Builder does not conflict with existing commands:** The Claude Code skills API allows writing new SKILL.md files without touching existing commands/ files. The builder targets the new `.claude/skills/` directory for new skills, or writes proposed edits to a staging area for human review.

---

## MVP Definition (for v1.3 Milestone)

### Launch With (v1.3)

Minimum viable for the milestone to close. These directly address the active requirements in PROJECT.md.

- [ ] **Tool audit skill** — Scans PDE's own commands, agents, templates, references for quality gaps. Produces structured report. This is the diagnostic foundation everything else builds on.
- [ ] **Skill builder capability** — Creates and updates SKILL.md files for both PDE internals and user project skills. Writes conforming Claude Code skill format (verified: YAML frontmatter + markdown content + optional supporting files directory).
- [ ] **Self-improvement agent fleet** — At minimum 3 agent types: Auditor (reads and evaluates), Improver (proposes changes), Validator (checks proposed changes meet quality bar). Pattern: reflection loop (generate → critic mode → revise).
- [ ] **Awwwards scoring rubric reference file** — New `references/awwwards-criteria.md` with the 4-dimension scoring model (Design 40%, Usability 30%, Creativity 20%, Content 10%) and concrete criteria at each level. This is shared infrastructure for elevation and pressure test.
- [ ] **Design quality elevation (system + mockup + critique upgrades)** — Specifically: motion token generation in system skill, advanced composition guidance in wireframe/mockup, Awwwards-criteria-based feedback in critique skill. These three skills are the highest-impact targets.
- [ ] **End-to-end pressure test** — Run the full 13-stage pipeline on a real (not synthetic) product concept. Evaluate output against Awwwards rubric. Produce a scored report.

### Add After Validation (v1.3.x)

Features to add once core self-improvement loop is working.

- [ ] **Motion tokens in DTCG format** — Add animation timing (duration scale, easing curves, delay tokens) as DTCG `transition` type tokens in the system skill. Trigger: when system skill elevation is complete and tested.
- [ ] **Per-stage quality gates** — Hook quality checking into each design pipeline stage (not just critique). Trigger: when audit + improvement agents are stable.
- [ ] **Skill discovery scan** — Have the tool audit also scan for missing skills that the audit report recommends but don't yet exist. Trigger: when skill builder and audit are integrated.
- [ ] **Pressure test scorecard template** — A reusable template that users run on their own projects (not just PDE internal validation). Trigger: after pressure test procedure is documented and validated.

### Future Consideration (v2+)

- [ ] **CI/CD integration for skill quality** — Automated skill quality checks on every commit. Deferred because PDE is file-based; requires Git hook infrastructure that doesn't exist yet.
- [ ] **Cross-project skill registry** — A shared catalog of PDE-built skills that users can install. Deferred because marketplace registration (PLUG-01 tech debt) is not resolved.
- [ ] **Sound design guidance** — Awwwards winners use sound design for interaction feedback. Deferred because sound is outside the current HTML/CSS mockup output format.
- [ ] **WebGPU/Three.js integration guidance** — Currently an anti-feature for mockups, but could be a valid handoff recommendation for high-creativity scores. Deferred because it requires handoff format expansion.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Tool audit skill | HIGH — baseline for all improvement | LOW-MEDIUM — reads files, produces report | P1 |
| Awwwards scoring rubric (reference file) | HIGH — shared dependency for 3+ other features | LOW — documentation + research | P1 |
| Design quality elevation: mockup skill | HIGH — most visible design output | HIGH — requires motion token spec, composition rules, advanced CSS | P1 |
| Design quality elevation: critique skill | HIGH — critique currently uses generic criteria; Awwwards-specific criteria change what gets flagged | MEDIUM — update criteria scoring model | P1 |
| Skill builder capability | HIGH — enables PDE to improve itself | HIGH — must produce valid Claude Code SKILL.md format with all frontmatter fields correctly | P1 |
| Self-improvement agents (Auditor + Improver + Validator) | HIGH — the "self-improvement fleet" requirement | HIGH — 3 new agent types, reflection loop pattern | P1 |
| End-to-end pressure test | HIGH — validates everything else works | MEDIUM — procedure + scorecard; actual run complexity depends on pipeline stability | P1 |
| Motion tokens in DTCG format | MEDIUM — needed for Awwwards creativity scores, but system skill already handles the token foundation | MEDIUM — new token type, new reference file section | P2 |
| Design quality elevation: system skill | MEDIUM — system already produces DTCG tokens + CSS; elevation is additive | MEDIUM — add motion tokens, advanced color harmony | P2 |
| Per-stage quality gates | MEDIUM — improves pipeline robustness | HIGH — requires hook integration with existing skills | P3 |
| Skill discovery scan | MEDIUM — nice-to-have for audit completeness | LOW — extends audit output | P3 |
| Pressure test scorecard template (user-facing) | MEDIUM — helps users validate their projects | LOW — template writing | P3 |

**Priority key:**
- P1: Must have for v1.3 milestone to close
- P2: Should have, include if time permits
- P3: Nice to have, defer to v1.3.x

---

## Domain-Specific Feature Detail

### 1. Tool Audit Skill (`/pde:audit`)

**What it audits:**
- Commands (commands/*.md): skill completeness, flag compliance, help text presence, summary table presence
- Agent prompts: quality of instructions, specificity, missing tool grants
- Templates: completeness, placeholder coverage, format validity
- References: currency of cited sources, coverage gaps
- Output quality (spot-check against Awwwards rubric): sample the most recent DESIGN-STATE.md outputs

**Output format:** Structured Markdown report in `.planning/audit/` with severity levels (CRITICAL, HIGH, MEDIUM, LOW) and recommended actions.

**Relationship to existing tools:** The `/pde:test` skill runs functional tests. The audit skill assesses quality and completeness — not just pass/fail.

**Confidence:** MEDIUM. The scope of what to audit is well-defined (commands, agents, templates, references). The criteria for what counts as "high quality" for each artifact type requires defining in the Awwwards reference before the audit skill can apply them.

### 2. Skill Builder (`/pde:skill-build`)

**Claude Code SKILL.md format (verified from official docs at code.claude.com):**
```yaml
---
name: skill-name          # lowercase, hyphens, max 64 chars
description: "What it does and when to invoke"
disable-model-invocation: true   # optional: prevents auto-invoke
allowed-tools: Read, Grep, Glob  # optional: tool grants
context: fork                    # optional: runs in subagent
agent: Explore                   # optional: subagent type
---

Skill instructions in markdown...

$ARGUMENTS   # placeholder for user-provided args
```

**Supporting files structure (verified):**
```
my-skill/
├── SKILL.md           # Required — main instructions
├── examples.md        # Optional — example outputs
├── reference.md       # Optional — detailed reference
└── scripts/
    └── helper.sh      # Optional — executable scripts
```

**What the skill builder produces:**
- New `commands/{skill-name}.md` files for PDE-internal command additions
- New `.claude/skills/{skill-name}/SKILL.md` for user project skills
- Conforming to PDE's skill-style-guide.md: flags (--dry-run, --quick, --verbose, --no-mcp), summary table, help text

**Invocation modes:**
- `create` — build a new skill from description
- `improve` — evaluate and enhance an existing skill
- `eval` — run evaluation test cases against a skill's behavior

**Confidence:** HIGH for format correctness (official docs verified). MEDIUM for the "eval" mode — testing a skill's behavior requires running it, which requires a real project context.

### 3. Self-Improvement Agents

**Three core agent types needed (new additions to existing 12-type registry):**

**Auditor agent:** Read-only. Loads all PDE commands, workflows, references. Evaluates against quality rubric. Produces gap list with severity. Pattern: Explore-agent level permissions (Read, Grep, Glob — no writes).

**Improver agent:** Proposes specific changes as diff-like suggestions. Never writes to live commands. Writes proposals to `.planning/improvements/{skill-name}-proposed.md`. Pattern: Plan-agent level (research + write to staging only).

**Validator agent:** Takes an Improver's proposal and checks it for: format correctness, skill-style-guide compliance, no regressions against existing behavior, Awwwards-criteria coverage. Returns PASS/FAIL with reasons.

**Reflection loop pattern (verified from agentic AI architecture docs):**
```
Auditor → Improver → Validator → [if FAIL: Improver revises] → [if PASS: human review queue]
```

The loop runs within a single orchestrated session, not across sessions (session-based constraint of Claude Code).

**Confidence:** MEDIUM. The reflection loop pattern is well-established in agentic AI literature (verified with Google Cloud and Databricks architecture docs). The specific implementation within Claude Code's constraints (no persistent state, session-based) requires validation during implementation.

### 4. Awwwards Design Quality Elevation

**Verified Awwwards scoring weights (from official rubric + multiple sources):**
| Dimension | Weight | What Judges Evaluate |
|-----------|--------|----------------------|
| Design | 40% | Visual hierarchy, typography, color, micro-details (hover states, transitions), consistency |
| Usability | 30% | Navigation clarity (<3 sec discovery), 60fps animations, no layout shifts, responsive, Core Web Vitals, accessibility |
| Creativity | 20% | Custom interaction patterns, unconventional navigation, concept-driven approach, motion choreography |
| Content | 10% | Real finished content, professional copywriting, design-integrated content |

**Gap analysis: what PDE's design pipeline currently lacks vs. Awwwards bar:**

| Gap | Affected Skill | Elevation Action |
|-----|----------------|-----------------|
| No motion/animation tokens | system skill | Add DTCG `transition` tokens: duration scale, easing curves, delay scale |
| Wireframes lack composition principles (golden ratio, rule of thirds, visual weight) | wireframe skill | Add composition analysis step with explicit grid and visual weight guidance |
| Mockups produce functional HTML/CSS but lack micro-interaction specification | mockup skill | Add interaction choreography section: hover curves, scroll behaviors, state transitions |
| Critique uses generic design feedback | critique skill | Replace generic checklist with Awwwards 4-dimension rubric as evaluation framework |
| No variable font animation guidance | system skill | Add variable font axis animation to motion token section |
| Color system lacks perceptual contrast analysis (APCA) | system skill | Already uses OKLCH — add APCA-aware contrast checking guidance |

**Custom interaction is the single biggest differentiator:** The Awwwards guide states explicitly that "custom interaction design is the single biggest differentiator — template-based and AI-generated sites are immediately recognizable to experienced judges." This means PDE's elevation strategy must prioritize generating custom, concept-specific interaction patterns — not generic hover states.

**Confidence:** MEDIUM-HIGH. Awwwards criteria are public and well-documented. The gap between current PDE mockup output and Awwwards standard is knowable by inspection. The implementation challenge is translating "custom interaction design" into AI-generatable instructions — this is genuinely hard.

### 5. End-to-End Pressure Test

**What it validates:** Run the full 13-stage pipeline (`/pde:build`) on a real product concept. Evaluate every output artifact against the Awwwards rubric and skill-style-guide standards. Produce a pass/fail scorecard.

**Pass criteria (based on Awwwards SOTD threshold — verified as 8.0/10 average):**
- Design score: 7.5+ (of 10)
- Usability score: 7.5+ (of 10)
- Creativity score: 7.0+ (of 10)
- Content score: 7.5+ (of 10)
- Overall: 8.0+ weighted average

**What the scorecard captures:**
- Per-stage output quality (did each skill produce complete, quality output?)
- Per-dimension Awwwards score (manually evaluated by user or auto-scored by a judge agent)
- Gaps found (what failed, what needs another improvement iteration)
- Token and time cost of the full pipeline (operational metrics)

**Confidence:** MEDIUM. The scorecard structure is definable now. The actual scoring of a specific run's output requires the elevated pipeline to be in place first — this is correctly ordered as the last step.

---

## Competitor Feature Analysis

| Feature | Other Claude Code plugins | AI design tools (Framer AI, Relume, Webflow AI) | PDE v1.3 approach |
|---------|--------------------------|--------------------------------------------------|-------------------|
| Self-improvement / self-audit | Not found in any known Claude Code plugin | Not applicable — design tools don't audit themselves | First-in-class: tool audit + self-improvement agent fleet |
| Skill creation | Manual (user writes SKILL.md) | N/A | Programmatic: `/pde:skill-build` writes conforming SKILL.md files |
| Design quality rubric | None — outputs are judged visually | Framer AI: template-based, no explicit quality scoring | Awwwards 4-dimension rubric embedded in critique skill and pressure test |
| Motion/animation tokens | Not found | Framer has built-in animation but no token export | DTCG `transition` tokens (new v1.3 addition) |
| End-to-end pipeline validation | None found | Relume: page-level completeness only | 13-stage pipeline pressure test with pass/fail scorecard |
| Custom interaction guidance | None found | Template patterns only | Concept-driven interaction choreography in mockup skill (highest differentiator) |

---

## Sources

- **Claude Code Skills API** (HIGH confidence): https://code.claude.com/docs/en/skills — verified SKILL.md format, frontmatter fields, supporting files structure, invocation control, subagent patterns
- **Awwwards scoring criteria** (MEDIUM-HIGH confidence): https://www.utsubo.com/blog/award-winning-website-design-guide — Design 40%, Usability 30%, Creativity 20%, Content 10%; 8.0+ threshold for SOTD; custom interaction as primary differentiator
- **Awwwards official site** (MEDIUM confidence): https://www.awwwards.com/annual-awards/ — confirmed scoring model is active in 2025
- **Agentic AI design patterns** (MEDIUM confidence): https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system — reflection loop, self-evaluation, auditor-improver patterns
- **Agentic AI patterns (Databricks)** (MEDIUM confidence): https://docs.databricks.com/aws/en/generative-ai/guide/agent-system-design-patterns — loop pattern, critic pattern, self-improvement workflows
- **Anthropic skills public repo** (MEDIUM confidence): https://github.com/anthropics/skills — confirmed AgentSkills open standard, plugin skills/ directory structure
- **Awwwards animation techniques** (MEDIUM confidence): https://medium.com/design-bootcamp/awwward-winning-animation-techniques-for-websites-cb7c6b5a86ff — scroll-triggered, variable font animation, motion choreography
- **AI design quality benchmarks** (LOW confidence): https://www.typeface.ai/blog/ai-design-quality-benchmarks-and-best-practices — AI-generated design evaluation criteria (limited to brand/image quality, not web design composition)

---

*Feature research for: PDE v1.3 — Self-Improvement & Design Excellence*
*Researched: 2026-03-17*
