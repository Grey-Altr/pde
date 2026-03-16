# Phase 20: Pipeline Orchestrator (/pde:build) - Research

**Researched:** 2026-03-15
**Domain:** Claude Code skill orchestration, design pipeline sequencing, state-driven resume logic
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Stage execution order**
- Sequential execution in canonical order: brief → system → flows → wireframe → critique → iterate → handoff
- No parallel stage execution — simplicity over speed; Claude Code workflows are inherently sequential
- Dependency order matches the pipeline: wireframe depends on system + flows, critique depends on wireframe, iterate depends on critique, handoff depends on iterate

**Resume and skip logic**
- Read designCoverage from design-manifest.json to determine completed stages
- Skip stages where the corresponding flag is true (hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasIterate, hasHandoff)
- Brief completion checked via brief.md existence in strategy/ (no hasBrief flag — per Phase 15.1 decision)
- Resume from first incomplete stage on re-run

**Verification gates**
- In interactive mode: prompt user between each stage ("Stage X complete. Continue to Stage Y?")
- In yolo mode: auto-continue between stages without prompts
- Read mode from .planning/config.json (consistent with all other PDE workflows)

**Crash recovery**
- If interrupted mid-stage, re-run the incomplete stage from scratch on next invocation
- Each skill is idempotent — overwrites its own output, so partial artifacts are safely replaced
- designCoverage flags are set at the end of each skill, so incomplete stages appear as not-done

**Invocation pattern**
- Each stage invoked via Skill tool (same mechanism as --auto chain in discuss-phase)
- Keeps execution flat — no nested Task agents (avoids deep nesting freeze per #686)
- Pass stage-specific flags through (e.g., fidelity level for wireframe)

### Claude's Discretion
- Exact progress display format between stages
- Whether to show a summary of completed stages at startup
- Error message wording when a stage fails

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORC-01 | /pde:build orchestrates the full pipeline sequence via DESIGN-STATE | Coverage check via `pde-tools.cjs design coverage-check` returns the exact 6+1 flags needed. Brief checked via Glob on `BRF-brief-v*.md`. Full read path verified. |
| ORC-02 | Each skill works standalone when invoked directly (not just via /pde:build) | All 7 skill commands already exist independently in commands/ and workflows/. Orchestrator adds zero skill logic — pure sequencing wrapper delegates via Skill tool. |
| ORC-03 | /pde:build is a thin orchestrator — all skill logic stays in individual workflows | Skill tool invocation pattern confirmed from discuss-phase/autonomous workflows. No logic duplication; orchestrator reads state and invokes skills only. |
</phase_requirements>

---

## Summary

Phase 20 builds the capstone of the v1.1 design pipeline: a single-command orchestrator that reads state, skips completed stages, and invokes each of the 7 design skills in sequence. The implementation is deliberately thin — this is a sequencing wrapper, not a new abstraction layer. All skill logic stays in individual workflows; the orchestrator's job is state reading, stage ordering, and verification gate prompting.

The core data flow is: read `design-manifest.json` via `pde-tools.cjs design coverage-check` → determine which stages are incomplete → invoke each incomplete stage via `Skill()` → show verification gate (interactive) or auto-continue (yolo). Brief completion is a special case: checked via Glob for `BRF-brief-v*.md` existence since there is no `hasBrief` coverage flag.

The established Skill tool invocation pattern (used in discuss-phase, plan-phase, and autonomous workflows) is the only safe way to chain skills — nested Task agents cause deep nesting freezes (issue #686). The orchestrator command file (`commands/build.md`) and workflow file (`workflows/build.md`) follow identical structural conventions to the other 7 skill pairs already in place.

**Primary recommendation:** Wire `commands/build.md` to delegate to `workflows/build.md`; the workflow reads coverage-check, checks brief existence via Glob, then loops through the 7-stage sequence using `Skill()` calls separated by verification gate logic.

---

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|---|---|---|---|
| `pde-tools.cjs design coverage-check` | Phase 12 | Returns designCoverage JSON from design-manifest.json | The established state-reading primitive used by all 7 skills |
| `pde-tools.cjs design ensure-dirs` | Phase 12 | Idempotent directory init | Used at Step 1 in every skill; orchestrator follows same pattern |
| Glob tool | Built-in | Detect brief.md existence (no hasBrief flag) | Pattern confirmed in handoff.md Step 2c for similar soft dependency |
| Skill tool | Built-in | Flat skill invocation — no nested Task agents | Confirmed pattern in discuss-phase, plan-phase, autonomous workflows |
| Read tool | Built-in | Read `.planning/config.json` for yolo/interactive mode | Confirmed pattern in all skill workflows |
| `pde-tools.cjs design manifest-set-top-level` | Phase 12 | Would NOT be used — orchestrator sets no manifest flags | Explicitly: ORC-01/03 — orchestrator adds no coverage logic |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|---|---|---|---|
| `pde-tools.cjs init phase-op` | Phase 12 | Phase metadata resolution | Used in workflow init step if needed for path resolution |
| `render.cjs banner` | Phase 12 | Visual banner display | Consistent with auto-chain banner usage in discuss-phase |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Skill() flat invocations | Task() nested agents | Task creates deep nesting → freezes (issue #686). Skill is mandatory. |
| designCoverage as state | Separate orchestrator state file | Would duplicate state. designCoverage is already the canonical flag set used by every skill. |
| Brief check via hasBrief | Brief check via Glob on BRF-brief-v*.md | hasBrief was explicitly removed (Phase 15.1 decision). Glob is the approved pattern. |

**No new npm dependencies.** Zero-dep constraint from Phase 12 applies: only Node.js builtins used in `pde-tools.cjs`.

---

## Architecture Patterns

### Recommended Project Structure

Only two files created:

```
commands/build.md          # Command stub — delegates to workflows/build.md
workflows/build.md         # Full orchestrator workflow — the implementation
```

No new library files, no new templates, no new test helpers beyond the Nyquist bash script.

### Pattern 1: Command → Workflow Delegation

**What:** `commands/build.md` is a thin YAML-frontmatter command stub that delegates 100% to `workflows/build.md` via `@` reference.

**When to use:** Every skill in PDE follows this — commands/*.md is the entry point; workflows/*.md is the implementation.

**Example (from `commands/handoff.md`):**
```yaml
---
name: pde:handoff
description: Synthesize design pipeline artifacts into implementation specifications
argument-hint: "[--quick] [--dry-run] [--verbose] [--no-mcp] [--no-sequential-thinking] [--force]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - mcp__sequential-thinking__*
---
<objective>
Execute the /pde:handoff command.
</objective>

<process>
Follow @workflows/handoff.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```

For `commands/build.md`, the orchestrator needs fewer tools. Because it delegates all work to individual Skill invocations, it does NOT need Write, Edit, or MCP tools directly. It needs: Read (config.json, DESIGN-STATE.md), Bash (coverage-check), Glob (brief existence check), AskUserQuestion (interactive gate prompts).

### Pattern 2: Skill Tool Flat Invocation

**What:** Each pipeline stage invoked as a flat Skill call. Skill tool runs the target command at the same nesting level — no recursive Task spawning.

**When to use:** Whenever one workflow needs to invoke another workflow. The discover-plan-execute chain, autonomous.md, and /pde:build all use this.

**Confirmed syntax (from `workflows/discuss-phase.md` and `workflows/autonomous.md`):**
```
Skill(skill="pde:brief")
Skill(skill="pde:system")
Skill(skill="pde:flows")
Skill(skill="pde:wireframe")
Skill(skill="pde:critique")
Skill(skill="pde:iterate")
Skill(skill="pde:handoff")
```

With arguments:
```
Skill(skill="pde:plan-phase", args="${PHASE} --auto")
Skill(skill="pde:execute-phase", args="${PHASE_NUM} --no-transition")
```

For build.md, pass-through flags (e.g., `--quick`, `--verbose`) should be forwarded to each Skill invocation as part of args.

### Pattern 3: Read-Before-Coverage-Check (Resume Logic)

**What:** Before invoking each stage, re-read coverage-check output to get current state. This is the crash-recovery guarantee: if interrupted mid-stage, the coverage flag is not set until that skill completes its final step, so the stage appears incomplete on next run.

**When to use:** At orchestrator startup (to show what's done/pending) and before each stage invocation (to confirm state hasn't changed mid-pipeline by a concurrent run).

**Confirmed from all skill workflows:**
```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse JSON: `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasHardwareSpec`.

**CRITICAL: hasIterate is NOT in the template manifest** — it is added at runtime by `/pde:iterate` as the 7th field. The coverage-check command reads whatever is in the live manifest. If `hasIterate` is absent from the JSON result, treat it as `false` (stage not complete).

### Pattern 4: Brief Existence Check (No hasBrief Flag)

**What:** Brief completion cannot be checked via designCoverage because `hasBrief` was explicitly removed in Phase 15.1. Instead, check for the presence of any `BRF-brief-v*.md` file.

**When to use:** Always — in the orchestrator's stage-skip logic for the brief stage.

**Pattern (from `workflows/handoff.md` Step 2c):**
```
Use the Glob tool to find all files matching .planning/design/strategy/BRF-brief-v*.md.
If at least one file found → brief stage is complete, skip it.
If none found → brief stage is incomplete, run /pde:brief.
```

**WARNING:** Do NOT attempt to use `artifacts.BRF` from the manifest as the brief check — the brief.md workflow's anti-patterns explicitly forbid checking for a `hasBrief` field, and the manifest's artifacts object structure varies. Glob is the authoritative check.

### Pattern 5: Verification Gate — Interactive vs Yolo

**What:** After each stage completes, check config.json mode. In interactive mode, use AskUserQuestion to prompt before advancing. In yolo mode, auto-continue.

**When to use:** Between every stage pair.

**Config.json mode field (confirmed from `.planning/config.json`):**
```json
{
  "mode": "yolo"
}
```

Valid modes: `"yolo"`, `"interactive"`, `"custom"`.

**Implementation:**
```
Read .planning/config.json → parse mode field.
If mode == "interactive":
  AskUserQuestion: "Stage {X} ({SKILL_NAME}) complete. Continue to Stage {Y} ({NEXT_SKILL})?"
  Options: ["Continue", "Stop here"]
  If "Stop here": display resume instructions and halt
If mode == "yolo" (or any other):
  Auto-continue, log: "[yolo] Advancing to Stage {Y}..."
```

### Pattern 6: Step N/M Progress Format

**What:** All PDE skills use `Step N/M: Description...` format. The orchestrator should follow the same convention for its own steps, distinct from the sub-skill progress output.

**Confirmed from `references/skill-style-guide.md`:**
```
Step 1/7: Detecting product type...
  -> Sub-step detail
```

For the orchestrator, top-level steps are initialization, coverage read, and stage-by-stage execution. Stage execution is reported at the orchestrator level (e.g., `Running Stage 3/7: /pde:flows...`), while the skill's own step output appears inline below.

### Anti-Patterns to Avoid

- **Nested Task agents for skill invocation:** NEVER use `Task(prompt="run /pde:brief")`. Always use `Skill(skill="pde:brief")`. Issue #686 causes freezes with deeply nested Task agents.
- **Reading DESIGN-STATE.md as primary state source:** DESIGN-STATE.md provides narrative context. designCoverage in `design-manifest.json` is the authoritative skip-logic source. The orchestrator reads coverage-check output, not DESIGN-STATE.md, for skip decisions.
- **Setting any designCoverage flags in the orchestrator:** The orchestrator MUST NOT call `manifest-set-top-level designCoverage`. Each skill owns its own flag. Setting flags from the orchestrator would violate ORC-03.
- **Assuming hasIterate exists in coverage-check output:** It's added at runtime by /pde:iterate. Default to false if absent from JSON.
- **Passing --yolo or mode flags to sub-skills:** Each skill reads config.json independently. The orchestrator reads config.json for its own gate logic only — it does not pass mode to skills.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Stage state persistence | Custom orchestrator state file | designCoverage flags in design-manifest.json | All 7 skills already write to this. Adding a parallel state file creates divergence risk. |
| Skill chaining | Nested Task agents | Skill() flat invocations | Task nesting causes #686 freeze. Skill is the established pattern. |
| Coverage reading | Parsing design-manifest.json directly | `pde-tools.cjs design coverage-check` | The CLI command handles edge cases (missing file, missing keys). |
| Brief detection | Reading manifest artifacts.BRF | Glob on BRF-brief-v*.md | hasBrief was explicitly removed. The Glob pattern is the approved check. |
| Config mode reading | Hardcoded yolo behavior | Read .planning/config.json | Mode is user-configurable. All workflows read config.json. |

**Key insight:** The orchestrator produces zero new state of its own — it only reads existing state and invokes existing skills. Any state it might create would duplicate what individual skills already manage.

---

## Common Pitfalls

### Pitfall 1: hasIterate Missing from Coverage JSON

**What goes wrong:** The orchestrator reads coverage-check, tries to access `hasIterate`, gets `undefined`, and either crashes or treats the iterate stage as always-incomplete.

**Why it happens:** `hasIterate` is introduced at runtime by `/pde:iterate` as the 7th field. The manifest template (and a fresh project) has only 6 fields. Until iterate runs, `hasIterate` does not appear in coverage-check output.

**How to avoid:** Parse coverage JSON with explicit default: `const hasIterate = coverage.hasIterate ?? false`. Treat absent field as `false` (stage not done).

**Warning signs:** Iterate stage always runs even after /pde:iterate has been run, or orchestrator errors on coverage JSON parse.

### Pitfall 2: AskUserQuestion in Yolo Mode

**What goes wrong:** The orchestrator calls AskUserQuestion between stages even when config mode is `yolo`, blocking the pipeline and waiting for user input that yolo mode is designed to skip.

**Why it happens:** Gate logic written without checking config.json first.

**How to avoid:** Read config.json ONCE at initialization (Step 1). Store mode. Every gate: `if mode !== "interactive": skip AskUserQuestion, auto-continue`.

**Warning signs:** Pipeline hangs between stages in yolo mode.

### Pitfall 3: Brief Check Using artifacts.BRF Instead of Glob

**What goes wrong:** Orchestrator checks `manifest.artifacts.BRF` to determine if brief stage is done. If the BRF artifact entry is missing or structured differently than expected, brief stage re-runs unnecessarily.

**Why it happens:** The manifest artifacts object tracks artifact metadata, but its schema has evolved across phases and is not the approved brief-done check.

**How to avoid:** Use Glob on `.planning/design/strategy/BRF-brief-v*.md`. If one or more files found, brief is done. This is the same check used by handoff.md Step 2c.

**Warning signs:** Brief re-runs even when BRF-brief-v1.md exists in strategy/, or false "brief complete" when the file does not exist.

### Pitfall 4: Orphaned Args Not Forwarded to Sub-Skills

**What goes wrong:** A user runs `/pde:build --quick` expecting all skills to run in quick mode. The orchestrator reads `--quick` from $ARGUMENTS but doesn't pass it to each `Skill()` invocation, so each skill runs at full verbosity.

**Why it happens:** Forgetting to propagate args when constructing Skill call arguments.

**How to avoid:** Parse $ARGUMENTS at orchestrator init. Build a PASSTHROUGH_ARGS variable. Include it in each Skill args string: `Skill(skill="pde:brief", args="${PASSTHROUGH_ARGS}")`.

**Warning signs:** User-specified flags silently ignored; skills run at different verbosity than expected.

### Pitfall 5: Not Logging Which Stages Were Skipped

**What goes wrong:** The orchestrator runs, skips stages silently, and the user can't tell what happened.

**Why it happens:** No startup summary display.

**How to avoid:** At initialization, display a startup table showing each stage, its coverage flag, and its status (complete/pending). Per the "Claude's Discretion" scope: a summary of completed stages at startup is a discretionary design choice — include it for usability.

---

## Code Examples

### Coverage Check and Stage Skip Logic

```bash
# Read coverage — standard pattern from all skill workflows
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Coverage parsed in workflow as JSON — access individual fields
# hasIterate defaults to false if absent (introduced at runtime by /pde:iterate)
```

### Brief Existence Check (Glob Pattern)

```
Use the Glob tool to find .planning/design/strategy/BRF-brief-v*.md
If count > 0 → BRIEF_DONE = true (skip /pde:brief stage)
If count == 0 → BRIEF_DONE = false (run /pde:brief stage)
```
Source: Same pattern as `workflows/handoff.md` Step 2c.

### Skill Invocation (Flat, No Nesting)

```
# Source: workflows/discuss-phase.md and workflows/autonomous.md
Skill(skill="pde:brief", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:system", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:flows", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:wireframe", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:critique", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:iterate", args="${PASSTHROUGH_ARGS}")
Skill(skill="pde:handoff", args="${PASSTHROUGH_ARGS}")
```

### Config.json Read Pattern

```
Read .planning/config.json
Parse: mode = config.mode  (one of "yolo" | "interactive" | "custom")
Default: treat absent/null mode as "yolo"
```

### Verification Gate Pattern

```
IF mode == "interactive":
  AskUserQuestion:
    header: "Stage {N}/7 Complete"
    question: "/{CURRENT_SKILL} finished. Continue to /{NEXT_SKILL}?"
    options: ["Continue", "Stop here"]
  If "Stop here":
    Display: "Pipeline paused after Stage {N}/7.
      Resume: /pde:build   (will skip completed stages automatically)"
    HALT
ELSE:
  Log: "[yolo] Stage {N}/7 complete — advancing to {NEXT_SKILL}..."
```

### commands/build.md Structure

```yaml
---
name: pde:build
description: Run the full design pipeline (brief → system → flows → wireframe → critique → iterate → handoff). Resumes from last complete stage.
argument-hint: "[--dry-run] [--quick] [--verbose] [--no-mcp] [--yolo]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - AskUserQuestion
---
<objective>
Execute the /pde:build pipeline orchestrator.
</objective>

<process>
Follow @workflows/build.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```

Note: `Write`, `Edit`, and MCP tools are not needed in allowed-tools — the orchestrator itself writes nothing. Individual skills handle their own file writes via their own allowed-tools.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| hasBrief coverage flag | Glob on BRF-brief-v*.md for brief detection | Phase 15.1 | Brief check cannot use manifest flags; must use file presence |
| 6-field designCoverage | 7-field designCoverage (hasIterate added at runtime) | Phase 18 | Orchestrator must default hasIterate = false when absent from JSON |
| Task() for skill chaining | Skill() flat invocations | Phase 19 (pattern established) | Prevents #686 deep nesting freeze |

**Deprecated/outdated:**
- `hasBrief`: Was explicitly removed from designCoverage in Phase 15.1. Never use it.
- Nested Task agents for orchestration: Cause runtime freezes. Skill tool is the replacement.

---

## Open Questions

1. **Flag forwarding to /pde:wireframe fidelity**
   - What we know: wireframe accepts `--lofi`, `--midfi`, `--hifi` flags for fidelity level. CONTEXT.md says "pass stage-specific flags through (e.g., fidelity level for wireframe)".
   - What's unclear: Does the orchestrator expose a `--fidelity` flag and translate it, or does it forward raw $ARGUMENTS to each Skill (which means fidelity flags would incorrectly reach non-wireframe skills too)?
   - Recommendation: The simplest and safest approach is to forward all $ARGUMENTS verbatim to each Skill. Skills that don't recognize a flag ignore it. This matches the passthrough pattern used in autonomous.md.

2. **The `--yolo` flag vs config.json**
   - What we know: CONTEXT.md says verification gate behavior is read from `.planning/config.json`. The argument-hint in autonomous.md does not include `--yolo`.
   - What's unclear: Should `/pde:build` support a `--yolo` flag to override config.json interactivity for a single run?
   - Recommendation: Support `--yolo` as a session-level override (if present in $ARGUMENTS, treat as yolo mode regardless of config.json). This is consistent with how other tools allow flag-level overrides.

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | bash + grep (same pattern as Phase 19) |
| Config file | none — structural grep on workflow/command files |
| Quick run command | `grep -c "Stage 1/7\|Stage 2/7\|Stage 3/7\|Stage 4/7\|Stage 5/7\|Stage 6/7\|Stage 7/7" workflows/build.md` |
| Full suite command | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` |
| Estimated runtime | ~2 seconds |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| ORC-01 | workflows/build.md reads designCoverage and skips completed stages | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ❌ Wave 0 |
| ORC-01 | commands/build.md delegates to workflows/build.md | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ❌ Wave 0 |
| ORC-02 | Each of the 7 skills invocable standalone (commands/*.md exist) | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ❌ Wave 0 |
| ORC-03 | workflows/build.md contains no manifest-set-top-level or designCoverage write calls | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ❌ Wave 0 |
| ORC-03 | orchestrator invokes all 7 skills via Skill() not Task() | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ❌ Wave 0 |
| ORC-01 | Crash resume: brief checked via Glob not hasBrief | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `grep -c "Skill(skill=" workflows/build.md` (verify 7 Skill invocations present)
- **Per wave merge:** `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` — covers ORC-01, ORC-02, ORC-03
- [ ] `commands/build.md` — main command entry point
- [ ] `workflows/build.md` — full orchestrator workflow

*(The test script itself is created in Wave 0 / Task 1 before the implementation tasks run)*

---

## Sources

### Primary (HIGH confidence)

- Live codebase inspection — `commands/handoff.md`, `workflows/handoff.md` — command/workflow delegation pattern verified
- Live codebase inspection — `workflows/discuss-phase.md` lines 695-708 — Skill tool flat invocation syntax confirmed
- Live codebase inspection — `workflows/autonomous.md` — multiple Skill() call examples confirmed
- Live codebase inspection — `bin/lib/design.cjs` — cmdCoverageCheck returns manifest.designCoverage directly
- Live codebase inspection — `.planning/design/design-manifest.json` — confirmed 6-field live manifest (hasIterate absent until iterate runs)
- Live codebase inspection — `templates/design-manifest.json` — confirmed 6-field template
- Live codebase inspection — `workflows/iterate.md` — confirmed hasIterate added as 7th field at runtime
- Live codebase inspection — `references/skill-style-guide.md` — Step N/M progress format, allowed-tools conventions
- `.planning/config.json` — confirmed mode field, yolo as current value
- `20-CONTEXT.md` — all implementation decisions locked, no alternatives to research

### Secondary (MEDIUM confidence)

- Phase 15.1 decision in STATE.md — hasBrief removal confirmed via accumulated decisions log
- Phase 18 decision in STATE.md — hasIterate introduced as 7th field confirmed
- Phase 19 test infrastructure (`test_hnd_gaps.sh`) — confirmed bash+grep test pattern for Nyquist validation

### Tertiary (LOW confidence)

None — all research verified against live codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools and patterns verified against live code
- Architecture: HIGH — command/workflow structure, Skill invocation syntax, coverage-check all verified
- Pitfalls: HIGH — hasBrief removal, hasIterate runtime-add, Task vs Skill all confirmed from live code and STATE.md decisions

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain — no external dependencies)
