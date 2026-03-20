# Feature Research

**Domain:** AI-assisted development pipeline — reliability, validation, and automated verification (v0.7)
**Researched:** 2026-03-19
**Confidence:** HIGH (existing PDE codebase verified directly), MEDIUM (industry patterns from multiple web sources and analysis of adjacent tools), LOW (specific behavioral expectations from single sources, flagged inline)

---

> **Scope note:** This file covers ONLY the v0.7 Pipeline Reliability & Validation milestone. PDE's existing capabilities (story-file sharding, AC-first planning, readiness gate, reconciliation, per-task tracking, agent memory, 5 MCP integrations, 13-stage design pipeline) are stable dependencies — not re-built here. Every feature described is additive to the v0.6 baseline.

---

## Baseline: What v0.6 Provides (Stable Dependency)

```
Research:           pde-phase-researcher → RESEARCH.md
Planning:           pde-planner → PLAN.md + task-NNN.md shards
Pre-execution:      check-readiness → READINESS.md (PASS/CONCERNS/FAIL)
Execution:          pde-executor → per-task SUMMARY.md + HANDOFF.md
Reconciliation:     pde-reconciler → RECONCILIATION.md (planned vs. actual git)
Verification:       pde-verifier → VERIFICATION.md (goal-backward, AC-N gates)
Post-verification:  pde-integration-checker → integration gaps (post-execution)
                    pde-plan-checker → plan quality (pre-execution)
Memory:             .planning/agent-memory/{type}/memories.md (50-entry cap)
Tracking:           workflow-status.md + HANDOFF.md
```

The v0.7 gap: research claims go unvalidated against the actual codebase; cross-phase dependencies are checked after execution but not before; plans are reviewed for quality but not for edge cases and error paths; and 7 known tech debt items from v0.6 remain open.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are baseline requirements for a "pipeline reliability" milestone. Without these, the milestone's stated goal — making the research → plan → execute pipeline *trustworthy* — is not met.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| **Research claim extraction and codebase verification** | If a RESEARCH.md states "pde-tools.cjs exposes a `shard-plan` command" but that command doesn't exist, the plan built on it will fail at execution. Every AI-assisted pipeline that produces research needs a mechanism to catch this class of error before it propagates downstream. Missing = research phase produces ungrounded plans. | MEDIUM | Reads existing RESEARCH.md output; uses pde-tools.cjs and filesystem grep to verify; writes RESEARCH-VALIDATION.md; feeds into existing readiness gate |
| **Cross-phase dependency pre-verification** | PDE's existing integration checker runs *after* execution (post-mortem). Pre-execution dependency verification asks: "Does phase N depend on something from phase M that hasn't been built yet?" If not, the executor gets partway through and hits a missing interface. Users expect this gate *before* they commit to execution. | MEDIUM | Reads ROADMAP.md phase graph; reads PLAN.md task list; checks actual codebase state; produces DEPENDENCY-GAPS.md; integrates into check-readiness output |
| **Plan edge case analysis** | Plans produced by pde-planner describe the happy path. A plan that builds a file-based locking mechanism without specifying behavior on stale locks, concurrent writes, or lock-file corruption is incomplete. Users of AI-assisted development tools have learned (from painful experience) that agents optimize for happy path. An edge case analysis pass surfaces what the plan silently assumes won't happen. | MEDIUM | Reads existing PLAN.md + task-NNN.md shards; reads AC-N definitions; writes EDGE-CASES.md; surfaces as CONCERNS-level findings in READINESS.md |
| **Integration point verification (pre-execution)** | PDE currently detects orphan exports and mismatched interfaces *after* execution. Pre-execution verification asks: "Are the function signatures this plan will call actually present in the codebase with the expected types?" A plan that calls `pde-tools.cjs readiness check 53` but the readiness command only accepts a phase name — not a number — will fail mid-execution. Detecting this before execution prevents mid-run crashes. | MEDIUM | Reads task `<files>` and `<action>` fields; greps codebase for named imports/exports; verifies parameter shapes; writes INTEGRATION-CHECK.md |
| **Tech debt closure (7 known items from v0.6)** | These are documented in PROJECT.md and represent unresolved issues that create confusion or silent failures in the current platform. "TRACKING-PLAN.md referenced in consent panel does not exist" is a broken reference users will encounter. Leaving known debt open while adding new features signals low platform quality. | LOW–MEDIUM (per item) | Each item targets a specific file/behavior; no new infrastructure needed |

### Differentiators (Competitive Advantage)

Features that go beyond minimum verification and give PDE a qualitatively better "trustworthy pipeline" story than a simple pre-flight checklist.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Claim confidence scoring** | Not all research claims are equally risky. "The project uses Node.js CJS" is low-risk (verifiable from package.json). "The MCP bridge handles connection persistence natively" is high-risk (behavioral claim that requires reading mcp-bridge.cjs logic). A verification agent that assigns confidence scores (HIGH/MEDIUM/LOW) to extracted claims, rather than binary PASS/FAIL, gives the planner and user meaningful signal about where to focus. | MEDIUM | Research validation agent extracts claims, classifies them by verifiability type (file presence, API shape, behavioral, conceptual), verifies each, assigns confidence level. Produces a graded report rather than pass/fail. |
| **Dependency gap fix proposals** | When pre-execution dependency verification finds a gap (phase N requires something phase M hasn't built), simply reporting it forces the user to reason about how to resolve it. A differentiating behavior is generating a concrete fix proposal: "Phase N task 3 calls `createShardManifest()` from phase M, which hasn't been executed. Options: (a) add a task to phase M to build it first, (b) stub it in phase N with a TODO gate, (c) re-order phase execution." | MEDIUM | Dependency verification agent generates structured fix proposals for each gap it finds, categorized by fix strategy (order change, stub, add task). |
| **Edge case AC generation** | Beyond surfacing edge cases as warnings, automatically generate acceptance criteria for the most critical uncovered edge cases and offer to append them to the relevant PLAN.md. This transforms edge case analysis from a passive report into an active plan improvement step. | MEDIUM | Edge case analyzer classifies cases by severity; for HIGH severity cases, generates BDD format AC candidates; user approves which to add; appended to PLAN.md AC section. |
| **Integration verification with type awareness** | JavaScript is dynamically typed, but PDE's codebase uses consistent calling conventions (JSON from pde-tools.cjs, markdown templates). Integration verification can go beyond "function exists" to check that callers pass arguments in the shape the callee expects — e.g., a phase number vs. a phase slug vs. a phase directory path. | MEDIUM-HIGH | Parses pde-tools.cjs command definitions; checks that PLAN.md tasks calling those commands pass arguments in the expected format; flags type mismatches as integration issues. |
| **Research validation as standing gate** | Rather than running validation as a one-off command, make it a standing gate in the plan-phase workflow: every time a plan is generated from research, validation runs automatically. The planner receives the validation report alongside the RESEARCH.md before generating its PLAN.md. This creates a feedback loop where poor research quality is caught before bad plans are written. | LOW–MEDIUM | Wire RESEARCH-VALIDATION.md generation into plan-phase.md workflow; planner receives validation report in its context; low-confidence claims flagged explicitly to planner. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like natural extensions of a reliability milestone but create problems in PDE's architecture.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Automatic plan rewriting on edge case detection** | If the edge case analyzer finds a gap, why not just fix the plan automatically instead of reporting it? | Automatic plan mutation without user review creates a worse trust problem than the one it solves. Users need to see what changed and why. Automated rewrites without visibility produce plans that don't match what the user intended — the plan was "fixed" in a direction the user didn't choose. | Report edge cases with fix proposals; let user approve which changes to make; execute approved changes with a targeted edit. |
| **Full AST parsing for type verification** | Proper static analysis of Node.js CJS code requires an AST parser (e.g., Babel, Acorn). Why not just parse the code properly? | PDE has a zero-npm-deps-at-plugin-root constraint. Adding Babel or Acorn as a plugin-level dependency violates this. Building a full AST parser from scratch is out of scope for a reliability milestone. The false negative rate of AST-less pattern matching is acceptable for PDE's use case — the goal is catching obvious mismatches, not proving type safety. | Use regex-based pattern matching on command definitions and call sites. Catch obvious cases (wrong argument count, wrong argument type for known commands). Accept that subtle type mismatches require human review. |
| **Continuous background validation** | Run research validation and dependency verification continuously as files change, like a language server. | PDE is a Claude Code plugin that runs in session-based invocations. There is no persistent background process. "Continuous" means "on each session start," which is expensive and disruptive. More fundamentally, the reliability guarantees users need are at specific pipeline transition points (research → plan, plan → execute), not continuously. | Trigger validation at well-defined pipeline gates (after research, before planning, before execution). This is when the validation is actionable. |
| **Validation of external library claims** | RESEARCH.md may claim "Context7 reports that library X supports feature Y." Verifying this claim means re-running Context7 queries. | Re-running research during plan validation doubles research cost and introduces the same uncertainty (Context7 results can change). The validation agent should verify claims against the *actual codebase*, not against re-queried external sources. External library claims are the responsibility of the research agent, not the validation agent. | Scope validation to codebase-verifiable claims only. Mark external library claims as UNVERIFIABLE and flag for human review rather than attempting re-validation. |
| **Git history-based dependency inference** | Some dependency tools infer cross-phase dependencies from git commit history — "phase M files changed, phase N files that import from M were updated N commits later." | Git history-based inference is brittle for PDE's use case. PDE phases are not 1:1 with commits. Commit messages in PDE don't encode cross-phase dependency data in a parseable format. The inference would produce too many false positives (unrelated changes attributed to dependencies) to be actionable. | Use explicit dependency declarations: task `<files>` tags, PLAN.md objective statements, and ROADMAP.md phase descriptions as the authoritative source for dependency analysis. |

---

## Feature Dependencies

```
[Research Claim Extraction & Verification]
    └──produces──> RESEARCH-VALIDATION.md
    └──feeds-into──> [EXISTING: check-readiness] (validation report included in readiness gate)
    └──feeds-into──> [Research Validation as Standing Gate] (differentiator)
    └──required-by──> [Claim Confidence Scoring] (scoring requires extracted claims)

[Claim Confidence Scoring]
    └──depends-on──> [Research Claim Extraction & Verification]
    └──enhances──> RESEARCH-VALIDATION.md (adds confidence level per claim)

[Cross-Phase Dependency Pre-Verification]
    └──reads──> [EXISTING: ROADMAP.md] (phase graph)
    └──reads──> [EXISTING: PLAN.md + task-NNN.md shards] (task-level dependencies)
    └──produces──> DEPENDENCY-GAPS.md
    └──feeds-into──> [EXISTING: check-readiness] (gaps become CONCERNS or FAIL items)
    └──required-by──> [Dependency Gap Fix Proposals] (fix proposals require gap analysis)

[Dependency Gap Fix Proposals]
    └──depends-on──> [Cross-Phase Dependency Pre-Verification]
    └──enhances──> DEPENDENCY-GAPS.md (adds fix proposals to each gap)

[Plan Edge Case Analysis]
    └──reads──> [EXISTING: PLAN.md + AC-N definitions]
    └──reads──> [EXISTING: task-NNN.md shards]
    └──produces──> EDGE-CASES.md
    └──feeds-into──> [EXISTING: check-readiness] (edge cases surface as CONCERNS)
    └──required-by──> [Edge Case AC Generation] (generation requires classified cases)

[Edge Case AC Generation]
    └──depends-on──> [Plan Edge Case Analysis]
    └──writes-to──> [EXISTING: PLAN.md] (appends new AC-N entries with user approval)

[Integration Point Verification (pre-execution)]
    └──reads──> [EXISTING: task-NNN.md] (<files> and <action> fields)
    └──reads──> [EXISTING: pde-tools.cjs] (command definitions)
    └──produces──> INTEGRATION-CHECK.md
    └──feeds-into──> [EXISTING: check-readiness] (integration failures as FAIL items)
    └──required-by──> [Integration Verification with Type Awareness] (type awareness is an enhancement)

[Integration Verification with Type Awareness]
    └──depends-on──> [Integration Point Verification (pre-execution)]
    └──enhances──> INTEGRATION-CHECK.md (adds type mismatch detection)

[Tech Debt Closure (7 items)]
    └──standalone (each item targets a specific file/behavior)
    └──no-dependencies-on-other-new-features

[Research Validation as Standing Gate]
    └──depends-on──> [Research Claim Extraction & Verification]
    └──modifies──> [EXISTING: plan-phase.md workflow] (wires validation into plan-phase)
```

### Dependency Notes

- **Check-readiness is the integration hub:** All four main validation features (research validation, dependency verification, edge case analysis, integration point verification) produce artifact files that are consumed by the existing readiness gate. Building the readiness gate integration into each new feature is required — otherwise the features produce reports that nobody reads.

- **Research validation feeds the planner:** The highest-leverage integration is making the planner aware of low-confidence research claims before it writes the plan. This requires research validation to run *during* plan-phase, not just as a standalone command.

- **Tech debt closure is independent:** None of the 7 tech debt items depend on the new validation features. They can be built in any order and in parallel with validation work. Good candidates for an early phase in the milestone to close known issues before adding new surface area.

- **Differentiators depend on table stakes:** All differentiators are enhancements to table stakes features. Build the table stakes features first, then layer on the differentiators in subsequent phases.

---

## MVP Definition (for v0.7 Milestone)

### Launch With (v0.7 core — minimum to satisfy "pipeline reliability")

These features are what makes this milestone a genuine reliability improvement rather than just additional reports.

- [ ] **Research claim extraction and codebase verification** — new agent reads RESEARCH.md, extracts verifiable claims, checks each against the codebase, writes RESEARCH-VALIDATION.md. This is the feature the user's memory file `project_research_validation.md` describes as the core requirement.
- [ ] **Cross-phase dependency pre-verification** — new check in readiness gate (or separate command) that reads ROADMAP.md + PLAN.md and flags dependencies on work not yet built; produces DEPENDENCY-GAPS.md.
- [ ] **Plan edge case analysis** — new agent or readiness gate extension that reads plan + ACs and surfaces uncovered error paths, empty states, and boundary conditions as CONCERNS in READINESS.md.
- [ ] **Integration point verification (pre-execution)** — checks that task-level calls to pde-tools.cjs, external files, and module exports are valid before execution begins; adds INTEGRATION-CHECK.md.
- [ ] **Tech debt closure (all 7 items)** — resolves TRACKING-PLAN.md reference, lock-release trailing arguments, SUMMARY.md one_liner field, pde-tools.cjs usage help text gaps, and remaining items from PROJECT.md.

### Add After Validation (v0.7.x — extend once core is working)

- [ ] **Claim confidence scoring** — graduated confidence levels (HIGH/MEDIUM/LOW/UNVERIFIABLE) per extracted claim; add when users report that validation reports are too binary to act on.
- [ ] **Dependency gap fix proposals** — structured fix proposals for each dependency gap; add when users report that DEPENDENCY-GAPS.md is useful but they don't know how to resolve the gaps.
- [ ] **Research validation as standing gate** — auto-wire validation into plan-phase.md so every plan gets a validation pass; add after standalone validation is stable.

### Future Consideration (v0.8+)

- [ ] **Edge case AC generation** — auto-generate BDD ACs for uncovered edge cases; high value but requires careful UX to avoid polluting plans with machine-generated ACs users didn't ask for.
- [ ] **Integration verification with type awareness** — argument shape checking for pde-tools.cjs callers; useful but requires significant pattern-matching work for marginal gain over basic integration checks.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Research claim extraction & verification | HIGH — prevents plans built on hallucinated codebase facts | MEDIUM | P1 |
| Cross-phase dependency pre-verification | HIGH — prevents mid-execution failures from missing work | MEDIUM | P1 |
| Plan edge case analysis | HIGH — surfaces what plans silently assume away | MEDIUM | P1 |
| Integration point verification (pre-execution) | HIGH — catches calling convention mismatches before execution | MEDIUM | P1 |
| Tech debt closure (7 items) | MEDIUM-HIGH — cleans up broken references and cosmetic issues | LOW–MEDIUM | P1 |
| Claim confidence scoring | MEDIUM — makes validation reports more actionable | MEDIUM | P2 |
| Dependency gap fix proposals | MEDIUM — transforms gap reports into actionable fixes | MEDIUM | P2 |
| Research validation as standing gate | HIGH — closes the feedback loop automatically | LOW–MEDIUM | P2 |
| Edge case AC generation | MEDIUM — turns analysis into plan improvements | MEDIUM | P3 |
| Integration verification with type awareness | LOW-MEDIUM — marginal gain over basic integration checks | MEDIUM-HIGH | P3 |

**Priority key:**
- P1: Must have for v0.7 milestone to close ("pipeline reliability" claim requires these)
- P2: Include if implementation time permits; strong v0.7.x candidates
- P3: Future milestone (v0.8+)

---

## Phase Ordering Recommendation

Based on dependencies and risk:

**Phase 1: Tech debt closure** — independent of new features; builds confidence that the platform is clean before adding new surface area. Low risk, high clarity.

**Phase 2: Research claim verification** — first new agent; standalone with clear I/O (RESEARCH.md in, RESEARCH-VALIDATION.md out). Establishes the pattern for subsequent verification agents.

**Phase 3: Integration point verification** — reads task files (already sharded by v0.6); checks pde-tools.cjs which is stable and well-defined. Lower uncertainty than dependency verification.

**Phase 4: Cross-phase dependency pre-verification** — more complex (requires reading ROADMAP.md phase graph and reasoning about build order); builds on patterns from phase 2 and 3.

**Phase 5: Plan edge case analysis + readiness gate integration** — last because it requires the other three verification artifacts to be in place; the readiness gate becomes the unified surface for all verification outputs.

---

## Behavioral Expectations by Feature

### Research Claim Extraction and Verification

**What a claim looks like:** "pde-tools.cjs exposes a `shard-plan` subcommand" (high verifiability — grep the file), "The MCP bridge handles reconnection automatically" (medium verifiability — requires reading logic, not just existence), "Node.js CJS is the correct module format for this project" (low verifiability — convention claim, not codebase fact).

**Expected verifiable claim types:**
- File existence: "file X exists at path Y"
- Command/function availability: "pde-tools.cjs exposes command X"
- Interface shape: "function X accepts arguments (a, b, c)"
- Configuration value: "config setting X defaults to Y"
- Agent/workflow name: "workflow X is at path Y"

**Expected unverifiable claim types (mark, don't attempt to verify):**
- Library capability claims ("Context7 says library X supports Y")
- Performance claims ("this approach is faster than X")
- Future behavior claims ("this will work when...")

**Output:** RESEARCH-VALIDATION.md with claim table (claim, type, verification method, result, confidence), summary counts, overall validation status.

### Cross-Phase Dependency Pre-Verification

**What a dependency looks like:** Task in phase N has `<action>` that calls a function exported from a file that phase M was supposed to create, but phase M status in ROADMAP.md is PLANNED (not COMPLETE).

**Expected gap types:**
- Missing file: task calls path that doesn't exist and no prior phase created it
- Unbuilt function: task calls named export that doesn't exist in the codebase
- Phase ordering: task in phase N depends on output of phase M where M > N in execution order

**Output:** DEPENDENCY-GAPS.md with gap table (phase, task, dependency, type, resolution options), feeds into READINESS.md.

### Plan Edge Case Analysis

**Standard edge case categories to always check:**
- Empty/null inputs: does the plan handle empty arrays, missing files, null config values?
- Concurrent access: file-based state can have race conditions; does the plan address locking?
- Partial completion: if the task is interrupted mid-execution, what state is the system left in?
- Error propagation: if a tool call fails, does the plan specify error handling?
- Boundary conditions: off-by-one in phase numbers, max-length strings, missing config keys

**Severity classification:**
- HIGH: missing error handling for a code path that will be exercised in normal use
- MEDIUM: uncovered edge case that requires unusual conditions to trigger
- LOW: boundary condition that only appears in adversarial or misconfigured use

**Output:** EDGE-CASES.md with categorized case table; HIGH severity cases surface as CONCERNS in READINESS.md.

### Integration Point Verification

**What to check:**
- For each `pde-tools.cjs` call in a task: does the subcommand exist? Are arguments in the expected format (number vs. string, positional vs. flag)?
- For each file import in a task: does the file exist? Is the named export present?
- For each template reference (`@{CLAUDE_PLUGIN_ROOT}/templates/X`): does the template file exist?
- For each PLAN.md `<files>` path: does the file exist, or is it being created in this task?

**Output:** INTEGRATION-CHECK.md with check table (task, reference, check type, result); failures surface as FAIL in READINESS.md.

### Tech Debt Closure (7 Items from v0.6)

| Item | File(s) Affected | Fix Type |
|------|-----------------|----------|
| PLUG-01: `claude plugin install` from GitHub not tested | README, GETTING-STARTED.md | Documentation + manual test |
| TRACKING-PLAN.md referenced but doesn't exist | consent panel reference | Create stub or remove reference |
| Historical commits missing Co-Authored-By | git history | Cannot retroactively fix — document as known exception |
| lock-release inconsistent trailing args | workflow files using lock-release | Normalize call sites |
| SUMMARY.md missing `one_liner` field | All SUMMARY.md template files and existing examples | Add field to template + backfill recent files |
| 2 pre-registered TOOL_MAP entries without consumers | mcp-bridge.cjs | Add consumers or remove entries |
| pde-tools.cjs help text missing v0.6 commands | bin/pde-tools.cjs | Update help text for manifest, shard-plan, readiness, tracking |

---

## Sources

- **PDE PROJECT.md** (HIGH confidence): `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/PROJECT.md` — v0.6 baseline capabilities, known tech debt items, v0.7 target features
- **PDE workflows/verify-phase.md** (HIGH confidence): existing verification agent — goal-backward pattern, artifact verification, wiring checks
- **PDE workflows/check-readiness.md** (HIGH confidence): existing readiness gate — PASS/CONCERNS/FAIL structure, structural + semantic checks
- **PDE .planning/research/FEATURES.md v0.6** (HIGH confidence): prior milestone feature research — confirmed v0.6 features as stable baseline
- **InfoQ AI-Assisted Development 2025** (MEDIUM confidence): https://www.infoq.com/minibooks/ai-assisted-development-2025/ — cross-phase dependency patterns, verification gate patterns
- **Augment Code Spec-Driven Workflows** (MEDIUM confidence): https://www.augmentcode.com/guides/ai-spec-driven-development-workflows — research-to-plan pipeline patterns
- **Panto AI Cross-File Dependency Analysis** (MEDIUM confidence): https://www.getpanto.ai/blog/how-panto-ais-cross-file-dependency-analysis-is-transforming-tech-teams-development-workflows — dependency detection in AI-assisted workflows; 40% reduction in integration defects with pre-execution checks
- **Edge Cases and Error Handling: Where AI Code Falls Short** (MEDIUM confidence): https://codefix.dev/2026/02/02/ai-coding-edge-case-fix/ — AI optimization for happy path; edge case categories; why empty arrays / null values / boundary conditions are under-covered
- **AI Code Review Automation Guide 2025** (MEDIUM confidence): https://www.digitalapplied.com/blog/ai-code-review-automation-guide-2025 — 42-48% bug detection rates for AI reviewers; categories of issues caught vs. missed
- **Infomineo AI Hallucination Verification Guide 2025** (MEDIUM confidence): https://infomineo.com/artificial-intelligence/stop-ai-hallucinations-detection-prevention-verification-guide-2025/ — research claim grounding patterns; confidence scoring approaches; types of verifiable vs. unverifiable claims

---

*Feature research for: PDE v0.7 — Pipeline Reliability & Validation*
*Researched: 2026-03-19*
