# Feature Research

**Domain:** MCP server integrations for Claude Code plugin (PDE v0.5)
**Researched:** 2026-03-18
**Confidence:** HIGH (Claude Code MCP plugin API — verified against official docs at code.claude.com/docs/en/mcp), HIGH (GitHub MCP — verified via github.com/github/github-mcp-server + changelog), HIGH (Figma MCP — verified via developers.figma.com/docs/figma-mcp-server/tools-and-prompts/), MEDIUM (Linear, Atlassian Jira MCPs — verified via official product docs), MEDIUM (Pencil MCP — verified via docs.pencil.dev + community articles), LOW (PDE-as-MCP-server concept — no prior art; pattern derived from Claude Code's `claude mcp serve` capability + MCP SDK docs)

---

> **Scope note:** This file covers ONLY the v0.5 MCP integrations milestone. The existing PDE capabilities (34 slash commands, 13-stage design pipeline, self-improvement fleet, file-based .planning/ state, agent orchestration) are treated as stable dependencies.

---

## Existing System Baseline

Before mapping features, the existing capabilities that v0.5 builds on:

```
Plugin format:          Claude Code plugin (plugin.json + commands/ directory)
State model:            File-based .planning/ — PLAN.md, STATE.md, DESIGN-STATE.md,
                        design-manifest.json, .planning/design/ artifacts
Slash commands:         34 /pde: commands including /pde:build (full 13-stage pipeline)
Agent system:           12+ agent types, parallel wave orchestration
Design pipeline:        13 stages: recommend → competitive → opportunity → ideate →
                        brief → system → flows → wireframe → critique → iterate →
                        mockup → hig → handoff
Self-improvement:       3-agent fleet (auditor + improver + validator), skill builder
MCP context:            Claude Code supports MCP client (consuming servers) AND
                        plugin-provided MCP servers via .mcp.json or plugin.json
Plugin MCP mechanic:    Plugins define MCP servers in .mcp.json; servers start
                        automatically when plugin is enabled (official docs verified)
```

v0.5 adds MCP connectivity ON TOP of this. No restructuring of existing pipeline.

---

## MCP Integration Landscape

### How MCP Works in Claude Code Plugins (Verified)

Claude Code supports plugin-provided MCP servers via `.mcp.json` at the plugin root or inline in `plugin.json`. When the PDE plugin is enabled, its bundled MCP servers start automatically. Plugin MCP tools appear alongside manually configured MCP tools. Plugin servers use `${CLAUDE_PLUGIN_ROOT}` for bundled files and `${CLAUDE_PLUGIN_DATA}` for persistent state.

This means PDE can bundle MCP infrastructure (connection manager, proxy, discovery service) as part of the plugin itself — users get MCP capabilities without manual configuration.

Three transport types are supported: stdio (local process), HTTP/streamable-HTTP (remote), SSE (deprecated, avoid). OAuth 2.0 is supported for remote servers requiring authentication.

### External MCP Servers: Verified Tool Inventories

**GitHub MCP Server** (official: `github.com/github/github-mcp-server`)
- Toolsets: `repos`, `issues`, `pull_requests`, `actions`, `code_security`
- Key tools: create/read/update issues, list/merge PRs, create branches, search code, monitor Actions runs, analyze build failures, query Dependabot alerts, manage GitHub Projects
- Auth: OAuth or Personal Access Token
- New (2026-01): Projects tools, OAuth scope filtering (server auto-hides tools user can't use), HTTP mode for enterprise
- Transport: HTTP at `https://api.githubcopilot.com/mcp/`
- Relevance to PDE: Issues → planning requirements, PRs → implementation tracking, Actions → CI feedback into pipeline

**Linear MCP Server** (official: `linear.app/docs/mcp`)
- Core tools: find/create/update issues, projects, comments
- 2026-02 additions: create/edit initiatives, project milestones, project updates, project labels, image loading support
- Auth: OAuth or API key via `Authorization: Bearer`
- Transport: HTTP (SSE removed)
- Relevance to PDE: Issues → milestone requirements, Projects → roadmap tracking, initiatives → epic-level planning

**Figma MCP Server** (official: `developers.figma.com/docs/figma-mcp-server/`)
- 13 verified tools:
  - `get_design_context` — design info for a layer/selection, customizable output frameworks
  - `get_variable_defs` — colors, typography, and variables from Figma selection
  - `get_code_connect_map` — Figma node ID → code component mappings
  - `add_code_connect_map` — create new Figma → code mappings
  - `get_screenshot` — screenshot of selection for visual verification
  - `create_design_system_rules` — rule files for design system context
  - `get_metadata` — sparse XML of selection with basic layer properties
  - `get_figjam` — FigJam diagrams to XML
  - `generate_diagram` — Mermaid syntax to FigJam interactive diagrams
  - `generate_figma_design` — generate design layers from UI descriptions (remote only)
  - `get_code_connect_suggestions` — detect/suggest Code Connect mappings
  - `send_code_connect_mappings` — confirm Code Connect mappings
  - `whoami` — authenticated user identity and plan (remote only)
- 2026-02: "Code to Canvas" — Claude Code output → editable Figma frames
- 2026-03: generate design layers from VS Code
- Relevance to PDE: `get_variable_defs` → import Figma design tokens into PDE system skill; `get_design_context` → feed existing Figma designs into PDE wireframe/mockup; `generate_figma_design` → export PDE mockup HTML → Figma frames

**Pencil MCP Server** (official: `docs.pencil.dev`, `pencil.dev`)
- 6 verified tools:
  - `batch_design` — insert/copy/update/replace/move/delete design elements; generate+place images
  - `batch_get` — search elements by pattern, inspect component structure, read design hierarchy
  - `get_screenshot` — render visual preview of canvas state, before/after comparison
  - `snapshot_layout` — analyze layout structure, detect positioning issues, find overlapping elements
  - `get_editor_state` — current canvas editor context (selection, viewport, active file)
  - `get/set_variables` — read and write design tokens (variables) bidirectionally
- File format: `.pen` files are JSON (git-diffable, aligns with PDE's file-based model)
- Transport: stdio (local process, runs automatically with Pencil)
- Constraint: Requires VS Code or Cursor — use probe/degrade pattern, graceful fallback
- Relevance to PDE: `get/set_variables` → sync DTCG tokens from PDE system skill to Pencil canvas; `batch_design` + `get_screenshot` → generate Pencil canvas wireframes from PDE flows output; `get_screenshot` in `/pde:critique` for visual audit

**Atlassian Rovo MCP Server** (official: `atlassian.com/platform/remote-mcp-server`)
- Core tools: summarize/search Jira + Confluence, create/update issues and pages, bulk operations (generate tickets from specs/meeting notes)
- Auth: OAuth 2.1 or API tokens; respects existing Atlassian access controls and IP allowlisting
- Transport: Remote HTTP (cloud-based)
- Compatible clients: Claude, Cursor, Gemini CLI, Lovable, WRITER
- Relevance to PDE: Jira issues → requirements import for planning; Confluence pages → context for /pde:brief and /pde:competitive
- Note: Requires paid Atlassian Cloud account; primarily enterprise-tier users

**Other High-Value MCP Servers for PDE Pipeline**

| Server | Purpose | Relevance to PDE |
|--------|---------|-----------------|
| Vercel MCP | Deployment monitoring, project management, environment variables | Deployment feedback into pipeline; CI/CD awareness |
| Sentry MCP (`mcp.sentry.dev/mcp`) | Real-time error tracking, stack traces, correlate with releases | Post-deployment feedback; error context for /pde:debug |
| Notion MCP (`mcp.notion.com/mcp`) | Semantic search over Notion workspace, read/write pages | Requirements from Notion into /pde:brief |
| Slack MCP | Read channels, summarize threads, post messages | Requirements from Slack threads; standup context |
| Sequential Thinking MCP | Structured reflective reasoning across extended chains | Amplifies multi-step planning in /pde:plan |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a v0.5 MCP milestone must include. Missing these means the milestone does not meet its goals.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| MCP connection infrastructure bundled in plugin | Plugin-provided MCP servers are a first-class Claude Code plugin capability (official docs verified). Users expect the plugin to handle MCP setup, not require manual `claude mcp add` commands. | MEDIUM | Requires `.mcp.json` at plugin root OR `mcpServers` in `plugin.json`; `${CLAUDE_PLUGIN_ROOT}` for bundled server scripts |
| GitHub MCP integration (`/pde:sync-github`) | PROJECT.md lists GitHub as the first named integration target. Issues → requirements, PRs → implementation context. These are table stakes for any dev-tool pipeline. | MEDIUM | GitHub MCP server at `https://api.githubcopilot.com/mcp/` (official); toolsets: `issues`, `pull_requests`, `repos`; needs auth (OAuth or PAT via env var) |
| Linear/Jira toggle (`/pde:sync-tasks`) | PROJECT.md lists Linear AND Jira. Teams use one or the other — both must be supported. | MEDIUM | Linear MCP: `linear.app` remote HTTP; Jira: Atlassian Rovo remote HTTP; single command surface, server selection based on config |
| Figma design import (`/pde:import-figma`) | PROJECT.md lists Figma. Importing existing Figma designs into the PDE pipeline (wireframe/system stages) is the primary user workflow for design-handoff use cases. | HIGH | Figma MCP tools: `get_design_context`, `get_variable_defs`, `get_code_connect_map`; writes to `.planning/design/` alongside existing artifacts |
| MCP availability probe (detect what's connected) | Without a probe, PDE commands must assume server availability. A probe enables graceful degradation when a server isn't configured. | LOW | Read existing MCP tool list at session start; write `.planning/config/mcp-state.json` with detected servers |
| User-facing MCP status command (`/pde:mcp-status`) | Users need to know which integrations are active, authenticated, and working before running a pipeline. | LOW | Reads `.planning/config/mcp-state.json`; surfaces auth status, available tools, last sync timestamp |

### Differentiators (Competitive Advantage)

Features that set PDE apart from other Claude Code plugins and AI dev tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Pencil MCP design canvas pipeline (`/pde:pencil`) | Unique in the Claude Code ecosystem: bidirectional sync between PDE's file-based design artifacts and Pencil's live visual canvas. DTCG tokens from `/pde:system` sync to Pencil variables; Pencil screenshots feed `/pde:critique`. No other plugin does this. | HIGH | Pencil tools: `get/set_variables` for token sync, `batch_design` for canvas generation, `get_screenshot` for visual critique; requires probe/degrade for VS Code dependency |
| Figma → PDE token import + merge | Import Figma design tokens (colors, typography, spacing) into PDE's DTCG format and merge with existing system. Existing design-to-code tools do one-way export; PDE does bidirectional token management. | HIGH | Figma `get_variable_defs` → DTCG transform → merge with existing `.planning/design/tokens.json`; non-destructive merge with conflict detection |
| Issues → requirements auto-population (`/pde:brief --from-github` or `--from-linear`) | Pull GitHub issues or Linear project into PROJECT.md / REQUIREMENTS.md automatically, populating brief and plan with real requirements rather than synthesized ones. | MEDIUM | GitHub `list_issues` → structured requirements extraction; Linear `find_issues` → milestone map; outputs to `.planning/` alongside existing artifacts |
| PDE as MCP server (expose planning state to other tools) | Expose PDE's `.planning/` state — PLAN.md, STATE.md, design artifacts, DESIGN-STATE.md — as MCP resources + tools so other AI tools (Claude Desktop, Cursor, etc.) can query planning context. This turns PDE into a planning hub, not just a pipeline. | HIGH | Uses `claude mcp serve` pattern + custom MCP server bundled in plugin; resources: `pde://plan`, `pde://state`, `pde://design-state`; tools: `get_current_phase`, `get_requirements`, `get_design_artifacts` |
| Figma "Code to Canvas" export (`/pde:export-figma`) | Export PDE-generated HTML mockups as editable Figma frames via `generate_figma_design`. Reverse workflow: PDE builds mockup → pushes to Figma for design team iteration. | MEDIUM | Figma `generate_figma_design` (remote only — requires Figma dev token); input: PDE mockup HTML; output: new Figma frame in specified file |
| Cross-server pipeline command (`/pde:build --sync`) | Run the 13-stage pipeline AND sync at key points: pull requirements from GitHub/Linear before brief, push design artifacts to Figma/Pencil after mockup, create implementation tickets after handoff. One command, fully connected. | HIGH | Orchestrates existing `/pde:build` with MCP sync steps injected at: pre-brief (requirements pull), post-mockup (design push), post-handoff (ticket creation) |
| MCP server recommendations in `/pde:recommend` | PDE's existing recommend skill discovers tools; extend it to detect and recommend MCP servers relevant to the project type (frontend → Figma/Pencil, backend API → Sentry, project tracked in Linear → Linear MCP). | LOW | Extends existing recommend skill logic; reads project tech stack from STACK.md; queries MCP registry pattern |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-configure all MCP servers on plugin install | Seems like zero-friction setup | Requires API keys/OAuth for every service. Auto-configuration either exposes credentials unsafely or triggers OAuth flows users didn't expect. Claude Code's MCP scope model (local/project/user) exists for a reason. | Provide an interactive `/pde:mcp-setup` command that walks through auth for each service user wants to enable. Never auto-configure without consent. |
| Real-time bidirectional sync with Figma | Figma is live, PDE should stay in sync | PDE is session-based (Claude Code has no persistent background process). "Real-time" sync is architecturally impossible without a persistent daemon, which conflicts with the plugin model. Sync that appears real-time but has unknown lag causes stale artifact bugs that are hard to debug. | Explicit sync commands (`/pde:import-figma`, `/pde:export-figma`). Deterministic: user knows when sync happened and what version was imported. |
| MCP tool passthrough to all subagents | Seems like max capability | Tool Search already manages context window pressure by lazy-loading MCP tool definitions. Passing ALL MCP tools to ALL subagents fills context budgets before agents start their actual work. The 85% context savings from Tool Search are lost. | Give each PDE agent only the MCP toolset it needs. Executor agent gets GitHub (PR creation). Planner gets Linear/Jira (requirements). Critique agent gets Pencil (screenshots). Scope at agent spawn time. |
| Jira Cloud AND Jira Data Center both supported at launch | Enterprise coverage seems important | Atlassian's official Rovo MCP server is cloud-only. Data Center requires the community `sooperset/mcp-atlassian` server, which has different auth flows, tools, and stability characteristics. Supporting both at v0.5 doubles QA surface. | Start with Atlassian Rovo MCP (Cloud). Add Data Center support in v0.5.x when user demand is confirmed. |
| MCP servers committed to project `.mcp.json` with credentials | Team-sharing MCP configs is useful | `.mcp.json` committed to git with API keys or OAuth tokens leaks credentials. The env var expansion pattern (`${GITHUB_TOKEN}`) exists precisely to prevent this — but it requires users to set env vars locally, which needs clear documentation to avoid the "it works on my machine" problem. | Use env var expansion in `.mcp.json` (Claude Code's official supported pattern). Document required env vars in plugin README with setup instructions. Never commit literal tokens. |
| PDE-as-MCP-server with write tools | Other agents could update your plan via MCP | Exposing write tools on PDE's planning state (update PLAN.md, mark phase complete) via MCP creates race conditions between PDE's own pipeline execution and external MCP clients. File-based state has no locking mechanism. | Expose read-only resources and read-only tools in PDE's MCP server. Write operations must go through PDE's own commands, which own the state machine. |

---

## Feature Dependency Map

```
[MCP Connection Infrastructure (Plugin-bundled)]
    └──enables──> [GitHub MCP Integration]
    └──enables──> [Linear/Jira Toggle]
    └──enables──> [Figma Import/Export]
    └──enables──> [Pencil Design Pipeline]
    └──enables──> [PDE as MCP Server]

[MCP Availability Probe]
    └──required-by──> [All integration commands] (probe/degrade pattern)
    └──writes──> [.planning/config/mcp-state.json]
    └──read-by──> [/pde:mcp-status]

[GitHub MCP Integration]
    └──uses──> [GitHub MCP toolsets: issues, pull_requests, repos]
    └──writes-to──> [REQUIREMENTS.md or PROJECT.md] (requirements import)
    └──creates──> [GitHub Issues/PRs] (from PDE handoff artifacts)
    └──enhances──> [EXISTING: /pde:brief] (--from-github flag)
    └──enhances──> [EXISTING: /pde:handoff] (auto-create PRs)

[Linear/Jira Toggle]
    └──uses──> [Linear MCP OR Atlassian Rovo MCP] (config-driven)
    └──reads──> [Issues/Projects/Milestones]
    └──writes-to──> [.planning/STATE.md] (task sync)
    └──enhances──> [EXISTING: /pde:plan] (import tasks from Linear project)

[Figma Import /pde:import-figma]
    └──uses──> [Figma MCP: get_design_context, get_variable_defs, get_metadata]
    └──writes-to──> [.planning/design/figma-import.json]
    └──enhances──> [EXISTING: /pde:system] (seed with Figma tokens)
    └──enhances──> [EXISTING: /pde:wireframe] (reference Figma layouts)

[Figma Export /pde:export-figma]
    └──uses──> [Figma MCP: generate_figma_design]
    └──reads-from──> [EXISTING: .planning/design/ mockup artifacts]
    └──conflicts-with──> [Figma Import] (don't run simultaneously)

[Pencil Design Pipeline /pde:pencil]
    └──uses──> [Pencil MCP: get/set_variables, batch_design, get_screenshot, snapshot_layout]
    └──reads-from──> [EXISTING: .planning/design/tokens.json] (DTCG tokens from /pde:system)
    └──enhances──> [EXISTING: /pde:critique] (get_screenshot for visual audit)
    └──enhances──> [EXISTING: /pde:wireframe] (batch_design canvas output)
    └──probe-degrades──> graceful skip when Pencil not detected

[PDE as MCP Server]
    └──exposes──> [pde://plan, pde://state, pde://design-state as MCP resources]
    └──exposes──> [get_current_phase, get_requirements, get_design_artifacts as read-only tools]
    └──reads-from──> [EXISTING: .planning/ state files]
    └──does-NOT-modify──> [any .planning/ state] (read-only contract)

[/pde:build --sync (Cross-server pipeline)]
    └──requires──> [GitHub MCP Integration] (requirements pull, PR creation)
    └──requires-one-of──> [Linear MCP OR Jira MCP] (task tracking)
    └──optional──> [Figma Export] (design push after mockup)
    └──optional──> [Pencil Design Pipeline] (visual canvas during wireframe)
    └──orchestrates──> [EXISTING: /pde:build full 13-stage pipeline]
```

### Dependency Notes

**MCP connection infrastructure is the foundation:** All integration features depend on the plugin-bundled MCP server setup working correctly. Build and test this first before implementing any specific integration.

**Probe/degrade is mandatory:** Every MCP-dependent command must detect server availability at runtime and fall back gracefully. Pencil requires VS Code — it will not always be present. Figma requires a valid API token. Linear vs. Jira is user-configured. Hard failures when servers are absent break the pipeline for all non-MCP users.

**Figma import and export are independent operations:** They use different tools and write to different places. They can conflict if run simultaneously (import overwrites what export needs to read). Serialize them; never parallelize.

**Pencil requires DTCG tokens from `/pde:system` first:** `set_variables` needs the token structure that the system skill produces. Pencil integration is only useful after at least the system stage of the design pipeline has run.

**PDE-as-MCP-server must be read-only:** No write tools. No state mutation via MCP. PDE's pipeline execution and MCP server cannot both write to `.planning/` without a locking mechanism that doesn't exist in the file-based model.

---

## MVP Definition (for v0.5 Milestone)

### Launch With (v0.5)

Minimum viable for the milestone to close. Directly addresses PROJECT.md active requirements.

- [ ] **Plugin-bundled MCP infrastructure** — `.mcp.json` at plugin root, MCP availability probe, `mcp-state.json` detection, `/pde:mcp-status` command. Foundation for all other integrations.
- [ ] **GitHub MCP integration** — `/pde:sync-github` to pull issues as requirements into `.planning/`; enhance `/pde:brief` with `--from-github` flag; enhance `/pde:handoff` with auto-PR creation option.
- [ ] **Linear OR Jira integration (toggle)** — `/pde:sync-tasks` with `--linear` and `--jira` flags; pull issues/milestones into STATE.md; enhance `/pde:plan` with `--from-linear`/`--from-jira`.
- [ ] **Figma design import** — `/pde:import-figma` using `get_design_context` and `get_variable_defs`; merge Figma tokens into DTCG format; seed into system/wireframe stages.
- [ ] **Pencil MCP integration (Level 1)** — Token sync via `get/set_variables` in `/pde:system`; `get_screenshot` in `/pde:critique` for visual verification; probe/degrade for non-VS-Code environments.
- [ ] **MCP server recommendations in `/pde:recommend`** — Detect project type and recommend relevant MCP servers; surface in the existing recommend skill output.

### Add After Validation (v0.5.x)

Features to add once core integrations are working and tested.

- [ ] **Figma "Code to Canvas" export** (`/pde:export-figma`) — Trigger: when import is stable and users confirm the roundtrip workflow is useful.
- [ ] **PDE as MCP server** — Expose `.planning/` state as read-only MCP resources. Trigger: after all consuming integrations are built (need use cases validated first).
- [ ] **Cross-server pipeline** (`/pde:build --sync`) — Orchestrate MCP syncs through the 13-stage pipeline. Trigger: after all individual integrations are independently stable.
- [ ] **Pencil Level 2** — Native `.pen` file output from `/pde:wireframe` and `/pde:mockup`. Trigger: after Level 1 (token sync + screenshot) is validated in real projects.

### Future Consideration (v0.6+)

- [ ] **Jira Data Center support** — Community `sooperset/mcp-atlassian` server integration. Defer until Cloud demand is confirmed and v0.5 Cloud integration is stable.
- [ ] **Sentry/Vercel feedback loop** — Post-deployment error/monitoring data feeding back into `/pde:debug` and next-milestone planning. Requires user projects to be deployed first.
- [ ] **Slack/Notion requirements import** — Read channels or pages as requirement sources for `/pde:brief`. Defer; GitHub/Linear/Jira covers 90% of dev-team requirement sources.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Plugin-bundled MCP infrastructure | HIGH — foundation for all other features | MEDIUM — `.mcp.json`, probe script, status command | P1 |
| MCP availability probe + `/pde:mcp-status` | HIGH — enables graceful degradation | LOW — read MCP tool list, write JSON | P1 |
| GitHub MCP integration | HIGH — most common dev tool in PDE's user base | MEDIUM — HTTP transport, OAuth/PAT, 3 command enhancements | P1 |
| Linear/Jira toggle | HIGH — project management is expected for a dev platform | MEDIUM — two server configs, config-driven selection | P1 |
| Figma design import | HIGH — design import is core to PDE's pipeline promise | HIGH — token format transform, DTCG merge, integration with 2 existing skills | P1 |
| Pencil Level 1 (token sync + screenshot) | MEDIUM-HIGH — unique differentiator; VS Code dependency limits audience | MEDIUM — 2 tools (get/set_variables, get_screenshot), probe/degrade | P1 |
| MCP recommendations in `/pde:recommend` | MEDIUM — extends existing skill | LOW — detect stack, map to servers | P2 |
| Figma export (Code to Canvas) | MEDIUM — reverse workflow is valuable but not primary | MEDIUM — generate_figma_design requires Figma dev token | P2 |
| PDE as MCP server | MEDIUM — enables ecosystem integration, but no confirmed user demand yet | HIGH — custom MCP server in Node.js, resource/tool schema design | P2 |
| Cross-server pipeline (`/pde:build --sync`) | HIGH — the "connected development hub" vision | HIGH — orchestration complexity, error handling across 5+ servers | P3 |
| Pencil Level 2 (native .pen output) | MEDIUM — deeper canvas integration | HIGH — .pen file format production from HTML/CSS | P3 |

**Priority key:**
- P1: Must have for v0.5 milestone to close
- P2: Include if implementation time permits; add in v0.5.x if not
- P3: Next milestone or v0.6+

---

## Domain-Specific Feature Detail

### 1. Plugin-Bundled MCP Infrastructure

**How plugin MCP servers work (verified from official docs):**

Plugins define MCP servers in `.mcp.json` at the plugin root or inline in `plugin.json`. When the plugin is enabled, its MCP servers start automatically. Plugin servers use:
- `${CLAUDE_PLUGIN_ROOT}` — path to plugin installation directory
- `${CLAUDE_PLUGIN_DATA}` — persistent state directory surviving plugin updates

Example `.mcp.json` for PDE:
```json
{
  "pde-mcp-proxy": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/mcp-proxy.cjs",
    "args": ["--config", "${CLAUDE_PLUGIN_DATA}/mcp-config.json"],
    "env": {
      "GITHUB_TOKEN": "${GITHUB_TOKEN}",
      "LINEAR_API_KEY": "${LINEAR_API_KEY}",
      "FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"
    }
  }
}
```

**MCP availability probe mechanism:**
At session start (or on `/pde:mcp-status` invocation), PDE reads the current MCP tool list. For each expected server (github, linear, figma, pencil, jira), it checks tool presence and writes a `.planning/config/mcp-state.json`:
```json
{
  "detected": ["github", "figma"],
  "missing": ["linear", "pencil"],
  "last_checked": "2026-03-18T10:00:00Z"
}
```
Every MCP-dependent command reads this file first and skips gracefully if the required server is absent.

**Confidence:** HIGH (plugin MCP mechanism verified from official docs). MEDIUM for the specific probe implementation — need to validate that `listTools` is callable programmatically within Claude Code's skill context.

### 2. GitHub MCP Integration

**Primary use cases for PDE:**

1. **Requirements import** (`/pde:brief --from-github [repo]`): Pull open GitHub issues labeled `requirements` or `pde-scope` into REQUIREMENTS.md. Structured extraction: issue title → requirement, issue body → rationale, labels → category.

2. **Implementation tracking** (`/pde:handoff --create-prs`): After `/pde:handoff` produces component APIs and TypeScript interfaces, create GitHub issues or a PR draft with the handoff spec attached.

3. **CI/CD feedback** (ambient): When GitHub Actions runs are visible via MCP, surface build failures in the PDE session context. Useful for the existing `/pde:debug` command.

**Auth pattern:** GitHub PAT stored as `${GITHUB_TOKEN}` env var. No credentials in `.mcp.json`. OAuth supported but PAT is simpler for single-user Claude Code sessions.

**Tool usage:** Toolsets `issues` + `repos` for import; `pull_requests` for PR creation; `actions` for CI feedback.

**Confidence:** HIGH (official server at `api.githubcopilot.com/mcp/`, toolsets documented, env var pattern verified).

### 3. Linear/Jira Toggle

**User configuration:** `.planning/config/pde-config.json` (or CLAUDE.md user preference) specifies `task_tracker: "linear"` or `task_tracker: "jira"`. Default: `"none"`. The `/pde:sync-tasks` command reads this and selects the appropriate MCP server.

**Linear use cases:**
- Import issues/milestones as PDE requirements before `/pde:plan`
- Map PDE phases to Linear projects
- Create Linear issues from `/pde:handoff` task breakdown
- Linear MCP is HTTP remote, OAuth, no SSE (SSE deprecated)

**Jira/Atlassian use cases:**
- Import Jira epics as milestone scope
- Create Jira tickets from handoff spec
- Atlassian Rovo MCP is cloud-only at v0.5 (Data Center deferred)
- Auth: OAuth 2.1 or API token

**Divergence point:** Linear has richer project/milestone/initiative structure; Jira has richer workflow/transition structure. PDE's STATE.md maps cleanly to Linear's model. Jira's epic/story/subtask hierarchy requires a mapping layer.

**Confidence:** HIGH for Linear (official docs verified, recent changelog confirmed 2026 additions). MEDIUM for Jira (Atlassian Rovo MCP is newer, enterprise-focused, cloud-only constraint confirmed).

### 4. Figma Design Import

**Token import workflow:**
1. User selects Figma frame or component
2. `/pde:import-figma` calls `get_variable_defs` → receives colors, typography, spacing
3. PDE transforms to DTCG 2025.10 format (PDE's existing token format)
4. Non-destructive merge with existing `.planning/design/tokens.json` (conflict detection: flag when Figma value differs from existing PDE token)
5. Writes merged tokens; `/pde:system` can now use as baseline instead of generating from scratch

**Design context import workflow:**
1. `/pde:import-figma --context` calls `get_design_context` → layer tree, variants, layout constraints, component references
2. Writes `.planning/design/figma-context.json`
3. `/pde:wireframe` reads this file as reference if present (existing probe/degrade pattern)

**Code Connect map import:**
1. `/pde:import-figma --code-connect` calls `get_code_connect_map` → Figma node → codebase component mappings
2. Writes mappings to `.planning/design/code-connect.json`
3. `/pde:handoff` reads this to produce component API specs with Figma references included

**Confidence:** HIGH (13 tools documented at developers.figma.com; DTCG format already used by PDE). MEDIUM for the non-destructive merge logic — token naming conventions between Figma and PDE may differ and need a mapping strategy.

### 5. Pencil MCP Integration (Level 1)

**Level 1 scope (v0.5 launch):**

Token sync in `/pde:system`:
- After DTCG tokens are generated, probe for Pencil availability
- If available: call `set_variables` to push PDE tokens to Pencil canvas
- Enables designers to immediately use PDE-generated design system in Pencil
- Non-blocking: if Pencil not available, system skill completes normally

Visual critique in `/pde:critique`:
- If Pencil is available AND a `.pen` file exists: call `get_screenshot` on the active Pencil canvas
- Attach screenshot to critique context for visual-accuracy assessment
- Supplement HTML-based critique with rendered canvas view
- Non-blocking: critique runs without Pencil; screenshot is additive context

Layout audit in `/pde:critique` (bonus):
- If `snapshot_layout` detects positioning issues or overlaps in Pencil canvas, surface in critique output
- Catches layout bugs that HTML-based critique misses

**Probe/degrade pattern:**
```
if mcp-state.json includes "pencil":
    use Pencil tools
else:
    skip silently, log "Pencil not detected — visual canvas sync skipped"
    continue with existing behavior
```

**Confidence:** MEDIUM (tool names verified from community articles and memory notes; official docs at docs.pencil.dev are sparse on tool details). VS Code constraint confirmed. Implementation requires validation in real environment.

### 6. PDE as MCP Server

**What it exposes (read-only):**

MCP Resources (addressable via URI, application-controlled):
- `pde://plan` → contents of `.planning/PLAN.md`
- `pde://state` → contents of `.planning/STATE.md`
- `pde://design-state` → contents of `.planning/design/DESIGN-STATE.md`
- `pde://requirements` → parsed requirements from PROJECT.md
- `pde://artifacts` → list of design artifact files with metadata from design-manifest.json

MCP Tools (LLM-callable, read-only):
- `get_current_phase` → returns current phase name, status, progress from STATE.md
- `get_requirements` → returns structured requirements list
- `get_design_artifacts` → returns artifact registry with file paths and coverage flags
- `get_pipeline_status` → returns 13-stage coverage summary

**Implementation approach:**
A Node.js (CommonJS) MCP server script at `${CLAUDE_PLUGIN_ROOT}/servers/pde-state-server.cjs`. Uses `@modelcontextprotocol/sdk` (official TypeScript SDK). Started automatically via plugin `.mcp.json`. Reads `.planning/` files relative to the current working directory (project root).

**Why defer to v0.5.x:**
The server is read-only and architecturally clean, but the use cases (Cursor reading PDE plan, Claude Desktop querying design state) need user validation before building the interface. Build the consuming integrations first; the server's API surface will be clearer once actual consumer patterns are known.

**Confidence:** MEDIUM (MCP server SDK is straightforward; `claude mcp serve` pattern confirmed from official docs; read-only constraint is safe). LOW for whether users actually want to consume PDE state via MCP from other tools — needs validation.

---

## Competitor Feature Analysis

| Feature | Other Claude Code plugins | Cursor/Windsurf with MCP | Copilot Workspace | PDE v0.5 approach |
|---------|--------------------------|--------------------------|-------------------|-------------------|
| Plugin-bundled MCP servers | Not common — most plugins don't include MCP | Manual user configuration | Native GitHub integration only | Plugin bundles MCP infrastructure; users get integrations on plugin enable |
| GitHub issues → requirements | None found | Manual with GitHub MCP | Native PR/issue sync | Auto-populated via MCP; structured extraction into REQUIREMENTS.md |
| Design token import from Figma | None found | Manual copy-paste | Not applicable | Automated via Figma MCP `get_variable_defs` → DTCG merge |
| Pencil canvas integration | None found | Manual Pencil MCP setup | Not applicable | First-in-class: bidirectional token sync + screenshot critique |
| Cross-tool pipeline orchestration | None found | Per-tool, no orchestration | No | PDE orchestrates GitHub + Linear/Jira + Figma/Pencil through 13-stage pipeline |
| Expose planning state as MCP | None found | Not applicable | Not applicable | PDE-as-MCP-server (v0.5.x) — unique: planning state as queryable resource |

---

## Sources

- **Claude Code MCP Plugin API** (HIGH confidence): `https://code.claude.com/docs/en/mcp` — verified plugin `.mcp.json` format, `${CLAUDE_PLUGIN_ROOT}` env var, automatic lifecycle, scopes, Tool Search, `claude mcp serve` behavior, passthrough limitation
- **GitHub MCP Server** (HIGH confidence): `https://github.com/github/github-mcp-server` — toolset names, HTTP transport URL, auth options
- **GitHub MCP Changelog** (HIGH confidence): `https://github.blog/changelog/2026-01-28-github-mcp-server-new-projects-tools-oauth-scope-filtering-and-new-features/` — 2026 feature additions
- **Figma MCP Developer Docs** (HIGH confidence): `https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/` — all 13 tools with descriptions
- **Figma MCP Blog** (HIGH confidence): `https://www.figma.com/blog/introducing-figma-mcp-server/` — Code Connect, design system rules
- **Figma Code to Canvas** (MEDIUM confidence): `https://muz.li/blog/claude-code-to-figma-how-the-new-code-to-canvas-integration-works/` — Claude Code → Figma frame workflow
- **Linear MCP Docs** (HIGH confidence): `https://linear.app/docs/mcp` — HTTP transport, OAuth, tools scope
- **Linear MCP Changelog** (HIGH confidence): `https://linear.app/changelog/2026-02-05-linear-mcp-for-product-management` — 2026 additions: initiatives, milestones, project updates
- **Atlassian Rovo MCP** (MEDIUM confidence): `https://www.atlassian.com/platform/remote-mcp-server` — cloud-only, OAuth 2.1, Jira + Confluence + Compass
- **Atlassian MCP GitHub** (MEDIUM confidence): `https://github.com/atlassian/atlassian-mcp-server` — official server
- **Pencil MCP Tools** (MEDIUM confidence): `https://docs.pencil.dev/getting-started/ai-integration` + memory note from project_pencil_mcp.md — 6 tools: batch_design, batch_get, get_screenshot, snapshot_layout, get_editor_state, get/set_variables
- **MCP SDK** (HIGH confidence): `https://www.npmjs.com/package/@modelcontextprotocol/sdk` — Node.js MCP server implementation
- **MCP Architecture** (HIGH confidence): `https://modelcontextprotocol.io/docs/learn/architecture` — tools vs resources vs prompts semantics
- **MCP Best Practices** (MEDIUM confidence): `https://modelcontextprotocol.info/docs/best-practices/` — tool composition, security patterns

---

*Feature research for: PDE v0.5 — MCP Server Integrations*
*Researched: 2026-03-18*
