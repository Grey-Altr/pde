# Phase 183: Auto-Generation - Research

**Researched:** 2026-03-30
**Domain:** Hook wiring, config extension, completion-gate detection
**Confidence:** HIGH

## Summary

Phase 183 wires auto-generation of stakeholder presentations to two existing lifecycle events: (1) phase completion, triggered by `pde-tools phase complete` inside `execute-phase.md`, and (2) milestone archive, triggered by `pde-tools milestone complete` inside `complete-milestone.md`. Both events are synchronous CLI calls with structured JSON return values — the natural injection point is immediately after each call in the respective workflow markdown.

The existing generation pipeline (`pde-tools presentation render`) is a synchronous CLI command that writes HTML and MD to `.planning/presentations/`. Because it is CPU-bound (no network, no Playwright), it can run inside a hook script using `spawnSync` with a generous timeout (30 s). Alternatively, it can be called directly from workflow markdown as a bash step — the simpler and more auditable approach given how all other PDE tools are invoked.

The completion gate (AUTO-03) is the critical design constraint. The `execute-phase.md` workflow runs `phase complete` only when all plans in the phase have summaries (the wave loop is complete and verify\_phase\_goal passes). Auto-generation must be gated on the same condition: STATE.md shows the phase as complete, not merely "in progress". A direct file-write check — verifying that the SUMMARY.md files exist and the ROADMAP.md checkbox is `[x]` — is fragile. The correct gate is to let the existing `phase complete` CLI call (which is already gated) serve as the trigger, by adding the generation call as a subsequent step in `execute-phase.md`.

**Primary recommendation:** Add auto-generation as a workflow step in `execute-phase.md` (after `update_roadmap`) and `complete-milestone.md` (after `archive_milestone`), gated behind a config check at step entry. No new hook files or event bus wiring needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — all implementation choices at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTO-01 | Presentations auto-generate when a phase is marked complete (via phase completion event) | Phase complete call is in `execute-phase.md` `update_roadmap` step; add generation step after it |
| AUTO-02 | Presentations auto-generate when a milestone is archived (via `/gsd:complete-milestone`) | Milestone complete call is in `complete-milestone.md` `archive_milestone` step; add generation step after it |
| AUTO-03 | Auto-generation gated on state completion check (not PostToolUse frequency) | Gate on `is_last_phase: false OR is_last_phase: true` result from `phase complete` JSON, plus config check |
| AUTO-04 | Auto-generated presentations use a default persona set (configurable in config.json) | New config key `presentations.auto_generate_personas` array in config.json |
| AUTO-05 | Auto-generation can be disabled in config.json without affecting on-demand `/pde:present` | New config key `presentations.auto_generate` boolean in config.json |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js child_process (spawnSync) | built-in | Call pde-tools.cjs from hook scripts | Already used in all 5 hook scripts |
| pde-tools.cjs presentation render | existing | HTML+MD generation per persona | All 15 personas already implemented in render-presentation.cjs |
| pde-tools.cjs config-get | existing | Read auto_generate flag from config.json | Standard config read pattern |
| pde-tools.cjs config-set | existing | Register new config keys | Pattern established in config.cjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | existing | Unit tests for new config keys and hook logic | All Phase 18x tests use vitest |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Workflow step in execute-phase.md | New hook script on PostToolUse | Hook fires on every file write; would require state-file parsing to detect completion; PostToolUse is noisy and hard to gate correctly |
| Workflow step in execute-phase.md | NDJSON event bus subscription | Event bus is in-process only within a single pde-tools.cjs invocation; phase complete is a CLI call, not an in-process event |
| Direct `pde-tools presentation render` call | Spawning `/pde:present` workflow | Workflow requires Claude Code context; CLI call works from any bash step including hook scripts |

**Installation:** No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
├── config.cjs          # Add new keys: presentations.auto_generate, presentations.auto_generate_personas
workflows/
├── execute-phase.md    # Add step: auto_generate_presentations (after update_roadmap)
├── complete-milestone.md # Add step: auto_generate_presentations (after archive_milestone)
tests/phase-183/
├── auto-generate.test.mjs  # Config key validation, gate logic
```

### Pattern 1: Config-Gated Workflow Step
**What:** Check config before running generation; skip silently if disabled.
**When to use:** Any opt-in feature that should not affect existing workflows by default.
**Example:**
```bash
# In execute-phase.md after update_roadmap step
AUTO_GENERATE=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" --raw config-get presentations.auto_generate 2>/dev/null || echo "false")
if [[ "$AUTO_GENERATE" == "true" ]]; then
  PERSONAS=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" --raw config-get presentations.auto_generate_personas 2>/dev/null || echo '["executive-summary","project-manager"]')
  DATE=$(date +%Y-%m-%d)
  for PERSONA in $(echo "$PERSONAS" | node -e "process.stdin.setEncoding('utf8');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{JSON.parse(d).forEach(p=>console.log(p));})"); do
    HTML_PATH=".planning/presentations/${PERSONA}-${DATE}.html"
    MD_PATH=".planning/presentations/${PERSONA}-${DATE}.md"
    mkdir -p .planning/presentations/
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation render "${PERSONA}" "${HTML_PATH}" "${MD_PATH}" && \
      echo "Auto-generated: ${HTML_PATH}" || \
      echo "Auto-generation failed for persona: ${PERSONA} (non-blocking)"
  done
fi
```

### Pattern 2: Completion Gate via Existing CLI Result
**What:** Use the structured JSON result from `phase complete` as the gate signal.
**When to use:** When the trigger is a specific lifecycle event already tracked by a CLI call.
**Example:**
```bash
# COMPLETION JSON already captured in update_roadmap step:
# { completed_phase, next_phase, is_last_phase, date, roadmap_updated, state_updated }
# Gate: only generate if roadmap_updated == true (phase was actually completed, not a re-run)
# The phase complete CLI already enforces all plan summaries must exist before it runs.
```

### Pattern 3: New Config Keys Registration
**What:** Register new dot-notation keys in `VALID_CONFIG_KEYS` in config.cjs.
**When to use:** Any new feature that needs user-configurable behavior.
**Example:**
```javascript
// In bin/lib/config.cjs, add to VALID_CONFIG_KEYS Set:
'presentations.auto_generate',        // boolean — enable/disable auto-generation
'presentations.auto_generate_personas', // JSON array — default persona set
```

### Anti-Patterns to Avoid
- **PostToolUse hook for completion detection:** PostToolUse fires on every Write/Edit/Bash call. Detecting "phase complete" from file content is fragile — the hook would need to parse ROADMAP.md on every write to check for `[x]` checkbox changes.
- **Event bus subscription for cross-process trigger:** The PdeEventBus is in-process only (EventEmitter). `phase complete` runs as a separate `node pde-tools.cjs` invocation; the bus has no subscribers in that process.
- **Blocking Claude Code with synchronous generation:** `spawnSync` in a sync hook (like emit-event.cjs) blocks Claude Code until completion. Generation can take 2-10 seconds per persona. If multiple personas, total latency multiplies. Always use `async: true` in hooks.json if wiring via hook, or use `spawn` + `unref()` for fire-and-forget.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML/MD generation | Custom templating in hook script | `pde-tools presentation render` | All 15 personas already implemented; render-presentation.cjs is 2000+ lines of tested code |
| Config read/write | Direct JSON file manipulation | `pde-tools config-get` / `pde-tools config-set` | Schema validation, dot-notation, type coercion already handled |
| State detection | Parsing ROADMAP.md in hook | Use `phase complete` CLI result | CLI already handles all the state parsing and guarantees atomicity |
| Persona slug validation | Custom validation | Use existing persona registry in render-presentation.cjs | `personaDisplayName()` and the `render()` switch already validate slugs |

**Key insight:** The entire generation pipeline exists. Phase 183 is purely plumbing — wire the trigger, gate it, make it configurable. Zero new generation logic.

## Common Pitfalls

### Pitfall 1: Spurious Triggers During Mid-Execution
**What goes wrong:** If the hook fires on every PostToolUse event, auto-generation runs after every write inside an executing phase — not just at completion.
**Why it happens:** `execute-phase.md` writes PLAN.md, SUMMARY.md, and other files during normal execution. If the trigger is file-write-based, it fires many times.
**How to avoid:** Trigger only from the `phase complete` CLI call result in the `update_roadmap` step, not from PostToolUse or file-write detection.
**Warning signs:** Presentations being generated in `.planning/presentations/` while the phase is still running.

### Pitfall 2: config-get Exits Nonzero for Missing Keys
**What goes wrong:** `pde-tools config-get presentations.auto_generate` exits with code 1 if the key is absent (the `error()` helper calls `process.exit(1)`). Shell `||` fallback is required.
**Why it happens:** `cmdConfigGet` calls `error()` when the key path isn't found. This is intentional — it's a strict getter.
**How to avoid:** Always use `2>/dev/null || echo "false"` pattern. Or add a `config-get-or-default` CLI subcommand (a Phase 183 deliverable).
**Warning signs:** Bash step exits with `error: Key not found: presentations.auto_generate` when the key has not yet been set.

### Pitfall 3: JSON Array in Bash Shell Expansion
**What goes wrong:** Reading the persona array from config returns a JSON string like `["executive-summary","project-manager"]`; iterating over it in bash without a JSON parser produces one token, not multiple.
**Why it happens:** Bash has no native JSON parser. `for p in ["executive-summary"]` iterates once with the literal bracket included.
**How to avoid:** Pipe through `node -e` with a stdin JSON parser (see Pattern 1 example), or store personas as newline-separated values in a separate config key. Alternatively, implement a `pde-tools config-get-array` subcommand that prints one entry per line.
**Warning signs:** All personas being concatenated into a single malformed slug.

### Pitfall 4: Milestone Auto-Generation Runs Before Archival Is Complete
**What goes wrong:** If generation is triggered before `milestone complete` finishes updating STATE.md and MILESTONES.md, the IR extraction captures stale state.
**Why it happens:** `archive_milestone` step runs `milestone complete` synchronously. If generation is placed before the subsequent `reorganize_roadmap_and_delete_originals` step, ROADMAP.md has not yet been updated.
**How to avoid:** Place the auto-generation step after `archive_milestone` AND after `reorganize_roadmap_and_delete_originals` in `complete-milestone.md`.
**Warning signs:** Presentations showing incomplete milestone data or referencing deleted REQUIREMENTS.md.

### Pitfall 5: Auto-Generation Blocks Complete-Milestone Interactive Prompts
**What goes wrong:** In interactive mode, `complete-milestone.md` pauses for user confirmations. If auto-generation is injected early, it runs before the user approves milestone scope.
**Why it happens:** Complete-milestone has `AskUserQuestion` gates in interactive mode.
**How to avoid:** Place auto-generation in the final `offer_next` step, or as a new step immediately before `offer_next`. By that point, all interactive gates have been cleared.
**Warning signs:** Presentations generated before user confirms milestone scope.

## Code Examples

Verified patterns from existing codebase:

### Reading Config with Fallback
```bash
# Source: hooks/emit-event.cjs and config.cjs patterns
AUTO=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" --raw config-get presentations.auto_generate 2>/dev/null || echo "false")
if [[ "$AUTO" == "true" ]]; then
  # generation logic
fi
```

### Registering New Config Keys (config.cjs)
```javascript
// Source: bin/lib/config.cjs VALID_CONFIG_KEYS Set (lines 14-41)
const VALID_CONFIG_KEYS = new Set([
  // ... existing keys ...
  'presentations.auto_generate',          // Phase 183: boolean — enable auto-generation
  'presentations.auto_generate_personas', // Phase 183: JSON array of persona slugs
]);
```

### Async Hook Spawn Pattern (from start-relay.cjs)
```javascript
// Source: hooks/start-relay.cjs lines 79-96
const child = spawn(process.execPath, [pdeTools, 'presentation', 'render', persona, htmlPath, mdPath], {
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore'],
  env: { ...process.env },
});
child.unref(); // parent exits immediately; child runs in background
```

### Phase Complete JSON Result Structure
```javascript
// Source: bin/lib/phase.cjs lines 886-898
// result = {
//   completed_phase: "183",
//   phase_name: "auto-generation",
//   plans_executed: "1/1",
//   next_phase: "184",
//   next_phase_name: "portfolio-synthesis",
//   is_last_phase: false,
//   date: "2026-03-30",
//   roadmap_updated: true,
//   state_updated: true,
//   requirements_updated: true
// }
```

### Milestone Complete JSON Result Structure
```javascript
// Source: bin/lib/milestone.cjs lines 260-276
// result = {
//   version: "v0.22",
//   name: "Stakeholder Presentations",
//   date: "2026-03-30",
//   phases: 9,
//   plans: 23,
//   tasks: 47,
//   accomplishments: ["..."],
//   archived: { roadmap: true, requirements: true, audit: false, phases: false },
//   milestones_updated: true,
//   state_updated: true
// }
```

### Calling presentation render from CLI
```bash
# Source: workflows/present.md Step 6/7
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation render \
  "${PERSONA_SLUG}" "${HTML_PATH}" "${MD_PATH}"
# Exit 0 on success, nonzero on failure (persona not found, IR extraction failure)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `/pde:present persona` after each phase | Auto-generation hook in execute-phase.md | Phase 183 | Removes manual step from developer workflow |
| Static config.json with workflow.* keys | Extended with presentations.* keys | Phase 183 | Auto-generate and persona set become first-class config |

**Deprecated/outdated:**
- None — this is new functionality.

## Open Questions

1. **Persona array serialization in bash**
   - What we know: Config stores JSON. Bash has no JSON parser. The `node -e` pipe approach works but is verbose.
   - What's unclear: Should the planner implement `pde-tools config-get-array` (prints one-per-line) or use the pipe approach inline?
   - Recommendation: Add a `config-get-array` subcommand to pde-tools that outputs one entry per line for easy bash `while read` iteration. One-time cost in Wave 1; avoids repeating the pipe pattern.

2. **Default persona set**
   - What we know: AUTO-04 says "configurable in config.json". 15 personas exist. Generating all 15 on every phase completion would be slow (~30 s per persona for large IRs).
   - What's unclear: What is the right default set?
   - Recommendation: Default to `["executive-summary", "project-manager"]` — the two most universally useful personas. Document other slugs in config comments.

3. **Milestone auto-generation persona set**
   - What we know: Milestone completion is rarer and more significant than phase completion. A broader persona set makes sense.
   - What's unclear: Should milestone use a different default set than phase?
   - Recommendation: Use the same configurable key but document a recommended milestone set of `["executive-summary", "project-manager", "case-study", "agile-report"]` in the implementation guidance.

## Environment Availability

Step 2.6: Dependency check — no new external dependencies. All tools already installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pde-tools.cjs execution | ✓ | detected via project | — |
| pde-tools.cjs presentation render | AUTO-01/AUTO-02 generation | ✓ | Phase 178-182 delivered | — |
| pde-tools.cjs config-get | AUTO-03/AUTO-05 config check | ✓ | Phase 41 delivered | — |
| vitest | Phase 183 tests | ✓ | see vitest.config.ts | — |

**Missing dependencies with no fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (vitest.config.ts at project root) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/phase-183/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTO-04 | `presentations.auto_generate_personas` is a valid config key; default value is `["executive-summary","project-manager"]` | unit | `npx vitest run tests/phase-183/ -t "config"` | ❌ Wave 0 |
| AUTO-05 | `presentations.auto_generate` is a valid config key; default value is `false` | unit | `npx vitest run tests/phase-183/ -t "config"` | ❌ Wave 0 |
| AUTO-03 | Generation does not run when `presentations.auto_generate` is false | unit | `npx vitest run tests/phase-183/ -t "gate"` | ❌ Wave 0 |
| AUTO-01 | Workflow step runs `presentation render` for each persona when auto_generate is true | integration/smoke | manual — requires execute-phase.md workflow run | manual-only |
| AUTO-02 | Workflow step runs `presentation render` at milestone archive when auto_generate is true | integration/smoke | manual — requires complete-milestone.md workflow run | manual-only |

**AUTO-01/AUTO-02 are manual-only** because they require the full workflow orchestration context (Claude Code session + execute-phase.md). Unit tests can verify the config layer and gate logic; end-to-end verification requires running `/pde:execute-phase` with `presentations.auto_generate: true`.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-183/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-183/auto-generate.test.mjs` — covers AUTO-03, AUTO-04, AUTO-05 config key registration and gate logic

*(Existing test infrastructure covers all other phase requirements — no new conftest or framework setup needed)*

## Sources

### Primary (HIGH confidence)
- `bin/lib/config.cjs` — VALID_CONFIG_KEYS, cmdConfigGet, cmdConfigSet implementation
- `bin/lib/phase.cjs` — cmdPhaseComplete, JSON result structure
- `bin/lib/milestone.cjs` — cmdMilestoneComplete, JSON result structure
- `bin/lib/event-bus.cjs` — PdeEventBus, safeAppendEvent, NDJSON pattern
- `hooks/emit-event.cjs` — spawnSync pattern, hook exit code requirements
- `hooks/start-relay.cjs` — async detached spawn + unref() pattern
- `hooks/hooks.json` — hook event names, async: true/false semantics
- `workflows/execute-phase.md` — update_roadmap step, phase complete call location
- `workflows/complete-milestone.md` — archive_milestone step, milestone complete call location
- `workflows/present.md` — full generation pipeline, `pde-tools presentation render` invocation
- `bin/lib/render-presentation.cjs` — render(), cmdPresentationRender() API
- `.planning/config.json` — current config shape

### Secondary (MEDIUM confidence)
- `vitest.config.ts` — test file include patterns and globals setting
- `tests/phase-182/render-presentation-cluster-b.test.mjs` — test structure convention for Phase 18x tests

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies are existing project code, fully audited
- Architecture: HIGH — trigger points are unambiguous (workflow markdown after CLI calls); config pattern is established
- Pitfalls: HIGH — all pitfalls derived from direct code inspection, not inference

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable infrastructure — no external dependencies)
