# Project Research Summary

**Project:** Platform Development Engine (PDE)
**Domain:** AI-powered product development platform — Claude Code plugin, fork of GSD
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

PDE is a Claude Code plugin that extends the proven GSD (get-shit-done) workflow framework into a full product development lifecycle tool. The v1 strategy is explicit: fork GSD 1.22.4, rebrand it as PDE, and ship a working `/pde:` plugin that preserves every capability of the original. This is not a greenfield build — it is a disciplined rename-and-rebrand operation on a mature, zero-dependency Node.js system. The technical stack is inherited, not chosen. Every architectural decision is inherited, not designed. The only genuine engineering work in v1 is systematic renaming and the creation of public-facing onboarding documentation.

The recommended approach is a fork-first, extend-later strategy with a mandatory Architecture Refactor milestone placed between v1 and any feature work. Post-v1, PDE adds design pipeline integrations, MCP server connections (Jira, Linear, GitHub, Figma), multi-AI-provider formalization, and eventually a standalone CLI. These capabilities require TypeScript-based MCP servers (`@modelcontextprotocol/sdk` v1.x), Commander 14.x for CLI (explicitly not v15, which is ESM-only), and deliberate abstraction boundaries between PDE's core logic and Claude Code's runtime. The differentiator over competitors like Cursor, Windsurf, and Cline is persistent file-based state that survives context resets — the core GSD insight PDE inherits on day one.

The critical risks are all execution risks, not design risks. The v1 rebrand has ten well-documented pitfalls, all grounded in direct inspection of the GSD codebase: hardcoded install paths (119 occurrences), incomplete agent-type renames (68 occurrences in workflows plus 4 loosely-coupled surfaces), surviving `/gsd:` references in JavaScript error strings (305 occurrences), hidden `~/.gsd/` config directory paths, GSD-branded git branch templates, and version numbering that would prevent Claude Code's cache from delivering updates. Every one of these is a distribution-blocking defect if missed. The acceptance criterion for Phase 1 is a clean install on a machine with a different username than the developer, with zero GSD strings surfacing in any user-visible output.

---

## Key Findings

### Recommended Stack

PDE v1 inherits GSD's zero-dependency Node.js stack without modification. This is a deliberate constraint: the plugin must be installable anywhere Node 20.x is present, with no `npm install` step for end users. Core format is CommonJS `.cjs` for Claude Code plugin compatibility; workflows and agents are Markdown with YAML frontmatter; config is plain JSON. The current Claude Code plugin standard is `SKILL.md` format with `skills/` and `agents/` directories — PDE should migrate toward this format from GSD's older `.claude/commands/*.md` approach during the Architecture Refactor milestone, not during v1.

Post-v1 MCP server work uses `@modelcontextprotocol/sdk` v1.27.1 (TypeScript, stdio transport for local servers). The standalone CLI, when it arrives, uses Commander 14.x — not 15, which was released as ESM-only in May 2026 and is incompatible with the CJS codebase. MCP SDK v2 is in development and not yet stable; v1.x is the production target.

**Core technologies:**
- Node.js 20.x LTS — runtime for all tooling — zero additional dependencies, Claude Code compatible
- CommonJS (.cjs) — module format — required for Claude Code plugin invocation pattern
- Markdown + YAML frontmatter — workflow/agent definitions — Claude Code's native format
- `bin/pde-tools.cjs` — all stateful side effects — centralized git, config, state, file operations
- `@modelcontextprotocol/sdk` v1.27.1 — post-v1 MCP integrations — official Anthropic SDK, TypeScript-native
- Commander 14.x — post-v1 standalone CLI — CJS-compatible; v15 is explicitly excluded

### Expected Features

The v1 MVP is a 1:1 feature-parity clone of GSD rebranded as PDE. All ~29 `/pde:` commands replacing `/gsd:` equivalents, persistent `.planning/` file state, phase workflow (discuss → plan → execute → verify), parallel agent orchestration with wave execution, and plugin installability via Claude Code's plugin mechanism. These are all P1 — required at launch, already implemented in the codebase being forked.

Post-v1 differentiators are the features that separate PDE from every competitor: design pipeline (wireframing, design systems, user flows), MCP server integrations for real toolchain connections, and multi-AI-provider formalization. The end-state differentiator — idea-to-shipped lifecycle continuity — requires all of these and cannot be claimed until they are present. No competitor has this capability; the field is open.

**Must have (table stakes):**
- All `/pde:` command parity with `/gsd:` — inherited via fork; zero excuse to miss this
- Persistent `.planning/` file state — the architectural insight GSD proved; everything depends on it
- Phase workflow (discuss, plan, execute, verify) — the primary user loop
- Parallel agent orchestration — what makes PDE faster than raw Claude
- Plugin installability via Claude Code — distribution prerequisite
- Codebase mapping (`/pde:map-codebase`) — required for existing project users; cold-start-only is a dealbreaker
- Milestone management — users need release cycles
- Getting Started documentation — required before any public distribution

**Should have (competitive):**
- Design pipeline — wireframing, design systems; post-v1; nobody else has this
- MCP server integrations (GitHub, Linear, Figma, Jira) — when users report integration friction
- Multi-AI-provider formalization — GSD partially has this; make it first-class in v1.x
- Audit and gap-filling commands — `/pde:audit-milestone`; rare differentiator no competitor has

**Defer (v2+):**
- Multi-product-type support (hardware, content) — niche until core dev workflow is proven
- Standalone CLI distribution — defer until plugin model hits limits
- Maintenance, analytics, feedback loops — post-ship lifecycle; build when users are shipping
- Enterprise tier or monetization model — defer until community traction is established

### Architecture Approach

PDE's architecture has four clean layers: Workflow (slash commands as orchestrators), Agent (specialized single-responsibility subagents), Tooling (`pde-tools.cjs` as the sole location for stateful side effects), and Content (`.planning/` directory as project-level external memory). Every workflow delegates side effects to `bin/pde-tools.cjs`; every agent reads templates, fills structure, and writes files; agents never call each other directly. This separation is what makes the system debuggable, parallelizable, and independently testable per layer.

The rename sequence for v1 is order-dependent: plugin.json identity first, then binary rename, then all 29 workflow files (binary path references), then templates, then references, then config paths. Skipping or reordering this sequence creates partially-renamed states that produce confusing failures.

**Major components:**
1. Workflows (`workflows/*.md`) — slash command implementations; orchestrate agents; zero inline logic; ~29 files
2. Agents (`agents/*.md`) — single-responsibility AI workers; researcher, planner, executor, verifier, roadmapper, plan-checker
3. Bin script (`bin/pde-tools.cjs` + `bin/lib/*.cjs`) — all git, config, state, file, and roadmap operations; 10 modular domain libraries
4. Templates (`templates/`) — artifact scaffolds defining structure downstream agents must fill
5. References (`references/`) — short, topic-scoped knowledge injected into agent context on demand
6. Config system — two-level resolution: `~/.pde/defaults.json` (global) and `.planning/config.json` (per-project)

### Critical Pitfalls

1. **Hardcoded install paths (`$HOME/.claude/get-shit-done/`)** — 119 occurrences; breaks every user on a different machine. Replace with `${CLAUDE_PLUGIN_ROOT}` or relative paths. Audit with `grep -rn "get-shit-done\|/Users/" .` before any release. Distribution-blocking if missed.

2. **Incomplete agent-type rename (`gsd-planner` → `pde-planner`)** — 68 workflow occurrences plus 4 loosely-coupled surfaces (workflow files, `core.cjs` registry, `model-profiles.md` reference, user `config.json`). Silent failure: wrong model selected, no error shown. Verify with `grep -rn "gsd-" .` returning zero results and a `resolve-model pde-planner` smoke test.

3. **Surviving `/gsd:` in user-visible text** — 305 occurrences including JavaScript string literals in `bin/lib/*.cjs`. Error recovery messages are the highest-impact case: users are told to run a command that doesn't exist. Acceptance criterion: `grep -rn "/gsd:" .` returns zero results across all file types including `.cjs`.

4. **Hidden `~/.gsd/` user config directory** — `config.cjs` and `init.cjs` read from `~/.gsd/` hardcoded. Users with both GSD and PDE installed share config state they did not intend to share. Update both files to `~/.pde/`; verify with `grep -rn '\.gsd' bin/lib/` returning zero results.

5. **Plugin version caching** — Claude Code will not deliver updates to existing users unless `plugin.json` version is bumped on every distributed change. Establish a release process with version bump as a required step before any public distribution.

---

## Implications for Roadmap

The research drives a clear four-phase structure with no ambiguity about ordering. Dependencies are strict: you cannot build post-v1 features on a GSD-branded foundation, you cannot defer the Architecture Refactor without compounding debt on every subsequent milestone, and the standalone CLI cannot be built without the abstraction boundaries the Architecture Refactor establishes.

### Phase 1: Rebrand and Distribute

**Rationale:** The entire v1 value is locked inside a working GSD fork. Nothing else can proceed until PDE is a real, installable, publicly-distributable plugin that does not surface GSD branding in any user-visible output. This phase has no optional steps — all 10 pitfalls from PITFALLS.md land here.

**Delivers:** A distributable Claude Code plugin at `1.0.0`, installable via `claude plugin install`, that provides all ~29 `/pde:` commands with identical functionality to `/gsd:` commands, zero GSD strings in user-visible output, and a Getting Started guide tested with a naive user.

**Addresses features:** All P1 table-stakes features — command parity, persistent state, phase workflow, parallel agents, plugin installability, codebase mapping, milestone management.

**Avoids:** All Phase 1 pitfalls — hardcoded paths, incomplete renames, surviving `/gsd:` text, `~/.gsd/` config, GSD branch templates, wrong version number, missing onboarding docs, broken plugin caching.

**Acceptance gates:**
- `grep -rn "get-shit-done\|gsd-\|/gsd:\|\.gsd" .` returns zero results across all file types
- Install succeeds on a machine with a different username than the developer
- Getting Started guide produces a successful first session for a naive user
- `VERSION` and `plugin.json` show `1.0.0`

### Phase 2: Architecture Refactor

**Rationale:** Post-v1 features (design pipeline, MCP integrations, standalone CLI) each require architectural changes that become progressively harder to retrofit onto the fast-clone structure. The Architecture Refactor milestone must precede all feature milestones. Deferring it means each feature milestone adds more Claude Code-coupled logic, eventually requiring a partial rewrite of the system to support the standalone CLI transition.

**Delivers:** Explicit abstraction boundary between PDE's core logic (planning, state management, roadmap operations in `pde-tools.cjs`) and Claude Code-specific runtime behavior (subagent spawning, `@`-includes, tool calls isolated in adapter layers). Migration to current SKILL.md plugin format. All remaining technical debt from the fast-clone identified and resolved.

**Uses:** Current Claude Code plugin format (SKILL.md skills, `agents/` directory, `hooks/hooks.json`, `.mcp.json`).

**Implements:** Provider abstraction layer that makes the standalone CLI transition a port rather than a rewrite.

**Research flag:** Needs `/gsd:research-phase` to investigate current SKILL.md migration patterns and Claude Code adapter layer conventions before planning begins.

### Phase 3: MCP Integrations and Design Pipeline

**Rationale:** MCP integrations and the design pipeline are the v1.x differentiators. Both build on the stable plugin structure established in Phase 2. MCP server work is additive (`.mcp.json` declaration; no changes to existing components). Design pipeline is new workflow files and new agent types; existing components are unchanged. These can be developed in parallel within this phase.

**Delivers:** MCP server integrations for GitHub, Linear, Figma, and Jira (TypeScript, `@modelcontextprotocol/sdk` v1.x, stdio transport). Design pipeline workflow with wireframing, design systems, and user flow agents. Multi-AI-provider formalization as a first-class config option.

**Uses:** `@modelcontextprotocol/sdk` v1.27.1, TypeScript 5.x, Zod 3.x for MCP servers. New `agents/` types for design pipeline.

**Implements:** MCP integration points, design workflow layer, provider abstraction usage.

**Research flag:** Needs `/gsd:research-phase` before planning for MCP server integration specifics (Figma API, Linear API, GitHub MCP server vs. custom). Design pipeline agent types are novel — no established pattern; research required.

### Phase 4: Standalone CLI and Multi-Product Support

**Rationale:** Standalone CLI becomes viable only after Phase 2 establishes the abstraction boundary. Multi-product-type support (hardware, content workflows) is v2+ territory — deferred until the core dev workflow proves product-market fit. These belong together because both require the provider abstraction layer and both target users beyond the Claude Code ecosystem.

**Delivers:** Standalone CLI distributable (`commander` 14.x, thin wrapper over `pde-tools.cjs`), multi-provider support (Gemini CLI, OpenCode, Codex), and domain-specific agent types for hardware and content workflows.

**Uses:** Commander 14.x (explicitly not 15; see STACK.md), Node.js 20.x LTS, existing `pde-tools.cjs` logic exposed via CLI commands.

**Research flag:** Needs `/gsd:research-phase` before planning — standalone CLI distribution infrastructure (npm package vs. npx vs. homebrew) and multi-provider API differences are not well-documented for this specific use case.

### Phase Ordering Rationale

- **Phase 1 before everything:** Nothing can be distributed or validated until the plugin is a real PDE product, not a GSD clone with different text. User feedback, which all subsequent phases require, cannot be collected without public distribution.
- **Phase 2 before features:** Every post-v1 feature adds Claude Code-coupled logic. Adding features before drawing the abstraction boundary means the boundary can never be cleanly drawn — the standalone CLI transition becomes a rewrite.
- **MCP + design pipeline together (Phase 3):** Both are additive to the existing structure; neither modifies existing components. Developing them in the same milestone maximizes the return on setting up the TypeScript MCP development environment.
- **Standalone CLI last (Phase 4):** Requires the provider abstraction from Phase 2 and validated product-market fit from Phase 3. Building it earlier is premature optimization.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Architecture Refactor):** SKILL.md migration from `.claude/commands/` has known gotchas; adapter layer patterns for Claude Code plugins are not well-documented; needs fresh research before planning.
- **Phase 3 (MCP Integrations):** Figma, Linear, and Jira MCP integration specifics are evolving rapidly in 2026; GitHub has an official MCP server that may eliminate custom work; design pipeline agent types have no established pattern to follow.
- **Phase 4 (Standalone CLI):** Distribution infrastructure (npm publish, npx invocation, homebrew formula) and multi-provider API parity are complex and not fully covered by current research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Rebrand):** The work is fully specified in PITFALLS.md with precise grep commands and acceptance criteria. No research needed — the checklist is the plan.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (v1) / MEDIUM (post-v1) | v1 stack verified by direct GSD source inspection; post-v1 MCP SDK version from npm search, not registry fetch; Commander 15 ESM constraint from search results |
| Features | HIGH (v1) / MEDIUM (post-v1) | v1 features enumerated from GSD source; competitive analysis from secondary sources; post-v1 roadmap features validated against competitor gap analysis |
| Architecture | HIGH | Grounded in direct codebase inspection + official Claude Code plugin docs; rename sequence derived from actual file structure |
| Pitfalls | HIGH | All critical pitfalls grounded in direct GSD codebase inspection with exact occurrence counts; Claude Code caching behavior from official plugin docs |

**Overall confidence:** HIGH for v1 scope. MEDIUM for post-v1 feature and integration specifics.

### Gaps to Address

- **MCP SDK version:** `@modelcontextprotocol/sdk` v1.27.1 sourced from npm search results, not direct registry fetch. Verify current latest before beginning Phase 3 work.
- **SKILL.md migration path:** GSD uses the older `.claude/commands/` format. The exact migration steps from commands to skills, and whether existing command files work identically when moved to `skills/`, needs validation against official docs or a test migration before Phase 2 planning.
- **Claude Code `${CLAUDE_PLUGIN_ROOT}` variable:** PITFALLS.md recommends this as the replacement for hardcoded install paths. Confirm this variable is actually injected by Claude Code in the current plugin runtime before committing to it in Phase 1 — fallback is relative path resolution in the bin script.
- **Multi-provider API surface:** Gemini CLI, OpenCode, and Codex API parity with Claude's tool-use and subagent interfaces is assumed but not validated. Phase 4 needs dedicated research before planning.
- **`gsd_state_version` key:** PITFALLS.md flags this STATE.md frontmatter key as a rename candidate. It is acceptable to defer to Architecture Refactor if not user-visible, but Phase 1 planning must make an explicit decision about whether to address it in Phase 1 or track it as Architecture Refactor debt.

---

## Sources

### Primary (HIGH confidence)
- GSD source code (`~/.claude/get-shit-done/` v1.22.4) — direct inspection for path counts, agent types, command structure, config paths
- Official Claude Code plugins docs (code.claude.com/docs/en/plugins) — plugin manifest, caching behavior, directory requirements
- Official Claude Code skills docs (code.claude.com/docs/en/skills) — SKILL.md format, frontmatter fields, invocation control
- Official Claude Code sub-agents docs (code.claude.com/docs/en/sub-agents) — subagent frontmatter, model aliases, tools field
- modelcontextprotocol.io/docs/sdk — transport options, stdio vs Streamable HTTP

### Secondary (MEDIUM confidence)
- npm search results — `@modelcontextprotocol/sdk` v1.27.1 latest, Commander 14.x / 15.x versions and ESM constraint
- AI Dev Tool Power Rankings (LogRocket, March 2026) — table stakes and competitive feature analysis
- Cursor vs Windsurf vs Cline comparisons (Builder.io, UI Bakery) — competitor capability matrix
- Agentic Coding Trends Report 2026 (Anthropic) — multi-agent workflow patterns
- GSD anatomy article (codecentric.de) — workflow orchestration pattern validation

### Tertiary (LOW confidence)
- v0 vs Bolt vs Lovable comparison (NxCode) — app builder feature comparison; less directly relevant to PDE
- Packaging pitfalls: hardcoded paths (Apptimized) — general validation of path pitfall severity; PDE-specific findings from direct source inspection

---

*Research completed: 2026-03-14*
*Ready for roadmap: yes*
