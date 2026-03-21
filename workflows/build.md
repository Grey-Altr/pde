<purpose>
Thin orchestrator that reads designCoverage from the design manifest, determines which of the TOTAL design stages are complete, skips them, and invokes each remaining stage in canonical order via flat Skill() calls. Adds no skill logic — all behavior lives in individual skill workflows. Supports verification gates between stages (interactive mode) and auto-continue (yolo mode). Resumes from last complete stage after interruption or crash.

Pipeline order: recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff

<!-- Experience product type — Phase 74 stub: the experience type follows the same stage progression as software. No new pipeline stages are added in Phase 74. Experience-specific stage behavior (floor plan at wireframe stage, production bible at handoff stage) is added in Phases 77-81. The --from stage names above remain valid for all product types including experience. -->
</purpose>

<required_reading>
@references/skill-style-guide.md
</required_reading>

<flags>
| Flag           | Description                                                                                                 |
|----------------|-------------------------------------------------------------------------------------------------------------|
| --from {stage} | Start pipeline at named stage, skipping all preceding stages. Valid names: recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff |
| --dry-run      | Show pipeline status (complete/pending/skipped per stage) without executing.                                |
| --quick        | Forwarded to sub-skills as passthrough arg (faster output mode).                                            |
| --verbose      | Forwarded to sub-skills as passthrough arg (detailed output mode).                                          |
| --force        | Forwarded to sub-skills as passthrough arg (skip confirmation gates).                                       |
</flags>

<process>

## STAGES Definition

Define the ordered STAGES list (defined once; all counts derived from this list):

| Index | Name        | Skill           | Check Method  | Check Field/Glob                                              |
|-------|-------------|-----------------|---------------|---------------------------------------------------------------|
| 1     | recommend   | pde:recommend   | coverage      | hasRecommendations                                            |
| 2     | competitive | pde:competitive | coverage      | hasCompetitive                                                |
| 3     | opportunity | pde:opportunity | coverage      | hasOpportunity                                                |
| 4     | ideate      | pde:ideate      | coverage+glob | hasIdeation + .planning/design/strategy/IDT-ideation-v*.md   |
| 5     | brief       | pde:brief       | glob          | .planning/design/strategy/BRF-brief-v*.md                    |
| 6     | system      | pde:system      | coverage      | hasDesignSystem                                               |
| 7     | flows       | pde:flows       | coverage      | hasFlows                                                      |
| 8     | wireframe   | pde:wireframe   | coverage      | hasWireframes                                                 |
| 9     | critique    | pde:critique    | coverage      | hasCritique                                                   |
| 10    | iterate     | pde:iterate     | coverage      | hasIterate (default false if absent)                          |
| 11    | mockup      | pde:mockup      | coverage      | hasMockup                                                     |
| 12    | hig         | pde:hig         | coverage      | hasHigAudit                                                   |
| 13    | handoff     | pde:handoff     | coverage      | hasHandoff                                                    |

`TOTAL = count(STAGES)` — used everywhere instead of any numeric literal.

---

## Step 1/4: Initialize and read configuration

Parse $ARGUMENTS for recognized flags. Build PASSTHROUGH_ARGS from flags present in $ARGUMENTS:
- Include --quick if present
- Include --verbose if present
- Include --force if present
- Do NOT include --dry-run in PASSTHROUGH_ARGS (it is orchestrator-only)
- Do NOT include --from in PASSTHROUGH_ARGS (it is orchestrator-only)

Read `.planning/config.json` via Read tool. Parse the `mode` field:
- "yolo" → MODE = yolo (auto-continue between stages)
- "interactive" → MODE = interactive (prompt between stages)
- "custom" or absent/null → MODE = yolo (default)

Parse --from flag from $ARGUMENTS:
```bash
FROM_STAGE=""
if echo "$ARGUMENTS" | grep -qE '\-\-from\s+\S+'; then
  FROM_STAGE=$(echo "$ARGUMENTS" | grep -oE '\-\-from\s+\S+' | awk '{print $2}')
fi
```

If FROM_STAGE is set:
  Look up FROM_STAGE in the STAGES list name column (case-sensitive match)
  If not found:
    Display error: "Unknown stage '{FROM_STAGE}'. Valid stages: recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff"
    HALT (error)
  Set FROM_INDEX = matched stage index (1-based)

Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs
```

Display: `Step 1/4: Initialized. Mode: {MODE}.`

If FROM_STAGE is set, also display: `Starting from stage: {FROM_STAGE} (stage {FROM_INDEX}/{TOTAL})`

---

## Step 2/4: Read pipeline state and determine pending stages

Run coverage check:
```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON result. Extract these fields (all boolean, default false if absent):
- `hasRecommendations` — Stage 1 complete flag
- `hasCompetitive` — Stage 2 complete flag
- `hasOpportunity` — Stage 3 complete flag
- `hasIdeation` — Stage 4 partial check (also needs Glob)
- `hasDesignSystem` — Stage 6 complete flag
- `hasFlows` — Stage 7 complete flag
- `hasWireframes` — Stage 8 complete flag
- `hasCritique` — Stage 9 complete flag
- `hasIterate` — Stage 10 complete flag (default to false if absent — added at runtime by /pde:iterate)
- `hasMockup` — Stage 11 complete flag
- `hasHigAudit` — Stage 12 complete flag
- `hasHandoff` — Stage 13 complete flag

Check brief completion via Glob on `.planning/design/strategy/BRF-brief-v*.md`. If any file is found, BRIEF_DONE = true. If no files found, BRIEF_DONE = false.

Check ideate completion: IDEATE_DONE = (hasIdeation == true) AND (Glob on `.planning/design/strategy/IDT-ideation-v*.md` returns at least one file). Both conditions must be true.

Build the stage status table (TOTAL stages). For each stage, status is:
- "skipped (--from {FROM_STAGE})" if FROM_INDEX is set and this stage's index < FROM_INDEX
- "complete" if the stage's check passes
- "pending" otherwise

| Stage            | Skill            | Check                                          | Status                         |
|------------------|------------------|------------------------------------------------|-------------------------------|
| 1/{TOTAL}        | /pde:recommend   | hasRecommendations                             | complete / pending / skipped   |
| 2/{TOTAL}        | /pde:competitive | hasCompetitive                                 | complete / pending / skipped   |
| 3/{TOTAL}        | /pde:opportunity | hasOpportunity                                 | complete / pending / skipped   |
| 4/{TOTAL}        | /pde:ideate      | hasIdeation + IDT-ideation-v*.md               | complete / pending / skipped   |
| 5/{TOTAL}        | /pde:brief       | Glob BRF-brief-v*.md                           | complete / pending / skipped   |
| 6/{TOTAL}        | /pde:system      | hasDesignSystem                                | complete / pending / skipped   |
| 7/{TOTAL}        | /pde:flows       | hasFlows                                       | complete / pending / skipped   |
| 8/{TOTAL}        | /pde:wireframe   | hasWireframes                                  | complete / pending / skipped   |
| 9/{TOTAL}        | /pde:critique    | hasCritique                                    | complete / pending / skipped   |
| 10/{TOTAL}       | /pde:iterate     | hasIterate                                     | complete / pending / skipped   |
| 11/{TOTAL}       | /pde:mockup      | hasMockup                                      | complete / pending / skipped   |
| 12/{TOTAL}       | /pde:hig         | hasHigAudit                                    | complete / pending / skipped   |
| {TOTAL}/{TOTAL}  | /pde:handoff     | hasHandoff                                     | complete / pending / skipped   |

Display the table with actual status for each stage.

Count completed stages (N) and pending stages — excluding skipped-by-from stages from the pending count.

If ALL stages are complete (or complete + skipped by --from):
- Display: `All {TOTAL} stages complete. Pipeline finished.`
- Display: `Design artifacts are in .planning/design/. Run /pde:handoff --verbose to review the implementation spec.`
- HALT (success — nothing to do)

If --dry-run flag was present:
- Display the table showing complete/pending/skipped status
- Display: `Dry-run mode -- no stages executed.`
- HALT (no execution)

Display: `Step 2/4: Pipeline state loaded. {N}/{TOTAL} stages complete, {pending_count} pending.`

---

## Step 3/4: Execute pending stages in order

Process each stage from 1 to TOTAL in strict sequential order. For each stage:

**If FROM_INDEX is set AND stage index < FROM_INDEX:**
- Display: `Stage {N}/{TOTAL}: /pde:{skill} -- skipped (--from {FROM_STAGE})`
- Continue to next stage

**If stage is already complete:**
- Display: `Stage {N}/{TOTAL}: /pde:{skill} -- skipped (complete)`
- Continue to next stage

**If stage is pending:**

Display: `Stage {N}/{TOTAL}: Running /pde:{skill}...`

Invoke each skill using the flat Skill() invocation pattern. Do not use the Task tool — see anti-patterns section for the reasoning (issue #686):

- Stage 1/{TOTAL}: `Skill(skill="pde:recommend", args="${PASSTHROUGH_ARGS}")`
- Stage 2/{TOTAL}: `Skill(skill="pde:competitive", args="${PASSTHROUGH_ARGS}")`
- Stage 3/{TOTAL}: `Skill(skill="pde:opportunity", args="${PASSTHROUGH_ARGS}")`
- Stage 4/{TOTAL}: `Skill(skill="pde:ideate", args="${PASSTHROUGH_ARGS}")`
- Stage 5/{TOTAL}: `Skill(skill="pde:brief", args="${PASSTHROUGH_ARGS}")`
- Stage 6/{TOTAL}: `Skill(skill="pde:system", args="${PASSTHROUGH_ARGS}")`
- Stage 7/{TOTAL}: `Skill(skill="pde:flows", args="${PASSTHROUGH_ARGS}")`
- Stage 8/{TOTAL}: `Skill(skill="pde:wireframe", args="${PASSTHROUGH_ARGS}")`
- Stage 9/{TOTAL}: `Skill(skill="pde:critique", args="${PASSTHROUGH_ARGS}")`
- Stage 10/{TOTAL}: `Skill(skill="pde:iterate", args="${PASSTHROUGH_ARGS}")`
- Stage 11/{TOTAL}: `Skill(skill="pde:mockup", args="${PASSTHROUGH_ARGS}")`
- Stage 12/{TOTAL}: `Skill(skill="pde:hig", args="${PASSTHROUGH_ARGS}")`
- Stage 13/{TOTAL}: `Skill(skill="pde:handoff", args="${PASSTHROUGH_ARGS}")`

Note: `pde:hig` receives NO `--light` flag. PASSTHROUGH_ARGS contains only --quick/--verbose/--force. HIG runs in full standalone mode from the pipeline.

After Skill returns, display: `Stage {N}/{TOTAL}: /pde:{skill} -- done.`

**Verification gate** (only between stages, not after the last stage):

After completing Stage N (where N < TOTAL), determine next stage and apply gate:

- If MODE == "interactive":
  - Use AskUserQuestion with:
    - question: `Stage {N}/{TOTAL} (/pde:{skill}) complete. Continue to Stage {N+1}/{TOTAL} (/pde:{next_skill})?`
    - options: ["Continue", "Stop here"]
  - If user selects "Stop here":
    - Display: `Pipeline paused after Stage {N}/{TOTAL}. Resume: run /pde:build again (completed stages are skipped automatically).`
    - HALT

- If MODE != "interactive" (yolo or custom):
  - Display: `[{MODE}] Advancing to Stage {N+1}/{TOTAL}...`
  - Continue automatically

---

## Step 4/4: Pipeline complete

Display: `Step 4/4: Pipeline complete. All {TOTAL} stages finished.`

Display final summary:

```
Pipeline summary:
  Stage 1/{TOTAL}: /pde:recommend   -- done
  Stage 2/{TOTAL}: /pde:competitive -- done
  Stage 3/{TOTAL}: /pde:opportunity -- done
  Stage 4/{TOTAL}: /pde:ideate      -- done
  Stage 5/{TOTAL}: /pde:brief       -- done
  Stage 6/{TOTAL}: /pde:system      -- done
  Stage 7/{TOTAL}: /pde:flows       -- done
  Stage 8/{TOTAL}: /pde:wireframe   -- done
  Stage 9/{TOTAL}: /pde:critique    -- done
  Stage 10/{TOTAL}: /pde:iterate    -- done
  Stage 11/{TOTAL}: /pde:mockup     -- done
  Stage 12/{TOTAL}: /pde:hig        -- done
  Stage {TOTAL}/{TOTAL}: /pde:handoff -- done
```

Display: `Design artifacts are in .planning/design/. Run /pde:handoff --verbose to review the implementation spec.`

</process>

<anti_patterns>
CRITICAL anti-patterns — NEVER do these:

1. NEVER use the Task tool for skill invocation. Always use Skill(). Issue #686 causes execution freezes with nested Task agents. The flat Skill() invocation pattern is the only correct approach.

2. NEVER write to the design manifest. Each skill owns its own coverage flag and sets it after completion. The orchestrator is strictly read-only. Do not call any manifest-writing CLI commands (e.g. the manifest update subcommands) — doing so would clobber flags set by other skills.

3. NEVER look for a brief-complete flag in the coverage JSON. No such flag exists — the brief coverage field was removed from the schema in Phase 15.1. Always determine whether Stage 5 is complete by running Glob on `.planning/design/strategy/BRF-brief-v*.md`. If any files are found, the brief stage is complete.

4. NEVER assume `hasIterate` exists in the coverage JSON — it is added at runtime by /pde:iterate. Default to false if the field is absent.

5. NEVER pass mode flags (--yolo, --interactive) to sub-skills. Each skill reads config.json independently. Only pass --quick, --verbose, --force as PASSTHROUGH_ARGS.

6. NEVER skip stages out of order. Even if a later stage is flagged complete, execute all stages in strict sequential order (1 to TOTAL), skipping already-complete ones individually.

7. NEVER re-read coverage-check between stages. Read it once at the start of Step 2/4 to determine the initial pipeline state. Each skill updates the manifest when it finishes; re-reading mid-pipeline would cause false-complete readings on the current run.

8. NEVER pass --light to /pde:hig when invoked from the pipeline. HIG runs full standalone mode (not --light). Light mode is only for /pde:critique delegation.

9. NEVER write a bare digit (like 7 or 13) in any stage progress message. Always reference TOTAL (the computed count of the STAGES list). This ensures future pipeline expansions require no message text changes.

10. NEVER forward --from or --dry-run to sub-skills via PASSTHROUGH_ARGS. Both are orchestrator-only flags.

</anti_patterns>

<crash_recovery>
Crash recovery behavior:
- If the pipeline is interrupted mid-stage (e.g., Claude session ends), the incomplete stage has NOT set its coverage flag (each skill sets its flag at the end)
- On re-run, coverage-check returns the same state as before the crash
- The orchestrator re-runs the interrupted stage from scratch (each skill is idempotent — it safely overwrites partial output)
- Completed stages remain flagged and are skipped automatically
- No orchestrator-specific recovery state is needed — designCoverage is the single source of truth
- TOTAL stages are evaluated on every run; additions to the STAGES list take effect immediately on next run
</crash_recovery>

<usage_examples>
Common invocation patterns:

**Full pipeline run (yolo mode — default):**
```
/pde:build
```
Runs all TOTAL stages in order. Skips any already-complete stages. Auto-continues between stages.

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
Displays the stage table (complete/pending/skipped) and halts. No skills invoked.

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

**Start from a specific stage:**
```
/pde:build --from wireframe
```
Skips stages 1-7 (recommend through flows), begins execution at wireframe. Skipped stages are not checked for completion.

**Preview pipeline from a specific stage:**
```
/pde:build --from wireframe --dry-run
```
Shows all stages with skipped/complete/pending status, starting execution point at wireframe. No skills invoked.
</usage_examples>
