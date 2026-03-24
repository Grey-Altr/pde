# Architecture Research: Multi-Editor Integration

**Domain:** Multi-editor AI tool integration (Cursor, Google Antigravity, Gemini CLI)
**Researched:** 2026-03-23
**Confidence:** MEDIUM (editor config formats verified; Antigravity official docs partially unavailable, supplemented by community guides)

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    EXISTING PDE PLUGIN (Claude Code)                     │
│  skills/ → workflows/ → agents/ → templates/ → references/ → bin/       │
│  .planning/ (PROJECT.md, ROADMAP.md, STATE.md, design-manifest.json)    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────────────┐       │
│  │ bin/lib/     │   │ bin/lib/      │   │ bin/lib/              │       │
│  │ core.cjs     │   │ mcp-bridge.cjs│   │ design.cjs            │       │
│  │ state.cjs    │   │ (57 tools)    │   │ (manifest, coverage)  │       │
│  │ config.cjs   │   │               │   │                       │       │
│  └──────┬───────┘   └──────┬────────┘   └───────────┬───────────┘       │
│         │                  │                         │                   │
├─────────┴──────────────────┴─────────────────────────┴───────────────────┤
│                       SHARED CORE LIBRARY (NEW)                          │
│              bin/lib/context-sync.cjs + bin/lib/divergence.cjs           │
│    Reads .planning/ state → produces editor-agnostic intermediate repr  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────┐  ┌──────────────────┐  ┌──────────────┐                 │
│  │ Context    │  │ Context          │  │ Context      │                 │
│  │ Emitter:   │  │ Emitter:         │  │ Emitter:     │                 │
│  │ Cursor     │  │ Antigravity      │  │ Gemini CLI   │                 │
│  │ (.cursor/  │  │ (GEMINI.md +     │  │ (GEMINI.md)  │                 │
│  │  rules/)   │  │  .agent/rules/)  │  │              │                 │
│  └────────────┘  └──────────────────┘  └──────────────┘                 │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                  pde-mcp-server/ (NEW — subdirectory)                    │
│  Own package.json + @modelcontextprotocol/sdk dependency                │
│  Exposes PDE workflows as MCP tools via stdio transport                 │
│  Invocable: npx pde-mcp-server                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                  STITCH DESIGN BRIDGE (NEW)                              │
│  bin/lib/stitch-bridge.cjs — bidirectional artifact flow                │
│  PDE Stitch artifacts ↔ Antigravity native Stitch canvas                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New vs Modified | Implementation |
|-----------|----------------|-----------------|----------------|
| `bin/lib/context-sync.cjs` | Read .planning/ state, produce editor-agnostic intermediate representation | **NEW** | CJS module, zero npm deps |
| `bin/lib/context-emitters/cursor.cjs` | Transform intermediate repr to `.cursor/rules/*.mdc` files | **NEW** | CJS module, writes .mdc with YAML frontmatter |
| `bin/lib/context-emitters/antigravity.cjs` | Transform intermediate repr to `GEMINI.md` + `.agent/rules/*.md` | **NEW** | CJS module, writes markdown rules |
| `bin/lib/context-emitters/gemini-cli.cjs` | Transform intermediate repr to `GEMINI.md` (project root) | **NEW** | CJS module, writes markdown |
| `bin/lib/divergence.cjs` | Compare handoff specs vs actual code, detect drift | **NEW** | CJS module, AST-free heuristic matching |
| `bin/lib/stitch-bridge.cjs` | Bidirectional artifact flow: PDE .planning/design/ to/from Stitch MCP | **NEW** | CJS module, reads existing mcp-bridge.cjs |
| `pde-mcp-server/` | Standalone MCP server exposing PDE workflows as tools | **NEW** | Subdirectory with own package.json |
| `bin/lib/mcp-bridge.cjs` | Add pde-mcp-server to APPROVED_SERVERS (self-reference for testing) | **MODIFIED** | Add entry + TOOL_MAP entries |
| `bin/pde-tools.cjs` | Add `context-sync`, `divergence-check` commands | **MODIFIED** | New case blocks calling new modules |
| `workflows/context-sync.md` | Workflow for `/pde:context-sync` command | **NEW** | Markdown workflow |
| `workflows/divergence.md` | Workflow for `/pde:divergence` command | **NEW** | Markdown workflow |
| `skills/context-sync.md` | Slash command registration | **NEW** | Skill definition |
| `skills/divergence.md` | Slash command registration | **NEW** | Skill definition |

## Recommended Project Structure

### New Files Only (existing structure unchanged)

```
Platform Development Engine/
├── bin/
│   ├── lib/
│   │   ├── context-sync.cjs           # Core sync engine — reads .planning/, produces intermediate
│   │   ├── context-emitters/           # NEW directory
│   │   │   ├── cursor.cjs             # .cursor/rules/*.mdc writer
│   │   │   ├── antigravity.cjs        # GEMINI.md + .agent/rules/ writer
│   │   │   └── gemini-cli.cjs         # GEMINI.md writer
│   │   ├── divergence.cjs             # Handoff spec vs code drift detector
│   │   └── stitch-bridge.cjs          # PDE to/from Antigravity Stitch artifact bridge
│   └── pde-tools.cjs                  # MODIFIED: new command cases
├── pde-mcp-server/                    # NEW subdirectory — isolated npm package
│   ├── package.json                   # @modelcontextprotocol/sdk dependency
│   ├── index.cjs                      # MCP server entry point (bin target)
│   ├── tools/                         # Tool definitions mapping to PDE workflows
│   │   ├── design-tools.cjs           # design manifest, coverage queries
│   │   ├── planning-tools.cjs         # roadmap, phase status queries
│   │   └── state-tools.cjs            # state queries, todo listing
│   └── README.md                      # npx usage instructions
├── workflows/
│   ├── context-sync.md                # NEW workflow
│   └── divergence.md                  # NEW workflow
└── skills/
    ├── context-sync.md                # NEW skill
    └── divergence.md                  # NEW skill
```

### Structure Rationale

- **`bin/lib/context-emitters/`:** Subdirectory (not flat in lib/) because there will be 3+ editor emitters sharing a common interface. Each emitter is a pure function: intermediate repr in, file writes out. Adding a new editor = one new file.
- **`pde-mcp-server/`:** Separate subdirectory at plugin root (not inside bin/) because it has its own package.json with npm dependencies (@modelcontextprotocol/sdk). This preserves the zero-npm-deps constraint at the plugin root while being discoverable. Published to npm separately as `pde-mcp-server`.
- **`bin/lib/stitch-bridge.cjs`:** Lives in bin/lib/ (not in pde-mcp-server/) because it uses the existing mcp-bridge.cjs TOOL_MAP and Stitch quota tracking. The bridge is consumed by both the context-sync workflow and the pde-mcp-server.
- **`bin/lib/divergence.cjs`:** Separate from context-sync because divergence detection is independently useful (run it from `/pde:divergence` without syncing context) and has different trigger points in the workflow lifecycle.

## Architectural Patterns

### Pattern 1: Intermediate Representation for Context Sync

**What:** The context sync engine reads all .planning/ state once and produces an editor-agnostic JSON intermediate representation. Each emitter transforms this IR into editor-specific files. This decouples PDE state reading from editor format writing.

**When to use:** Whenever PDE state changes and the user runs `/pde:context-sync` or when triggered automatically after build/handoff workflows.

**Trade-offs:** Extra abstraction layer adds ~100 LOC. But without it, each emitter independently parses .planning/ files (3x duplication, 3x opportunity for drift). The IR also enables testing emitters in isolation.

**Example:**
```javascript
// context-sync.cjs — produces IR
function buildContextIR(planningDir) {
  const project = safeReadFile(path.join(planningDir, 'PROJECT.md'));
  const state = safeReadFile(path.join(planningDir, 'STATE.md'));
  const manifest = safeReadJSON(path.join(planningDir, 'design', 'design-manifest.json'));
  const stack = safeReadFile(path.join(planningDir, 'STACK.md'));
  const roadmap = safeReadFile(path.join(planningDir, 'ROADMAP.md'));

  return {
    projectName: extractField(project, 'name'),
    productType: extractField(state, 'productType'),
    currentPhase: extractField(state, 'currentPhase'),
    stack: extractStackSummary(stack),
    designArtifacts: manifest?.artifacts || [],
    constraints: extractConstraints(project),
    coverageFlags: manifest?.designCoverage || {},
    roadmapPhases: extractPhases(roadmap),
  };
}

// cursor.cjs — consumes IR
function emitCursorRules(ir, projectRoot) {
  const rulesDir = path.join(projectRoot, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  // Always-on project context rule
  writeRule(rulesDir, 'pde-context.mdc', {
    description: `PDE project context for ${ir.projectName}`,
    globs: '**/*',
    alwaysApply: true,
    body: buildProjectContextBody(ir),
  });

  // Stack-specific rules
  writeRule(rulesDir, 'pde-stack.mdc', {
    description: 'Technology stack constraints from PDE',
    globs: ir.stack.fileGlobs,  // e.g., "*.tsx,*.ts"
    alwaysApply: false,
    body: buildStackBody(ir),
  });
}
```

### Pattern 2: Subdirectory Package Isolation

**What:** pde-mcp-server lives in its own subdirectory with its own package.json. Dependencies (@modelcontextprotocol/sdk) are installed locally. The parent plugin root remains zero-npm-deps.

**When to use:** Any time a PDE feature requires npm dependencies that would break the zero-dep constraint.

**Trade-offs:** Users must `cd pde-mcp-server && npm install` or rely on `npx pde-mcp-server` (which auto-installs from npm). Slightly more complex distribution, but maintains the core constraint and follows the exact pattern used by Playwright MCP (`npx @playwright/mcp@latest`).

**Example:**
```json
// pde-mcp-server/package.json
{
  "name": "pde-mcp-server",
  "version": "0.15.0",
  "bin": { "pde-mcp-server": "./index.cjs" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0"
  },
  "files": ["index.cjs", "tools/"]
}
```

### Pattern 3: Probe-Before-Bridge for Stitch

**What:** The Stitch bridge reuses mcp-bridge.cjs probe/degrade contracts. Before any bidirectional operation, it probes the Stitch MCP server. If Stitch is unavailable, the bridge degrades to local-only artifact operations (no remote sync, no error).

**When to use:** Every Stitch bridge operation (push design to Antigravity, pull Antigravity design into PDE).

**Trade-offs:** Probe adds ~2-3s latency per bridge call. But without it, operations fail with cryptic MCP errors. This matches the existing PDE MCP pattern established in v0.5/v0.9.

### Pattern 4: AST-Free Divergence Detection

**What:** Divergence detection compares handoff TypeScript interfaces against actual source files using structural heuristics (prop name matching, type signature comparison, component name presence) rather than full AST parsing. This avoids requiring typescript/babel dependencies.

**When to use:** After code implementation, before shipping. Run via `/pde:divergence` or integrated into pressure-test workflow.

**Trade-offs:** Heuristic matching has ~85% accuracy vs ~98% with AST parsing. But AST parsing requires typescript npm dependency (breaks zero-dep in bin/lib/) or offloading to pde-mcp-server (wrong layer). For the 15% edge cases, the divergence report flags "LOW confidence — manual review recommended."

## Data Flow

### Context Sync Flow

```
User runs /pde:context-sync [--editor cursor|antigravity|gemini|all]
    │
    ▼
bin/pde-tools.cjs "context-sync" command
    │
    ▼
bin/lib/context-sync.cjs :: buildContextIR()
    │ Reads: .planning/PROJECT.md
    │        .planning/STATE.md
    │        .planning/ROADMAP.md
    │        .planning/STACK.md (if exists)
    │        .planning/design/design-manifest.json
    │        .planning/design/handoff/HND-handoff-spec-v*.md
    │        .planning/design/DESIGN-STATE.md
    │
    ▼
Intermediate Representation (JSON object in memory)
    │
    ├─────────────────┬─────────────────┐
    ▼                 ▼                 ▼
cursor.cjs      antigravity.cjs   gemini-cli.cjs
    │                 │                 │
    ▼                 ▼                 ▼
.cursor/rules/   GEMINI.md +        GEMINI.md
  pde-*.mdc      .agent/rules/
                   pde-*.md
```

### MCP Server Tool Invocation Flow

```
External Editor (Cursor/Antigravity/Gemini CLI)
    │
    │ MCP stdio connection to: npx pde-mcp-server
    │
    ▼
pde-mcp-server/index.cjs
    │ Receives tool call (e.g., "pde_state", "pde_design_manifest")
    │
    ▼
tools/*.cjs
    │ Maps MCP tool name to pde-tools.cjs command
    │ Spawns: node ../bin/pde-tools.cjs <command> [args] --raw
    │
    ▼
bin/pde-tools.cjs (existing, unmodified for most commands)
    │
    ▼
JSON result returned via stdio to editor
```

### Stitch Bridge Flow

```
/pde:context-sync --editor antigravity
    │
    ▼
context-sync.cjs :: buildContextIR()
    │ Checks: manifest artifacts with source: "stitch"
    │
    ▼
stitch-bridge.cjs :: syncToAntigravity(ir)
    │
    ├── Probe Stitch MCP via mcp-bridge.cjs
    │   (degrade if unavailable)
    │
    ├── Push: .planning/design/wireframe/STH-*.html
    │         to Stitch project via stitch:create-project
    │
    ├── Pull: Antigravity's Stitch modifications
    │         Compare with local STH-*.html
    │         Emit divergence report if changed
    │
    └── Update: design-manifest.json stitch_synced_at timestamp
```

### Divergence Detection Flow

```
/pde:divergence [--scope component|style|api]
    │
    ▼
bin/lib/divergence.cjs :: detectDivergence(planningDir, srcDir)
    │
    ├── Read: .planning/design/handoff/HND-handoff-spec-v*.md
    │         (latest version)
    │
    ├── Parse: Component names, prop interfaces, style tokens
    │          from handoff spec
    │
    ├── Scan: src/ directory for matching component files
    │         (glob patterns from STACK.md framework conventions)
    │
    ├── Compare:
    │   ├── Component existence (spec says X, code has/lacks X)
    │   ├── Prop name matching (spec props vs actual props)
    │   ├── Token usage (DTCG tokens referenced vs hardcoded values)
    │   └── Stitch annotation compliance (@verify labels)
    │
    └── Output: .planning/DIVERGENCE-REPORT.md
                (components: matched/missing/drifted, confidence per item)
```

### Key Data Flows

1. **Context sync (one-way read):** .planning/ state is read-only input. Editor config files are write-only output. PDE never reads .cursor/rules/ or GEMINI.md — those are disposable, regenerated each sync.

2. **MCP server (shell delegation):** pde-mcp-server does NOT import bin/lib/ modules directly (different node_modules tree). Instead, it spawns `node ../bin/pde-tools.cjs` with `--raw` flag for JSON output. This preserves the single-entry-point pattern and avoids require-path complexity.

3. **Stitch bridge (bidirectional):** Only bidirectional component. Reads local .planning/design/ artifacts AND reads Stitch MCP state. Writes in both directions with confirmation gates (inherits VAL-03 pattern from mcp-bridge.cjs).

4. **Divergence (read-only analysis):** Reads handoff specs and source code. Writes only a report file. Never modifies source code or design artifacts.

## Editor-Specific Context Formats

### Cursor: .cursor/rules/*.mdc

```markdown
---
description: PDE project context — [project name]
globs: "**/*"
alwaysApply: true
---

# Project: [name]
## Current Phase: [N] — [description]
## Product Type: [software|hardware|hybrid|experience|business]
## Stack: [framework, language, key libraries]

## Design Artifacts Available
- [artifact list from manifest]

## Constraints
- [from PROJECT.md constraints section]
```

Cursor uses `.cursor/rules/` with `.mdc` (Markdown Component) files containing YAML frontmatter (`description`, `globs`, `alwaysApply`). The old `.cursorrules` root file is deprecated but still supported as fallback. PDE generates multiple .mdc files: one always-on context file, one stack-specific file (with framework globs), one design-artifact file (with component globs).

**Confidence: HIGH** — verified via Cursor official docs.

### Antigravity: GEMINI.md + .agent/rules/

Antigravity reads (in priority order):
1. `GEMINI.md` at project root (highest priority, Antigravity-specific)
2. `AGENTS.md` at project root (cross-tool, also read by Cursor and Claude Code)
3. `.agent/rules/*.md` files (supplementary, organized by concern)

PDE generates:
- `GEMINI.md` — project context, current phase, design pipeline status
- `.agent/rules/pde-stack.md` — stack constraints and conventions
- `.agent/rules/pde-design.md` — design artifact inventory and handoff specs

The `AGENTS.md` file is NOT generated by PDE to avoid conflicting with user-authored cross-tool rules. PDE writes only to GEMINI.md (PDE-specific, regenerable) and .agent/rules/ (supplementary, namespaced with `pde-` prefix).

**Confidence: MEDIUM** — Antigravity official docs were JS-rendered and partially unavailable; verified via community guides at antigravity.codes.

### Gemini CLI: GEMINI.md

Gemini CLI reads `GEMINI.md` from project root and parent directories up to `.git` root. It also supports `AGENTS.md` (v1.20.3+). The CLI discovers context files automatically and concatenates them with path separators.

PDE generates `GEMINI.md` at project root. This is the same file Antigravity reads, so the two editors share context. The format is plain markdown with no frontmatter requirements.

MCP server configuration for Gemini CLI goes in `~/.gemini/settings.json` under `mcpServers`:
```json
{
  "mcpServers": {
    "pde": {
      "command": "npx",
      "args": ["pde-mcp-server"],
      "cwd": "/path/to/project"
    }
  }
}
```

**Confidence: HIGH** — verified via official Gemini CLI docs.

## pde-mcp-server Design

### Tool Surface

The MCP server exposes PDE workflows as read-only query tools. Following the existing key decision "Write tools in PDE-as-MCP-server — creates second write path bypassing pde-tools.cjs validation and locking" (from PROJECT.md Out of Scope), the server exposes ONLY read and orchestration tools:

| MCP Tool Name | Maps To | Description |
|---------------|---------|-------------|
| `pde_state` | `state json` | Current project state |
| `pde_design_manifest` | `design manifest-read` | Design artifact registry |
| `pde_design_coverage` | `design coverage-check` | Coverage flag status |
| `pde_roadmap` | `roadmap analyze` | Roadmap with disk status |
| `pde_phase_status` | `phase-plan-index <N>` | Plans + wave status for phase |
| `pde_history` | `history-digest` | Aggregated SUMMARY.md data |
| `pde_divergence` | `divergence-check` | Handoff vs code drift report |
| `pde_list_todos` | `list-todos` | Pending TODO inventory |
| `pde_health` | `health` (via workflow) | MCP connection health |

Write operations (build, brief, deploy, etc.) are deliberately excluded. External editors invoke PDE write workflows through their native terminal, not through the MCP server. This preserves the single-write-path constraint.

### Distribution Strategy

Published to npm as `pde-mcp-server`. Users configure their editor:

**Cursor:** `.cursor/mcp.json`
```json
{ "mcpServers": { "pde": { "command": "npx", "args": ["pde-mcp-server"] } } }
```

**Antigravity:** Settings > MCP Servers > Add
```json
{ "command": "npx", "args": ["pde-mcp-server"] }
```

**Gemini CLI:** `~/.gemini/settings.json`
```json
{ "mcpServers": { "pde": { "command": "npx", "args": ["pde-mcp-server"] } } }
```

### Zero-Dep Preservation

The pde-mcp-server subdirectory has its own `node_modules/` and `package.json`. The `@modelcontextprotocol/sdk` dependency lives ONLY in `pde-mcp-server/node_modules/`. The plugin root's bin/, lib/, workflows/, etc. remain zero-npm-dep. The server calls back into PDE by spawning `node ../bin/pde-tools.cjs` — no shared require() paths cross the boundary.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 editor (Cursor only) | Single emitter, no GEMINI.md conflict. Simplest path. |
| 2-3 editors simultaneously | IR pattern prevents duplication. GEMINI.md shared between Antigravity and Gemini CLI — PDE appends `<!-- PDE-GENERATED -->` markers to avoid clobbering user content. |
| New editors (future) | Add one file to `bin/lib/context-emitters/`. If the editor reads GEMINI.md or AGENTS.md, the gemini-cli emitter already handles it. If the editor has a unique format, write a new emitter consuming the same IR. |

### Scaling Priorities

1. **First concern:** GEMINI.md collision between Antigravity and Gemini CLI. Both read the same file. Solution: PDE generates one shared GEMINI.md with editor-agnostic content. Editor-specific rules go in `.agent/rules/` (Antigravity) or subdirectory GEMINI.md files (Gemini CLI).

2. **Second concern:** pde-mcp-server version drift from PDE plugin. The server spawns bin/pde-tools.cjs which evolves with the plugin. Solution: pde-mcp-server version is pinned to PDE milestone version. The server includes a version compatibility check on startup.

## Anti-Patterns

### Anti-Pattern 1: Direct Module Import from MCP Server

**What people do:** `require('../../bin/lib/state.cjs')` from pde-mcp-server/
**Why it's wrong:** Different node_modules trees. The server has @modelcontextprotocol/sdk; bin/lib/ has zero deps. Cross-tree requires create invisible coupling and break when either side changes.
**Do this instead:** Spawn `node ../bin/pde-tools.cjs state json --raw` as a subprocess. Parse JSON output. This uses the established single-entry-point pattern.

### Anti-Pattern 2: Generating .cursorrules Instead of .cursor/rules/

**What people do:** Write a single `.cursorrules` file at project root.
**Why it's wrong:** Cursor deprecated `.cursorrules` in favor of `.cursor/rules/*.mdc` with YAML frontmatter, glob targeting, and alwaysApply control. The old format still works but lacks per-file scoping.
**Do this instead:** Generate multiple `.mdc` files in `.cursor/rules/` with proper frontmatter. One rule per concern (context, stack, design).

### Anti-Pattern 3: Writing to AGENTS.md

**What people do:** Generate PDE context into `AGENTS.md` because it is cross-tool compatible.
**Why it's wrong:** AGENTS.md is the user's cross-tool file. PDE overwriting it destroys user rules. Multiple tools writing to the same file creates merge conflicts.
**Do this instead:** Write to `GEMINI.md` (PDE-specific, regenerable) and `.agent/rules/pde-*.md` (namespaced, non-conflicting). Never touch AGENTS.md.

### Anti-Pattern 4: MCP Server Exposing Write Tools

**What people do:** Expose `pde_build`, `pde_deploy`, `pde_brief` as MCP tools for external editors.
**Why it's wrong:** PROJECT.md explicitly excludes this: "Write tools in PDE-as-MCP-server creates second write path bypassing pde-tools.cjs validation and locking." Write operations involve confirmation gates, coverage flag writes, manifest updates, and event bus emissions that only work correctly through the workflow layer.
**Do this instead:** Expose read-only query tools. External editors invoke write workflows through their terminal (the editor's built-in terminal runs Claude Code or the CLI directly).

### Anti-Pattern 5: Full AST Parsing for Divergence Detection

**What people do:** Import typescript compiler API or babel parser for exact prop/type matching.
**Why it's wrong:** Adds ~40MB of npm dependencies to bin/lib/, violating zero-dep constraint. Alternatively, putting it in pde-mcp-server creates a layering violation (divergence is a core feature, not an MCP concern).
**Do this instead:** Heuristic matching (regex for prop names, string matching for type annotations, glob for component file existence). Flag low-confidence matches for manual review. Accept ~85% accuracy as the tradeoff for zero dependencies.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Cursor IDE | .cursor/rules/*.mdc file generation | One-way write; PDE never reads Cursor config |
| Google Antigravity | GEMINI.md + .agent/rules/ + Stitch bridge | GEMINI.md shared with Gemini CLI; Stitch bridge is bidirectional |
| Gemini CLI | GEMINI.md + MCP server config | Shares GEMINI.md with Antigravity |
| Stitch MCP | Existing mcp-bridge.cjs + new stitch-bridge.cjs | Reuses probe/degrade, quota tracking from v0.9 |
| npm registry | pde-mcp-server published package | npx distribution for zero-install editor setup |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| context-sync.cjs to emitters | Function call (IR object passed) | Same process, synchronous |
| pde-mcp-server to pde-tools.cjs | Subprocess spawn (JSON over stdout) | Cross-process, --raw flag required |
| stitch-bridge.cjs to mcp-bridge.cjs | require() (same bin/lib/ tree) | Same process, reuses TOOL_MAP |
| divergence.cjs to handoff artifacts | File read (glob .planning/design/handoff/) | Read-only, latest version only |
| context-sync workflow to event-bus | emit('context:sync', { editor, files }) | Optional observability, non-blocking |

## Suggested Build Order

Based on dependency analysis, the build order should be:

### Phase 1: Context Sync Core (foundation — no external deps)
1. `bin/lib/context-sync.cjs` — IR builder reading .planning/ state
2. `bin/lib/context-emitters/cursor.cjs` — Cursor .mdc emitter
3. `bin/lib/context-emitters/gemini-cli.cjs` — GEMINI.md emitter
4. `bin/pde-tools.cjs` modification — `context-sync` command
5. `workflows/context-sync.md` + `skills/context-sync.md`

**Rationale:** Start with the IR builder because all other features depend on it. Cursor and Gemini CLI emitters are simplest (well-documented formats). This phase delivers immediate value — users can run `/pde:context-sync` to populate editor rules.

### Phase 2: Antigravity Context + Stitch Bridge
1. `bin/lib/context-emitters/antigravity.cjs` — GEMINI.md + .agent/rules/ emitter
2. `bin/lib/stitch-bridge.cjs` — bidirectional Stitch artifact flow
3. Integration with context-sync workflow for Antigravity-specific Stitch sync

**Rationale:** Antigravity emitter depends on understanding the shared GEMINI.md format (proven in Phase 1). Stitch bridge depends on existing mcp-bridge.cjs patterns and is Antigravity-specific.

### Phase 3: pde-mcp-server (standalone package)
1. `pde-mcp-server/package.json` + `pde-mcp-server/index.cjs`
2. `pde-mcp-server/tools/state-tools.cjs` — state and manifest queries
3. `pde-mcp-server/tools/planning-tools.cjs` — roadmap and phase queries
4. `pde-mcp-server/tools/design-tools.cjs` — design coverage and artifact queries
5. npm publish setup + npx verification

**Rationale:** MCP server depends on pde-tools.cjs commands being stable. Build after context sync proves the state reading layer works. The server is independently testable via MCP Inspector.

### Phase 4: Divergence Detection
1. `bin/lib/divergence.cjs` — heuristic comparison engine
2. `bin/pde-tools.cjs` modification — `divergence-check` command
3. `workflows/divergence.md` + `skills/divergence.md`
4. Integration into pressure-test workflow (optional divergence dimension)

**Rationale:** Divergence detection requires handoff artifacts to exist (downstream of the full design pipeline). It is the most independent feature — no other v0.15 component depends on it.

### Phase 5: Integration + Cross-Editor Testing
1. End-to-end: Claude Code plugin to context-sync to Cursor opens with PDE rules
2. End-to-end: pde-mcp-server to Gemini CLI queries PDE state
3. End-to-end: Stitch bridge to Antigravity receives PDE design artifacts
4. Divergence accuracy validation against real handoff specs

## Sources

- [Cursor Rules for AI (official docs)](https://docs.cursor.com/context/rules-for-ai)
- [Antigravity Rules Guide](https://antigravity.codes/blog/user-rules)
- [Gemini CLI Configuration (official)](https://geminicli.com/docs/reference/configuration/)
- [Gemini CLI MCP Servers (official)](https://geminicli.com/docs/tools/mcp-server/)
- [MCP TypeScript SDK (official)](https://github.com/modelcontextprotocol/typescript-sdk)
- [Google Stitch + Antigravity Design-to-Code (Google Codelabs)](https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch?hl=en)
- [Google Antigravity Developer Blog](https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/)
- [Antigravity + Data Cloud MCP (Google Cloud Blog)](https://cloud.google.com/blog/products/data-analytics/connect-google-antigravity-ide-to-googles-data-cloud-services)

---
*Architecture research for: Multi-Editor Integration (v0.15)*
*Researched: 2026-03-23*
