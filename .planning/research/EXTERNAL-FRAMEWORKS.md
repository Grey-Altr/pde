# External Framework Integration Candidates

> Researched 2026-03-17. Archive of BMAD Method and PAUL framework principles
> that could inform a future PDE milestone focused on workflow maturity.

---

## Source Frameworks

### BMAD Method (Breakthrough Method for Agile AI-Driven Development)

- **Repo:** github.com/bmad-code-org/BMAD-METHOD (MIT, ~41k stars, 127 contributors)
- **Docs:** docs.bmad-method.org
- **Version:** v6.2.0 (as of 2026-03-15), 95k monthly npm downloads
- **Architecture:** Compilation pipeline — YAML agent defs → Zod validation → deep merge → compiled .md files per IDE
- **Key distinction from PDE:** BMAD is a compile-time framework producing static persona files; PDE is a runtime orchestration engine spawning subagents. BMAD trusts the human to sequence agents; PDE automates sequencing.

### PAUL (Plan-Apply-Unify Loop)

- **Repo:** github.com/ChristopherKahler/paul
- **Companion:** CARL (Context Augmentation & Reinforcement Layer) — github.com/ChristopherKahler/carl
- **Install:** `npx paul-framework --global`
- **Architecture:** 14 rules + 26 slash commands for Claude Code; enforces Plan → Apply → Unify cycle
- **Key distinction from PDE:** PAUL is lightweight and session-focused; PDE is project-lifecycle-focused. PAUL's strength is in-session discipline; PDE's is cross-session orchestration.

---

## Integration Candidates

### Tier 1 — High Value, Clear Integration Path

#### 1. Story-File Sharding (from BMAD)

**Concept:** Break monolithic plans into KB-sized, self-contained atomic task files. Each executor agent loads only the context it needs. BMAD claims 90% token savings.

**Current PDE gap:** `pde-executor` receives the full PLAN.md for context. In phases with 10+ tasks, later tasks operate in a context already polluted by earlier task execution artifacts.

**Integration point:** `gsd:execute-phase` → `pde-executor`

**Implementation sketch:**
- During plan creation, `pde-planner` emits a `tasks/` directory alongside PLAN.md
- Each task file (`task-001-setup-schema.md`) contains: acceptance criteria, relevant file paths, schema snippets, and dependency pointers
- `pde-executor` loads only the current task file + `project-context.md` (see candidate #6)
- Completed task files get a `status: complete` frontmatter update

**Estimated scope:** Medium — requires planner output format change + executor context loading change

**Risk:** Over-sharding trivial phases adds overhead; needs a threshold (e.g., only shard when plan has 5+ tasks)

---

#### 2. File-Hash Manifest for Safe Updates (from BMAD)

**Concept:** Track every framework file with SHA256 hashes in a manifest CSV. During `pde:update`, compare hashes to detect user modifications and preserve them automatically.

**Current PDE gap:** `pde:update` uses three-way merge via `pde-sync-engine`. This works but is complex and occasionally produces merge conflicts that require manual resolution.

**Integration point:** `pde:update` → `pde-sync-engine`

**Implementation sketch:**
- On install/update, generate `.planning/config/files-manifest.csv` with columns: `path, sha256, source (stock|user-modified), last_updated`
- During update: compare upstream hash vs. manifest hash vs. current file hash
- If manifest == current (user hasn't touched it): overwrite with upstream silently
- If manifest != current (user modified): preserve user version, emit conflict notice
- Eliminates need for three-way merge in most cases

**Estimated scope:** Small-medium — manifest generation is straightforward; integration with sync-engine requires refactoring the merge strategy

**Risk:** Low — strictly additive; fallback to existing merge if manifest is missing

---

#### 3. Unify Step — Plan-vs-Actual Reconciliation (from PAUL)

**Concept:** After execution completes, an explicit "unify" step compares what was planned against what actually happened (git diffs, file changes, test results). Logs deviations and decisions.

**Current PDE gap:** PDE has `pde-verifier` which checks goal achievement, but it doesn't systematically compare planned tasks vs. actual changes. Drift between plan and execution is detected only if the verifier's goal-backward analysis catches it.

**Integration point:** Between `pde-executor` completion and `pde-verifier` invocation

**Implementation sketch:**
- New step in `gsd:execute-phase`: after executor completes all tasks, run a lightweight reconciliation pass
- Compare PLAN.md task list against actual git commits
- For each task: was it completed? Were there unplanned changes? Were any planned tasks skipped?
- Output: `RECONCILIATION.md` alongside VERIFICATION.md
- Feed reconciliation findings into verifier as additional context

**Estimated scope:** Medium — new agent or workflow step; the git-diff-vs-plan comparison logic is the core work

**Risk:** Could feel bureaucratic for small phases; should auto-skip for phases with < 3 tasks

---

### Tier 2 — Medium Value, Moderate Complexity

#### 4. Sidecar Memory Per Agent Type (from BMAD)

**Concept:** Persistent memory directories per agent type that accumulate knowledge across sessions. Each sidecar has instructions, memories, and a journal.

**Current PDE gap:** All PDE subagents are ephemeral. The debugger forgets what it investigated last session. The executor has no memory of past execution patterns for this project.

**Integration point:** `.planning/agent-memory/{agent-type}/`

**Implementation sketch:**
- Directory structure: `.planning/agent-memory/pde-executor/memories.md`, `.planning/agent-memory/pde-debugger/memories.md`, etc.
- At agent spawn, include relevant sidecar as additional context
- At agent completion, append key findings/decisions to the sidecar
- Sidecars are project-scoped (not global) — each project's agents learn independently
- Prune strategy: cap at 50 entries; oldest entries archived when limit reached

**Candidate agents for sidecars:**
- `pde-debugger` — remembers past bug patterns, common failure modes
- `pde-executor` — remembers project-specific build quirks, test flakiness
- `pde-verifier` — remembers what verification strategies work for this codebase
- `pde-planner` — remembers planning decisions that were later revised

**Estimated scope:** Medium — requires changes to agent spawning logic + post-completion hooks

**Risk:** Stale sidecar entries could mislead agents; needs a freshness mechanism (e.g., entries older than N phases get demoted)

---

#### 5. HALT-Enforced Checkpoints for High-Risk Phases (from BMAD)

**Concept:** Mandatory human-approval gates at critical execution points. The system cannot proceed without explicit user confirmation.

**Current PDE gap:** PDE's executor has advisory checkpoints. For most phases this is fine, but high-risk operations (database migrations, security changes, destructive refactors) should require explicit approval.

**Integration point:** `pde-executor` checkpoint handling + `pde-planner` task metadata

**Implementation sketch:**
- Planner can tag tasks with `risk: high` in plan output
- Executor pauses before and after high-risk tasks, presenting a summary and waiting for user confirmation
- Risk tagging criteria: tasks touching auth, database schemas, payment logic, destructive file operations, CI/CD config
- Auto-detected via file path patterns (e.g., `**/migrations/**`, `**/auth/**`, `**/.github/**`)

**Estimated scope:** Small-medium — risk tagging in planner + conditional pause in executor

**Risk:** Over-tagging creates approval fatigue; under-tagging defeats the purpose. Needs careful calibration of risk heuristics.

---

#### 6. Project Context Constitution (from BMAD)

**Concept:** A single `project-context.md` file that serves as the constitutional source of truth for all implementation agents. Contains tech stack, conventions, key constraints, and architectural decisions.

**Current PDE gap:** PDE has PROJECT.md (high-level), CLAUDE.md (user instructions), and various phase artifacts. There's no single, agent-optimized context document that every executor/planner/verifier loads.

**Integration point:** `.planning/project-context.md` — generated/updated by `gsd:new-project` and `pde-planner`

**Implementation sketch:**
- Auto-generated from PROJECT.md + REQUIREMENTS.md + key decisions from STATE.md
- Optimized for agent consumption: structured sections (Tech Stack, Conventions, Constraints, Key Decisions, File Structure Map)
- Max 4KB — enforced limit to prevent context bloat
- Updated automatically when new decisions are logged in STATE.md
- Every subagent receives this as baseline context

**Estimated scope:** Small — mostly a generation script + inclusion in agent spawn prompts

**Risk:** Low — strictly additive. Risk of staleness if update automation fails.

---

### Tier 3 — Lower Priority, Exploratory

#### 7. Acceptance-Criteria-First Planning (from PAUL)

**Concept:** Make acceptance criteria the primary contract that flows from discussion through planning to execution to verification. Every task starts with ACs; execution is measured against them.

**Current PDE gap:** PDE has success criteria in roadmaps and UAT in verification, but ACs don't flow as first-class objects through the entire pipeline. Planner tasks describe *what to do*, not *what done looks like*.

**Integration point:** `pde-planner` output format + `pde-verifier` input

**Estimated scope:** Medium — changes planner output schema, executor reporting, and verifier input expectations

---

#### 8. Context Rot Metrics (from BMAD + PAUL)

**Concept:** Measure and report signal-to-noise ratio degradation during long execution sessions. BMAD claims 85%+ signal maintained after 50 turns; PAUL combats "context rot" explicitly.

**Current PDE gap:** PDE has no observability into context health during execution. Long phases may silently degrade.

**Integration point:** `pde-executor` telemetry + `gsd:stats`

**Estimated scope:** Exploratory — needs definition of what "context health" means in measurable terms

---

#### 9. Party Mode — Multi-Perspective Discussion (from BMAD)

**Concept:** Load multiple agent personas into a single session to simulate team discussion (architect + PM + QA perspectives simultaneously).

**Current PDE gap:** `pde:discuss-phase` uses a single questioning agent. Could benefit from multiple perspectives during phase scoping.

**Integration point:** `pde:discuss-phase` → parallel perspective agents

**Estimated scope:** Medium-large — requires rethinking discuss-phase from single-agent to multi-agent

---

#### 10. Just-in-Time Rule Unloading (from PAUL/CARL)

**Concept:** CARL not only loads rules when relevant but also *unloads* them when no longer applicable, keeping active context lean.

**Current PDE gap:** PDE's skill injection deduplicates (inject once per session) but never removes stale context. Over a long session, accumulated skill injections consume context budget.

**Integration point:** Skill injection hook system

**Estimated scope:** Large — requires session-aware context lifecycle management in the hook system

---

## Comparison Matrix

| Capability | PDE Current | BMAD Approach | PAUL Approach | Recommendation |
|-----------|-------------|---------------|---------------|----------------|
| Planning granularity | Phase → Plan → Tasks | Phase → Stories (atomic files) | Plan with ACs | Adopt story-file sharding |
| Execution model | Autonomous subagents | Human-sequential with HALT | Human-sequential with Unify | Keep autonomous; add optional HALT for high-risk |
| State persistence | STATE.md + git | Sidecar + frontmatter + hash manifest | Workflow state | Add hash manifest + optional sidecars |
| Context management | Skill injection + dedup | Story sharding + JIT loading | CARL rule loading/unloading | Adopt sharding; explore unloading |
| Verification | Goal-backward + Nyquist | QA agent per story | Unify (plan vs. actual) | Add reconciliation step before verifier |
| Cross-session memory | File-based auto-memory | Agent sidecars | Session-scoped only | Add project-scoped agent sidecars |
| IDE support | Claude Code only | 15+ IDEs | Claude Code only | Not a priority for PDE |
| Update safety | Three-way merge | Hash manifest | N/A | Adopt hash manifest |

---

## Milestone Scoping Recommendation

A future milestone ("Workflow Maturity" or "Context Engineering") could bundle Tier 1 + select Tier 2 items:

**Minimum viable milestone (4-5 phases):**
1. Story-file sharding for executor (#1)
2. File-hash manifest for updates (#2)
3. Unify/reconciliation step (#3)
4. Project context constitution (#6)
5. Pressure test + validation

**Extended milestone (add 2-3 phases):**
6. Agent sidecar memory (#4)
7. HALT checkpoints for high-risk tasks (#5)
8. AC-first planning (#7)

**Deferred to later milestone:**
- Party mode (#9)
- Context rot metrics (#8)
- Rule unloading (#10)
