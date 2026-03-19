# Pitfalls Research

**Domain:** Importing BMAD + PAUL methodology patterns into PDE — an existing agentic workflow platform (v0.6)
**Researched:** 2026-03-19
**Confidence:** HIGH (grounded in direct PDE codebase inspection of 145,000+ LOC, verified BMAD official docs, PAUL repository source analysis, and first-principles reasoning about agentic architecture conflicts)

---

## Critical Pitfalls

### Pitfall 1: Agent Role Namespace Collision

**What goes wrong:**
BMAD defines roles named Analyst, Product Manager, Architect, Scrum Master, Product Owner, Developer, and QA. PDE already has agents named pde-quality-auditor, pde-skill-builder, pde-skill-improver, pde-skill-validator, pde-design-quality-evaluator, and pde-pressure-test-evaluator. When BMAD roles are imported with names like "analyst" or "architect," there is no collision in filenames — but there IS a semantic collision. The BMAD Analyst performs market/competitive research on products. PDE already has `/pde:competitive`, `/pde:opportunity`, and `/pde:recommend` that do the same thing. The BMAD Architect produces architecture documents. PDE already has a planning system (ROADMAP.md, PLAN.md, phase directories) that serves this function. If both live in the same system without a clear boundary, agents — and users — will not know which to invoke.

**Why it happens:**
BMAD and PAUL are full-stack methodology systems. They were each designed to own the entire workflow from scratch. Importing them into a system that already has workflow coverage means there will be conceptual overlap by design. The temptation is to import everything and rationalize it later. This results in two systems answering the same questions differently.

**How to avoid:**
Before importing any BMAD/PAUL role, map it against PDE's existing capabilities. For each BMAD/PAUL agent: identify the PDE skill or workflow that already covers that function, define explicitly what gap (if any) the BMAD/PAUL agent fills that PDE does not, and only import the delta — the capability PDE is missing. The BMAD Analyst's market research function is already covered by `/pde:competitive` and `/pde:opportunity`. Import only what those skills genuinely lack (BMAD's structured PRD output format, for instance) as enhancements to existing PDE skills, not as a separate agent.

**Warning signs:**
- Two agents in the system that have overlapping stated purposes (e.g., "analyze requirements" appears in both a BMAD Analyst and a PDE skill)
- Users are uncertain whether to run `/pde:brief` or invoke the BMAD PM agent for the same task
- A new BMAD-derived agent file exists alongside a PDE workflow that already covers 80% of the same ground

**Phase to address:** Phase 1 (Role Mapping and Boundary Definition) — this must be resolved before any agent files are created. A decision table mapping every BMAD/PAUL role to its PDE equivalent (or gap) must exist before implementation begins.

---

### Pitfall 2: Dual State Management — `.paul/` vs `.planning/`

**What goes wrong:**
PAUL manages state through a `.paul/` directory with its own STATE.md, PROJECT.md, ROADMAP.md, and phases subdirectory. PDE manages state through a `.planning/` directory with STATE.md, PROJECT.md, ROADMAP.md, and phases. These are structurally identical but semantically distinct. If PAUL patterns are imported naively, the system ends up with two state directories with overlapping file names (both have STATE.md and ROADMAP.md) that diverge over time. Worse: PAUL's PLAN-APPLY-UNIFY loop updates PAUL's STATE.md as the authoritative loop tracker. PDE's autonomous workflow reads PDE's STATE.md as the authoritative phase tracker. Neither reads the other's state. Phase completion recorded in `.planning/STATE.md` is invisible to any PAUL-derived workflow, and vice versa.

**Why it happens:**
PAUL was designed as a standalone system that owns its state. Importing its patterns means importing its state model, which directly conflicts with PDE's existing state model. The path of least resistance is to let PAUL create its `.paul/` directory and let PDE keep its `.planning/` directory — they coexist without merging, but they also diverge without reconciliation.

**How to avoid:**
Do not import PAUL's state management structure. PDE's `.planning/` directory IS the canonical state store for PDE, and this must not change. Extract PAUL's workflow discipline (Plan-Apply-Unify loop integrity, acceptance-criteria-first task definition, closure enforcement) as patterns to apply WITHIN PDE's existing state model. PAUL's PLAN.md format maps to PDE's `*-PLAN.md` files in `.planning/phases/`. PAUL's UNIFY discipline maps to PDE's `*-SUMMARY.md` requirement. The loop can be enforced by PDE's tooling without creating a second state directory.

**Warning signs:**
- A `.paul/` directory exists alongside `.planning/` in the project root
- Two files named STATE.md or ROADMAP.md exist in the project (even in different directories)
- A PAUL-derived workflow reads from `.paul/STATE.md` instead of `.planning/STATE.md`

**Phase to address:** Phase 1 (Architecture Boundary Definition) — the single-state-store decision must be made first. All subsequent phases inherit from it. Any PAUL pattern that requires its own state directory must be rejected or adapted to PDE's `.planning/` structure.

---

### Pitfall 3: Document Sharding Conflicts with PDE's Artifact Registry

**What goes wrong:**
BMAD's core innovation is "document sharding" — breaking large PRDs and architecture documents into atomic, AI-digestible chunks to prevent context overload. BMAD shards its documents into focused files that each agent loads independently. PDE has its own artifact management: design-manifest.json tracks 13 coverage flags, `.planning/design/` holds structured artifacts by stage, and `*-PLAN.md` files are written with wave-based parallelization in mind. If BMAD sharding is imported without adaptation, there will be two competing artifact formats: BMAD's sharded PRD chunks and PDE's phase-plan files. An agent running PDE's execute-phase workflow will not know to look for BMAD shards. An agent running BMAD's document workflow will not update PDE's design-manifest.json coverage flags.

**Why it happens:**
BMAD's sharding is a concrete implementation pattern, not just a principle. Importing it means importing its file structure and naming conventions. When these conventions are applied on top of PDE's existing conventions, the output is hybrid artifacts that fit neither system.

**How to avoid:**
Import the sharding PRINCIPLE (keep context chunks focused and below AI-digestible size), not the sharding FILE FORMAT. PDE's existing wave-based parallel plan execution already implements sharding discipline: each `*-PLAN.md` is scoped to a specific, bounded task. Enhance PDE's plan templates to enforce BMAD-level context focus (explicit acceptance criteria, file-level specificity, bounded context references) without introducing BMAD's artifact naming conventions. If any BMAD document format is genuinely superior to PDE's equivalent, replace PDE's format — do not run both in parallel.

**Warning signs:**
- BMAD-formatted files (e.g., `prd-shard-01.md`, `architecture-shard-02.md`) appear in `.planning/` alongside PDE-formatted `*-PLAN.md` files
- PDE's design-manifest.json coverage flags are not updated after a BMAD-methodology phase completes
- The pde-tools.cjs CLI does not recognize BMAD-generated artifacts when running `roadmap analyze` or `design coverage-check`

**Phase to address:** Phase 2 (Artifact Format Integration) — a canonical artifact format decision must be made per artifact type before any phase produces documents. Running BMAD-format and PDE-format artifacts in the same directory will cause the validation infrastructure to break.

---

### Pitfall 4: Methodology Bloat — Importing Everything, Using Nothing

**What goes wrong:**
BMAD has 12+ agent roles and a multi-phase lifecycle. PAUL has 5 core commands and a loop model. Both have extensive documentation and templates. The temptation when importing methodologies is to be comprehensive — import all the roles, all the templates, all the reference documents, to "have them available if needed." The result is a PDE installation with 12 BMAD agent files, 5 PAUL command files, and 40+ new template files, of which 3-4 are actually used. The unused files bloat the codebase (PDE is already 145,000 LOC), confuse users who see unfamiliar commands, and create a maintenance burden — every time PDE's skill-style-guide changes, all 12 BMAD agent files need updating too.

**Why it happens:**
"Import everything" feels safer than "import selectively" — if you miss something needed later, you have to do it again. Selective import requires making hard decisions about what PDE actually needs from BMAD/PAUL vs. what it already covers. Those decisions require analytical discipline that is easier to skip.

**How to avoid:**
Define the specific capability gaps in PDE that BMAD/PAUL closes. PDE already has: competitive analysis, opportunity scoring, ideation, briefing, planning (ROADMAP/phases), execution (execute-phase/execute-plan), verification, and autonomous mode. From BMAD, what is genuinely missing: structured business requirements format (PRD discipline), epic/story decomposition for developer handoff. From PAUL, what is genuinely missing: explicit loop closure enforcement (UNIFY step), acceptance-criteria-first task definition, boundary constraint documentation. Import ONLY those gaps. Every BMAD/PAUL element proposed for import must answer: "What does PDE not do today that this provides?"

**Warning signs:**
- More than 5 new agent files are being created for the v0.6 milestone
- New template files are added with no corresponding workflow that uses them
- BMAD or PAUL documentation files are imported wholesale rather than selectively adapted
- The number of `/pde:` commands grows by more than 6 in this milestone

**Phase to address:** Phase 1 (Capability Gap Analysis) — before any implementation, produce an explicit gap table: PDE capability X covers BMAD/PAUL concept Y, import is not needed; BMAD/PAUL concept Z has no PDE equivalent, import is justified. Reject any import without a clear gap justification.

---

### Pitfall 5: PAUL's UNIFY Step Has No File-Based Equivalent in PDE

**What goes wrong:**
PAUL's Plan-Apply-Unify loop requires that every plan close with a UNIFY step: reconcile planned vs. actual work, log decisions, update state. In PAUL's model, a plan without UNIFY is an orphan. PDE has SUMMARY.md files that serve a similar purpose, but SUMMARY.md is not enforced as a closure gate — a phase can be marked complete by `pde-tools.cjs` without a SUMMARY.md existing. If PAUL's UNIFY discipline is imported superficially (add a note to write SUMMARY.md), it will be skipped the same way SUMMARY.md is currently skipped. If PAUL's UNIFY is enforced as a hard gate, it may break PDE's existing `pde-tools.cjs` phase-completion logic which does not currently check for SUMMARY.md before allowing phase progression.

**Why it happens:**
PDE was designed for speed (yolo mode, parallelization, auto-chain). The UNIFY discipline requires intentional closure — a step that slows down execution in exchange for state hygiene. These goals are in tension. PAUL solves the tension by making UNIFY mandatory. PDE solves the tension by making it optional (you can advance without SUMMARY.md). Adopting PAUL's approach means changing PDE's execution gate, which touches `pde-tools.cjs`, the execute-phase workflow, the autonomous workflow, and the roadmap analyze command.

**How to avoid:**
Decide explicitly whether PDE v0.6 will adopt hard UNIFY enforcement. If yes: update `pde-tools.cjs` phase completion logic to gate on SUMMARY.md existence before marking a phase done, and update the verification-report template to include a UNIFY reconciliation section. If no: adopt PAUL's UNIFY discipline as a soft recommendation in the phase-prompt template without changing gate logic. Do not adopt UNIFY as a halfway measure where it is documented but not enforced — that produces the worst outcome (documentation overhead, no behavioral change).

**Warning signs:**
- PAUL's loop closure is described in reference documentation but not enforced by pde-tools.cjs
- SUMMARY.md files are still being skipped in completed phases after the v0.6 milestone ships
- New phase templates include a UNIFY section that the autonomous workflow does not wait for

**Phase to address:** Phase 3 (Loop Enforcement Integration) — if UNIFY enforcement is adopted, it requires changes to pde-tools.cjs and the execute-phase workflow before any other PAUL patterns are implemented. The gating logic change is a prerequisite for all loop-dependent features.

---

### Pitfall 6: BMAD's Scrum Master / Story Pattern Duplicates PDE's Plan-Phase Workflow

**What goes wrong:**
BMAD's Scrum Master agent produces "hyper-detailed development stories" for the Developer agent — stories that contain full context, implementation details, and architectural guidance. PDE's `plan-phase` workflow produces `*-PLAN.md` files with objectives, success criteria, file targets, and wave groupings for parallel execution. These serve functionally identical purposes. If both exist in the system, the question becomes: do developers use BMAD stories or PDE plans? If both are generated, they can diverge. If BMAD stories are written and PDE plans are not, the execute-phase workflow breaks (it reads `*-PLAN.md` files to discover tasks). If PDE plans are written and BMAD stories are not, the BMAD methodology value is not realized.

**Why it happens:**
Both systems solve the "break large requirements into agent-executable tasks" problem with different file formats and naming conventions. Importing BMAD's Scrum Master pattern without retiring PDE's plan-phase creates duplication. Retiring PDE's plan-phase to use BMAD stories requires rewriting pde-tools.cjs, execute-phase, and autonomous.

**How to avoid:**
Do not import the BMAD Scrum Master as a separate agent. Instead, identify the specific improvements BMAD stories offer over PDE plans (richer context embedding, explicit acceptance criteria per story, architectural guidance inline) and incorporate those as enhancements to PDE's `*-PLAN.md` template. The plan-phase workflow produces the output; the template governs the quality of that output. Upgrading the template with BMAD-quality story discipline costs one template change, not a system architecture change.

**Warning signs:**
- A BMAD story file exists for the same phase as a PDE `*-PLAN.md` file
- The execute-phase workflow is modified to read BMAD story files instead of `*-PLAN.md` files
- The pde:plan-phase command is deprecated in favor of a new BMAD-derived command

**Phase to address:** Phase 2 (Plan Template Enhancement) — upgrade `templates/phase-prompt.md` with BMAD story quality disciplines (explicit AC, context embedding, boundary constraints) without changing the file format or the tooling that reads it.

---

### Pitfall 7: Context Window Explosion from Methodology Documentation Loading

**What goes wrong:**
BMAD requires agents to load architecture documents, PRD shards, technical preferences, and story context before executing tasks. PAUL requires agents to load STATE.md, PROJECT.md, prior CONTEXT.md files, and the current PLAN.md before beginning work. PDE already loads STATE.md, the phase's CONTEXT.md, ROADMAP.md, and task-specific plans. If BMAD/PAUL methodology imports add additional required reading to every agent invocation, context window consumption increases significantly. PDE's execute-plan subagents are specifically designed to receive only the context they need (load paths from pde-tools.cjs init, not full files). Adding BMAD/PAUL methodology docs to subagent required reading destroys this lean context model.

**Why it happens:**
Methodology systems are designed for comprehensive context delivery — their agents work better with more context. PDE is designed for context efficiency — its agents work better with less context (per PROJECT.md: "MCP tool passthrough to all subagents destroys 85% context savings from Tool Search"). Importing methodology agents without adapting their required-reading lists means importing their context-heavy execution model.

**How to avoid:**
Every agent or workflow imported from BMAD/PAUL must have its required-reading list audited and reduced to PDE's minimum-necessary-context standard. Methodology documents that are needed at planning time (when a human is reviewing) are not needed at execution time (when an agent is implementing). Reference documents belong in the references/ directory with tier annotations (essentials/extended/specialist) — they are loaded on demand, not by default. Never add a methodology reference document to an agent's hardcoded required_reading unless it is needed for every invocation of that agent.

**Warning signs:**
- Imported agent files have more than 5 items in their required_reading section
- BMAD methodology documents are loaded by default in execute-plan subagents
- Context usage per phase execution increases by more than 30% after importing BMAD/PAUL patterns
- The pde-tools.cjs init response grows beyond its current size due to new methodology fields

**Phase to address:** Phase 4 (Context Optimization Review) — after importing methodology patterns, run a context audit pass. Measure token consumption before and after for a representative pipeline run and cut anything that increased consumption without measurable quality improvement.

---

### Pitfall 8: Skill Validation Infrastructure Rejects Imported Agent Files

**What goes wrong:**
PDE has a strict lint/validation system for skill files (LINT-001 through LINT-042 in tooling-patterns.md). Every skill file must have `<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, and `<process>` sections. Agent files in `agents/` must have a Constraints section and a Return Format section. BMAD and PAUL agent files follow their own format conventions — they will fail PDE's lint rules immediately. If imported agent files are not converted to PDE's format, the pde-quality-auditor will flag them as HIGH severity findings, the pressure-test will fail, and the skill-builder will refuse to improve them (it requires PDE format compliance as a gate).

**Why it happens:**
BMAD and PAUL agents are designed for their own frameworks. They use different XML/markdown conventions, different section names, and different structural patterns. Converting them to PDE format is not glamorous work, so it tends to be deferred. Deferred conversion means the validation infrastructure reports failures that are not real defects, which trains the team to ignore validation output.

**How to avoid:**
No BMAD/PAUL agent file may be merged into the PDE repository without passing PDE's lint rules. This is a non-negotiable gate. The conversion from BMAD/PAUL format to PDE format must be part of the import work for each agent, not a separate cleanup task. The pde-skill-builder should be used to validate and improve each imported agent before it is committed. If an imported agent's functionality can be expressed as an enhancement to an existing PDE workflow rather than a new agent file, prefer the enhancement — it avoids the conversion burden entirely.

**Warning signs:**
- Imported agent files exist in `agents/` that were not processed through pde-skill-builder validation
- pde-quality-auditor reports HIGH findings on imported agent files
- A `// TODO: convert to PDE format` comment exists in any imported file
- The pressure-test score drops after importing BMAD/PAUL agents

**Phase to address:** Every import phase — lint compliance is a gate on each file merge, not a final cleanup step. Do not allow "we'll fix the lint later" to become a pattern.

---

### Pitfall 9: BMAD's Epic/Story Hierarchy Conflicts with PDE's Milestone/Phase Hierarchy

**What goes wrong:**
BMAD organizes work as: Project → Epic → Story → Task. PDE organizes work as: Milestone → Phase → Plan → Step. These hierarchies are structurally similar but semantically different. A BMAD Epic roughly maps to a PDE Phase. A BMAD Story roughly maps to a PDE Plan. If BMAD terminology is imported alongside PDE terminology, users and agents will use the terms interchangeably and inconsistently. An agent told to "create epics for this milestone" will produce BMAD-format epic files in `.planning/`. An agent told to "create phases for this milestone" will produce PDE-format CONTEXT.md/PLAN.md pairs. Both exist, neither is authoritative. The pde-tools.cjs roadmap analyzer cannot parse BMAD epic files, so the autonomous workflow cannot discover them as work items.

**Why it happens:**
Terminology from both systems gets imported alongside the functionality. When documentation describes the imported feature using BMAD terminology, it implicitly endorses the BMAD hierarchy. Over time, hybrid language creates conceptual debt where no one is sure which hierarchy governs.

**How to avoid:**
Import BMAD/PAUL concepts using PDE's existing terminology. A BMAD Epic is a PDE Phase. A BMAD Story is a PDE Plan. A PAUL PLAN is a PDE PLAN.md. A PAUL UNIFY is a PDE SUMMARY.md. In all PDE documentation, workflow files, and agent prompts, use PDE's terms only. If there is genuinely no PDE equivalent for a BMAD/PAUL concept, coin a new PDE-namespaced term — do not use BMAD/PAUL's term as-is.

**Warning signs:**
- PDE documentation uses the words "epic," "story," or "sprint" alongside "phase," "plan," and "milestone"
- A new file type (e.g., `*-EPIC.md` or `*-STORY.md`) appears in `.planning/phases/`
- The pde-tools.cjs roadmap analyzer is being modified to parse BMAD epic files
- Users are asking whether to use `/pde:plan-phase` or the BMAD Scrum Master for the same task

**Phase to address:** Phase 1 (Terminology Governance) — establish a canonical PDE-to-BMAD/PAUL glossary mapping before any documentation is written. All milestone documentation for v0.6 must use PDE terms exclusively.

---

### Pitfall 10: Partial Methodology Import Creates an Inconsistent User Mental Model

**What goes wrong:**
v0.6 imports BMAD's business analysis discipline (structured PRD format, structured architecture documents) and PAUL's loop discipline (Plan-Apply-Unify closure). But it does not import BMAD's full agent team (no separate PM, Architect, or Scrum Master agents) and does not import PAUL's CARL dynamic context injection. Users who read BMAD or PAUL documentation to understand how PDE works will find partial, inconsistent coverage. Users who already use BMAD will expect BMAD's full workflow; finding only parts of it will confuse them. Users who do not know BMAD will encounter unfamiliar discipline names ("PRD," "acceptance criteria") without understanding why they exist.

**Why it happens:**
Selective import is inherently partial. The more a user knows about BMAD/PAUL, the more the partial import will feel wrong. The less they know, the more unexplained concepts they will encounter.

**How to avoid:**
Treat the methodology import as a PDE feature, not a "here's BMAD inside PDE." In all user-facing documentation, describe what PDE now does differently — not what methodology it borrowed from. "PDE now requires explicit acceptance criteria for each plan" is a user-facing behavior statement. "PDE now uses BMAD's story format" is an implementation detail that does not help users. The methodology source is an implementation detail; the user-facing capability is what matters. Internal implementation notes can reference BMAD/PAUL for developer context, but user guides must speak PDE.

**Warning signs:**
- The v0.6 GETTING-STARTED.md or README.md requires users to understand BMAD or PAUL to use new features
- New `/pde:` commands are named after BMAD/PAUL concepts instead of the PDE capability they provide
- A user asks "do I need to read the BMAD documentation to use PDE?" and the answer is yes

**Phase to address:** Phase 5 (User-Facing Documentation) — all user documentation must describe PDE behavior, not methodology provenance. A final documentation pass reviewing every new user-visible element for BMAD/PAUL terminology leakage should gate the milestone release.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Import BMAD agent files without converting to PDE format | Skip conversion work | Lint failures forever; quality auditor reports false positives; skill-builder refuses to process them | Never — format compliance is a gate |
| Allow `.paul/` directory alongside `.planning/` | Zero migration work | Two STATE.md files diverge; tooling reads the wrong one; users confused about authoritative state | Never — single state directory is non-negotiable |
| Import all 12 BMAD agent roles "for completeness" | Nothing missing later | Codebase bloat; maintenance burden multiplies; users confused by 12 new agent choices | Never — selective import only, with gap justification |
| Use BMAD/PAUL terminology in user-facing docs | Accurate attribution | Users need to read BMAD/PAUL docs to use PDE; external dependency on another system's documentation | Never in user-facing docs; acceptable in internal implementation comments |
| Import BMAD sharding as a new file format alongside PDE plans | Preserve BMAD format fidelity | pde-tools.cjs cannot parse shards; design-manifest.json coverage flags not updated; autonomous workflow breaks | Never — adapt to PDE format or don't import |
| Skip UNIFY enforcement because it slows down yolo mode | Keep fast execution speed | PAUL discipline is documentation-only with no behavioral impact; loop hygiene degrades | Acceptable at MVP if explicitly documented as "soft recommendation, not gated"; review in v0.7 |
| Keep BMAD business analysis as a separate command rather than integrating into existing brief/ideate | Faster to ship; isolated | Users must choose between old and new approach for same task; fragmentation grows | Acceptable for v0.6 only if old command is explicitly deprecated in same milestone |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| BMAD Analyst import | Importing as a new agent that runs alongside `/pde:competitive` and `/pde:opportunity` | Map BMAD Analyst outputs to enhancements of existing competitive/opportunity workflows |
| BMAD Architect import | Creating a new "architect" agent that conflicts with PDE's planning phase workflow | Extract BMAD architecture document format as an enhancement to PDE's ROADMAP.md template |
| PAUL STATE.md import | Letting PAUL create `.paul/STATE.md` to track loop position | Extend PDE's `.planning/STATE.md` schema with a `loop_state` field; PAUL-derived logic reads PDE's state |
| PAUL PLAN.md format | Importing PAUL's `<objective>`, `<acceptance_criteria>`, `<tasks>`, `<boundaries>` XML tags as a new file format | Merge PAUL's structural requirements into PDE's existing `*-PLAN.md` template sections |
| BMAD document sharding | Creating BMAD-style shard files with numbered suffixes | Apply sharding discipline at PDE plan authoring time; each `*-PLAN.md` IS a shard by design |
| PAUL CARL integration | Importing CARL as a companion system that injects rules dynamically | PDE's `@` reference loading in required_reading already handles just-in-time context loading |
| BMAD technical preferences | Importing `technical-preferences.md` as a persistent agent behavior modifier | PDE's `references/` directory already serves this function; merge BMAD preferences into existing references |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Methodology agents loading full BMAD knowledge base per invocation | Slow subagent start; context budget exhausted before implementation begins | Audit required_reading per agent; cut to minimum-necessary | Any agent with more than 3 reference files in required_reading |
| BMAD PRD format producing multi-thousand-line documents | Context window exceeds capacity for downstream agents reading the PRD | Enforce 500-line max per artifact; use PDE's phase decomposition to keep scope bounded | Any PRD that covers more than one PDE phase worth of work |
| PAUL loop enforcement checking all prior CONTEXT.md files before each phase | O(n) context load grows with milestone length | Only load CONTEXT.md files from directly preceding phases (2-3 max); not all phases | Milestones with more than 8 phases (current max is 12) |
| Importing BMAD story generation as a step that runs before PDE plan-phase | Double the plan generation time per phase | Replace PDE plan-phase with enhanced version; don't run both | Any phase where both BMAD story generation and PDE plan-phase are in the workflow |

---

## "Looks Done But Isn't" Checklist

- [ ] **Role boundary definition:** Every imported BMAD/PAUL role has a documented gap justification explaining what PDE did NOT already cover — verify by checking the gap table in Phase 1 artifacts
- [ ] **Single state directory:** No `.paul/` directory exists in any PDE project after v0.6 — verify by checking project root for unexpected directories
- [ ] **Lint compliance:** Every imported or new agent file passes PDE lint rules (LINT-001 through LINT-042) — verify by running pde:test --lint against agents/ directory
- [ ] **Terminology clean:** User-facing documentation contains no occurrences of "epic," "story," "sprint," "scrum," "BMAD," or "PAUL" as user-visible concepts — verify by grepping GETTING-STARTED.md, README.md, and new skill help text
- [ ] **Tooling compatibility:** pde-tools.cjs roadmap analyze still produces valid JSON after v0.6 — verify by running a full pde:autonomous dry-run against a test project
- [ ] **Coverage flag integrity:** design-manifest.json coverage flags are still correctly updated by the 13 design pipeline skills after v0.6 changes — verify by running pde:build --dry-run
- [ ] **Context budget:** A representative execute-plan subagent invocation uses no more context than pre-v0.6 baseline — verify by comparing token consumption before and after
- [ ] **Quality auditor score:** pde-quality-auditor overall_health_pct is equal to or higher than the v0.5 baseline after importing BMAD/PAUL agents — verify by running pde:audit-milestone

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Agent role namespace collision discovered post-merge | MEDIUM | Audit all imports against gap table; remove or merge any agent that duplicates existing PDE capability; update user documentation |
| Dual state directory (`.paul/` created) | LOW | Delete `.paul/`; migrate any PAUL state fields to `.planning/STATE.md` schema extension; update any PAUL-derived workflows to read from `.planning/` |
| Methodology bloat — too many unused agents/templates | MEDIUM | Run usage audit (grep all agent file names across workflows/commands); archive any file with zero references; update skill-registry.md |
| BMAD document format bypassing pde-tools.cjs | HIGH | Rewrite affected documents in PDE format; update pde-tools.cjs if new artifact type is genuinely needed; re-run validation tests |
| PAUL UNIFY adopted as hard gate, breaking existing workflows | MEDIUM | Rollback the pde-tools.cjs gate change; re-implement as soft recommendation; add SUMMARY.md generation to plan-phase template as a default step instead |
| Terminology leakage into user docs | LOW | Find-and-replace pass across user-facing documentation; establish a terminology linting step in CI |
| Lint compliance not enforced on imported agents | MEDIUM | Run pde:test --lint; fix each HIGH finding before next milestone; use pde-skill-builder to validate and improve imported agents |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Agent role namespace collision (Pitfall 1) | Phase 1: Role Mapping and Boundary Definition | Gap table exists; every imported agent has documented justification; no duplicate-purpose agents |
| Dual state management conflict (Pitfall 2) | Phase 1: Architecture Boundary Definition | Only `.planning/` exists; pde-tools.cjs reads all state correctly |
| Document sharding conflicts with artifact registry (Pitfall 3) | Phase 2: Artifact Format Integration | design-manifest.json coverage flags still update correctly; no BMAD-format files in `.planning/` |
| Methodology bloat (Pitfall 4) | Phase 1: Capability Gap Analysis | Fewer than 6 new agent/command files added; each has documented gap justification |
| PAUL UNIFY has no file-based enforcement (Pitfall 5) | Phase 3: Loop Enforcement Integration | Decision is explicit (hard gate or soft recommendation); if hard gate: pde-tools.cjs updated and tested |
| BMAD Scrum Master duplicates plan-phase (Pitfall 6) | Phase 2: Plan Template Enhancement | No separate Scrum Master agent; plan template upgraded with BMAD story quality |
| Context window explosion (Pitfall 7) | Phase 4: Context Optimization Review | Token consumption per execute-plan within 10% of pre-v0.6 baseline |
| Skill validation infrastructure rejects imported files (Pitfall 8) | Every import phase | pde:test --lint passes with zero HIGH findings on imported files |
| BMAD hierarchy conflicts with PDE hierarchy (Pitfall 9) | Phase 1: Terminology Governance | No epic/story/sprint terminology in PDE docs or workflow files |
| Partial import creates inconsistent user mental model (Pitfall 10) | Phase 5: User-Facing Documentation | User docs describe PDE behavior only; no methodology attribution required to use new features |

---

## Sources

- PDE codebase direct inspection (agents/, workflows/, commands/, references/, templates/, bin/) — HIGH confidence
- PAUL GitHub repository (ChristopherKahler/paul): STATE.md, PLAN.md structure, loop enforcement model — HIGH confidence
- BMAD official documentation (docs.bmad-method.org): agent roles, document sharding, YAML workflow structure — HIGH confidence
- BMAD-AT-CLAUDE repository (24601/BMAD-AT-CLAUDE/docs/core-architecture.md): agent communication patterns, file generation model — HIGH confidence
- PDE PROJECT.md v0.6 milestone context and constraints — HIGH confidence (primary source)
- PDE references/tooling-patterns.md LINT rules — HIGH confidence (direct codebase inspection)
- PDE workflows/autonomous.md, workflows/execute-phase.md, workflows/build.md — HIGH confidence (direct codebase inspection)
- PDE agents/pde-quality-auditor.md agent definition — HIGH confidence (direct codebase inspection)
- Memory: project_external_frameworks.md (BMAD + PAUL integration candidates) — HIGH confidence (user-provided context)

---

*Pitfalls research for: Importing BMAD + PAUL methodology patterns into PDE (v0.6 Advanced Workflow Methodology milestone)*
*Researched: 2026-03-19*
