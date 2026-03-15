# Architecture Research

**Domain:** AI-powered product development platform (Claude Code plugin, fork-based)
**Researched:** 2026-03-14
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Entry Points                            │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐   │
│  │  /pde:command  │  │  Slash Command │  │  Direct Invocation  │   │
│  │  (plugin mode) │  │  (via Claude)  │  │  (future CLI mode)  │   │
│  └───────┬────────┘  └───────┬────────┘  └──────────┬──────────┘   │
└──────────┼────────────────────┼────────────────────────┼────────────┘
           │                    │                        │
┌──────────▼────────────────────▼────────────────────────▼────────────┐
│                         Workflow Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ new-project  │  │  plan-phase  │  │execute-phase │  (29 total)  │
│  │ (Markdown)   │  │  (Markdown)  │  │  (Markdown)  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │ spawns          │ spawns           │ spawns               │
└─────────┼─────────────────┼──────────────────┼─────────────────────┘
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼─────────────────────┐
│                         Agent Layer                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Researcher   │  │   Planner    │  │   Executor   │              │
│  │ (subagent)   │  │  (subagent)  │  │  (subagent)  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Verifier    │  │ Plan-Checker │  │  Roadmapper  │              │
│  │  (subagent)  │  │  (subagent)  │  │  (subagent)  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │ reads/writes via
┌─────────────────────────────────────▼───────────────────────────────┐
│                         Tooling Layer                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  pde-tools.cjs (bin script)                                   │   │
│  │  Commands: init, state, config, phase, roadmap, commit, ...   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│  │  lib/core.cjs  │  │  lib/state.cjs │  │  lib/roadmap.cjs   │    │
│  └────────────────┘  └────────────────┘  └────────────────────┘    │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │ reads from / writes to
┌─────────────────────────────────────▼───────────────────────────────┐
│                         Content Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  templates/  │  │  references/ │  │  .planning/  │              │
│  │  (per-agent  │  │  (shared     │  │  (project    │              │
│  │   scaffolds) │  │   knowledge) │  │   artifacts) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Config Layer                                  │
│  ~/.pde/defaults.json           (global user defaults)               │
│  .planning/config.json          (project-level config)               │
│  .claude-plugin/plugin.json     (plugin metadata/identity)           │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Workflows | Orchestrate multi-step processes; spawn agents; handle user interaction | Markdown files with embedded process logic, read by Claude |
| Agents | Single-purpose AI workers spawned by workflows; produce specific artifacts | Markdown prompt files defining a specialized subagent persona |
| Bin script (pde-tools.cjs) | All stateful side effects: git commits, file scaffolding, config reads, state mutations | Single Node.js CLI, modular lib/ subdirectory |
| Templates | Per-artifact scaffolding; define structure downstream agents must fill | Markdown files with placeholder sections; one per artifact type |
| References | Shared knowledge injected into agent context as needed | Short Markdown files on specific topics (TDD, git, model profiles) |
| Config system | Resolve model profiles, workflow settings, project-level overrides | JSON at two levels (global defaults, per-project) |
| Plugin manifest | Declares plugin identity, version, namespace to Claude Code host | `.claude-plugin/plugin.json` |
| .planning/ | All project artifacts created during a project's lifecycle | Markdown files: PROJECT.md, ROADMAP.md, STATE.md, phase dirs |

## Recommended Project Structure

```
pde/                              # Plugin root (fork of get-shit-done/)
├── .claude-plugin/
│   └── plugin.json               # Plugin identity; name = namespace prefix
├── workflows/                    # Slash command implementations (~29 files)
│   ├── new-project.md
│   ├── plan-phase.md
│   ├── execute-phase.md
│   ├── verify-phase.md
│   └── ... (all other commands)
├── bin/
│   ├── pde-tools.cjs             # Single-entry CLI (renamed from gsd-tools.cjs)
│   └── lib/                      # Modular helpers
│       ├── core.cjs
│       ├── state.cjs
│       ├── config.cjs
│       ├── phase.cjs
│       ├── roadmap.cjs
│       ├── milestone.cjs
│       ├── init.cjs
│       ├── template.cjs
│       ├── verify.cjs
│       └── frontmatter.cjs
├── templates/                    # Artifact scaffolds
│   ├── project.md
│   ├── roadmap.md
│   ├── state.md
│   ├── context.md
│   ├── phase-prompt.md
│   ├── research-project/         # Per-dimension research templates
│   │   ├── SUMMARY.md
│   │   ├── STACK.md
│   │   ├── FEATURES.md
│   │   ├── ARCHITECTURE.md
│   │   └── PITFALLS.md
│   └── ... (all other templates)
├── references/                   # Shared knowledge fragments
│   ├── model-profiles.md
│   ├── planning-config.md
│   ├── git-integration.md
│   ├── tdd.md
│   └── ... (all other references)
└── VERSION                       # Semver string
```

### Structure Rationale

- **workflows/:** Each file is one slash command. Workflows orchestrate; they do not implement logic inline. Side effects always delegate to bin/pde-tools.cjs.
- **bin/:** The only place that runs shell side effects. All git operations, file system scaffolding, config parsing, and state mutations go here. Centralization prevents the sprawling inline bash that plagued earlier CLIs.
- **templates/:** Artifacts have exact shapes that downstream agents must produce. Templates encode those shapes. Agents fill templates rather than inventing structure, ensuring consistency across the pipeline.
- **references/:** Short, topic-scoped knowledge files injected into agent context on demand. Avoids bloating every agent prompt with the full reference set.
- **.claude-plugin/:** Only the plugin manifest lives here. All functional directories are at the plugin root. This is the Claude Code plugin spec requirement.

## Architectural Patterns

### Pattern 1: Workflow-as-Orchestrator

**What:** Workflows (slash commands) contain zero implementation logic. They collect user intent, resolve config, spawn agents, and display results. All side effects delegate to bin/pde-tools.cjs. All AI work delegates to subagent Tasks.

**When to use:** Every workflow command follows this pattern without exception.

**Trade-offs:** Slightly more indirection than inline logic, but dramatically simpler debugging. Each layer is independently testable. Workflows can be rewritten without touching tooling or agents.

**Example:**
```markdown
# In a workflow file:
1. Run init check via pde-tools.cjs → parse JSON
2. Ask user questions via AskUserQuestion
3. Spawn agent via Task(prompt="...", subagent_type="pde-planner")
4. Commit artifacts via pde-tools.cjs commit
5. Display results to user
```

### Pattern 2: Subagent Specialization

**What:** Each agent role has a single responsibility. Researchers research. Planners plan. Executors execute. Verifiers verify. No agent does two jobs. Model selection per agent is controlled by profile config, not hardcoded.

**When to use:** Every Task() call spawns a named subagent type. Never run complex multi-step AI work in the orchestrating context window.

**Trade-offs:** More files and agent types to maintain. Payoff: each agent's context is clean and focused, dramatically reducing cross-contamination errors. Parallel execution becomes safe because agents are isolated.

**Example:**
```markdown
# Spawn 4 parallel researchers:
Task(prompt="...", subagent_type="pde-project-researcher", description="Stack research")
Task(prompt="...", subagent_type="pde-project-researcher", description="Features research")
Task(prompt="...", subagent_type="pde-project-researcher", description="Architecture research")
Task(prompt="...", subagent_type="pde-project-researcher", description="Pitfalls research")
# Then spawn synthesizer after all 4 complete
```

### Pattern 3: Template-Driven Artifact Production

**What:** Every persistent artifact (PLAN.md, SUMMARY.md, CONTEXT.md, ROADMAP.md) has a canonical template. Agents receive the template path via `<output>` blocks. Templates define structure; agents fill content. Bin script scaffolding creates blank templates; agents populate them.

**When to use:** Any time an agent produces a file that downstream agents will read.

**Trade-offs:** Requires template maintenance alongside agent prompts. Payoff: downstream agents can rely on structural invariants. Verification becomes mechanical (check for required sections) rather than inferential.

### Pattern 4: Two-Level Config Resolution

**What:** Configuration exists at two levels. Global defaults live at `~/.pde/defaults.json`. Project config lives at `.planning/config.json`. Project always wins. Config drives: model profile, workflow agent toggles, granularity, git strategy, parallelization.

**When to use:** Any time a workflow needs to make a capability decision (which model, parallel or sequential, commit or not).

**Trade-offs:** Two places to look for config. Payoff: users can set defaults once and override per project.

## Data Flow

### New Project Flow

```
User invokes /pde:new-project
    ↓
pde-tools.cjs init new-project → JSON (project state, model resolution)
    ↓
Workflow: Deep questioning (AskUserQuestion loops)
    ↓
Workflow: Write .planning/PROJECT.md
    ↓
pde-tools.cjs commit "docs: initialize project"
    ↓
Workflow: Config questions → .planning/config.json
    ↓
Workflow: Spawn 4 parallel researcher Tasks
    ↓ (parallel)
Agents write: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
    ↓ (join)
Spawn synthesizer → writes SUMMARY.md
    ↓
Workflow: Present features, user scopes requirements
    ↓
Workflow writes .planning/REQUIREMENTS.md
    ↓
pde-tools.cjs commit "docs: define v1 requirements"
    ↓
Spawn gsd-roadmapper → writes ROADMAP.md + STATE.md
    ↓
User approves → pde-tools.cjs commit "docs: create roadmap"
```

### Phase Execution Flow

```
User invokes /pde:execute-phase N
    ↓
pde-tools.cjs init execute-phase N → JSON
    ↓
Read ROADMAP.md section for phase N
    ↓
Spawn pde-phase-researcher (if research=true in config)
    ↓
Spawn pde-planner → writes PLAN.md files
    ↓
Spawn pde-plan-checker (if plan_check=true in config)
    ↓
Execute plans (sequential or parallel per config)
    ↓ (per plan)
Spawn pde-executor → writes code, writes SUMMARY.md
    ↓ (join)
Spawn pde-verifier (if verifier=true in config)
    ↓
pde-tools.cjs phase complete N → updates STATE.md + ROADMAP.md
    ↓
pde-tools.cjs commit "feat: complete phase N"
```

### State Management

```
.planning/STATE.md  (frontmatter + body)
    ↓ read via
pde-tools.cjs state load / state json
    ↓ consumed by
Workflows → resolve current phase, plan index, completion status
    ↓ written via
pde-tools.cjs state update <field> <value>
pde-tools.cjs state patch --field val ...
    ↓ committed via
pde-tools.cjs commit
```

### Key Data Flows

1. **Config → Agent model selection:** `config.json` model_profile → `pde-tools.cjs resolve-model <agent-type>` → model string passed to Task() call
2. **Template → Agent → Artifact:** Template path passed in agent prompt → agent reads template structure → agent writes populated file → downstream agent reads file
3. **State → Workflow routing:** `STATE.md` current phase/plan → workflow knows what to execute next → prevents double-execution
4. **Reference injection:** Workflow includes `<required_reading>` block → agent reads named reference files before starting → context scoped to what's needed

## Scaling Considerations

This is a developer tool, not a service. "Scaling" means handling larger projects and more complex workflows, not request volume.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user, small project | Default config: sequential, balanced model profile, no branching |
| Single user, large project | Fine granularity, parallel execution, milestone branching strategy |
| Team use (shared plugin) | Plugin distribution via marketplace; per-project config.json overrides team defaults |
| Standalone CLI mode (post-v1) | pde-tools.cjs already a standalone Node CLI; extend with provider abstraction layer over Claude API |

### Scaling Priorities

1. **First bottleneck:** Context window exhaustion during large phases. Mitigation: subagent isolation (each agent gets its own context), aggressive use of references over inline content.
2. **Second bottleneck:** Token cost on large projects. Mitigation: model profile system already addresses this; budget profile uses Haiku for read-only tasks.

## Anti-Patterns

### Anti-Pattern 1: Inline Side Effects in Workflows

**What people do:** Write `git commit` and file manipulation commands directly inside workflow Markdown files.

**Why it's wrong:** Duplicates logic across ~29 files. Any change (e.g., checking `commit_docs` flag) requires editing every file that commits. Proven painful in GSD's history — the bin script was created specifically to address this.

**Do this instead:** All side effects go through `pde-tools.cjs`. Workflow invokes the CLI command; CLI handles the logic. One place to update when behavior changes.

### Anti-Pattern 2: Agent Doing Multiple Jobs

**What people do:** Spawn one "planning" agent that researches, plans, checks, and executes.

**Why it's wrong:** Context cross-contamination. Research findings corrupt execution instructions. Errors in one phase corrupt the entire context. Cannot parallelize or independently retry.

**Do this instead:** One agent type per responsibility. Researcher only researches. Planner only plans. Results flow forward as files, not as context state.

### Anti-Pattern 3: Hardcoding Model Names

**What people do:** Write `Task(model="claude-opus-4-5")` directly in workflow files.

**Why it's wrong:** Model names change. User's account may not have access to a specific model version. Cannot apply budget vs quality profiles. Every update requires editing all workflow files.

**Do this instead:** Resolve via `pde-tools.cjs resolve-model <agent-type>` at runtime. Config-driven. Works across accounts, versions, and user preferences.

### Anti-Pattern 4: Inventing Artifact Structure Per-Agent

**What people do:** Let each agent invent its own output format for plans, summaries, etc.

**Why it's wrong:** Downstream agents cannot reliably parse or depend on upstream outputs. Verification becomes impossible. Integration between phases breaks.

**Do this instead:** Every artifact has a template. Agent receives the template path and must produce output matching that structure. Templates are the contract between agents.

### Anti-Pattern 5: Conflating Plugin Identity with GSD Identity During Fork

**What people do:** Change `plugin.json` name but leave all internal path references, banners, and config keys pointing to the original namespace.

**Why it's wrong:** Users see a mix of old and new branding. Config keys like `~/.gsd/defaults.json` conflict with the new `~/.pde/defaults.json`. Debugging becomes confusing.

**Do this instead:** Identify every string surface (banners, file paths, config keys, error messages, binary path in workflows) and update systematically. The bin script path is embedded in every workflow file — this is the most critical surface to update.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude Code (host) | Plugin manifest + skills directory; `commands/` for slash commands | Plugin namespace determines command prefix: `/pde:` |
| Claude API (agents) | Task() calls from within Claude Code context | Model resolved from config before each Task call |
| Git | Delegated entirely to pde-tools.cjs bin script | Workflow files never call git directly |
| Brave Search API | Optional; pde-tools.cjs `websearch` command wraps it | Falls back to built-in WebSearch tool if not configured |
| MCP servers (post-v1) | `.mcp.json` at plugin root; per-plugin MCP declarations | Claude Code loads MCP servers declared in plugin |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Workflow → Agent | Task() call with inline prompt string; agent writes output files | Prompt includes file paths to read and write; no shared memory |
| Workflow → Tooling | Shell invocation of pde-tools.cjs; JSON response parsed from stdout | The `@file:` prefix pattern handles large responses via temp files |
| Agent → Agent | Files on disk (`.planning/` directory) | Agents never call each other directly; workflow orchestrates sequencing |
| Workflow → Config | pde-tools.cjs init commands return full config as JSON | Single source of truth; workflows don't parse config.json directly |
| Template → Agent | File path passed in agent prompt `<output>` block | Agent reads template, fills structure, writes result |

## Build Order Implications

The component dependency graph for PDE v1 (fork/rename):

```
plugin.json (identity)
    ↓ must exist first
bin/pde-tools.cjs (tooling)
    ↓ workflows depend on correct binary path
workflows/ (all 29 files reference $HOME/.claude/pde/bin/pde-tools.cjs)
    ↓ templates and references support workflows
templates/ + references/
    ↓ config drives behavior
config system (~/.pde/defaults.json path, config.json keys)
```

**Rename sequence for v1:**
1. Update `plugin.json` name field first (establishes `/pde:` namespace)
2. Update `bin/gsd-tools.cjs` → `bin/pde-tools.cjs` (rename file and all internal strings)
3. Update all 29 workflow files: binary path references, banner text, command names
4. Update templates: any GSD-branded strings in template scaffolds
5. Update references: any GSD-branded strings in reference files
6. Update config paths: `~/.gsd/` → `~/.pde/` (in bin script init logic)
7. Verify end-to-end: install plugin, run new-project, verify no GSD strings appear

**Post-v1 build order (future milestones):**
- MCP server integration: add `.mcp.json`; no changes to existing components
- Standalone CLI: extract bin/pde-tools.cjs into distributable; add provider abstraction
- Design pipeline: new workflow files + new agent types; existing components unchanged

## Sources

- Claude Code official plugin documentation: https://code.claude.com/docs/en/plugins
- Claude Code plugins reference: https://code.claude.com/docs/en/plugins-reference
- GSD source (direct inspection): `/Users/greyaltaer/.claude/get-shit-done/`
  - `workflows/new-project.md` — full workflow orchestration pattern
  - `bin/gsd-tools.cjs` — tooling CLI command surface (100+ commands)
  - `bin/lib/` — modular architecture (10 domain-specific modules)
  - `references/model-profiles.md` — agent-to-model resolution system
  - `references/planning-config.md` — config schema and branching strategies
  - `templates/context.md` — template-driven artifact pattern
- GSD anatomy article: https://www.codecentric.de/en/knowledge-hub/blog/the-anatomy-of-claude-code-workflows-turning-slash-commands-into-an-ai-development-system
- Standalone CLI distribution options: https://skywork.ai/blog/how-to-turn-claude-code-plugin-into-cli-gui-tool/

---
*Architecture research for: AI-powered product development platform (PDE, fork of GSD)*
*Researched: 2026-03-14*
