# Phase 5: Agent System — Research

**Researched:** 2026-03-14
**Domain:** Claude Code plugin agent type registry, model resolution, parallel wave orchestration, path correctness
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGNT-01 | All GSD agent types functional with PDE naming (pde-project-researcher, pde-planner, etc.) | MODEL_PROFILES table in core.cjs already defines all 12 PDE agent types. All workflow files already use `subagent_type="pde-*"` identifiers. Zero GSD agent names found in source. This requirement is ALREADY MET — plan must verify/confirm rather than implement. |
| AGNT-02 | Parallel agent orchestration with wave execution operates correctly | execute-phase.md implements wave-based parallel execution using Task with no `run_in_background`. map-codebase.md uses `run_in_background=true` for 4 simultaneous mappers. Both patterns already use PDE agent types. Smoke test required to confirm wave 1 → wait → wave 2 sequencing works end-to-end. |
| AGNT-03 | Phase-aware research agents spawn before planning when configured | plan-phase.md step 5 checks `research_enabled` from init JSON (backed by config.json `workflow.research` field, default `true`). When true and no existing RESEARCH.md, spawns `pde-phase-researcher`. config.json has `"research": true` currently. Verification: confirm `"research": false` in config.json correctly suppresses researcher spawn. |
| AGNT-04 | Model selection works via config.json model_profile setting | `resolveModelInternal()` in core.cjs reads `model_profile` from config.json and looks up the agent type in `MODEL_PROFILES`. Returns `'inherit'` for opus (inherits parent model), or the string value. `init` commands pre-compute all model fields (researcher_model, planner_model, etc.) via resolveModelInternal. Smoke test: change model_profile to "budget", run `resolve-model pde-planner --raw`, verify "haiku" returned. |
| AGNT-05 | Agent spawning uses correct PDE paths (not GSD paths) | All workflow .md files use `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs` and `${CLAUDE_PLUGIN_ROOT}/workflows/` paths. Zero GSD path strings found in any workflow or bin file. This requirement is ALREADY MET — plan must grep-verify and document. |
</phase_requirements>

---

## Summary

Phase 5 is primarily a **verification phase**. The agent system infrastructure is already in place: all 12 PDE agent types are defined in `MODEL_PROFILES` in `bin/lib/core.cjs`, all workflow files reference `subagent_type="pde-*"` identifiers, model resolution routes through `resolveModelInternal()`, and all paths use `${CLAUDE_PLUGIN_ROOT}`. No GSD agent names or paths were found anywhere in the source tree.

The four requirements decompose into two categories: (1) confirmation that existing code is correct — AGNT-01, AGNT-05, and the model resolution path in AGNT-04 — and (2) behavioral smoke tests that require actually running the workflows — AGNT-02 (parallel waves complete without collision) and AGNT-03 (research toggle gates researcher spawn correctly).

The key risk is that "functional" in AGNT-01 means agents actually complete tasks, not just that the identifier strings are present. Claude Code resolves `subagent_type` to agent role prompts based on the string value — if the identifier changed from a GSD value that Claude Code knew about to a PDE value, the agent may receive a generic prompt. However, Claude Code's Task tool uses `subagent_type` as a role hint passed in the system prompt; it does not hard-code specific strings in a registry file the developer controls. The actual agent behavior is determined by the workflow prompt content, not the subagent_type string alone. This means the rename from `gsd-*` to `pde-*` has no functional impact on agent behavior — it only affects labeling in Claude Code's internal tracking.

**Primary recommendation:** Phase 5 plans are smoke tests and grep-verification tasks. Plan 05-01 (rename verification) and 05-02 (registry/model-profiles check) are read-only audits. Plans 05-03 and 05-04 are live execution smoke tests. All four plans should produce clear PASS/FAIL evidence logged in their SUMMARY.md files.

---

## Standard Stack

### Core Components (Already Implemented)
| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `MODEL_PROFILES` table | `bin/lib/core.cjs` lines 18-31 | Defines model tiers for all 12 PDE agent types | Complete — all pde-* names present |
| `resolveModelInternal()` | `bin/lib/core.cjs` lines 367-382 | Looks up model_profile → agent tier → model string | Complete — handles overrides and opus→inherit mapping |
| `loadConfig()` | `bin/lib/core.cjs` lines 68-130 | Reads config.json, applies defaults, handles legacy `depth` key | Complete — `research` default is `true` |
| `cmdInitPlanPhase()` | `bin/lib/init.cjs` lines 83-160 | Returns `research_enabled` and all pre-resolved model names | Complete — uses resolveModelInternal for each agent type |
| Wave execution loop | `workflows/execute-phase.md` step `execute_waves` | Spawns Task agents per-wave, waits for completion before next wave | Complete — uses pde-executor and pde-verifier |
| Parallel mapper pattern | `workflows/map-codebase.md` step `spawn_agents` | Spawns 4 pde-codebase-mapper agents with `run_in_background=true` | Complete — confirms parallel Task pattern works |

### Agent Type Registry (12 Types in MODEL_PROFILES)
| Agent Type | Quality | Balanced | Budget | Primary Workflow |
|------------|---------|----------|--------|-----------------|
| pde-planner | opus | opus | sonnet | plan-phase.md |
| pde-roadmapper | opus | sonnet | sonnet | new-project.md, new-milestone.md |
| pde-executor | opus | sonnet | sonnet | execute-phase.md, execute-plan.md |
| pde-phase-researcher | opus | sonnet | haiku | plan-phase.md, research-phase.md |
| pde-project-researcher | opus | sonnet | haiku | new-project.md, new-milestone.md |
| pde-research-synthesizer | sonnet | sonnet | haiku | new-project.md, new-milestone.md |
| pde-debugger | opus | sonnet | sonnet | diagnose-issues.md |
| pde-codebase-mapper | sonnet | haiku | haiku | map-codebase.md |
| pde-verifier | sonnet | sonnet | haiku | execute-phase.md |
| pde-plan-checker | sonnet | sonnet | haiku | plan-phase.md, verify-work.md |
| pde-integration-checker | sonnet | sonnet | haiku | audit-milestone.md |
| pde-nyquist-auditor | sonnet | sonnet | haiku | validate-phase.md |

### Model Resolution Logic
```
config.json model_profile = "balanced" (default)
→ resolveModelInternal(cwd, "pde-planner")
→ MODEL_PROFILES["pde-planner"]["balanced"] = "opus"
→ "opus" === "opus" → return "inherit"
```

```
config.json model_profile = "budget"
→ resolveModelInternal(cwd, "pde-planner")
→ MODEL_PROFILES["pde-planner"]["budget"] = "sonnet"
→ return "sonnet"
```

Per-agent overrides via `model_overrides` in config.json take priority:
```json
{ "model_overrides": { "pde-planner": "sonnet" } }
```
→ Returns "sonnet" regardless of model_profile (unless override is "opus" → returns "inherit").

---

## Architecture Patterns

### Pattern 1: Wave-Based Parallel Execution (execute-phase.md)

**What:** The orchestrator groups plans by `wave` number from plan frontmatter. Within each wave, all plans spawn as Task agents concurrently. The orchestrator waits for ALL agents in a wave to complete before proceeding to wave N+1.

**How it works today:**
```
Wave 1: Task(pde-executor, plan 05-01) ─┐
        Task(pde-executor, plan 05-02) ─┤─ both run concurrently ─┐
                                         └─────────────────────────┤
Wave 2: Task(pde-executor, plan 05-03) <─ only starts after wave 1 complete
```

**Key detail:** The orchestrator spawns all wave N tasks, then waits (Task calls block). No `run_in_background=true` is used for plan execution — only for codebase mapper. This means true parallelism in execute-phase relies on Claude Code running multiple Task calls concurrently in a single message.

**Collision prevention:** Each plan writes to its own `{phase_dir}/{plan_id}-SUMMARY.md` file. Plans in the same wave must target non-overlapping files. Plans in wave 2+ can modify files written by wave 1 plans because wave sequencing ensures no overlap.

### Pattern 2: Background Parallel Agents (map-codebase.md)

**What:** All 4 mapper agents spawn with `run_in_background=true`. The orchestrator then waits for all agents' output files to appear, rather than waiting for Task returns.

**When to use:** Only when agents write to disk directly and the orchestrator needs no return value beyond a signal. Not appropriate for executor agents that return SUMMARY.md paths.

### Pattern 3: Research-Gated Planning (plan-phase.md)

**What:** `research_enabled` from init JSON gates whether a `pde-phase-researcher` spawns before `pde-planner`. The config.json `workflow.research` field (default `true`) controls this.

**Gate logic (init.cjs):**
```javascript
research_enabled: config.research,  // from loadConfig()
```

**loadConfig() default:**
```javascript
research: true,  // if not in config.json
```

**plan-phase.md check (step 5):**
```
Skip if: --gaps flag, --skip-research flag, or research_enabled is false
```

### Pattern 4: Model Passed as Task Parameter

**What:** The orchestrator resolves the model string before spawning. The `model` field in Task() receives the pre-resolved string (e.g., "sonnet", "haiku", or "inherit").

**Source (init.cjs):**
```javascript
executor_model: resolveModelInternal(cwd, 'pde-executor'),
planner_model: resolveModelInternal(cwd, 'pde-planner'),
```

**Usage in workflow:**
```
Task(
  subagent_type="pde-executor",
  model="{executor_model}",   // pre-resolved by init
  ...
)
```

### Anti-Patterns to Avoid
- **Using `gsd-*` subagent_type identifiers:** All identifiers must use `pde-*` prefix. Zero occurrences found currently — maintain this.
- **Hardcoding model strings in workflows:** Model resolution must always go through `resolveModelInternal()` → pre-computed in init. Never hardcode "sonnet" directly in a workflow.
- **Skipping the init call:** Workflows that bypass `pde-tools init` miss pre-computed model resolution and config flags. Every workflow starts with an init call.
- **run_in_background for executor agents:** Executor agents return structured output the orchestrator needs. Background mode loses that return value. Only use for fire-and-check patterns (codebase mapper).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model selection logic | Custom if/else in workflow | `resolveModelInternal()` via `pde-tools resolve-model` | Handles override priority, opus→inherit mapping, unknown-agent fallback |
| Config reading in workflows | Direct JSON parse in bash | `pde-tools init <op>` | Init pre-computes all derived values; direct config reads miss defaults and legacy migration |
| Wave grouping logic | Custom plan-sorting code | Plan frontmatter `wave:` field + `pde-tools phase-plan-index` | pde-tools handles sorting, has_summary filtering, checkpoint detection |

---

## Common Pitfalls

### Pitfall 1: Mistaking subagent_type for a Claude Code Registry
**What goes wrong:** Assuming Claude Code has a hard-coded registry of valid `subagent_type` strings that must exactly match predefined values.
**Why it happens:** The term "agent type" implies a registry lookup.
**Reality:** Claude Code uses `subagent_type` as a role label passed in the agent's system context. The label informs the agent's persona but does not gate execution. A `pde-executor` agent behaves as executor because the workflow prompt defines executor behavior — not because "pde-executor" is registered somewhere.
**How to avoid:** Don't look for an agents registry file; there isn't one. The MODEL_PROFILES table in core.cjs is the PDE-internal registry for model selection only.

### Pitfall 2: Assuming resolve-model Returns the Model Name Directly for Opus
**What goes wrong:** Code calls `resolve-model pde-planner` expecting "opus" and gets "inherit" instead.
**Why it happens:** `resolveModelInternal()` maps "opus" → "inherit" to signal the agent should inherit its parent's model rather than downgrade.
**How to avoid:** When using resolve-model output as a Task `model` parameter, "inherit" is a valid value meaning "use parent model." Do not treat "inherit" as an error.

### Pitfall 3: Collisions When Multiple Wave-1 Plans Modify the Same File
**What goes wrong:** Two plans in the same wave both write to STATE.md or ROADMAP.md, causing a merge conflict or one overwriting the other's changes.
**Why it happens:** Wave parallelism means both agents run simultaneously with no locking.
**How to avoid:** Plans in the same wave must target different files. Plans that write to STATE.md, ROADMAP.md, or REQUIREMENTS.md must be in different waves or the same plan. The current plan structure (05-01: rename audit, 05-02: registry audit, 05-03: parallel execution smoke test, 05-04: model selection smoke test) avoids this — smoke tests are read-only or isolated.

### Pitfall 4: Treating "research: false" as Suppressing All Research
**What goes wrong:** Setting `"research": false` in config.json and expecting it prevents ALL research, including `--research` flag overrides.
**Why it happens:** The flag name implies a global toggle.
**Reality:** `--research` flag in the plan-phase invocation overrides `research_enabled: false`. The skip condition is: `--gaps OR --skip-research OR (research_enabled is false AND no --research flag)`.

### Pitfall 5: The classifyHandoffIfNeeded False Failure
**What goes wrong:** An executor agent reports "failed" with `classifyHandoffIfNeeded is not defined` error.
**Why it happens:** This is a Claude Code runtime bug — it fires in the completion handler AFTER all tool calls finish successfully.
**How to avoid:** Already documented in execute-phase.md failure_handling section. When this error occurs, run spot-checks (SUMMARY.md exists, git commits present). If spot-checks pass, treat as successful.

---

## Code Examples

### Model Resolution Smoke Test
```bash
# Source: bin/lib/core.cjs resolveModelInternal()
# With default balanced profile:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-planner --raw
# Expected: "inherit" (balanced→opus→inherit)

node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-codebase-mapper --raw
# Expected: "haiku" (balanced→haiku)

# With budget profile (override config.json):
# Set "model_profile": "budget" in .planning/config.json, then:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-planner --raw
# Expected: "sonnet" (budget→sonnet)
```

### Research Enable/Disable Verification
```bash
# Source: bin/lib/init.cjs cmdInitPlanPhase()
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" init plan-phase 5 | jq '.research_enabled'
# With "workflow.research": true → true
# With "workflow.research": false → false
```

### Agent Type Completeness Check
```bash
# Source: bin/lib/core.cjs MODEL_PROFILES table (lines 18-31)
# All 12 types must be present; verify with grep
grep "pde-" "${CLAUDE_PLUGIN_ROOT}/bin/lib/core.cjs" | grep "'" | grep "MODEL_PROFILES\|quality\|balanced\|budget"
# Cross-reference against workflows:
grep -rh "subagent_type=" "${CLAUDE_PLUGIN_ROOT}/workflows/" | sed "s/.*subagent_type=\"\([^\"]*\)\".*/\1/" | sort -u
# All subagent_type values must exist in MODEL_PROFILES
```

### Parallel Wave Verification Pattern
```bash
# After a multi-wave execute-phase run, verify no SUMMARY.md collision:
ls .planning/phases/05-agent-system/*-SUMMARY.md | wc -l
# Should equal plan count
git log --oneline --all --grep="05-" | head -20
# Should show commits from multiple plans in wave 1 interleaved (parallel execution evidence)
```

---

## State of the Art

| Old (GSD) Approach | Current (PDE) Approach | Status |
|--------------------|------------------------|--------|
| `gsd-planner`, `gsd-executor`, etc. subagent types | `pde-planner`, `pde-executor`, etc. subagent types | Already migrated in all workflows |
| `~/.gsd/` config paths in bin scripts | `~/.pde/` config paths in bin scripts | Already migrated in Phase 2 |
| `gsd-tools.cjs` CLI | `pde-tools.cjs` CLI | Already migrated in Phase 2 |
| `gsd_state_version` in STATE.md frontmatter | `pde_state_version` in STATE.md | Already migrated in Phase 2 (state.cjs writes pde_state_version) |

**Finding:** The agent identifier migration from GSD to PDE is **already complete** at the source code level. Phase 5 validates that the migration is correct and that all behavioral requirements (parallel waves, research toggle, model selection) work end-to-end.

---

## Open Questions

1. **Does Claude Code treat unknown subagent_type strings differently?**
   - What we know: Claude Code resolves subagent_type as a role hint in the agent system prompt
   - What's unclear: Whether there's a list of "known" types and what happens with custom strings like "pde-executor"
   - Recommendation: Treat as LOW risk — the workflow prompt defines all actual behavior. The subagent_type is labeling only. Smoke test will confirm agents complete tasks correctly.

2. **Parallel Task calls in a single Claude Code message — confirmed behavior?**
   - What we know: execute-phase.md assumes multiple Task() calls in one message run concurrently
   - What's unclear: Whether Claude Code actually parallelizes Task calls or runs them sequentially within a message
   - Recommendation: The 05-03 smoke test (multi-agent wave) will directly confirm or deny this. If sequential, wave execution still works — just slower.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual bash verification (no automated test framework) |
| Config file | none — ad-hoc bash commands |
| Quick run command | `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-planner --raw` |
| Full suite command | All four smoke tests in plans 05-01 through 05-04 |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGNT-01 | All pde-* agent types present in MODEL_PROFILES | smoke | `grep -c "pde-" "${CLAUDE_PLUGIN_ROOT}/bin/lib/core.cjs"` | ✅ core.cjs exists |
| AGNT-01 | No gsd-* subagent_type in any workflow | smoke | `grep -r "gsd-" "${CLAUDE_PLUGIN_ROOT}/workflows/" --include="*.md"` | ✅ workflows/ exists |
| AGNT-02 | Parallel wave agents complete without collision | integration | Live execute-phase run on a test phase | ❌ Wave 0: need smoke test phase |
| AGNT-03 | research=false suppresses pde-phase-researcher | smoke | Toggle config, run `init plan-phase`, check research_enabled | ✅ config.json exists |
| AGNT-04 | model_profile="budget" returns "sonnet" for pde-planner | smoke | `node pde-tools.cjs resolve-model pde-planner --raw` with budget profile | ✅ pde-tools.cjs exists |
| AGNT-05 | No gsd paths in workflow or bin files | smoke | `grep -ri "gsd" workflows/ bin/ --include="*.md" --include="*.cjs"` | ✅ both dirs exist |

### Sampling Rate
- **Per task commit:** `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-planner --raw`
- **Per wave merge:** All 5 smoke commands above
- **Phase gate:** All five req checks pass before `/pde:verify-work`

### Wave 0 Gaps
- [ ] Smoke test phase directory for AGNT-02 parallel wave test — a minimal 2-plan, 2-wave phase structure with safe read-only tasks

*(All other tests use existing infrastructure — pde-tools.cjs, core.cjs, config.json)*

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/core.cjs` — MODEL_PROFILES table lines 18-31, resolveModelInternal lines 367-382, loadConfig lines 68-130 (direct code inspection)
- `bin/lib/init.cjs` — cmdInitPlanPhase lines 83-160, all resolveModelInternal call sites (direct code inspection)
- `workflows/execute-phase.md` — execute_waves step, failure_handling section (direct file inspection)
- `workflows/plan-phase.md` — step 5 Handle Research, research_enabled condition (direct file inspection)
- `workflows/map-codebase.md` — spawn_agents step with run_in_background=true (direct file inspection)
- `.planning/config.json` — current project config showing model_profile: "balanced", research: true

### Secondary (MEDIUM confidence)
- grep audit of all workflow .md files — zero `gsd-` agent type strings found (command verified)
- grep audit of bin/ .cjs files — zero `gsd-` strings in agent-related code (command verified)

### Tertiary (LOW confidence)
- Assumption about Claude Code subagent_type behavior: based on observed plugin behavior from prior phases, not official documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct code inspection of all relevant files
- Architecture: HIGH — workflow files and init.cjs directly inspected
- Pitfalls: HIGH for known issues (classifyHandoffIfNeeded documented in execute-phase.md), MEDIUM for parallel execution behavior (not formally verified yet)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable — no external dependencies)
