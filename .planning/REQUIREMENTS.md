# Requirements: PDE v0.22 Stakeholder Presentations

**Defined:** 2026-03-29
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Data Extraction

- [x] **EXT-01**: System can extract project identity (name, goal, core value, product type) from PROJECT.md into structured IR
- [x] **EXT-02**: System can extract phase completion status (total/completed phases, plans, tasks) from STATE.md and ROADMAP.md into IR
- [x] **EXT-03**: System can extract requirement coverage (total/completed/blocked, per-category breakdown) from REQUIREMENTS.md into IR
- [x] **EXT-04**: System can extract design artifact inventory (wireframes, mockups, flows, tokens) from design-manifest.json into IR
- [x] **EXT-05**: System can extract git velocity metrics (commits per phase, total LOC, contributor stats) from git history into IR
- [x] **EXT-06**: System can extract cost/timing data (token usage, session durations, phase timelines) from NDJSON event bus into IR
- [x] **EXT-07**: System can extract blocker and risk data (unresolved tasks, overdue phases, reconciliation gaps) from phase plans into IR
- [x] **EXT-08**: System can extract verification results (AC pass/fail, goal achievement, Nyquist compliance) from VERIFICATION.md files into IR
- [x] **EXT-09**: System can extract research findings (validated claims, technology evaluations, competitive landscape) from research/ directory into IR
- [x] **EXT-10**: System can extract key decisions with rationale from PROJECT.md and STATE.md into IR

### Cluster A Personas (Internal / Forward-Looking)

- [x] **CLU-01**: User can generate an executive summary (progress, blockers, timeline confidence, 1-page format)
- [x] **CLU-02**: User can generate an investor update (milestone velocity, technical moat, market positioning)
- [x] **CLU-03**: User can generate a sprint review (what shipped, demo screenshots, what's next)
- [x] **CLU-04**: User can generate a client deliverable report (feature specs, ACs met, screenshots)
- [x] **CLU-05**: User can generate a stakeholder status update (RAG status, decisions needed, risks)
- [x] **CLU-06**: User can generate a product manager view (feature prioritization, requirement coverage, roadmap health, scope trade-offs)
- [x] **CLU-07**: User can generate a project manager view (timeline tracking, dependency analysis, risk register, resource allocation)

### Cluster B Personas (External / Retrospective)

- [x] **CLR-01**: User can generate a case study / portfolio piece (problem, approach, outcome, lessons)
- [x] **CLR-02**: User can generate an agile project report (retro narrative + burndown/velocity metrics)
- [x] **CLR-03**: User can generate a design persona report (design decisions, system tokens, wireframe evolution, visual direction rationale)
- [x] **CLR-04**: User can generate a research persona report (findings summary, tech evaluations, competitive landscape, evidence-backed recommendations)
- [x] **CLR-05**: User can generate a technical post-mortem (what broke, root cause, prevention)
- [x] **CLR-06**: User can generate an ADR summary (context, options considered, decision, consequences)
- [x] **CLR-07**: User can generate a launch announcement (what it is, who it's for, how to start)
- [x] **CLR-08**: User can generate a portfolio overview (cross-project patterns, skills demonstrated)

### Rendering & Output

- [x] **RND-01**: Each persona generates self-contained HTML output (embedded CSS, no external URLs, no JavaScript, <500KB)
- [x] **RND-02**: Each persona generates Markdown output as secondary format (portable, diffable, git-friendly)
- [x] **RND-03**: HTML output includes auto-generated table of contents with anchor navigation
- [x] **RND-04**: HTML output embeds design artifact screenshots as inline base64 images where relevant
- [x] **RND-05**: HTML output uses PDE design tokens (colors, typography, spacing from DESIGN.md) for consistent branding
- [x] **RND-06**: Presentations persist to `.planning/presentations/` with `[persona]-[date].html` and `.md` naming
- [x] **RND-07**: User can regenerate/refresh a presentation (re-run overwrites with current project state)

### SVG Charts

- [x] **CHT-01**: System can generate a burndown chart (remaining tasks/requirements over time) as inline SVG
- [x] **CHT-02**: System can generate a velocity chart (tasks completed per phase/sprint) as inline SVG
- [x] **CHT-03**: System can generate a phase timeline chart (planned vs actual duration per phase) as inline SVG
- [x] **CHT-04**: System can generate an effort breakdown chart (token cost or task count by category) as inline SVG
- [x] **CHT-05**: Charts are embedded directly in HTML presentations (no external dependencies)
- [x] **CHT-06**: Charts include accessible text alternatives (aria-labels, data tables as fallback)

### PDF Export

- [x] **PDF-01**: User can export any HTML presentation to PDF via `--pdf` flag
- [x] **PDF-02**: PDF export uses Playwright page.pdf() (already installed, no new deps)
- [x] **PDF-03**: PDF preserves chart SVGs, embedded images, and table formatting

### Claim Verification

- [x] **VER-01**: Post-generation verification compares LLM narrative claims against the structured IR
- [x] **VER-02**: Factual mismatches (wrong counts, dates, status) are flagged before output is finalized
- [x] **VER-03**: Verification result is appended as metadata footer in generated presentations

### Command & Workflow

- [x] **CMD-01**: `/pde:present [persona]` generates a presentation for the specified persona
- [x] **CMD-02**: `/pde:present` (no argument) lists available personas with descriptions
- [x] **CMD-03**: `pde-tools.cjs presentation` subcommand handles IR extraction and file operations
- [x] **CMD-04**: Workflow reads all `.planning/` artifacts and passes structured IR (not raw files) to LLM for narration

### Auto-Generation

- [x] **AUTO-01**: Presentations auto-generate when a phase is marked complete (via phase completion event)
- [x] **AUTO-02**: Presentations auto-generate when a milestone is archived (via `/gsd:complete-milestone`)
- [x] **AUTO-03**: Auto-generation is gated on state completion check (not PostToolUse frequency)
- [x] **AUTO-04**: Auto-generated presentations use a default persona set (configurable in config.json)
- [x] **AUTO-05**: Auto-generation can be disabled in config.json without affecting on-demand `/pde:present`

### Cross-Project Portfolio

- [x] **PORT-01**: User can specify multiple `.planning/` directory paths for portfolio synthesis
- [x] **PORT-02**: Portfolio synthesis reads project identity, milestone history, and key outcomes from each project
- [x] **PORT-03**: Portfolio generates a cross-project narrative showing patterns, skills, and cumulative outcomes
- [x] **PORT-04**: Schema version detection identifies `.planning/` directory versions and adapts extraction accordingly
- [x] **PORT-05**: Missing or incompatible fields surface "data unavailable" markers (never silently zeros)
- [x] **PORT-06**: `/pde:portfolio [path1] [path2] ...` command triggers portfolio synthesis

## Future Requirements

Deferred to a later milestone. Tracked but not in current roadmap.

### Enhanced Output

- **FUT-01**: Interactive HTML slide deck format (reveal.js or similar)
- **FUT-02**: Native iOS/Android rendering
- **FUT-03**: Real-time collaborative editing of generated presentations

### Integration

- **FUT-04**: Direct Slack/Teams posting of executive summaries
- **FUT-05**: Notion page creation from generated Markdown
- **FUT-06**: Figma deck generation from design persona output

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive slide editor | Requires separate platform capabilities; would dominate milestone |
| Pixel-perfect PDF layout | Playwright page.pdf() is good enough; pixel-perfect requires dedicated layout engine |
| Real-time collaborative editing | Conflicts with snapshot semantics; presentations are point-in-time artifacts |
| External CDN dependencies in HTML | Breaks under CSP policies, makes output non-self-contained |
| JavaScript in HTML output | Increases attack surface, breaks in restricted environments |
| Streaming/live presentation updates | Snapshot semantics — regenerate to refresh |
| Custom persona creation by users | 15 built-in personas cover known use cases; custom personas add abstraction overhead |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXT-01 | Phase 176 | Complete |
| EXT-02 | Phase 176 | Complete |
| EXT-03 | Phase 176 | Complete |
| EXT-04 | Phase 176 | Complete |
| EXT-05 | Phase 176 | Complete |
| EXT-06 | Phase 176 | Complete |
| EXT-07 | Phase 176 | Complete |
| EXT-08 | Phase 176 | Complete |
| EXT-09 | Phase 176 | Complete |
| EXT-10 | Phase 176 | Complete |
| CMD-03 | Phase 176 | Complete |
| CMD-04 | Phase 176 | Complete |
| CMD-01 | Phase 177 | Complete |
| CMD-02 | Phase 177 | Complete |
| CLU-01 | Phase 178 | Complete |
| CLR-01 | Phase 178 | Complete |
| RND-01 | Phase 178 | Complete |
| RND-02 | Phase 178 | Complete |
| RND-03 | Phase 178 | Complete |
| RND-04 | Phase 178 | Complete |
| RND-05 | Phase 178 | Complete |
| RND-06 | Phase 178 | Complete |
| RND-07 | Phase 178 | Complete |
| CHT-01 | Phase 179 | Complete |
| CHT-02 | Phase 179 | Complete |
| CHT-03 | Phase 179 | Complete |
| CHT-04 | Phase 179 | Complete |
| CHT-05 | Phase 179 | Complete |
| CHT-06 | Phase 179 | Complete |
| VER-01 | Phase 180 | Complete |
| VER-02 | Phase 180 | Complete |
| VER-03 | Phase 180 | Complete |
| PDF-01 | Phase 180 | Complete |
| PDF-02 | Phase 180 | Complete |
| PDF-03 | Phase 180 | Complete |
| CLU-02 | Phase 181 | Complete |
| CLU-03 | Phase 181 | Complete |
| CLU-04 | Phase 181 | Complete |
| CLU-05 | Phase 181 | Complete |
| CLU-06 | Phase 181 | Complete |
| CLU-07 | Phase 181 | Complete |
| CLR-02 | Phase 182 | Complete |
| CLR-03 | Phase 182 | Complete |
| CLR-04 | Phase 182 | Complete |
| CLR-05 | Phase 182 | Complete |
| CLR-06 | Phase 182 | Complete |
| CLR-07 | Phase 182 | Complete |
| CLR-08 | Phase 182 | Complete |
| AUTO-01 | Phase 183 | Complete |
| AUTO-02 | Phase 183 | Complete |
| AUTO-03 | Phase 183 | Complete |
| AUTO-04 | Phase 183 | Complete |
| AUTO-05 | Phase 183 | Complete |
| PORT-01 | Phase 184 | Complete |
| PORT-02 | Phase 184 | Complete |
| PORT-03 | Phase 184 | Complete |
| PORT-04 | Phase 184 | Complete |
| PORT-05 | Phase 184 | Complete |
| PORT-06 | Phase 184 | Complete |

**Coverage:**
- v1 requirements: 58 total
- Mapped to phases: 58
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 — traceability populated after roadmap creation*
