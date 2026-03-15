# Stack Research

**Domain:** AI-powered product development platform (Claude Code plugin, evolving to standalone CLI)
**Researched:** 2026-03-15 (updated for v1.1 Design Pipeline)
**Confidence:** HIGH (core plugin stack, design pipeline additions), MEDIUM (post-v1 MCP/CLI evolution)

---

## Context: Two-Phase Stack

PDE has two distinct technology phases with different constraints:

**v1 (clone phase):** Fork GSD. The stack IS GSD's stack. No architectural decisions to make — preserve what works.

**Post-v1 (platform phase):** Design pipeline, MCP integrations, standalone CLI, multi-provider support. Stack decisions matter here.

This document covers both, with a dedicated section for v1.1 design pipeline additions.

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
| Node.js | 20.x LTS (20.20.0 verified) | Runtime for pde-tools.cjs | GSD targets v20+; Claude Code itself runs on Node; LTS ensures stability |
| CommonJS (.cjs) | ES2020 | Module format for tooling | Required for Claude Code plugin compatibility; avoids ESM interop complexity |
| Markdown + YAML frontmatter | -- | Skill/workflow/agent definitions | Claude Code's native format for skills, subagents, hooks |
| JSON | -- | Config (.planning/config.json, plugin.json) | Standard, no parser needed |

### GSD Architecture Components (All Carry Over to PDE)

| Component | GSD Location | Claude Code Concept | Purpose |
|-----------|-------------|---------------------|---------|
| Workflows | workflows/*.md | Skills (context: fork, disable-model-invocation: true) | User-invoked procedures like new-project, plan-phase |
| Agents | Model profiles in core.cjs | Subagents (.claude/agents/*.md) | Specialized AI roles: planner, executor, researcher |
| Skill files | workflows/*.md | Skills (.claude/skills/) | Reusable prompt templates |
| Templates | templates/ | Supporting files in skill directories | Scaffolding for planning documents |
| References | references/ | Supporting files in skill directories | Reference docs loaded on demand |
| Tools binary | bin/pde-tools.cjs | Shell commands callable from skills via ! injection | Config, state, phase, roadmap operations |
| Config | .planning/config.json | Project-level config | Per-project settings (model profile, git, etc.) |

### Supporting Libraries (v1)

GSD uses zero npm dependencies. All functionality uses Node built-ins:

| Module | Version | Purpose | Notes |
|--------|---------|---------|-------|
| fs | built-in | File I/O | All config, state, template reading |
| path | built-in | Cross-platform paths | toPosixPath() helper normalizes separators |
| child_process | built-in | Git operations, shell commands | execSync for git integration |
| os | built-in | Home directory, temp files | ~/.pde/ config, tmpfiles for large payloads |
| fetch | built-in (Node 18+) | Brave Search API calls | No node-fetch needed on Node 18+ |
| URLSearchParams | built-in | Query string building | Used in websearch command |

**Confidence: HIGH** -- Verified by reading source code directly.

---

## v1.1 Stack: Design Pipeline Additions

### The Core Principle: The LLM IS the generator

The design pipeline (brief to flows to system to wireframe to critique to iterate to handoff) uses Claude to generate artifact content directly. This means:

- **Mermaid diagrams**: Claude writes Mermaid syntax text into .md files. No rendering library needed -- Mermaid text renders natively in GitHub, Claude's interface, and any Markdown viewer.
- **HTML wireframes**: Claude writes complete .html files with inline CSS. No template engine needed -- that is what the LLM is for.
- **Design tokens (DTCG JSON)**: Claude writes the $value/$type JSON directly. The format is a well-documented spec the LLM knows.
- **TypeScript interfaces**: Claude writes .ts files directly as text output, no schema compiler needed.
- **CSS custom properties**: A small new CommonJS utility function traverses the DTCG JSON and emits CSS -- no external library needed.

**What this means for the stack: zero new npm dependencies for v1.1.** All new capabilities extend bin/pde-tools.cjs or bin/lib/ using Node.js built-ins only.

### New Source Files (No New npm Dependencies)

| File | Purpose | Pattern |
|------|---------|---------|
| bin/lib/design.cjs | Design pipeline utilities: token-to-CSS conversion, manifest read/write, artifact path resolution | CommonJS, Node built-ins only |
| commands/brief.md | Implemented /pde:brief skill | Markdown + YAML frontmatter (already exists as stub) |
| commands/flows.md | Implemented /pde:flows skill | Markdown + YAML frontmatter (already exists as stub) |
| commands/system.md | Implemented /pde:system skill | Markdown + YAML frontmatter (already exists as stub) |
| commands/wireframe.md | Implemented /pde:wireframe skill | Markdown + YAML frontmatter (already exists as stub) |
| commands/critique.md | Implemented /pde:critique skill | Markdown + YAML frontmatter (already exists as stub) |
| commands/iterate.md | Implemented /pde:iterate skill | Markdown + YAML frontmatter (already exists as stub) |
| commands/handoff.md | Implemented /pde:handoff skill | Markdown + YAML frontmatter (already exists as stub) |

### Design Artifact Formats

| Artifact | Format | Why |
|----------|--------|-----|
| Design brief | Markdown (.md) | Human-readable, fits existing .planning/ state model |
| User flows | Mermaid syntax embedded in Markdown (.md) | LLM-native; renders in GitHub, Claude, VS Code without a renderer |
| Design system tokens | DTCG JSON (.tokens.json) + CSS custom properties (.css) | DTCG 2025.10 is the first stable W3C spec; $value/$type structure is simple JSON Claude generates directly |
| Wireframes | Static HTML files (.html) | Self-contained, browser-viewable, no server; fidelity-controlled via lo-fi/mid-fi/hi-fi templates |
| Critique report | Markdown (.md) | Structured text; fits existing state model |
| Handoff spec | Markdown (.md) + TypeScript interfaces (.ts) | Markdown for narrative; TypeScript generated as text by Claude |
| Design manifest | JSON (.json) | Machine-readable inventory for planning; already templated at templates/design-manifest.json |

### New pde-tools.cjs Commands (Design Pipeline)

These extend the existing CLI without any new dependencies:

| Command | Purpose | Implementation |
|---------|---------|----------------|
| design manifest-read | Load and return design-manifest.json | fs.readFileSync + JSON.parse |
| design manifest-update code field value | Update a specific artifact entry | JSON parse/mutate/write |
| design artifact-path code | Resolve canonical path for an artifact code | Path math from manifest |
| design tokens-to-css tokens-file | Convert DTCG JSON to CSS custom properties block | Recursive JSON traversal, no deps |
| design coverage-check | Return which artifact types exist | Read manifest designCoverage flags |
| design staleness-check | Report artifacts not updated recently | Date math on manifest entries |

### CSS Custom Properties Generation (Zero-Dependency Implementation)

The DTCG format uses $value/$type keys. Converting to CSS custom properties is a simple recursive walk -- no library needed. Implementation goes in bin/lib/design.cjs:

```
function dtcgToCss(tokens, prefix) {
  prefix = prefix || '';
  var lines = [];
  Object.keys(tokens).forEach(function(key) {
    if (key.startsWith('$')) return;           // skip $description, $extensions
    var val = tokens[key];
    if (val.$value !== undefined) {             // leaf token
      lines.push('  --' + prefix + key + ': ' + val.$value + ';');
    } else {                                    // group -- recurse
      dtcgToCss(val, prefix + key + '-').forEach(function(l) { lines.push(l); });
    }
  });
  return lines;
}

function generateCssVars(tokens) {
  return ':root {\n' + dtcgToCss(tokens).join('\n') + '\n}\n';
}
```

This handles the full DTCG 2025.10 spec for color, typography, spacing, shadow, border, and motion tokens.

**Confidence: HIGH** -- DTCG format verified against designtokens.org spec (2025.10 stable release). CSS custom property generation is standard JavaScript with no edge cases for the token types PDE uses.

### Mermaid: Text Output Only (No Rendering Library)

Mermaid v11 (current: 11.13.x as of March 2026) is ESM-only. It cannot be required in a CommonJS codebase. More importantly, PDE does not need to render Mermaid -- it needs to generate Mermaid syntax text.

**Decision: Do not install the mermaid npm package.** Claude writes Mermaid syntax directly into .md files as fenced code blocks. This is the correct approach because:

1. LLMs are extensively trained on Mermaid syntax and generate it reliably
2. Mermaid renders natively in GitHub, Claude's own interface, VS Code (with extension), Obsidian, and virtually all Markdown viewers
3. User flow diagrams stored as Mermaid text are version-control-diff-friendly
4. Installing Mermaid would require dynamic import() wrappers around every CJS call site -- high complexity for zero user benefit

Format used by /pde:flows: .md files containing fenced Mermaid blocks, e.g.:
```
## Main User Flow

(mermaid)
flowchart TD
  A[Landing] --> B{Signed in?}
  B -- No --> C[Login]
  B -- Yes --> D[Dashboard]
(/mermaid)
```

**Confidence: HIGH** -- Mermaid ESM-only constraint verified from GitHub issues mermaid-js/mermaid #3590 and #4148. LLM generation approach confirmed by community patterns.

### HTML Wireframes: Raw HTML/CSS, No Template Engine

Template engines (Handlebars, Nunjucks, EJS) solve the problem of separating template logic from data when the same template is rendered many times with different data. PDE's use case is different: Claude generates each wireframe as a unique HTML document for a specific screen. A template engine adds a build step for no benefit.

**Decision: Do not install a template engine.** Claude writes complete, self-contained HTML files using:
- Design token CSS variables from assets/tokens.css (for mid-fi and hi-fi fidelity)
- Inline style blocks for screen-specific layout
- No JavaScript framework -- static HTML only
- Fidelity-controlled: lo-fi uses gray boxes/labels only; hi-fi applies full token classes

The existing templates/wireframe-spec.md already defines this HTML structure pattern. /pde:wireframe reads it as a reference and instructs Claude to produce conformant output.

**Confidence: HIGH** -- Verified by reading templates/wireframe-spec.md and templates/design-system.md. Pattern is consistent with existing PDE architecture (Claude writes files, no build pipeline).

### TypeScript Interface Generation: Claude Writes Text

json-schema-to-typescript (v15.0.4, last published approximately 12 months ago) generates TypeScript from JSON Schema. This is the wrong tool for PDE's use case:

1. PDE handoff specs are written by Claude reasoning about component APIs from wireframes and flows -- not derived mechanically from a JSON schema
2. v15 module format not confirmed as CommonJS-compatible
3. Adding a dependency for a task Claude performs better (contextual API design) than a mechanical transformer

**Decision: Do not install json-schema-to-typescript.** /pde:handoff instructs Claude to write TypeScript interface declarations directly as text output into .ts files. This produces better component APIs because Claude reasons about semantics, not just structure.

**Confidence: HIGH** -- json-schema-to-typescript v15.0.4 confirmed as latest from npm search. CommonJS compatibility unconfirmed. Reasoning: LLM-generated TypeScript is more contextually accurate than schema-derived output for UI component APIs.

### Style Dictionary and Terrazzo: Unnecessary

Both Style Dictionary v5 and Terrazzo v0.7.2 are ESM-only. Both solve the problem of transforming design tokens across multiple platform targets (iOS, Android, CSS, Sass, etc.). PDE v1.1 outputs CSS custom properties only. The zero-dependency dtcgToCss() function above covers 100% of the use case.

**Decision: Do not install Style Dictionary or Terrazzo.** Use the inline dtcgToCss() implementation in bin/lib/design.cjs.

**Confidence: HIGH** -- Style Dictionary v4+ confirmed ESM-only (migration guide explicitly states this). Terrazzo v0.7.2 ESM-only (npm search result, published March 2026). PDE's single-platform CSS output does not justify the complexity.

---

## Post-v1 Stack: Platform Evolution

### Claude Code Plugin Format (Current, Applies Now)

The Claude Code plugin ecosystem has evolved. GSD was built before the formal plugin system existed. PDE should adopt the current standard.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| .claude-plugin/plugin.json | Current | Plugin manifest | Required for distributable plugins; defines name (namespace), description, version |
| skills/ directory | Current | Agent Skills (SKILL.md files) | Current recommended format; supersedes .claude/commands/; supports auto-invocation, supporting files |
| agents/ directory | Current | Subagent definitions (.md with YAML frontmatter) | Standard location for custom subagents at plugin scope |
| hooks/hooks.json | Current | Event-driven automation | PostToolUse, PreToolUse, SubagentStart/Stop lifecycle hooks |
| .mcp.json | Current | MCP server configurations | Standard location for MCP integrations at plugin scope |

**SKILL.md format is the current standard.** GSD's .claude/commands/*.md files work identically but skills add: supporting file directories, context: fork for subagent execution, disable-model-invocation control, user-invocable control.

**Confidence: HIGH** -- Verified against official Claude Code docs.

### MCP Server Integration (Post-v1)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @modelcontextprotocol/sdk | 1.27.1 (latest v1.x) | MCP server/client SDK | Official Anthropic SDK; TypeScript-first; supports stdio and Streamable HTTP transports |
| TypeScript | 5.x | MCP server implementation language | SDK is TypeScript-native; better tooling than plain JS for protocol code |
| zod | 3.x | Schema validation for MCP tools | Standard in MCP ecosystem for validating tool inputs |

**Do not upgrade to v2.x of MCP SDK yet.** v2 is in development as of early 2026; v1.x is production-stable.

**Transport choice:** Use stdio for local, process-spawned MCP servers (what Claude Code plugin consumers run). Use Streamable HTTP only for remote/multi-user scenarios.

**Confidence: MEDIUM** -- Version from npm search results; transport guidance from official MCP docs.

### Standalone CLI (Post-v1)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Commander.js | 14.x | CLI argument parsing | 35M weekly downloads; TypeScript support; v15 is ESM-only and breaks CJS |
| Node.js | 20.x LTS | Minimum runtime | Aligns with existing runtime target; v22 LTS available for future upgrade |

**Do NOT use Commander 15.** Released May 2026 as ESM-only, requiring Node 22.12+. The codebase is CJS. Commander 14 gets security patches until May 2027.

**Confidence: MEDIUM** -- Commander version info from npm search results.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| jq (system) | JSON processing in hook shell scripts | Required for hooks that parse tool input; not an npm dep |
| Git | Version control, phase branching | pde-tools.cjs integrates deeply |
| Brave Search API | Web search in research agents | Optional; falls back gracefully when BRAVE_API_KEY not set |

---

## Installation

### v1.1 Design Pipeline (No new npm dependencies)

```
# PDE design pipeline requires no new npm packages.
# All new capabilities are implemented in bin/lib/design.cjs using Node.js built-ins.
# Only requirement remains: Node.js 20+
node --version  # verify >= 20.0.0
```

### v1 and v1.1 plugin distribution

```
# Plugin consumers install via Claude Code (no npm step):
# claude plugin install https://github.com/your-org/pde
```

### Post-v1 MCP server development

```
npm install @modelcontextprotocol/sdk@^1.27.1
npm install zod@^3.0.0
npm install -D typescript@^5.0.0 tsx @types/node
```

### Post-v1 standalone CLI (if/when needed)

```
npm install commander@^14.0.0
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| LLM-generated Mermaid text | mermaid npm package (v11.x) | Only if server-side SVG rendering is required (e.g., PDF export). Use @mermaid-js/mermaid-cli via execFile as a dev tool, not a runtime dep |
| LLM-generated HTML | Handlebars / Nunjucks | If wireframes become templatized data products (50 screens from one template + data). v1.1 generates bespoke screens, so LLM authorship is better |
| Inline dtcgToCss() | Style Dictionary v5 | When supporting multiple output platforms (iOS, Android, Sass). Style Dictionary value appears at platform 2+ |
| Inline dtcgToCss() | Terrazzo v0.7.2 | Same as Style Dictionary -- when multi-platform token distribution is required |
| LLM-generated TypeScript | json-schema-to-typescript v15 | If component APIs are mechanically derived from data schemas. UI component interfaces require semantic reasoning, so LLM wins |
| CommonJS (.cjs) | ESM (.mjs) | When targeting Node 22+ exclusively and willing to break plugin backwards compatibility |
| Commander 14 | oclif | If PDE becomes a Salesforce-scale CLI with plugin marketplace |
| Commander 14 | Commander 15 (ESM) | Only if Node 22.12+ is the minimum target AND codebase is fully converted to ESM |
| @modelcontextprotocol/sdk v1.x | v2.x | When v2 reaches stable release (anticipated Q1-Q2 2026 but not yet released) |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| mermaid npm package | ESM-only since v10; require() fails in CJS codebase; PDE only needs text output, not rendering | LLM writes Mermaid syntax directly as text |
| style-dictionary npm package | ESM-only since v4; CommonJS interop requires dynamic import() wrappers; full-featured for multi-platform, overkill for CSS-only output | Inline dtcgToCss() function in bin/lib/design.cjs |
| @terrazzo/cli npm package | ESM-only (v0.7.2); same overfit as Style Dictionary for single-platform use | Inline dtcgToCss() function in bin/lib/design.cjs |
| json-schema-to-typescript | CommonJS support unconfirmed at v15; LLM-authored TypeScript is more semantically accurate for UI component APIs | Claude writes .ts files directly |
| Handlebars / Nunjucks / EJS | Template engines solve data-driven template rendering; PDE generates bespoke, contextual content | Claude writes HTML files directly |
| Any server framework | PDE generates static files; no server needed; PROJECT.md explicitly excludes in-tool web dashboard | Static file generation only |
| TypeScript for pde-tools.cjs | Out of scope for v1.1; rewriting is a risk | Keep CJS JavaScript; TypeScript appropriate for new MCP server code only |
| npm package dependencies in the plugin | Plugin consumers should not need npm install; zero-dep is a feature | Node.js built-ins only |
| ESM for the core tools binary | Invoked via node file.cjs; ESM breaks this invocation pattern | CommonJS with .cjs extension |
| Commander 15+ | ESM-only; requires Node 22.12+; incompatible with CJS codebase | Commander 14.x |
| @modelcontextprotocol/sdk v2.x | Not yet stable as of 2026-03-15 | v1.27.1 |
| node-fetch | Built into Node 18+; unnecessary dep | fetch (built-in) |

---

## Stack Patterns by Variant

**If building a design pipeline skill (v1.1):**
- Add the skill implementation to commands/skill-name.md (stubs already exist)
- Reference existing templates from templates/ as LLM guidance
- Add new pde-tools.cjs subcommands under design namespace for manifest operations
- Output artifacts to .planning/design/{domain}/ (strategy, ux, visual)
- Update design-manifest.json at completion of each skill

**If the design skill needs to generate a CSS file from DTCG tokens:**
- Call: node pde-tools.cjs design tokens-to-css tokens-file from the skill
- Capture output and write to the target .css file using the Write tool
- No npm package involved

**If building a new skill/workflow for the plugin:**
- Use SKILL.md format with YAML frontmatter in skills/name/SKILL.md
- Add disable-model-invocation: true for workflows users invoke directly
- Reference supporting templates/references from SKILL.md body

**If building a new subagent for the plugin:**
- Use .md with YAML frontmatter in agents/name.md
- haiku for high-volume read-only operations; sonnet for planning; opus for research synthesis
- Use tools: allowlist to restrict capabilities; never grant more than needed

**If building an MCP server integration (post-v1):**
- Use TypeScript with @modelcontextprotocol/sdk
- Define in plugin's .mcp.json for auto-connection
- Use stdio transport for local tools

**If building the standalone CLI (post-v1):**
- Start with Commander 14 as thin wrapper around existing pde-tools.cjs logic
- Do not rewrite pde-tools.cjs; expose it via CLI commands
- Keep CJS throughout until ESM migration is planned as an explicit milestone

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Node.js 20.x | Commander 14.x, @modelcontextprotocol/sdk 1.x | Current verified combination |
| Node.js 20.x | Commander 15.x | INCOMPATIBLE -- Commander 15 requires Node 22.12+ |
| @modelcontextprotocol/sdk 1.27.1 | Node.js 18+ | fetch required; Node 18+ provides it built-in |
| CommonJS (.cjs) | Commander 14.x | Compatible -- Commander 14 supports CJS |
| CommonJS (.cjs) | Commander 15.x | INCOMPATIBLE -- Commander 15 is ESM-only |
| CommonJS (.cjs) | mermaid 10+ | INCOMPATIBLE -- mermaid 10+ is ESM-only |
| CommonJS (.cjs) | style-dictionary 4+ | INCOMPATIBLE -- style-dictionary 4+ is ESM-only |
| CommonJS (.cjs) | @terrazzo/cli 0.7.x | INCOMPATIBLE -- Terrazzo is ESM-only |
| SKILL.md skills | .claude/commands/*.md | Both work; skills take precedence when names conflict |
| DTCG tokens 2025.10 | CSS custom properties | Direct: $value becomes var(--token-name) |

---

## Sources

- Official Claude Code docs (code.claude.com/docs/en/skills) -- Skills format, SKILL.md frontmatter fields, invocation control [HIGH confidence]
- Official Claude Code docs (code.claude.com/docs/en/plugins) -- Plugin structure, plugin.json manifest, directory layout [HIGH confidence]
- Official Claude Code docs (code.claude.com/docs/en/sub-agents) -- Subagent frontmatter, model aliases, tools field [HIGH confidence]
- PDE source code (direct read of bin/pde-tools.cjs, bin/lib/*.cjs) -- Zero-dependency Node.js pattern, built-in fetch, CJS format [HIGH confidence]
- designtokens.org/tr/drafts/format/ -- DTCG 2025.10 stable spec, $value/$type format [HIGH confidence]
- w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/ -- DTCG first stable version announcement [HIGH confidence]
- github.com/mermaid-js/mermaid issues #3590, #4148 -- Mermaid 10+ ESM-only confirmed, CommonJS broken [HIGH confidence]
- styledictionary.com/versions/v4/migration/ -- Style Dictionary v4+ ESM-only confirmed [HIGH confidence]
- npm search results -- style-dictionary v5.3.3, Terrazzo @terrazzo/cli v0.7.2, mermaid v11.13.x (March 2026) -- ESM-only [MEDIUM confidence]
- json-schema-to-typescript v15.0.4 -- latest version, CommonJS support unconfirmed [MEDIUM confidence]
- github.com/orgs/mermaid-js/discussions/4148 -- LLM Mermaid text generation approach [MEDIUM confidence]
- npm/GitHub search results -- Commander 14.x latest, Commander 15 ESM-only [MEDIUM confidence]
- modelcontextprotocol.io/docs/sdk -- Transport options, stdio vs Streamable HTTP [HIGH confidence via WebSearch]

---

*Stack research for: AI-powered product development platform (PDE), v1.1 Design Pipeline additions*
*Researched: 2026-03-15*
