# Future Milestones: Platform Development Engine

> Scoped 2026-03-18. Product gap analysis → milestone definitions for post-v0.5 roadmap.
> Each milestone is self-contained with goal, phases, requirements, dependencies, and effort estimate.
> Milestones are ordered by impact-to-effort ratio, not by sequence — some can run in parallel.

---

## Milestone Summary

| Version | Name | Phases | Est. Effort | Dependencies | Impact |
|---------|------|--------|-------------|--------------|--------|
| v0.6 | Implementation Bridge | 3 | Medium | v0.5 (GitHub) | Critical |
| v0.7 | Ship & Verify | 3 | Medium | v0.6 | High |
| v0.8 | Workflow Maturity | 4 | Medium | v0.5 | High |
| v0.9 | Feedback & Iteration | 3 | Medium | v0.7 | High |
| v0.10 | Observability & Estimation | 3 | Medium | v0.6 | Medium |
| v0.11 | Project Intelligence | 3 | Low-Med | v0.6 | Medium |
| v0.12 | State Resilience | 2 | Medium | v0.8 | Medium |
| v0.13 | Multi-Platform Design | 3 | High | v0.6 | Medium |
| v0.14 | External Tool Orchestration | 3 | High | v0.5 | Medium |
| v0.15 | Hardware Product Pipeline | 5 | High | v0.13 | High |
| v0.16 | Service Product Pipeline | 5 | High | v0.13 | High |
| v0.17 | Multi-Product Orchestration | 3 | Very High | v0.15, v0.16 | High |
| v0.18 | AI/ML Product Pipeline | 4 | Medium | v0.13 | Very High |
| v0.19 | Content Product Pipeline | 3 | Low-Med | v0.13 | High |
| v0.20 | Data Product Pipeline | 3 | Medium | v0.13 | High |
| v0.21 | Brand & Identity Pipeline | 3 | Medium | v0.13 | Medium |
| v0.22 | Education & Training Pipeline | 3 | Low-Med | v0.13 | Medium |
| v0.23 | Game Product Pipeline | 4 | High | v0.13 | Medium |
| v0.24 | Physical Space Pipeline | 3 | High | v0.15 | Low-Med |
| v0.25 | Policy & Governance Pipeline | 3 | Low-Med | v0.13 | Medium |
| v0.26 | Maximum Parallelization | 8 | Very High | v0.8 | High |
| v1.0 | Collaboration & Ecosystem | 4 | High | v0.8, v0.12 | High |

---

## v0.6 — Implementation Bridge

**Goal:** Close the gap between PDE's design pipeline output and its execution engine — handoff artifacts automatically become implementation phases with pre-populated plans.

**Why this is critical:** PDE has two powerful engines (13-stage design pipeline + plan/execute/verify loop) that don't connect. Users must manually translate handoff TypeScript interfaces and component specs into phases and plans. This is the single biggest gap in the "idea to shipped product" promise.

### Phases

#### Phase A: Handoff-to-Roadmap Generator
**Goal:** `/pde:handoff` output can be automatically converted into roadmap phases
**Requirements:**
- **IMPL-01**: `/pde:implement` command reads HND-types-v{N}.ts, HND-SPEC.md, and STACK.md to generate implementation phases in ROADMAP.md with component-per-phase or feature-per-phase grouping (user-selectable strategy)
- **IMPL-02**: Generated phases include pre-populated success criteria derived from handoff component APIs (props rendered, states handled, accessibility met)
- **IMPL-03**: User receives a confirmation prompt showing proposed phases before any ROADMAP.md write occurs
- **IMPL-04**: Generated phases respect dependency order from handoff spec (shared components before consuming pages)
**Success Criteria:**
  1. User runs `/pde:implement` after `/pde:handoff` and receives a proposed set of implementation phases with descriptions matching handoff components
  2. Proposed phases include success criteria that reference specific TypeScript interfaces from HND-types
  3. User can accept, modify, or reject the proposal before any state changes

#### Phase B: Auto-Plan Generation from Handoff Specs
**Goal:** Implementation phases generated in Phase A can auto-generate PLAN.md files from handoff component specifications
**Requirements:**
- **IMPL-05**: `/pde:plan-phase` recognizes handoff-sourced phases and pre-fills plan tasks from component API specs (file creation, prop implementation, state management, test stubs)
- **IMPL-06**: Plan tasks reference specific handoff artifacts by path (e.g., "Implement props defined in .planning/design/HND-types-v1.ts lines 12-34")
- **IMPL-07**: Plans include design token integration tasks when DTCG tokens exist in .planning/design/
- **IMPL-08**: Plans include accessibility verification tasks sourced from HIG audit findings when HIG-REPORT exists
**Success Criteria:**
  1. Running `/pde:plan-phase` on a handoff-sourced phase produces a plan with tasks that directly reference handoff specifications
  2. Plan includes token integration and a11y verification when those design artifacts exist

#### Phase C: End-to-End Pipeline Wiring
**Goal:** `/pde:build` can optionally continue through implementation after design completes
**Requirements:**
- **IMPL-09**: `/pde:build --through-implementation` flag continues the pipeline past handoff into implement → plan → execute for each generated phase
- **IMPL-10**: Pipeline pauses for user confirmation at the design→implementation boundary (no silent transition)
- **IMPL-11**: Implementation progress tracked in DESIGN-STATE.md with new `implementation` section showing component completion status
**Success Criteria:**
  1. User runs `/pde:build --through-implementation` and the pipeline completes design, generates implementation phases, plans them, and executes them with confirmation gates at each boundary
  2. DESIGN-STATE.md reflects both design and implementation coverage

---

## v0.7 — Ship & Verify

**Goal:** PDE understands deployment targets and can verify that built features work in production, not just locally.

**Why:** The pipeline currently stops at "code works locally." For the "shipped product" promise, PDE needs deployment awareness and post-deploy verification.

### Phases

#### Phase A: Deployment Awareness
**Goal:** PDE knows where projects deploy and can trigger deploys
**Requirements:**
- **SHIP-01**: `/pde:deploy` command detects deployment target from project config (vercel.json, netlify.toml, Dockerfile, package.json scripts) and executes the appropriate deploy command with confirmation gate
- **SHIP-02**: Deploy target stored in `.planning/config/deploy.json` — provider, environment URLs, deploy command, and last deploy status
- **SHIP-03**: `/pde:pipeline-status` shows deployment state alongside phase progress (last deploy time, environment, URL)
- **SHIP-04**: Degraded mode when no deployment target detected — suggests common providers and helps configure
**Success Criteria:**
  1. User runs `/pde:deploy` and PDE detects the correct deployment provider and executes deploy with a confirmation prompt
  2. Deployment metadata is persisted and visible in pipeline status

#### Phase B: Post-Deploy Verification
**Goal:** PDE can verify deployed features work end-to-end
**Requirements:**
- **SHIP-05**: `/pde:verify-work --deployed` runs verification against the deployed URL instead of localhost
- **SHIP-06**: Verification generates smoke test checklist from implementation success criteria + handoff acceptance criteria
- **SHIP-07**: Integration with agent-browser for visual verification of deployed preview URLs
- **SHIP-08**: Verification results recorded in phase VERIFICATION.md with "deployed" section distinct from "local" verification
**Success Criteria:**
  1. After deploy, user runs `/pde:verify-work --deployed` and PDE opens the deployed URL and runs smoke checks against success criteria
  2. VERIFICATION.md distinguishes between local and deployed verification results

#### Phase C: Release Notes & Changelog
**Goal:** PDE auto-generates release documentation from shipped phases
**Requirements:**
- **SHIP-09**: `/pde:release` generates structured release notes from completed phase summaries, git history, and verification results
- **SHIP-10**: Release notes follow Keep a Changelog format with sections auto-populated from phase categorization (Added, Changed, Fixed)
- **SHIP-11**: Release notes include links to relevant design artifacts (wireframes, flows) when they exist
**Success Criteria:**
  1. User runs `/pde:release` and receives a formatted changelog entry covering all phases since last release

---

## v0.8 — Workflow Maturity

**Goal:** Harden PDE's internal workflows with research validation, story-file sharding, plan-vs-actual reconciliation, and file-hash manifest — incorporating best practices from BMAD and PAUL frameworks.

**Why:** As PDE projects scale, unverified research claims cascade into bad plans, large context windows degrade execution quality, and update conflicts frustrate users. These are the top 3 candidates from the external frameworks research.

**References:** `.planning/research/EXTERNAL-FRAMEWORKS.md` (Tier 1 candidates)

### Phases

#### Phase A: Research Validation Agent
**Goal:** Research claims are automatically verified against the codebase before flowing into plans
**Requirements:**
- **WFM-01**: `pde-research-validator` agent parses RESEARCH.md for verifiable assertions (file exists, function exported, directory present, config key present, pattern matches)
- **WFM-02**: Validator runs each claim against codebase with evidence collection (fs.existsSync, require checks, grep for patterns)
- **WFM-03**: Validation report produced as structured PASS/FAIL per claim, appended to RESEARCH.md or as sibling RESEARCH-VALIDATION.md
- **WFM-04**: `/pde:plan-phase` warns (non-blocking) when proceeding with unvalidated research
**Success Criteria:**
  1. After research phase completes, validator agent produces a report with PASS/FAIL for each verifiable claim
  2. Plan phase shows a warning when research is unvalidated

#### Phase B: Story-File Sharding
**Goal:** Large plans are decomposed into atomic task files so executor agents operate with focused context
**Requirements:**
- **WFM-05**: `pde-planner` emits a `tasks/` directory alongside PLAN.md when plan has 5+ tasks
- **WFM-06**: Each task file is self-contained: acceptance criteria, relevant file paths, schema snippets, dependency pointers
- **WFM-07**: `pde-executor` loads only the current task file + project-context.md instead of full PLAN.md
- **WFM-08**: Completed task files receive `status: complete` frontmatter update
- **WFM-09**: Plans with <5 tasks continue using current monolithic PLAN.md (no overhead for simple phases)
**Success Criteria:**
  1. A phase with 8+ tasks generates sharded task files and executor operates with reduced context per task
  2. Simple phases (1-4 tasks) are unaffected

#### Phase C: Plan-vs-Actual Reconciliation
**Goal:** After execution, an explicit reconciliation step compares planned vs actual changes and logs deviations
**Requirements:**
- **WFM-10**: `pde-reconciler` agent runs between executor completion and verifier invocation
- **WFM-11**: Reconciler compares planned tasks against git diff (files created, modified, deleted) and identifies unplanned changes and skipped tasks
- **WFM-12**: Reconciliation report stored as RECONCILIATION.md in phase directory with deviation categories (planned-done, planned-skipped, unplanned-added)
- **WFM-13**: Deviations above threshold trigger user notification before verifier runs
**Success Criteria:**
  1. After execution, reconciler produces a report showing which planned tasks were completed, skipped, or had unplanned additions
  2. Significant deviations prompt the user before verification proceeds

#### Phase D: File-Hash Manifest for Updates
**Goal:** PDE updates use hash comparison instead of three-way merge for unmodified files
**Requirements:**
- **WFM-14**: `.planning/config/files-manifest.csv` generated on install/update with path, sha256, source (stock|user-modified), last_updated
- **WFM-15**: During `pde:update`, files matching stock hash are overwritten silently; user-modified files are preserved with conflict notice
- **WFM-16**: Falls back to existing three-way merge when manifest is missing (backwards compatible)
**Success Criteria:**
  1. Running `pde:update` after a clean install updates all stock files without merge prompts
  2. User-modified files are detected and preserved with notice

---

## v0.9 — Feedback & Iteration

**Goal:** Close the product development loop by ingesting real-world feedback and routing it back into PDE's planning state as actionable requirements.

**Why:** PDE currently builds things forward-only. The pipeline has no mechanism to learn whether what was built actually solved the problem. Even lightweight feedback ingestion would transform PDE from "build things" to "build the right things."

### Phases

#### Phase A: Feedback Ingestion
**Goal:** External feedback from multiple sources flows into structured PDE requirements
**Requirements:**
- **FB-01**: `/pde:feedback` command accepts structured input (text, URL to GitHub issue/discussion, support ticket reference) and creates a feedback entry in `.planning/feedback/`
- **FB-02**: Feedback entries tagged with source, severity, affected feature (mapped to roadmap phase), and suggested action (bug, enhancement, new-feature, unclear)
- **FB-03**: `/pde:feedback --from-github` pulls issue comments tagged with a specific label and converts to feedback entries
- **FB-04**: `/pde:feedback --from-analytics` accepts a structured analytics summary (top errors, drop-off points, usage patterns) and converts to feedback entries
**Success Criteria:**
  1. User runs `/pde:feedback` with text input and a structured feedback entry is created in `.planning/feedback/`
  2. Feedback entries map to specific roadmap phases or flag "new work needed"

#### Phase B: Feedback-to-Requirements Routing
**Goal:** Accumulated feedback is synthesized into prioritized requirements for the next milestone
**Requirements:**
- **FB-05**: `/pde:triage` command reads all feedback entries, groups by affected feature, and produces a prioritized triage report
- **FB-06**: Triage report recommends: fix (bug), enhance (improvement), defer (low priority), or investigate (unclear)
- **FB-07**: Accepted triage items auto-generate requirement entries in REQUIREMENTS.md for the next milestone
- **FB-08**: Feedback-sourced requirements maintain traceability link back to original feedback entry
**Success Criteria:**
  1. User runs `/pde:triage` and receives a prioritized report grouping feedback by feature area
  2. Accepting triage recommendations creates requirements with feedback traceability

#### Phase C: Retrospective Automation
**Goal:** PDE can generate structured retrospectives from completed milestones
**Requirements:**
- **FB-09**: `/pde:retro` command synthesizes milestone data (velocity, deviations, verification results, feedback) into a structured retrospective document
- **FB-10**: Retrospective includes: what went well (phases completed on time, high verification scores), what didn't (deviations, rework phases), and action items for next milestone
- **FB-11**: Action items from retro can be converted to requirements for the next milestone with one confirmation
**Success Criteria:**
  1. Running `/pde:retro` after milestone completion produces a structured retrospective
  2. Action items can be promoted to requirements for the next milestone

---

## v0.10 — Observability & Estimation

**Goal:** PDE provides visibility into execution costs, timeline confidence, and system health through a tmux-based monitoring dashboard and estimation engine.

**Why:** Executives and PMs need timeline confidence, not just phase checklists. Developers need to see what PDE is doing during complex multi-agent operations. Both need cost awareness for AI-assisted execution.

**References:** Memory: `project_tmux_monitoring.md` (OBS-01)

### Phases

#### Phase A: Tmux Monitoring Dashboard
**Goal:** Real-time visibility into PDE agent activity, pipeline progress, and system health
**Requirements:**
- **OBS-01**: `/pde:monitor` command launches a tmux session with split panes: agent activity log, pipeline progress, phase status, system health
- **OBS-02**: Agent activity pane shows real-time agent spawns, completions, and tool calls with timestamps
- **OBS-03**: Pipeline progress pane shows current phase, plan, task with progress bar and elapsed time
- **OBS-04**: Dashboard auto-closes when the PDE session ends (cleanup on exit)
- **OBS-05**: Works without tmux installed — falls back to inline status updates
**Success Criteria:**
  1. User runs `/pde:monitor` and a tmux dashboard opens showing live PDE activity
  2. Dashboard reflects agent activity and phase progress in real-time

#### Phase B: Cost & Complexity Estimation
**Goal:** PDE estimates effort and token cost for phases before execution
**Requirements:**
- **EST-01**: `/pde:estimate` command analyzes a phase plan and produces effort estimate (task count, file touch count, estimated token usage based on historical data)
- **EST-02**: Historical velocity tracking — records actual time and token usage per phase and uses it to calibrate future estimates
- **EST-03**: Complexity scoring per task based on: file count, dependency depth, test coverage requirements, design artifact complexity
- **EST-04**: Estimation output includes confidence interval (low/medium/high) based on historical variance for similar phase types
**Success Criteria:**
  1. User runs `/pde:estimate` on a planned phase and receives effort/cost estimate with confidence interval
  2. After 5+ phases, estimates are calibrated from historical data

#### Phase C: Stakeholder Presentation Generator
**Goal:** PDE synthesizes project artifacts into polished presentation documents for different audiences
**Requirements:**
- **PRES-01**: `/pde:present` command reads current project state and generates a presentation document with audience persona as argument (executive, investor, sprint-review, client)
- **PRES-02**: Executive persona produces 1-page summary: progress percentage, blockers, timeline confidence, milestone velocity
- **PRES-03**: Sprint review persona produces feature-focused report: what shipped, wireframe/mockup screenshots, verification results, what's next
- **PRES-04**: Output format selectable: Markdown (composable), HTML (richest), or structured JSON (for custom rendering)
- **PRES-05**: Presentations include metrics derived from estimation data (velocity trend, cost per phase, quality scores)
**Success Criteria:**
  1. User runs `/pde:present --executive` and receives a 1-page project summary with progress metrics
  2. Sprint review presentation includes design artifact references and verification results

---

## v0.11 — Project Intelligence

**Goal:** PDE learns from past projects and accelerates new ones through templates, archetypes, and cross-project pattern recognition.

**Why:** Every PDE project starts from zero. Common patterns (SaaS app, CLI tool, API service, marketing site) have known requirement sets, phase structures, and design patterns that should be reusable.

### Phases

#### Phase A: Project Archetypes
**Goal:** Users can bootstrap projects from known archetypes that pre-populate requirements and phase structures
**Requirements:**
- **INTEL-01**: `/pde:new-project --archetype saas|cli|api|marketing|mobile` flag scaffolds requirements, suggested phases, and design pipeline configuration appropriate to the archetype
- **INTEL-02**: At least 5 built-in archetypes: SaaS web app, CLI tool, REST API, marketing/content site, mobile app
- **INTEL-03**: Archetypes are composable — user can select multiple (e.g., `saas+api`) and requirements are merged
- **INTEL-04**: Archetype selection is optional — `/pde:new-project` without flag works exactly as today
**Success Criteria:**
  1. User runs `/pde:new-project --archetype saas` and receives pre-populated requirements and suggested phases
  2. Archetype scaffolding is additive and can be modified after generation

#### Phase B: Design Pattern Library
**Goal:** Reusable design patterns from past projects can be imported into new projects
**Requirements:**
- **INTEL-05**: `/pde:library` command manages a collection of reusable design artifacts (token sets, flow templates, wireframe components, critique checklists)
- **INTEL-06**: Export: `/pde:library --export <artifact>` packages a design artifact from current project into the library with metadata
- **INTEL-07**: Import: `/pde:library --import <artifact>` pulls a design artifact into current project's `.planning/design/` with non-destructive merge
- **INTEL-08**: Library stored in `~/.pde/library/` (user-global, cross-project)
**Success Criteria:**
  1. User exports a design system from Project A and imports it into Project B
  2. Imported artifacts integrate with Project B's existing design state

#### Phase C: Cross-Project Analytics
**Goal:** PDE surfaces insights across projects to improve planning accuracy
**Requirements:**
- **INTEL-09**: `/pde:insights` command analyzes completed projects in `~/.pde/library/` and surfaces patterns: average phases per milestone, common requirement categories, typical phase duration by type
- **INTEL-10**: Insights feed into estimation engine (v0.10) for improved accuracy on new projects
- **INTEL-11**: Privacy-respecting: no project data leaves the local machine; analytics are derived from metadata only
**Success Criteria:**
  1. User runs `/pde:insights` and sees aggregate metrics across their PDE projects

---

## v0.12 — State Resilience

**Goal:** PDE's file-based planning state supports checkpoints, rollback, and safe experimentation without relying solely on git.

**Why:** If Phase N produces bad output that Phase N+3 builds on, there's no clean way to rollback planning state independently of code. Git provides code rollback but `.planning/` state, design artifacts, and manifests need their own checkpoint/restore mechanism.

### Phases

#### Phase A: Planning State Checkpoints
**Goal:** PDE can snapshot and restore planning state independently of git
**Requirements:**
- **STATE-01**: Automatic checkpoint created before each phase execution — snapshot of `.planning/` directory stored in `.planning/checkpoints/{phase-number}-pre/`
- **STATE-02**: `/pde:checkpoint` command creates a named checkpoint at any time
- **STATE-03**: `/pde:restore` command lists available checkpoints and restores selected one, with confirmation gate showing what will change
- **STATE-04**: Checkpoints are lightweight — uses hardlinks or copy-on-write where filesystem supports it
- **STATE-05**: Auto-pruning: checkpoints older than 5 milestones are archived unless manually pinned
**Success Criteria:**
  1. Before Phase N executes, a checkpoint is created automatically
  2. User can restore to any checkpoint and `.planning/` state matches that point in time

#### Phase B: Experimental Branches
**Goal:** Users can explore design alternatives without risking the main pipeline state
**Requirements:**
- **STATE-06**: `/pde:branch <name>` creates a named branch of `.planning/` state for experimental exploration
- **STATE-07**: `/pde:branch --list` shows active branches with divergence point and modification summary
- **STATE-08**: `/pde:branch --merge <name>` merges experimental branch back into main state with conflict resolution
- **STATE-09**: `/pde:branch --discard <name>` cleanly removes an experimental branch
- **STATE-10**: Design pipeline commands respect the active branch — artifacts written to branch-specific locations
**Success Criteria:**
  1. User creates a branch, runs design experiments, and merges the results back
  2. Discarding a branch leaves no artifacts in the main planning state

---

## v0.13 — Multi-Platform Design

**Goal:** PDE's design pipeline supports non-web platforms — mobile (React Native, Flutter), desktop (Electron, Tauri), and CLI tools — with platform-appropriate constraints and output formats.

**Why:** The current pipeline is heavily web-oriented (HTML wireframes, CSS tokens, WCAG audits). This limits PDE's addressable market. Mobile and desktop have different design constraints that need first-class support.

### Phases

#### Phase A: Platform Detection & Constraints
**Goal:** PDE detects project platform and applies appropriate design constraints
**Requirements:**
- **PLAT-01**: STACK.md detection expanded to identify: React Native, Flutter, Electron, Tauri, CLI (commander/yargs/oclif), and native iOS/Android
- **PLAT-02**: Each platform has a constraint profile defining: supported layout primitives, navigation patterns, input modalities, accessibility standards, and animation capabilities
- **PLAT-03**: `/pde:brief` includes platform constraints in problem framing output
- **PLAT-04**: Design pipeline stages receive platform context and adapt output accordingly
**Success Criteria:**
  1. PDE correctly detects React Native project from STACK.md and applies mobile design constraints throughout the pipeline

#### Phase B: Platform-Specific Design Output
**Goal:** Wireframes, mockups, and tokens produce platform-appropriate output
**Requirements:**
- **PLAT-05**: Wireframe skill produces React Native layout pseudo-code instead of HTML for mobile projects
- **PLAT-06**: Token skill outputs platform-appropriate formats: CSS custom properties (web), StyleSheet constants (React Native), ThemeData (Flutter), or CSS-in-JS (Electron)
- **PLAT-07**: Mockup skill adapts to mobile viewport dimensions, touch targets, and platform navigation patterns (tab bar, drawer, stack)
- **PLAT-08**: HIG skill audits against platform-specific guidelines: Apple HIG (iOS), Material Design (Android), Windows Design Language (desktop)
**Success Criteria:**
  1. Running the design pipeline on a React Native project produces mobile-appropriate wireframes, tokens, and HIG audit

#### Phase C: CLI & API Design Support
**Goal:** PDE's design pipeline supports non-visual products with appropriate artifacts
**Requirements:**
- **PLAT-09**: CLI projects skip wireframe/mockup stages and instead produce: command tree diagram, help text templates, input/output format specs
- **PLAT-10**: API projects skip visual stages and produce: endpoint inventory, request/response schemas, authentication flow diagram, error taxonomy
- **PLAT-11**: `/pde:build` auto-selects appropriate pipeline stages based on platform detection — no manual `--skip` needed
**Success Criteria:**
  1. Running `/pde:build` on a CLI project produces command tree and help text instead of wireframes

---

## v0.14 — External Tool Orchestration

**Goal:** PDE can orchestrate external tools (Blender, GIMP, OBS Studio) through agent-native CLIs, and expose its own planning state as an MCP server for consumption by other tools.

**Why:** PDE's design pipeline can currently only produce text/HTML artifacts. Integrating with external creative tools extends reach beyond code. Exposing PDE as an MCP server makes it a platform other tools build on.

**References:** Memory: `project_cli_anything.md`, `project_webmcp.md`

### Phases

#### Phase A: CLI-Anything Integration
**Goal:** PDE executor agents can drive external tools through auto-generated CLIs
**Requirements:**
- **EXT-01**: Evaluate and integrate CLI-Anything's agent-native CLI generation for PDE's hardware skill and mockup pipeline
- **EXT-02**: PDE executor agents can invoke CLI-Anything-generated commands as tool calls with structured JSON I/O
- **EXT-03**: Tool availability detection — graceful degradation when external CLIs are not installed
- **EXT-04**: Security policy: external tool invocations require explicit user confirmation (same pattern as MCP write-back)
**Success Criteria:**
  1. PDE executor can invoke a Blender CLI command to generate a 3D model referenced in hardware spec
  2. Missing external tools produce degraded-mode warnings, not crashes

#### Phase B: PDE as MCP Server
**Goal:** Other AI tools can read PDE's planning state through MCP protocol
**Requirements:**
- **EXT-05**: PDE exposes an MCP server that provides read access to: PROJECT.md, ROADMAP.md, current phase status, design artifacts, and verification results
- **EXT-06**: MCP resources follow the MCP specification with typed schemas for each artifact type
- **EXT-07**: Write access limited to feedback ingestion (new feedback entries) with confirmation gate
- **EXT-08**: Server starts on demand via `/pde:serve` and runs as a background process
**Success Criteria:**
  1. An external AI agent can connect to PDE's MCP server and read current project status
  2. External agent can submit feedback that appears in `.planning/feedback/`

#### Phase C: WebMCP Browser Integration
**Goal:** PDE's planning state is accessible through browser-based MCP for web-based tooling
**Requirements:**
- **EXT-09**: WebMCP adapter wraps PDE's MCP server for browser-based consumption
- **EXT-10**: Preview environments can display PDE pipeline status and design artifacts
- **EXT-11**: Browser-based MCP consumers can submit feedback entries
**Success Criteria:**
  1. A browser-based tool can connect to PDE via WebMCP and display project status

---

## v1.0 — Collaboration & Ecosystem

**Goal:** PDE supports multi-user workflows, a community skill marketplace, and extensible pipeline configuration — graduating from solo developer tool to team platform.

**Why:** File-based state works for solo use. Teams need merge safety, role awareness, and shared extensibility. This is the milestone that makes PDE a *platform* rather than a *tool*.

**Dependencies:** v0.8 (workflow maturity for safe concurrent operations), v0.12 (state resilience for merge/branch)

### Phases

#### Phase A: Concurrent State Safety
**Goal:** Multiple users can work on the same PDE project without state corruption
**Requirements:**
- **COLLAB-01**: File-level locking for `.planning/` state files during write operations (advisory locks)
- **COLLAB-02**: Merge strategy for concurrent planning state changes — last-write-wins for non-conflicting fields, conflict markers for overlapping changes
- **COLLAB-03**: `.planning/` state changes produce clean git diffs suitable for PR review
- **COLLAB-04**: `/pde:sync` reconciles local state with remote after git pull
**Success Criteria:**
  1. Two users working on different phases of the same project don't corrupt each other's state
  2. State changes produce reviewable git diffs

#### Phase B: Role-Aware Views
**Goal:** Different team roles see relevant information without noise
**Requirements:**
- **COLLAB-05**: Role configuration in `.planning/config/team.json` — designer, developer, PM, executive
- **COLLAB-06**: `/pde:progress` output adapts to configured role — designers see design pipeline status, developers see phase/plan status, PMs see requirement coverage, executives see milestone progress
- **COLLAB-07**: Notification preferences per role — designers notified on critique/iterate, developers on plan/execute, PMs on verify/release
**Success Criteria:**
  1. A user configured as "designer" sees design-focused output from `/pde:progress`

#### Phase C: Community Skill Marketplace
**Goal:** Users can share and install custom PDE skills
**Requirements:**
- **COLLAB-08**: `/pde:marketplace` command lists available community skills from a registry
- **COLLAB-09**: `/pde:marketplace --install <skill>` installs a community skill into the local PDE installation with validation gate
- **COLLAB-10**: `/pde:marketplace --publish <skill>` packages and publishes a local skill to the registry (requires authentication)
- **COLLAB-11**: Skills undergo automated quality validation (format, security scan, style guide compliance) before registry acceptance
**Success Criteria:**
  1. User installs a community skill and it appears in their PDE skill list
  2. Published skills pass automated quality checks before becoming available

#### Phase D: Extensible Pipeline Configuration
**Goal:** Users can customize the design pipeline with custom stages and ordering
**Requirements:**
- **COLLAB-12**: Pipeline configuration file `.planning/config/pipeline.json` defines active stages, ordering, and custom stage insertion points
- **COLLAB-13**: Custom stages can be community skills or local skills that conform to the pipeline stage interface
- **COLLAB-14**: `/pde:build` reads pipeline configuration and executes stages in configured order
- **COLLAB-15**: Default pipeline configuration matches current 13-stage pipeline (backwards compatible)
**Success Criteria:**
  1. User adds a custom "brand-review" stage between critique and iterate, and `/pde:build` executes it in the configured position
  2. Removing the configuration file restores default pipeline behavior

---

## v0.15 — Hardware Product Pipeline

**Goal:** PDE's design pipeline produces manufacturing-ready hardware artifacts instead of web artifacts when the product type is hardware or hybrid.

**Why:** PDE already detects hardware product types and has deep reference libraries (IoT, enclosures, consumer electronics) plus a 30-section hardware spec template. But the 13-stage pipeline runs identically regardless of product type — wireframes output HTML, mockups use CSS/GSAP, HIG audits check WCAG. For hardware products, these stages need to produce physically meaningful artifacts: form factor diagrams, material palettes, assembly sequences, BOM, DFM analysis, and compliance checklists.

**Dependencies:** v0.13 (Multi-Platform Design — establishes pipeline routing by product type)

### Phases

#### Phase A: Product-Type Pipeline Routing
**Goal:** The build orchestrator selects hardware-appropriate stages when productType is "hardware" or "hybrid"
**Requirements:**
- **HW-01**: Build orchestrator reads `productType` from DESIGN-STATE.md after brief and selects stage set: software stages, hardware stages, or merged hybrid stages
- **HW-02**: Hardware stage mapping defined in pipeline config:

  | Software Stage | Hardware Substitute | When |
  |---------------|-------------------|------|
  | system (CSS tokens) | `/pde:materials` (materials & finishes palette) | hardware, hybrid |
  | wireframe (HTML) | `/pde:form-factor` (SVG orthographic views, dimensions) | hardware only |
  | mockup (HTML/CSS) | `/pde:prototype-spec` (prototype stage plan with fidelity levels) | hardware only |
  | hig (WCAG audit) | `/pde:safety-ergo` (ergonomics + safety + compliance audit) | hardware only |
  | handoff (TypeScript) | `/pde:mfg-handoff` (BOM + DFM package + assembly instructions) | hardware only |

- **HW-03**: Hybrid products run software stages AND hardware stages in a defined interleave order
- **HW-04**: Existing software-only pipeline behavior is unchanged when productType is "software" (backwards compatible)
**Success Criteria:**
  1. Running `/pde:build` on a hardware project routes through hardware-specific stages instead of software stages
  2. Software projects are completely unaffected
  3. Hybrid projects run both stage sets with integration points

#### Phase B: Materials & Form Factor Skills
**Goal:** Hardware projects get physically meaningful early design artifacts
**Requirements:**
- **HW-05**: `/pde:materials` skill produces a materials palette document: primary materials per component (plastics, metals, glass, textiles), finish specifications (anodize, powder coat, paint with color codes), material properties (tensile strength, thermal conductivity, UV resistance), and cost-per-unit at volume tiers
- **HW-06**: `/pde:form-factor` skill produces SVG orthographic views (front, side, top, isometric) with dimensions, tolerances, and critical measurement callouts — replacing HTML wireframes for hardware
- **HW-07**: Materials skill reads hardware reference libraries (iot-embedded.md, enclosures.md, consumer-electronics.md) for material recommendations based on product category
- **HW-08**: Form factor skill reads brief constraints (dimensions, IP rating, ergonomic requirements) and produces dimensioned drawings that respect them
- **HW-09**: Both skills write coverage flags in design-manifest.json following existing pass-through-all pattern
**Success Criteria:**
  1. `/pde:materials` produces a structured materials document with cost estimates and DFM notes
  2. `/pde:form-factor` produces SVG views with dimensions that can be opened in a browser for review

#### Phase C: Manufacturing Handoff & BOM
**Goal:** Hardware projects get a manufacturing-ready handoff package instead of TypeScript interfaces
**Requirements:**
- **HW-10**: `/pde:mfg-handoff` produces a complete manufacturing package: BOM with supplier/pricing/lead-time per component, DFM analysis per manufacturing process, assembly sequence with exploded view references, quality inspection criteria
- **HW-11**: BOM output in structured format (CSV + Markdown) with columns: part number, description, material, supplier, unit cost at 100/1K/10K volumes, lead time, alternatives
- **HW-12**: DFM analysis flags manufacturing risks: undercuts, thin walls, tight tolerances, material incompatibilities, assembly complexity — severity-rated CRITICAL/HIGH/MEDIUM/LOW
- **HW-13**: Assembly sequence output as numbered steps with fastener specs, torque values, and fixture requirements
- **HW-14**: Manufacturing handoff references all upstream hardware artifacts (materials palette, form factor drawings, safety audit results) with traceability links
**Success Criteria:**
  1. `/pde:mfg-handoff` produces a BOM that a procurement team could use to source components
  2. DFM analysis identifies at least 3 categories of manufacturing risk with severity ratings

#### Phase D: Safety, Ergonomics & Compliance
**Goal:** Hardware projects get safety and compliance auditing instead of WCAG
**Requirements:**
- **HW-15**: `/pde:safety-ergo` skill replaces `/pde:hig` for hardware — audits against: ergonomic guidelines (grip zones, reach envelopes, force limits), safety standards (sharp edges, pinch points, thermal surfaces, electrical isolation), and regulatory compliance checklists (CE, UL, FCC, RoHS, REACH)
- **HW-16**: Compliance checklist is market-aware — US (FCC/UL), EU (CE/REACH/WEEE), global (RoHS/IEC) — user selects target markets in brief
- **HW-17**: Ergonomic audit produces annotated form factor diagrams with hand-overlay zones, grip analysis, and reach assessment
- **HW-18**: Safety audit produces a hazard analysis table: hazard, severity, probability, risk level, mitigation, verification method
- **HW-19**: Audit results feed into critique and iterate stages for hardware-specific revision
**Success Criteria:**
  1. `/pde:safety-ergo` produces compliance checklists for user-selected target markets
  2. Hazard analysis table identifies risks with mitigation strategies
  3. Ergonomic audit annotates form factor drawings with interaction zones

#### Phase E: Hardware Lifecycle Tracking
**Goal:** PDE tracks hardware prototyping stages (EVT → DVT → PVT → MP) as first-class lifecycle states
**Requirements:**
- **HW-20**: DESIGN-STATE.md extended with `Hardware Phase` field tracking: concept → EVT → DVT → PVT → MP
- **HW-21**: Each hardware phase transition requires explicit gate criteria (EVT: form factor validated, DVT: all tests pass, PVT: manufacturing process verified, MP: yield targets met)
- **HW-22**: `/pde:progress` shows hardware phase alongside design pipeline status when productType is hardware/hybrid
- **HW-23**: BOM versioning: each hardware phase transition snapshots the current BOM with a revision number and ECO (Engineering Change Order) reference
- **HW-24**: `/pde:hardware-status` command shows current prototype stage, outstanding test results, BOM revision, and compliance checklist completion percentage
**Success Criteria:**
  1. User transitions from EVT to DVT with gate criteria validation
  2. BOM is versioned across prototype stages with change tracking

---

## v0.16 — Service Product Pipeline

**Goal:** PDE's design pipeline produces service design artifacts — customer journey maps, service blueprints, tier architectures, SLA frameworks, and operations handoffs — when the product type is "service."

**Why:** Service products (SaaS, managed services, marketplaces, agencies) need fundamentally different design artifacts than software or hardware. The current pipeline produces UI wireframes and component specs — but a service product needs customer journey maps, pricing tier architecture, support system design, operations runbooks, and compliance frameworks. These aren't nice-to-haves; they're the core design deliverables for any subscription/service business.

**Dependencies:** v0.13 (Multi-Platform Design — establishes pipeline routing by product type)

### Phases

#### Phase A: Service Product Type Detection
**Goal:** PDE's brief skill detects service products and classifies service subtypes
**Requirements:**
- **SVC-01**: Brief product type detection expanded with "service" as a fourth classification alongside software/hardware/hybrid
- **SVC-02**: Service signal vocabulary added to detection: subscription, recurring revenue, SaaS, PaaS, IaaS, managed service, white-label, marketplace, platform, customer success, onboarding, support tier, SLA, uptime guarantee, freemium, per-seat, usage-based, SOC 2, HIPAA, multi-tenant
- **SVC-03**: Service subtype detection: `saas` (software-as-a-service), `managed` (managed service/outsourcing), `marketplace` (two-sided platform), `agency` (professional services), `api` (API-as-a-service/developer platform)
- **SVC-04**: Hybrid service detection: "software+service" (SaaS with white-glove onboarding), "hardware+service" (device with subscription cloud service)
- **SVC-05**: Service constraints populated in brief: revenue model, support requirements, compliance scope, scalability targets, customer lifecycle expectations
**Success Criteria:**
  1. Brief correctly classifies a SaaS project as product_type: "service", subtype: "saas"
  2. Service constraints appear in the Design Constraints table

#### Phase B: Customer Journey & Service Blueprint
**Goal:** Service products get journey maps and service blueprints instead of user flow diagrams
**Requirements:**
- **SVC-06**: `/pde:journey` skill produces a multi-stage customer journey map: awareness → consideration → purchase → onboarding → habitual use → support → renewal/expansion → (churn prevention)
- **SVC-07**: Journey map includes per-stage: customer actions, touchpoints (channel), emotional state, pain points, opportunities, KPIs (conversion rate, time-to-value, NPS, retention)
- **SVC-08**: `/pde:blueprint` skill produces a service blueprint showing: frontstage actions (customer-visible), backstage processes (internal operations), support processes (systems and infrastructure), physical evidence (emails, invoices, dashboards)
- **SVC-09**: Blueprint maps to journey stages — each journey stage has corresponding frontstage/backstage/support rows
- **SVC-10**: Both outputs in Mermaid-compatible format for rendering (consistent with existing `/pde:flows` output pattern)
**Success Criteria:**
  1. `/pde:journey` produces a multi-stage journey map with touchpoints and metrics per stage
  2. `/pde:blueprint` produces a layered service blueprint aligned to journey stages

#### Phase C: Pricing & Tier Architecture
**Goal:** Service products have structured pricing design as a pipeline artifact
**Requirements:**
- **SVC-11**: `/pde:pricing` skill produces a tier architecture document: tier names, included features per tier, limits/quotas, pricing (monthly/annual), target customer persona per tier
- **SVC-12**: Feature gating matrix: rows = all features, columns = tiers, cells = included/limit/add-on/excluded
- **SVC-13**: Unit economics model per tier: estimated CAC, LTV, payback period, gross margin — using user-provided assumptions or industry benchmarks
- **SVC-14**: Revenue projection template: subscriber count × tier mix × ARPU across 12/24/36 month horizons
- **SVC-15**: Pricing skill reads competitive analysis (from `/pde:competitive`) to benchmark against market rates
**Success Criteria:**
  1. `/pde:pricing` produces a tier architecture with feature gating matrix
  2. Unit economics model shows CAC/LTV/margin per tier with stated assumptions

#### Phase D: Operations & SLA Design
**Goal:** Service products have operational readiness artifacts before launch
**Requirements:**
- **SVC-16**: `/pde:ops-design` skill produces: runbook templates (deploy, rollback, incident response, scaling), monitoring dashboard specification (metrics, thresholds, alerts), on-call rotation framework
- **SVC-17**: SLA framework document: availability targets per tier, response time commitments, measurement methodology, penalty/credit structure, exclusion windows
- **SVC-18**: Support system architecture: tier structure (self-service → standard → premium → enterprise), channel mix (docs, chatbot, email, phone, dedicated CSM), staffing ratios, escalation paths with criteria
- **SVC-19**: Knowledge base structure: category taxonomy, article templates, search/navigation patterns, feedback loop for article quality
- **SVC-20**: Operations handoff replaces code handoff for service products — produces runbooks + monitoring spec + SLA framework instead of TypeScript interfaces
**Success Criteria:**
  1. `/pde:ops-design` produces runbooks with deploy/rollback/incident procedures
  2. SLA framework document defines availability targets with measurement methodology

#### Phase E: Service Quality & Compliance
**Goal:** Service products get service-appropriate quality auditing and compliance design
**Requirements:**
- **SVC-21**: `/pde:service-audit` replaces `/pde:hig` for services — audits against: SLA feasibility (can you actually meet the promised uptime?), support scalability (can support handle projected growth?), churn risk (where are customers most likely to leave?), unit economics viability (does the pricing model work?)
- **SVC-22**: Compliance design document for service-relevant standards: SOC 2 Type II control mapping, GDPR data processing requirements, HIPAA safeguards (if health data), PCI DSS (if payment processing)
- **SVC-23**: Data processing architecture: where data lives (regions), who can access (RBAC model), retention policies, deletion workflows, data portability (export format)
- **SVC-24**: Trust page specification: security practices summary, compliance certifications, data handling disclosure, incident notification commitment — structured content for `/pde:handoff` to reference
- **SVC-25**: Service audit results feed into critique and iterate stages for service-specific revision
**Success Criteria:**
  1. `/pde:service-audit` flags SLA feasibility issues and churn risk areas
  2. Compliance document maps specific controls to SOC 2 / GDPR requirements

---

## v0.17 — Multi-Product Orchestration

**Goal:** PDE can manage products that span multiple types — a hardware device with a companion app and cloud service — running parallel design pipelines with tracked integration points.

**Why:** Real products rarely fit a single type. A smart home device is hardware (enclosure, PCB) + embedded software (firmware) + cloud service (data pipeline, API) + mobile app (companion UI) + service (subscription, support). PDE currently classifies these as "hybrid" but runs a single pipeline. True multi-product orchestration requires parallel pipelines with defined integration contracts between them.

**Dependencies:** v0.15 (Hardware Pipeline), v0.16 (Service Pipeline)

### Phases

#### Phase A: Product Decomposition
**Goal:** Complex products are decomposed into typed sub-products with tracked interfaces
**Requirements:**
- **MULTI-01**: `/pde:decompose` command breaks a hybrid/complex product into sub-products, each with its own product type (software, hardware, service)
- **MULTI-02**: Sub-products stored in `.planning/design/products/{name}/` with their own DESIGN-STATE.md and artifact trees
- **MULTI-03**: Integration contract definition: each sub-product declares its interfaces (APIs, protocols, data formats, physical connectors) that other sub-products depend on
- **MULTI-04**: Dependency graph visualization showing sub-product relationships and integration points (Mermaid output)
- **MULTI-05**: Decomposition is user-guided with AI-suggested structure — PDE proposes breakdown, user confirms/modifies
**Success Criteria:**
  1. A smart home device project decomposes into: hardware (device), software (firmware), software (mobile app), service (cloud backend + subscription)
  2. Integration contracts define the BLE protocol between device and app, the REST API between app and cloud

#### Phase B: Parallel Pipeline Execution
**Goal:** Sub-products run through type-appropriate pipelines concurrently with coordination at integration points
**Requirements:**
- **MULTI-06**: `/pde:build` on a multi-product project runs sub-product pipelines in parallel where no integration dependency exists
- **MULTI-07**: Pipeline coordination: when sub-product A's stage depends on sub-product B's artifact (e.g., mobile app wireframe needs hardware form factor dimensions), pipeline waits for dependency
- **MULTI-08**: Integration review stage: after all sub-product pipelines complete their design phases, an integration review checks that all contracts are satisfied
- **MULTI-09**: Unified DESIGN-STATE.md at project root aggregates sub-product states and shows overall coverage
- **MULTI-10**: `/pde:progress` shows per-sub-product pipeline status with integration contract satisfaction
**Success Criteria:**
  1. Hardware and software pipelines run in parallel until integration review
  2. Integration review catches contract mismatches (e.g., hardware exposes BLE 5.0 but app assumes BLE 5.3)

#### Phase C: Unified Handoff & Implementation
**Goal:** Multi-product handoff produces coordinated implementation plans across sub-products
**Requirements:**
- **MULTI-11**: `/pde:handoff` on multi-product projects produces per-sub-product handoff packages PLUS a master integration specification
- **MULTI-12**: Master integration spec documents: protocol contracts, data format schemas, physical connector specs, shared authentication/authorization, deployment coordination requirements
- **MULTI-13**: `/pde:implement` (from v0.6) generates implementation phases that respect cross-product dependencies — firmware must be flashable before app can test BLE pairing
- **MULTI-14**: Unified testing strategy: integration test plan that validates cross-product contracts (e.g., "device publishes BLE characteristic X, app reads and displays value Y")
- **MULTI-15**: Implementation phases are tagged with sub-product ownership for team routing
**Success Criteria:**
  1. Multi-product handoff produces per-product packages plus a master integration specification
  2. Implementation phases respect cross-product dependencies and are tagged for team assignment

---

## v0.18 — AI/ML Product Pipeline

**Goal:** PDE produces AI-native design artifacts — prompt architectures, evaluation frameworks, safety guardrails, model selection matrices, and cost models — when the product type involves AI/ML components.

**Why:** AI products require unique design thinking that software engineering alone doesn't cover. Prompt engineering, evaluation design, safety guardrails, and model selection are designable through structured stages. PDE already lives in the AI tooling space, making this a natural and high-value extension. The market for AI product development tooling is massive and underserved from a *design methodology* perspective — most tools focus on coding, not on the design decisions that determine whether an AI product is safe, effective, and economically viable.

**Dependencies:** v0.13 (Multi-Platform Design — pipeline routing by product type)

### Phases

#### Phase A: AI Product Type Detection & Brief
**Goal:** PDE detects AI/ML products and frames the unique design challenges they present
**Requirements:**
- **AI-01**: Brief product type detection expanded with "ai" as a product type, with subtypes: `agent` (autonomous AI agents), `feature` (AI features in a larger product), `pipeline` (ML training/inference pipelines), `chatbot` (conversational AI), `model` (fine-tuned or custom models)
- **AI-02**: AI signal vocabulary: LLM, GPT, Claude, Gemini, prompt, fine-tune, RAG, embedding, vector, inference, training, evaluation, eval, guardrail, tool calling, agent, chain-of-thought, few-shot, system prompt, token, context window, hallucination, grounding
- **AI-03**: AI-specific constraints populated in brief: quality bar (what "good enough" means for AI output), safety requirements (content policy, output validation), latency targets (response time budget), cost constraints (tokens per request × requests per user × margin), data requirements (training data, RAG corpus, evaluation datasets)
- **AI-04**: Brief includes a "Decision Boundary" section for AI products: what decisions does the AI make, at what confidence threshold, with what fallback when uncertain
**Success Criteria:**
  1. Brief correctly classifies a chatbot project as product_type: "ai", subtype: "chatbot" with AI-specific constraints
  2. Decision Boundary section articulates what the AI decides vs what humans decide

#### Phase B: Prompt Architecture & Model Selection
**Goal:** AI products get structured prompt design and model selection as pipeline artifacts
**Requirements:**
- **AI-05**: `/pde:prompt-arch` skill produces a prompt architecture document: system prompt structure, few-shot example strategy, chain-of-thought patterns, tool definitions, output format constraints, and prompt versioning strategy
- **AI-06**: Prompt architecture includes prompt decomposition — complex tasks broken into prompt chains with defined handoff points and data flow between stages
- **AI-07**: `/pde:model-select` skill produces a model selection matrix: capability requirements mapped against candidate models, with scoring across quality, latency, cost, context window, and feature support (tool calling, vision, structured output)
- **AI-08**: Model selection includes cost modeling: estimated tokens per request × requests per user × users × price per token = monthly cost, with comparison across candidates
- **AI-09**: Both skills read AI Gateway model catalog (when connected via MCP) for up-to-date pricing and capability data
**Success Criteria:**
  1. `/pde:prompt-arch` produces a versioned prompt architecture with chain decomposition
  2. `/pde:model-select` produces a scored matrix with cost projections across model candidates

#### Phase C: Evaluation Framework & Safety Design
**Goal:** AI products have structured evaluation and safety guardrails as first-class design artifacts
**Requirements:**
- **AI-10**: `/pde:eval-framework` skill produces: test case taxonomy (happy path, edge cases, adversarial, regression), golden dataset specification (format, size, curation criteria, refresh cadence), evaluation rubrics (per-dimension scoring with examples of each score level), automated eval pipeline specification (how to run evals in CI)
- **AI-11**: Eval framework includes baseline definition — the minimum acceptable performance that gates deployment, with specific metrics per dimension (accuracy, latency, safety, cost)
- **AI-12**: `/pde:safety-design` skill produces: content policy (allowed/forbidden topics, PII handling, bias mitigation), output validation rules (format checks, factuality grounding, citation requirements), fallback behavior (what to do when uncertain, when to escalate to human, how to gracefully refuse), and human-in-the-loop triggers (confidence thresholds, topic sensitivity, high-stakes decisions)
- **AI-13**: Safety design includes red-team test scenarios — adversarial prompts that the system must handle correctly, structured as eval test cases
- **AI-14**: Both skills produce artifacts that feed directly into implementation (eval framework → test suite, safety design → guardrail middleware)
**Success Criteria:**
  1. `/pde:eval-framework` produces a rubric with golden dataset spec and baseline metrics
  2. `/pde:safety-design` produces content policy + fallback behavior + red-team scenarios

#### Phase D: AI-Specific Critique, Handoff & Observability
**Goal:** AI products get specialized critique (eval-based), handoff (prompt + config specs), and monitoring design
**Requirements:**
- **AI-15**: Critique stage for AI products evaluates: prompt effectiveness (are outputs meeting quality rubric?), cost efficiency (are we within budget?), safety coverage (are guardrails adequate?), eval completeness (are edge cases covered?)
- **AI-16**: Handoff for AI products produces: prompt files (versioned, deployable system prompts), model configuration (provider, model ID, temperature, max tokens, tool definitions), eval pipeline setup (test runner config, golden dataset location, reporting format), monitoring specification (what to log, drift detection thresholds, alert triggers)
- **AI-17**: `/pde:ai-observability` skill produces a monitoring design: what to log per request (input, output, latency, tokens, cost, eval scores), drift detection (quality degradation over time), usage patterns (feature adoption, error rates), and feedback loop (how user corrections flow back into eval datasets and prompt improvements)
- **AI-18**: AI observability design includes cost alerting thresholds and automatic scaling/degradation strategies (switch to cheaper model under load, reduce context window, disable optional features)
**Success Criteria:**
  1. AI critique evaluates prompt effectiveness and cost efficiency, not just UI quality
  2. Handoff produces deployable prompt files and model config alongside code specs
  3. Observability design specifies drift detection and cost alerting

---

## v0.19 — Content Product Pipeline

**Goal:** PDE produces content strategy artifacts — audience research, content architecture, editorial calendars, style guides, and distribution plans — when the product type is "content."

**Why:** Every company publishes content (docs, blogs, newsletters, courses, marketing). Content products have a clear design lifecycle that maps naturally to PDE's pipeline, but no development tools address content *strategy design* structurally. Low effort to adapt existing pipeline stages — many map 1:1.

**Dependencies:** v0.13 (Multi-Platform Design — pipeline routing by product type)

### Phases

#### Phase A: Content Product Detection & Strategy Brief
**Goal:** PDE detects content products and frames the content strategy challenge
**Requirements:**
- **CNT-01**: Brief product type detection expanded with "content" type, with subtypes: `docs` (documentation sites), `editorial` (blogs, newsletters, publications), `course` (educational content, tutorials), `marketing` (landing pages, campaigns), `knowledge-base` (help centers, wikis)
- **CNT-02**: Content signal vocabulary: blog, newsletter, editorial, documentation, tutorial, course, curriculum, lesson, article, publish, CMS, markdown, MDX, content calendar, SEO, audience, readership, engagement, subscriber
- **CNT-03**: Content-specific constraints in brief: audience definition (who reads this, what they know, what they need), content pillars (3-5 thematic areas), publishing cadence (daily/weekly/monthly), voice & tone requirements, SEO targets, distribution channels
- **CNT-04**: Brief includes "Content-Market Fit" section: what gap does this content fill that existing sources don't
**Success Criteria:**
  1. Brief correctly classifies a documentation site as product_type: "content", subtype: "docs"
  2. Content pillars and audience definition appear in constraints

#### Phase B: Content Architecture & Editorial Design
**Goal:** Content products get information architecture and editorial workflow as pipeline artifacts
**Requirements:**
- **CNT-05**: `/pde:content-arch` skill (replaces wireframe for content) produces: topic taxonomy (hierarchical topic structure), content hierarchy (pillar pages → cluster pages → supporting content), navigation design (how readers discover and move through content), and cross-linking strategy
- **CNT-06**: `/pde:editorial` skill produces: editorial calendar template (cadence, themes, deadlines, owners, status), content templates per type (article structure, tutorial format, newsletter layout, documentation page), and style guide (voice, tone, formatting conventions, terminology glossary)
- **CNT-07**: Content architecture reads competitive analysis to identify topic gaps and differentiation angles
- **CNT-08**: Editorial design includes a content repurposing matrix: how one piece of content becomes multiple assets across channels (blog → tweet thread → newsletter section → video script)
**Success Criteria:**
  1. `/pde:content-arch` produces a topic taxonomy with hierarchy and cross-linking strategy
  2. `/pde:editorial` produces templates and a style guide with voice/tone specifications

#### Phase C: Content Critique, Distribution & Handoff
**Goal:** Content products get content-specific quality review and distribution planning
**Requirements:**
- **CNT-09**: Critique for content products evaluates: audience alignment (does this serve the defined audience?), content pillar coverage (are all pillars represented?), SEO readiness (keyword targeting, meta descriptions, internal linking), accessibility (reading level, alt text, translation readiness), and differentiation (does this say something competitors don't?)
- **CNT-10**: `/pde:distribution` skill produces: channel strategy (which content goes where — owned, earned, paid), SEO plan (target keywords per content piece, backlink strategy), social media playbook (posting schedule, format per platform, engagement strategy), email strategy (newsletter segments, drip sequences, re-engagement)
- **CNT-11**: Handoff for content products produces: CMS configuration spec (content types, fields, taxonomies, workflows), template implementations (page templates, component specs for content rendering), and analytics setup (events to track, goals to measure, dashboards to build)
- **CNT-12**: Content handoff includes a measurement framework: metrics per content type (pageviews, time on page, scroll depth, conversion, share rate) with targets based on competitive benchmarks
**Success Criteria:**
  1. Content critique evaluates audience alignment and SEO readiness
  2. Distribution plan covers multi-channel strategy with measurement targets

---

## v0.20 — Data Product Pipeline

**Goal:** PDE produces data product design artifacts — schema designs, pipeline architectures, quality frameworks, privacy designs, and API specifications — when the product type is "data."

**Why:** Data products (analytics dashboards, ML pipelines, data APIs, datasets-as-product) are an increasingly large market segment. They require unique design artifacts — schema design, data lineage, quality rules, privacy engineering — that neither software UI design nor service operations design adequately covers.

**Dependencies:** v0.13 (Multi-Platform Design — pipeline routing by product type)

### Phases

#### Phase A: Data Product Detection & Brief
**Goal:** PDE detects data products and frames data-specific design challenges
**Requirements:**
- **DATA-01**: Brief product type detection expanded with "data" type, with subtypes: `analytics` (dashboards, BI), `pipeline` (ETL/ELT, ML training), `api` (data API, data marketplace), `dataset` (dataset-as-product, open data)
- **DATA-02**: Data signal vocabulary: schema, ETL, ELT, pipeline, warehouse, lake, lakehouse, dbt, Spark, Airflow, BigQuery, Snowflake, Redshift, dashboard, BI, Looker, Metabase, Grafana, metrics, KPI, dimension, measure, fact table, star schema, vector, embedding, feature store
- **DATA-03**: Data-specific constraints in brief: data sources (what feeds the product), freshness requirements (real-time, hourly, daily, batch), quality bar (completeness, accuracy, consistency targets), privacy scope (PII present, anonymization needed, retention limits), scale targets (rows/events per day, query latency SLA)
- **DATA-04**: Brief includes "Data Value Chain" section: raw source → transformation → enrichment → serving → consumption → action
**Success Criteria:**
  1. Brief classifies a BI dashboard project as product_type: "data", subtype: "analytics"
  2. Data freshness, quality, and privacy constraints populated

#### Phase B: Schema Design & Pipeline Architecture
**Goal:** Data products get structured schema and pipeline design as pipeline artifacts
**Requirements:**
- **DATA-05**: `/pde:schema` skill (replaces system for data) produces: entity-relationship diagram (Mermaid), dimensional model (facts + dimensions), data dictionary (column definitions, types, constraints, business meaning), and schema evolution strategy (how to handle breaking changes)
- **DATA-06**: `/pde:pipeline-arch` skill (replaces flows for data) produces: data lineage diagram (source → transform → serve, with technology at each stage), transformation specifications (business rules, aggregation logic, join conditions), orchestration design (DAG structure, scheduling, dependencies, retry policy), and SLA per pipeline stage (freshness, latency, throughput)
- **DATA-07**: Schema design reads brief constraints to ensure privacy requirements are reflected in schema (PII columns flagged, anonymization strategy defined)
- **DATA-08**: Pipeline architecture includes cost estimation per stage (compute, storage, egress) at projected scale
**Success Criteria:**
  1. `/pde:schema` produces a dimensional model with data dictionary and evolution strategy
  2. `/pde:pipeline-arch` produces a lineage diagram with SLAs and cost estimates per stage

#### Phase C: Data Quality, Privacy & Handoff
**Goal:** Data products get quality frameworks, privacy engineering, and implementation-ready handoff
**Requirements:**
- **DATA-09**: `/pde:data-quality` skill produces: validation rule catalog (completeness, accuracy, consistency, timeliness checks per table/column), freshness monitoring thresholds, anomaly detection criteria (statistical bounds for key metrics), and data quality dashboard specification
- **DATA-10**: `/pde:privacy-design` skill produces: PII inventory (which fields, classification level), anonymization strategy per field (hash, mask, generalize, suppress, synthetic), retention policy (per table/dataset, with automated enforcement), access control matrix (roles × datasets), data subject rights workflow (access request, deletion request, portability)
- **DATA-11**: Critique for data products evaluates: schema normalization quality, pipeline resilience (what happens when a source fails?), privacy completeness (is all PII accounted for?), cost efficiency (are we over-engineering for the scale?)
- **DATA-12**: Handoff for data products produces: migration scripts (DDL for schema creation), pipeline config files (Airflow DAGs, dbt models, or equivalent), monitoring setup (quality checks, freshness alerts, anomaly triggers), and API specification (if data served via API — OpenAPI spec with pagination, filtering, auth)
**Success Criteria:**
  1. Data quality rules catalog covers all tables with specific validation criteria
  2. Privacy design produces PII inventory with anonymization strategy per field

---

## v0.21 — Brand & Identity Pipeline

**Goal:** PDE produces brand design artifacts — brand strategy, naming exploration, visual identity systems, and brand guidelines — when the product type is "brand."

**Why:** Brand identity is relevant to *every* product PDE can design. A natural extension of the existing design system skill (which produces tokens and typography) into the strategic layer above it. Brand work precedes and informs all other design — it's the foundation that wireframes, mockups, and content all build on.

**Dependencies:** v0.13 (Multi-Platform Design — pipeline routing by product type)

### Phases

#### Phase A: Brand Strategy & Naming
**Goal:** Brand products get structured strategy and naming exploration
**Requirements:**
- **BRD-01**: Brief product type detection expanded with "brand" type, with subtypes: `identity` (new brand creation), `refresh` (rebrand/update), `extension` (new sub-brand or product line brand), `architecture` (multi-brand portfolio organization)
- **BRD-02**: `/pde:brand-strategy` skill produces: brand positioning (category, target, differentiation, reason to believe), brand personality (archetype, attributes, voice characteristics), brand values (3-5 with behavioral definitions), competitive positioning map (2-axis plot vs competitors)
- **BRD-03**: `/pde:naming` skill produces: naming criteria (phonetic, semantic, legal, domain availability), candidate generation (50+ candidates across naming strategies: descriptive, invented, metaphorical, acronym), linguistic screening (pronunciation across target markets, negative associations, cultural sensitivity), and shortlist with rationale (top 5 with trademark preliminary check guidance)
- **BRD-04**: Brand strategy reads competitive analysis for positioning differentiation and naming landscape (what names competitors use, naming conventions in the category)
**Success Criteria:**
  1. `/pde:brand-strategy` produces a positioning statement with personality archetype and values
  2. `/pde:naming` produces a screened shortlist with rationale for each candidate

#### Phase B: Visual Identity System
**Goal:** Brand products get comprehensive visual identity design
**Requirements:**
- **BRD-05**: `/pde:visual-identity` skill produces: logo concept direction (3 directions with mood boards, not finished logos), color palette (primary, secondary, accent, neutral with OKLCH values and psychological rationale), typography system (primary + secondary typefaces with pairing rationale and scale), iconography style (line weight, corner radius, metaphor style, grid), photography/illustration direction (style, subjects, treatment, examples)
- **BRD-06**: Visual identity extends PDE's design system skill — brand tokens become the foundation that `/pde:system` builds upon for product-level tokens
- **BRD-07**: Visual identity includes motion identity — how the brand moves (animation style, easing personality, transition principles) building on PDE's existing motion design reference
- **BRD-08**: All visual identity outputs in token-ready format — can be directly consumed by `/pde:system` to generate DTCG design tokens
**Success Criteria:**
  1. Visual identity produces color, typography, and iconography specifications with strategic rationale
  2. Visual identity tokens can be consumed by `/pde:system` without manual translation

#### Phase C: Brand Guidelines & Application
**Goal:** Brand products get comprehensive guidelines and application specifications
**Requirements:**
- **BRD-09**: `/pde:brand-guidelines` skill produces: logo usage rules (clear space, minimum size, color variations, don'ts), color application rules (primary/secondary ratios, background pairings, accessibility), typography application (heading hierarchy, body text, captions, pull quotes), photography guidelines (composition, treatment, subjects), voice & tone guide (personality across contexts: formal, casual, crisis, celebration)
- **BRD-10**: Brand application templates: business card, email signature, social media profiles (per platform dimensions), presentation template, letterhead — as specifications not finished designs
- **BRD-11**: `/pde:brand-arch` skill (for architecture subtype): portfolio visualization (masterbrand, endorsed, house of brands, hybrid), naming system (how sub-brands relate to master brand), visual hierarchy (how brand elements cascade across tiers)
- **BRD-12**: Brand handoff produces: asset specifications (file formats, sizes, color spaces for production), brand book (comprehensive guidelines document compiled from all brand artifacts), and design system seed (tokens ready for `/pde:system` consumption in any product project)
**Success Criteria:**
  1. Brand guidelines cover logo, color, typography, and voice with application rules
  2. Brand handoff produces a design system seed consumable by product projects

---

## v0.22 — Education & Training Pipeline

**Goal:** PDE produces learning design artifacts — learning objectives, curriculum maps, assessment designs, and instructor materials — when the product type is "education."

**Why:** Education/training products (courses, bootcamps, certification programs, corporate training, onboarding) have a well-established design methodology (ADDIE, Bloom's taxonomy, backwards design). PDE's research→design→build→verify loop maps directly to analyze→design→develop→implement→evaluate. Relatively low effort to adapt.

**Dependencies:** v0.13 (Multi-Platform Design — pipeline routing by product type)

### Phases

#### Phase A: Learning Product Detection & Objectives
**Goal:** PDE detects education products and designs learning outcomes
**Requirements:**
- **EDU-01**: Brief product type detection expanded with "education" type, with subtypes: `course` (structured learning path), `workshop` (intensive, time-bounded), `certification` (assessment-gated credential), `onboarding` (new-hire or new-user training), `reference` (documentation/knowledge base with learning pathways)
- **EDU-02**: Education signal vocabulary: curriculum, syllabus, learning objective, module, lesson, assessment, quiz, certification, Bloom's taxonomy, competency, prerequisite, learning path, LMS, SCORM, cohort, instructor, self-paced, project-based
- **EDU-03**: `/pde:learning-objectives` skill produces: terminal objectives (what learners can DO after completing the product, mapped to Bloom's taxonomy levels), enabling objectives per module (prerequisites that build toward terminal objectives), assessment alignment matrix (each objective mapped to how it's assessed), and prerequisite analysis (what learners must know before starting)
- **EDU-04**: Learning objectives include difficulty progression curve — how cognitive complexity increases across the learning path
**Success Criteria:**
  1. Brief classifies a bootcamp project as product_type: "education", subtype: "course"
  2. Learning objectives are mapped to Bloom's taxonomy with assessment alignment

#### Phase B: Curriculum Design & Assessment
**Goal:** Education products get structured curriculum maps and assessment designs
**Requirements:**
- **EDU-05**: `/pde:curriculum` skill (replaces flows for education) produces: module sequence (ordered with dependencies and time allocations), content outline per module (topics, activities, materials, duration), learning path variants (self-paced vs cohort, beginner vs advanced tracks), and practice/project milestones (hands-on application points throughout the curriculum)
- **EDU-06**: `/pde:assessment` skill produces: assessment strategy per module (formative checks, summative evaluations, practical demonstrations), rubric specifications (criteria, levels, descriptions, point weights), question bank structure (question types, difficulty distribution, topic coverage), and certification criteria (passing threshold, retake policy, credential format)
- **EDU-07**: Curriculum design includes time estimation: realistic hours per module based on content density and activity type (lecture, reading, practice, project)
- **EDU-08**: Assessment design includes anti-cheating considerations for online delivery (question randomization, time constraints, practical demonstrations over multiple-choice)
**Success Criteria:**
  1. `/pde:curriculum` produces a sequenced module plan with time allocations and dependencies
  2. `/pde:assessment` produces rubrics with criteria and scoring levels per assessment

#### Phase C: Learning Experience & Handoff
**Goal:** Education products get experience design and implementation-ready specifications
**Requirements:**
- **EDU-09**: Critique for education products evaluates: objective coverage (does curriculum teach what objectives promise?), cognitive load management (is difficulty progression appropriate?), engagement variety (mix of content types: reading, video, practice, discussion, project), accessibility (multi-modal content, accommodation for diverse learners), and assessment validity (do assessments actually measure the objectives?)
- **EDU-10**: `/pde:instructor-design` skill produces: facilitator guide (per-module teaching notes, discussion prompts, common misconceptions, differentiation strategies), demo scripts (step-by-step guides for live demonstrations), and learner materials spec (workbook structure, reference sheets, resource links)
- **EDU-11**: Handoff for education products produces: LMS configuration spec (course structure, enrollment rules, grading policies, completion criteria), content production checklist (per-module: script, slides, exercises, assessments, with format and platform specs), and measurement framework (completion rates, assessment scores, learner satisfaction, skill transfer metrics)
- **EDU-12**: Education handoff includes a pilot plan: first cohort size, feedback collection method, iteration criteria before scaling
**Success Criteria:**
  1. Critique evaluates objective coverage and cognitive load management
  2. Handoff produces an LMS configuration spec and content production checklist

---

## v0.23 — Game Product Pipeline

**Goal:** PDE produces game design artifacts — game design documents, economy designs, level progression, narrative design, and playtesting protocols — when the product type is "game."

**Why:** Games have a distinct and mature design discipline with unique artifacts (GDD, economy balancing, level design, narrative branching) that don't map to any other product type. The critique→iterate loop maps perfectly to playtesting cycles. Higher effort due to the novelty of game-specific design stages.

**Dependencies:** v0.13 (Multi-Platform Design — pipeline routing by product type)

### Phases

#### Phase A: Game Detection & Core Design
**Goal:** PDE detects game products and produces a game design document
**Requirements:**
- **GAME-01**: Brief product type detection expanded with "game" type, with subtypes: `mobile` (mobile games), `browser` (web games), `pc-console` (desktop/console games), `tabletop` (board/card games), `gamified` (gamification layer in non-game product)
- **GAME-02**: Game signal vocabulary: game loop, mechanic, level, player, score, health, inventory, quest, NPC, enemy, spawn, power-up, achievement, leaderboard, multiplayer, matchmaking, save, checkpoint, difficulty, tutorial, sandbox, roguelike, RPG, FPS, puzzle, strategy, simulation, idle
- **GAME-03**: `/pde:game-design` skill produces a Game Design Document (GDD): core loop (what the player does repeatedly), mechanics catalog (each mechanic with rules, interactions, edge cases), win/loss conditions, player progression model (how the player grows in capability/content access), session structure (ideal play session length and arc), and platform constraints (input methods, performance targets, screen real estate)
- **GAME-04**: GDD includes a "Core Fantasy" statement — the emotional experience the game delivers, with every mechanic evaluated against whether it serves or dilutes the fantasy
**Success Criteria:**
  1. Brief classifies a mobile game as product_type: "game", subtype: "mobile"
  2. GDD defines core loop, mechanics catalog, and core fantasy

#### Phase B: Economy & Progression Design
**Goal:** Game products get balanced economy and progression systems
**Requirements:**
- **GAME-05**: `/pde:game-economy` skill produces: currency flows (sources → sinks for each currency), reward schedule (pacing of rewards mapped to player progression), monetization design (if applicable: what is purchasable, price points, value proposition, fairness constraints), and economy parameters table (tuning knobs with initial values and balance rationale)
- **GAME-06**: Progression design includes: difficulty curve (challenge vs skill across game content), unlock sequence (when players access new mechanics, content, areas), mastery indicators (how players know they're improving), and pacing model (action/rest rhythm across sessions)
- **GAME-07**: Economy design includes sustainability analysis: will the economy inflate, deflate, or remain stable over 30/90/365 day horizons
- **GAME-08**: `/pde:level-design` skill produces: level/content outline (ordered with difficulty ratings and new mechanic introductions), level design principles (derived from core fantasy and mechanics), and content volume estimation (how much content is needed for target play hours)
**Success Criteria:**
  1. Economy design defines currency flows with source/sink balance analysis
  2. Level outline maps difficulty progression with new mechanic introductions

#### Phase C: Narrative & Experience Design
**Goal:** Game products with narrative elements get structured story design
**Requirements:**
- **GAME-09**: `/pde:narrative` skill produces (when game has narrative): story arc structure (acts, key beats, emotional trajectory), character profiles (motivations, arcs, relationships), dialogue system design (branching model, tone, voice), lore bible (world rules, history, factions), and narrative-mechanic integration points (where story and gameplay intersect)
- **GAME-10**: For games without explicit narrative, skill produces environmental storytelling design: how the world communicates without dialogue (visual cues, environmental details, emergent narrative)
- **GAME-11**: Experience design extends flows for games: player emotional journey map (excitement, tension, relief, satisfaction) aligned to game structure, onboarding/tutorial flow (how new players learn without walls of text), and social experience design (if multiplayer: cooperation, competition, communication, community)
**Success Criteria:**
  1. Narrative-driven games get story arcs with character profiles and branching dialogue design
  2. All games get player emotional journey maps and onboarding flows

#### Phase D: Playtest Protocol & Game Handoff
**Goal:** Game products get structured playtesting methodology and implementation specs
**Requirements:**
- **GAME-12**: `/pde:playtest` skill (replaces critique for games) produces: playtest protocol (session structure, observer guide, data collection instruments), test scenario library (specific scenarios to test per mechanic/level/feature), metrics to collect (completion rate, death locations, session length, retention, monetization conversion), and feedback synthesis template (how to structure findings into actionable design changes)
- **GAME-13**: Playtest protocol includes different methodologies by development stage: paper prototyping (mechanics validation), gray-box testing (flow and pacing), full-art testing (polish and feel), and scale testing (multiplayer/economy balance)
- **GAME-14**: Handoff for game products produces: technical design spec (game architecture, state management, networking model if multiplayer), asset production list (art, audio, animation assets with style specs and priority), engine/framework recommendation (Unity, Unreal, Godot, Phaser, custom — based on platform and scope), and balance parameter sheet (all tunable values in a single structured document for rapid iteration)
- **GAME-15**: Game handoff includes a vertical slice definition: the minimum playable segment that demonstrates the core loop, for production validation before full build
**Success Criteria:**
  1. Playtest protocol defines session structure with data collection instruments
  2. Handoff includes vertical slice definition and balance parameter sheet

---

## v0.24 — Physical Space Pipeline

**Goal:** PDE produces spatial design artifacts — space programs, floor plans, materials palettes, wayfinding systems, and occupancy/safety analysis — when the product type is "space."

**Why:** Physical spaces (retail stores, offices, event venues, co-working, exhibitions) follow a research→concept→layout→materials→review→iterate lifecycle. PDE's hardware references (materials, ergonomics, compliance) partially apply. Higher effort due to spatial design's specialist nature, but relevant to any company that also designs physical environments for their products.

**Dependencies:** v0.15 (Hardware Product Pipeline — materials and safety patterns reused)

### Phases

#### Phase A: Space Product Detection & Programming
**Goal:** PDE detects spatial products and produces a space program
**Requirements:**
- **SPACE-01**: Brief product type detection expanded with "space" type, with subtypes: `retail` (stores, showrooms), `office` (workplace, co-working), `event` (venues, exhibitions, pop-ups), `hospitality` (hotels, restaurants, cafes), `public` (libraries, community centers, transit)
- **SPACE-02**: Space signal vocabulary: floor plan, layout, square footage, occupancy, egress, ADA, wayfinding, signage, fixture, lighting, HVAC, acoustics, zoning, tenant improvement, FF&E, traffic flow, sightline, dwell time
- **SPACE-03**: `/pde:space-program` skill produces: room/zone inventory (name, function, square footage, adjacency requirements, occupancy), adjacency matrix (which zones must be near/far from each other with rationale), circulation requirements (primary paths, emergency egress, ADA routes, back-of-house), and infrastructure requirements per zone (power, data, plumbing, HVAC, acoustic isolation)
- **SPACE-04**: Space program includes occupancy model: peak vs average headcount, flow patterns by time of day, and seasonal variation
**Success Criteria:**
  1. Brief classifies a retail project as product_type: "space", subtype: "retail"
  2. Space program defines zones with adjacency matrix and infrastructure requirements

#### Phase B: Layout & Materials Design
**Goal:** Spatial products get floor plan concepts and materials specifications
**Requirements:**
- **SPACE-05**: `/pde:layout` skill (replaces wireframe for spaces) produces: zoning diagram (SVG — zones with approximate proportions and adjacencies), circulation overlay (primary, secondary, emergency paths), sightline analysis (key views, visual focal points, privacy screening), and furniture layout concept (major fixtures positioned, not individual items)
- **SPACE-06**: Materials palette extends hardware materials skill for interior finishes: flooring (type, durability class, acoustic rating), wall treatments (paint, tile, wood, acoustic panels), ceiling (height, type, acoustic performance), lighting (ambient, task, accent with color temperature and lux targets), and FF&E direction (furniture style, material palette, color story)
- **SPACE-07**: Layout includes ADA compliance check: turning radius, clear floor space, reach ranges, door clearances, counter heights, accessible route continuity
- **SPACE-08**: Materials include durability specifications mapped to traffic levels (high-traffic: commercial-grade, low-traffic: residential-grade)
**Success Criteria:**
  1. Layout produces zoning diagrams with circulation paths and sightline analysis
  2. Materials palette specifies finishes with durability ratings for traffic levels

#### Phase C: Experience, Safety & Handoff
**Goal:** Spatial products get experience design, safety compliance, and implementation specifications
**Requirements:**
- **SPACE-09**: `/pde:wayfinding` skill produces: signage system (hierarchy: identification, directional, informational, regulatory), navigation sequence (how visitors move from entry to destination), digital touchpoints (interactive kiosks, mobile wayfinding integration), and brand integration (how signage reflects brand identity)
- **SPACE-10**: Safety & compliance extends hardware safety for spaces: fire code compliance (occupancy limits, egress capacity, fire-rated assemblies), ADA compliance checklist (accessible route, restrooms, counters, parking), building code requirements (zoning, permits, inspections), and MEP coordination notes (electrical capacity, plumbing rough-in, HVAC zones)
- **SPACE-11**: Critique for spaces evaluates: customer experience flow (does the layout serve the intended journey?), brand expression (does the space feel like the brand?), operational efficiency (can staff work effectively?), accessibility thoroughness, and code compliance
- **SPACE-12**: Handoff for spaces produces: construction documentation brief (scope of work for architect/contractor), FF&E specification package (furniture, fixtures, equipment with vendors and pricing), signage production spec (dimensions, materials, content, mounting), and phased implementation plan (if space is occupied during renovation)
**Success Criteria:**
  1. Wayfinding produces a signage hierarchy with navigation sequences
  2. Handoff produces a construction brief and FF&E specification package

---

## v0.25 — Policy & Governance Pipeline

**Goal:** PDE produces governance design artifacts — policy briefs, stakeholder impact analyses, policy drafts, review matrices, and implementation plans — when the product type is "policy."

**Why:** Policies (internal company policies, compliance frameworks, governance structures, process documentation, regulatory submissions) follow a research→draft→review→approve→publish→maintain lifecycle. Many organizations treat policy creation as ad-hoc document writing; PDE can bring structured design methodology to a discipline that badly needs it. Low effort because the pipeline mapping is direct.

**Dependencies:** v0.13 (Multi-Platform Design — pipeline routing by product type)

### Phases

#### Phase A: Policy Product Detection & Brief
**Goal:** PDE detects policy/governance products and frames the governance challenge
**Requirements:**
- **POL-01**: Brief product type detection expanded with "policy" type, with subtypes: `internal` (company policies, HR policies, security policies), `compliance` (regulatory compliance frameworks, audit preparation), `process` (SOPs, workflow documentation, runbooks), `external` (terms of service, privacy policies, regulatory submissions)
- **POL-02**: Policy signal vocabulary: policy, regulation, compliance, governance, audit, control, procedure, standard operating procedure, SOP, mandate, guideline, framework, RACI, stakeholder, approval, enforcement, exception, escalation, review cycle, retention
- **POL-03**: `/pde:policy-brief` skill produces: regulatory trigger (what regulation, incident, or organizational change prompted this), scope definition (who/what is covered, explicit exclusions), stakeholder inventory (affected parties with impact level: high/medium/low), current state assessment (existing policies, gaps, conflicts), and success criteria (how to measure whether the policy achieves its intent)
- **POL-04**: Policy brief includes jurisdictional analysis: which legal jurisdictions apply and where requirements conflict
**Success Criteria:**
  1. Brief classifies an SOC 2 compliance project as product_type: "policy", subtype: "compliance"
  2. Policy brief identifies regulatory triggers and stakeholder inventory

#### Phase B: Policy Design & Impact Analysis
**Goal:** Policy products get structured drafting and impact assessment
**Requirements:**
- **POL-05**: `/pde:impact-analysis` skill produces: stakeholder impact matrix (per stakeholder group: what changes, effort required, risk of non-compliance, support needed), systems impact (which tools/processes need configuration changes), timeline impact (implementation duration, grace period, enforcement date), and cost impact (training, tooling, staffing, opportunity cost)
- **POL-06**: `/pde:policy-draft` skill produces: structured policy document with numbered clauses, defined terms section, scope and applicability, requirements (SHALL/SHOULD/MAY language per RFC 2119), exceptions process, enforcement mechanism, review schedule, and version history
- **POL-07**: Policy draft includes a RACI matrix: per clause, who is Responsible, Accountable, Consulted, and Informed
- **POL-08**: Critique for policies evaluates: enforceability (can this actually be enforced with existing tools/processes?), clarity (is the language unambiguous?), completeness (are edge cases covered?), proportionality (is the burden proportionate to the risk?), and consistency (does this conflict with existing policies?)
**Success Criteria:**
  1. Impact analysis produces per-stakeholder impact matrix with change requirements
  2. Policy draft uses RFC 2119 language with numbered clauses and RACI matrix

#### Phase C: Policy Implementation & Handoff
**Goal:** Policy products get implementation planning and maintenance specifications
**Requirements:**
- **POL-09**: `/pde:policy-implement` skill produces: communication plan (who learns about the policy, when, how, in what order), training plan (who needs training, format, duration, assessment), system configuration checklist (tool changes required to enforce the policy), and rollout timeline (phased by team/department with milestones)
- **POL-10**: `/pde:audit-design` skill produces: audit checklist (verifiable criteria per policy clause), evidence collection guide (what artifacts demonstrate compliance per criterion), audit schedule (frequency, scope rotation, sampling methodology), and non-compliance handling (escalation path, remediation timelines, exception documentation)
- **POL-11**: Handoff for policies produces: approved policy document (final version with all review comments resolved), implementation package (communication templates, training materials outline, system change tickets), monitoring specification (how to detect policy violations, reporting dashboard, alert triggers), and maintenance schedule (review cadence, trigger events for out-of-cycle review, owner succession plan)
- **POL-12**: Policy handoff includes a "policy decay" framework: signals that the policy is becoming stale (regulation changes, organizational changes, incident patterns, exception volume trending up) and triggers for review
**Success Criteria:**
  1. Implementation plan includes communication, training, and system configuration checklists
  2. Audit design produces verifiable criteria per policy clause with evidence collection guide

---

## v0.26 — Maximum Parallelization

**Goal:** Push every PDE process to maximum concurrency — execution pipelining, worktree-isolated sharding, design pipeline parallelism, verification fan-out, research/planning overlap, and a reconciliation agent that merges divergent branches back together.

**Why:** PDE's processes are overwhelmingly sequential: execution waits between waves, design critique evaluates perspectives one-by-one, wireframes generate screen-by-screen, verification checks run in series, and planning blocks entirely on research completion. As projects scale, these serial bottlenecks compound — a phase with 10 plans, 8 screens, and 4 critique perspectives could theoretically run ~40x faster with full parallelization. Task-level sharding (v0.8 WFM-05) is a prerequisite — it provides the atomic work units that execution phases parallelize across isolated environments.

**Dependencies:** v0.8 (Workflow Maturity — task-file sharding and reconciliation foundation)

### Current Parallelization Baseline

| Process | Status | Model |
|---------|--------|-------|
| Execution (execute-phase) | Parallel within waves | Wave-based, sequential between waves |
| Codebase Mapping (map-codebase) | Parallel | 4 background mapper agents |
| Gap Diagnosis (diagnose-issues) | Parallel | 1 debugger per gap, all spawned at once |
| Research Phase | Sequential | Single researcher agent |
| Planning Phase | Sequential | researcher → planner → checker chain |
| Verification | Sequential | Single verifier, checks in series |
| Nyquist Validation | Sequential | Single auditor agent |
| Design: Wireframe | Sequential | Screen-by-screen generation |
| Design: Critique | Sequential | Perspective-by-perspective evaluation |
| Design: Iteration | Sequential | Screen-by-screen application |
| Design: HIG Audit | Sequential | WCAG criteria evaluated in series |
| Milestone Audit | Sequential | Phase verifications read one-by-one |
| Handoff | Sequential | Single spec generation pass |

### Phases

#### Phase A: Cross-Wave Pipelining
**Goal:** Plans start executing as soon as their specific `depends_on` predecessors complete, not when the entire wave finishes
**Requirements:**
- **PAR-01**: Execute-phase orchestrator switches from wave-group execution to a **ready-queue model** — a plan becomes eligible when all entries in its `depends_on` list have completed SUMMARYs, regardless of wave membership
- **PAR-02**: Completion callback mechanism — when a plan finishes, the orchestrator re-evaluates the pending queue and spawns any newly-eligible plans immediately
- **PAR-03**: Configurable concurrency ceiling (`max_parallel_agents` in config.json, default: unlimited) to prevent resource exhaustion on constrained environments
- **PAR-04**: Wave metadata (`wave: N`) remains in PLAN.md frontmatter for visualization and planning purposes but is no longer the sole execution scheduler
- **PAR-05**: `/pde:execute-phase --dry-run` shows the pipelined execution timeline vs. the wave-sequential timeline for comparison
**Success Criteria:**
  1. A phase where Wave 1 has one fast plan and one slow plan begins Wave 2 dependents of the fast plan before the slow plan finishes
  2. Total phase execution time decreases measurably vs. wave-sequential for phases with uneven plan durations

#### Phase B: Worktree-Isolated Execution
**Goal:** Each parallel executor agent operates in its own git worktree, eliminating file-level contention
**Requirements:**
- **PAR-06**: Execute-phase orchestrator spawns executor agents with `isolation: "worktree"`, each receiving an isolated copy of the repository
- **PAR-07**: Each worktree-isolated agent commits to its own branch (naming convention: `pde/{phase}/{plan-id}`)
- **PAR-08**: Orchestrator tracks active worktree branches and their completion status in `.planning/parallel-state.json`
- **PAR-09**: Fallback to same-directory execution when `parallelization.worktree: false` in config.json or when the repo has uncommitted changes that can't be stashed
- **PAR-10**: Worktree cleanup protocol — completed worktrees are removed after successful merge; failed worktrees are preserved for debugging
**Success Criteria:**
  1. Two plans that modify overlapping files execute simultaneously in separate worktrees without conflict during execution
  2. Worktrees are cleaned up automatically after successful reconciliation

#### Phase C: Reconciliation Agent
**Goal:** A dedicated agent merges worktree branches back to the main branch, resolving conflicts intelligently
**Requirements:**
- **PAR-11**: `pde-reconciler` agent receives the list of completed worktree branches and merges them sequentially into the target branch, ordered by dependency graph (upstream plans merge first)
- **PAR-12**: For each merge, reconciler classifies conflicts as: `trivial` (both sides added to different sections of the same file — auto-resolve), `semantic` (both sides modified the same function/component — requires analysis), or `structural` (incompatible changes to shared interfaces/types — requires user input)
- **PAR-13**: Trivial conflicts are auto-resolved with combined changes; semantic conflicts are resolved by analyzing both SUMMARYs for intent and producing a merged version; structural conflicts are surfaced to the user with both versions and a recommendation
- **PAR-14**: Reconciliation report (RECONCILIATION.md) documents each merge: branch pair, conflict count by type, resolution strategy, and any manual interventions required
- **PAR-15**: Post-reconciliation verification — after all branches are merged, run the existing `pde-verifier` agent to ensure the combined result still meets phase goals
**Success Criteria:**
  1. Three plans executed in parallel worktrees are merged back with auto-resolution of trivial conflicts
  2. Semantic conflicts produce a merged version that preserves intent from both branches
  3. Structural conflicts are surfaced to the user before proceeding

#### Phase D: Intra-Plan Task Parallelism
**Goal:** Within a single plan, independent tasks execute concurrently (building on v0.8 task-file sharding)
**Requirements:**
- **PAR-16**: Task files (from v0.8 WFM-05) gain a `depends_on_tasks` frontmatter field specifying intra-plan dependencies
- **PAR-17**: `pde-executor` applies the same ready-queue model from PAR-01 at the task level — tasks with no pending dependencies spawn as parallel sub-executors
- **PAR-18**: Each sub-executor operates in its own worktree (reusing PAR-06 infrastructure) or in the same directory for tasks with no file overlap (detected by comparing task file paths)
- **PAR-19**: File overlap detection — before spawning parallel task executors, the orchestrator analyzes `relevant_files` from each task file and warns if overlap exceeds a threshold (default: 0 overlapping files for worktree-less execution)
- **PAR-20**: Task-level reconciliation reuses PAR-11 through PAR-15 at a finer grain, merging task branches before the plan SUMMARY is written
**Success Criteria:**
  1. A plan with 8 tasks where 4 are independent executes those 4 simultaneously
  2. Task-level parallelism reduces plan execution time proportional to the parallelism available in its dependency graph

#### Phase E: Design Pipeline Parallelization
**Goal:** Parallelize the design pipeline's most expensive operations — wireframe generation, critique evaluation, iteration application, and HIG auditing
**Requirements:**
- **PAR-21**: Wireframe generation spawns one agent per screen (from screen inventory) in parallel, each producing its HTML wireframe independently; an aggregator collects and writes all files, then updates DESIGN-STATE once
- **PAR-22**: Design critique spawns 4 perspective agents simultaneously (UX/Usability, Visual Hierarchy, Accessibility, Business Alignment), each evaluating all screens for their perspective; findings are merged by severity into a single critique report
- **PAR-23**: Within each critique perspective, per-screen evaluations are further parallelized when screen count exceeds a threshold (default: 4 screens) — nested parallelism producing up to 4×N concurrent evaluation units
- **PAR-24**: Iteration applies findings to multiple screens in parallel — each screen's finding set is independent; only same-element conflicts within a single screen require sequential resolution
- **PAR-25**: HIG audit spawns parallel evaluators by POUR principle (Perceivable, Operable, Understandable, Robust), each running its WCAG criteria checks independently; results merge into a single HIG report
- **PAR-26**: User flow mapping generates per-journey Mermaid diagrams in parallel once the journey inventory is established from the brief; screen inventory extraction runs after all journeys complete
- **PAR-27**: Design pipeline orchestrator (`design-planner`) annotates each skill's parallelizability in PLAN.md so the design executor knows which steps can overlap
**Success Criteria:**
  1. A design critique on 6 screens runs 4 perspective evaluators in parallel, reducing critique time by ~4x
  2. Wireframe generation for 8 screens runs all 8 in parallel
  3. HIG audit parallelizes POUR principles, with each principle's criteria evaluated independently

#### Phase F: Verification & Validation Fan-Out
**Goal:** Parallelize verification checks, Nyquist validation discovery, and milestone auditing across independent evaluation dimensions
**Requirements:**
- **PAR-28**: Phase verification (`pde-verifier`) decomposes into 4 parallel check agents: artifact verification (files exist, are substantive), wiring verification (key links between components), requirements coverage (cross-reference against REQUIREMENTS.md), and anti-pattern scanning (TODOs, stubs, placeholders); results merge into a single VERIFICATION.md
- **PAR-29**: Nyquist validation discovery parallelizes: artifact reading, requirement-to-task mapping, and test infrastructure scanning run as 3 concurrent discovery tasks before gap analysis begins
- **PAR-30**: Milestone auditing reads all phase VERIFICATION.md files in parallel and runs 3-source requirement cross-reference checks (REQUIREMENTS.md, SUMMARY frontmatter, VERIFICATION tables) concurrently; integration checker runs after all phase data is collected
- **PAR-31**: Post-execution spot-checking (within execute-phase) parallelizes file existence checks and git commit verification across all plans in a completed wave, rather than checking sequentially
- **PAR-32**: Verification agents reuse the `max_parallel_agents` ceiling from PAR-03 to avoid resource exhaustion when verification fan-out overlaps with execution
**Success Criteria:**
  1. Phase verification with 4 parallel check agents completes faster than sequential single-verifier baseline
  2. Milestone audit of 5+ phases reads all verification documents in parallel
  3. Spot-checking 4 completed plans in a wave runs all checks simultaneously

#### Phase G: Research & Planning Overlap
**Goal:** Allow research and planning processes to overlap where dependencies permit, and parallelize context gathering within each
**Requirements:**
- **PAR-33**: Plan-phase context gathering parallelizes: CONTEXT.md loading, validation strategy extraction from RESEARCH.md, UI-SPEC.md gate check, and existing plan inventory check run as 4 concurrent reads before planner spawn
- **PAR-34**: Research phase supports **domain decomposition** — when a phase's research scope spans multiple domains (e.g., API research + UI patterns + data model), the orchestrator spawns parallel researcher agents with narrowed scope, each producing a section of RESEARCH.md; a synthesizer agent merges sections (reusing the pattern from `pde-research-synthesizer`)
- **PAR-35**: Multi-plan planning — when a phase has predictable plan boundaries (derived from requirements grouping), the planner can generate multiple PLAN.md files in parallel, each scoped to a requirement cluster; plan-checker validates each independently
- **PAR-36**: Research-while-planning overlap — when research is complete for a subset of a phase's scope, planning can begin for that subset while research continues for the remaining scope; requires splitting RESEARCH.md into section-level completion markers
- **PAR-37**: Plan-checker parallelization — when multiple plans exist for a phase, all plan-checker agents run simultaneously rather than validating plans sequentially in the revision loop
**Success Criteria:**
  1. Context gathering for plan-phase runs 4 reads in parallel, reducing planning startup latency
  2. A phase with 3 distinct requirement clusters generates 3 plans in parallel
  3. Research domain decomposition produces merged RESEARCH.md from parallel researcher agents

#### Phase H: Parallelization Infrastructure & Observability
**Goal:** Shared infrastructure that all parallel processes depend on — concurrency control, progress tracking, and performance comparison
**Requirements:**
- **PAR-38**: Global concurrency manager reads `max_parallel_agents` from config.json and enforces it across all PDE processes (execution, design, verification, research), queuing excess agent spawns until slots free up
- **PAR-39**: Parallel execution dashboard — `/pde:parallel-status` command shows: active agents (count, type, elapsed time), queued agents (waiting for concurrency slot or dependency), completed agents (duration, status), and resource utilization estimate
- **PAR-40**: Performance comparison mode — every parallel-capable process logs wall-clock duration; `/pde:stats` gains a "parallelization impact" section showing actual vs. estimated-sequential duration per phase, with cumulative time saved
- **PAR-41**: Graceful degradation — if any parallel agent fails, the orchestrator continues with remaining agents and reports partial results; failed agents can be retried individually without re-running the entire parallel batch
- **PAR-42**: `parallelization` config section in config.json gains per-process overrides: `execution: true/false`, `design: true/false`, `verification: true/false`, `research: true/false` — allowing users to enable parallelism incrementally
**Success Criteria:**
  1. `/pde:parallel-status` shows real-time agent status during a parallel execution run
  2. `/pde:stats` reports time saved by parallelization vs. sequential baseline
  3. Disabling `parallelization.design` falls back to sequential wireframe/critique without errors

---

## Cross-Cutting Concerns

These items should be addressed incrementally across milestones rather than as standalone work:

### Documentation
- Each milestone should produce user-facing documentation for new commands
- `/pde:help` expanded with each milestone to cover new capabilities
- Getting Started guide updated to reflect the growing command surface

### Testing
- Each milestone follows existing Nyquist validation pattern
- Pressure test expanded to cover implementation bridge, deployment, and feedback flows
- Self-improvement fleet updated to audit new skills as they're added

### Backwards Compatibility
- All new commands are additive — no existing command behavior changes
- New flags on existing commands are opt-in with existing behavior as default
- State format changes include migration scripts (following v0.3 schema migration pattern)

### Memory Items Already Tracked
- ✅ tmux monitoring → v0.10 Phase A (OBS-01)
- ✅ Research validation → v0.8 Phase A (WFM-01 through WFM-04)
- ✅ BMAD/PAUL integration → v0.8 Phases B-D (WFM-05 through WFM-16)
- ✅ CLI-Anything → v0.14 Phase A (EXT-01 through EXT-04)
- ✅ WebMCP → v0.14 Phase C (EXT-09 through EXT-11)
- ✅ Maximum parallelization / sharded processes → v0.26 Phases A-H (PAR-01 through PAR-42)
- ✅ Stakeholder presentations → v0.10 Phase C (PRES-01 through PRES-05)
- ✅ Pencil MCP → already in v0.5 Phase 43

### Hardware & Service Product Type Support
- Hardware pipeline routing → v0.15 Phase A (HW-01 through HW-04)
- Hardware materials & form factor → v0.15 Phase B (HW-05 through HW-09)
- Manufacturing handoff & BOM → v0.15 Phase C (HW-10 through HW-14)
- Safety, ergonomics & compliance → v0.15 Phase D (HW-15 through HW-19)
- Hardware lifecycle (EVT/DVT/PVT/MP) → v0.15 Phase E (HW-20 through HW-24)
- Service product type detection → v0.16 Phase A (SVC-01 through SVC-05)
- Customer journey & service blueprint → v0.16 Phase B (SVC-06 through SVC-10)
- Pricing & tier architecture → v0.16 Phase C (SVC-11 through SVC-15)
- Operations & SLA design → v0.16 Phase D (SVC-16 through SVC-20)
- Service quality & compliance → v0.16 Phase E (SVC-21 through SVC-25)
- Multi-product decomposition → v0.17 Phase A (MULTI-01 through MULTI-05)
- Parallel pipeline execution → v0.17 Phase B (MULTI-06 through MULTI-10)
- Unified handoff → v0.17 Phase C (MULTI-11 through MULTI-15)

### Extended Product Type Pipelines
- AI/ML product detection & brief → v0.18 Phase A (AI-01 through AI-04)
- Prompt architecture & model selection → v0.18 Phase B (AI-05 through AI-09)
- Evaluation framework & safety → v0.18 Phase C (AI-10 through AI-14)
- AI critique, handoff & observability → v0.18 Phase D (AI-15 through AI-18)
- Content product detection & strategy → v0.19 Phase A (CNT-01 through CNT-04)
- Content architecture & editorial → v0.19 Phase B (CNT-05 through CNT-08)
- Content critique, distribution & handoff → v0.19 Phase C (CNT-09 through CNT-12)
- Data product detection & brief → v0.20 Phase A (DATA-01 through DATA-04)
- Schema & pipeline architecture → v0.20 Phase B (DATA-05 through DATA-08)
- Data quality, privacy & handoff → v0.20 Phase C (DATA-09 through DATA-12)
- Brand strategy & naming → v0.21 Phase A (BRD-01 through BRD-04)
- Visual identity system → v0.21 Phase B (BRD-05 through BRD-08)
- Brand guidelines & application → v0.21 Phase C (BRD-09 through BRD-12)
- Learning objectives & detection → v0.22 Phase A (EDU-01 through EDU-04)
- Curriculum & assessment → v0.22 Phase B (EDU-05 through EDU-08)
- Learning experience & handoff → v0.22 Phase C (EDU-09 through EDU-12)
- Game detection & core design → v0.23 Phase A (GAME-01 through GAME-04)
- Economy & progression → v0.23 Phase B (GAME-05 through GAME-08)
- Narrative & experience → v0.23 Phase C (GAME-09 through GAME-11)
- Playtest & game handoff → v0.23 Phase D (GAME-12 through GAME-15)
- Space detection & programming → v0.24 Phase A (SPACE-01 through SPACE-04)
- Layout & materials → v0.24 Phase B (SPACE-05 through SPACE-08)
- Spatial experience, safety & handoff → v0.24 Phase C (SPACE-09 through SPACE-12)
- Policy detection & brief → v0.25 Phase A (POL-01 through POL-04)
- Policy design & impact → v0.25 Phase B (POL-05 through POL-08)
- Policy implementation & handoff → v0.25 Phase C (POL-09 through POL-12)

---

## Dependency Graph

```
v0.5 (MCP Integrations — current)
├── v0.6 (Implementation Bridge)
│   ├── v0.7 (Ship & Verify)
│   │   └── v0.9 (Feedback & Iteration)
│   ├── v0.10 (Observability & Estimation)
│   ├── v0.11 (Project Intelligence)
│   └── v0.13 (Multi-Platform Design)
│       ├── v0.15 (Hardware Pipeline)
│       │   ├── v0.17 (Multi-Product Orchestration) ← also needs v0.16
│       │   └── v0.24 (Physical Space Pipeline)
│       ├── v0.16 (Service Pipeline)
│       │   └── v0.17 (Multi-Product Orchestration) ← also needs v0.15
│       ├── v0.18 (AI/ML Pipeline)
│       ├── v0.19 (Content Pipeline)
│       ├── v0.20 (Data Pipeline)
│       ├── v0.21 (Brand Pipeline)
│       ├── v0.22 (Education Pipeline)
│       ├── v0.23 (Game Pipeline)
│       └── v0.25 (Policy Pipeline)
├── v0.8 (Workflow Maturity)
│   ├── v0.12 (State Resilience)
│   ├── v0.26 (Maximum Parallelization)
│   └── v1.0 (Collaboration & Ecosystem) ← also needs v0.12
└── v0.14 (External Tool Orchestration)
```

### Critical Path (idea → shipped product loop)
**v0.5 → v0.6 → v0.7 → v0.9**

### Product Type Expansion Path
**v0.13 → v0.18 (AI) → v0.19 (Content) → v0.15/v0.16 (Hardware/Service) → v0.17 (Multi-Product)**

### Platform Maturity Path
**v0.8 → v0.12 → v1.0**
**v0.8 → v0.26 (Maximum Parallelization)**

---

*Last updated: 2026-03-18*
