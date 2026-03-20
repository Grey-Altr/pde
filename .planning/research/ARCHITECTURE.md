# Architecture Research

**Domain:** PDE v0.7 — Pipeline Reliability & Validation (research validator, cross-phase dependency checker, edge case analyzer, integration point verifier + tech debt closure)
**Researched:** 2026-03-19
**Confidence:** HIGH (entire analysis grounded in direct codebase inspection of existing PDE architecture; no external frameworks involved — all decisions derive from reading actual workflow, agent, and library files)

---

> **Scope:** This file answers one question — how do v0.7's four validation features integrate with PDE's existing agent/workflow architecture? What is new vs. what is enhanced? In what order should they be built?
>
> All existing systems (34+ slash commands, workflows, agents, pde-tools.cjs, .planning/ state, mcp-bridge.cjs, readiness.cjs, reconciliation.cjs, sharding.cjs) are stable dependencies, not targets for restructuring.

---

## Existing Architecture Baseline (v0.6)

The pipeline v0.7 extends:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Skill Layer  (/pde: slash commands)                   │
│   new-milestone  plan-phase  check-readiness  execute-phase  verify-work  │
└─────────────────────────────┬────────────────────────────────────────────┘
                               │ invokes
┌─────────────────────────────▼────────────────────────────────────────────┐
│                         Workflow Layer (orchestrators)                     │
│   new-milestone.md  plan-phase.md  check-readiness.md  execute-phase.md  │
│   verify-work.md  reconcile-phase.md  diagnose-issues.md                  │
└────┬───────────────────────────────┬──────────────────────────────────────┘
     │ spawns subagents               │ calls CLI
┌────▼──────────────┐    ┌────────────▼────────────────────────────────────┐
│  Agent Layer       │    │  pde-tools.cjs  (bin/)                           │
│                    │    │  Subcommands: init, phase, roadmap, readiness,   │
│  pde-researcher    │    │  reconciliation, tracking, sharding, manifest,   │
│  pde-planner       │    │  memory, state, config-get, config-set           │
│  pde-plan-checker  │    └─────────────────────┬───────────────────────────┘
│  pde-executor      │                           │ reads/writes
│  pde-reconciler    │    ┌─────────────────────▼───────────────────────────┐
│  pde-verifier      │    │              State Layer  (.planning/)            │
│  pde-analyst       │    │  PROJECT.md  STATE.md  ROADMAP.md  REQUIREMENTS  │
│  pde-debugger      │    │  phases/NN-name/  config.json  agent-memory/     │
└────────────────────┘    │  project-context.md  mcp-connections.json        │
                           └──────────────────────────────────────────────────┘
```

**Current pipeline sequence (after v0.6):**

```
/pde:new-milestone
  └── analyst interview → researcher agents (parallel) → roadmapper
  └── produces: PROJECT.md + ROADMAP.md + REQUIREMENTS.md

/pde:plan-phase N
  └── phase researcher (optional, if --research flag)
  └── pde-planner → PLAN.md files + task shards
  └── pde-plan-checker revision loop (max 3 iterations)

/pde:check-readiness N
  └── pde-tools.cjs readiness check: structural A1-A11, consistency B1-B3
  └── semantic checks C1-C3 (orchestrator, LLM pass)
  └── writes READINESS.md (PASS / CONCERNS / FAIL)

/pde:execute-phase N
  └── readiness gate (blocks on FAIL)
  └── wave-based executor spawning (sharded or standard)
  └── pde-reconciler → RECONCILIATION.md
  └── pde-verifier → VERIFICATION.md
  └── phase complete → update ROADMAP.md + STATE.md
```

**Key observation for v0.7 placement:**

The pipeline has two quality gates: `check-readiness` (before execution) and `reconcile + verify` (after execution). V0.7 adds validation at two earlier positions — during research review (before planning) and during plan-phase verification (before the readiness gate) — plus closes 7 known tech debt items that are independent of those validation features.

---

## Standard Architecture for v0.7

### System Overview — v0.7 Additions in Context

```
┌──────────────────────────────────────────────────────────────────────────┐
│  /pde:new-milestone                                                        │
│  └── researcher agents run                                                 │
│  └── research files written to .planning/phases/NN-name/research/         │
└──────────────────────────────────────────────┬───────────────────────────┘
                                                │
                                   [POSITION 1 — NEW]
                                                │
┌──────────────────────────────────────────────▼───────────────────────────┐
│  Research Validator  (new agent: pde-research-validator)                   │
│  Triggered by plan-phase.md when research files exist                      │
│  Reads:  .planning/phases/NN/research/*.md  +  codebase (targeted reads)  │
│  Checks: claim-by-claim codebase verification                              │
│  Writes: NN-RESEARCH-VALIDATION.md in phase directory                     │
│  Returns: { contradicted_count, unverified_count }                         │
└──────────────────────────────────────────────┬───────────────────────────┘
                                                │
                                    plan-phase.md (existing)
                                    spawns pde-planner → PLAN.md files
                                                │
                                   [POSITION 2 — ENHANCED]
                                                │
┌──────────────────────────────────────────────▼───────────────────────────┐
│  Plan Validation Suite  (enhanced agent: pde-plan-checker)                 │
│  Already exists — runs in plan-phase.md revision loop                      │
│                                                                            │
│  Existing checks (unchanged):   structural plan validity                  │
│  New check A — Dep Checker:     inter-plan dependency graph analysis       │
│  New check B — Edge Case:       missing error paths, empty states          │
│  New check C — Integration:     orphan exports, interface name mismatches  │
│                                                                            │
│  All new checks return structured issues in existing return schema.        │
│  Orchestrator feeds issues back to pde-planner (existing revision loop).   │
└──────────────────────────────────────────────┬───────────────────────────┘
                                                │
                                   [POSITION 3 — ENHANCED]
                                                │
┌──────────────────────────────────────────────▼───────────────────────────┐
│  check-readiness.md  (enhanced workflow)                                   │
│  /pde:check-readiness N                                                    │
│                                                                            │
│  Existing: A1-A11 structural + B1-B3 consistency + C1-C3 semantic         │
│  New: B4/B5 checks in readiness.cjs (declaration-time integration)        │
│  New: run_integration_checks step (codebase-time Mode B verification)     │
│                                                                            │
│  READINESS.md gains new sections; PASS/CONCERNS/FAIL semantics unchanged  │
└──────────────────────────────────────────────┬───────────────────────────┘
                                                │
                               execute-phase.md (existing, unchanged for v0.7)
```

---

## Recommended Project Structure Changes

```
agents/
├── pde-plan-checker.md        # ENHANCED: + dep graph, edge case, integration checks
├── pde-research-validator.md  # NEW: claim extraction + codebase verification
└── [all other agents: unchanged]

bin/lib/
├── readiness.cjs              # ENHANCED: + B4 (@-ref file existence), B5 (orphan export)
└── [all other lib modules: unchanged]

workflows/
├── plan-phase.md              # ENHANCED: + research validation step before planner spawn
├── check-readiness.md         # ENHANCED: + run_integration_checks step (Mode B)
└── [all other workflows: unchanged]

.planning/phases/NN-name/
├── NN-PLAN.md                 # existing
├── NN-READINESS.md            # existing structure; new sections appended
└── NN-RESEARCH-VALIDATION.md  # NEW artifact (generated when research exists)

bin/pde-tools.cjs              # ENHANCED: minor — help text + v0.6 commands
[7 tech debt files]            # FIXED: see tech debt section below
```

### Structure Rationale

**No new workflow files.** Research validation and plan-time dep/edge/integration checks both have natural integration points in existing workflows (`plan-phase.md` and `check-readiness.md`). Creating new top-level workflows would require new `/pde:` commands and user education, but the validation behavior is only useful at those specific pipeline positions — it does not stand alone.

**One new agent, one enhanced agent.** `pde-research-validator` is genuinely new behavior (claim extraction from markdown research files + codebase verification via targeted file reads). This requires a different context load than `pde-plan-checker` (which reads PLAN.md files). However, the three plan-time validation checks (dep graph, edge case, integration) all read the same PLAN.md files that `pde-plan-checker` already loads — they are new analysis passes on the same inputs, not new context requirements. Single spawn, same file set, existing revision loop.

**No new pde-tools.cjs lib modules.** Dependency graph analysis and integration point declaration checks are rule-based checks on PLAN.md content. They belong in `readiness.cjs` alongside existing A/B category checks. Adding a separate `.cjs` module per check would fragment the check surface and require the READINESS.md output contract to be assembled from multiple sources.

---

## Architectural Patterns

### Pattern 1: Agent Enhancement vs. New Agent Decision Rule

New agent when: new _context inputs_ required that the existing agent does not load.
Enhancement when: same inputs already loaded, new analysis pass only.

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Research validator | New agent (`pde-research-validator`) | Reads research markdown files + targeted codebase files. Different context from `pde-plan-checker` which reads PLAN.md files only. |
| Cross-phase dep checker | Enhance `pde-plan-checker` | Already loads all PLAN.md files for the phase. Dep checking is a new analysis pass on the same inputs. |
| Edge case analyzer | Enhance `pde-plan-checker` | Same inputs (PLAN.md task list + AC section). New analysis pass only. |
| Integration point verifier (declaration-time) | Enhance `pde-plan-checker` | Declaration-time: works from plan declarations already in scope. |
| Integration point verifier (codebase-time) | Enhance `check-readiness.md` + `readiness.cjs` | Codebase-time: requires live file reads. Belongs in the readiness gate step that already owns codebase access. |

### Pattern 2: Research Claim Extraction + Verification (Two-Pass)

**Pass 1 — Claim extraction (LLM pass, in pde-research-validator):**

Read all research files. Extract every claim that makes a testable assertion about the codebase:
- Technology versions ("PDE uses Node.js 20.x")
- File existence ("mcp-bridge.cjs is the central adapter at bin/lib/")
- Module presence ("TOOL_MAP has 36 entries")
- Command availability ("pde-tools.cjs supports `manifest init`")
- Architecture facts ("all MCP integrations share one bridge")

Write structured claim list as intermediate section in RESEARCH-VALIDATION.md.

**Pass 2 — Codebase verification (tool-call pass):**

For each claim: map to a verification strategy:

| Claim type | Verification strategy |
|------------|----------------------|
| File path claim | `ls` / Glob check |
| Version claim | Read package.json or VERSION file |
| Module existence | Grep for export in claimed file |
| Command availability | Grep pde-tools.cjs for subcommand registration |
| Count claim | Count lines/entries in claimed file |

Record per claim: text, strategy, result (verified / unverified / contradicted), evidence quote.

**Output contract:** RESEARCH-VALIDATION.md with:
- Per-claim verdict table (claim | strategy | result | evidence)
- `contradicted_count` in frontmatter
- `unverified_count` in frontmatter
- Contradicted claims flagged as FAIL-class (surfaced to user before planning proceeds)
- Unverified claims flagged as CONCERNS (surfaced, non-blocking)

**Integration hook:** `plan-phase.md` step between research and planner spawn. Orchestrator reads `contradicted_count` from RESEARCH-VALIDATION.md frontmatter. If `contradicted_count > 0`: present findings, offer "Update research first" or "Proceed with caveats." If 0: proceed silently.

### Pattern 3: Dependency Graph Check (Cross-Phase Dep Checker)

**Algorithm (runs inside enhanced pde-plan-checker):**

1. Read all PLAN.md files for the current phase (already loaded).
2. Extract: each plan's declared file outputs (from `<files>` tags in tasks), each plan's declared file inputs (from `@`-references in `<context>` blocks and `<files>` tags).
3. Optionally read PLAN.md files for preceding phases (from ROADMAP.md plan index) to map cross-phase outputs.
4. Build directed dependency graph: plan A produces file F → plan B consumes file F = B depends on A.
5. Check: is every consumed file either (a) produced by an earlier plan in the phase, (b) produced by a plan in a preceding phase, or (c) an existing file on disk?
6. Flag: consumed files with no source = missing dependency.

**Severity:**
- Consumed file does not exist on disk AND no plan produces it → FAIL (plan cannot execute)
- Consumed file does not exist on disk BUT a plan produces it in the correct wave → PASS (expected — file will be created)
- Consumed file exists on disk but no plan declares producing it → informational (likely stable dependency, not a gap)

**Output:** Structured findings returned by pde-plan-checker in new `dep_issues` field. Orchestrator folds into planner revision prompt.

### Pattern 4: Edge Case Analysis

**Algorithm (runs inside enhanced pde-plan-checker):**

For each task in each PLAN.md, scan `<action>` and `<verify>` blocks for:

| Pattern | Gap type | Example |
|---------|----------|---------|
| Task creates/reads a collection without empty-state handling | Empty state | "Build user list" — no "if no users" path |
| Task calls an external service/API without failure branch | Error path | "Fetch GitHub issues" — no failure handling |
| Task modifies data without rollback/undo path | Boundary | "Run migration" — no rollback if fails |
| AC covers only happy path | Incomplete AC | Given/When/Then has no failure scenario |
| Task touches auth, migration, CI/CD files | High-risk boundary | No explicit guard or confirmation noted |

**Severity:** All edge case findings are CONCERNS only (never FAIL). Edge cases are judgment calls — a task may intentionally omit empty-state handling because `[]` is a valid response. Surfacing findings for planner review without blocking execution is the correct default.

**Output:** Per-task gap findings in new `edge_case_issues` field of pde-plan-checker return. Each finding includes: task reference, gap type, suggested AC addition.

### Pattern 5: Integration Point Verification (Two-Mode)

**Mode A — Declaration-time (runs in enhanced pde-plan-checker):**

From PLAN.md task `<files>` and `<action>` blocks:
- Extract: function/class/interface names that one task declares as created, another task declares as used
- Check: declared export name in task A matches import name in task B (exact string match)
- Check: data shape described as output by task A matches data shape described as input by task B
- Flag: orphan exports (declared in a task's output, never referenced as input by any other task)
- Flag: name mismatches (task B references `FooService`, task A creates `FooManager`)

**Mode B — Codebase-time (runs in enhanced check-readiness.md + readiness.cjs):**

For integration points between the NEW plans and the EXISTING codebase:
- Read actual source files at paths declared in plan `<context>` @-references
- Check: function signatures at those paths match what the plan's tasks expect to call
- Check: module exports exist at the file paths plans reference

New check IDs added to `readiness.cjs`:

| Check ID | Description | Severity | Category |
|----------|-------------|----------|----------|
| B4 | All `@`-referenced files in plan `<context>` blocks exist on disk or are declared as created by an earlier plan | fail | B: Consistency |
| B5 | No task declares creating an interface/export name that is never referenced by any other task in the phase (orphan export — declaration-time check) | concerns | B: Consistency |

**Output:**
- Mode A: `integration_issues` field in pde-plan-checker return
- Mode B: appended to READINESS.md as `## Integration Checks` section

---

## Data Flow

### Research Validation Flow

```
/pde:plan-phase N
    │
    ▼ plan-phase.md initialize step
    Read init JSON: has_research = true/false
    Check for RESEARCH-VALIDATION.md in phase dir: has_validation = true/false
    │
    ├── [has_research: false] → skip validation, proceed to planner
    │
    ├── [has_research: true, has_validation: true] → show validation status, proceed
    │
    └── [has_research: true, has_validation: false] →
        Task(pde-research-validator)
            reads: .planning/phases/NN/research/*.md
            reads: targeted codebase files via glob/grep
            writes: .planning/phases/NN/NN-RESEARCH-VALIDATION.md
            returns: { contradicted_count, unverified_count, summary }
            │
            ├── contradicted_count > 0 →
            │   display findings to user
            │   AskUserQuestion: "Update research and re-run, or proceed with caveats?"
            │   if "proceed": continue with planner (log caveats)
            │   if "update": stop, user reruns /pde:plan-phase after research update
            │
            └── contradicted_count == 0, unverified_count > 0 →
                display unverified claims as CONCERNS
                proceed to planner (non-blocking)
                │
    ▼ existing plan-phase.md planner spawn (unchanged)
```

### Plan Validation Flow (Enhanced pde-plan-checker)

```
plan-phase.md revision loop (existing, max 3 iterations):
    Task(pde-plan-checker)
        │
        reads: .planning/phases/NN/*-PLAN.md (existing)
        reads: .planning/ROADMAP.md (for cross-phase dep context)
        │
        runs: existing structural checks → structural_issues[]
        runs: dep graph check [NEW] → dep_issues[]
        runs: edge case scan [NEW] → edge_case_issues[]
        runs: integration Mode A check [NEW] → integration_issues[]
        │
        returns: {
          verdict: "PASSED" | "ISSUES FOUND",
          structural_issues: [...],   ← existing field
          dep_issues: [...],          ← new field (additive)
          edge_case_issues: [...],    ← new field (additive)
          integration_issues: [...]   ← new field (additive)
        }
        │
        orchestrator formats all issues into planner revision prompt
        pde-planner revises plans
        pde-plan-checker re-runs
        (max 3 iterations — existing behavior unchanged)
```

### Readiness Gate Enrichment Flow

```
/pde:check-readiness N
    │
    ▼ check-readiness.md step: load_context (existing)
    ▼ check-readiness.md step: run_structural_checks (existing)
        pde-tools.cjs readiness check A1-A11 + B1-B3 [+ NEW: B4, B5]
        writes READINESS.md
    │
    ▼ check-readiness.md step: run_semantic_checks (existing, C1-C3)
        appends ## Semantic Checks to READINESS.md if issues
    │
    ▼ check-readiness.md step: run_integration_checks [NEW — Mode B]
        reads codebase files at paths declared in plan @-references
        checks function signatures + module exports exist
        appends ## Integration Checks to READINESS.md
        if integration FAIL → update frontmatter result: to fail (if was pass/concerns)
    │
    ▼ check-readiness.md step: report_result (existing)
        reads enriched READINESS.md
        displays PASS / CONCERNS / FAIL with all sections
```

### Key State Artifacts

| Artifact | Location | Created By | Consumed By |
|----------|----------|------------|-------------|
| NN-RESEARCH-VALIDATION.md | `.planning/phases/NN-name/` | pde-research-validator | plan-phase.md (status check); user review |
| READINESS.md (enriched) | `.planning/phases/NN-name/` | check-readiness.md + readiness.cjs | execute-phase.md readiness gate |
| pde-plan-checker return | In-memory (orchestrator context) | pde-plan-checker | plan-phase.md revision loop |

All three are backward compatible. RESEARCH-VALIDATION.md is a new artifact type that existing workflows ignore if absent. READINESS.md gains new sections but preserves existing frontmatter contract. pde-plan-checker return schema adds fields but removes none.

---

## Component Boundaries

| Component | Responsibility | v0.7 Change |
|-----------|---------------|-------------|
| `pde-research-validator` | Extract claims from research files, verify each against codebase, produce RESEARCH-VALIDATION.md | New agent |
| `pde-plan-checker` | Structural plan validation + dep graph + edge case + integration Mode A | Enhanced: 3 new check categories in return schema |
| `check-readiness.md` | Orchestrate structural + semantic + Mode B integration checks | Enhanced: new `run_integration_checks` step |
| `readiness.cjs` | Node.js check implementation (A1-A11, B1-B3) | Enhanced: adds B4 (@-ref file existence) and B5 (orphan export) |
| `plan-phase.md` | Orchestrate research validation + planning + plan-checker revision loop | Enhanced: new step between research and planner spawn |
| `pde-tools.cjs` | CLI entry point | Minor fix: add v0.6 commands to help text (tech debt TD-07) |

---

## Anti-Patterns

### Anti-Pattern 1: Four Separate Agents for Four Checks

**What people do:** Create `pde-dep-checker.md`, `pde-edge-case-analyzer.md`, `pde-integration-verifier.md` alongside `pde-research-validator.md`.

**Why it's wrong:** Dep checker, edge case analyzer, and integration Mode A checker all read PLAN.md files — the same inputs `pde-plan-checker` already loads. Four spawns inflate context overhead by 3x: each agent initializes (~2-3K tokens), loads the same files, returns output the orchestrator must merge. The plan-phase.md revision loop already calls `pde-plan-checker` — adding three parallel checker spawns per iteration multiplies the already-bounded loop by 4x.

**Do this instead:** Enhance `pde-plan-checker` with three new check categories. Single spawn, single return, existing revision loop structure unchanged.

### Anti-Pattern 2: Standalone Validation Commands

**What people do:** Create `/pde:validate-research`, `/pde:check-deps`, `/pde:analyze-edge-cases` as separate slash commands users must invoke manually.

**Why it's wrong:** Optional commands are skipped. The v0.6 readiness gate works because it is wired into `execute-phase.md`'s startup — users encounter it automatically. Standalone validation commands that require explicit invocation provide zero pipeline reliability improvement over the current state.

**Do this instead:** Embed at the pipeline positions that already own the relevant data:
- Research validation → inside `plan-phase.md` (automatic when research exists)
- Plan checks → inside `pde-plan-checker` (automatic in revision loop)
- Integration checks → inside `check-readiness.md` (automatic on every readiness check)

### Anti-Pattern 3: Storing RESEARCH-VALIDATION.md Outside .planning/

**What people do:** Cache validation results in `/tmp/` or create a new root-level `validation/` directory to avoid re-running the LLM extraction pass.

**Why it's wrong:** PDE's state model is `.planning/`. All 34+ commands read/write `.planning/`. Cache in `/tmp/` is lost on session end. A new root-level directory bypasses the manifest tracking and agent-memory systems.

**Do this instead:** Write RESEARCH-VALIDATION.md to `.planning/phases/NN-name/`. Use frontmatter `status: validated | not-validated` for the has_validation check in `plan-phase.md`.

### Anti-Pattern 4: Blocking Execution on Edge Case Findings

**What people do:** Set edge case findings to FAIL severity, blocking execute-phase until every missing error branch is addressed.

**Why it's wrong:** Edge cases are subjective. A task that creates a list may intentionally return `[]` for the empty case — that is valid behavior, not a gap. Blocking on every edge case flag forces the planner to add defensive code for failure modes that may never occur, bloating plans with noise.

**Do this instead:** Edge case findings are always CONCERNS. They appear in the planner revision prompt and in READINESS.md for review, but never block execution. Only missing dependencies (FAIL) and broken integration declarations (FAIL) block.

### Anti-Pattern 5: Checking the Entire Codebase in Mode B Integration Verification

**What people do:** In Mode B (codebase-time), glob the entire source tree looking for interface mismatches.

**Why it's wrong:** A large codebase (500+ files) makes Mode B prohibitively slow. The check becomes a codebase-wide analysis that is unfocused and produces false positives for unrelated code.

**Do this instead:** Scope Mode B strictly to files explicitly named in the plan's `<context>` @-references. If a plan's context block does not reference a file, that file is out of scope for integration verification.

---

## Suggested Build Order

Dependency graph determines order:

```
[Wave 1 — parallel, no inter-dependencies]

  A. pde-research-validator (new agent)
     - No dependencies on other new features
     - Standalone: reads research files, writes RESEARCH-VALIDATION.md
     - Build first so plan-phase.md hook has an agent to spawn

  B. pde-plan-checker enhancements (dep + edge case + integration Mode A)
     - No dependencies on other new features
     - Enhancement to existing agent: three new check categories, additive return fields
     - Build first so plan-phase.md revision loop has enriched feedback

  C. Tech debt closure (7 items — independent of all validation features)
     - PLUG-01: test claude plugin install from GitHub
     - TRACKING-PLAN.md: create missing file referenced in consent panel
     - SUMMARY.md one_liner field: add field so automated extraction works
     - lock-release trailing args: normalize across workflows
     - pde-tools.cjs help text: add v0.6 commands (manifest, shard-plan, readiness, tracking)
     - github:update-pr / github:search-issues pre-registered entries: add first consumers
     - Historical commits note: document in RETROSPECTIVE.md (no code change possible)
     - Build in parallel with A and B

[Wave 2 — sequential, depends on Wave 1]

  D. plan-phase.md research validation step
     - Depends on: [A] pde-research-validator exists
     - Enhancement: add one step between research and planner spawn
     - Wire the has_research + has_validation check logic

  E. readiness.cjs B4/B5 extensions
     - Depends on: [B] pde-plan-checker enhancement (Mode A validates at plan-time
       before Mode B at the readiness gate; both must be consistent in their findings)
     - Enhancement: add B4 (@-ref file existence) and B5 (orphan export) to readiness.cjs
     - Wire into check-readiness.md as run_integration_checks step
```

**Rationale:**

- Build agents first ([A], [B]) before wiring their workflow hooks ([D], [E]). A workflow step that spawns a non-existent agent fails at runtime.
- Research validator ([A]) and plan-checker enhancement ([B]) are fully independent — wave them in parallel to avoid a sequential Phase 1 + Phase 2 for features that have no dependency between them.
- Tech debt ([C]) is fully independent of validation features. Placing it in the same wave as [A] and [B] avoids a standalone "cleanup" phase that has no delivery narrative — tech debt items become first-class work alongside the new validation features.
- The readiness.cjs extension ([E]) comes after plan-checker enhancement ([B]) because the two modes (declaration-time in checker, codebase-time in readiness) must be consistent. If plan-checker's Mode A finds that interface "FooService" is orphaned, Mode B should not contradict that finding by claiming "FooService" is actually consumed somewhere. Both checks must agree on the same semantic model before Mode B is released.

**Wave structure for execute-phase:**

```
Wave 1 (parallel):
  Plan A — pde-research-validator (new agent)
  Plan B — pde-plan-checker enhancements (dep + edge case + integration Mode A)
  Plan C — tech debt closure (7 items)

Wave 2 (sequential after Wave 1 completes):
  Plan D — plan-phase.md research validation step (depends on Plan A)
  Plan E — readiness.cjs B4/B5 + check-readiness.md Mode B step (depends on Plan B)
```

---

## Scaling Considerations

PDE is a Claude Code plugin. "Scale" means cognitive load and session context consumption as validation surface grows, not concurrent user throughput.

| Concern | With v0.7 | Mitigation |
|---------|-----------|------------|
| pde-research-validator context | Unbounded LLM call over research files | Cap: if any research file exceeds 20KB, flag as CONCERNS and skip claim extraction for that file |
| pde-plan-checker context growth | Three new analysis passes on already-loaded PLAN.md content | No new file reads required; passes run on already-loaded text |
| Mode B integration check breadth | Could scan large source trees | Strict scope: only files in plan @-references; never full codebase scan |
| READINESS.md size | New sections appended | All new sections use summary tables; no inline code blocks; document stays under 5KB |
| Plan-phase.md revision loop speed | Plan-checker now does more work per iteration | No new file reads; analysis is prompt-space analysis; negligible latency impact |

**First bottleneck if v0.7 expands:** Research validator claim count — if research files are large and densely factual, Pass 1 extraction could surface 50+ claims, making Pass 2 verification verbose. Prevention: cap verification at 25 highest-risk claims (technology versions, file paths, module exports) — skip count claims and narrative claims.

---

## Integration Points: New vs. Modified — Explicit Inventory

### New Files (create from scratch)

| File | Purpose |
|------|---------|
| `agents/pde-research-validator.md` | Research claim extractor and codebase verifier agent |
| `.planning/phases/NN-name/NN-RESEARCH-VALIDATION.md` | Per-phase research validation artifact (generated by agent) |

### Modified Files (surgical changes to existing)

| File | Change | Risk |
|------|--------|------|
| `agents/pde-plan-checker.md` | Add three check categories (dep, edge case, integration Mode A); extend return schema with three optional fields | LOW — additive; existing check behavior unchanged |
| `bin/lib/readiness.cjs` | Add B4 (@-ref file existence) and B5 (orphan export detection) check IDs | LOW — additive; existing A/B check IDs unchanged |
| `workflows/plan-phase.md` | Add research validation step between research and planner spawn | LOW — additive step; planner spawn logic unchanged |
| `workflows/check-readiness.md` | Add `run_integration_checks` step after semantic checks | LOW — additive step; structural/semantic check steps unchanged |
| `bin/pde-tools.cjs` | Add v0.6 commands to help text (manifest, shard-plan, readiness, tracking) | LOW — cosmetic help text only |
| Tech debt files (TRACKING-PLAN.md, etc.) | See tech debt list in PROJECT.md | LOW — isolated fixes |

### Untouched Files

All 13 design pipeline skills, the build orchestrator, all MCP sync workflows, mcp-bridge.cjs, pde-executor.md, pde-planner.md, pde-verifier.md, pde-reconciler.md, pde-analyst.md, pde-quality-auditor.md, pde-skill-builder.md, pde-skill-improver.md, pde-skill-validator.md, pde-design-quality-evaluator.md, pde-pressure-test-evaluator.md, execute-phase.md, verify-work.md, reconcile-phase.md, diagnose-issues.md, and all templates, references, and config files.

---

## Sources

- PDE codebase direct inspection (2026-03-19):
  - `workflows/execute-phase.md` — readiness gate integration, wave execution, reconciliation step
  - `workflows/plan-phase.md` — revision loop structure, planner spawn contract, init JSON fields
  - `workflows/check-readiness.md` — structural + semantic check orchestration, READINESS.md output contract
  - `workflows/verify-work.md` — UAT flow, gap closure cycle
  - `bin/lib/readiness.cjs` — A1-A11, B1-B3 check implementation; READINESS.md format contract
  - `bin/lib/reconciliation.cjs` — three-tier matching algorithm (slug → file overlap → prefix); template for dep graph matching heuristic
  - `agents/` directory — existing agent roster and file count
  - `.planning/PROJECT.md` — v0.7 target features, known tech debt 7 items, architectural constraints

---

*Architecture research for: PDE v0.7 — Pipeline Reliability & Validation*
*Researched: 2026-03-19*
