<purpose>
Thin orchestrator that reads designCoverage from the design manifest, determines which of the 7 design stages are complete, skips them, and invokes each remaining stage in canonical order via flat Skill() calls. Adds no skill logic — all behavior lives in individual skill workflows. Supports verification gates between stages (interactive mode) and auto-continue (yolo mode). Resumes from last complete stage after interruption or crash.

Pipeline order: brief → system → flows → wireframe → critique → iterate → handoff
</purpose>

<required_reading>
@references/skill-style-guide.md
</required_reading>

<flags>
| Flag        | Description                                                           |
|-------------|-----------------------------------------------------------------------|
| --dry-run   | Show pipeline status (complete/pending per stage) without executing.  |
| --quick     | Forwarded to sub-skills as passthrough arg (faster output mode).      |
| --verbose   | Forwarded to sub-skills as passthrough arg (detailed output mode).    |
| --force     | Forwarded to sub-skills as passthrough arg (skip confirmation gates). |
</flags>

<process>

## Step 1/4: Initialize and read configuration

Parse $ARGUMENTS for recognized flags. Build PASSTHROUGH_ARGS from flags present in $ARGUMENTS:
- Include --quick if present
- Include --verbose if present
- Include --force if present
- Do NOT include --dry-run in PASSTHROUGH_ARGS (it is orchestrator-only)

Read `.planning/config.json` via Read tool. Parse the `mode` field:
- "yolo" → MODE = yolo (auto-continue between stages)
- "interactive" → MODE = interactive (prompt between stages)
- "custom" or absent/null → MODE = yolo (default)

Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs
```

Display: `Step 1/4: Initialized. Mode: {MODE}.`

---

## Step 2/4: Read pipeline state and determine pending stages

Run coverage check:
```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON result. Extract these fields (all boolean):
- `hasDesignSystem` — Stage 2 complete flag
- `hasFlows` — Stage 3 complete flag
- `hasWireframes` — Stage 4 complete flag
- `hasCritique` — Stage 5 complete flag
- `hasIterate` — Stage 6 complete flag (default to false if absent — added at runtime by /pde:iterate)
- `hasHandoff` — Stage 7 complete flag

Check brief completion via Glob on `.planning/design/strategy/BRF-brief-v*.md`. If any file is found, BRIEF_DONE = true. If no files found, BRIEF_DONE = false.

Build the stage status table (7 stages):

| Stage | Skill         | Check                           | Status             |
|-------|---------------|---------------------------------|--------------------|
| 1/7   | /pde:brief    | Glob BRF-brief-v*.md            | complete / pending |
| 2/7   | /pde:system   | hasDesignSystem                 | complete / pending |
| 3/7   | /pde:flows    | hasFlows                        | complete / pending |
| 4/7   | /pde:wireframe| hasWireframes                   | complete / pending |
| 5/7   | /pde:critique | hasCritique                     | complete / pending |
| 6/7   | /pde:iterate  | hasIterate                      | complete / pending |
| 7/7   | /pde:handoff  | hasHandoff                      | complete / pending |

Display the table with actual complete/pending status for each stage.

Count completed stages (N) and pending stages (7 - N).

If ALL 7 stages are complete:
- Display: `All 7 stages complete. Pipeline finished.`
- Display: `Design artifacts are in .planning/design/. Run /pde:handoff --verbose to review the implementation spec.`
- HALT (success — nothing to do)

If --dry-run flag was present:
- Display the table showing complete/pending status
- Display: `Dry-run mode — no stages executed.`
- HALT (no execution)

Display: `Step 2/4: Pipeline state loaded. {N}/7 stages complete, {7-N} pending.`

---

## Step 3/4: Execute pending stages in order

Process each stage from 1 to 7 in strict sequential order. For each stage:

**If stage is already complete:**
- Display: `Stage {N}/7: /pde:{skill} — skipped (complete)`
- Continue to next stage

**If stage is pending:**

Display: `Stage {N}/7: Running /pde:{skill}...`

Invoke each skill using the flat Skill() invocation pattern. Do not use the Task tool — see anti-patterns section for the reasoning (issue #686):

- Stage 1/7: `Skill(skill="pde:brief", args="${PASSTHROUGH_ARGS}")`
- Stage 2/7: `Skill(skill="pde:system", args="${PASSTHROUGH_ARGS}")`
- Stage 3/7: `Skill(skill="pde:flows", args="${PASSTHROUGH_ARGS}")`
- Stage 4/7: `Skill(skill="pde:wireframe", args="${PASSTHROUGH_ARGS}")`
- Stage 5/7: `Skill(skill="pde:critique", args="${PASSTHROUGH_ARGS}")`
- Stage 6/7: `Skill(skill="pde:iterate", args="${PASSTHROUGH_ARGS}")`
- Stage 7/7: `Skill(skill="pde:handoff", args="${PASSTHROUGH_ARGS}")`

After Skill returns, display: `Stage {N}/7: /pde:{skill} — done.`

**Verification gate** (only between stages, not after Stage 7/7):

After completing Stage N (where N < 7), determine next stage and apply gate:

- If MODE == "interactive":
  - Use AskUserQuestion with:
    - question: `Stage {N}/7 (/pde:{skill}) complete. Continue to Stage {N+1}/7 (/pde:{next_skill})?`
    - options: ["Continue", "Stop here"]
  - If user selects "Stop here":
    - Display: `Pipeline paused after Stage {N}/7. Resume: run /pde:build again (completed stages are skipped automatically).`
    - HALT

- If MODE != "interactive" (yolo or custom):
  - Display: `[{MODE}] Advancing to Stage {N+1}/7...`
  - Continue automatically

**Next-stage name lookup** for gate messages:

| Current | Next |
|---------|------|
| 1/7 brief | 2/7 system |
| 2/7 system | 3/7 flows |
| 3/7 flows | 4/7 wireframe |
| 4/7 wireframe | 5/7 critique |
| 5/7 critique | 6/7 iterate |
| 6/7 iterate | 7/7 handoff |

---

## Step 4/4: Pipeline complete

Display: `Step 4/4: Pipeline complete. All 7 stages finished.`

Display final summary:

```
Pipeline summary:
  Stage 1/7: /pde:brief     — done
  Stage 2/7: /pde:system    — done
  Stage 3/7: /pde:flows     — done
  Stage 4/7: /pde:wireframe — done
  Stage 5/7: /pde:critique  — done
  Stage 6/7: /pde:iterate   — done
  Stage 7/7: /pde:handoff   — done
```

Display: `Design artifacts are in .planning/design/. Run /pde:handoff --verbose to review the implementation spec.`

</process>

<anti_patterns>
CRITICAL anti-patterns — NEVER do these:

1. NEVER use the Task tool for skill invocation. Always use Skill(). Issue #686 causes execution freezes with nested Task agents. The flat Skill() invocation pattern is the only correct approach.

2. NEVER write to the design manifest. Each skill owns its own coverage flag and sets it after completion. The orchestrator is strictly read-only. Do not call any manifest-writing CLI commands (e.g. the manifest update subcommands) — doing so would clobber flags set by other skills.

3. NEVER look for a brief-complete flag in the coverage JSON. No such flag exists — the brief coverage field was removed from the schema in Phase 15.1. Always determine whether Stage 1 is complete by running Glob on `.planning/design/strategy/BRF-brief-v*.md`. If any files are found, the brief stage is complete.

4. NEVER assume `hasIterate` exists in the coverage JSON — it is added at runtime by /pde:iterate. Default to false if the field is absent.

5. NEVER pass mode flags (--yolo, --interactive) to sub-skills. Each skill reads config.json independently. Only pass --quick, --verbose, --force as PASSTHROUGH_ARGS.

6. NEVER skip stages out of order. Even if a later stage is flagged complete, execute all stages in strict sequential order (1→7), skipping already-complete ones individually.

7. NEVER re-read coverage-check between stages. Read it once at the start of Step 2/4 to determine the initial pipeline state. Each skill updates the manifest when it finishes; re-reading mid-pipeline would cause false-complete readings on the current run.

</anti_patterns>

<crash_recovery>
Crash recovery behavior:
- If the pipeline is interrupted mid-stage (e.g., Claude session ends), the incomplete stage has NOT set its coverage flag (each skill sets its flag at the end)
- On re-run, coverage-check returns the same state as before the crash
- The orchestrator re-runs the interrupted stage from scratch (each skill is idempotent — it safely overwrites partial output)
- Completed stages remain flagged and are skipped automatically
- No orchestrator-specific recovery state is needed — designCoverage is the single source of truth
</crash_recovery>

<usage_examples>
Common invocation patterns:

**Full pipeline run (yolo mode — default):**
```
/pde:build
```
Runs all 7 stages in order. Skips any already-complete stages. Auto-continues between stages.

**Full pipeline run (interactive mode — prompt between stages):**
Set `.planning/config.json` `mode` to "interactive", then:
```
/pde:build
```
Prompts user to confirm each stage transition. Allows stopping after any stage.

**Check pipeline status without executing:**
```
/pde:build --dry-run
```
Displays the stage table (complete/pending) and halts. No skills invoked.

**Resume after interruption:**
```
/pde:build
```
Same command as a fresh run — the orchestrator reads coverage state on startup and automatically skips completed stages. No special resume flag needed.

**Pass quick mode to all sub-skills:**
```
/pde:build --quick
```
Forwards --quick to every skill invocation via PASSTHROUGH_ARGS.

**Force re-run all stages:**
```
/pde:build --force
```
Forwards --force to each skill. Individual skills decide whether --force triggers re-generation of existing artifacts.
</usage_examples>
