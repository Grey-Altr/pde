<purpose>
Research how to implement a phase. Spawns pde-phase-researcher with phase context.

Standalone research command. For most workflows, use `/pde:plan-phase` which integrates research automatically.
</purpose>

<process>

## Step 0: Resolve Model Profile

@${CLAUDE_PLUGIN_ROOT}/references/model-profile-resolution.md

Resolve model for:
- `pde-phase-researcher`

## Step 1: Normalize and Validate Phase

@${CLAUDE_PLUGIN_ROOT}/references/phase-argument-parsing.md

```bash
PHASE_INFO=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" roadmap get-phase "${PHASE}")
```

If `found` is false: Error and exit.

## Step 2: Check Existing Research

```bash
ls .planning/phases/${PHASE}-*/RESEARCH.md 2>/dev/null
```

If exists: Offer update/view/skip options.

## Step 2.5: Detect Empirical Mode

Read the phase CONTEXT.md (if it exists) and the ROADMAP phase goal description to detect whether this is an optimization-focused phase:

```bash
cat .planning/phases/${PHASE}-*/CONTEXT.md 2>/dev/null | head -80
```

Also read the ROADMAP phase goal from the `PHASE_INFO` extracted in Step 1 (the `goal` or `description` field).

Check if **2 or more** of these keywords appear (case-insensitive) in the combined CONTEXT.md content + phase goal:

- `optimize` / `optimization`
- `experiment` / `experimentation`
- `empirical`
- `autoresearch` / `auto-research`
- `benchmark` / `benchmarking`
- `metric` / `metrics`
- `iteration budget` / `iteration loop`
- `self-improvement` / `self-optimize`

If 2 or more keywords match:
- Set `EMPIRICAL_MODE=true`
- Display: "Empirical mode detected: optimization/experiment keywords found in phase context. Will spawn pde-phase-researcher --empirical."

Otherwise:
- Set `EMPIRICAL_MODE=false`
- (Standard desk research mode — no display needed)

## Step 3: Gather Phase Context

```bash
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" init phase-op "${PHASE}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
# Extract: phase_dir, padded_phase, phase_number, state_path, requirements_path, context_path
```

## Step 4: Spawn Researcher

If `EMPIRICAL_MODE` is true, include the empirical mode instruction in the prompt:

```
Task(
  prompt="<objective>
Research implementation approach for Phase {phase}: {name}
</objective>

<files_to_read>
- {context_path} (USER DECISIONS from /pde:discuss-phase)
- {requirements_path} (Project requirements)
- {state_path} (Project decisions and history)
</files_to_read>

<additional_context>
Phase description: {description}
</additional_context>

[IF EMPIRICAL_MODE=true, add:]
Mode: --empirical. In addition to the standard RESEARCH.md, produce a try_candidates list with specific bounded mutations to test in the experiment loop. Each candidate must specify mutable_files, change_summary, expected_delta, and confidence (HIGH/MEDIUM/LOW). RESEARCH.md must include an 'Experiments Attempted' placeholder section with table headers. Return the JSON block with try_candidates as the final content in your response.
[END IF]

<output>
Write to: .planning/phases/${PHASE}-{slug}/${PHASE}-RESEARCH.md
</output>",
  subagent_type="pde-phase-researcher",
  model="{researcher_model}"
)
```

## Step 5: Handle Return

**Standard mode** (`EMPIRICAL_MODE=false`):
- `## RESEARCH COMPLETE` — Display summary, offer: Plan/Dig deeper/Review/Done
- `## CHECKPOINT REACHED` — Present to user, spawn continuation
- `## RESEARCH INCONCLUSIVE` — Show attempts, offer: Add context/Try different mode/Manual

**Empirical mode** (`EMPIRICAL_MODE=true`):
- Parse the final JSON code block from the researcher's response
- Extract `try_candidates` array
- Store candidates for the calling optimize workflow to consume (if invoked from optimize.md)
- Display: "Empirical research complete. {N} candidates generated. RESEARCH.md written with 'Experiments Attempted' placeholder."
- Offer: Run experiment loop with these candidates / Review candidates / Done

</process>
