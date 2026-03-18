# Platform Development Engine (PDE)

## What This Is

A full professional product design and development platform delivered as a Claude Code plugin. PDE takes users from raw idea to shipped product through AI-assisted research, design, planning, coding, testing, and deployment. Includes a complete 13-stage design pipeline (recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff) orchestrable via a single `/pde:build` command. Features a self-improvement fleet that audits, validates, and elevates its own output quality against Awwwards-level standards.

## Core Value

Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## Requirements

### Validated

- ✓ 1:1 functional clone of GSD, rebranded as PDE — v0.1
- ✓ All GSD workflows operational under PDE naming — v0.1
- ✓ All GSD skill commands working as /pde: equivalents — v0.1
- ✓ All GSD agent types functional within PDE — v0.1
- ✓ Plugin installable and usable in Claude Code — v0.1
- ✓ All GSD templates, references, and configuration migrated — v0.1
- ✓ GSD tooling rebranded and functional — v0.1
- ✓ Design system generation produces DTCG tokens with CSS derivation — v0.2
- ✓ Core design pipeline: brief → flows → system → wireframe → critique → iterate → handoff — v0.2
- ✓ Each design skill works standalone AND as part of orchestrated /pde:build pipeline — v0.2
- ✓ Design artifacts stored in .planning/design/ alongside planning state — v0.2
- ✓ Design-to-implementation handoff produces component APIs and TypeScript interfaces — v0.2
- ✓ Ideation skill with multi-phase diverge→converge exploration — v0.3
- ✓ Competitive analysis skill with structured landscape evaluation — v0.3
- ✓ Opportunity scoring skill with RICE framework — v0.3
- ✓ Mockup skill for hi-fi interactive HTML/CSS from wireframes — v0.3
- ✓ HIG audit skill with dual mode (light in critique, full standalone) — v0.3
- ✓ Recommend skill for MCP/tool discovery (integrated into ideation) — v0.3
- ✓ Brief accepts upstream IDT/CMP/OPP context with graceful degradation — v0.3
- ✓ Build orchestrator expanded to 13-stage pipeline with --from entry and dynamic stage counting — v0.3
- ✓ Audit PDE tooling against Awwwards-level standards with 3-agent fleet — v0.4
- ✓ Skill builder (create/improve/eval) with validation gate and style guide enforcement — v0.4
- ✓ Self-improvement fleet with baseline delta tracking and health reports — v0.4
- ✓ Design quality elevation: all 7 pipeline skills with motion tokens, OKLCH palettes, APCA contrast, spring physics — v0.4
- ✓ Pressure test: end-to-end pipeline validation with process compliance and quality rubric tiers — v0.4
- ✓ 62/62 v0.4 requirements satisfied with 330+ Nyquist assertions — v0.4

### Active

<!-- v0.5 MCP Integrations — scope TBD after research -->

(Defining requirements for v0.5)

### Out of Scope

- MCP server integrations (GitHub, Linear, Figma, Jira) — candidate for future milestone
- Multi-AI-provider support (Gemini CLI, OpenCode, Codex) — candidate for future milestone
- Standalone CLI distribution independent of Claude Code — post-v2
- Multi-product-type support (hardware, content, non-software) — post-v2
- Maintenance/analytics/feedback loops — post-v2
- Real-time collaborative editing — conflicts with file-based state model
- In-tool web dashboard / UI — markdown files are the dashboard
- Architecture restructuring — do when pain forces it
- Fully autonomous self-modification without safeguards — protected-files mechanism provides guardrails
- Generic LLM quality metrics (BLEU, ROUGE) — Awwwards rubric is domain-specific
- Continuous background self-improvement loop — Claude Code is session-based; explicit invocations are correct

## Context

- **Shipped v0.4** on 2026-03-18: ~134,000 LOC (JavaScript/Markdown/Shell), 460 total commits
- **v0.1** shipped 2026-03-15: 303 files, ~60,000 LOC, 127 commits (GSD → PDE rebrand)
- **v0.2** shipped 2026-03-16: 172 files changed, 135 commits (7-stage design pipeline)
- **v0.3** shipped 2026-03-17: 84 files changed, 67 commits (6 advanced design skills, 13-stage pipeline)
- **v0.4** shipped 2026-03-18: 259 files changed, 131 commits (self-improvement fleet, design elevation, pressure test)
- **Tech stack:** Node.js (CommonJS), Claude Code plugin API, markdown-based state management
- **Distribution:** Claude Code plugin via GitHub; marketplace registration pending
- **Architecture:** skills (slash commands) → workflows → agents → templates → references → bin scripts → config
- **Design pipeline:** 13 skills (recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff) + build orchestrator, DESIGN-STATE.md tracking, design-manifest.json artifact registry (13 coverage flags, pass-through-all pattern)
- **Quality infrastructure:** Awwwards 4-dimension rubric, 3 quality reference files (motion-design, composition-typography, quality-standards), protected-files mechanism, 3-agent self-improvement fleet, skill builder with validation gate
- **Known tech debt:**
  - PLUG-01 end-to-end `claude plugin install` from GitHub not tested (marketplace registration may be required)
  - TRACKING-PLAN.md referenced in consent panel does not exist
  - Historical commits e067974 and efe3af0 lack Co-Authored-By trailer (pre-fix, cannot change)
  - lock-release calls use inconsistent trailing arguments across workflows (cosmetic, zero functional impact)
  - SUMMARY.md files lack one_liner field — automated accomplishment extraction fails (tech-tracking format only)

## Constraints

- **Base**: Built on GSD codebase — same patterns, renamed
- **Compatibility**: Must work as a Claude Code plugin
- **State model**: File-based `.planning/` directory — no database, no server

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork GSD rather than rebuild | Fastest path to working product; GSD is proven | ✓ Good — shipped in 2 days |
| Start as Claude Code plugin | Same distribution model as GSD; familiar to users | ✓ Good — plugin validates and loads |
| Fast clone for v0.1 | Get working product quickly, refactor in later milestones | ✓ Good — 100% requirements met |
| Public distribution | Building for the community, not just personal use | ✓ Good — README, Getting Started, marketplace ready |
| Order-dependent rename sequence | Plugin identity → binaries → commands → engine → agents → templates → brand verify | ✓ Good — each layer clean before next |
| 0.1.0 version bump at Phase 8 | Signal work-in-progress until all phases pass | ✓ Good — version reflects shipped state |
| Full telemetry implementation over stub | render.cjs consent and track-* need real persistence | ✓ Good — no crashes, UI renders cleanly |
| 21 command stubs for dangling references | Stubs prevent user confusion; v2 implements full logic | ✓ Good — zero dangling /pde: references |
| Core design pipeline for v0.2 | Closes the biggest gap in "idea to shipped product" promise | ✓ Good — 7 skills + orchestrator shipped |
| Standalone skills + orchestrator | Flexibility for ad-hoc use AND guided workflow | ✓ Good — each skill works both ways |
| .planning/design/ for artifacts | Keeps design state with planning state; consistent with existing patterns | ✓ Good — clean artifact organization |
| v0.2 not v1.0 | Incremental addition to existing platform, not a breaking change | ✓ Good — no breaking changes |
| DTCG 2025.10 + OKLCH + dual dark mode | Industry-standard token format with perceptually uniform color space | ✓ Good |
| Inline tokens.css (no @import) | file:// URL compatibility for preview and wireframe consumption | ✓ Good |
| STACK.md as hard dependency for /pde:handoff | Framework detection without STACK.md produces unusable component stubs | ✓ Good |
| Interface-only TypeScript output (HND-types-v{N}.ts) | No imports or runtime code — direct engineer import without compilation issues | ✓ Good |
| Orchestrator is strictly read-only | No coverage writes, no manifest mutations; each skill owns its own flag | ✓ Good |
| Skill() over Task() invocation in build | Avoids #686 nested-agent freeze; Skill runs in same context | ✓ Good |
| Pass-through-all coverage pattern | Each skill reads all 13 flags, sets only its own — prevents clobber when mixing skills | ✓ Good |
| hasBrief excluded from designCoverage | Brief completion tracked via artifacts.BRF presence; coverage flags reserved for design output skills | ✓ Good |
| Two-pass diverge→converge ideation | Enforces neutral language in diverge to prevent premature convergence; scoring only in converge pass | ✓ Good |
| Soft upstream probe pattern for brief | IDT/CMP/OPP artifacts probed via Glob; null-context fallthrough to existing logic unchanged | ✓ Good |
| IDT Brief Seed supersedes PROJECT.md | When ideation exists, Brief Seed represents latest thinking; raw PROJECT.md is fallback only | ✓ Good |
| HIG --light flag as critique delegation contract | 5 mandatory checks only, critique-compatible format; full audit as separate stage | ✓ Good |
| Data-driven STAGES list in build orchestrator | Future pipeline expansions require no text changes — TOTAL derived from list length | ✓ Good |
| --from flag with validation-before-coverage-check | Typos halt immediately with full valid stage list; no silent skip behavior | ✓ Good |
| Self-improvement before pressure test | Build tools to fix PDE first, then validate with real project | ✓ Good — audit baseline enabled elevation delta measurement |
| Design quality elevation last before pressure test | Use self-improvement fleet to elevate quality, then validate | ✓ Good — strict dependency order produced cumulative improvement |
| Awwwards-level as quality bar | PDE must produce stunning, professional-grade design output — not functional defaults | ✓ Good — 330+ Nyquist assertions verify rubric compliance |
| Prompt-only protected-files enforcement | bwrap sandbox can't prevent Claude Code Write/Edit; prompt-level defense-in-depth at workflow + agent level | ✓ Good — zero protected-file violations across all v1.3 phases |
| DTCG object format for duration tokens | String format "200ms" rejected by Style Dictionary v4+; { value: N, unit: "ms" } is spec-compliant | ✓ Good — all motion tokens upgraded |
| Spring easing as cubicBezier + $extensions | DTCG has no native spring type; workaround via §9.3 + linear() multi-bounce extension | ✓ Good — three fidelity levels documented |
| Pressure test evaluator distinct from quality auditor | Evaluates design OUTPUT artifacts not SKILL.md files — prevents wrong-domain findings | ✓ Good |
| Version numbering correction v1.x → v0.x | Pre-1.0 product; semver signals maturity accurately | — Pending |

## Current Milestone: v0.5 MCP Integrations

**Goal:** Make PDE a connected development hub by integrating with external MCP servers — GitHub, Linear, Figma, Pencil, Jira, and others surfaced by research.

**Target features:**
- MCP server discovery, connection, and orchestration infrastructure
- GitHub integration (issues, PRs, code context)
- Linear/Jira integration (task tracking, requirements sync)
- Figma integration (design artifact exchange)
- Pencil MCP integration (visual canvas for design artifacts)
- Additional integrations surfaced by research
- Evaluation of PDE-as-MCP-server (exposing planning state to other tools)

---
*Last updated: 2026-03-18 after v0.5 milestone start*
