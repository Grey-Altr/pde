# Pitfalls Research

**Domain:** Adding design pipeline (brief → flows → system → wireframe → critique → iterate → handoff) to an existing AI-assisted development tool (PDE v1.1)
**Researched:** 2026-03-15
**Confidence:** HIGH (findings grounded in direct PDE/GSD codebase inspection, LLM prompt engineering literature, and design-tools community post-mortems)

---

## Critical Pitfalls

### Pitfall 1: LLM Wireframe Output Has No Fidelity Contract

**What goes wrong:**
The LLM produces wireframes as HTML/CSS or ASCII-art markup that varies wildly in fidelity between invocations. One run produces a sparse skeleton; another produces a pixel-detailed mock that looks like a finished UI. Downstream commands (`/pde:critique`, `/pde:iterate`) are built against one fidelity assumption and break or produce irrelevant output when fidelity drifts. Users also interpret high-fidelity wireframe output as implementation intent, then are confused when the actual code differs.

**Why it happens:**
LLMs default to "impressive output" without a fidelity constraint. Without an explicit ceiling in the system prompt, the model renders whatever looks best in context. The developer tests once, gets consistent output, and ships — then real users discover variability.

**How to avoid:**
Define a fidelity enum (`skeleton | lo-fi | mid-fi`) and enforce it via the wireframe agent prompt with hard constraints per level (e.g., `skeleton`: no color, no images, layout only; `lo-fi`: grayscale, placeholder labels only; `mid-fi`: named colors, real labels, no images). The `/pde:wireframe` command must accept a fidelity argument and inject the corresponding constraint block into the agent prompt. Store the fidelity level in the artifact frontmatter so downstream commands can read and respect it.

**Warning signs:**
- Wireframe artifacts contain real image URLs, brand colors, or detailed typography — when those were not requested
- Two runs of `/pde:wireframe` on the same input produce structurally different output
- Downstream `/pde:critique` feedback references implementation details instead of layout decisions

**Phase to address:** Phase implementing `/pde:wireframe` — fidelity control must be built in from day one, not retrofitted. Retrofitting breaks artifact compatibility.

---

### Pitfall 2: Critique Is Generic Because the Agent Has No Design Brief in Context

**What goes wrong:**
`/pde:critique` produces feedback like "consider improving visual hierarchy" and "ensure adequate contrast" — textbook UX advice that applies to any interface. The critique is not wrong, but it has zero specificity to this product, these user flows, or these design decisions. The iterate step has nothing actionable to work with and either ignores the critique or makes arbitrary changes.

**Why it happens:**
The critique agent is spawned with only the wireframe artifact in context. Without the brief (user goals, product constraints, target persona) and the user flows (what tasks this screen supports), the LLM falls back to generic heuristic evaluation. It is evaluating a wireframe as a generic UI, not as a specific product decision.

**How to avoid:**
The critique agent must receive the full upstream context: `.planning/design/BRIEF.md`, `.planning/design/FLOWS.md`, and the specific wireframe being evaluated — in that order. Critique prompts must demand specificity: "For each issue, cite the user flow it breaks, the brief constraint it violates, or the usability principle with evidence from the wireframe." If brief or flows are missing, block critique and surface the dependency to the user rather than running a degraded pass.

**Warning signs:**
- Critique output contains no references to specific screens, labels, or user flow steps
- Every critique point could apply to any app in the same category
- The iterate command cannot be run because there are no actionable critique items

**Phase to address:** Phase implementing `/pde:critique` — requires upstream brief and flows artifacts to exist; build the dependency check before the LLM invocation.

---

### Pitfall 3: Design Token Format Is Invented Per-Run, Breaking Handoff Alignment

**What goes wrong:**
`/pde:system` outputs a design system document. The token naming, value format, and structure are whatever the LLM invents at the time (`--color-primary`, `color.primary`, `$primary`, `PRIMARY_COLOR` all occur in practice). Downstream wireframe agents reference the design system but use a different naming convention because they are working from a different context window. The handoff spec references token names that do not exist in the system doc. The developer implementing the code finds the spec useless.

**Why it happens:**
LLMs do not maintain state between invocations. Each agent gets a fresh context and invents locally consistent but globally inconsistent naming. No schema enforces a token format across all design pipeline stages.

**How to avoid:**
Define a canonical token format in a design system template (`templates/design/DESIGN-SYSTEM.md`) before any agent produces tokens. The template must specify: naming convention (e.g., CSS custom properties: `--[category]-[variant]`), required categories (color, spacing, typography, radius, shadow, z-index), and a machine-readable section (JSON or YAML block) that downstream agents read directly. Every subsequent agent (wireframe, critique, handoff) must be instructed to read the token table from the generated system doc before producing output.

**Warning signs:**
- Token names in wireframe artifacts use a different syntax than names in the design system doc
- Handoff spec contains token names not present in `.planning/design/DESIGN-SYSTEM.md`
- Two wireframe artifacts for the same product use different spacing units (px vs rem vs unitless)

**Phase to address:** Phase implementing `/pde:system` — the template is the contract; establish it before any downstream commands are built.

---

### Pitfall 4: Handoff Specs Are Written for a Generic Codebase, Not the Actual Project's Patterns

**What goes wrong:**
`/pde:handoff` produces component API specs using prop naming conventions, file structures, and state management patterns that do not match the actual codebase. The developer receiving the handoff must mentally translate every spec before writing a line of code. For a React/Tailwind project, the spec references SCSS variables and class-based components. For a Vue project, the spec assumes React hooks. The spec is accurate in isolation but useless in context.

**Why it happens:**
The handoff agent has no information about the actual tech stack the developer will implement against. The design pipeline stages run early (before code exists) so the agent cannot read the codebase. Without explicit injection, it defaults to whatever pattern is most common in its training data.

**How to avoid:**
`/pde:handoff` must read `.planning/research/STACK.md` (produced during `/pde:new-project`) before generating specs. The handoff agent prompt must include an explicit instruction: "Generate all component APIs using the exact conventions documented in the project's STACK.md — prop names, file naming, state patterns, and styling approach must match the established stack." If STACK.md does not exist, block and require the user to run `/pde:new-project` first or supply a stack doc manually.

**Warning signs:**
- Handoff spec uses component naming conventions inconsistent with the existing codebase
- TypeScript interfaces in the spec use patterns (class-based, namespace-qualified) not present in the project
- Developers report needing to "reinterpret" the handoff spec before implementing

**Phase to address:** Phase implementing `/pde:handoff` — STACK.md integration is a required input, not optional context.

---

### Pitfall 5: The Orchestrator (`/pde:build`) Becomes a God Workflow

**What goes wrong:**
The `/pde:build` orchestrator starts as a simple sequential runner: `brief → flows → system → wireframe → critique → iterate → handoff`. Over time it accumulates inline logic: fidelity negotiation, artifact existence checks, conditional skip logic, resume-from-checkpoint behavior, error recovery branches. Within a few iterations it is 300 lines of orchestration logic that is impossible to debug and cannot be modified without breaking edge cases. Adding a new step (e.g., inserting `hig` between `wireframe` and `critique`) requires rewriting the orchestrator.

**Why it happens:**
The convenience of a single workflow file makes it tempting to add "just one check" inline. Each addition is individually reasonable; the aggregate is a maintenance nightmare. This is identical to the anti-pattern that caused GSD to centralize all side effects in `pde-tools.cjs` — but applied to orchestration logic rather than file system operations.

**How to avoid:**
Apply PDE's existing Workflow-as-Orchestrator pattern (documented in ARCHITECTURE.md) strictly to `/pde:build`. The build orchestrator's only responsibilities: check which artifacts exist, determine next step, invoke the appropriate sub-command, check for errors, advance. All artifact-checking logic lives in `pde-tools.cjs design status`. All step-specific logic lives in the individual skill workflow files. The orchestrator is a loop over a stage list, not a case statement with embedded business logic.

**Warning signs:**
- `/pde:build` workflow file exceeds ~80 lines
- Fidelity negotiation or token validation logic appears inside the build workflow
- Adding a new pipeline stage requires editing the build orchestrator (instead of just the stage's own workflow file)

**Phase to address:** Phase implementing `/pde:build` — establish the delegation boundary in the first implementation. Do not refactor later; the stage-list pattern must be the initial design.

---

### Pitfall 6: Pipeline State Is Not Persisted, So Crashes Lose All Progress

**What goes wrong:**
A user runs `/pde:build` through brief, flows, system, wireframe, and partway through critique — then Claude Code crashes, the session times out, or the user closes the terminal. On restart, there is no way to know where the pipeline stopped. The user must restart from the beginning or manually inspect which artifacts exist and guess the next step. For a 7-stage pipeline this is a severe experience failure.

**Why it happens:**
The existing PDE state system tracks phases and plans, but the design pipeline is a new artifact category. Without a design pipeline state entry in `.planning/STATE.md` or a dedicated `.planning/design/PIPELINE-STATE.md`, there is no checkpoint record. Individual artifact files exist, but the pipeline does not know "critique was started but not completed."

**How to avoid:**
Add a `design_pipeline` section to PDE's state system (either in `.planning/STATE.md` frontmatter or a dedicated `.planning/design/STATE.md`). Track: current stage, stage status (not-started / in-progress / complete / skipped), and the artifact path for each stage. `pde-tools.cjs` must expose `design-state load` and `design-state update <stage> <status>` commands. Every design skill workflow must write its status at start AND at completion so partial progress is captured. `/pde:build` reads this state to determine resume point.

**Warning signs:**
- Running `/pde:build` after a crash starts over from the beginning instead of the last incomplete stage
- There is no machine-readable record of which design artifacts have been produced
- `/pde:build` does not output which stage it is resuming from on restart

**Phase to address:** Phase implementing state management for the design pipeline — this must precede or be built alongside the first skill workflow, not added later. Retrofitting state into an already-running pipeline is extremely disruptive.

---

### Pitfall 7: "This Is Not a Design Tool" Scope Creep

**What goes wrong:**
During implementation, features that feel natural to a design pipeline start appearing: real-time preview of wireframes in the terminal, Figma export, actual image generation, color palette pickers, icon library integration, animated transition specs. Each is individually defensible. Collectively they transform a lightweight LLM-text-based pipeline into a fragile, scope-bloated product that takes 10x longer to build and still does not equal a real design tool. The core pipeline — which was shipping-ready — is delayed six months.

**Why it happens:**
Design pipeline work is inherently adjacent to real design tools. The gap between "an LLM describing a wireframe in text" and "Figma" is obvious to anyone who uses both. The natural instinct is to close that gap. But PDE is a text-based, file-based, LLM-augmented tool — not a design tool. The value proposition is speed and integration with the development workflow, not design fidelity.

**How to avoid:**
Establish a hard scope boundary in every design pipeline phase plan: PDE produces text artifacts (Markdown, HTML/CSS snippets) that describe design intent. PDE does not produce visual files, does not integrate with design tools in v1.1, and does not replace Figma. When a feature request sounds like "PDE should do what Figma does," the answer is "that's for a future milestone or a Figma MCP integration." The brief's own out-of-scope list (already defined in PROJECT.md) must be copied into every design skill's implementation plan as a reminder.

**Warning signs:**
- A phase plan includes image generation, SVG export, or color swatch rendering
- A phase plan references Figma, Sketch, or any external design tool as a required output target
- Implementation time estimate for any single design skill exceeds 2-3 days

**Phase to address:** Every design pipeline phase — the scope boundary must be stated explicitly in each phase plan, not once in a requirements doc that implementors do not read.

---

### Pitfall 8: Design Artifacts Are Stored Outside the Established `.planning/` Pattern

**What goes wrong:**
Design artifacts get stored in a new top-level directory (e.g., `design/`, `wireframes/`, `.design/`) that is inconsistent with the existing `.planning/` convention. Downstream commands that scan for context (existing workflow commands that read `.planning/` files) do not find design artifacts. The `pde-tools.cjs` state system does not know about design artifacts. Verification (`/pde:health`) does not check for design artifact integrity. The design pipeline becomes a parallel, disconnected system instead of an integrated part of PDE.

**Why it happens:**
Design feels like a separate concern from planning. Implementors create a new directory without checking whether the existing `.planning/` structure can accommodate it. The path of least resistance is a new top-level dir.

**How to avoid:**
Store all design artifacts under `.planning/design/` — consistent with PROJECT.md's stated decision. Naming convention: `.planning/design/BRIEF.md`, `.planning/design/FLOWS.md`, `.planning/design/DESIGN-SYSTEM.md`, `.planning/design/wireframes/[screen-name].md`, `.planning/design/CRITIQUE.md`, `.planning/design/HANDOFF.md`. This keeps design artifacts inside the existing scanning and state management surface. Extend `pde-tools.cjs` to handle `design init`, `design status`, and `design list-artifacts` — do not invent a parallel tooling surface.

**Warning signs:**
- Phase plan creates any directory outside `.planning/`
- Design artifact paths are not parseable by existing `pde-tools.cjs` file operations
- `/pde:health` does not report on design artifact state

**Phase to address:** Phase implementing the first design skill (brief) — storage convention must be established on the first artifact, not refactored after seven artifacts exist in inconsistent locations.

---

### Pitfall 9: Iterate Has No Convergence Criterion, So the Loop Never Ends

**What goes wrong:**
`/pde:iterate` applies critique feedback and produces a revised wireframe. The user runs `/pde:critique` again. The new critique produces new issues. The user runs `/pde:iterate` again. This continues indefinitely — each iteration genuinely improves something but introduces or reveals new issues. The user never knows when to move to handoff. The design pipeline stalls in an infinite refine loop.

**Why it happens:**
LLM-based critique will always find something to improve. Without a convergence signal, the natural endpoint of critique → iterate cycles is "when the user gets frustrated and stops." This is a UX failure, not a user failure.

**How to avoid:**
`/pde:iterate` must track iteration count and write it to design state. After each iterate run, the workflow must surface a convergence checklist: (1) are all P0/P1 critique issues addressed? (2) is this the third or more iteration? (3) are remaining issues cosmetic vs. structural? If all three are true, output an explicit "Design ready for handoff" recommendation. The command should not prevent further iteration but must actively signal convergence instead of implying infinite refinement is expected.

**Warning signs:**
- Users report running critique → iterate more than 3 times without progress signal
- Iteration artifacts have no version numbering (can't tell which is current)
- Handoff is never reached because users feel the design "isn't ready yet"

**Phase to address:** Phase implementing `/pde:iterate` — build convergence signaling into the first implementation. Do not add it as an afterthought after users report the loop problem.

---

### Pitfall 10: Standalone Skill Use Breaks Because Pipeline Assumes Sequential Artifact Existence

**What goes wrong:**
PROJECT.md requires that "each design skill works standalone AND as part of orchestrated `/pde:build` pipeline." In practice, the implementation assumes sequential use: wireframe assumes system exists, critique assumes wireframe exists, handoff assumes critique exists. When a user runs `/pde:wireframe` directly (without a system), the command crashes or produces incoherent output. Users who want to use only the critique skill on an existing artifact find it broken.

**Why it happens:**
During implementation it is easier to require all upstream artifacts. The developer builds and tests the pipeline sequentially. The standalone use case is never tested because the developer always runs the full pipeline.

**How to avoid:**
Every design skill command must implement a graceful dependency check with clear user-facing messages. Missing upstream artifact → surface the gap with a specific recommendation ("Run `/pde:system` first, or supply a token reference file at `.planning/design/DESIGN-SYSTEM.md`"). Design skill commands must be independently runnable with user-supplied inputs when PDE-generated upstream artifacts do not exist. Test each command in isolation as part of every phase's acceptance criteria.

**Warning signs:**
- A design command crashes with a file-not-found error instead of a user-friendly message
- Phase plan does not include a "standalone execution" acceptance test
- Running `/pde:critique` on an externally-created wireframe file is not supported

**Phase to address:** Each design skill phase — standalone execution must be a stated acceptance criterion in every phase plan, not assumed to work.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding fidelity as a fixed value in the wireframe prompt | Skips user-facing fidelity control | All wireframes come out the same fidelity; lo-fi → hi-fi iteration impossible | Never — fidelity control is a core feature |
| Skipping design pipeline state tracking | Faster first implementation | Pipeline is not resumable; crashes lose all progress | Acceptable for a single-command prototype only; must be added before any multi-stage orchestrator |
| Writing design artifacts to a new top-level directory | Feels clean and separate | Breaks health checks, state management, and scanning that all assume `.planning/` | Never — always store under `.planning/design/` |
| Letting critique agent produce output without brief/flows context | Critique runs even when upstream is missing | Generic, useless critique; iterate has nothing actionable to apply | Never — block with a dependency message instead |
| Implementing `/pde:build` as a long sequential workflow with inline logic | Faster initial build | Orchestrator becomes unmaintainable; adding a stage requires rewriting the orchestrator | Never — establish the delegation boundary from the start |
| Copying handoff template from a generic source without STACK.md integration | Faster handoff implementation | Handoff is useless for the actual project's tech stack | Never for the real implementation; acceptable only in a throwaway proof-of-concept |
| Skipping convergence signaling in iterate | Simpler implementation | Users loop forever; handoff stage is never reached | Never — convergence signal is the exit condition for the design stage |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Existing PDE state system | Creating a separate design state file with a different schema | Extend `.planning/STATE.md` frontmatter or add `.planning/design/STATE.md` using the same frontmatter schema; expose via new `pde-tools.cjs design-state` commands |
| `pde-tools.cjs` bin script | Adding design pipeline commands to individual workflow files instead of centralizing in the bin script | All design artifact scaffolding, state mutation, and path resolution goes through `pde-tools.cjs`; workflow files orchestrate only |
| Existing `/pde:new-project` STACK.md | Handoff agent ignoring STACK.md because it was written for a different phase | Explicitly pass STACK.md path in the handoff agent's `<required_reading>` block; do not assume the agent will discover it |
| Template system | Writing design templates with no placeholder schema | Every design template must define required sections with placeholder comments; agents fill sections, do not invent structure |
| Agent type registry | Adding design agents (brief-writer, wireframe-agent, etc.) without registering them in `core.cjs` model resolution | Register every new agent type in `core.cjs` with a model tier assignment; test with `pde-tools.cjs resolve-model pde-brief-writer` before shipping |
| Plugin version caching | Shipping design pipeline without a version bump | Every release of design pipeline features requires a `plugin.json` version bump; established in v1.0 release process |
| Existing `/pde:health` command | Health check not covering design artifact state | Extend health check to validate design pipeline artifacts if a design project is in progress |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Spawning all 7 design stages as parallel tasks | Token cost explosion; context limits exceeded; outputs reference each other before they exist | Design stages are inherently sequential (each stage depends on prior artifact); never parallelize stages — only parallelize within a stage (e.g., parallel critique perspectives) | Immediately — brief cannot precede flows if both run in parallel |
| Critique agent receiving full design system + all wireframes + full brief in one context | Context window exhaustion; critique becomes unfocused | Inject only the wireframe(s) being critiqued + brief summary + relevant tokens; not the full design system doc | When design system exceeds ~4k tokens or wireframes exceed ~2k tokens each |
| Iterate producing a full new wireframe on every run | Redundant token spend; artifact sprawl | Iterate should produce a diff/patch over the existing wireframe and create a new version file (`wireframe-v2.md`), not regenerate from scratch | When a project has more than 2 iteration cycles |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Design pipeline with no entry point from `/pde:new-project` | Users do not discover the design pipeline exists; they start coding without a brief | `/pde:new-project` must surface the design pipeline as a next step after project setup |
| Handoff spec with no clear "done" signal | Developers do not know if the spec is final or still being iterated | Handoff artifact must include an explicit status field (`status: final | draft`) and a version timestamp |
| Critique feedback with no priority levels | All critique items look equally important; developers implement cosmetic fixes before structural issues | Critique template must require P0/P1/P2 classification; iterate must address P0/P1 before P2 |
| Wireframe artifacts without a fidelity label | User shows a wireframe to a stakeholder who mistakes it for final UI | Every wireframe artifact frontmatter must include `fidelity: skeleton | lo-fi | mid-fi` |
| Design skills advertised as "v2" in stub commands but delivered in v1.1 | User trust gap; stubs say v2, marketing says v1.1 | Update stub commands to say "v1.1" when those commands are implemented; do not ship v1.1 with stubs still claiming v2 |

---

## "Looks Done But Isn't" Checklist

- [ ] **Wireframe fidelity control:** `/pde:wireframe lo-fi` and `/pde:wireframe mid-fi` produce structurally different outputs — verify by running both on the same brief and checking that lo-fi has no color references
- [ ] **Critique context injection:** Critique output references specific screen elements by name from the wireframe, and at least one critique item references the brief's stated user goals — verify by checking for product-specific language in the critique doc
- [ ] **Token format consistency:** Token names in `.planning/design/DESIGN-SYSTEM.md` appear verbatim in `.planning/design/wireframes/*.md` — verify with `grep -rn "--color-" .planning/design/` matching across both files
- [ ] **Handoff stack alignment:** Handoff spec prop names and file structure match what exists in the project's `src/` directory (or STACK.md if no code exists yet) — verify by manual comparison before calling handoff complete
- [ ] **Pipeline resumability:** Crash `/pde:build` partway through (CTRL-C during critique), then rerun — verify it resumes from critique rather than starting over from brief
- [ ] **Standalone skill execution:** Run `/pde:critique` without prior pipeline execution (supply a manually-created wireframe file) — verify it produces output instead of crashing with a missing-artifact error
- [ ] **Stub command text updated:** All stub commands (brief.md, flows.md, etc.) reference v1.1, not v2 — verify with `grep -rn "v2" commands/brief.md commands/flows.md commands/system.md commands/wireframe.md commands/critique.md commands/iterate.md commands/handoff.md`
- [ ] **Design state tracked:** After running any design skill, `.planning/design/STATE.md` (or equivalent) contains the stage status — verify by reading the state file after each skill execution
- [ ] **Convergence signal fires:** After three iterate cycles, `/pde:iterate` surfaces an explicit "ready for handoff" recommendation — verify by running three consecutive iterate runs on a test wireframe

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wireframe fidelity drift discovered after handoff | HIGH | Re-run wireframe at correct fidelity, re-run critique, re-run iterate, regenerate handoff; 4 stages of rework |
| Generic critique discovered post-iterate | MEDIUM | Add brief/flows to critique context, re-run critique, re-run iterate; 2 stages of rework |
| Token naming inconsistency discovered at handoff | MEDIUM | Update design system template, patch wireframe token references, regenerate handoff; requires careful search-replace across design artifacts |
| Handoff spec stack mismatch discovered during implementation | MEDIUM | Re-run handoff with STACK.md injection; low token cost but developer time wasted on partial implementation |
| No pipeline state — crash loses all progress | HIGH | Manually audit which `.planning/design/` artifacts exist, determine the last complete stage, resume from that stage; significant user friction |
| Infinite iterate loop — users never reach handoff | LOW | Run `/pde:handoff` directly; instruct user that handoff can be run at any time regardless of iterate count |
| Design artifacts outside `.planning/` discovered mid-milestone | HIGH | Move all artifacts, update all workflow path references, update state management paths; high risk of missed references |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wireframe fidelity drift (Pitfall 1) | Phase implementing `/pde:wireframe` | Run lo-fi and mid-fi on same brief; verify structurally different output |
| Generic critique (Pitfall 2) | Phase implementing `/pde:critique` | Critique output contains product-specific language; no critique item is applicable to all apps |
| Design token inconsistency (Pitfall 3) | Phase implementing `/pde:system` | Token names from DESIGN-SYSTEM.md appear verbatim in wireframe output |
| Handoff stack mismatch (Pitfall 4) | Phase implementing `/pde:handoff` | Handoff prop names match STACK.md conventions; developer review passes |
| God orchestrator (Pitfall 5) | Phase implementing `/pde:build` | Build workflow file under 80 lines; adding a stage requires no orchestrator edits |
| No pipeline state / no resumability (Pitfall 6) | State management phase (before first skill) | Crash recovery test: interrupt pipeline, restart, verify correct resume point |
| Scope creep into design tooling (Pitfall 7) | Every design pipeline phase | Each phase plan explicitly lists design-tool features as out of scope |
| Design artifacts outside `.planning/` (Pitfall 8) | Phase implementing `/pde:brief` (first artifact) | All design artifacts created under `.planning/design/`; health check covers design directory |
| Infinite iterate loop (Pitfall 9) | Phase implementing `/pde:iterate` | After 3 iteration runs, convergence recommendation appears in output |
| Standalone skill execution broken (Pitfall 10) | Each design skill phase | Each skill passes a standalone acceptance test with missing upstream artifacts |

---

## Sources

- Direct inspection of PDE v1.0 codebase: `/Users/greyaltaer/code/projects/Platform Development Engine/` — command stubs, workflow patterns, ARCHITECTURE.md, STACK.md (HIGH confidence)
- PDE PROJECT.md design pipeline requirements and out-of-scope decisions (HIGH confidence, primary source)
- PDE ARCHITECTURE.md — Workflow-as-Orchestrator, Template-Driven Artifact, Subagent Specialization patterns (HIGH confidence)
- LLM prompt engineering literature on output consistency — known variability without explicit constraint anchors (MEDIUM confidence, consistent with direct testing experience)
- Design-to-dev handoff failure patterns — common in "LLM writes the spec" workflows where stack context is absent (MEDIUM confidence, observed in similar AI-tool post-mortems)
- GSD codebase history — bin script created specifically to prevent inline side-effect sprawl (HIGH confidence, directly applicable anti-pattern)

---

*Pitfalls research for: Design pipeline addition to AI development tool (PDE v1.1)*
*Researched: 2026-03-15*
