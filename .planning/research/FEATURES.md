# Feature Landscape: v0.15 Multi-Editor Integration

**Domain:** AI IDE integration layer for design/development platform
**Researched:** 2026-03-23
**Overall confidence:** MEDIUM (Antigravity is new; Cursor/.mdc and Gemini CLI specs are well-documented)

## Table Stakes

Features users expect from a multi-editor integration. Missing = integration feels broken or incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| `.cursorrules` / `.cursor/rules/*.mdc` generation | Cursor is the dominant AI IDE; users expect context injection | Medium | `.planning/PROJECT.md`, `DESIGN-STATE.md`, `design-manifest.json` | Must produce both legacy `.cursorrules` AND new `.mdc` format files in `.cursor/rules/` |
| `GEMINI.md` generation | Gemini CLI uses hierarchical `GEMINI.md` for context; standard expectation | Low | Same as Cursor context sources | Plain markdown, hierarchical loading from project root + subdirectories; supports `@file.md` imports |
| `AGENTS.md` generation | Cross-tool standard (Antigravity v1.20.3+, Cursor, Claude Code fallback); single file for all editors | Low | Same as Cursor context sources | Plain markdown, no special syntax; serves as the shared baseline all editors read |
| MCP server exposing read-only PDE state | AI IDEs consume MCP tools; Cursor/Antigravity/Gemini CLI all support MCP natively | High | `mcp-bridge.cjs`, all `.planning/` state files, `design-manifest.json` | Must stay under Cursor's 40-tool limit; read-only tools only (PROJECT.md out-of-scope decision) |
| Design token output as Tailwind config | Editors generating code need design tokens in consumable format, not raw DTCG JSON | Medium | `SYS-*.json` DTCG token files, `design-manifest.json` | Convert OKLCH tokens to Tailwind v4 `@theme` format; CSS custom properties as fallback |
| Handoff spec as `@file` annotations | AI code generators need component specs as inline annotations they can reference | Medium | `handoff.md` output, TypeScript interfaces from handoff | `@component:`, `@props:`, `@tokens:` annotation format extractable by any editor |

## Differentiators

Features that set PDE apart from manually maintaining editor config files. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Stitch design bridge (PDE <-> Antigravity canvas) | Antigravity has native Stitch integration; PDE already has Stitch MCP; bidirectional bridge means designs flow seamlessly between PDE's pipeline and Antigravity's canvas | High | Stitch MCP (v0.9), `design-manifest.json`, Antigravity's `stitch-mcp` server, `DESIGN.md` format | PDE generates `DESIGN.md` (Antigravity's design DNA format) from DTCG tokens; Antigravity's Stitch skills consume it; Stitch screen output flows back through PDE's existing STH pipeline |
| Divergence detection (handoff spec vs code) | Catches drift between PDE design specs and actual implementation; unique to PDE since it owns both sides | High | Handoff TypeScript interfaces, actual codebase `*.tsx`/`*.ts` files | Three-tier: structural (prop names exist), content (prop types match), behavioral (patterns follow spec); reuses v0.7 research validation 3-tier pattern |
| Context sync engine (auto-regeneration) | Editor config files regenerate automatically when PDE state changes, not manual | Medium | Event bus (v0.8), all context source files | Hook-driven: when `design-manifest.json` or `DESIGN-STATE.md` changes, regenerate all editor configs |
| Antigravity agent skills export | PDE workflows packaged as Antigravity skills (SKILL.md + instructions) in `.agent/skills/` | Medium | PDE workflow files, Antigravity skill format | Each PDE design skill becomes an invocable Antigravity skill; users can trigger PDE workflows from Antigravity's Agent Manager |
| Pipeline progress as MCP resource | Editors can query PDE pipeline status (which stages complete, current phase, blockers) | Low | `DESIGN-STATE.md`, `STATE.md`, event bus | MCP resource (not tool) -- passively available context, not an action |
| Multi-format artifact export | Same design artifact available as HTML, React component, Tailwind utility, CSS module depending on editor/framework context | Medium | Wireframe/mockup HTML artifacts, handoff TypeScript interfaces | Antigravity prefers React+Tailwind; Cursor users may want Vue/Svelte; detect from project config |

## Anti-Features

Features to explicitly NOT build. Each has a clear reason to avoid.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Write tools in PDE MCP server | Creates second write path bypassing pde-tools.cjs validation and locking (already in out-of-scope) | Expose read-only tools only; editors invoke PDE commands via their own terminal/shell integration |
| Real-time file watching / live sync | PDE is session-based (Claude Code constraint); file watchers create background processes that conflict with plugin model | Hook-driven regeneration on PDE state changes; manual `/pde:sync-editors` command for on-demand |
| Editor-specific UI panels or extensions | PDE is a CLI plugin, not a VS Code extension; building Cursor/Antigravity extensions is a separate product | Generate static files (`.cursorrules`, `GEMINI.md`, `DESIGN.md`) that editors consume natively |
| Cursor Composer / Antigravity Agent Manager API integration | These are proprietary, undocumented internal APIs that change frequently | Use the stable MCP protocol and file-based context injection that all editors support |
| Auto-install MCP servers in editors | Triggers unexpected OAuth flows; already in out-of-scope constraints | Provide setup instructions and `npx pde-mcp-server` command; user explicitly configures |
| Full pipeline execution from external editors | 13-stage pipeline requires Claude Code's subagent/worktree infrastructure | Expose individual read-only queries and single-skill invocations; full orchestration stays in Claude Code |
| Bidirectional code-to-design sync | Reverse-engineering code back into PDE design artifacts is architecturally intractable | One-way: PDE designs -> editor consumption; divergence detection flags drift for human decision |

## Feature Specifications

### 1. MCP Server Tool Exposure

**What to expose (read-only, under 40-tool Cursor limit):**

| Tool | Purpose | Returns |
|------|---------|---------|
| `pde:get-project` | Project context | PROJECT.md contents (compact) |
| `pde:get-design-state` | Pipeline progress | DESIGN-STATE.md parsed |
| `pde:get-manifest` | Artifact registry | design-manifest.json |
| `pde:get-tokens` | Design tokens | DTCG JSON or Tailwind config |
| `pde:get-handoff` | Component specs | TypeScript interfaces from handoff |
| `pde:get-artifact` | Specific artifact by ID | HTML/JSON content of named artifact |
| `pde:get-roadmap` | Milestone/phase status | ROADMAP.md parsed |
| `pde:get-requirements` | Current phase requirements | REQUIREMENTS.md parsed |
| `pde:get-pipeline-status` | Build pipeline stage status | Stage completion flags |
| `pde:list-artifacts` | Available design artifacts | Manifest entries list |

**10 tools total -- well within Cursor's 40-tool budget**, leaving room for other MCP servers the user has installed.

**Implementation:** TypeScript MCP server using `@modelcontextprotocol/sdk`, stdio transport (matching existing Stitch/Playwright pattern), launched via `npx pde-mcp-server`.

**Cursor constraint:** Cursor has a hard 40-tool cap across ALL MCP servers combined. Exceeding it silently drops tools. PDE must be lean. 10 tools is the right budget -- users typically have 2-3 other MCP servers (GitHub, database, etc.) consuming the remaining 30 slots.

### 2. Cursor Context Generation

**Two output formats required:**

**Legacy `.cursorrules` (single file, project root):**
- Project summary from PROJECT.md
- Current design state (active pipeline stage, completion %)
- Design tokens as CSS custom properties
- Component API specs from handoff
- Architecture constraints and conventions
- Still works in all Cursor versions but deprecated; generate for backwards compatibility

**Modern `.cursor/rules/*.mdc` (multiple files, frontmatter-driven):**

| File | `alwaysApply` | `globs` | Content |
|------|---------------|---------|---------|
| `pde-project.mdc` | `true` | - | Project context, conventions, constraints |
| `pde-design-tokens.mdc` | `false` | `*.css,*.scss,*.tsx,*.jsx` | OKLCH palette, spacing scale, typography |
| `pde-components.mdc` | `false` | `src/components/**` | Component APIs, prop interfaces, usage patterns |
| `pde-architecture.mdc` | `false` | `src/**` | Architecture patterns from handoff |
| `pde-pipeline.mdc` | `true` | - | Current pipeline status, what's built vs pending |

**`.mdc` frontmatter format (YAML + markdown body):**
```
---
description: PDE design token reference for styling decisions
globs: "*.css,*.scss,*.tsx,*.jsx"
alwaysApply: false
---

[markdown content here]
```

**Key `.mdc` behaviors:**
- `alwaysApply: true` = always injected into every AI request
- `globs` with `alwaysApply: false` = auto-attached only when matching files are in context
- When both are set, `alwaysApply` wins and globs are ignored
- Files stored flat in `.cursor/rules/` (no subdirectories)

### 3. Antigravity Agent Config

**Three output layers:**

1. **`AGENTS.md`** (project root) -- cross-tool baseline readable by Antigravity, Cursor, and Claude Code
   - Project identity, tech stack, conventions
   - Design system summary (palette, typography, spacing)
   - Component catalog from handoff
   - Plain markdown, no special syntax required

2. **`GEMINI.md`** (project root) -- Antigravity-specific overrides (takes priority over AGENTS.md when both exist)
   - PDE pipeline status and available MCP tools
   - Import modular context: `@.planning/design/DESIGN.md`
   - Stitch integration instructions (when `--use-stitch` active)

3. **`.agent/skills/pde-design/SKILL.md`** -- Antigravity skill for PDE design queries
   - Instructions for querying PDE MCP server
   - Design token lookup patterns
   - Component spec retrieval workflows

**Antigravity priority hierarchy:** System rules > GEMINI.md > AGENTS.md > .agent/rules/

### 4. GEMINI.md for Gemini CLI

**Hierarchical file placement (Gemini CLI concatenates all discovered files):**

- **Project root `GEMINI.md`:** Project context, design conventions, available PDE tools
- **`.planning/GEMINI.md`:** PDE state context (pipeline status, current phase, requirements)
- **`.planning/design/GEMINI.md`:** Design system reference (tokens, components, patterns)

**Uses `@file.md` imports for modularity:**
```markdown
## Design System
@./DESIGN-STATE.md

## Token Reference
@./design/SYS-tokens-summary.md
```

**Content must be self-contained per file** since Gemini CLI concatenates all discovered GEMINI.md files from root through subdirectories. Each file should work independently without assuming the others are loaded.

**Custom filename support:** Gemini CLI allows overriding the default `GEMINI.md` name via `settings.json` `context.fileName` property, but PDE should use the standard name for zero-config experience.

### 5. Stitch Design Bridge

**Bidirectional artifact flow leveraging existing v0.9 Stitch MCP infrastructure:**

**PDE -> Antigravity (Design DNA export):**
- Generate `DESIGN.md` in Antigravity's format from PDE's DTCG tokens
- Map OKLCH palette to hex values with semantic roles (primary, secondary, surface, etc.)
- Typography rules from `SYS-typography.json` tokens
- Component styling patterns from handoff artifacts
- Antigravity's `design-md` and `stitch-design` skills consume this DESIGN.md for consistent generation

**Antigravity -> PDE (Stitch screen import):**
- Already partially built in v0.9: `--use-stitch` flag fetches Stitch-generated screens
- Bridge extends this: detect Antigravity-originated Stitch projects via manifest metadata
- Import Stitch screen HTML/PNG through existing STH pipeline
- Annotation injection and critique comparison already work (v0.9)

**New bridge components:**
- `DESIGN.md` generator (DTCG tokens -> Antigravity Design DNA markdown format)
- Stitch project detection (is this an Antigravity-linked Stitch project?)
- Manifest metadata for Antigravity origin tracking (`source: "antigravity-stitch"`)

**Stitch MCP tools available (from davideast/stitch-mcp):**
- `get_screen_code` -- retrieves HTML code from Stitch screen
- `get_screen_image` -- retrieves screenshot as base64
- `build_site` -- maps screens to routes, returns multi-page HTML
- Plus upstream Stitch tools (generate_screen, list_projects, etc.)

### 6. Artifact Formatting for Editor Consumption

**Token conversion pipeline:**
```
DTCG JSON -> Tailwind v4 @theme -> CSS custom properties -> @file annotations
```

**Component spec formatting:**
```
Handoff TypeScript interfaces -> @component: annotations -> Editor-readable props
```

**Framework-aware output:**
- Detect project framework from `package.json` (Next.js, Nuxt, SvelteKit, etc.)
- Generate framework-appropriate component stubs
- Default: React + Tailwind (matches Antigravity's preferred stack and PDE's deploy scaffold)

**Inline conversion functions (preserving zero-npm-dependency constraint):**
- `oklchToHex()` -- reverse of existing `hexToOklch()` in handoff.md
- `dtcgToTailwindTheme()` -- maps DTCG token groups to Tailwind v4 `@theme` declarations
- `dtcgToDesignDna()` -- maps DTCG tokens to Antigravity DESIGN.md format

### 7. Divergence Detection

**Three-tier detection reusing v0.7 research validation pattern:**

| Tier | What | How | Severity |
|------|------|-----|----------|
| T1: Structural | Do declared components exist in codebase? | Glob for files matching handoff component names | Missing = HIGH |
| T2: Content | Do prop interfaces match handoff specs? | Parse TypeScript interfaces, compare prop names/types | Mismatch = MEDIUM |
| T3: Behavioral | Do components use specified tokens/patterns? | Grep for token variable usage, pattern matching | Drift = LOW |

**Detection model (from architecture drift literature):**
- **Absence:** Architectural element declared in spec but missing from code
- **Divergence:** Code has extra elements not in spec
- **Convergence:** Spec and code match

**Output:** `DIVERGENCE.md` in `.planning/` with per-component status:
- ALIGNED: Spec matches implementation
- DRIFTED: Implementation diverges (with specific deltas)
- MISSING: Specified in handoff but not implemented
- EXTRA: Implemented but not in handoff spec

**T2 implementation note:** Full TypeScript AST parsing would require a dependency (typescript compiler API or ts-morph). Alternative: regex-based interface extraction from `.d.ts` files, which is less accurate but preserves zero-npm-dependency constraint. Recommend regex for MVP, flag AST parsing as future enhancement.

**Trigger:** Manual via `/pde:check-divergence` command; optionally hook-driven after code changes.

## Feature Dependencies

```
AGENTS.md generation ─────────────────────────── (no dependencies, plain markdown)
     |
     +-- .cursorrules generation (extends AGENTS.md content with Cursor-specific format)
     +-- GEMINI.md generation (extends AGENTS.md content with Gemini CLI hierarchy)
     +-- Antigravity agent config (extends AGENTS.md with GEMINI.md + .agent/skills/)

MCP server ──────────────────────────────────── (independent, parallel track)
     |
     +-- Pipeline status tool (reads DESIGN-STATE.md)
     +-- Artifact retrieval tools (reads design-manifest.json)
     +-- Token delivery tool (reads SYS-*.json, converts to Tailwind)

Design token conversion ─────────────────────── (required by Cursor + Antigravity context)
     |
     +-- Tailwind v4 @theme output
     +-- CSS custom properties output
     +-- DESIGN.md generation (Antigravity Design DNA format)

Stitch bridge ───────────────────────────────── (requires token conversion + v0.9 Stitch MCP)
     |
     +-- DESIGN.md generator (DTCG -> Design DNA)
     +-- Antigravity origin detection
     +-- Existing STH pipeline (v0.9)

Divergence detection ────────────────────────── (requires handoff specs exist)
     |
     +-- T1: Structural (glob-based, low dependency)
     +-- T2: Content (regex-based interface parsing for MVP)
     +-- T3: Behavioral (grep-based, low dependency)

Context sync engine ─────────────────────────── (requires all generators built first)
     |
     +-- Hook-driven regeneration (event bus v0.8)
     +-- /pde:sync-editors command
```

## MVP Recommendation

**Phase 1 -- Context Generation (foundation):**
1. `AGENTS.md` generator (cross-tool baseline, simplest format)
2. `.cursor/rules/*.mdc` generator (largest user base)
3. `GEMINI.md` hierarchical generator
4. Design token Tailwind conversion

**Phase 2 -- MCP Server (consumption layer):**
5. Standalone MCP server with 10 read-only tools
6. `npx pde-mcp-server` entry point with stdio transport

**Phase 3 -- Stitch Bridge (design flow):**
7. `DESIGN.md` generator for Antigravity Design DNA
8. Antigravity origin detection in manifest
9. `.agent/skills/pde-design/` skill export

**Phase 4 -- Divergence + Sync (quality layer):**
10. Three-tier divergence detection (T1+T2 for MVP, T3 deferred)
11. `DIVERGENCE.md` output
12. Context sync engine (hook-driven regeneration)
13. `/pde:sync-editors` command

**Defer:**
- Antigravity agent skills for individual pipeline stages (complexity outweighs initial value)
- Multi-format artifact export beyond React+Tailwind (wait for user demand signal)
- T3 behavioral divergence detection (diminishing returns; T1+T2 cover 80% of value)
- Full TypeScript AST parsing for divergence (regex MVP first, upgrade when needed)

## Sources

- [Cursor Rules for AI docs](https://cursor.com/docs) -- .mdc format specification [HIGH confidence]
- [Cursor .mdc best practices forum](https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526) -- frontmatter fields, rule types [MEDIUM confidence]
- [Cursor .mdc deep dive (0.45+)](https://forum.cursor.com/t/a-deep-dive-into-cursor-rules-0-45/60721) -- detailed format behavior [MEDIUM confidence]
- [Cursor 40-tool MCP limit](https://forum.cursor.com/t/mcp-server-40-tool-limit-in-cursor-is-this-frustrating-your-workflow/81627) -- confirmed 40-tool cap across all servers [HIGH confidence]
- [Gemini CLI GEMINI.md specification](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html) -- hierarchical loading, @file imports [HIGH confidence]
- [Antigravity rules guide with AGENTS.md](https://antigravity.codes/blog/user-rules) -- priority hierarchy, cross-tool format [MEDIUM confidence]
- [AGENTS.md standard](https://agents.md/) -- cross-tool specification [MEDIUM confidence]
- [Antigravity AGENTS.md v1.20.3 guide](https://antigravitylab.net/en/articles/tips/agents-md-guide) -- format, plain markdown, nesting [MEDIUM confidence]
- [Stitch-Antigravity integration guide](https://antigravity.codes/blog/google-stitch-antigravity-guide) -- DESIGN.md format, MCP bridge, 7 agent skills [MEDIUM confidence]
- [davideast/stitch-mcp GitHub](https://github.com/davideast/stitch-mcp) -- tool list (build_site, get_screen_code, get_screen_image) [MEDIUM confidence]
- [Design-to-Code Antigravity+Stitch Codelab](https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch) -- official Google workflow [HIGH confidence]
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- server implementation patterns, Zod schemas [HIGH confidence]
- [Claude Code AGENTS.md support issue #6235](https://github.com/anthropics/claude-code/issues/6235) -- not natively supported, fallback behavior [MEDIUM confidence]
- [Architecture drift detection (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S0920548923000557) -- absence/divergence/convergence model [HIGH confidence]
- [Google Antigravity announcement](https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/) -- official platform description [HIGH confidence]
- [Antigravity AgentKit 2.0](https://www.geeky-gadgets.com/google-antigravity-agentkit-2026/) -- 16 agents, 40+ skills [LOW confidence, third-party report]
