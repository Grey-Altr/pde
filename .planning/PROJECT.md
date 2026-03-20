# Platform Development Engine (PDE)

## What This Is

A full professional product design and development platform delivered as a Claude Code plugin. PDE takes users from raw idea to shipped product through AI-assisted research, design, planning, coding, testing, and deployment. Includes a complete 13-stage design pipeline (recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff) orchestrable via a single `/pde:build` command. Features a self-improvement fleet that audits, validates, and elevates its own output quality against Awwwards-level standards. Integrates with external development tools (GitHub, Linear, Jira, Figma, Pencil) via MCP for bidirectional sync of requirements, design tokens, and work items. Implements advanced workflow methodology with story-file sharding, acceptance-criteria-first planning, post-execution reconciliation, readiness gating, per-task tracking, and persistent agent memory.

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
- ✓ MCP infrastructure with security allowlist, probe/degrade contracts, connection persistence — v0.5
- ✓ GitHub integration: issue sync, PR creation, brief from issue, CI pipeline status — v0.5
- ✓ Linear + Jira integration: issue sync, milestone/epic mapping, ticket creation, task_tracker toggle — v0.5
- ✓ Figma integration: DTCG token import/export, wireframe context, Code Connect handoff, mockup export — v0.5
- ✓ Pencil integration: token sync to canvas, screenshot capture for critique, graceful degradation — v0.5
- ✓ End-to-end validation: 315 tests for concurrency isolation, auth recovery, write-back confirmation — v0.5
- ✓ Project context constitution with auto-generated compact context document for all subagents — v0.6
- ✓ Story-file sharding: plans with 5+ tasks produce atomic task files, executor loads one at a time — v0.6
- ✓ AC-first planning: acceptance criteria before task list, task-to-AC verification gates, boundary enforcement — v0.6
- ✓ Post-execution reconciliation: mandatory RECONCILIATION.md comparing planned vs actual git commits — v0.6
- ✓ Readiness gate: /pde:check-readiness with PASS/CONCERNS/FAIL blocking execute-phase on FAIL — v0.6
- ✓ Per-task workflow tracking with real-time status updates and HANDOFF.md for session breaks — v0.6
- ✓ Agent enhancements: assumptions capture, analyst persona, analyst-to-brief pipeline, persistent agent memory — v0.6
- ✓ File-hash manifest for safe framework updates preserving user modifications — v0.6
- ✓ BMAD/PAUL methodology patterns documented in PDE terms — v0.6

### Active

## Current Milestone: v0.7 Pipeline Reliability & Validation

**Goal:** Make PDE's research → plan → execute pipeline trustworthy by adding automated verification at every stage — validating research claims against the codebase, catching cross-phase dependency gaps, surfacing edge cases in plans, and closing accumulated tech debt.

**Target features:**
- Automated research validation agent with claim extraction and codebase verification
- Cross-phase dependency verification (pre-execution, not just post)
- Plan edge case analysis (error handling, empty states, boundary conditions)
- Integration point verification (matching interfaces, data flows, no orphan exports)
- Tech debt closure (all 7 known items from v0.6)

### Out of Scope

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
- Real-time bidirectional Figma sync — architecturally impossible in session-based plugin; use explicit sync commands
- Auto-configure all MCP servers on install — triggers unexpected OAuth flows; always require explicit user consent
- MCP tool passthrough to all subagents — destroys 85% context savings from Tool Search
- Write tools in PDE-as-MCP-server — creates second write path bypassing pde-tools.cjs validation and locking
- Direct BMAD agent file import — BMAD agents written for human-directed sequential workflows; PDE agents are autonomous parallel
- PAUL .paul/ directory structure — PDE uses .planning/; parallel state tree creates two sources of truth
- Story points and sprint ceremonies — PDE's phase/milestone model is simpler for AI-assisted development

## Context

- **Shipped v0.6** on 2026-03-20: ~166,000 LOC (JavaScript/Markdown/Shell), ~650 total commits
- **v0.1** shipped 2026-03-15: 303 files, ~60,000 LOC, 127 commits (GSD → PDE rebrand)
- **v0.2** shipped 2026-03-16: 172 files changed, 135 commits (7-stage design pipeline)
- **v0.3** shipped 2026-03-17: 84 files changed, 67 commits (6 advanced design skills, 13-stage pipeline)
- **v0.4** shipped 2026-03-18: 259 files changed, 131 commits (self-improvement fleet, design elevation, pressure test)
- **v0.5** shipped 2026-03-19: 118 files changed, 99 commits (5 MCP integrations, 315 validation tests)
- **v0.6** shipped 2026-03-20: 108 files changed, ~91 commits (workflow methodology: sharding, AC-first, reconciliation, readiness, tracking, agent memory)
- **Tech stack:** Node.js (CommonJS), Claude Code plugin API, markdown-based state management, MCP protocol (HTTP/SSE/stdio transports)
- **Distribution:** Claude Code plugin via GitHub; marketplace registration pending
- **Architecture:** skills (slash commands) → workflows → agents → templates → references → bin scripts → config
- **Design pipeline:** 13 skills (recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff) + build orchestrator, DESIGN-STATE.md tracking, design-manifest.json artifact registry (13 coverage flags, pass-through-all pattern)
- **Quality infrastructure:** Awwwards 4-dimension rubric, 3 quality reference files (motion-design, composition-typography, quality-standards), protected-files mechanism, 3-agent self-improvement fleet, skill builder with validation gate
- **MCP integration layer:** mcp-bridge.cjs central adapter with TOOL_MAP (36 entries), APPROVED_SERVERS (5 services), probe/degrade contracts, connection persistence (.planning/mcp-connections.json), write-back confirmation gates
- **Workflow methodology:** story-file sharding (task-NNN.md), AC-first planning (AC-N verification gates), post-execution reconciliation (RECONCILIATION.md), readiness gate (PASS/CONCERNS/FAIL), per-task tracking (workflow-status.md), persistent agent memory (50-entry cap with archival), analyst persona interviews
- **Known tech debt:**
  - PLUG-01 end-to-end `claude plugin install` from GitHub not tested (marketplace registration may be required)
  - TRACKING-PLAN.md referenced in consent panel does not exist
  - Historical commits e067974 and efe3af0 lack Co-Authored-By trailer (pre-fix, cannot change)
  - lock-release calls use inconsistent trailing arguments across workflows (cosmetic, zero functional impact)
  - SUMMARY.md files lack one_liner field — automated accomplishment extraction fails (tech-tracking format only)
  - 2 pre-registered TOOL_MAP entries (github:update-pr, github:search-issues) have no consumers yet (intentionally pre-registered)
  - pde-tools.cjs usage help text missing v0.6 CLI commands (manifest, shard-plan, readiness, tracking) — cosmetic

## Constraints

- **Base**: Built on GSD codebase — same patterns, renamed
- **Compatibility**: Must work as a Claude Code plugin
- **State model**: File-based `.planning/` directory — no database, no server
- **Zero npm deps at plugin root**: Any new dependencies go in isolated subdirectories
- **MCP security**: Verified-sources-only policy — only official MCP servers from approved vendors

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork GSD rather than rebuild | Fastest path to working product; GSD is proven | ✓ Good — shipped in 2 days |
| Start as Claude Code plugin | Same distribution model as GSD; familiar to users | ✓ Good — plugin validates and loads |
| Fast clone for v0.1 | Get working product quickly, refactor in later milestones | ✓ Good — 100% requirements met |
| Public distribution | Building for the community, not just personal use | ✓ Good — README, Getting Started, marketplace ready |
| Order-dependent rename sequence | Plugin identity → binaries → commands → engine → agents → templates → brand verify | ✓ Good — each layer clean before next |
| Core design pipeline for v0.2 | Closes the biggest gap in "idea to shipped product" promise | ✓ Good — 7 skills + orchestrator shipped |
| Standalone skills + orchestrator | Flexibility for ad-hoc use AND guided workflow | ✓ Good — each skill works both ways |
| DTCG 2025.10 + OKLCH + dual dark mode | Industry-standard token format with perceptually uniform color space | ✓ Good |
| Orchestrator is strictly read-only | No coverage writes, no manifest mutations; each skill owns its own flag | ✓ Good |
| Pass-through-all coverage pattern | Each skill reads all 13 flags, sets only its own — prevents clobber | ✓ Good |
| Self-improvement before pressure test | Build tools to fix PDE first, then validate with real project | ✓ Good |
| Awwwards-level as quality bar | PDE must produce stunning, professional-grade design output | ✓ Good — 330+ Nyquist assertions |
| Prompt-only protected-files enforcement | bwrap sandbox can't prevent Claude Code Write/Edit; defense-in-depth | ✓ Good |
| Version numbering correction v1.x → v0.x | Pre-1.0 product; semver signals maturity accurately | ✓ Good |
| Central MCP adapter (mcp-bridge.cjs) | Single module for all integrations — consistent security, probe/degrade, tool mapping | ✓ Good — 5 integrations share one bridge |
| Canonical tool name mapping (TOOL_MAP) | Insulates workflows from raw MCP tool name changes | ✓ Good — 36 entries, zero raw names in workflows |
| Verified-sources-only security policy | Only official MCP servers — prevents unauthorized tool access | ✓ Good — assertApproved() blocks all unapproved |
| Write-back confirmation gates | Every external write requires explicit user consent (VAL-03) | ✓ Good — 26 confirmation gate tests GREEN |
| Detection-based Pencil connection | VS Code extension auto-configures — no manual `claude mcp add` | ✓ Good — zero friction for VS Code users |
| task_tracker config toggle | Single setting switches Linear↔Jira without workflow changes | ✓ Good — clean service dispatch |
| Non-destructive Figma token merge | PDE-originated tokens preserved; Figma is source for its exports | ✓ Good — no data loss on sync |
| Inline conversion functions (zero npm) | figmaColorToCss, dtcgToPencilVariables embedded in workflows | ✓ Good — zero-npm-dependency preserved |
| Story-file sharding with task-count threshold | Plans ≥5 tasks get sharded; <5 stay monolithic — balances context savings vs overhead | ✓ Good — ~90% context reduction |
| AC-first planning with AC-N identifiers | Tasks verified against acceptance criteria before marked done — prevents shallow execution | ✓ Good — every phase shipped clean |
| Post-execution reconciliation as mandatory step | Compares planned vs actual git commits — catches drift before verification | ✓ Good — reconciler finds deviations reliably |
| Readiness gate blocks on FAIL | Prevents executing plans with known structural issues | ✓ Good — clean separation of plan validation vs execution |
| Per-agent persistent memory with 50-entry cap | Agents learn project-specific patterns across sessions without unbounded growth | ✓ Good — archival prevents context bloat |
| Analyst persona interviews in new-project/new-milestone | Surfaces unspoken assumptions before planning begins | ✓ Good — structured briefs improve plan quality |

---
*Last updated: 2026-03-19 after v0.7 milestone start*
