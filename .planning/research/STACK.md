# Stack Research

**Domain:** AI-powered product development platform (Claude Code plugin, evolving to standalone CLI)
**Researched:** 2026-03-14
**Confidence:** HIGH (core plugin stack), MEDIUM (post-v1 MCP/CLI evolution)

---

## Context: Two-Phase Stack

PDE has two distinct technology phases with different constraints:

**v1 (clone phase):** Fork GSD. The stack IS GSD's stack. No architectural decisions to make — preserve what works.

**Post-v1 (platform phase):** Design pipeline, MCP integrations, standalone CLI, multi-provider support. Stack decisions matter here.

This document covers both, with clear separation.

---

## v1 Stack: What GSD Uses (Preserve As-Is)

GSD v1.22.4 is zero-dependency Node.js. This is a feature, not a limitation. It means:
- Installable anywhere Node is present
- No `npm install` step for end users
- No version conflicts
- Claude Code plugin compatibility is guaranteed

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 20.x LTS (20.20.0 verified) | Runtime for gsd-tools.cjs | GSD targets v20+; Claude Code itself runs on Node; LTS ensures stability |
| CommonJS (.cjs) | ES2020 | Module format for tooling | Required for Claude Code plugin compatibility; avoids ESM interop complexity |
| Markdown + YAML frontmatter | — | Skill/workflow/agent definitions | Claude Code's native format for skills, subagents, hooks |
| JSON | — | Config (.planning/config.json, plugin.json) | Standard, no parser needed |

### GSD Architecture Components (All Carry Over to PDE)

| Component | GSD Location | Claude Code Concept | Purpose |
|-----------|-------------|---------------------|---------|
| Workflows | `workflows/*.md` | Skills (`context: fork`, `disable-model-invocation: true`) | User-invoked procedures like new-project, plan-phase |
| Agents | Model profiles in `core.cjs` | Subagents (`.claude/agents/*.md`) | Specialized AI roles: planner, executor, researcher |
| Skill files | `workflows/*.md` | Skills (`.claude/skills/`) | Reusable prompt templates |
| Templates | `templates/` | Supporting files in skill directories | Scaffolding for planning documents |
| References | `references/` | Supporting files in skill directories | Reference docs loaded on demand |
| Tools binary | `bin/gsd-tools.cjs` | Shell commands callable from skills via `!` injection | Config, state, phase, roadmap operations |
| Config | `.planning/config.json` | Project-level config | Per-project settings (model profile, git, etc.) |

### Supporting Libraries (v1)

GSD uses zero npm dependencies. All functionality uses Node built-ins:

| Module | Version | Purpose | Notes |
|--------|---------|---------|-------|
| `fs` | built-in | File I/O | All config, state, template reading |
| `path` | built-in | Cross-platform paths | `toPosixPath()` helper normalizes separators |
| `child_process` | built-in | Git operations, shell commands | `execSync` for git integration |
| `os` | built-in | Home directory, temp files | `~/.gsd/` config, tmpfiles for large payloads |
| `fetch` | built-in (Node 18+) | Brave Search API calls | No node-fetch needed on Node 18+ |
| `URLSearchParams` | built-in | Query string building | Used in websearch command |

**Confidence: HIGH** — Verified by reading source code directly.

---

## Post-v1 Stack: Platform Evolution

These are the recommended technologies for each capability added after the v1 clone.

### Claude Code Plugin Format (Current, Applies Now)

The Claude Code plugin ecosystem has evolved. GSD was built before the formal plugin system existed. PDE should adopt the current standard.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `.claude-plugin/plugin.json` | Current | Plugin manifest | Required for distributable plugins; defines name (namespace), description, version |
| `skills/` directory | Current | Agent Skills (SKILL.md files) | Current recommended format; supersedes `.claude/commands/`; supports auto-invocation, supporting files |
| `agents/` directory | Current | Subagent definitions (`.md` with YAML frontmatter) | Standard location for custom subagents at plugin scope |
| `hooks/hooks.json` | Current | Event-driven automation | PostToolUse, PreToolUse, SubagentStart/Stop lifecycle hooks |
| `.mcp.json` | Current | MCP server configurations | Standard location for MCP integrations at plugin scope |

**SKILL.md format is the current standard.** GSD's `.claude/commands/*.md` files work identically but skills add: supporting file directories, `context: fork` for subagent execution, `disable-model-invocation` control, `user-invocable` control.

**Confidence: HIGH** — Verified against official Claude Code docs (code.claude.com/docs/en/skills, /plugins, /sub-agents).

### MCP Server Integration (Post-v1)

For design pipeline tools, external integrations, and toolkit connections:

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@modelcontextprotocol/sdk` | 1.27.1 (latest v1.x) | MCP server/client SDK | Official Anthropic SDK; 33K+ projects; TypeScript-first; supports stdio and Streamable HTTP transports |
| TypeScript | 5.x | MCP server implementation language | SDK is TypeScript-native; better tooling than plain JS for protocol code |
| `zod` | 3.x | Schema validation for MCP tools | Standard in MCP ecosystem for validating tool inputs |

**Do not upgrade to v2.x of MCP SDK yet.** v2 is in development as of early 2026; v1.x is production-stable.

**Transport choice:** Use `stdio` for local, process-spawned MCP servers (what Claude Code plugin consumers run). Use Streamable HTTP only for remote/multi-user scenarios.

**Confidence: MEDIUM** — Version from npm search results (not directly fetched from registry); transport guidance from official MCP docs.

### Standalone CLI (Post-v1)

When PDE evolves beyond Claude Code to a standalone CLI:

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Commander.js | 14.x | CLI argument parsing | 35M weekly downloads; most widely used; TypeScript support; maintenance mode at v14 is fine for 12+ months (v15 is ESM-only and breaks CJS) |
| Node.js | 20.x LTS | Minimum runtime | Aligns with existing GSD runtime target; v22 LTS available for future upgrade |

**Do NOT use Commander 15.** It was released May 2026 as ESM-only, requiring Node 22.12+. The GSD codebase is CJS. Mixing ESM-only CLI framework with CJS tooling creates `require(esm)` headaches. Commander 14 gets security patches until May 2027.

**Confidence: MEDIUM** — Commander version info from npm search results; ESM constraint from search result content.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `jq` (system) | JSON processing in hook shell scripts | Required for hooks that parse tool input; not an npm dep |
| Git | Version control, phase branching | GSD integrates deeply; `execSync` git calls throughout |
| Brave Search API | Web search in research agents | Optional; falls back gracefully when `BRAVE_API_KEY` not set |

---

## Installation

### v1 (No new dependencies needed)

```bash
# GSD/PDE tooling is zero-dependency Node.js
# No npm install step required for plugin consumers
# Only requirement: Node.js 20+
node --version  # verify >= 20.0.0
```

### Post-v1 MCP server development

```bash
# For building MCP server integrations
npm install @modelcontextprotocol/sdk@^1.27.1
npm install zod@^3.0.0

# Dev dependencies for TypeScript MCP servers
npm install -D typescript@^5.0.0 tsx @types/node
```

### Post-v1 standalone CLI (if/when needed)

```bash
# CLI framework — use v14, not v15 (ESM-only)
npm install commander@^14.0.0
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| CommonJS (.cjs) | ESM (.mjs) | When targeting Node 22+ exclusively and willing to break plugin backwards compatibility |
| Commander 14 | oclif | If PDE becomes a Salesforce-scale CLI with plugin marketplace; overkill for single-tool CLIs |
| Commander 14 | yargs | yargs has more middleware but more complexity; commander is simpler for PDE's needs |
| Commander 14 | Commander 15 (ESM) | Only if Node 22.12+ is the minimum target AND codebase is fully converted to ESM |
| @modelcontextprotocol/sdk v1.x | v2.x | When v2 reaches stable release (anticipated Q1-Q2 2026 but not yet released) |
| SKILL.md skills | `.claude/commands/*.md` | `.claude/commands/` still works; use it for quick personal hacks, not for distributable plugin |
| Markdown+YAML frontmatter for agents | JSON config | JSON is valid for programmatic generation; YAML frontmatter is the human-authored standard |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| TypeScript for gsd-tools.cjs (v1) | v1 is a clone; rewriting in TypeScript is out of scope and a risk | Keep CJS JavaScript; TypeScript is appropriate for new MCP server code only |
| `npm` package dependencies in the plugin itself | Plugin consumers shouldn't need `npm install`; zero-dep is a feature | Node.js built-ins only for plugin tooling |
| ESM for the core tools binary | Claude Code's plugin system invokes scripts via `node file.cjs`; ESM requires `.mjs` or `"type":"module"` in package.json which breaks the `#!/usr/bin/env node` invocation pattern | CommonJS with `.cjs` extension |
| Commander 15+ | ESM-only; requires Node 22.12+; incompatible with current CJS codebase | Commander 14.x |
| `@modelcontextprotocol/sdk` v2.x | Not yet stable as of 2026-03-14 | v1.27.1 |
| `node-fetch` | Built into Node 18+; adding it as a dep is unnecessary weight | `fetch` (built-in) |
| Python or other runtimes for tooling | GSD consumers have Node; adding a Python dependency increases installation friction | Node.js for all tooling |

---

## Stack Patterns by Variant

**If building a new skill/workflow for the plugin:**
- Use `SKILL.md` format with YAML frontmatter in `skills/<name>/SKILL.md`
- Add `disable-model-invocation: true` for workflows users invoke directly (like `/pde:new-project`)
- Reference supporting templates/references from SKILL.md body so Claude loads them on demand

**If building a new subagent for the plugin:**
- Use `.md` with YAML frontmatter in `agents/<name>.md`
- Specify `model: haiku` for high-volume read-only operations (codebase mapping, verification checks)
- Specify `model: sonnet` for planning and balanced tasks
- Specify `model: opus` for research synthesis and roadmapping (or `inherit` if using model profiles)
- Use `tools:` allowlist to restrict capabilities; never grant more than needed

**If building an MCP server integration (post-v1):**
- Use TypeScript with `@modelcontextprotocol/sdk`
- Define in plugin's `.mcp.json` for auto-connection
- Use `stdio` transport for local tools
- Scope to specific subagents via subagent `mcpServers:` field if tool is not general-purpose

**If building the standalone CLI (post-v1):**
- Start with Commander 14 as thin wrapper around existing gsd-tools.cjs logic
- Do not rewrite gsd-tools.cjs; expose it via CLI commands
- Keep CJS throughout until ESM migration is planned as an explicit milestone

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Node.js 20.x | Commander 14.x, @modelcontextprotocol/sdk 1.x | Current verified combination |
| Node.js 20.x | Commander 15.x | INCOMPATIBLE — Commander 15 requires Node 22.12+ |
| @modelcontextprotocol/sdk 1.27.1 | Node.js 18+ | fetch required; Node 18+ provides it built-in |
| CommonJS (.cjs) | Commander 14.x | Compatible — Commander 14 supports CJS |
| CommonJS (.cjs) | Commander 15.x | INCOMPATIBLE — Commander 15 is ESM-only |
| SKILL.md skills | `.claude/commands/*.md` | Both work; skills take precedence when names conflict |

---

## Sources

- Official Claude Code docs (code.claude.com/docs/en/skills) — Skills format, SKILL.md frontmatter fields, invocation control **[HIGH confidence]**
- Official Claude Code docs (code.claude.com/docs/en/plugins) — Plugin structure, plugin.json manifest, directory layout **[HIGH confidence]**
- Official Claude Code docs (code.claude.com/docs/en/sub-agents) — Subagent frontmatter, model aliases, tools field **[HIGH confidence]**
- GSD source code (direct read of bin/gsd-tools.cjs, bin/lib/*.cjs) — Zero-dependency Node.js pattern, built-in fetch, CJS format **[HIGH confidence]**
- npm search results — @modelcontextprotocol/sdk v1.27.1 latest, v2 in development **[MEDIUM confidence — not directly fetched from registry]**
- npm/GitHub search results — Commander 14.x latest, Commander 15 ESM-only released May 2026 **[MEDIUM confidence]**
- modelcontextprotocol.io/docs/sdk — Transport options, stdio vs Streamable HTTP **[HIGH confidence via WebSearch]**

---

*Stack research for: AI-powered product development platform (PDE, forked from GSD)*
*Researched: 2026-03-14*
