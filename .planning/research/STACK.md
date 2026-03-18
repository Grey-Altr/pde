# Stack Research

**Domain:** AI-powered product development platform (Claude Code plugin, evolving to standalone CLI)
**Researched:** 2026-03-15 (updated for v1.1 Design Pipeline); v1.2 section added 2026-03-16; v1.3 section added 2026-03-17; v0.5 MCP Integrations added 2026-03-18
**Confidence:** HIGH (core plugin stack, design pipeline additions), MEDIUM (post-v1 MCP/CLI evolution, v0.5 MCP integrations)

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

## v1.2 Stack: Advanced Design Skills

### The Core Finding: Still No New npm Dependencies

All six new skills (ideation, competitive, opportunity, mockup, hig, recommend) follow the identical architecture as v1.1: Claude Code markdown workflows, reference files loaded via `@` include, `pde-tools.cjs` extensions, and template files. No npm packages are added.

The skills use five MCP servers that are already documented in `references/mcp-integration.md` and already installable via the existing `/pde:setup` command. No new MCP servers are needed.

### New Skills and Their Primary Technology Dependencies

| Skill | Artifact Code | New Reference Files | New pde-tools Commands | MCP Usage |
|-------|---------------|--------------------|-----------------------|-----------|
| /pde:ideation | IDT | ideation-techniques.md | manifest-set-coverage hasIdeation | Sequential Thinking |
| /pde:competitive | CMP | (uses existing strategy-frameworks.md) | manifest-set-coverage hasCompetitive | Sequential Thinking, websearch |
| /pde:opportunity | OPP | (uses existing strategy-frameworks.md) | manifest-set-coverage hasOpportunity | Sequential Thinking |
| /pde:mockup | MCK | mockup-patterns.md | manifest-set-coverage hasMockup, ensure-dirs (ux/mockups/) | Playwright, Superpowers |
| /pde:hig | HIG | (uses existing wcag-baseline.md, ios-hig.md, desktop-hig.md, interaction-patterns.md) | manifest-set-coverage hasHig | Axe a11y-mcp, Playwright, Sequential Thinking |
| /pde:recommend | REC | mcp-registry-catalog.md | manifest-set-coverage hasRec, mcp-registry-search | Context7 |

### MCP Servers: Versions and Integration Points

All of these are already in `references/mcp-integration.md`. Listed here with current versions for the build implementation.

| MCP Server | npm Package | Version (2026-03-16) | Install Command | New v1.2 Skills |
|------------|-------------|---------------------|-----------------|-----------------|
| Sequential Thinking | `@modelcontextprotocol/server-sequential-thinking` | 2025.12.18 | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` | ideation (diverge/converge reasoning), opportunity (RICE calibration), hig (WCAG criterion evaluation) |
| Axe a11y | `a11y-mcp` | 1.0.4 | `claude mcp add a11y -- npx a11y-mcp` | hig (automated WCAG 2.2 scan on generated HTML artifacts) |
| Playwright | `@playwright/mcp@latest` | latest (auto-resolves) | `claude mcp add playwright -- npx @playwright/mcp@latest` | mockup (screenshot + responsive validation), hig (accessibility tree audit) |
| Context7 | `@upstash/context7-mcp@latest` | 2.1.4 | `claude mcp add context7 -- npx -y @upstash/context7-mcp@latest` | recommend (library doc lookup for tool recommendations) |
| Superpowers | Local install at `~/.claude/mcp-servers/` | varies | Via /pde:setup | mockup (browser preview of hi-fi HTML output) |

**Source:** npm WebSearch 2026-03-16. Confidence: MEDIUM (WebSearch; direct npmjs.com page fetch returned 403).

### MCP Registry API (for /pde:recommend)

The official MCP Registry launched September 2025 at `registry.modelcontextprotocol.io`. It is publicly queryable with no authentication required.

**API:**
```
GET https://registry.modelcontextprotocol.io/v0/servers
  ?search={query}    — keyword filter
  ?limit={N}         — page size (default 10)
  ?cursor={cursor}   — pagination

Response JSON:
{
  "servers": [
    { "name": "...", "description": "...", "repository": "...", "version": "...", "packages": [...] }
  ],
  "metadata": { "count": N, "nextCursor": "..." }
}
```

The API is at a v0.1 freeze (stable, no breaking changes). The `/pde:recommend` skill uses a new `pde-tools.cjs mcp-registry-search <query>` command that calls this endpoint via Node.js built-in `https` module — no new npm dependency.

**Fallback:** When registry is unreachable, the skill uses a curated offline catalog in `references/mcp-registry-catalog.md` covering the 20 most common MCP servers for software projects. Same probe/use/degrade pattern as all other MCP integrations.

**Source:** Nordic APIs article on MCP Registry API (2025), official registry at registry.modelcontextprotocol.io. Confidence: HIGH.

### New Reference Files Needed

| File | Why New (Not Extension of Existing) | Content |
|------|-------------------------------------|---------|
| `references/ideation-techniques.md` | No existing reference covers diverge/converge design methods | SCAMPER, brainwriting, crazy-8s (diverge); dot voting, impact/effort matrix, feasibility filters (converge); HMW framing; design sprint phase templates |
| `references/mcp-registry-catalog.md` | Offline fallback for /pde:recommend when registry unreachable; distinct from mcp-integration.md (which covers probe/use/degrade, not discovery) | Curated list of ~20 high-value MCP servers with install commands, descriptions, use cases, project-type fit signals |
| `references/mockup-patterns.md` | No existing reference covers hi-fi interaction CSS patterns | CSS animation tokens (transitions, keyframes), hover/focus/active state CSS patterns, Liquid Glass material CSS approximation for iOS 26 preview, JS-free interaction state classes |

**References that already cover new skill needs (no new file needed):**
- `references/strategy-frameworks.md` — RICE + Porter's Five Forces already complete; used by competitive and opportunity
- `references/wcag-baseline.md` — All ~56 WCAG 2.2 A/AA criteria already documented; used by hig
- `references/ios-hig.md` — iOS HIG patterns already documented; needs ONE addition: Liquid Glass material section for iOS 26+ audit
- `references/desktop-hig.md` — macOS HIG patterns already documented
- `references/interaction-patterns.md` — ARIA patterns, keyboard nav, focus management already documented

### New pde-tools.cjs Commands Needed for v1.2

These are Node.js additions to the existing `bin/pde-tools.cjs` binary using only built-in modules.

| Command | Purpose | Implementation |
|---------|---------|----------------|
| `design manifest-set-coverage <flag> <value>` | Set a boolean coverage flag in designCoverage | JSON parse/mutate/write (same pattern as manifest-update) |
| `design ensure-dirs-extended` | Create `ux/mockups/` subdirectory (not in v1.1 ensure-dirs) | fs.mkdirSync with recursive:true |
| `mcp-registry-search <query> [--limit N]` | Query official MCP registry REST API | Built-in `https.get()`, JSON parse, return results array |

### New Artifact Codes and Coverage Flags

Additive changes to `design-manifest.json` schema (no schema version bump — all additive).

| Artifact Code | Skill | Domain Subdirectory | File Pattern | designCoverage Flag |
|---------------|-------|---------------------|--------------|---------------------|
| `IDT` | /pde:ideation | `strategy/` | `IDT-ideation-v{N}.md` | `hasIdeation` |
| `CMP` | /pde:competitive | `strategy/` | `CMP-landscape-v{N}.md` | `hasCompetitive` |
| `OPP` | /pde:opportunity | `strategy/` | `OPP-evaluation-v{N}.md` | `hasOpportunity` |
| `MCK-{screen}` | /pde:mockup | `ux/mockups/` | `MCK-{screen}-v{N}.html` | `hasMockup` |
| `HIG` | /pde:hig | `review/` | `HIG-audit-v{N}.md` | `hasHig` |
| `REC` | /pde:recommend | `strategy/` | `REC-recommendations-v{N}.md` | `hasRec` |

### Template Status

All but one template already exist (confirmed by directory listing of `templates/`):

| Template | Status | Notes |
|----------|--------|-------|
| `templates/competitive-landscape.md` | EXISTS | Full template with market overview, competitor profiles, gap analysis |
| `templates/opportunity-evaluation.md` | EXISTS | Full RICE + design-extension scoring table |
| `templates/hig-audit.md` | EXISTS | POUR compliance view + HIG platform findings |
| `templates/mockup-spec.md` | EXISTS | Visual design, interactions, component states, responsive behavior |
| `templates/recommendations.md` | EXISTS | Machine-readable category/tool format with install commands |
| `templates/ideation-brief.md` | MISSING — create in v1.2 | Needs: diverge phase section (HMW questions, raw ideas log), converge section (ranked concepts, scoring rationale, selected direction), tool/MCP recommendations section |

### Build Orchestrator Expansion

The existing `workflows/build.md` pipeline expands from 7 to 12 stages:

```
ideate → competitive → opportunity → brief → system → flows → wireframe →
critique(+HIG light) → iterate → mockup → HIG(full) → handoff
```

The orchestrator reads `designCoverage` from the manifest. Adding five new boolean flags to `designCoverage` is the only structural change to the manifest schema. The Stage loop logic in build.md is generic and requires only the stage table to be extended.

### Dual-Mode HIG Audit Architecture

| Mode | Trigger | Depth | Output | WCAG Criteria Coverage |
|------|---------|-------|--------|----------------------|
| Light check | `--hig-light` flag (from /pde:critique) | Critical perceivable + operable (~15 criteria) | Findings folded into CRT report, no separate HIG artifact | 1.1.1, 1.3.1, 1.4.1, 1.4.3, 1.4.4, 2.1.1, 2.4.3, 2.4.7, 3.3.1, 3.3.2, plus 2.2 additions (2.5.8, 3.3.8) |
| Full audit | Direct `/pde:hig` or build pipeline pre-handoff gate | All ~56 WCAG 2.2 A/AA criteria + HIG platform checklist | HIG-audit-v{N}.md, sets hasHig: true | All criteria in wcag-baseline.md |

Axe a11y-mcp (automated scan) runs in full mode only — too expensive for the light check. Light mode uses only Claude's evaluation against the wcag-baseline.md reference.

### Apple Liquid Glass (iOS 26) Impact on HIG Skill

Apple announced the Liquid Glass design language at WWDC June 2025. It ships with iOS 26, iPadOS 26, macOS Tahoe 26, watchOS 26, tvOS 26. It is the most significant visual redesign since iOS 7.

**Impact on /pde:hig:**
- The existing `references/ios-hig.md` needs a new Liquid Glass section added (materials, translucency, refraction, motion-responsiveness, light/dark adaptation behavior)
- HIG audit for iOS/iPadOS/macOS 26+ projects should check Liquid Glass adoption in navigation bars, tab bars, sheets, and popups
- This is a reference file addition, NOT a new npm package or tool

**Impact on /pde:mockup:**
- When `references/mockup-patterns.md` is written, it should include a CSS approximation for Liquid Glass using `backdrop-filter: blur()` + `background: rgba()` for preview purposes (the real GPU-rendered material is native-only)

**WCAG 2.2 Status Change:**
WCAG 2.2 became ISO/IEC 40500:2025 in October 2025 — it is now an official international standard. The `/pde:hig` skill should reference WCAG 2.2 as the authoritative standard for all new audits (not WCAG 2.1).

---

## v1.3 Stack: Self-Improvement and Design Excellence

### The Core Finding: Still No New npm Dependencies (But New Reference Architecture)

All four capability pillars (tool audit framework, skill builder, design quality elevation, pressure testing) follow the same LLM-as-actor, file-as-state, pde-tools-as-CLI pattern. The constraint is explicit: zero npm deps in the plugin itself.

The major stack additions for v1.3 are:
1. New reference files encoding Awwwards-level design standards
2. New pde-tools.cjs commands for audit scoring and quality checks
3. New skill templates for skill generation (meta-programming pattern)
4. New agent templates for the self-improvement fleet
5. Evaluation methodology for pressure testing (markdown-based, no test runner)

### Capability 1: Tool Audit Framework

**What it is:** A structured audit of PDE's own tooling (skills, agents, templates, references, CLI commands, MCP integrations) measured against a quality rubric.

**Pattern:** Claude reads the audit rubric reference, evaluates each tool category against it, writes findings to a structured report. No new technology — all existing Read/Write tools plus the quality rubric encoded in a reference file.

**Stack additions:**

| File | Type | Purpose |
|------|------|---------|
| `references/audit-rubric.md` | Reference | Quality scoring criteria for PDE tools: skill prompt quality, agent role specificity, template coverage, reference completeness, CLI command ergonomics. 8-dimension rubric adapted from Claude Code setup scoring patterns. |
| `templates/audit-report.md` | Template | Structured output format for tool audit findings: dimension scores, evidence citations, improvement recommendations, priority ordering |
| `commands/audit-tools.md` | Skill | /pde:audit-tools skill — runs Claude-as-auditor against the rubric, produces audit-report artifact |

**Quality rubric dimensions (no new technology — pure LLM judgment against reference criteria):**

Adapted from the 8-dimension Claude Code setup scoring framework (0-3 scale per dimension, 24 points max):
1. Skill prompt quality — specificity, anti-pattern coverage, example completeness
2. Agent role design — specialization clarity, tool permission minimalism
3. Template fidelity — structural completeness, field coverage, example inclusion
4. Reference completeness — domain coverage, depth vs. breadth balance, currency
5. CLI ergonomics — command naming, error messages, output format consistency
6. MCP integration — probe/use/degrade pattern compliance, graceful fallback
7. Pipeline coherence — artifact handoff completeness, coverage flag accuracy
8. Output quality — design artifacts measured against Awwwards rubric (v1.3 new)

**Confidence: HIGH** -- Pattern directly analogous to claude-code-excellence-audit skill and /refine tool. No novel technology required.

### Capability 2: Skill Builder

**What it is:** A meta-skill that generates, improves, or validates PDE skills and user project skills, using Anthropic's official skill-creator pattern as the model.

**Pattern:** The official Anthropic skill-creator (github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) establishes the canonical approach: interview to capture intent, write SKILL.md draft, create test cases, run with-skill vs. baseline comparison, grade outputs, iterate until quality threshold met, optimize description for triggering accuracy.

PDE's /pde:skill-builder adapts this for PDE's file-based ecosystem: generates commands/*.md files (not SKILL.md — PDE uses the commands/ directory pattern), creates test fixtures in .planning/design/tests/, and evaluates against domain-appropriate quality criteria.

**Stack additions:**

| File | Type | Purpose |
|------|------|---------|
| `commands/skill-builder.md` | Skill | /pde:skill-builder — generates/improves PDE skills. Follows Anthropic official skill-creator pattern: interview → draft → test cases → evaluate → iterate |
| `references/skill-style-guide.md` | Reference | Already exists. Extend with: skill generation patterns, description optimization principles, evaluation criteria for skill quality, common YAML frontmatter mistakes |
| `templates/skill-test-fixture.md` | Template | Test case format for skill evaluation: input prompt, expected behavior, assertions, baseline comparison notes |

**Key design decision: skill generation is text generation.** The skill builder writes Markdown files with YAML frontmatter — no code generation, no AST manipulation, no templating engine. Claude writes the skill file directly as text output. This is identical to how Claude writes HTML wireframes and TypeScript interfaces.

**Key constraint: Skills can generate other skills but cannot modify themselves.** The meta-programming pattern from community research confirms this: each skill is self-contained, and generation happens by writing new files, not by patching the running skill.

**Evaluation pattern (zero external tools):**

```
For each skill under evaluation:
1. Spawn subagent WITH the skill for test prompt N
2. Spawn subagent WITHOUT the skill for same test prompt N (baseline)
3. Write outputs to .planning/design/tests/skill-name/with-skill/ and /without-skill/
4. Grade outputs against assertions in skill-test-fixture.md
5. Write benchmark.md with scores, timing, evidence
6. Iterate until benchmark score exceeds threshold
```

This mirrors Anthropic's official skill-creator workspace pattern. No external eval framework needed.

**Confidence: HIGH** -- Pattern directly derived from Anthropic's official skill-creator SKILL.md (github.com/anthropics/skills). File-based evaluation requires zero new technology.

### Capability 3: Design Quality Elevation (Awwwards Level)

**What it is:** Upgrade the design pipeline's output quality from "functional defaults" to Awwwards-caliber: typography systems that use fluid modular scales, color systems with perceptual uniformity, motion design with purpose and timing, composition with visual hierarchy.

**The core stack insight:** Awwwards-level quality is achieved entirely through improved reference content and prompt engineering — not new tools. The LLM already knows how to produce excellent design. The bottleneck is the quality of the reference files guiding it.

**Awwwards scoring criteria (verified from official judging documentation):**
- Design (40%): visual hierarchy, typography, color palette intentionality, micro-details, design system consistency
- Usability (30%): navigation clarity, Core Web Vitals targets (LCP < 1.5s, CLS < 0.05, INP < 100ms)
- Creativity (20%): custom interaction patterns, signature moments, scroll-as-narrative
- Content (10%): real content quality, copy-design integration

**Design techniques in winning sites (verified from Awwwards, Codrops, Utsubo sources):**
- Variable fonts with weight/width axis animation
- Fluid type scales using CSS `clamp()` with modular ratios (Perfect Fourth 1.333 for marketing, Major Third 1.250 for SaaS)
- OKLCH color space for perceptually uniform gradients (already in PDE's token system — extend depth)
- CSS scroll-driven animations via `animation-timeline: scroll()` for Chromium-first sites
- GSAP 3.14.x + ScrollTrigger + Lenis for cross-browser scroll animation (browser baseline: not yet universal for CSS-only)
- CSS `@property` typed custom properties for animatable design tokens (Baseline 2024: all modern browsers)
- `backdrop-filter` glassmorphism effects (already in mockup-patterns.md for Liquid Glass)
- One "signature moment" per page — a single interaction that creates pause

**Stack additions for design quality elevation:**

| File | Type | Purpose |
|------|------|---------|
| `references/awwwards-rubric.md` | Reference (NEW) | Awwwards judging criteria encoded as a scoring rubric PDE uses to evaluate its own design output. Four dimensions (Design 40%, Usability 30%, Creativity 20%, Content 10%), each with observable criteria Claude can check. The 8th dimension in audit-rubric.md points to this file. |
| `references/motion-design.md` | Reference (NEW) | Motion design standards for web: purpose-driven animation (not decorative), easing curves and duration scales, prefers-reduced-motion handling, scroll-narrative patterns, micro-interaction timing (hover: 150ms, page transitions: 300-500ms), GSAP vs CSS-only decision tree |
| `references/composition.md` | Reference (NEW) | Visual composition principles: golden ratio grid, rule of thirds, negative space usage, visual weight distribution, contrast-as-hierarchy, z-depth systems. Includes Awwwards-specific patterns: oversized type heroes, full-bleed imagery, asymmetric layouts |
| `references/typography.md` | Reference (EXTEND) | Already has modular scale algorithms. Add: fluid type with CSS clamp() formulas, variable font axis guidance, line-height/letter-spacing scale for each ratio, Awwwards-caliber type pairing principles, optical sizing |
| `references/color-systems.md` | Reference (EXTEND) | Already exists. Add: OKLCH gradient techniques for perceptual uniformity, color harmony systems (analogous/split-complementary for modern web), dark mode palette generation from OKLCH, P3 wide-gamut extension tokens |
| `references/web-modern-css.md` | Reference (EXTEND) | Already covers cascade layers, container queries, CSS nesting. Add: CSS `@property` typed custom property patterns for animatable tokens, `animation-timeline: scroll()` usage with progressive enhancement, `view-transition-name` for SPA-like transitions |

**No new npm packages for design quality elevation.** The technique improvements are conveyed through richer reference content. Claude generates the CSS, the LLM already knows GSAP syntax — what's needed is reference files that instruct PDE to produce Awwwards-caliber output, not tools to generate it mechanically.

**On GSAP inclusion in mockup output:** GSAP 3.14.x is now fully free for commercial use (all plugins included, no Club GSAP required). When /pde:mockup generates hi-fi interactive HTML, it MAY include GSAP via CDN `https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js` for scroll animations. This is a runtime dependency of the generated output artifact (the mockup HTML), NOT of the PDE tooling itself. The zero-dep constraint applies to the plugin — not to the HTML it generates.

**Confidence: HIGH** -- Awwwards criteria verified from Utsubo official guide. GSAP 3.14.x free license confirmed from npm/gsap. CSS @property Baseline 2024 confirmed from web.dev. CSS scroll-driven animations confirmed NOT Baseline (Chromium-only); GSAP+Lenis is the cross-browser recommendation. [Sources: Awwwards, web.dev, gsap.com]

### Capability 4: Pressure Testing Framework

**What it is:** End-to-end validation of the full 13-stage PDE pipeline on a real project, measured against professional design standards. Pressure testing validates that all stages work together, handoff artifacts are correct, and the output quality meets Awwwards-level criteria.

**Pattern:** PDE's existing validation framework (templates/VALIDATION.md, verify-phase.md, verify-work.md) provides the structural model. Pressure testing extends it with: multi-stage sequencing, cross-artifact dependency checking, design quality scoring against the awwwards-rubric.md, and regression detection between pipeline runs.

**Key finding: No external test runner.** LLM behavior is probabilistic — standard assertion-based testing (Jest, Vitest) cannot meaningfully test whether Claude's design output is "good." The right approach is LLM-as-judge: Claude evaluates its own pipeline output against explicit quality rubrics in reference files. This is the same "LLM-as-judge" pattern confirmed by Confident AI, Langfuse, and other evaluation research.

**Stack additions for pressure testing:**

| File | Type | Purpose |
|------|------|---------|
| `commands/pressure-test.md` | Skill (NEW) | /pde:pressure-test — runs the full pipeline on a test project seed, captures all artifacts, runs quality evaluation pass on each artifact, produces a structured test report |
| `templates/pressure-test-report.md` | Template (NEW) | Structured output: pipeline run summary, artifact inventory, per-stage quality score, cross-artifact dependency validation results, Awwwards rubric score for design output, regression notes vs. previous run |
| `templates/test-project-seed.md` | Template (NEW) | Minimal project definition for pressure testing: product name, one-paragraph description, target platform (web/iOS/Android), user persona sketch. Thin enough to run quickly; rich enough to exercise all pipeline stages |
| `.planning/design/tests/` | Directory convention | Where skill evaluation workspaces and pressure test artifacts land. Already implied by skill-builder pattern; formalize as convention |

**Pressure test evaluation methodology:**

```
Stage 1: Run pipeline
  /pde:build --from ideate on test project seed → capture all 13 artifact outputs

Stage 2: Artifact completeness check
  For each expected artifact code (IDT, CMP, OPP, BRF, SYS, FLW, WFR, CRT, ITR, MCK, HIG, HND):
  - Does the artifact file exist?
  - Does the artifact contain required sections (from template schema)?
  - Does the coverage flag in design-manifest.json match file existence?

Stage 3: Quality scoring
  For design artifacts (SYS, WFR, MCK, HND):
  - Score against awwwards-rubric.md dimensions
  - Flag token system for: modular scale present, OKLCH color space, motion tokens
  - Flag wireframes for: hierarchy clarity, spacing system use, accessible contrast
  - Flag mockups for: signature moment present, animation purposefulness, responsive handling

Stage 4: Cross-artifact coherence check
  - Do component names in HND match component names introduced in WFR?
  - Do color tokens in SYS appear in MCK output?
  - Does IDT concept direction match BRF product vision?

Stage 5: Write pressure-test-report.md
  - Pass/fail per stage, per artifact, per quality criterion
  - Evidence (quoted from artifact content)
  - Regression notes (compare to previous run if exists)
```

**Confidence: HIGH** -- LLM-as-judge evaluation methodology confirmed from multiple sources (Confident AI, Langfuse, Anthropic skill-creator). File-based evaluation requires zero new technology. Pattern is consistent with existing PDE validation architecture.

### Summary: What v1.3 Actually Adds to the Stack

| Addition | Type | Why |
|----------|------|-----|
| `references/awwwards-rubric.md` | New reference file | Encodes Awwwards judging criteria as observable rubric Claude evaluates against |
| `references/motion-design.md` | New reference file | Motion standards for web: purpose, timing, easing, reduced-motion, GSAP vs CSS guidance |
| `references/composition.md` | New reference file | Visual composition principles: golden ratio, visual weight, negative space, Awwwards patterns |
| `references/audit-rubric.md` | New reference file | 8-dimension PDE tool quality rubric (skill prompts, agents, templates, references, CLI, MCP, pipeline, design) |
| `references/typography.md` | Extend existing | Add fluid type clamp() formulas, variable font axes, optical sizing |
| `references/color-systems.md` | Extend existing | Add OKLCH gradient techniques, dark mode generation, P3 tokens |
| `references/web-modern-css.md` | Extend existing | Add @property typed tokens, animation-timeline scroll(), view-transition-name |
| `references/skill-style-guide.md` | Extend existing | Add generation patterns, evaluation criteria, description optimization |
| `commands/audit-tools.md` | New skill | /pde:audit-tools — runs the 8-dimension PDE self-audit |
| `commands/skill-builder.md` | New skill | /pde:skill-builder — generates and evaluates PDE skills |
| `commands/pressure-test.md` | New skill | /pde:pressure-test — full pipeline E2E validation on test seed |
| `templates/audit-report.md` | New template | Structured audit findings output |
| `templates/skill-test-fixture.md` | New template | Test case format for skill evaluation |
| `templates/pressure-test-report.md` | New template | E2E test results format |
| `templates/test-project-seed.md` | New template | Minimal project definition for pipeline testing |
| pde-tools.cjs: `audit score-dimension` | New CLI command | Compute numeric score for an audit dimension, write to report JSON |
| pde-tools.cjs: `audit compare-runs` | New CLI command | Diff two pressure-test-report.md files for regression detection |
| pde-tools.cjs: `design contrast-check` | New CLI command | WCAG 2.2 AA contrast ratio calculation for OKLCH color pairs using inline math (no npm dep) |

**npm packages added in v1.3: ZERO.** The zero-dependency constraint holds.

**GSAP in generated mockups: CDN reference only.** When /pde:mockup generates hi-fi HTML artifacts that include scroll animation, it includes `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js">` as a runtime CDN reference in the generated HTML. This is not a plugin dependency.

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

### v1.2 Advanced Design Skills (No new npm dependencies either)

```
# Same as v1.1 — zero new npm dependencies.
# MCP servers are user-installed once via /pde:setup:
#   claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
#   claude mcp add a11y -- npx a11y-mcp
#   claude mcp add playwright -- npx @playwright/mcp@latest
#   claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
# These are already in mcp-integration.md. /pde:setup handles the install flow.
```

### v1.3 Self-Improvement and Design Excellence (No new npm dependencies)

```
# v1.3 adds zero new npm packages.
# All additions are reference files, templates, skill files, and pde-tools.cjs extensions.
# No new MCP servers required — all seven existing MCP servers cover v1.3 capabilities.
node --version  # verify >= 20.0.0 (unchanged)
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
| Node.js built-in https for MCP registry | axios or node-fetch | Never — zero-dep philosophy; built-in https handles unauthenticated GET with cursor pagination trivially |
| a11y-mcp (free, MPL-2.0) | Deque axe-mcp-server (paid) | Only if Deque's paid Axe DevTools subscription is already active — same engine underneath |
| LLM-as-judge for pressure testing | promptfoo, DeepEval, Langfuse | If PDE grows to need CI/CD integration with external evaluation infrastructure. For now, file-based LLM-as-judge suffices and requires zero external services |
| Reference file quality rubrics | External scoring APIs (VisualEyes, Applitools) | If PDE integrates browser-based visual regression testing (post-v1.3 scope) |
| CSS @property for animatable tokens | Houdini Paint API | When procedural background effects (noise, patterns) are needed — @property covers animatable values, Paint API covers procedural draws |
| GSAP via CDN in generated mockups | CSS scroll-driven animations only | For Chromium-only target sites where CSS scroll-driven animations are acceptable; GSAP+Lenis is still recommended for production cross-browser |
| Inline OKLCH contrast math in pde-tools.cjs | apca-w3 npm package | If APCA (not WCAG 2.2 WCAG contrast) becomes normative standard — WCAG 3.0 still Working Draft as of March 2026; defer APCA until normative |

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
| TypeScript for pde-tools.cjs | Out of scope for v1.3; rewriting is a risk; CJS works fine for the 651-line file | Keep CJS JavaScript; TypeScript appropriate for new MCP server code only |
| npm package dependencies in the plugin | Plugin consumers should not need npm install; zero-dep is a feature | Node.js built-ins only |
| ESM for the core tools binary | Invoked via node file.cjs; ESM breaks this invocation pattern | CommonJS with .cjs extension |
| Commander 15+ | ESM-only; requires Node 22.12+; incompatible with CJS codebase | Commander 14.x |
| @modelcontextprotocol/sdk v2.x | Not yet stable as of 2026-03-15 | v1.27.1 |
| node-fetch | Built into Node 18+; unnecessary dep | fetch (built-in) |
| Deque axe-mcp-server | Requires paid Axe DevTools subscription; same axe-core engine as free a11y-mcp | a11y-mcp@1.0.4 (free, MPL-2.0) |
| External competitive intelligence APIs (Crunchbase, SimilarWeb) | Requires API keys, external services; conflicts with PDE's no-auth design constraint | Claude training knowledge + Brave Search (existing websearch command in pde-tools.cjs) |
| React/Vue components from /pde:mockup | Mockup outputs are HTML/CSS previews; framework components are /pde:handoff's domain | Plain HTML + CSS with state classes |
| WCAG 3.0 / APCA contrast targets | WCAG 3.0 is Working Draft only; APCA not yet normative | WCAG 2.2 Level AA (now ISO/IEC 40500:2025) |
| CSS preprocessors (Sass/Less) in mockup output | No build pipeline in PDE; file:// compatibility requires inline CSS | Native CSS custom properties + CSS nesting (baseline 2023, all modern browsers) |
| CSS scroll-driven animations as sole cross-browser approach | Not Baseline — not supported in Firefox as of March 2026; progressive enhancement only | CSS scroll-driven with GSAP+Lenis fallback; or GSAP+ScrollTrigger as default for mockups |
| promptfoo / DeepEval / Langfuse for v1.3 pressure testing | Requires external service setup, cloud accounts, or complex configuration; LLM-as-judge with reference rubrics achieves same result with zero setup | LLM-as-judge via structured rubric reference files, outputs to markdown report |
| VisualEyes / Applitools for design scoring | Browser-based pixel comparison tools; measure regression, not design quality; require cloud accounts | Awwwards rubric encoded in reference file, scored by Claude against artifact content |
| Self-recursive skill modification | A skill cannot safely modify itself (circular dependency, no isolation); confirmed by community meta-plugin research | Skills generate OTHER skills via Write tool; each skill is self-contained |
| External LLM evaluation models (GPT-4 as judge) | PDE uses Claude exclusively; adding OpenAI dependency contradicts single-provider simplicity | Claude self-evaluates using rubric reference files — LLM-as-same-model-judge is sufficient |

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

**If ideation is run standalone (not via /pde:build):**
- Outputs IDT-ideation-v{N}.md to .planning/design/strategy/
- Sets hasIdeation: true in manifest
- Does not depend on any prior artifacts — first stage in the full pipeline

**If hig runs in light mode (from /pde:critique):**
- Receives --hig-light flag
- Skips axe-core full audit (too expensive for mid-pipeline check)
- Evaluates ~15 critical WCAG criteria from wcag-baseline.md via Claude directly
- Findings folded into CRT report; no separate HIG artifact created

**If hig runs in full mode (standalone or build gate):**
- Evaluates all ~56 WCAG 2.2 A/AA criteria
- Probes axe-core via a11y-mcp for automated violations on HTML artifacts
- Writes HIG-audit-v{N}.md, sets hasHig: true in manifest

**If recommend runs without a STACK.md:**
- Cannot detect project tech stack for targeted recommendations
- Falls back to generic product-type-based recommendations (web/mobile/other)
- Warns user to run /pde:setup or create STACK.md first

**If /pde:audit-tools is run (v1.3):**
- Claude loads audit-rubric.md reference
- Reads all skills in commands/, all agents, all templates, all references, all pde-tools.cjs commands
- Scores each dimension 0-3 with evidence citations
- Writes audit-report to .planning/design/review/audit-report-v{N}.md
- Produces a prioritized improvement backlog

**If /pde:skill-builder is creating a new skill (v1.3):**
- Interview phase: ask what the skill should do, when it should trigger, what tools it needs
- Draft phase: write commands/{name}.md with YAML frontmatter and instruction body
- Test phase: generate 3-5 test fixtures in .planning/design/tests/{name}/
- Evaluate phase: spawn subagents with and without skill, grade outputs against assertions
- Optimize phase: refine skill description for triggering accuracy
- Confirm phase: write final skill file, update skill-registry.md

**If /pde:pressure-test is run on a seed project (v1.3):**
- Load or create test-project-seed.md
- Run /pde:build --from ideate in test context
- Capture all 13 artifact outputs
- Run completeness check, quality scoring, cross-artifact coherence check
- Write pressure-test-report.md
- Compare to previous run if exists (pde-tools.cjs audit compare-runs)

**If a generated mockup needs Awwwards-level animation (v1.3):**
- Reference motion-design.md for timing and easing standards
- Include GSAP via CDN in mockup HTML (not a plugin dependency)
- Use CSS @property for animatable token values where appropriate
- Apply scroll-driven narrative via GSAP ScrollTrigger + Lenis for cross-browser compatibility
- Gate CSS-only scroll animations behind @supports (animation-timeline: scroll()) for progressive enhancement

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
| a11y-mcp@1.0.4 | axe-core@4.11.1 | a11y-mcp pins axe-core internally; no separate axe-core install needed |
| @playwright/mcp@latest | @playwright/test@1.50+ | Playwright MCP installs browser binaries on first use via npx playwright install |
| @modelcontextprotocol/server-sequential-thinking@2025.12.18 | Node.js 18+ | Used via stdio MCP; no version lock needed beyond Node.js 18+ |
| @upstash/context7-mcp@2.1.4 | Node.js 18+ | Used via npx; version auto-resolved at install time |
| MCP Registry API v0/ | Node.js built-in https | API freeze at v0.1 since Sept 2025; stable for integration without auth |
| Apple HIG Liquid Glass | iOS 26+ / macOS Tahoe+ only | Gate Liquid Glass audit criteria on platform target being iOS/iPadOS/macOS 26+ |
| GSAP 3.14.x | CDN via jsDelivr | 100% free including all plugins; no Club GSAP required; CDN reference in generated HTML only |
| CSS @property | Baseline 2024 (all modern browsers) | Chrome, Edge, Firefox, Safari — no progressive enhancement needed for typed tokens |
| CSS scroll-driven animations (animation-timeline) | NOT Baseline (Chromium-only as of March 2026) | Chrome/Edge only; use GSAP+Lenis as default for cross-browser |
| CSS view transitions (view-transition-name) | Baseline 2024 (most modern browsers) | Chrome, Edge, Safari — progressively enhance; Firefox partial support |
| OKLCH color space | Baseline 2023 (all modern browsers) | Already in PDE token system; safe to use as primary color format |
| CSS container queries | Baseline 2023 (all modern browsers) | Already in web-modern-css.md; safe for responsive component design |

---

## Sources

- Official Claude Code docs (code.claude.com/docs/en/skills) -- Skills format, SKILL.md frontmatter fields, invocation control [HIGH confidence]
- Official Claude Code docs (code.claude.com/docs/en/plugins) -- Plugin structure, plugin.json manifest, directory layout [HIGH confidence]
- Official Claude Code docs (code.claude.com/docs/en/sub-agents) -- Subagent frontmatter, model aliases, tools field [HIGH confidence]
- PDE source code (direct read of bin/pde-tools.cjs, bin/lib/*.cjs, commands/, workflows/, references/, templates/) -- Zero-dependency Node.js pattern, built-in fetch, CJS format, existing template coverage [HIGH confidence]
- designtokens.org/tr/drafts/format/ -- DTCG 2025.10 stable spec, $value/$type format [HIGH confidence]
- [MCP Registry API Nordic APIs guide](https://nordicapis.com/getting-started-with-the-official-mcp-registry-api/) -- /v0/servers endpoint, ?search=, ?limit=, cursor pagination, unauthenticated GET, JSON schema [HIGH confidence]
- [Official MCP Registry](https://registry.modelcontextprotocol.io/) -- Launched Sept 2025, v0.1 API freeze [HIGH confidence]
- [a11y-mcp GitHub](https://github.com/priyankark/a11y-mcp) -- Free, MPL-2.0, wraps axe-core 4.11.1 [HIGH confidence]
- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp) -- Microsoft official, snapshot + screenshot modes, accessibility tree [HIGH confidence]
- [Apple Liquid Glass announcement](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) -- iOS 26 design language confirmed [HIGH confidence]
- [WCAG 2.2 ISO standard](https://adaquickscan.com/blog/wcag-2-2-iso-standard-2025) -- WCAG 2.2 = ISO/IEC 40500:2025 (October 2025) [HIGH confidence]
- npm registry WebSearch (2026-03-16): a11y-mcp@1.0.4, @modelcontextprotocol/server-sequential-thinking@2025.12.18, @upstash/context7-mcp@2.1.4 [MEDIUM confidence — WebSearch only; direct npmjs.com fetch returned 403]
- github.com/mermaid-js/mermaid issues #3590, #4148 -- Mermaid 10+ ESM-only confirmed [HIGH confidence]
- styledictionary.com/versions/v4/migration/ -- Style Dictionary v4+ ESM-only confirmed [HIGH confidence]
- [Anthropic official skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) -- Canonical skill generation pattern: interview → draft → test cases → with/without comparison → grade → iterate → description optimization [HIGH confidence]
- [Claude Code Skills deep dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) -- SKILL.md architecture, frontmatter fields, context injection, meta-tool system [HIGH confidence]
- [Nick Winder meta-plugin](https://www.nickwinder.com/blog/claude-code-meta-plugin) -- Meta-programming pattern: skills generate other skills, self-modification constraint, knowledge accumulation loop [MEDIUM confidence — blog post, community pattern]
- [Awwwards judging criteria](https://www.utsubo.com/blog/award-winning-website-design-guide) -- 4-dimension scoring: Design 40%, Usability 30%, Creativity 20%, Content 10%; Core Web Vitals targets [HIGH confidence]
- [GSAP 3.14.x license and CDN](https://gsap.com/docs/v3/Installation/) -- All plugins free including SplitText, MorphSVG; CDN via jsDelivr at cdn.jsdelivr.net/npm/gsap@3.14 [HIGH confidence]
- [CSS @property Baseline 2024](https://web.dev/blog/at-property-baseline) -- Universal browser support since July 2024 [HIGH confidence]
- [CSS scroll-driven animations MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations) -- Not Baseline; Chromium-only as of March 2026 [HIGH confidence]
- [GSAP + Lenis cross-browser](https://darkroomengineering.github.io/lenis/) -- Recommended combo for cross-browser smooth scroll animations [MEDIUM confidence — community pattern]
- [Dave Inside /refine 8-dimension rubric](https://daveinside.com/blog/scoring-and-improving-your-claude-code-setup-across-8-dimensions/) -- 8-dimension Claude Code setup scoring: CLAUDE.md quality, workflow, skills coverage, agent architecture, hooks, tool integration, guard rails, context efficiency [HIGH confidence]
- [LLM-as-judge evaluation methodology](https://langfuse.com/blog/2025-10-21-testing-llm-applications) -- Confirmed pattern for evaluating probabilistic LLM outputs; golden datasets and structured assertions [HIGH confidence]
- [Fluid type scale CSS clamp](https://www.fluid-type-scale.com/) -- CSS clamp() fluid typography formula; modular scale ratios for design system use [HIGH confidence]

---

*Stack research for: AI-powered product development platform (PDE), v1.3 Self-Improvement and Design Excellence additions*
*Researched: 2026-03-17*

---

## v0.5 Stack: MCP Server Integrations

### The Core Question: How Do MCP Integrations Fit the Plugin?

PDE is a Claude Code plugin with a zero-npm-dependency constraint for its own tooling. v0.5 MCP integrations are NOT adding dependencies to the plugin itself — they are adding two things:

1. **References to external MCP servers** users configure once (GitHub, Linear, Figma, Jira, Pencil) — already the model used for sequential-thinking, Playwright, etc.
2. **New skills and workflows** that detect available MCP servers and use them when present (probe/use/degrade pattern, already established in v1.2).

The zero-dependency constraint holds. No npm packages added to the PDE plugin itself.

**The one genuine new dependency question:** Should PDE expose its own MCP server (a `pde-as-server` implementation)? This requires `@modelcontextprotocol/sdk` as a plugin dependency. Answer: Implement using `claude mcp serve` (built-in Claude Code feature) first; if custom tools are needed, only then introduce the SDK. See the PDE-as-MCP-server section below.

### External MCP Servers: The Five Integrations

#### GitHub MCP Server

| Attribute | Value |
|-----------|-------|
| Provider | GitHub (official) |
| Transport | Streamable HTTP (remote) |
| URL | `https://api.githubcopilot.com/mcp/` |
| Auth | OAuth 2.0 (auto via Claude Code) or PAT via `Authorization: Bearer <token>` header |
| Claude Code install | `claude mcp add --transport http github https://api.githubcopilot.com/mcp/` |
| Key toolsets | `repos`, `issues`, `pull_requests`, `actions`, `code_security` |
| Source | github/github-mcp-server (official GitHub repo) [HIGH confidence] |

**Why GitHub remote HTTP over npm package:** GitHub's remote endpoint is always current, requires no npm install or process management. The npm package `@modelcontextprotocol/server-github` is community-maintained and lags behind the official endpoint.

**PDE integration points:**
- `/pde:execute-phase` — create GitHub issues for each task, link PRs to phase
- `/pde:verify-phase` — check CI status, pull review feedback into verification report
- `/pde:new-milestone` — create milestone on GitHub repo, auto-link phases

#### Linear MCP Server

| Attribute | Value |
|-----------|-------|
| Provider | Linear (official, hosted) |
| Transport | Streamable HTTP |
| URL | `https://mcp.linear.app/mcp` |
| Auth | OAuth 2.1 with dynamic client registration (auto via Claude Code `/mcp`) OR Bearer token |
| Claude Code install | `claude mcp add --transport http linear https://mcp.linear.app/mcp` |
| Key tools | find/create/update issues, projects, comments, teams |
| Source | linear.app/docs/mcp (official Linear docs) [HIGH confidence] |

**Why Linear over Jira (default recommendation):** Linear's MCP is official and hosted by Linear itself. Streamable HTTP over OAuth 2.1 — the modern standard. Jira's official server (Atlassian Rovo) exists but requires a paid Atlassian Cloud account; Linear is more common in early-stage projects. **Recommend Linear as primary; Jira as alternative for enterprises.**

**PDE integration points:**
- `/pde:new-project` — create Linear project, link issues to roadmap phases
- `/pde:execute-phase` — sync task completion status to Linear issues
- `/pde:discuss-phase` — pull existing Linear issues for context

#### Jira / Atlassian MCP Server (Enterprise Alternative)

| Attribute | Value |
|-----------|-------|
| Provider | Atlassian (official Rovo MCP Server) |
| Transport | SSE (legacy) |
| URL | `https://mcp.atlassian.com/v1/sse` |
| Auth | OAuth 2.1 (browser flow via `/mcp`) |
| Claude Code install | `claude mcp add --transport sse jira https://mcp.atlassian.com/v1/sse` |
| Covers | Jira, Confluence, Compass |
| Source | support.atlassian.com Rovo MCP Server docs [HIGH confidence] |

**Warning:** Atlassian's server uses SSE transport (deprecated in Claude Code). This works but is flagged as legacy. Monitor for an official Streamable HTTP endpoint. Use the community `mcp-atlassian` (Python) as a fallback if SSE causes issues.

**PDE integration points:** Same as Linear — phase-to-issue sync, status tracking, requirements pull.

#### Figma MCP Server

| Attribute | Value |
|-----------|-------|
| Provider | Figma (official, hosted) |
| Transport | Streamable HTTP (remote) |
| URL | `https://mcp.figma.com/mcp` |
| Auth | OAuth 2.0 (browser flow via `/mcp`, automatic) |
| Claude Code install | `claude mcp add --transport http figma https://mcp.figma.com/mcp` |
| Key tools | Get frame/component data, extract design variables, generate code from selection |
| Also available | Desktop MCP Server (runs locally via Figma app) |
| Source | developers.figma.com/docs/figma-mcp-server [HIGH confidence] |

**Why remote over desktop:** The remote server works without Figma Desktop installed, which is essential for CI/cloud contexts. The desktop server requires the Figma app running.

**PDE integration points:**
- `/pde:system` — pull design tokens from existing Figma file as seed (alternative to generating from scratch)
- `/pde:wireframe` — reference existing Figma frames for fidelity guidance
- `/pde:handoff` — extract component specs from Figma to supplement generated handoff doc

#### Pencil MCP Server (Visual Canvas)

| Attribute | Value |
|-----------|-------|
| Provider | pencil.dev |
| Transport | stdio (local, auto-started by Pencil app) |
| Package | `@anthropic-ai/pencil-mcp` (or auto-started when Pencil app runs) |
| Auth | None (local process) |
| Requirements | Pencil app installed (VS Code/Cursor extension); not available standalone |
| Key tools | `get_editor_state`, `open_document`, `get_guidelines`, `get_style_guide_tags`, `get_style_guide`, `batch_design`, `batch_get`, `get_screenshot`, `snapshot_layout`, `get/set_variables` |
| File format | `.pen` files (JSON-based, git-diffable) |
| Source | docs.pencil.dev, project_pencil_mcp.md memory [MEDIUM confidence — tool names from pencil.dev docs, transport via community sources] |

**Critical constraint: Pencil requires VS Code or Cursor.** Claude Code standalone cannot start the Pencil MCP server. Use probe/degrade: detect Pencil MCP availability first; skip Pencil-specific steps if unavailable.

**PDE integration points (Level 1 — validate before Level 2):**
- `/pde:recommend` — add Pencil to tool catalog for frontend projects
- `/pde:wireframe` — detect Pencil, optionally output `.pen` files alongside HTML using `batch_design`
- `/pde:mockup` — use `get_screenshot` for visual verification in critique pass
- `/pde:system` — sync DTCG tokens with Pencil variables via `get/set_variables`

**Level 2 (defer):** Native `.pen` pipeline stage — only after Level 1 integration is validated.

### MCP Connection Infrastructure

#### Configuration Pattern: Plugin `.mcp.json`

Claude Code plugins can bundle MCP server configurations in `.mcp.json` at the plugin root. When the plugin is enabled, its MCP servers start automatically. This is the correct pattern for PDE: include suggested MCP server configurations users can activate.

**Format (`.mcp.json` at plugin root):**
```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "linear": {
      "type": "http",
      "url": "https://mcp.linear.app/mcp"
    },
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    },
    "jira": {
      "type": "sse",
      "url": "https://mcp.atlassian.com/v1/sse"
    }
  }
}
```

**Important:** Project-scoped `.mcp.json` (checked into version control) requires user approval before first use. This is a security feature, not a bug. PDE should document this in `/pde:setup` and in GETTING-STARTED.md.

#### Authentication Scope Decision

| Server | Auth Method | Token Storage | Claude Code Flow |
|--------|-------------|---------------|-----------------|
| GitHub | OAuth 2.0 | System keychain (macOS) | `claude mcp add` then `/mcp` to authenticate |
| Linear | OAuth 2.1 | System keychain | `claude mcp add` then `/mcp` to authenticate |
| Figma | OAuth 2.0 | System keychain | `claude mcp add` then `/mcp` to authenticate |
| Jira | OAuth 2.1 | System keychain | `claude mcp add` then `/mcp` to authenticate |
| Pencil | None (local) | N/A | Auto-started by Pencil app |

Tokens are stored in the OS keychain by Claude Code automatically — PDE does not manage auth tokens. This is correct. PDE's role is to document the one-time setup flow, not to store credentials.

#### Probe/Use/Degrade Pattern (Established in v1.2)

All five integrations follow the same pattern already used for Playwright, Sequential Thinking, etc.:

```
1. PROBE: Check if MCP server is available
   → Use list of configured MCP tools (Claude knows which tools are available)
2. USE: If available, call the MCP tool
   → GitHub: create_issue, get_pull_request, etc.
   → Linear: create_issue, update_issue, etc.
3. DEGRADE: If not available, note in output and continue
   → "GitHub MCP not configured — skipping issue creation. Configure via /pde:setup."
```

**Do NOT hard-fail if an MCP server is absent.** PDE users without Linear should still get full planning value. The integration is an enhancement, not a dependency.

### PDE-as-MCP-Server

**Question:** Should PDE expose its own MCP server so other tools can read PDE's planning state?

**Answer: Use `claude mcp serve` first (zero implementation cost).**

Claude Code has a built-in `claude mcp serve` command that exposes Claude Code's standard file tools (Read, Write, Edit, LS, Glob, Grep) via the MCP protocol. Any `.planning/` file is already readable by any MCP client connecting to this endpoint.

**What `claude mcp serve` exposes:**
- Read — reads any `.planning/**` file
- Write, Edit — writes planning artifacts
- Bash — runs `node pde-tools.cjs` commands
- LS, Glob, Grep — file discovery

**This covers 80% of the PDE-as-server use case without any implementation.**

**When custom PDE MCP tools would add value (defer to v0.6+):**
- `get_project_state` — structured JSON of current project state (phase, milestone, health)
- `get_phase_plan` — return PLAN.md for a specific phase in structured format
- `list_artifacts` — return design manifest artifact inventory
- `get_design_tokens` — return parsed token JSON

**If custom tools are needed, the implementation uses:**
- `@modelcontextprotocol/sdk@^1.27.1` — official SDK for building MCP servers
- TypeScript (separate `mcp-server/` directory, compiled to JS before distribution)
- stdio transport (Claude Code calls it as a local process)
- Defined in `.mcp.json` using `${CLAUDE_PLUGIN_ROOT}/mcp-server/dist/index.js`

**Do NOT implement custom PDE MCP tools in v0.5.** Validate `claude mcp serve` covers user needs first. If gaps identified during v0.5, add custom tools in v0.6.

### ESM Compatibility Warning for MCP SDK

**Critical finding:** `@modelcontextprotocol/sdk@1.27.1` has a known CommonJS compatibility issue with its `pkce-challenge` peer dependency (ESM-only package). This causes `Error [ERR_REQUIRE_ESM]` in CJS projects.

**Mitigations in order of preference:**
1. **Node.js 22+** — Node 22 introduced native `require()` of ESM modules, removing this blocker entirely. PDE currently uses Node 20.
2. **Dynamic import()** — In any CJS file that imports MCP SDK, use async `import()` rather than `require()`. This works on Node 18+.
3. **TypeScript + tsx** — Compile MCP server code as separate TypeScript module outside the CJS constraint.
4. **patch-package** — Patch SDK locally to use dynamic imports (fragile, avoid).

**Decision:** MCP server code (if needed) goes in a **separate `mcp-server/` TypeScript module** compiled independently, not in `pde-tools.cjs`. This cleanly separates the zero-dep CJS constraint (applies to the plugin tools) from MCP server code (can use modern TypeScript/ESM).

**Source:** github.com/modelcontextprotocol/typescript-sdk/issues/217 [HIGH confidence — official SDK repo issue]

### New pde-tools.cjs Commands for v0.5

Zero new npm dependencies. These extend the existing CLI using built-in modules.

| Command | Purpose | Implementation |
|---------|---------|----------------|
| `mcp probe-server <name>` | Check if an MCP server is configured and available | Read `~/.claude.json` or `.mcp.json` for server entry; return boolean |
| `mcp list-available` | Return JSON list of configured MCP server names | Parse both `~/.claude.json` and `.mcp.json` |
| `mcp setup-instructions <server>` | Print Claude Code `mcp add` command for a named server | Lookup table of known servers → install command strings |
| `config set-integration <name> <enabled>` | Toggle a named integration flag in `.planning/config.json` | JSON parse/mutate/write (same pattern as existing config commands) |

### New Reference Files for v0.5

| File | Purpose |
|------|---------|
| `references/mcp-integrations-v05.md` | Replace/extend existing `references/mcp-integration.md` with v0.5 servers: GitHub, Linear, Figma, Jira, Pencil. Per-server: endpoint URL, auth flow, key tools, PDE integration points, probe/degrade behavior. |
| `references/github-workflow-patterns.md` | GitHub issue/PR lifecycle patterns for PDE workflows: naming conventions for auto-created issues, label taxonomy that maps to PDE phases, PR title format matching phase naming |

### New Skills for v0.5

| Skill | Command | Purpose |
|-------|---------|---------|
| MCP Setup Guide | `/pde:setup` (extend existing) | Add v0.5 servers to the setup flow: GitHub, Linear, Figma, Jira instructions with OAuth flow documentation |
| GitHub Sync | `/pde:sync-github` | Two-way sync: push PDE phase tasks to GitHub issues; pull PR/CI status back into STATE.md |
| Issue Tracker Sync | `/pde:sync-issues` | Generic issue sync to Linear or Jira (detected by which MCP is configured) |
| Design Sync | `/pde:sync-design` | Pull Figma frame data or Pencil variables into PDE's design system tokens |

### Installation (v0.5)

```bash
# No new npm packages for PDE plugin itself.

# Users configure MCP servers once via Claude Code CLI:

# GitHub (remote HTTP, OAuth)
claude mcp add --transport http github https://api.githubcopilot.com/mcp/

# Linear (remote HTTP, OAuth)
claude mcp add --transport http linear https://mcp.linear.app/mcp

# Figma (remote HTTP, OAuth)
claude mcp add --transport http figma https://mcp.figma.com/mcp

# Jira/Atlassian (remote SSE, OAuth — enterprise alternative to Linear)
claude mcp add --transport sse jira https://mcp.atlassian.com/v1/sse

# Pencil (local stdio — auto-started by Pencil app; no manual install needed)
# Requires Pencil app from pencil.dev installed in VS Code or Cursor

# Authenticate OAuth servers:
# /mcp   (run inside Claude Code, triggers browser OAuth flow for each server)

# If/when building custom PDE MCP server tools (v0.6+):
npm install @modelcontextprotocol/sdk@^1.27.1
npm install -D typescript@^5.0.0 tsx @types/node
# Build target: mcp-server/ TypeScript module, separate from pde-tools.cjs
```

### Alternatives Considered (v0.5)

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| GitHub remote HTTP endpoint (`api.githubcopilot.com/mcp/`) | `@modelcontextprotocol/server-github` npm package | npm package is community-maintained, lags official; remote endpoint is always current |
| Linear official MCP (`mcp.linear.app`) | Community `linear-mcp-server` npm package | Official is Streamable HTTP with OAuth 2.1; community packages are stdio and require API key management |
| Figma remote endpoint (`mcp.figma.com`) | `figma-developer-mcp` npm package | Official remote is OAuth-based, no API key needed; npm package requires FIGMA_API_KEY env var management |
| Atlassian Rovo MCP (`mcp.atlassian.com/v1/sse`) | `mcp-atlassian` Python package (sooperset) | Python dep in a Node project is unnecessary when official hosted server exists; Python version is for Jira Data Center |
| `claude mcp serve` for PDE-as-server | Custom `@modelcontextprotocol/sdk` implementation | Built-in covers 80% of use case; defer custom tools until gaps are proven |
| Separate TypeScript `mcp-server/` module | Embedding MCP SDK in `pde-tools.cjs` | ESM/CJS conflict; SDK code should be isolated; CJS constraint applies to plugin tools only |

### What NOT to Use (v0.5)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@modelcontextprotocol/server-github` npm package | Community-maintained, lags behind official; requires stdio process management | GitHub remote HTTP endpoint `https://api.githubcopilot.com/mcp/` |
| `linear-mcp-server` npm package | stdio requires API key env var; official remote is simpler and OAuth-based | `https://mcp.linear.app/mcp` (official hosted) |
| `figma-developer-mcp` npm package | Requires `FIGMA_API_KEY` env var management; official remote is OAuth-automated | `https://mcp.figma.com/mcp` (official hosted) |
| Hard-coding auth tokens in `.mcp.json` | Tokens in version-controlled files are a security risk | Use Claude Code OAuth flow; tokens stored in OS keychain |
| SSE transport for new integrations | SSE is deprecated in Claude Code; use HTTP | Streamable HTTP transport (`--transport http`) for all new remote integrations |
| MCP SDK in `pde-tools.cjs` | ESM/CJS conflict with pkce-challenge; pollutes zero-dep constraint | Separate `mcp-server/` TypeScript module if custom tools needed |
| Implementing MCP auth token refresh in PDE | Claude Code handles OAuth token lifecycle automatically | Let Claude Code manage tokens via its built-in OAuth flow |
| `mcp-atlassian` Python package | Python dependency in a Node project; requires Python runtime | Atlassian Rovo MCP official endpoint (hosted, no install) |

---

## Sources (v0.5 Additions)

- [github/github-mcp-server](https://github.com/github/github-mcp-server) — Official GitHub MCP Server; HTTP transport at `api.githubcopilot.com/mcp/`; OAuth + PAT auth; toolset architecture [HIGH confidence]
- [linear.app/docs/mcp](https://linear.app/docs/mcp) — Official Linear MCP documentation; Streamable HTTP; OAuth 2.1; `https://mcp.linear.app/mcp` [HIGH confidence]
- [developers.figma.com/docs/figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) — Official Figma MCP docs; remote endpoint `https://mcp.figma.com/mcp`; OAuth 2.0 [HIGH confidence]
- [support.atlassian.com Rovo MCP](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/) — Atlassian official; SSE transport `https://mcp.atlassian.com/v1/sse`; OAuth 2.1; covers Jira + Confluence [HIGH confidence]
- [docs.pencil.dev](https://docs.pencil.dev/getting-started/installation) — Pencil MCP tools; stdio transport; VS Code/Cursor requirement; `.pen` file format [MEDIUM confidence — tool names from docs, transport from community sources]
- [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp) — Claude Code MCP docs; `.mcp.json` format; plugin MCP bundling; auth patterns; scope hierarchy; `claude mcp serve`; SSE deprecation notice [HIGH confidence]
- [typescript-sdk issue #217](https://github.com/modelcontextprotocol/typescript-sdk/issues/217) — MCP SDK ESM/CJS conflict with pkce-challenge; confirmed workarounds [HIGH confidence]
- [@modelcontextprotocol/sdk npm releases](https://github.com/modelcontextprotocol/typescript-sdk/releases) — v1.27.1 latest stable, published 2025-02-24 [HIGH confidence]
- project_pencil_mcp.md (memory) — Pencil Level 1/2 integration strategy, tool list, constraints [HIGH confidence — project memory from previous research]

---

*Stack research for: AI-powered product development platform (PDE), v0.5 MCP Integrations*
*Researched: 2026-03-18*
