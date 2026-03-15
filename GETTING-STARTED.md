# Getting Started with PDE

This guide takes you from a fresh install to completing your first full project cycle: discuss, plan, execute, and verify. By the end, you will have shipped a working project with a complete planning history and verified output.

---

## Prerequisites

Before you begin:

- **Claude Code** — [Download at claude.ai/code](https://claude.ai/code). PDE runs as a Claude Code plugin.
- **Anthropic subscription** — Claude Code requires an active subscription.
- **Git** — Installed and configured with your name and email. PDE commits code after each task.
- **A project idea** — See the suggestions in Section 2, or bring your own.

---

## Philosophy

PDE structures development into phases. Each phase flows through four stages: discuss, plan, execute, and verify. This loop repeats until the project is done.

You own the vision. Claude handles the building. Your role is to answer questions during discuss, review output during verify, and make decisions when checkpoints ask for your judgment. Claude's role is to research, plan, write code, run tests, and commit results.

The `.planning/` directory is your project's memory. It stores requirements, roadmaps, decisions, and summaries. When you reset context between stages — by running `/clear` in Claude Code — this directory ensures nothing is lost. Starting each stage with fresh context prevents quality degradation as Claude works through a long project. You will use `/clear` after discuss and after plan, before moving to the next stage.

---

## Section 1: Install PDE

Open Claude Code. Run these two commands in order:

```
/plugin marketplace add Grey-Altr/pde
```

```
/plugin install platform-development-engine@pde
```

The first command registers the PDE repository as a plugin source. The second installs the plugin from it.

**Verify the install:** Type `/pde:` in the Claude Code input. You should see the PDE command palette with commands listed. If you see commands, the install succeeded.

---

## Section 2: Create Your Project

Run:

```
/pde:new-project
```

PDE will ask you questions about your project: what it is, who it is for, what the key requirements are. Answer in plain language. PDE will turn your answers into three files:

- `PROJECT.md` — core value, requirements, constraints
- `REQUIREMENTS.md` — structured requirement list with IDs
- `ROADMAP.md` — phases of work from start to done

**Sample project ideas** — if you do not have one yet:

1. **Personal task tracker** — A CLI app with priorities, due dates, and status tracking. Good for learning PDE's full cycle on a self-contained project.
2. **Weather dashboard** — A web app that fetches forecasts from a public API and displays them in a clean interface. Good for API integration and front-end work.
3. **Markdown blog engine** — A static site generator that converts markdown files into a deployable website. Good for file processing and output pipelines.

After `/pde:new-project` completes, your `.planning/` directory will look like this:

```
.planning/
├── PROJECT.md
├── REQUIREMENTS.md
├── ROADMAP.md
└── STATE.md
```

A snippet from `PROJECT.md`:

```markdown
# Personal Task Tracker

## Core Value
A command-line tool for managing tasks with priorities and due dates.

## Requirements

### Active
- [ ] Add, list, complete, and delete tasks from the terminal
- [ ] Support priority levels: low, medium, high
- [ ] Support due dates with overdue detection
- [ ] Persist tasks between sessions (local file storage)
```

---

## Section 3: Discuss Your First Phase

Your roadmap has phases. Start with the first one:

```
/pde:discuss-phase
```

PDE will ask targeted questions about the phase you are about to build: technology choices, constraints, design preferences, edge cases. Your answers become locked decisions that guide the build. PDE stores them in `.planning/phases/01-*/CONTEXT.md`.

A decision block from `CONTEXT.md` looks like this:

```markdown
## Implementation Decisions

### Data storage
- Format: JSON file at `~/.tasks/tasks.json`
- Migration: None needed for v1
- Backup: Out of scope

### CLI framework
- Library: `commander` (npm) — standard, well-documented
- Alternative considered: `yargs` — rejected, heavier for this scope
```

These decisions are locked. When execution begins, Claude will follow them without re-asking.

After discuss completes, run `/clear` to free context for planning:

```
/clear
```

---

## Section 4: Plan the Phase

```
/pde:plan-phase
```

PDE reads your CONTEXT.md decisions and creates PLAN.md files — one per plan in the phase. Each PLAN.md contains specific tasks, verification criteria, and a wave structure.

Waves determine order of execution. Wave 1 tasks are independent and can run in parallel. Wave 2 tasks depend on wave 1 completing first. This structure lets PDE maximize speed on parallel work while respecting dependencies.

A snippet from a PLAN.md:

```markdown
<task type="auto">
  <name>Task 1: Set up project structure and dependencies</name>
  <files>package.json, src/index.ts, src/types.ts</files>
  <action>
    Initialize npm project, install commander, create entry point
    and TypeScript configuration.
  </action>
  <verify>
    <automated>npm install && npx tsc --noEmit</automated>
  </verify>
  <done>Project builds cleanly with no TypeScript errors</done>
</task>
```

After plan-phase completes, run `/clear` again:

```
/clear
```

---

## Section 5: Execute

```
/pde:execute-phase
```

PDE works through each task autonomously. After each task completes, it commits the code. You will see commit messages like:

```
feat(01-foundation): set up project structure and dependencies

- Initialized npm project with commander dependency
- Created TypeScript configuration with strict mode
- Added entry point at src/index.ts
```

When PDE needs your judgment — for decisions that are architectural or involve tradeoffs you should review — it will pause at a checkpoint and show you:

- What was built so far
- What it needs from you (a decision, a review, a credential)
- Exact steps to continue

After you respond to a checkpoint, the next agent picks up exactly where the last one stopped.

When the phase finishes, each plan has a SUMMARY.md in `.planning/phases/01-*/`:

```
.planning/phases/01-foundation/
├── 01-CONTEXT.md
├── 01-01-PLAN.md
├── 01-01-SUMMARY.md
├── 01-02-PLAN.md
└── 01-02-SUMMARY.md
```

---

## Section 6: Verify

```
/pde:verify-work
```

PDE checks what was built against the requirements in REQUIREMENTS.md. It produces a VERIFICATION.md showing pass, fail, or partial for each requirement.

```
.planning/phases/01-foundation/
└── VERIFICATION.md
```

A snippet from VERIFICATION.md:

```markdown
## Requirements Verification

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| TASK-01 | Add, list, complete, delete tasks | PASS | All four operations verified |
| TASK-02 | Priority levels (low, medium, high) | PASS | Flag accepted, stored, displayed |
| TASK-03 | Due dates with overdue detection | PASS | ISO date format, overdue flag working |
| TASK-04 | Persist between sessions | PASS | JSON file at ~/.tasks/tasks.json |
```

If requirements are not met, PDE will tell you which ones and why. You can then run:

```
/pde:plan-phase --gaps
```

This creates targeted fix plans for the gaps. Run `/pde:execute-phase` to apply them, then verify again.

---

## What's Next

You have completed one cycle. To continue:

**Keep building:** Run discuss → plan → execute → verify for each remaining phase in your roadmap. Use `/pde:progress` at any time to see where you are and what remains.

**Auto-advance:** Add `--auto` to skip manual advancement between phases:

```
/pde:execute-phase --auto
```

With `--auto`, PDE advances through plans and phases without stopping between them. It still pauses at checkpoints that need your input.

**Milestones:** When you finish a major version of your project, mark it:

```
/pde:new-milestone
/pde:complete-milestone
```

Milestones checkpoint your progress, tag the release, and prepare the project for the next major version.

**Configuration:** Adjust PDE behavior with `/pde:settings`. Set your preferred AI model profile (speed vs. quality tradeoffs) with `/pde:set-profile`.

**Questions:** Open an issue at [https://github.com/Grey-Altr/pde](https://github.com/Grey-Altr/pde).

---

## Command Cheat Sheet

All `/pde:` commands, grouped by when you use them.

### Project Setup

| Command | What it does |
|---------|-------------|
| `/pde:new-project` | Start a new project — creates PROJECT.md, REQUIREMENTS.md, ROADMAP.md |
| `/pde:settings` | Configure PDE behavior (model, parallelization, verbosity) |
| `/pde:set-profile` | Set your AI model profile (speed, balanced, or quality) |

### Phase Planning

| Command | What it does |
|---------|-------------|
| `/pde:discuss-phase` | Gather implementation decisions for the next phase |
| `/pde:research-phase` | Run technical research before planning a complex phase |
| `/pde:plan-phase` | Create PLAN.md files from CONTEXT.md decisions |
| `/pde:discovery-phase` | Explore codebase before planning changes to existing code |

### Execution

| Command | What it does |
|---------|-------------|
| `/pde:execute-phase` | Execute all plans in the current phase, one task at a time |
| `/pde:quick` | Run a single focused task without phase structure |

### Verification

| Command | What it does |
|---------|-------------|
| `/pde:verify-work` | Check built output against requirements, produce VERIFICATION.md |
| `/pde:diagnose-issues` | Investigate failing tests, errors, or unexpected behavior |

### Navigation

| Command | What it does |
|---------|-------------|
| `/pde:progress` | Show current phase, completed plans, and overall project status |
| `/pde:help` | List all available commands with descriptions |
| `/pde:update` | Check for and apply PDE updates |

### Codebase

| Command | What it does |
|---------|-------------|
| `/pde:map-codebase` | Generate a structural map of the project's files and architecture |
| `/pde:cleanup` | Remove obsolete files, unused dependencies, or stale artifacts |

### Phase Management

| Command | What it does |
|---------|-------------|
| `/pde:add-phase` | Add a new phase to the roadmap |
| `/pde:insert-phase` | Insert a phase between two existing phases |
| `/pde:remove-phase` | Remove a phase from the roadmap |
| `/pde:validate-phase` | Check that a phase's plans are complete and consistent |
| `/pde:add-tests` | Add a testing plan to an existing phase |
| `/pde:list-phase-assumptions` | Surface assumptions baked into a phase's plans |

### Task Management

| Command | What it does |
|---------|-------------|
| `/pde:add-todo` | Add a tracked to-do item to the project |
| `/pde:check-todos` | List open to-do items with status |

### Milestones

| Command | What it does |
|---------|-------------|
| `/pde:new-milestone` | Start tracking a new major version |
| `/pde:complete-milestone` | Mark a milestone done, tag release, prepare for next version |
| `/pde:audit-milestone` | Verify all requirements for a milestone are satisfied |
| `/pde:plan-milestone-gaps` | Create plans to close gaps found during a milestone audit |

### Session Management

| Command | What it does |
|---------|-------------|
| `/pde:pause-work` | Save session state before stopping work |
| `/pde:resume-project` | Restore context and pick up where you left off |
| `/pde:transition` | Hand off project context between sessions or collaborators |
| `/pde:health` | Check project health: missing files, broken links, stale state |
