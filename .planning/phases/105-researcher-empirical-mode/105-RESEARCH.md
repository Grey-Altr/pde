# Phase 105: Researcher Empirical Mode - Research

**Researched:** 2026-03-23
**Domain:** Agent augmentation — extending `pde-phase-researcher` with empirical hypothesis testing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — infrastructure phase with no prior discuss-phase.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RSRCH-01 | `pde-phase-researcher` agent gains `--empirical` flag — when set, researcher generates candidate modifications and tests them against a metric instead of doing desk research only | Researcher agent lives at `~/.claude/agents/pde-phase-researcher.md`; `--empirical` flag is parsed from `$ARGUMENTS` in the agent's execution flow; experiment runner infrastructure (Phases 100-104) provides the measurement loop |
| RSRCH-02 | `research-phase.md` workflow routes to empirical mode when phase CONTEXT.md or ROADMAP goal contains optimization/experimentation keywords | `workflows/research-phase.md` contains the Task() spawn call for the researcher; keyword detection is a string-match step added before the spawn; keywords to detect: optimize, optimization, experiment, empirical, benchmark, improve, tune |
| RSRCH-03 | Empirical research produces RESEARCH.md with "Experiments Attempted" section listing candidates tried, metrics measured, and outcomes | The existing RESEARCH.md output format (defined in the researcher agent) gains a new `## Experiments Attempted` section alongside existing sections; results data sourced from the `.planning/experiments/{slug}/results.jsonl` the runner populates |
</phase_requirements>

---

## Summary

Phase 105 augments `pde-phase-researcher` to support an empirical mode where the agent validates hypotheses by measuring them against a metric rather than purely conducting desk research. The feature has three interlocking parts: (1) an `--empirical` flag on the researcher agent that switches it into candidate-generation-and-measurement mode, (2) auto-routing in `research-phase.md` that activates empirical mode based on optimization-related keywords in CONTEXT.md or the ROADMAP goal, and (3) a new "Experiments Attempted" section in the RESEARCH.md output that captures what was tried, what metrics were measured, and what outcomes resulted.

The experiment infrastructure from Phases 100-104 is fully operational: `experiment.cjs` manages the git state machine, `experiment-runner.cjs` provides `_evalMetric` / `_checkModifiedFiles` / `_writeJsonlRow`, `experiment-schema.cjs` defines `parseExperimentFile`, and `pde-experiment-runner` and `pde-experiment-runner-sonnet` agents are available as subagent types. The researcher agent in empirical mode becomes a lightweight orchestrator: it constructs a transient `experiment.md` from its research context, delegates iterations to the existing runner agents, reads results, and synthesizes them into the RESEARCH.md output.

The researcher agent definition lives outside the project repo at `~/.claude/agents/pde-phase-researcher.md`. The workflow lives inside the repo at `workflows/research-phase.md`. Both files require modification. The RESEARCH.md output format is defined inside the researcher agent definition. No new Node.js modules are needed — this phase is entirely agent-definition and workflow prose changes.

**Primary recommendation:** Treat the researcher in empirical mode as a thin orchestration wrapper around the existing experiment runner. Re-use `pde-experiment-runner` as the mutation engine; the researcher's job is to construct the experiment context (metric, verify command, mutable files) from phase context and to synthesize the results into RESEARCH.md.

---

## Standard Stack

### Core
| File | Location | Purpose | Why Standard |
|------|----------|---------|--------------|
| `pde-phase-researcher.md` | `~/.claude/agents/pde-phase-researcher.md` | System-level researcher agent definition | The file being extended — all three requirements touch it |
| `research-phase.md` | `workflows/research-phase.md` | Orchestration workflow that spawns the researcher | RSRCH-02 routing logic goes here |
| `pde-experiment-runner.md` | `agents/pde-experiment-runner.md` | Mutation-and-eval runner agent (Haiku) | Already built, used as subagent delegate in empirical mode |
| `pde-experiment-runner-sonnet.md` | `agents/pde-experiment-runner-sonnet.md` | Escalated runner (Sonnet) | Already built, same dispatch pattern as optimize.md |
| `experiment-runner.cjs` | `bin/lib/experiment-runner.cjs` | `_evalMetric`, `_checkModifiedFiles`, `_writeJsonlRow` | Already built — these exact functions power empirical measurement |
| `experiment-schema.cjs` | `bin/lib/experiment-schema.cjs` | `parseExperimentFile` | Validates any transient experiment.md the researcher constructs |

### Supporting
| File | Location | Purpose | When to Use |
|------|----------|---------|-------------|
| `optimize.md` | `workflows/optimize.md` | Full experiment orchestration loop reference | Model for how the researcher should dispatch iterations in empirical mode |
| `experiment.md` (template) | `templates/experiment.md` | Experiment file format reference | Researcher constructs a transient experiment.md following this format |
| `EXPERIMENT-BEST.json` | `.planning/experiments/{slug}/` | Tracks best iteration result | Researcher reads this post-loop to report best outcome |
| `results.jsonl` | `.planning/experiments/{slug}/results.jsonl` | Per-iteration result log | Researcher reads this to populate "Experiments Attempted" section |

### No New Modules Needed
This phase requires no new Node.js modules. All changes are to markdown agent definitions and workflow prose. The 300-line ceiling on experiment modules is not a concern here.

---

## Architecture Patterns

### Pattern 1: Empirical Mode Flag Dispatch

**What:** `--empirical` flag in `$ARGUMENTS` is detected at the top of the researcher agent's execution flow, before any research steps. When detected, the agent switches to empirical mode and skips desk research entirely.

**When to use:** Any time RSRCH-01 is invoked — either explicitly (`/pde:research-phase 105 --empirical`) or via auto-routing from RSRCH-02.

**Structure in `pde-phase-researcher.md`:**
```
<execution_flow>
## Step 0: Mode Detection

Parse $ARGUMENTS for `--empirical` flag. If present, jump to
"## Empirical Mode Steps" below instead of the standard flow.

...standard desk research steps...

---

## Empirical Mode Steps

Step E1: Construct transient experiment.md from phase context
Step E2: Init experiment slug and state
Step E3: Dispatch iteration loop (reuse optimize.md pattern, reduced budget)
Step E4: Read results.jsonl and EXPERIMENT-BEST.json
Step E5: Write RESEARCH.md with "Experiments Attempted" section
```

### Pattern 2: Auto-Routing in research-phase.md

**What:** Before spawning the researcher, `research-phase.md` scans the phase's CONTEXT.md and ROADMAP goal string for optimization-related keywords. If found, appends `--empirical` to the researcher's prompt arguments.

**Optimization keywords to detect (case-insensitive):**
```
optimize, optimization, experiment, empirical, benchmark, improve, tune,
metric, measure, performance, scoring, quality, ablation
```

**Structure in `research-phase.md`:**
```markdown
## Step 3.5: Detect Empirical Mode

Read {context_path} (if exists) and the ROADMAP goal for this phase.
If any of the following keywords appear:
  optimize, optimization, experiment, empirical, benchmark, improve, tune,
  metric, measure, performance, scoring, quality, ablation

→ Append "--empirical" to the researcher agent prompt arguments.
→ Display: "Auto-routing to empirical mode (keyword: {matched_keyword})"
```

Note: `plan-phase.md` also spawns the researcher — add the same keyword check there for consistency.

### Pattern 3: Transient experiment.md Construction

**What:** In empirical mode, the researcher constructs a short-lived `experiment.md` targeting the phase's specific research question. This file is written to `/tmp/empirical-{slug}.md` (not `.planning/experiments/`) so it doesn't pollute the project state.

**Template for transient experiment.md:**
```yaml
---
slug: research-{phase-number}
metric: {metric from phase context or default: nyquist_pass_count}
direction: max
verify: {verify command — must output a float on stdout's last line}
mutable_files:
  - {file(s) relevant to the research question}
iteration_budget: 10    # Empirical mode uses a lower budget than full optimize
time_budget_minutes: 20
---

## Search Space

{Describe the hypothesis variants the researcher will test}

## Constraints

{What MUST NOT change — locked sections, infrastructure files}

## Stopping Rationale

Halt when 3 consecutive iterations produce no improvement or 10 iterations reached.
```

**Key difference from `/pde:optimize`:** Budget is reduced (default 10 iterations, 20 minutes) because this is research exploration, not production optimization.

### Pattern 4: "Experiments Attempted" Section in RESEARCH.md

**What:** A new section appended to RESEARCH.md in empirical mode, after "Common Pitfalls" and before "Sources".

**Format:**
```markdown
## Experiments Attempted

**Mode:** Empirical
**Metric:** {metric name} ({direction})
**Verify command:** `{command}`
**Iterations run:** {N} / {budget}
**Best result:** {best metric value} (iteration {N}, commit {sha})

| # | Iteration | Change Description | Metric | Delta | Status |
|---|-----------|-------------------|--------|-------|--------|
| 1 | {id} | {description} | {value} | {delta} | KEEP/DISCARD/CRASH |
| 2 | ... | ... | ... | ... | ... |

**Synthesis:** {1-2 sentences: what the experiments revealed, what hypothesis was validated or rejected}
```

### Pattern 5: Researcher as Lightweight Orchestrator

**What:** In empirical mode, the researcher delegates mutation work to `pde-experiment-runner` (Haiku) via Task() calls, exactly as `optimize.md` does. The researcher does not mutate files directly.

**Loop structure (matches optimize.md Step 7, condensed):**
```
LOOP (up to empirical_budget iterations):
  a. context_mode = "full" if iteration 1 else "diff"
  b. dispatch Task(subagent_type="pde-experiment-runner", ...)
  c. parse structured JSON result
  d. check: 3 consecutive DISCARD/CRASH → halt early
  e. display: "Empirical iteration {N}: {status} | metric={value}"
END LOOP
```

**No circuit breaker replication needed:** The researcher uses a much smaller budget (10 iterations default) so only consecutive-failure early-halt is needed. Full circuit breakers are overkill for research mode.

### Recommended File Changes

```
~/.claude/agents/pde-phase-researcher.md   ← RSRCH-01: add --empirical flag + empirical mode steps
workflows/research-phase.md               ← RSRCH-02: add keyword detection + --empirical routing
```

The RESEARCH.md output format changes are defined within `pde-phase-researcher.md` itself (in the `<output_format>` section), so no separate template file needs updating.

### Anti-Patterns to Avoid

- **Duplicating the full optimize.md loop in the researcher:** Re-use `pde-experiment-runner` via Task(). The researcher should NOT replicate the full circuit-breaker machinery — a simple consecutive-failure counter is sufficient for 10-iteration research mode.
- **Writing transient experiment.md to `.planning/experiments/`:** That path is for real experiments. Use `/tmp/` to avoid polluting project experiment history.
- **Running empirical mode for non-optimization phases:** The keyword detection gate (RSRCH-02) prevents this. If no keywords match, standard desk research runs.
- **Blocking on user confirmation for cost estimate:** Empirical mode in the researcher is research infrastructure, not a full optimization run. Skip the BREAK-05 cost confirmation gate; the researcher's reduced budget makes it safe to auto-proceed.
- **Creating a new experiment subcommand for "empirical init":** Use the existing `experiment init` subcommand from `pde-tools.cjs`. No new Node.js code needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Metric evaluation | Custom subprocess runner | `node bin/pde-tools.cjs experiment eval-metric --slug {slug}` | Already handles timeout, non-zero exit, unparseable output — see `_evalMetric` in `experiment-runner.cjs` |
| Boundary enforcement | Custom file diff check | `node bin/pde-tools.cjs experiment check-boundaries --slug {slug}` | Already handles git diff + mutable_files set comparison |
| JSONL row writing | Custom append logic | `node bin/pde-tools.cjs experiment write-row ...` | Already handles auto-id, auto-ts, field filtering via `JSONL_ROW_FIELDS` |
| File mutation | Researcher editing files directly | Task(subagent_type="pde-experiment-runner") | Maintains boundary isolation; runner has appropriate tools and constraints |
| Experiment.md parsing | Custom frontmatter parser | `parseExperimentFile` from `experiment-schema.cjs` | Validates required fields, normalizes arrays, handles defaults |

**Key insight:** Phases 100-104 built a complete experiment execution stack. Phase 105 is purely a routing and orchestration layer that channels the researcher into that stack. No new infrastructure needed.

---

## Common Pitfalls

### Pitfall 1: Empirical Mode Runs in Experiment Branch Without Cleanup
**What goes wrong:** Researcher runs experiment iterations on a real `experiment/research-{N}` branch and fails to clean up, leaving experiment branches in the repo.
**Why it happens:** The researcher re-uses `experiment init` which creates a real git branch.
**How to avoid:** In empirical mode, use a `--empirical` slug prefix (e.g., `research-105`) and ensure the researcher always runs `experiment cleanup --slug {slug}` at the end of empirical mode, regardless of whether results were useful. The cleanup step is not optional.
**Warning signs:** `git branch --list 'experiment/research-*'` returns results after research completes.

### Pitfall 2: Keywords Trigger Empirical Mode for Non-Optimization Phases
**What goes wrong:** A phase whose goal mentions "improving" something (e.g., "improve error messages") auto-routes to empirical mode when desk research is more appropriate.
**Why it happens:** Over-broad keyword matching.
**How to avoid:** Require at least one "strong" keyword (`optimize`, `optimization`, `experiment`, `empirical`, `benchmark`) rather than triggering on soft keywords like "improve" alone. "improve" as a standalone word is a weak signal. Combine with phase type check: only trigger if the ROADMAP phase type is "experiment" or the CONTEXT.md explicitly contains empirical framing.
**Warning signs:** Empirical mode activating on standard feature phases (auth, UI, API phases).

### Pitfall 3: Transient experiment.md Has No Verify Command
**What goes wrong:** The researcher constructs an experiment.md without a `verify` field because the phase context doesn't specify a metric.
**Why it happens:** Not every research question has a measurable metric ready.
**How to avoid:** If the researcher cannot determine a verify command from phase context, fall back to desk research mode instead of constructing an invalid experiment.md. Log: "Empirical mode requires a measurable metric. No verify command found — falling back to desk research." This is a graceful degradation, not an error.
**Warning signs:** `parseExperimentFile` returns `{ valid: false, errors: ["experiment.md is missing required fields: verify"] }`.

### Pitfall 4: "Experiments Attempted" Section Missing from RESEARCH.md
**What goes wrong:** The researcher completes empirical iterations but forgets to include the "Experiments Attempted" section in RESEARCH.md (RSRCH-03 failure).
**Why it happens:** The empirical mode steps and the RESEARCH.md output format are in separate sections of the researcher agent definition. Easy to add empirical steps without updating the output format.
**How to avoid:** The `<output_format>` section in `pde-phase-researcher.md` must include the "Experiments Attempted" section as a conditional block that appears when empirical mode ran. Make it explicit: "If empirical mode: MUST include `## Experiments Attempted` section."
**Warning signs:** Planner checking RESEARCH.md finds no "Experiments Attempted" section after an empirical run.

### Pitfall 5: Empirical Mode Ignores Results When Writing RESEARCH.md
**What goes wrong:** The researcher runs experiments, discards the results, and writes the RESEARCH.md as if desk research had been done.
**Why it happens:** Context window pressure at RESEARCH.md write time — the results.jsonl content was parsed earlier and not held in context.
**How to avoid:** The researcher should read `results.jsonl` and `EXPERIMENT-BEST.json` immediately before writing RESEARCH.md, not during the loop. Keep the read-and-write close together to avoid context loss.

---

## Code Examples

### Keyword Detection in research-phase.md (RSRCH-02)

```markdown
## Step 3.5: Detect Empirical Mode

Read the ROADMAP goal for this phase and {context_path} (if exists).

Check for optimization keywords (case-insensitive):
  optimize, optimization, experiment, empirical, benchmark, tune,
  metric, measure, performance, scoring, ablation

At least one "strong" keyword must match:
  optimize, optimization, experiment, empirical, benchmark, ablation

If a strong keyword matches OR if CONTEXT.md contains "empirical" or "experiment":
  → Set RESEARCHER_ARGS="--empirical"
  → Display: "Auto-routing to empirical mode (keyword: {matched_keyword})"
Else:
  → Set RESEARCHER_ARGS=""
```

### Empirical Mode Steps in pde-phase-researcher.md (RSRCH-01)

```markdown
## Empirical Mode Steps (--empirical flag detected)

**E1: Determine Research Metric**

From phase context (CONTEXT.md, ROADMAP goal, requirements), identify:
- What is being optimized? (e.g., "improve Nyquist pass count", "reduce token usage")
- What verify command produces a float metric? (e.g., `node bin/nyquist-metric.cjs`)
- What files are eligible for mutation? (must be OPTIMIZABLE-marked or explicitly listed)
- Direction: max (higher is better) or min (lower is better)

If no verify command can be determined: fall back to desk research.
Log: "Empirical mode requires a measurable metric. Falling back to desk research."

**E2: Construct Transient experiment.md**

Write to `/tmp/empirical-{phase-number}-experiment.md`:
  (use template from Architecture Patterns section)

**E3: Init Experiment State**
  node bin/pde-tools.cjs experiment init --slug research-{phase-number}

**E4: Capture Baseline**
  node bin/pde-tools.cjs experiment eval-metric --slug research-{phase-number}

**E5: Run Iterations (up to 10, halt after 3 consecutive failures)**

LOOP:
  Dispatch Task(subagent_type="pde-experiment-runner", ...)
  Parse JSON result
  Check early-halt: if consecutiveFailures >= 3 → break
END LOOP

**E6: Collect Results**

Read: .planning/experiments/research-{phase-number}/results.jsonl
Read: .planning/experiments/research-{phase-number}/EXPERIMENT-BEST.json

**E7: Cleanup Branch**
  node bin/pde-tools.cjs experiment cleanup --slug research-{phase-number}

**E8: Write RESEARCH.md**

Include standard sections PLUS:
  ## Experiments Attempted
  (populated from results.jsonl data)
```

### "Experiments Attempted" RESEARCH.md Section (RSRCH-03)

```markdown
## Experiments Attempted

**Mode:** Empirical
**Metric:** nyquist_pass_count (max)
**Verify command:** `node bin/nyquist-metric.cjs`
**Iterations run:** 7 / 10
**Best result:** 1092 (iteration 3, commit abc1234)

| # | ID | Change Description | Metric | Delta | Status |
|---|----|--------------------|--------|-------|--------|
| 1 | research-105-0001 | Added explicit step numbering to brief.md Step 2 | 1083 | +8 | KEEP |
| 2 | research-105-0002 | Condensed ideate.md variant section | 1080 | -3 | DISCARD |
| 3 | research-105-0003 | Added "must include" checklist to system.md | 1092 | +9 | KEEP |

**Synthesis:** Step-number explicitness and "must include" checklists improved Nyquist pass counts.
Condensing variant sections had no benefit. Hypothesis confirmed: checklist formatting in workflow
steps is measurably more effective than prose guidance.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Researcher does only desk research | Researcher can empirically validate hypotheses | Phase 105 | Research findings for optimization phases are now grounded in measured outcomes, not just literature |
| `research-phase.md` always uses desk research | Auto-routes to empirical mode on keyword detection | Phase 105 | Optimization phases get the right research mode without manual flag |
| RESEARCH.md has no experiment record | RESEARCH.md gains "Experiments Attempted" section | Phase 105 | Planners can see what was tried empirically before planning begins |

---

## Open Questions

1. **Should empirical mode and desk research be mutually exclusive?**
   - What we know: The success criteria say "switching to candidate-generation-and-measurement mode" — implying replacement, not augmentation
   - What's unclear: Whether some phases benefit from both desk research AND empirical validation
   - Recommendation: Default to exclusive mode (empirical replaces desk research). This keeps the agent's context window small and aligns with the "minimal context" principle from SELF-06. A future phase can add hybrid mode.

2. **What is the default verify command when phase context doesn't specify one?**
   - What we know: For PDE optimization phases, `node bin/nyquist-metric.cjs` is the standard metric
   - What's unclear: Non-PDE projects may not have this command
   - Recommendation: Default to `node bin/nyquist-metric.cjs` when the phase is a PDE infrastructure phase (detectable from ROADMAP). For other phases, fall back to desk research if no verify command is identifiable.

3. **Should the experiment branch be preserved for user review before cleanup?**
   - What we know: `/pde:optimize` requires user approval before promoting to main (SELF-04)
   - What's unclear: Whether researcher empirical mode should offer the same promotion option
   - Recommendation: No — empirical research mode is reconnaissance, not production optimization. Auto-cleanup is correct. If results warrant promotion, the user runs `/pde:optimize` explicitly.

---

## Validation Architecture

Config has `workflow.nyquist_validation: true` — Nyquist validation is enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — tests run via `node --test tests/**/*.test.mjs` |
| Quick run command | `node --test tests/phase-105/*.test.mjs` |
| Full suite command | `node --test tests/**/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RSRCH-01 | `pde-phase-researcher.md` contains `--empirical` flag parsing documentation | structural | `node --test tests/phase-105/researcher-empirical-flag.test.mjs` | Wave 0 |
| RSRCH-01 | Empirical mode steps (E1-E8) are present in researcher agent definition | structural | `node --test tests/phase-105/researcher-empirical-flag.test.mjs` | Wave 0 |
| RSRCH-02 | `research-phase.md` contains keyword detection step (Step 3.5) | structural | `node --test tests/phase-105/empirical-routing.test.mjs` | Wave 0 |
| RSRCH-02 | Keyword list includes the strong optimization keywords | structural | `node --test tests/phase-105/empirical-routing.test.mjs` | Wave 0 |
| RSRCH-03 | `pde-phase-researcher.md` output format includes `## Experiments Attempted` section definition | structural | `node --test tests/phase-105/experiments-attempted-section.test.mjs` | Wave 0 |
| RSRCH-03 | "Experiments Attempted" section template contains all required fields (metric, iterations, table) | structural | `node --test tests/phase-105/experiments-attempted-section.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-105/*.test.mjs`
- **Per wave merge:** `node --test tests/**/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-105/researcher-empirical-flag.test.mjs` — covers RSRCH-01 (flag presence, empirical mode steps E1-E8 in agent definition)
- [ ] `tests/phase-105/empirical-routing.test.mjs` — covers RSRCH-02 (Step 3.5 in research-phase.md, keyword list)
- [ ] `tests/phase-105/experiments-attempted-section.test.mjs` — covers RSRCH-03 (output format section, required table fields)

All three tests are structural (file content checks, no runtime execution needed), matching the established pattern from Phase 104's `nyquist-metric.test.mjs`.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `~/.claude/agents/pde-phase-researcher.md` — full agent definition, execution flow, output format
- Direct inspection of `workflows/research-phase.md` — current researcher spawn logic
- Direct inspection of `agents/pde-experiment-runner.md` — existing runner agent interface and constraints
- Direct inspection of `bin/lib/experiment-runner.cjs` — `_evalMetric`, `_checkModifiedFiles`, `_writeJsonlRow`, `_extractDiff` signatures
- Direct inspection of `bin/lib/experiment-schema.cjs` — `parseExperimentFile`, `JSONL_ROW_FIELDS`, defaults
- Direct inspection of `workflows/optimize.md` — reference orchestration loop for empirical mode modeling
- Direct inspection of `templates/experiment.md` — canonical experiment.md format
- Direct inspection of `.planning/config.json` — `nyquist_validation: true` confirmed
- Direct inspection of `tests/phase-104/nyquist-metric.test.mjs` — test pattern reference

### Secondary (MEDIUM confidence)
- n/a — all findings from direct code inspection

### Tertiary (LOW confidence)
- n/a

---

## Metadata

**Confidence breakdown:**
- Architecture patterns: HIGH — derived directly from reading the agent definitions, workflows, and experiment infrastructure
- File change targets: HIGH — exact files identified and verified to exist
- Test patterns: HIGH — follows established Phase 104 structural test pattern exactly
- Keyword list for auto-routing: MEDIUM — "strong keyword" distinction is a judgment call; list is reasonable but not derived from empirical evidence

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable infrastructure — agent definitions and workflow prose change rarely)
