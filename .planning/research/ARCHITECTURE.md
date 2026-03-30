# Architecture Research

**Domain:** Quality hardening and reliability improvements to an existing Claude Code plugin (PDE v0.23)
**Researched:** 2026-03-29
**Confidence:** HIGH — derived entirely from direct codebase inspection

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Slash Commands Layer                          │
│  commands/*.md  →  workflows/*.md  →  agents/*.md                   │
├─────────────────────────────────────────────────────────────────────┤
│                        CLI Dispatch Layer                            │
│                      bin/pde-tools.cjs (1712 LOC)                   │
│          Subcommand router: ~30 top-level case blocks               │
├───────────────────────┬─────────────────────────────────────────────┤
│    Core Business       │         Feature Modules (lazy-required)     │
│    Logic Modules       │                                             │
│  bin/lib/core.cjs      │  bin/lib/presentation.cjs   (824 LOC)      │
│  bin/lib/state.cjs     │  bin/lib/render-presentation.cjs (2096 LOC)│
│  bin/lib/roadmap.cjs   │  bin/lib/verify-presentation.cjs (181 LOC) │
│  bin/lib/phase.cjs     │  bin/lib/charts.cjs          (457 LOC)     │
│  bin/lib/milestone.cjs │  bin/lib/export-pdf.cjs                    │
│  bin/lib/verify.cjs    │  bin/lib/portfolio.cjs                     │
│  bin/lib/tracking.cjs  │  bin/lib/context-sync.cjs   (2175 LOC)    │
│  bin/lib/manifest.cjs  │  bin/lib/mcp-bridge.cjs      (682 LOC)    │
│  bin/lib/frontmatter.cjs│ bin/lib/idle-suggestions.cjs (494 LOC)   │
│  bin/lib/sharding.cjs  │  bin/lib/event-bus.cjs       (130 LOC)    │
│  bin/lib/config.cjs    │  bin/lib/experiment*.cjs (4 modules)       │
│  bin/lib/init.cjs      │  bin/lib/image-pipeline/ (subdirectory)   │
│  bin/lib/readiness.cjs │  bin/lib/cli-anything/ (subdirectory)     │
│  bin/lib/relay.cjs     │  bin/lib/design-pipeline/ (subdirectory)  │
│  bin/lib/divergence.cjs│  bin/lib/visual-regression.cjs            │
├───────────────────────┴─────────────────────────────────────────────┤
│                        Event Infrastructure                          │
│  hooks/hooks.json → hooks/emit-event.cjs → /tmp/pde-session-*.ndjson│
│  hooks/context-sync-hook.cjs  →  context-sync.cjs emitters         │
│  hooks/idle-suggestions.cjs   →  bin/lib/idle-suggestions.cjs      │
│  hooks/archive-session.cjs    →  session archival on SessionEnd     │
├─────────────────────────────────────────────────────────────────────┤
│                        State Layer (.planning/)                      │
│  STATE.md (YAML frontmatter + prose)                                │
│  ROADMAP.md (phase checklist + detail sections)                     │
│  REQUIREMENTS.md (shared) + COMPLETED-REQS.md (per worktree)       │
│  MILESTONES.md (accomplishment log)                                 │
│  phases/<N>-<slug>/ (per-phase plans, summaries, VALIDATION.md)    │
│  milestones/v0.NN-phases/ (archived phase directories)             │
│  presentations/ (rendered HTML + MD output)                        │
│  design/ (DTCG tokens, mockups, wireframes, launch/)               │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Hardening Relevance |
|-----------|----------------|---------------------|
| `bin/pde-tools.cjs` | Central CLI router, subcommand dispatch, @file: large-output contract | Command error-handling, edge cases, dead paths |
| `bin/lib/state.cjs` | STATE.md read/write, YAML frontmatter extraction, progress fields | DATA INTEGRITY: stale progress/focus fields in v0.23 |
| `bin/lib/roadmap.cjs` | ROADMAP.md parse/update, phase checklist, `stripShippedMilestones()` | DATA INTEGRITY: 5 unchecked plan boxes on completed phases |
| `bin/lib/milestone.cjs` | Milestone lifecycle, REQUIREMENTS.md mutations, COMPLETED-REQS.md | DATA INTEGRITY: MILESTONES.md has 46 "One-liner:" placeholders |
| `bin/lib/verify.cjs` | SUMMARY.md verification, plan structure checks, consistency validation | VERIFICATION: extend for cross-artifact consistency checks |
| `bin/lib/presentation.cjs` | Extraction-first IR pipeline (10 extractors: EXT-01–10) | POLISH: IR completeness, edge cases when source files absent |
| `bin/lib/render-presentation.cjs` | Dual-format renderer, 15-persona builders, section model | POLISH: persona output quality, edge cases with unavailable IR |
| `bin/lib/verify-presentation.cjs` | Claim verification engine, numeric IR vs rendered content | VERIFICATION: expand claims map coverage |
| `bin/lib/charts.cjs` | 4 parametric SVG chart generators (burndown, velocity, timeline, effort) | POLISH: SVG rendering correctness, edge cases |
| `bin/lib/export-pdf.cjs` | Playwright headless Chromium PDF export | POLISH: PDF export reliability |
| `bin/lib/portfolio.cjs` | Cross-project IR extraction, schema version detection | POLISH: schema heterogeneity across v0.12–v0.22 archives |
| `bin/lib/context-sync.cjs` | 7 emitters: AGENTS.md, .mdc rules, GEMINI.md, SKILL.md, DESIGN.md, .webmcp, Antigravity | DEBT: audit for stale emitter paths, pattern consistency |
| `bin/lib/mcp-bridge.cjs` | Security allowlist, probe/degrade contracts, tool name adapter | DEBT: audit for stale server entries and dead tool map paths |
| `bin/lib/event-bus.cjs` | NDJSON session logging, PdeEventBus EventEmitter wrapper | DEBT: zero-stdout contract enforcement |
| `bin/lib/tracking.cjs` | workflow-status.md per-task tracking, HANDOFF.md generation | VERIFICATION: accuracy of plan tracking across all milestones |
| `hooks/hooks.json` | 5 hook points: SubagentStart, SubagentStop, PostToolUse, SessionStart, SessionEnd | INTEGRITY: auto-generation hook paths stale |
| `.planning/ROADMAP.md` | Phase checklist + per-phase detail sections (two-format requirement) | DATA INTEGRITY: 5 unchecked plan boxes confirmed at lines 221–222, 279, 294–295 |
| `.planning/MILESTONES.md` | Milestone accomplishment log | DATA INTEGRITY: 46 "One-liner:" placeholders across 22 milestones |
| `tests/` | vitest + node:test hybrid, 236 test files | VERIFICATION: 137/236 test files report "No test suite found" (node:test incompatibility) |

## Recommended Project Structure

The existing structure is stable. v0.23 does not introduce new top-level directories. Quality hardening operates on existing modules and state files:

```
.planning/
├── research/ARCHITECTURE.md     # this file
├── STATE.md                     # stale: progress=0, needs update as phases complete
├── ROADMAP.md                   # data integrity fix: 5 unchecked plan boxes
├── MILESTONES.md                # data integrity fix: 46 "One-liner:" placeholders
├── REQUIREMENTS.md              # v0.23 requirements (to be defined)
└── phases/                      # v0.23 phase dirs created per milestone phase

bin/lib/                         # all quality hardening targets existing modules
├── state.cjs                    # audit: stale-field repair, writeStateMd() correctness
├── roadmap.cjs                  # audit: plan-box sync, cmdRoadmapMarkPlanComplete()
├── milestone.cjs                # audit: accomplishment write-back
├── verify.cjs                   # extend: cross-artifact consistency checks
├── presentation.cjs             # extend: IR edge case coverage
├── render-presentation.cjs      # extend: persona output quality, unavailable IR handling
├── verify-presentation.cjs      # extend: expand claims map to design_artifacts + research
├── charts.cjs                   # fix: SVG rendering edge cases (identical min/max values)
└── export-pdf.cjs               # fix: PDF reliability (waitUntil timeout behavior)

tests/
└── phase-NNN/                   # new test dirs for v0.23 phases (vitest format only)
```

### Structure Rationale

- **bin/lib/ (modify, not new):** All four work streams operate on existing modules. No new top-level modules are needed unless a repair utility justifies encapsulation.
- **tests/ (new per-phase dirs):** v0.23 phases each get a `tests/phase-NNN/` directory following the established pattern. New tests MUST use vitest `describe/it/test` not `node:test` — the existing node:test pattern in phases 100–117 causes 137 vitest "No test suite found" failures.

## Architectural Patterns

### Pattern 1: Extraction-First IR Pipeline

**What:** Deterministic code reads `.planning/` files and produces a typed IR object before any LLM narration. LLM never reads raw files directly.
**When to use:** Any feature that queries project state to produce output (presentations, portfolio synthesis, verification reports).
**Trade-offs:** Extra layer of indirection; pays back by eliminating a 28–39% hallucination rate on numeric claims (documented in STATE.md decisions log).

**Key modules:** `presentation.cjs` (EXT-01–10), `portfolio.cjs` (PORT-01–05)
**Hardening implication:** IR extractor edge cases (missing source files, schema version heterogeneity) must return `{ unavailable: true, reason }` sentinels — never silent zeros. This pattern is established. Hardening work must preserve it, and any new IR coverage extensions must follow the same contract.

### Pattern 2: Lazy-Required Feature Modules

**What:** `pde-tools.cjs` requires heavy feature modules inside `case` blocks, not at the top level.
**When to use:** All large modules (render-presentation, export-pdf, context-sync, mcp-bridge).
**Trade-offs:** Slower per-call cold start; pays back by keeping subcommand startup overhead low when the feature is not used.

**Hardening implication:** Technical debt fixes must not move lazy-required modules to top-level requires. The `event-bus.cjs` module has an explicit `CRITICAL: Do NOT require this at the top` comment — this is load-bearing. Any new utility functions added to support hardening must follow the same lazy-require pattern.

### Pattern 3: @file: Large-Output Contract

**What:** `core.cjs` `output()` function writes JSON to a temp file and returns `@file:/path` when payload exceeds 50KB. Callers detect the `@file:` prefix and read from the path.
**When to use:** Any pde-tools subcommand that may return large JSON payloads (IR artifacts, phase lists, portfolio output).
**Trade-offs:** Adds a temp-file lifecycle; prevents Claude Code Bash tool buffer overflow.

**Hardening implication:** New subcommands or extended verification commands added in v0.23 must respect this contract. Do not write directly to stdout for large payloads.

### Pattern 4: Two-Format ROADMAP Requirement

**What:** ROADMAP.md requires each phase to appear in BOTH the summary checklist (`- [x] **Phase N:** ...`) AND a detail section (`### Phase N: ...`). `roadmap.cjs` `cmdRoadmapGetPhase()` enforces this — it returns `malformed_roadmap` error when the checklist entry exists but the detail section is missing.
**When to use:** Any phase-add or phase-update operation.
**Trade-offs:** Redundant storage; pays back by supporting both checklist scanning (workflow branching) and detail section lookup (plan checker).

**Hardening implication:** The 5 unchecked plan boxes in ROADMAP.md (lines 221–222, 279, 294–295) are plan-level checkboxes within the detail sections for phases 176, 180, and 181. These must be marked `[x]` since all phases are confirmed complete in the phase-level checklist. This is a targeted data integrity fix, not a roadmap refactor.

### Pattern 5: Hook-Driven Side Effects

**What:** `hooks/hooks.json` registers 6 hook scripts across 5 lifecycle events (SubagentStart, SubagentStop, PostToolUse[Write|Edit|Bash], PostToolUse[Write|Edit], SessionStart, SessionEnd, Notification[idle_prompt]).
**When to use:** Session-scoped side effects that must not block the primary workflow (async: true) or must complete before next operation (async: false).
**Trade-offs:** Silent failures by design (event-bus swallows errors); means hook bugs are invisible without explicit testing.

**Hardening implication:** The `auto_generate_presentations` step in `execute-phase.md` and `complete-milestone.md` uses a hardcoded stale path (`$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs`). This should reference `$CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs` to match the pattern established in `hooks/hooks.json`.

## Data Flow

### Quality Hardening Work Stream Dependencies

```
Work Stream 1: Data Integrity
  STATE.md (stale progress/focus)
      fix via: state.cjs writeStateMd() or direct YAML frontmatter edit
  ROADMAP.md (5 unchecked plan boxes at lines 221-222, 279, 294-295)
      fix via: direct markdown edit (mark plan boxes [x])
  MILESTONES.md (46 "One-liner:" placeholders)
      fix via: read archived phase SUMMARY.md files → write substantive one-liners
  No downstream blockers — these are terminal state documents.

Work Stream 2: Verification Gap Closure
  Depends on Work Stream 1 (STATE.md must be accurate for verification passes)
  verify.cjs (extend cross-artifact consistency checks)
      reads: ROADMAP.md, STATE.md, REQUIREMENTS.md, phase SUMMARY.md
      writes: verification report JSON
  verify-presentation.cjs (expand claims coverage)
      reads: presentation.cjs IR
      appends: verification footer in render output
  Test runner incompatibility (137 "No test suite found" failures)
      fix: decision required — exclude node:test files from vitest OR migrate them
      node:test files are in tests/phase-100 through tests/phase-117

Work Stream 3: User-Facing Polish
  Depends on Work Stream 1 (accurate state files improve IR accuracy for presentations)
  presentation.cjs (IR edge cases when source files absent)
      feeds: render-presentation.cjs
  render-presentation.cjs (15-persona quality, unavailable IR handling)
      feeds: charts.cjs (SVG rendering)
      feeds: verify-presentation.cjs (claim verification)
      feeds: export-pdf.cjs (Playwright PDF)
  portfolio.cjs (schema heterogeneity across v0.12–v0.22 milestone archives)
      feeds: render-presentation.cjs (portfolio-overview persona)

Work Stream 4: Technical Debt Cleanup
  Independent — can run in parallel with Work Streams 2 and 3.
  context-sync.cjs (7 emitters, accumulated cruft)
  mcp-bridge.cjs (7 approved servers, stale tool maps)
  workflows/execute-phase.md and complete-milestone.md (stale pde-os path)
  workflows/*.md (stale field count prose: 12 "20-field" or "21-field" references)
  Dead imports across bin/lib/ modules
```

### Key Data Flows for Hardening

1. **ROADMAP.md plan-box sync:** Phase checklist marks phases `[x]` (complete) but the plan-level checklist within detail sections still shows `[ ]` for plans inside phases 176, 180, 181. The `roadmap.cjs` subcommand reads both layers. Fix: mark those 5 plan boxes `[x]` directly in ROADMAP.md.

2. **MILESTONES.md population:** 46 `One-liner:` placeholders exist across all milestone sections. The milestone module does not have a bulk-populate function — these were written by Claude during the `complete-milestone.md` workflow but left as stubs when that workflow ran quickly. Fix: read phase SUMMARY.md files from the `.planning/milestones/v0.NN-phases/` archives and write substantive one-liners for each placeholder.

3. **STATE.md v0.23 initialization:** Current STATE.md shows `progress: total_phases: 0, completed_phases: 0` and `milestone: v0.23`. Since v0.23 has not started executing phases, this is technically correct. The `current_focus` and `status` fields will need updating as phases complete. The `writeStateMd()` function in state.cjs is the correct path for this.

4. **Test runner compatibility:** 137/236 test files fail with "No test suite found" because they use `import { test } from 'node:test'` rather than vitest's `describe/it/test`. The vitest config (`test.include: ['tests/**/*.{test,spec}.{cjs,mjs,js,ts}']`) picks up these files, but they do not export vitest-compatible suites. Two fix options: (a) add a vitest `exclude` pattern for files containing `from 'node:test'`, which is zero-risk and preserves the node:test tests as runnable via `node --test`; (b) migrate failing files to vitest, which is higher effort but gives a unified test runner. Option (a) is recommended for v0.23 scope given 137 files affected.

## Scaling Considerations

Not applicable — PDE is a single-developer tool running as a Claude Code plugin. The "scaling" concern for v0.23 is the scale of accumulated technical debt across 22 milestones (184 phases), not user-facing scale.

## Anti-Patterns

### Anti-Pattern 1: Touching Shared State in Parallel Worktrees

**What people do:** Write directly to REQUIREMENTS.md, STATE.md, or ROADMAP.md from within a worktree session.
**Why it's wrong:** The distributed execution architecture (v0.18) uses per-worktree COMPLETED-REQS.md files and post-merge recalculation (D-09, D-10) specifically to avoid concurrent write conflicts on shared state files.
**Do this instead:** Quality hardening writes to these state files from the main branch (not a worktree), or uses `milestone.cjs` / `state.cjs` functions that know the single-writer protocol.

### Anti-Pattern 2: Adding Top-Level Requires in pde-tools.cjs

**What people do:** `require('./lib/heavy-module.cjs')` at the top of pde-tools.cjs for convenience.
**Why it's wrong:** Every pde-tools invocation (including lightweight `state-load --raw`) pays the startup cost of the heavy module. The `event-bus.cjs` carries an explicit comment: `CRITICAL: Do NOT require this at the top`.
**Do this instead:** Require inside the `case` block that uses the module.

### Anti-Pattern 3: Writing New Tests with node:test

**What people do:** Copy test files in phases 100–117 that use `import { test } from 'node:test'`.
**Why it's wrong:** Vitest picks them up but reports "No test suite found" — they pass their own runner but fail the project's test suite, creating false negatives that obscure real failures.
**Do this instead:** All new tests in v0.23 must use vitest's `describe`/`it`/`test` from `'vitest'`. Test files in phases 176–184 correctly use this pattern and should serve as the template.

### Anti-Pattern 4: Silent Zero Returns from IR Extractors

**What people do:** Return `0` or `null` when a source file is missing in an IR extractor.
**Why it's wrong:** The claim verification engine in `verify-presentation.cjs` skips values that are 0 or null (`if (value === null || value === undefined || value === 0) return`). Silent zeros cause real missing data to be invisible in verification reports.
**Do this instead:** Return `{ unavailable: true, reason: 'SOURCE_FILE not found' }`. The renderer's `sentinelHtml()` function handles this and shows a graceful fallback. The pattern is already established in `presentation.cjs`.

### Anti-Pattern 5: Hardcoded pde-os Paths in Workflow Files

**What people do:** Reference `$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs` in workflow or hook files.
**Why it's wrong:** This path reflects an earlier directory structure. If the engine moves or is installed differently, these references silently fail with no error surfaced to the user.
**Do this instead:** Use `$CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs` — the same pattern used in `hooks/hooks.json` for all hook script invocations. Two confirmed stale occurrences: `execute-phase.md` and `complete-milestone.md` auto_generate_presentations steps.

## Integration Points

### Modules to Audit Per Work Stream

#### Work Stream 1 — Data Integrity (Repair Existing State Files)

| Module / File | Audit Target | Operation Type |
|---------------|--------------|----------------|
| `.planning/ROADMAP.md` | 5 unchecked plan boxes (lines 221–222, 279, 294–295) | DIRECT EDIT: mark `[x]` for phases 176, 180, 181 plans |
| `.planning/MILESTONES.md` | 46 "One-liner:" placeholders | DIRECT EDIT: populate from archived phase SUMMARY.md files |
| `.planning/STATE.md` | Stale `progress` fields for v0.23 | MONITOR: update via `writeStateMd()` as phases complete |
| `bin/lib/roadmap.cjs` | `cmdRoadmapMarkPlanComplete()` logic | VERIFY: correctly targets plan-level boxes, not phase-level |
| `bin/lib/state.cjs` | `writeStateMd()` YAML frontmatter preservation | VERIFY: field updates do not corrupt adjacent frontmatter |

#### Work Stream 2 — Verification Gap Closure

| Module / File | Audit Target | Operation Type |
|---------------|--------------|----------------|
| `tests/` (vitest config) | 137 node:test false failures | DECISION: add vitest `exclude` for node:test files OR migrate |
| `bin/lib/verify.cjs` | `cmdVerifySummary()` file-mention extraction | EXTEND: add cross-artifact consistency check |
| `bin/lib/verify-presentation.cjs` | `buildClaimsMap()` coverage | EXTEND: add design_artifacts and research IR fields to claims |
| `tests/phase-NNN/` (v0.23 phases) | New test coverage | NEW: vitest format only |

#### Work Stream 3 — User-Facing Polish

| Module / File | Audit Target | Operation Type |
|---------------|--------------|----------------|
| `bin/lib/presentation.cjs` | `extractDesignArtifacts()` (EXT-04) | AUDIT: edge case when `.planning/design/` has no artifacts |
| `bin/lib/render-presentation.cjs` | All 15 persona builders | AUDIT: graceful handling when IR sections are `{ unavailable: true }` |
| `bin/lib/charts.cjs` | `mapY()` function | AUDIT: burndown chart when all phases complete on same date (min === max) |
| `bin/lib/export-pdf.cjs` | `waitUntil: 'networkidle'` timeout | AUDIT: behavior when SVG charts render slowly or Playwright times out |
| `bin/lib/portfolio.cjs` | `detectSchemaVersion()` for pre-v0.10 archives | AUDIT: milestones lacking STATE.md return `{ version: 'unknown' }` not throw |
| `workflows/present.md` | Unknown persona slug handling | AUDIT: produces useful error message, not silent failure |

#### Work Stream 4 — Technical Debt Cleanup

| Module / File | Audit Target | Operation Type |
|---------------|--------------|----------------|
| `workflows/execute-phase.md` | `auto_generate_presentations` step path | FIX: `pde-os` path → `$CLAUDE_PLUGIN_ROOT` |
| `workflows/complete-milestone.md` | `auto_generate_presentations` step path | FIX: same stale path |
| `workflows/*.md` | "20-field" / "21-field" prose (12 occurrences) | AUDIT: verify current field count is 21, update prose |
| `bin/lib/context-sync.cjs` | 7 emitters, `WRITE_BACK_FILES` list | AUDIT: all emitters functional, no dead conditional paths |
| `bin/lib/mcp-bridge.cjs` | `APPROVED_SERVERS` registry, TOOL_MAP | AUDIT: all 7 server entries and tool maps current |
| Dead imports across `bin/lib/*.cjs` | Unused requires | AUDIT: identify and remove (focus on modules modified across 22 milestones) |

### Internal Boundaries and Communication

| Boundary | Direction | Communication | Notes |
|----------|-----------|---------------|-------|
| `pde-tools.cjs` → `bin/lib/*.cjs` | CLI caller → module | CommonJS require + function call | Lazy-required inside case blocks — preserve this |
| `presentation.cjs` → `render-presentation.cjs` | IR → Renderer | JSON IR object as argument | IR schema is the contract; unavailable sentinels must propagate |
| `render-presentation.cjs` → `verify-presentation.cjs` | Renderer → Verifier | `sections` array + `ir` object | `stripHtml` exported from renderer, imported by verifier |
| `render-presentation.cjs` → `charts.cjs` | Renderer → Chart generators | Direct require, function calls | Charts return inline SVG strings — never throw |
| `render-presentation.cjs` + `export-pdf.cjs` | Renderer → PDF exporter | HTML file on disk → PDF | File-based (not in-memory) interface |
| `portfolio.cjs` → `presentation.cjs` | Portfolio → per-project IR | Calls per-project extractors | Each project treated independently |
| `hooks/*.cjs` → `bin/lib/*.cjs` | Hook → Module | Child process spawn of `pde-tools.cjs` | Hooks are async, no return value checked |
| `hooks/context-sync-hook.cjs` → `bin/lib/context-sync.cjs` | Hook → Emitter | `pde-tools context-sync emitAll` CLI call | Triggered on every Write/Edit tool use |
| `bin/lib/event-bus.cjs` → `/tmp/*.ndjson` | Event bus → File | `fs.appendFileSync` (swallows errors) | Session-scoped, zero-stdout contract — never move to top-level require |

## Build Order Recommendation

The four work streams have these dependency relationships for phase ordering:

```
Work Stream 1: Data Integrity           (no dependencies — fix state files first)
    |
    v
Work Stream 2: Verification Gap Closure (needs accurate state to verify against)
    |
    v
Work Stream 3: User-Facing Polish       (needs accurate IR for presentation quality)

Work Stream 4: Technical Debt Cleanup   (independent — parallel with 2 or 3)
```

**Recommended phase ordering:**
1. Data integrity fixes first. ROADMAP.md, MILESTONES.md, and STATE.md are source-of-truth for all downstream verification and presentation quality checks. Fixing them first means subsequent phases validate against accurate state.
2. Test runner incompatibility decision second. The 137 vitest false-failures mask real regressions. Resolving this early gives reliable signal for all subsequent test-writing work.
3. Verification gap closure third. Once state is accurate and the test runner is clean, verification checks can run against a trustworthy baseline.
4. Polish and debt cleanup can run in parallel with steps 2–3 or as dedicated phases after.

## Sources

- Direct inspection: `bin/pde-tools.cjs` (1712 LOC) — routing, lazy-require patterns, subcommand coverage
- Direct inspection: `bin/lib/*.cjs` (all 40+ modules) — module sizes and responsibilities confirmed
- Direct inspection: `hooks/hooks.json` — 5 hook lifecycle event registrations
- Direct inspection: `.planning/ROADMAP.md` — 5 unchecked plan boxes confirmed at lines 221–222, 279, 294–295
- Direct inspection: `.planning/MILESTONES.md` — 46 "One-liner:" placeholders confirmed by grep count (500 LOC file)
- Direct inspection: `.planning/STATE.md` — stale `progress.total_phases: 0` confirmed in frontmatter
- Direct inspection: `vitest.config.ts` — test runner configuration
- Runtime test execution: 137/236 test files fail with "No test suite found" (vitest + node:test incompatibility)
- Direct inspection: `tests/phase-100/experiment-dispatch.test.mjs` — node:test pattern confirmed as failure cause (`import { test } from 'node:test'`)
- Direct inspection: `tests/phase-176` through `tests/phase-184` — vitest `describe/it/test` pattern confirmed working
- Direct inspection: `workflows/execute-phase.md` and `complete-milestone.md` — stale `pde-os` path in auto_generate_presentations step confirmed
- Direct inspection: `bin/lib/verify-presentation.cjs` — `buildClaimsMap()` coverage confirmed limited to phases, requirements, git_velocity, cost_timing, blockers, decisions
- Direct inspection: `bin/lib/export-pdf.cjs` — Playwright `waitUntil: 'networkidle'` confirmed, no explicit timeout override

---
*Architecture research for: PDE v0.23 Quality & Reliability Hardening*
*Researched: 2026-03-29*
