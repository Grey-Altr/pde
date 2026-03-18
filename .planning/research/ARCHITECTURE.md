# Architecture Research: MCP Integrations for PDE v0.5

**Domain:** Claude Code plugin with external MCP server integrations
**Researched:** 2026-03-18
**Confidence:** HIGH (Claude Code plugin docs verified via official docs, MCP protocol verified, existing PDE architecture inspected directly)

---

## Focus

This document answers the v0.5 architecture question: how do MCP server integrations (GitHub, Linear, Figma, Pencil, Jira) fit into PDE's existing architecture? It maps integration points, identifies new vs modified components, documents data flows, and recommends build order. It does not re-document the base pipeline (see v1.3 research for that baseline). Everything here is about what changes, what stays the same, and in what order to build.

---

## Existing Architecture (Baseline for v0.5)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        User (Claude Code session)                     │
├──────────────────────────────────────────────────────────────────────┤
│  /pde: skills (commands/*.md)   →   workflows/*.md                    │
│  agents/*.md (via Task/Skill)   →   bin/pde-tools.cjs subcommands    │
├──────────────────────────────────────────────────────────────────────┤
│  .planning/ (file-based state)                                        │
│   STATE.md  ROADMAP.md  REQUIREMENTS.md  config.json                 │
│   design/   phases/     milestones/      debug/                       │
├──────────────────────────────────────────────────────────────────────┤
│  references/  (mcp-integration.md, skill-style-guide.md, ...)        │
│  templates/   (design-manifest.json, config.json, ...)               │
│  bin/lib/     (config.cjs, design.cjs, state.cjs, roadmap.cjs, ...)  │
└──────────────────────────────────────────────────────────────────────┘
```

Key constraints that v0.5 must respect:

- Zero new npm dependencies at the plugin root (bin/lib/*.cjs uses Node.js built-ins only).
  The MCP state server may have its own isolated `package.json` in `bin/mcp-server/`.
- All MCP integration follows the existing probe/use/degrade pattern in `references/mcp-integration.md`.
- No MCP is ever a hard requirement — all skills degrade gracefully when MCPs are unavailable.
- File-based `.planning/` is the canonical project state. External systems are read-only sources of truth for their domain. PDE never auto-writes to external systems.
- Auth tokens are managed by Claude Code (system keychain). PDE stores only connection metadata.

---

## System Overview: v0.5 Additions

```
┌──────────────────────────────────────────────────────────────────────┐
│                        User (Claude Code session)                     │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  /pde: skills  │  │  Claude Code     │  │  PDE Reference MCP   │  │
│  │  (existing)    │  │  Hooks (existing)│  │  (existing, bundled) │  │
│  └───────┬────────┘  └──────────────────┘  └──────────────────────┘  │
│          │                                                             │
│  ┌───────▼────────────────────────────────────────────────────────┐   │
│  │                  NEW: MCP Integration Layer                     │   │
│  │                                                                 │   │
│  │  commands/connect.md   → /pde:connect (NEW)                    │   │
│  │  commands/sync.md      → /pde:sync    (NEW)                    │   │
│  │  workflows/sync-*.md   → per-service sync logic (NEW)          │   │
│  │  bin/lib/mcp-bridge.cjs → connection manager (NEW)             │   │
│  │  bin/lib/mcp-config.cjs → connection metadata CRUD (NEW)       │   │
│  │  .planning/mcp-connections.json → runtime state (NEW)          │   │
│  └───────┬────────────────────────────────────────────────────────┘   │
│          │                                                             │
├──────────┼─────────────────────────────────────────────────────────── ┤
│          │              External MCP Servers                           │
│  ┌───────▼──┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────────────────┐  │
│  │  GitHub  │ │Linear│ │Figma │ │Pencil  │ │  Jira (Atlassian)    │  │
│  │  MCP     │ │  MCP │ │  MCP │ │  MCP   │ │      MCP             │  │
│  │  (HTTP)  │ │(stdio│ │(HTTP)│ │(stdio) │ │     (HTTP OAuth 2.1) │  │
│  └──────────┘ └──────┘ └──────┘ └────────┘ └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│          NEW: PDE-as-MCP-Server (optional, phase 6)                  │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  bin/mcp-server/state-server.cjs (bundled stdio server)       │   │
│  │  Exposes .planning/ state as MCP Resources + read-only Tools  │   │
│  │  Declared in .mcp.json → auto-started by Claude Code          │   │
│  └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Existing Components — Unchanged

These components are complete. v0.5 does not touch them.

| Component | Responsibility | Location |
|-----------|----------------|----------|
| All /pde: skills | Design pipeline, planning, execution, verification | `commands/*.md` + `workflows/*.md` |
| `pde-tools.cjs` | CLI for state, design, phase, milestone operations | `bin/pde-tools.cjs` |
| `bin/lib/*.cjs` | CJS modules: config, design, state, phase, roadmap, etc. | `bin/lib/` |
| `references/mcp-integration.md` | Probe/use/degrade pattern for all MCPs | `references/mcp-integration.md` |
| `.planning/` state files | STATE.md, ROADMAP.md, REQUIREMENTS.md, config.json | `.planning/` |
| `design-manifest.json` | 13-artifact coverage registry | `.planning/design/design-manifest.json` |
| Plugin hook system | PreToolUse, PostToolUse, SessionStart hooks | `.claude-plugin/plugin.json` |

### New Components (v0.5 — build these)

| Component | Responsibility | Location | Type |
|-----------|----------------|----------|------|
| `bin/lib/mcp-bridge.cjs` | Connection manager: per-server probe, auth metadata, probe caching | `bin/lib/mcp-bridge.cjs` | NEW |
| `bin/lib/mcp-config.cjs` | Connection metadata CRUD: read/write `.planning/mcp-connections.json` | `bin/lib/mcp-config.cjs` | NEW |
| `.planning/mcp-connections.json` | Runtime connection state (gitignored): connected bool, scopes, last_sync | `.planning/mcp-connections.json` | NEW |
| `commands/connect.md` | `/pde:connect` — guided MCP server setup and auth | `commands/connect.md` | NEW |
| `commands/sync.md` | `/pde:sync` — trigger on-demand syncs from external MCPs | `commands/sync.md` | NEW |
| `workflows/sync-github.md` | GitHub sync: issues → REQUIREMENTS.md, PRs → phase tracking | `workflows/sync-github.md` | NEW |
| `workflows/sync-linear.md` | Linear sync: cycles → ROADMAP.md phases, issues → tasks | `workflows/sync-linear.md` | NEW |
| `workflows/sync-jira.md` | Jira sync: issues/epics → REQUIREMENTS.md, sprint → phases | `workflows/sync-jira.md` | NEW |
| `bin/mcp-server/state-server.cjs` | PDE state MCP server: exposes .planning/ as Resources + read-only Tools | `bin/mcp-server/` | NEW |
| `bin/mcp-server/package.json` | MCP SDK dependency, isolated from plugin root | `bin/mcp-server/` | NEW |
| `.mcp.json` (project root) | Project-scoped MCP server declarations for auto-start | `.mcp.json` | NEW |

### Modified Components (v0.5 — surgical changes)

| Component | Change | Risk | Rationale |
|-----------|--------|------|-----------|
| `references/mcp-integration.md` | Add probe/use/degrade entries for GitHub, Linear, Jira, Pencil | LOW — additive only | Standard pattern; all new MCPs need entries |
| `workflows/sync-figma.md` (or extend existing Figma handling in `mcp-integration.md`) | Add bidirectional sync: component export from Figma → design artifacts | LOW | Figma MCP already partially documented; sync workflow is additive |
| `bin/pde-tools.cjs` | Add `mcp` subcommand router: `mcp connection-set`, `mcp connection-get`, `mcp list` | LOW — additive subcommand | Keeps all state operations going through pde-tools.cjs CLI |
| `bin/lib/config.cjs` | Add `mcp.*` namespace to `VALID_CONFIG_KEYS` | LOW — additive entries | Enables `/pde:settings mcp.github_sync_labels issues,requirements` |
| `.claude-plugin/plugin.json` | Add `mcpServers` field declaring the state server bundle | LOW — new JSON field | Required for Claude Code plugin auto-start of bundled MCP server |
| `skill-registry.md` | Register CON (connect) and SYN (sync) skill codes | LOW — additive rows | Required by LINT-010 skill registry rule |

### Unchanged Components (do not touch)

The 13-stage design pipeline, all design skills, the build orchestrator, agent definitions, DESIGN-STATE.md, design-manifest.json schema, and all existing hook logic require **zero modifications** for v0.5. MCP integration is additive infrastructure.

---

## Recommended Project Structure (Delta from v0.4)

Only showing what changes for v0.5. Existing structure is unchanged.

```
Platform Development Engine/
│
├── .mcp.json                           # NEW — project-scoped MCP declarations
│                                       # Declares state-server bundle; committed to git
│
├── bin/
│   ├── pde-tools.cjs                   # MODIFIED — adds 'mcp' subcommand group
│   ├── lib/
│   │   ├── mcp-bridge.cjs              # NEW — external MCP connection manager
│   │   ├── mcp-config.cjs              # NEW — connection metadata CRUD
│   │   └── [existing lib modules unchanged]
│   └── mcp-server/                     # NEW — isolated PDE state server
│       ├── state-server.cjs            # MCP server: Resources + Tools over .planning/
│       └── package.json                # @modelcontextprotocol/sdk dep (isolated)
│
├── commands/
│   ├── connect.md                      # NEW — /pde:connect
│   ├── sync.md                         # NEW — /pde:sync
│   └── [existing commands unchanged]
│
├── workflows/
│   ├── sync-github.md                  # NEW — GitHub issues/PRs → .planning/
│   ├── sync-linear.md                  # NEW — Linear cycles/issues → .planning/
│   ├── sync-jira.md                    # NEW — Jira issues/epics → .planning/
│   └── [existing workflows unchanged]
│
├── references/
│   ├── mcp-integration.md              # MODIFIED — add GitHub/Linear/Jira/Pencil entries
│   └── [existing references unchanged]
│
├── .claude-plugin/
│   └── plugin.json                     # MODIFIED — add mcpServers field
│
└── .planning/
    ├── mcp-connections.json            # NEW — gitignored; runtime connection metadata
    └── [existing .planning/ structure unchanged]
```

### Structure Rationale

- **`.mcp.json` at plugin root:** Claude Code's native project-scoped MCP config format. Checked into git so all team members who install PDE auto-get the state server declared. Uses `${CLAUDE_PLUGIN_ROOT}` for the server path. Carries no auth tokens — safe to commit.
- **`bin/lib/mcp-bridge.cjs`:** Follows the existing CommonJS module pattern. Mirrors how `design.cjs` centralizes the design pipeline infrastructure. Workflows invoke it via `pde-tools.cjs mcp *` — never importing CJS modules directly from `.md` files.
- **`bin/mcp-server/`:** Isolated subdirectory. Its own `package.json` adds `@modelcontextprotocol/sdk` without polluting the plugin root's zero-npm-dependency constraint. The state server is a separate process, not part of pde-tools.cjs.
- **`.planning/mcp-connections.json`:** Gitignored alongside `mcp-debug.log`. Contains only metadata (connected bool, scopes, last_sync timestamp) — never raw tokens. Auth tokens stay in Claude Code's system keychain.

---

## Architectural Patterns

### Pattern 1: Probe/Use/Degrade Extended for New MCPs

**What:** The existing `references/mcp-integration.md` probe/use/degrade structure applies without modification to GitHub, Linear, Jira, and Pencil. Each new server gets an entry in that reference file following the exact same structure as Figma, Playwright, and Axe entries.

**When to use:** Every external MCP integration. No exceptions.

**Trade-offs:** Consistent with existing patterns — zero cognitive overhead for skill authors. Adds ~40 lines per MCP to the reference file. Worth it for predictability and `--no-mcp` compliance.

**Example new entry structure in `mcp-integration.md`:**

```markdown
### GitHub MCP

**Purpose:** Read GitHub issues, PRs, code search for planning sync.
**URL:** https://api.githubcopilot.com/mcp/
**Transport:** HTTP (streamable-http)
**Auth:** OAuth via Claude Code /mcp command
**Stability:** STABLE

#### Probe
Attempt: mcp__github__list_issues (scoped to current project repo)
  Timeout: 15 seconds
  Result:
    - Returns issue list: GITHUB_MCP_AVAILABLE = true
    - Not found / auth error / timeout: GITHUB_MCP_AVAILABLE = false

#### Enhancement Recipes
**Requirements sync** (/pde:sync --github):
  1. Read open issues labelled "requirements" or "pde-req"
  2. Map issue title + body to REQUIREMENTS.md format
  3. Append new requirements, skip duplicates
  4. Tag: [Synced from GitHub MCP — {N} issues imported]

#### Degradation
When unavailable:
  - Display manual entry instructions for REQUIREMENTS.md
  - Tag: [GitHub sync unavailable -- run /pde:connect github]
```

### Pattern 2: Unidirectional Pull (Primary Sync Direction)

**What:** Data flows from external systems into `.planning/` files. External systems own their domain data. PDE translates it into file-based state. `.planning/` never auto-writes back to external systems.

**When to use:** All sync operations: GitHub issues → REQUIREMENTS.md, Linear cycles → ROADMAP.md phases, Figma frames → design artifacts, Pencil canvas → design artifacts.

**Trade-offs:** Prevents accidental overwrites of external systems during planning. Keeps `.planning/` as the single source of truth for PDE purposes. Bidirectional live sync adds conflict resolution complexity — defer until a specific need is validated.

**Data flow:**
```
GitHub Issues  ──────────────►  .planning/REQUIREMENTS.md
Linear Cycles  ──────────────►  .planning/ROADMAP.md (new phase entries)
Figma Frames   ──────────────►  .planning/design/visual/
Pencil Canvas  ──────────────►  .planning/design/ux/
                                (existing .planning/ structure, unchanged)
```

### Pattern 3: Explicit Write-Back (Opt-In Only, with Confirmation)

**What:** Writing PDE state back to external systems requires an explicit user command with a confirmation prompt. Never automatic, never triggered by syncing or planning operations.

**When to use:** Creating a GitHub PR after phase completion, updating a Linear issue status to "completed", pushing design tokens to Figma.

**Trade-offs:** Less automation than full bidirectional sync. More safety and trust. Correct for a planning tool — silent mutations to external systems break the user contract.

**Implementation:** Every write-back step includes a confirmation gate:
```
About to create GitHub PR for phase 3 completion.
  Title: "feat: phase 3 — auth system"
  Repo: your-org/your-repo
  Base: main
  Proceed? (yes / no)
```

### Pattern 4: PDE State Server (Thin Read-Only Resources)

**What:** `bin/mcp-server/state-server.cjs` is a bundled stdio MCP server that exposes `.planning/` state as MCP Resources and a small set of read-only Tools. Other Claude sessions, future agents, or external dashboards can query PDE project state without parsing markdown directly.

**When to use:** When building the state server. When external tooling needs structured project state.

**Trade-offs:** New process to manage. Bundled as a plugin MCP server (auto-started) — no manual lifecycle management. The server must be read-only to prevent a second write path diverging from `pde-tools.cjs`.

**Resources to expose (MVP):**
```
pde://project/state         →  STATE.md parsed as JSON: {phase, milestone, status}
pde://project/roadmap       →  ROADMAP.md phases as [{number, title, status, pct}]
pde://project/requirements  →  REQUIREMENTS.md as [{id, description, status}]
pde://project/design/status →  design-manifest.json coverage summary
```

**Tools to expose (MVP):**
```
pde_get_phase_status(phase_number)   →  {status, completion_pct, summary_path}
pde_get_current_milestone()          →  {name, progress, phase_count}
pde_list_requirements(status?)       →  filtered requirements list
```

**Hard constraint:** The state server NEVER writes to `.planning/`. All mutations go through `pde-tools.cjs`. The server is a read-only view layer.

---

## Data Flow

### MCP Sync Flow (External → .planning/)

```
User: /pde:sync --github
    ↓
workflows/sync-github.md
    ↓
Check --no-mcp flag → if set: display manual instructions, halt
    ↓
Probe: mcp__github__list_issues
    ↓ success                       ↓ failure
Parse issues                    Degrade: display manual entry instructions
Map to REQUIREMENTS.md format   Log: {timestamp} | SYN | github | probe | failure
    ↓
Acquire write lock (standard pde-tools.cjs pattern)
    ↓
Read existing REQUIREMENTS.md to detect duplicates
    ↓
Append {N} new requirements, skip existing
    ↓
Release write lock
    ↓
pde-tools.cjs mcp connection-set github last_sync={timestamp}
    ↓
Display: "Synced {N} new issues from GitHub → .planning/REQUIREMENTS.md"
```

### MCP Write-Back Flow (.planning/ → External, Explicit)

```
User: /pde:sync --github --push-pr
    ↓
workflows/sync-github.md (write-back branch)
    ↓
Read current phase from STATE.md
    ↓
Prompt: "Create GitHub PR for phase {N}? Title: '...' Base: main (yes/no)"
    ↓ yes
mcp__github__create_pull_request
    ↓
Append PR URL to .planning/phases/{N}/VERIFICATION.md
    ↓
Display: "PR created: {url}"
```

### PDE State Server Resource Flow

```
External client requests: pde://project/roadmap
    ↓
state-server.cjs receives resource read request
    ↓
Read .planning/ROADMAP.md (file read, no lock needed — read-only server)
    ↓
Parse phases using roadmap.cjs parser logic
    ↓
Return: [{phase: 1, title: "...", status: "complete", pct: 100}, ...]
    ↓
Client receives structured roadmap JSON
```

### MCP Connection Setup Flow

```
User: /pde:connect github
    ↓
commands/connect.md → workflows/connect.md
    ↓
pde-tools.cjs mcp connection-get github
    ↓ not connected                   ↓ already connected
Display connection instructions:      Display current status + last_sync
"Run in terminal:                      Offer re-auth option
  claude mcp add --transport http
  github https://api.githubcopilot.com/mcp/"
    ↓
"Then authenticate: /mcp → Authenticate → GitHub"
    ↓
pde-tools.cjs mcp connection-set github connected=true
    ↓
Probe: mcp__github__list_issues (test call)
    ↓
Display: "GitHub MCP connected. {N} repos accessible."
```

---

## Integration Points: New vs Modified — Explicit Inventory

### New Files (create from scratch)

| File | Purpose | Blocked on |
|------|---------|-----------|
| `bin/lib/mcp-config.cjs` | Connection metadata CRUD | Nothing |
| `bin/lib/mcp-bridge.cjs` | External MCP connection manager | `mcp-config.cjs` |
| `.planning/mcp-connections.json` | Runtime connection state (gitignored) | `mcp-config.cjs` init |
| `commands/connect.md` | `/pde:connect` skill stub | `pde-tools.cjs mcp subcommand` |
| `commands/sync.md` | `/pde:sync` skill stub | `pde-tools.cjs mcp subcommand` |
| `workflows/sync-github.md` | GitHub sync workflow | `connect.md`, `mcp-integration.md` GitHub entry |
| `workflows/sync-linear.md` | Linear sync workflow | `connect.md`, `mcp-integration.md` Linear entry |
| `workflows/sync-jira.md` | Jira sync workflow | `connect.md`, `mcp-integration.md` Jira entry |
| `bin/mcp-server/state-server.cjs` | PDE state MCP server | `bin/lib/{roadmap,state}.cjs` (existing) |
| `bin/mcp-server/package.json` | `@modelcontextprotocol/sdk` dep | `state-server.cjs` |
| `.mcp.json` | Project-scoped MCP declarations | `state-server.cjs` path confirmed |

### Modified Files (change existing)

| File | Change | Lines Affected | Risk |
|------|--------|---------------|------|
| `bin/pde-tools.cjs` | Add `mcp` subcommand router to command dispatch | ~20 lines | LOW |
| `bin/lib/config.cjs` | Add `mcp.*` keys to `VALID_CONFIG_KEYS` | ~5 lines | LOW |
| `references/mcp-integration.md` | Add entries: GitHub, Linear, Jira, Pencil | ~160 lines (4 × ~40 lines) | LOW — additive |
| `.claude-plugin/plugin.json` | Add `mcpServers` field | ~8 lines | LOW |
| `skill-registry.md` | Add CON, SYN skill codes | ~2 rows | LOW |

### Untouched Files (do not modify)

Every existing command, workflow, agent, template, reference, and bin module except those listed above. The design pipeline is complete and stable. Zero regressions are acceptable.

---

## External MCP Server Reference

| Service | MCP Package/URL | Transport | Auth Method | Key Operations for PDE |
|---------|----------------|-----------|-------------|------------------------|
| GitHub | `https://api.githubcopilot.com/mcp/` | HTTP streamable | OAuth 2.0 via `/mcp` | list_issues, create_pull_request, search_code, list_commits |
| Linear | `npx -y @linear/mcp-server --env LINEAR_API_KEY=...` | stdio | API key (`--env`) | list_issues, list_projects, update_issue, list_cycles |
| Figma | `https://mcp.figma.com/mcp` | HTTP | Figma OAuth via `/mcp` | get_variable_defs, get_component_info, read_design_file |
| Pencil.dev | Local stdio (auto-started by Pencil.dev app) | stdio | None (local process) | read_canvas_frame, get_design_tokens, get_component_tree |
| Jira (Atlassian) | `https://mcp.atlassian.com/` (remote) | HTTP OAuth 2.1 | OAuth 2.1 via `/mcp` | get_issue, create_issue, update_issue, search_issues |

---

## Scaling Considerations

| Concern | Current (v0.4) | v0.5 Impact | Mitigation |
|---------|---------------|-------------|------------|
| Context window per skill | ~600-800 lines per skill; references loaded via `@` | mcp-integration.md grows by ~160 lines; loaded by sync workflows only | Sync workflows load only the relevant MCP entry, not the full reference |
| MCP tool count in context | 7 MCPs currently; Tool Search auto-enabled at 10% threshold | 4–6 new MCPs → ~11 total; Tool Search handles this | Claude Code's ENABLE_TOOL_SEARCH=auto handles deferral; no PDE changes needed |
| Auth token management | N/A | Each external MCP may require separate OAuth flows | Claude Code manages all tokens; PDE only tracks metadata |
| State server process | N/A | New stdio process auto-started with session | Bundled plugin server — auto lifecycle via Claude Code; CLAUDE_PLUGIN_ROOT path used |

### Scaling Priorities

1. **First bottleneck:** MCP tool context consumption. 11 active MCP servers with full tool lists can consume 40%+ of context window before any work happens. Mitigated by Claude Code's MCP Tool Search (lazy loading) and `--no-mcp` on all skills. No PDE-side changes needed.

2. **Second bottleneck:** `mcp-connections.json` becoming a maintenance liability as more servers are added. Keep it simple — one record per server, no session state. The file is read at sync time, not held in memory.

---

## Anti-Patterns

### Anti-Pattern 1: Bidirectional Auto-Sync

**What people do:** Set up live two-way sync between `.planning/` files and external systems — auto-push every REQUIREMENTS.md edit to GitHub Issues.

**Why it's wrong:** File-based state and remote API state have different clocks, formats, and ownership semantics. Auto-sync creates silent conflicts. Also violates user trust — mutating external systems without explicit action breaks the "I control what gets pushed" contract.

**Do this instead:** Unidirectional pull (external → .planning/) on demand via `/pde:sync`. Explicit opt-in write-back with confirmation per Pattern 3.

### Anti-Pattern 2: MCP as a Required Dependency

**What people do:** Make `/pde:sync` fail entirely when the MCP server is unavailable, or skip writing `.planning/` files because the probe failed.

**Why it's wrong:** Breaks the existing probe/use/degrade contract in `mcp-integration.md`. All PDE skills must work with `--no-mcp`. MCP enriches; it never gates.

**Do this instead:** When probe fails: display manual instructions for achieving the same result (edit REQUIREMENTS.md directly), log the failure, exit cleanly.

### Anti-Pattern 3: Duplicating Connection Logic Across Workflows

**What people do:** Each sync workflow independently reads auth metadata and tests connections.

**Why it's wrong:** Three sync workflows with three copies of connection logic produces three different timeout/retry behaviors. Auth state inconsistency across workflows.

**Do this instead:** All connection state reads and writes go through `pde-tools.cjs mcp connection-*` commands. `mcp-bridge.cjs` owns the probe logic. Workflows invoke it via CLI.

### Anti-Pattern 4: Storing Auth Tokens in `.planning/`

**What people do:** Write GitHub PATs, Linear API keys, or OAuth access tokens to `mcp-connections.json` or any `.planning/` file.

**Why it's wrong:** `.planning/` is git-tracked (or at minimum readable by anyone with project access). Tokens in plaintext are a security breach.

**Do this instead:** Let Claude Code manage token storage (system keychain on macOS). `mcp-connections.json` stores only: `{server: "github", connected: true, scopes: ["repo", "issues"], last_sync: "2026-03-18T14:00:00Z"}`.

### Anti-Pattern 5: Fat State Server with Write Operations

**What people do:** Build a full CRUD API into the state server — tools to update STATE.md, write new requirements, modify phases.

**Why it's wrong:** Creates a second write path that diverges from `pde-tools.cjs`. State mutations through the MCP server bypass all the validation, lock acquisition, and manifest update logic in `bin/lib/*.cjs`.

**Do this instead:** State server is read-only. Resources: parsed views of `.planning/` files. Tools: narrow query operations returning structured data. All mutations: `pde-tools.cjs` CLI as always.

---

## Build Order for v0.5

Dependencies determine the order. Each layer must be complete before the next.

```
Phase 1: Foundation Infrastructure
  ├── bin/lib/mcp-config.cjs              (no deps — pure CRUD for mcp-connections.json)
  ├── bin/lib/mcp-bridge.cjs              (deps: mcp-config.cjs)
  ├── pde-tools.cjs 'mcp' subcommand      (deps: mcp-bridge.cjs, mcp-config.cjs)
  └── bin/lib/config.cjs: mcp.* keys      (no deps — additive)

  Rationale: Every sync workflow and the connect skill invoke mcp-bridge via pde-tools.cjs.
  The CLI surface must exist before any workflow can be written or tested.

Phase 2: Connection Management + Reference Updates
  ├── commands/connect.md + workflows/connect.md   (deps: pde-tools.cjs mcp subcommand)
  ├── skill-registry.md CON + SYN entries           (no deps — documentation)
  └── references/mcp-integration.md: new entries    (no code deps — documentation)
      (GitHub, Linear, Jira, Pencil — 4 entries)

  Rationale: Users must be able to connect servers before sync workflows are useful.
  Reference entries must exist before sync workflows can cite the probe/degrade patterns.

Phase 3: GitHub Integration
  ├── workflows/sync-github.md            (deps: connect.md, mcp-integration.md GitHub entry)
  └── commands/sync.md --github           (deps: sync-github.md)

  Rationale: GitHub is highest-value (most users have GitHub). Highest signal-to-noise
  integration to validate the sync pattern on. Build the pattern here, replicate for Linear/Jira.

Phase 4: Linear + Jira Integration
  ├── workflows/sync-linear.md            (deps: connect.md, mcp-integration.md Linear entry)
  ├── workflows/sync-jira.md              (deps: connect.md, mcp-integration.md Jira entry)
  └── commands/sync.md --linear --jira    (deps: sync-linear.md, sync-jira.md)

  Rationale: After GitHub validates the sync pattern, Linear and Jira follow the same template.
  Build in parallel within the phase (independent workflows).

Phase 5: Design Tool Integration (Figma + Pencil)
  ├── mcp-integration.md Figma update      (expand existing Figma patterns for sync)
  ├── mcp-integration.md Pencil entry      (new entry following GitHub pattern)
  ├── workflows/sync-figma.md              (deps: updated Figma mcp-integration.md entry)
  └── commands/sync.md --figma --pencil    (deps: sync-figma.md)

  Rationale: Figma has partial support in mcp-integration.md already. Pencil is new.
  Design tool sync is more complex (visual artifacts vs text) — do after text-based syncs
  validate the pattern. Build in parallel within the phase.

Phase 6: PDE-as-MCP-Server
  ├── bin/mcp-server/package.json          (no deps — npm init with @modelcontextprotocol/sdk)
  ├── bin/mcp-server/state-server.cjs      (deps: existing bin/lib/{roadmap,state}.cjs parsers)
  ├── .mcp.json                            (deps: state-server.cjs path confirmed)
  └── .claude-plugin/plugin.json update    (deps: .mcp.json structure confirmed)

  Rationale: State server is additive value — other tools can query PDE state — but not
  blocking for any of the sync integrations. Build last, validate it doesn't affect existing
  plugin behavior.

Phase 7: End-to-End Validation
  └── Pressure test: connect 2+ servers, run full sync, verify .planning/ state, verify
      state server resources, verify --no-mcp degradation, verify write-back confirmation flow.
```

**Why this order:** Infrastructure before workflows (can't test sync without a connection layer). GitHub before Linear/Jira (validates the pattern on the most-used service). Text-based syncs before design syncs (simpler, validates the approach). State server last (additive, not blocking).

---

## Sources

- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) — HIGH confidence; official; fetched 2026-03-18. Key facts: plugin MCP servers via `.mcp.json` + `plugin.json mcpServers`, three scope levels (local/project/user), OAuth 2.0 support, MCP Tool Search auto-enabled at 10% threshold.
- [MCP Build Server Guide](https://modelcontextprotocol.io/docs/develop/build-server) — HIGH confidence; official MCP protocol docs. Resources vs Tools vs Prompts primitives.
- [GitHub MCP Server](https://github.com/github/github-mcp-server) — HIGH confidence; official GitHub repo. Toolsets: repos, issues, pull_requests, actions, code_security.
- [Figma MCP Server Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server) — HIGH confidence; official Figma docs. Read: design context, variables, components. Write: send live UI to Figma.
- [Linear MCP Server](https://www.builder.io/blog/linear-mcp-server) — MEDIUM confidence; verified against Linear official install docs. stdio transport, LINEAR_API_KEY env var.
- [Atlassian MCP Server](https://github.com/atlassian/atlassian-mcp-server) — HIGH confidence; official Atlassian repo. Remote HTTP, OAuth 2.1, Jira + Confluence + Compass.
- [Pencil.dev MCP](https://atalupadhyay.wordpress.com/2026/02/25/pencil-dev-claude-code-workflow-from-design-to-production-code-in-minutes/) — MEDIUM confidence; community doc, consistent with pencil.dev official feature description. Local stdio, auto-started, read canvas frames.
- Existing PDE codebase (direct inspection): `references/mcp-integration.md`, `bin/pde-tools.cjs`, `bin/lib/design.cjs`, `bin/lib/config.cjs`, `.claude-plugin/plugin.json`, `commands/recommend.md`, `workflows/recommend.md` — HIGH confidence.

---

*Architecture research for: PDE v0.5 — MCP server integrations*
*Researched: 2026-03-18*
