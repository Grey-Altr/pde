# Project Research Summary

**Project:** Platform Development Engine — v0.7 Pipeline Reliability & Validation
**Domain:** AI-assisted development pipeline — automated verification, dependency checking, quality gates
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

PDE v0.7 is an additive reliability milestone for an existing, well-defined Node.js CommonJS Claude Code plugin. The core challenge is not building something new from scratch but rather instrumenting an existing 6-milestone, 34-command pipeline with verification gates that run at specific transition points: before planning (research claim validation), before execution (dependency and integration checks), and during plan review (edge case analysis). The research consensus is clear: embed these gates into existing workflow positions rather than creating standalone optional commands — gates that are optional get skipped, and skipped gates provide zero reliability improvement.

The recommended approach is a two-wave build. Wave 1 builds the new agent (`pde-research-validator`), enhances the existing `pde-plan-checker` with three new check categories (dependency graph, edge case, integration Mode A), and closes the 7 known v0.6 tech debt items — all in parallel since they share no dependencies. Wave 2 wires the Wave 1 artifacts into `plan-phase.md` (research validation hook) and `check-readiness.md` (Mode B codebase-time integration checks). The entire feature surface ships as surgical modifications to 5 existing files plus one new agent, keeping the blast radius minimal and all 13 design pipeline skills, the build orchestrator, and all MCP sync workflows completely untouched.

The key risks are trust failures rather than technical failures: a validator that over-claims (verifying file existence and calling it content verification), a validator that over-blocks (treating UNVERIFIABLE claims the same as CONTRADICTED ones), and an edge case analyzer that generates generic noise instead of plan-specific signal. All three destroy developer trust faster than no validation would. The three-state output model (VERIFIED / UNVERIFIABLE / CONTRADICTED) mapped to the existing readiness gate severity levels (PASS / CONCERNS / FAIL) is the single architectural decision that makes or breaks this milestone.

---

## Key Findings

### Recommended Stack

PDE's zero-npm-at-plugin-root constraint is the defining architectural fact for this milestone. All new capability must use Node.js v20 builtins or be vendor-bundled as committed `.cjs` files — no `npm install`, no `package.json`. The two new technical capabilities required are: (1) AST parsing for JavaScript code verification, and (2) cross-phase dependency graph analysis.

**Core technologies:**
- **Node.js v20 builtins (`node:fs`, `node:path`)** — directory traversal, file I/O — already in use universally; `fs.readdirSync({ recursive: true })` (v18.17+) replaces any glob package need
- **acorn 8.16.0 + acorn-walk 8.3.5 (vendored into `bin/lib/vendor/`)** — JavaScript AST parsing — acorn is Node.js's own internal JS parser, ships as a single CJS-compatible file with no transitive deps, and 8.16.0 adds `sourceType: "commonjs"` mode required for PDE's `.cjs` files; two files, ~150KB total, no npm install required
- **Hand-built `dep-graph.cjs` (~40 lines, Map/Set)** — phase dependency graph, cycle detection, topological sort — the full `dependency-graph` npm package is 400 lines for functionality PDE doesn't need; inline implementation is sufficient and dependency-free
- **Regex claim extraction (no new library)** — extracting verifiable claims from author-controlled structured research markdown — existing PDE patterns (XML-tag regex in `sharding.cjs`) prove this is sufficient; `marked` v17 is ESM-first and incompatible with PDE's CJS requirement

See [STACK.md](STACK.md) for full rationale and alternatives considered.

### Expected Features

V0.7's feature set cleanly separates into what must ship for "pipeline reliability" to be a credible milestone claim, and what extends the baseline for subsequent iterations.

**Must have (table stakes — v0.7 core):**
- **Research claim extraction and codebase verification** — new `pde-research-validator` agent reads research files, extracts verifiable claims, checks each against the codebase, writes `NN-RESEARCH-VALIDATION.md`; primary requirement from `project_research_validation.md` memory file
- **Cross-phase dependency pre-verification** — pre-execution check (embedded in `pde-plan-checker`) that reads ROADMAP.md + plan files and flags dependencies on work not yet built; produces findings in `dep_issues[]` field
- **Plan edge case analysis** — `pde-plan-checker` extension that surfaces uncovered error paths, empty states, and boundary conditions as CONCERNS (never FAIL) in the revision loop
- **Integration point verification (pre-execution)** — verifies function/export references in plan task declarations before execution; two-mode design (declaration-time in plan-checker, codebase-time in readiness gate)
- **Tech debt closure (all 7 v0.6 items)** — TRACKING-PLAN.md missing reference, lock-release trailing args, SUMMARY.md `one_liner` field, pde-tools.cjs help text gaps, TOOL_MAP pre-registered entries without consumers, historical commit note, PLUG-01 install test

**Should have (v0.7.x differentiators — add after core is validated):**
- **Claim confidence scoring** — graduated HIGH/MEDIUM/LOW/UNVERIFIABLE per claim instead of binary output; add when validation reports are too binary to act on
- **Dependency gap fix proposals** — structured resolution options per detected gap; add when DEPENDENCY-GAPS.md is useful but gaps aren't self-explanatory to resolve
- **Research validation as standing gate** — auto-wire validation into every `plan-phase.md` run; add once standalone validation is stable

**Defer (v0.8+):**
- **Edge case AC generation** — auto-generate BDD acceptance criteria for high-severity edge cases; high value but requires careful UX to avoid polluting plans with machine-generated ACs
- **Integration verification with type awareness** — argument shape checking beyond name matching; marginal gain over basic integration checks for significant engineering cost

See [FEATURES.md](FEATURES.md) for full prioritization matrix and anti-features.

### Architecture Approach

V0.7 is a targeted enhancement to 5 existing files plus one new agent. The core architectural decision is enhancement over proliferation: three of the four new validation capabilities (cross-phase dependency, edge case analysis, integration Mode A) all read `PLAN.md` files — the same inputs `pde-plan-checker` already loads — making them new analysis passes on existing context rather than requiring new agent spawns with new context loads. Only research validation is genuinely new context (reading research markdown + targeted codebase files) and earns a new agent.

**Major components and v0.7 changes:**
1. **`pde-research-validator` (new agent)** — claim extraction from research files (LLM pass) + per-claim codebase verification (tool-call pass); strictly read-only; writes `NN-RESEARCH-VALIDATION.md` to `.planning/phases/NN-name/`
2. **`pde-plan-checker` (enhanced)** — existing structural checks unchanged; adds `dep_issues[]`, `edge_case_issues[]`, `integration_issues[]` to return schema; fully additive, no existing behavior removed
3. **`plan-phase.md` (enhanced)** — new step between research file detection and planner spawn; spawns `pde-research-validator` when research exists and no validation artifact is present; blocks on `contradicted_count > 0` with user choice; surfaces `unverified_count > 0` as non-blocking CONCERNS
4. **`readiness.cjs` (enhanced)** — adds B4 (@-ref file existence) and B5 (orphan export, declaration-time) check IDs; existing A1-A11, B1-B3 checks unchanged
5. **`check-readiness.md` (enhanced)** — adds `run_integration_checks` step after semantic checks (Mode B: codebase-time verification of files explicitly named in plan @-references, never a full codebase scan)

Integration check scope is strictly bounded to files named in plan `<context>` @-references. Edge case findings are always CONCERNS, never FAIL. The readiness gate's PASS/CONCERNS/FAIL contract is unchanged.

See [ARCHITECTURE.md](ARCHITECTURE.md) for full data flow diagrams, anti-patterns, and build order.

### Critical Pitfalls

The pitfall landscape for this milestone is dominated by trust failures — scenarios where the validation system produces confident-looking but incorrect or irrelevant output, training developers to ignore it.

1. **Verification that over-claims** — verifying file existence and calling it content verification; avoid by defining claim tiers upfront: Tier 1 (structural: file exists) verified with Glob, Tier 2 (content: function name, parameter count) verified with Grep/Read, Tier 3 (behavioral) marked UNVERIFIABLE. Never satisfy a Tier 2 claim with a Tier 1 check.

2. **Binary VERIFIED/UNVERIFIED output blocking on unverifiable claims** — any claim the validator cannot statically verify blocks execution, generating false alarms that train developers to bypass the gate entirely; avoid by implementing the three-state model (VERIFIED / UNVERIFIABLE / CONTRADICTED) from day one; only CONTRADICTED maps to FAIL.

3. **Edge case analysis generating noise** — 20+ generic edge cases (empty arrays, network unavailability) irrelevant to the specific plan; avoid by requiring each edge case to reference a specific plan element (file path, function, state field) and capping output at 5-8 high-relevance findings.

4. **Integration verifier flagging intentional orphans** — `github:update-pr` and `github:search-issues` are intentionally pre-registered in TOOL_MAP; treating them as FAIL teaches developers to ignore all integration output; avoid by implementing a `# TOOL_MAP_PREREGISTERED` annotation allowlist before the verifier ships.

5. **Validation agents modifying state while verifying** — a "helpful" shortcut where the validator corrects stale research files in-place destroys the independence of verification and introduces silent state mutations; avoid by restricting `pde-research-validator`'s `allowed_tools` to read-only (no Write, no Edit) as an architectural constraint in the agent definition.

Additional critical pitfalls: dependency checker becoming slow enough to get disabled (cap scope to current phase + 1 upstream, enforce 10-second max runtime AC), research validation producing stale codebase views across phases (`validated_at_phase` field required in output schema from the start), tech debt closure accidentally breaking working features via cleanup scope creep (blast-radius consumer audit required before touching any shared file).

See [PITFALLS.md](PITFALLS.md) for full inventory with warning signs, recovery strategies, and a "looks done but isn't" checklist.

---

## Implications for Roadmap

The research from all four files converges on the same two-wave build structure. The wave model is not a preference — it is forced by the dependency graph: workflow hooks cannot be wired before the agents they spawn exist. All three table-stakes checks (dependency, edge case, integration Mode A) read the same PLAN.md inputs already loaded by `pde-plan-checker`, making them a single combined phase rather than three sequential phases.

### Phase 1: Tech Debt Closure

**Rationale:** All 7 v0.6 tech debt items are fully independent of the new validation features and share no dependencies with each other. Closing known debt before expanding surface area establishes a clean baseline and gives the team early wins that confirm the pipeline is sound before adding new complexity. Each item is isolated, low-risk, and explicitly scoped in PROJECT.md.
**Delivers:** Clean platform baseline — no broken references (TRACKING-PLAN.md), normalized lock-release call sites, SUMMARY.md `one_liner` field added, pde-tools.cjs help text updated for v0.6 commands, TOOL_MAP pre-registered entries noted, PLUG-01 install path tested
**Addresses:** TD-01 through TD-07 from PROJECT.md
**Avoids:** Pitfall 6 (tech debt closure scope creep) — each item requires a consumer audit before implementation; fix is surgical, not cleanup
**Research flag:** No research needed — items are well-scoped from PROJECT.md; standard implementation patterns only

### Phase 2: Research Validation Agent

**Rationale:** The new `pde-research-validator` agent must exist before `plan-phase.md` can be wired to spawn it (Wave 1 before Wave 2). This is the highest-visibility feature and the primary requirement from the `project_research_validation.md` memory file. Building it standalone first allows the two-pass architecture (LLM claim extraction + tool-call codebase verification) to be validated before it is embedded in the planning workflow.
**Delivers:** `agents/pde-research-validator.md` with strictly read-only tool access; `NN-RESEARCH-VALIDATION.md` artifact format with three-state output (VERIFIED/UNVERIFIABLE/CONTRADICTED); claim tier taxonomy (Tier 1/2/3) embedded in agent instructions; `validated_at_phase` field in output schema
**Uses:** Node.js v20 builtins, acorn + acorn-walk (vendored as `bin/lib/vendor/acorn.cjs` and `bin/lib/vendor/walk.cjs`), regex claim extraction
**Implements:** Architecture Pattern 2 (two-pass claim verification)
**Avoids:** Pitfall 1 (over-claiming), Pitfall 2 (over-blocking), Pitfall 7 (stale codebase view), Pitfall 10 (validation agent modifying state)
**Research flag:** Targeted research recommended for the claim tier taxonomy boundary cases and `validated_at_phase` staleness threshold before writing the PLAN.md for this phase

### Phase 3: Plan Checker Enhancement (Dependency + Edge Case + Integration Mode A)

**Rationale:** All three plan-time validation checks read the same PLAN.md files that `pde-plan-checker` already loads. They are new analysis passes on existing context, not new agents. Bundling them into a single phase is architecturally correct (single spawn, single return, existing revision loop) and avoids the 3x context overhead anti-pattern of creating separate agents. This phase must complete before `check-readiness.md` can be enhanced, because declaration-time (Mode A) and codebase-time (Mode B) checks must be semantically consistent.
**Delivers:** Enhanced `pde-plan-checker` with `dep_issues[]`, `edge_case_issues[]`, `integration_issues[]` return fields; `bin/lib/dep-graph.cjs` inline module (~40 lines); integration Mode A (declaration-time orphan and name mismatch detection); `# TOOL_MAP_PREREGISTERED` annotation allowlist support
**Uses:** Hand-built dep-graph.cjs (Map/Set), regex pattern matching on plan declarations
**Implements:** Architecture Patterns 3, 4, 5-Mode-A
**Avoids:** Pitfall 4 (edge case noise — relevance filter required, 5-8 findings max, each referencing a specific plan element), Pitfall 5 (hardcoded scope — glob patterns required from day one), Pitfall 9 (intentional orphan allowlist for TOOL_MAP pre-registrations)
**Research flag:** Standard patterns — pde-plan-checker enhancement is an established v0.6 pattern; incremental return schema extension only

### Phase 4: Workflow Integration (plan-phase.md Hook + Readiness Gate Mode B)

**Rationale:** Wave 2 — wires Wave 1 artifacts into the pipeline positions that make them automatic rather than optional. Two sub-features in one phase because both are "wire existing artifacts into existing workflows" work with similar scope and risk. Completing this phase closes the full validation loop: research → validation → planning → readiness → execution.
**Delivers:** Enhanced `plan-phase.md` (research validation step with `contradicted_count` gate and user choice prompt; conditional on research files existing and validation not yet run); enhanced `check-readiness.md` (new `run_integration_checks` step after semantic checks); enhanced `readiness.cjs` (B4 @-ref file existence check, B5 orphan export check — both additive new check IDs)
**Implements:** Architecture data flows for research validation flow and readiness gate enrichment flow
**Avoids:** Pitfall 3 (dependency checks static declarations — Mode B strictly scoped to plan @-references, never full codebase); Pitfall 8 (dependency checker slowdown — 10-second max runtime as explicit AC, scope capped to current phase + 1 upstream)
**Research flag:** Standard patterns — both workflow files follow established PDE enhancement patterns that have been applied across multiple milestones; additive steps only

### Phase Ordering Rationale

- **Tech debt first** because it is fully independent and closing known issues before adding new surface area avoids compounding problems
- **Research validator (Phase 2) before workflow hooks (Phase 4)** because `plan-phase.md` cannot spawn an agent that doesn't exist yet
- **Plan-checker enhancements (Phase 3) before readiness gate Mode B (Phase 4)** because declaration-time (Mode A) and codebase-time (Mode B) checks must share a consistent semantic model; shipping them out of order could produce contradictory findings between the two modes
- **Wave parallelism within phases:** Phase 1 (all 7 debt items in parallel), Phase 3 (dep + edge case + integration Mode A checks can be developed in parallel within the same agent enhancement), Phase 4 (plan-phase.md hook and readiness.cjs/check-readiness.md enhancement can proceed in parallel once Phases 2 and 3 are complete)

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Research Validation Agent):** The claim tier taxonomy and `validated_at_phase` staleness threshold (N=2 was inferred, not measured) have no prior PDE precedent. Recommend a targeted research-phase pass on claim classification patterns and confidence scoring before writing the PLAN.md for this phase. Also confirm the acorn vendoring approach does not conflict with any gitignore patterns or plugin manifest exclusions before starting implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Tech Debt Closure):** Each item is explicitly scoped in PROJECT.md; implementation is direct, no unknowns
- **Phase 3 (Plan Checker Enhancement):** pde-plan-checker enhancement is a well-worn v0.6 pattern; dep-graph, edge case, and integration Mode A are new analysis logic following the established additive return schema pattern
- **Phase 4 (Workflow Integration):** Both `plan-phase.md` and `check-readiness.md` have been enhanced across multiple prior milestones; the additive step pattern is thoroughly documented in existing workflow files

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against Node.js v20 official docs; acorn 8.16.0 confirmed via changelog with `sourceType: "commonjs"` availability confirmed for Feb 2026 release; zero-npm constraint verified against absent package.json; `fs.readdirSync` recursive confirmed Node.js v18.17+ |
| Features | HIGH | Grounded in direct PDE codebase inspection (PROJECT.md, v0.6 workflow files); industry patterns from multiple corroborating sources (Augment Code, Panto AI, InfoQ, Infomineo); anti-features well-reasoned from PDE's architectural constraints |
| Architecture | HIGH | Entire analysis derived from direct codebase inspection of existing workflow, agent, and library files; no external frameworks; all decisions trace to established patterns in PDE v0.6 |
| Pitfalls | HIGH | Grounded in PDE's 6-milestone retrospective history plus verified patterns from independent sources (Anthropic evals guide, agentic engineering research, IBM alert fatigue patterns); all 10 pitfalls include concrete warning signs and prevention strategies tied to specific build phases |

**Overall confidence:** HIGH

### Gaps to Address

- **Claim tier taxonomy boundary cases (Phase 2):** The research defines three tiers but does not give examples for every claim type PDE research files produce. During Phase 2 planning, write a concrete mapping of the 10-15 most common claim patterns in PDE research files to their tier classification. Prevents ambiguity during implementation.

- **`validated_at_phase` staleness threshold (Phase 2):** The pitfalls research recommends N=2 (validation stale after 2 phases), but this was inferred from PDE's milestone structure, not empirically measured. During Phase 2 planning, review v0.5 and v0.6 milestone histories to confirm whether 2 phases is the right window or whether it should be milestone-scoped (stale after milestone boundary, not phase count).

- **acorn vendoring compatibility (Phase 2):** The approach (copy CJS dist files to `bin/lib/vendor/`) is recommended but has not been verified against PDE's gitignore patterns or plugin manifest exclusions. Confirm before starting Phase 2 implementation that committed vendor files are not excluded.

- **TOOL_MAP pre-registration allowlist format (Phase 3):** The annotation `# TOOL_MAP_PREREGISTERED` is proposed but not yet validated against `mcp-bridge.cjs`'s actual code structure. During Phase 3 planning, confirm that the annotation placement (above each TOOL_MAP entry) is parseable by simple regex without requiring AST analysis of the bridge file.

---

## Sources

### Primary (HIGH confidence)
- **PDE PROJECT.md** — v0.7 target features, known tech debt 7 items, architectural constraints, v0.6 baseline capabilities
- **PDE codebase direct inspection (2026-03-19)** — workflows/plan-phase.md, workflows/check-readiness.md, workflows/execute-phase.md, bin/lib/readiness.cjs, bin/lib/reconciliation.cjs, agents/ directory roster, mcp-bridge.cjs TOOL_MAP, protected-files.json
- **PDE RETROSPECTIVE.md (v0.1–v0.6)** — 6-milestone history of lessons, failure modes, and proven patterns
- **Node.js v20 fs docs** — https://nodejs.org/api/fs.html — `readdirSync` recursive option confirmed in v18.17+
- **acorn CHANGELOG** — https://github.com/acornjs/acorn/blob/master/acorn/CHANGELOG.md — v8.16.0 released February 19, 2026; `sourceType: "commonjs"` confirmed
- **acorn-walk npm** — https://www.npmjs.com/package/acorn-walk — v8.3.5; `simple()`, `full()`, `ancestor()` API confirmed
- **Anthropic: "Demystifying evals for AI agents"** — signal-to-noise ratio in agent evaluation, ambiguity-as-noise principle

### Secondary (MEDIUM confidence)
- **InfoQ: AI-Assisted Development 2025** — https://www.infoq.com/minibooks/ai-assisted-development-2025/ — cross-phase dependency patterns, verification gate patterns
- **Augment Code: Spec-Driven Workflows** — https://www.augmentcode.com/guides/ai-spec-driven-development-workflows — research-to-plan pipeline patterns
- **Panto AI: Cross-File Dependency Analysis** — https://www.getpanto.ai/blog/how-panto-ais-cross-file-dependency-analysis-is-transforming-tech-teams-development-workflows — 40% reduction in integration defects with pre-execution checks
- **codefix.dev: Edge Cases and Error Handling** — https://codefix.dev/2026/02/02/ai-coding-edge-case-fix/ — AI optimization for happy path; edge case categories
- **Infomineo: AI Hallucination Verification Guide 2025** — https://infomineo.com/artificial-intelligence/stop-ai-hallucinations-detection-prevention-verification-guide-2025/ — claim grounding patterns; confidence scoring; verifiable vs. unverifiable claim types
- **"Agentic Engineering, Part 7: Dual Quality Gates"** (sagarmandal.com, 2026-03-15) — independent validation/testing separation, mocked vs. real-world failure gap
- **tessl.io: CI/CD for Context in Agentic Coding** — specification staleness as primary failure mode
- **vFunction: How to Reduce Technical Debt** — blast radius analysis for tech debt closure
- **IBM: Alert Fatigue Reduction with AI Agents** — noise-vs-signal ratio patterns in automated alert systems
- **dependency-graph GitHub (v1.0.0)** — stable-but-unmaintained; DepGraph API confirmed; not recommended — over-engineering for PDE's 40-line need

### Tertiary (LOW confidence)
- **marked v17 ESM-first status** — https://www.npmjs.com/package/marked — ESM-first design noted in changelog; CJS incompatibility inferred but not tested against PDE runtime directly

---

*Research completed: 2026-03-19*
*Ready for roadmap: yes*
