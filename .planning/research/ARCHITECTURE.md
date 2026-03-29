# Architecture Research: Stakeholder Presentation Synthesis Engine

**Domain:** Presentation generation engine integrated into PDE
**Researched:** 2026-03-29
**Confidence:** HIGH — based on direct inspection of existing PDE source code

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Claude Code Session                             │
│   Hook: PostToolUse (Write|Edit) → context-sync-hook.cjs                │
│   Hook: SessionEnd → archive-session.cjs                                │
│   Hook: Notification (idle_prompt) → idle-suggestions.cjs               │
├─────────────────────────────────────────────────────────────────────────┤
│                     Slash Command Entry Points                           │
│   /pde:present  →  commands/present.md  →  workflows/present.md         │
│   /pde:portfolio  →  commands/portfolio.md  →  workflows/portfolio.md   │
├─────────────────────────────────────────────────────────────────────────┤
│                     Synthesis Engine (new)                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  bin/lib/presentation.cjs                                        │    │
│  │  ├── readArtifacts(cwd)  ← .planning/ + design-manifest.json    │    │
│  │  ├── buildSynthesisIR(artifacts)                                 │    │
│  │  ├── renderPersona(ir, personaId, format)                        │    │
│  │  └── portfolioReader(cwdList)                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│                     Persona Renderers (new, in lib/personas/)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ exec.cjs │ │ tech.cjs │ │ inv.cjs  │ │ ux.cjs   │ │ sales.cjs│     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ mktg.cjs │ │ ops.cjs  │ │ board.cjs│ │ engg.cjs │ │ press.cjs│     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
├─────────────────────────────────────────────────────────────────────────┤
│                     Dual-Format Renderer (new)                           │
│  ┌─────────────────────────────────────┐                                │
│  │  bin/lib/present-render.cjs          │                                │
│  │  ├── renderMarkdown(sections, meta)  │                                │
│  │  └── renderHtml(sections, meta)      │                                │
│  └─────────────────────────────────────┘                                │
├─────────────────────────────────────────────────────────────────────────┤
│                     Storage (.planning/presentations/)                   │
│  {slug}-{persona}-{ts}.md   {slug}-{persona}-{ts}.html                  │
│  portfolio-{ts}.md          portfolio-{ts}.html                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `commands/present.md` | Slash command entry point, parses `--persona`, `--format`, `--project` flags | `commands/present.md` (new) |
| `workflows/present.md` | Full generation workflow: calls pde-tools, reads IR, invokes renderer | `workflows/present.md` (new) |
| `commands/portfolio.md` | Slash command for cross-project synthesis | `commands/portfolio.md` (new) |
| `workflows/portfolio.md` | Multi-project reader, feeds aggregated IR into portfolio persona renderers | `workflows/portfolio.md` (new) |
| `bin/lib/presentation.cjs` | Core library: artifact reader, IR builder, persona dispatcher, portfolio reader | `bin/lib/presentation.cjs` (new) |
| `bin/lib/personas/` | 10 persona-specific rendering modules, each exports `render(ir)` | `bin/lib/personas/*.cjs` (new) |
| `bin/lib/present-render.cjs` | Dual-format renderer: Markdown + self-contained HTML with inline CSS | `bin/lib/present-render.cjs` (new) |
| `bin/pde-tools.cjs` | New `presentation` subcommand family: `artifact-read`, `ir-build`, `render`, `portfolio-read` | extend existing |
| `hooks/present-on-phase.cjs` | PostToolUse listener that triggers auto-generation on `phase_complete` events | `hooks/present-on-phase.cjs` (new) |

---

## Recommended Project Structure

```
bin/
├── pde-tools.cjs              # +presentation subcommand family
└── lib/
    ├── presentation.cjs       # artifact reader, IR builder, portfolio reader
    ├── present-render.cjs     # Markdown + HTML dual-format renderer
    └── personas/
        ├── executive.cjs      # CEO/founder lens: outcomes, business value
        ├── technical.cjs      # Engineering lens: architecture, tech debt
        ├── investor.cjs       # Investor lens: market, traction, risk
        ├── ux.cjs             # UX/design lens: user flows, design decisions
        ├── sales.cjs          # Sales lens: features, competitive positioning
        ├── marketing.cjs      # Marketing lens: brand, messaging, copy
        ├── operations.cjs     # Ops lens: delivery, timelines, cost
        ├── board.cjs          # Board lens: governance, milestones, KPIs
        ├── engineering.cjs    # IC engineering lens: code, patterns, APIs
        └── press.cjs          # Media lens: announcement narrative, quotes

commands/
├── present.md                 # /pde:present slash command
└── portfolio.md               # /pde:portfolio slash command

workflows/
├── present.md                 # full single-project presentation workflow
└── portfolio.md               # cross-project portfolio synthesis workflow

hooks/
└── present-on-phase.cjs       # auto-generation trigger on phase_complete

.planning/
└── presentations/             # generated output directory
    ├── {slug}-{persona}-{ts}.md
    ├── {slug}-{persona}-{ts}.html
    ├── portfolio-{ts}.md
    └── portfolio-{ts}.html
```

### Structure Rationale

- **`bin/lib/presentation.cjs`:** Centralizes all artifact-reading logic in the same module pattern as `context-sync.cjs`. Avoids duplicating .planning/ traversal across persona renderers. Single source of truth for what constitutes a "synthesis-worthy artifact."
- **`bin/lib/personas/`:** Each persona is isolated in its own CJS module. They receive the same IR object and produce sections. This mirrors how emitters work in context-sync.cjs (emitAgentsMd, emitCursorRules, etc.) but for presentation output instead of editor files.
- **`bin/lib/present-render.cjs`:** Separated from persona logic so format (HTML vs Markdown) is a rendering concern, not a persona concern. Personas declare sections; the renderer wraps them in the target format.
- **`.planning/presentations/`:** Follows the established pattern of `.planning/design/`, `.planning/logs/`, `.planning/milestones/` — named subdirectory under `.planning/` for a coherent output type. Does not pollute `.planning/design/` (presentations are not design artifacts).
- **`hooks/present-on-phase.cjs`:** New hook file rather than modifying `context-sync-hook.cjs`, following the single-responsibility pattern already established in the hooks directory.

---

## Architectural Patterns

### Pattern 1: Common Artifact-Reading Pipeline with Persona-Specific Rendering

**What:** A single `readArtifacts(cwd)` function in `presentation.cjs` reads all .planning/ state into an Intermediate Representation (IR). The IR is passed to each persona renderer which selects, reorders, and narrates the sections relevant to its audience. No persona reads the file system directly.

**When to use:** Always. Mirrors the established context-sync.cjs pattern where `buildIR(planningDir)` is called once and all emitters receive the same IR.

**Trade-offs:** IR must be comprehensive enough to serve all 10 personas. Adding a new persona requires only a new renderer file, not new file I/O.

**Example:**
```javascript
// bin/lib/presentation.cjs
function readArtifacts(cwd) {
  const planningDir = path.join(cwd, '.planning');
  return {
    project: readProjectMd(planningDir),           // PROJECT.md
    state: readStateMd(planningDir),               // STATE.md
    design: readDesignManifest(planningDir),        // design-manifest.json
    phases: readCompletedPhases(planningDir),       // phases/*/SUMMARY.md via history-digest
    milestones: readMilestones(planningDir),        // milestones/ archived data
    requirements: readRequirementsMd(planningDir),  // REQUIREMENTS.md
    research: readResearchDir(planningDir),          // research/*.md headlines
    retrospective: readRetrospectiveMd(planningDir),
  };
}

// bin/lib/personas/executive.cjs
function render(ir) {
  return [
    { heading: 'Executive Summary', content: synthesizeOutcomes(ir.project, ir.milestones) },
    { heading: 'Business Value Delivered', content: synthesizeValue(ir.phases, ir.requirements) },
    { heading: 'Current Status', content: summarizeState(ir.state) },
    { heading: 'Next Steps', content: extractNextSteps(ir.state, ir.requirements) },
  ];
}
```

### Pattern 2: pde-tools.cjs Subcommand Extension

**What:** Add a `presentation` case block in pde-tools.cjs that routes to presentation.cjs functions, matching the existing `design`, `phase`, `roadmap`, `milestone` case block pattern.

**When to use:** Whenever a workflow needs to call synthesis operations from shell (workflows call pde-tools.cjs via bash, not require() directly).

**Trade-offs:** Keeps zero-npm-dep contract at plugin root intact. pde-tools.cjs grows but remains the single binary interface.

**Example:**
```bash
# Called from workflows/present.md
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation artifact-read
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation render --persona executive --format html
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation portfolio-read --projects /path/a /path/b
```

### Pattern 3: Auto-Generation via Phase Completion Hook

**What:** `hooks/present-on-phase.cjs` is registered in `hooks.json` as a PostToolUse handler (Write|Edit). It detects that the modified file is inside `.planning/` and checks the session NDJSON log for a recent `phase_complete` event. If found, it triggers a background pde-tools.cjs invocation to regenerate presentations for configured personas.

**When to use:** When `config.json` has `"presentations": { "auto_generate": true, "personas": ["executive", "technical"] }` set. Config-gated so projects that don't need it pay zero cost.

**Trade-offs:** async: true in hooks.json means it does not block the main workflow. Risk of double-generation if phase completes and multiple writes fire — mitigate with a session-scoped marker file (same debounce pattern as context-sync-hook.cjs uses for hash-based idempotency).

**Hook registration addition to hooks.json:**
```json
{
  "matcher": "Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/hooks/present-on-phase.cjs",
    "async": true
  }]
}
```

### Pattern 4: Cross-Project Portfolio Reading

**What:** `portfolioReader(cwdList)` in presentation.cjs accepts a list of project root paths. For each path, it calls `readArtifacts(cwd)` and returns an array of IRs tagged with project name and path. The portfolio workflow synthesizes these into a unified narrative.

**When to use:** `/pde:portfolio` command with `--projects` flag supplying a comma-separated list of paths, or with `~/.pde-projects.json` as a global registry file (optional future enhancement).

**Trade-offs:** Reads each project's .planning/ directory independently. No cross-project coupling at the data layer. Portfolio personas receive `ir[]` instead of `ir`.

**Example:**
```javascript
// bin/lib/presentation.cjs
function portfolioReader(cwdList) {
  return cwdList.map(cwd => ({
    projectPath: cwd,
    artifacts: readArtifacts(cwd),
  }));
}
```

---

## Data Flow

### Single-Project Presentation Generation

```
/pde:present --persona executive --format html
    ↓
commands/present.md (parse flags)
    ↓
workflows/present.md
    ↓  (bash)
pde-tools.cjs presentation artifact-read
    ↓  (requires)
presentation.cjs → readArtifacts(cwd)
    ↓  reads
.planning/PROJECT.md, STATE.md, REQUIREMENTS.md, design-manifest.json,
phases/*/SUMMARY.md (via cmdHistoryDigest), milestones/*.md, research/*.md
    ↓  returns IR object as JSON stdout
pde-tools.cjs presentation render --persona executive --format html
    ↓  requires
personas/executive.cjs → render(ir) → sections[]
    ↓
present-render.cjs → renderHtml(sections, meta) → string
    ↓  writes
.planning/presentations/{slug}-executive-{ts}.html
    ↓  emits (via pde-tools event-emit)
presentation_generated event → NDJSON → dashboard Pane 4 (file changes)
```

### Auto-Generation Flow (Phase Completion)

```
execute-phase.md workflow completes phase
    ↓  (bash in workflow, line 735)
pde-tools.cjs event-emit phase_complete
    ↓  → NDJSON session log
hooks/present-on-phase.cjs fires (PostToolUse on .planning/ write, async: true)
    ↓  reads session NDJSON
finds phase_complete event not yet processed
    ↓  checks config.presentations.auto_generate === true
for each configured persona
    ↓  spawnSync (5s timeout, always exits 0)
pde-tools.cjs presentation render --persona {p} --format html,md
    ↓  writes
.planning/presentations/{slug}-{p}-{ts}.{ext}
```

### Cross-Project Portfolio Flow

```
/pde:portfolio --projects /path/a,/path/b
    ↓
workflows/portfolio.md
    ↓  (bash)
pde-tools.cjs presentation portfolio-read --projects /path/a /path/b
    ↓  requires
presentation.cjs → portfolioReader(['/path/a', '/path/b'])
    ↓  for each path
readArtifacts(cwd) → IR tagged with projectPath
    ↓  returns ir[] as JSON stdout
pde-tools.cjs presentation render --mode portfolio --persona executive --format html
    ↓  requires
personas/executive.cjs → renderPortfolio(ir[]) → sections[]
    ↓
present-render.cjs → renderHtml(sections, meta) → string
    ↓  writes
.planning/presentations/portfolio-{ts}.html
```

### Key Data Flows

1. **Artifact reading:** presentation.cjs re-uses the same .planning/ traversal patterns as context-sync.cjs and commands.cjs (readFrontmatter, readStateMd, etc.) — no custom file discovery needed.
2. **history-digest reuse:** `cmdHistoryDigest` in commands.cjs already reads all SUMMARY.md files across archived and current phases. presentation.cjs calls this directly rather than re-implementing phase traversal.
3. **Event emission:** `presentation_generated` event follows the established event_type vocabulary in event-bus.cjs. Dashboard Pane 4 (file changes) surfaces it automatically since it matches the `file_changed` pattern.
4. **Milestone archive data:** `.planning/milestones/v*-ROADMAP.md` files contain per-phase one-liners extracted during `complete-milestone`. These are the richest source for "what shipped when" — presentation.cjs reads them to build the milestones IR field.

---

## Integration Points

### New Components Required

| Component | Type | Integration Point |
|-----------|------|-------------------|
| `bin/lib/presentation.cjs` | New CJS lib | Required by pde-tools.cjs `presentation` case block |
| `bin/lib/present-render.cjs` | New CJS lib | Required by presentation.cjs `render()` |
| `bin/lib/personas/*.cjs` | 10 new CJS modules | Required by presentation.cjs `renderPersona()` |
| `commands/present.md` | New slash command | Invokes workflows/present.md |
| `commands/portfolio.md` | New slash command | Invokes workflows/portfolio.md |
| `workflows/present.md` | New workflow | Calls pde-tools.cjs via bash |
| `workflows/portfolio.md` | New workflow | Calls pde-tools.cjs via bash |
| `hooks/present-on-phase.cjs` | New hook | Registered in hooks/hooks.json |

### Modified Components

| Component | Change | Risk |
|-----------|--------|------|
| `bin/pde-tools.cjs` | Add `presentation` case block (~60 lines) | LOW — additive only, isolated case block |
| `hooks/hooks.json` | Add `present-on-phase.cjs` PostToolUse registration | LOW — config-gated, async: true |
| `.planning/config.json` | Schema extended with optional `presentations` block | LOW — optional, existing config unaffected |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| workflow → pde-tools | bash subprocess, stdout JSON | Same pattern as all existing workflows |
| pde-tools → presentation.cjs | Node.js require() | CJS module, zero npm deps |
| presentation.cjs → personas/* | require() + render(ir) call | Each persona is pure function: ir → sections[] |
| presentation.cjs → present-render.cjs | require() + renderHtml/renderMarkdown | Renderer is format-only, no business logic |
| hook → pde-tools | spawnSync (same pattern as emit-event.cjs) | Always exits 0, async: true |
| presentation.cjs → commands.cjs | require() for cmdHistoryDigest reuse | Reuses existing phase traversal |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None | N/A | Fully local — no external API calls needed |

---

## Storage and Naming Conventions

**Directory:** `.planning/presentations/`

Follows the established subdirectory convention under `.planning/`:
- `.planning/design/` — design artifacts
- `.planning/logs/` — session summaries (format: `{ts}-{slug}-{sessionId}.md`)
- `.planning/milestones/` — archived milestone state
- `.planning/presentations/` — generated presentations (new)

**File naming:** `{project-slug}-{persona}-{YYYY-MM-DD}-{short-uuid}.{ext}`

Example:
```
.planning/presentations/
├── my-app-executive-2026-03-29-a1b2.md
├── my-app-executive-2026-03-29-a1b2.html
├── my-app-technical-2026-03-29-a1b2.md
├── my-app-technical-2026-03-29-a1b2.html
└── portfolio-2026-03-29-c3d4.html
```

Rationale:
- Slug from `pde-tools.cjs generate-slug` (already exists) ensures safe filesystem names
- Persona name as readable discriminator — enables `ls *executive*` filtering
- Date prefix enables sort-by-time listing without reading file content
- Short UUID (4 chars from randomUUID) prevents collision on same-day re-generation
- HTML and Markdown share the same base name — easy to find both formats for a run

---

## Dual HTML + Markdown Output

**How it works:** `present-render.cjs` exports two functions from the same sections[] input.

Both formats receive the same persona-authored sections array. The renderer is responsible only for wrapping, not for content.

```javascript
// present-render.cjs (shape)
function renderMarkdown(sections, meta) {
  // YAML frontmatter: persona, project, generated_at, pde_version
  // sections.map(s => `## ${s.heading}\n\n${s.content}`)
}

function renderHtml(sections, meta) {
  // Self-contained HTML: inline CSS in <style> block
  // Semantic HTML5: <article>, <section>, <h1>/<h2>/<h3>
  // Print-safe: @media print removes navigation, expands sections
  // Responsive: single-column on mobile, two-column on desktop
  // No JavaScript required — static document
}
```

**Why self-contained HTML:** Follows the established pattern of mockup.md artifacts — single-file HTML that can be opened without a server or build step. Aligns with zero-npm-dep contract at plugin root. Users can share the HTML file directly without a hosting environment.

**Print/PDF path:** HTML includes `@media print` CSS. Users can File > Print > Save as PDF from any browser. No Playwright or headless Chrome required. Playwright MCP could optionally be used for automated PDF export in a future enhancement.

---

## Build Order (Respects Existing Architecture Dependencies)

1. **`bin/lib/presentation.cjs` + `bin/lib/present-render.cjs`** — Core library. No deps on new code. Depends on existing `commands.cjs` (cmdHistoryDigest), `state.cjs`, `core.cjs`. Build and unit-test in isolation first.

2. **`bin/lib/personas/*.cjs`** — 10 persona modules. Each depends only on the IR object shape defined in step 1. Can be built in parallel. Start with `executive.cjs` and `technical.cjs` as the highest-value pair.

3. **`bin/pde-tools.cjs` `presentation` subcommand** — Routes to step 1/2 libs. Additive case block. Test with `node pde-tools.cjs presentation artifact-read` before wiring into workflows.

4. **`workflows/present.md` + `commands/present.md`** — Single-project workflow. Depends on step 3 being stable. This is the synthesis layer where Claude reads the IR JSON output and writes the actual narration, which pde-tools then renders.

5. **`workflows/portfolio.md` + `commands/portfolio.md`** — Cross-project workflow. Depends on step 4 patterns being established. Portfolio is a compositional extension of step 4, not a rewrite.

6. **`hooks/present-on-phase.cjs` + `hooks.json` update** — Auto-generation hook. Depends on step 3 being callable from shell. Register last so it does not fire during construction of earlier steps.

---

## Anti-Patterns

### Anti-Pattern 1: Persona Modules Reading the File System Directly

**What people do:** Each persona module reads `.planning/PROJECT.md`, `.planning/STATE.md`, etc. independently.

**Why it's wrong:** 10 personas × N file reads per generation = duplicated I/O. If .planning/ structure evolves, 10 files need updating. Breaks the IR abstraction established by context-sync.cjs.

**Do this instead:** Only `presentation.cjs` reads the file system. Personas receive the IR object and are pure rendering functions.

### Anti-Pattern 2: Generating HTML with External Script/CSS Dependencies

**What people do:** Reference Bootstrap CDN or a local node_modules CSS file from generated HTML.

**Why it's wrong:** Self-contained is a core PDE principle (see mockup.md artifacts). External references break offline use and require a build step or server.

**Do this instead:** Inline all CSS in a `<style>` block. Use system fonts. No JavaScript. The HTML must render correctly via `open file://...` with zero network access.

### Anti-Pattern 3: Hooking Into SessionEnd for Auto-Generation

**What people do:** Add auto-generation to the SessionEnd hook (archive-session.cjs) so presentations regenerate at session end.

**Why it's wrong:** SessionEnd runs synchronously with `async: false`. Long-running synthesis would block session cleanup. Additionally, the session NDJSON file is being consumed by archive-session.cjs at the same time, creating a race on the log file.

**Do this instead:** Hook into `PostToolUse` (Write|Edit) with `async: true` and detect `phase_complete` events in the NDJSON file. This mirrors how context-sync-hook.cjs works with hash-based change detection.

### Anti-Pattern 4: Storing Presentations in .planning/design/

**What people do:** Put generated presentations alongside design artifacts in `.planning/design/launch/` or similar.

**Why it's wrong:** design-manifest.json tracks design artifacts with codes (WFR, MCK, HND, etc.) and a 21-field designCoverage schema. Presentations are not design artifacts — they are synthesized views of project state. Mixing them pollutes the design manifest and confuses the `coverage-check` command.

**Do this instead:** Use `.planning/presentations/` as a dedicated output directory. No manifest registration required since presentations are auto-generated and fully reproducible.

### Anti-Pattern 5: Hardcoding Artifact Paths in Persona Renderers

**What people do:** `personas/technical.cjs` hardcodes `path.join(planningDir, 'design', 'handoff-spec.md')`.

**Why it's wrong:** Artifact paths are managed by design-manifest.json via `pde-tools.cjs design artifact-path <code>`. Hardcoding breaks when artifact locations change or when the design directory is reorganized.

**Do this instead:** The IR object populated by `presentation.cjs` resolves all paths via `design manifest-read` before passing to personas. Personas operate on resolved content strings, not file system paths.

### Anti-Pattern 6: Running All 10 Personas for Every Auto-Generation

**What people do:** On every `phase_complete`, regenerate all 10 persona presentations.

**Why it's wrong:** 10 render operations per phase completion, with history-digest traversal on each = significant I/O on large projects. Most phases are not presentation-worthy to all audiences.

**Do this instead:** Config-gate `presentations.auto_generate_personas` to a default of `["executive", "technical"]` (2 personas). Full 10-persona generation is a manual `/pde:present --all` invocation.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-3 projects | Single `.planning/presentations/` per project, no cross-project registry needed |
| 4-20 projects | Add `--projects` flag to portfolio command with explicit path list |
| 20+ projects | Portfolio reading becomes slow — add hash-based caching of per-project IR in `.planning/presentations/.cache/` using same composite hash pattern as context-sync-hook.cjs |

### Scaling Priorities

1. **First bottleneck:** history-digest reads all SUMMARY.md files across all phases on every generation. With 175+ phases this traverses many files. Mitigation: cache the digest result in `.planning/presentations/.presentation-cache.json` with a composite hash of all SUMMARY.md mtimes as the invalidation key.

2. **Second bottleneck:** Portfolio mode with 10+ projects × multiple personas = many sequential render calls. Mitigation: generate all requested personas for a project in a single `readArtifacts()` call rather than invoking pde-tools once per persona.

---

## Sources

- Direct inspection of `/bin/pde-tools.cjs` (1681 lines) — command routing and subcommand patterns
- Direct inspection of `/bin/lib/context-sync.cjs` — emitter architecture pattern (emitAll, persona analogy, IR builder)
- Direct inspection of `/bin/lib/commands.cjs` — cmdHistoryDigest (reusable for artifact reading)
- Direct inspection of `/hooks/hooks.json` — hook registration format, async: true pattern
- Direct inspection of `/hooks/context-sync-hook.cjs` — hash-based idempotency, debounce pattern
- Direct inspection of `/hooks/emit-event.cjs` — NDJSON event bus usage from hooks
- Direct inspection of `/hooks/archive-session.cjs` — SessionEnd flow, why to avoid it for async work
- Direct inspection of `/bin/lib/event-bus.cjs` — event envelope schema, dispatch pattern
- Direct inspection of `.planning/PROJECT.md` — full validated requirement history
- Direct inspection of `/workflows/execute-phase.md` — phase_complete event emission (line 735)
- Direct inspection of `.planning/config.json` — config structure for feature flags

---
*Architecture research for: Stakeholder Presentation Synthesis Engine — PDE v0.22 (tentative)*
*Researched: 2026-03-29*
