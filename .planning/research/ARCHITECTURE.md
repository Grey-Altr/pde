# Architecture Research

**Domain:** Idle time productivity system integrated into PDE's existing event infrastructure and tmux dashboard
**Researched:** 2026-03-20
**Confidence:** HIGH — architecture is fully derivable from direct codebase inspection; no external dependencies required

---

> **Scope note:** This file covers ONLY the v0.10 idle time productivity milestone. Existing PDE architecture
> (event bus, tmux dashboard, workflow engine, state model) is documented in PROJECT.md — not repeated here.
> Every component described is either additive or a minimal surgical modification to existing files.

---

## Standard Architecture

### System Overview

The idle time productivity system sits between the existing event bus (producer) and the tmux dashboard (consumer). It adds one new consumer layer — an idle detector that reads the NDJSON stream, recognizes agent-busy windows, and writes suggestion content to a new tmux pane (pane-idle-suggestions.sh).

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Workflow Layer (existing)                         │
│   execute-phase.md  →  subagents spawn  →  PostToolUse hooks fire        │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ events written by pde-tools.cjs hooks
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│               Event Bus + NDJSON Log (existing, unmodified)               │
│                                                                           │
│   PdeEventBus (EventEmitter + setImmediate)                               │
│   /tmp/pde-session-{sessionId}.ndjson  ← append-only, session-scoped     │
│                                                                           │
│   Existing event types consumed by idle detector:                        │
│     subagent_start  — agent became busy                                  │
│     subagent_stop   — agent completed                                    │
│     phase_started   — phase context available                            │
│     phase_complete  — phase ended, new context upcoming                  │
│     plan_started    — specific plan context                              │
│     plan_complete   — plan done                                          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ tail -F (existing pane pattern)
                ┌──────────────┴──────────────────────────────┐
                │                                             │
                ▼                                             ▼
┌───────────────────────────────┐          ┌──────────────────────────────────┐
│   Existing 6 Dashboard Panes  │          │  NEW: Idle Suggestions Pane      │
│   (unmodified)                │          │  (pane-idle-suggestions.sh)      │
│                               │          │                                  │
│   agent activity              │          │  Reads NDJSON stream             │
│   pipeline progress           │          │  Detects idle windows            │
│   file changes                │          │  Reads .planning/ state          │
│   context window              │          │  Emits ranked suggestion list    │
│   log stream                  │          │                                  │
│   token / cost                │          │  Refreshes on:                   │
└───────────────────────────────┘          │    - phase_started               │
                                           │    - plan_started                │
                                           │    - subagent_start (entering    │
                                           │      busy state, show prompts)   │
                                           └──────────────────────────────────┘
                                                          │
                                                          │ reads
                                                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Suggestion Engine (NEW)                               │
│                                                                           │
│   idle-suggestions.cjs                                                    │
│   ├── Phase context reader  (reads STATE.md, current phase PLAN.md)      │
│   ├── Suggestion catalog    (static map: phase-type → suggestion set)    │
│   ├── Idle window detector  (subagent_start → subagent_stop duration)    │
│   └── Output formatter      (ranked list with time estimates + prompts)  │
│                                                                           │
│   State it reads (all existing files, no new files written):             │
│     .planning/STATE.md            → current phase, milestone, status     │
│     .planning/ROADMAP.md          → upcoming phases (context preview)    │
│     .planning/config.json         → model profile, preferences           │
│     .planning/phases/{N}/PLAN.md  → current phase task list              │
│     /tmp/pde-session-{id}.ndjson  → live event stream                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|---------------|-----------------|
| `bin/lib/idle-suggestions.cjs` | Suggestion catalog, phase context reader, idle window detection, output formatting | NEW |
| `bin/pane-idle-suggestions.sh` | Tail NDJSON, call idle-suggestions.cjs on relevant events, render to terminal | NEW |
| `bin/monitor-dashboard.sh` | Create 7th pane (idle suggestions) in full layout | MODIFIED (surgical) |
| `pde-tools.cjs` | Optional `idle suggest` command for non-dashboard access | MODIFIED (additive) |
| `workflows/monitor.md` | Updated layout description (7 panes) | MODIFIED (docs only) |

**Unchanged components:** `bin/lib/event-bus.cjs`, `bin/lib/config.cjs`, all 6 existing pane scripts, all workflow files, `mcp-bridge.cjs`.

---

## Recommended Project Structure

```
bin/
├── lib/
│   ├── idle-suggestions.cjs    # NEW: suggestion engine (CommonJS, zero npm deps)
│   └── [existing libs unchanged]
├── pane-idle-suggestions.sh    # NEW: tmux pane script (bash, follows existing pane pattern)
├── pane-agent-activity.sh      # UNCHANGED
├── pane-pipeline-progress.sh   # UNCHANGED
├── pane-file-changes.sh        # UNCHANGED
├── pane-context-window.sh      # UNCHANGED
├── pane-log-stream.sh          # UNCHANGED
├── pane-token-meter.sh         # UNCHANGED
└── monitor-dashboard.sh        # MODIFIED: add P6 pane in full layout
```

### Structure Rationale

- **`bin/lib/idle-suggestions.cjs`** follows the exact pattern of `bin/lib/event-bus.cjs`, `bin/lib/state.cjs`, `bin/lib/config.cjs` — Node.js CommonJS, no top-level side effects, exported functions.
- **`bin/pane-idle-suggestions.sh`** follows the exact pattern of `bin/pane-agent-activity.sh` and `bin/pane-token-meter.sh` — bash script that takes NDJSON path as $1, tails the file, processes events in a case statement.
- **No new directory** is created — all new files slot into existing bin/ locations.
- **No new config keys** are required initially — suggestion catalog is static code; opt-out can use existing `monitoring.enabled` check.

---

## Architectural Patterns

### Pattern 1: Pane Script as Event-Driven Shell Loop

The existing pane scripts establish this pattern precisely. `pane-idle-suggestions.sh` follows it exactly:

**What:** A bash script that receives NDJSON path as $1, runs `tail -F` on it, and processes events in a `case "$event_type" in` block. State is accumulated in local bash variables. On relevant events, the pane calls `node idle-suggestions.cjs` with context arguments, then renders the output.

**When to use:** Any dashboard pane that must react to live event stream.

**Trade-offs:** Simple, zero npm, cross-platform. Cannot share in-process state with other panes (each pane is a separate process). Calling `node` on each render event adds ~20ms latency — acceptable for suggestion refresh frequency (every plan_started / phase_started, not every event).

**Example shell pattern:**
```bash
# pane-idle-suggestions.sh — follows existing pane conventions
NDJSON="${1:-}"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

echo "[ idle suggestions ] waiting for session events..."
echo ""

# Track state across events
CURRENT_PHASE=""
CURRENT_PLAN=""
AGENT_COUNT=0

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)
  case "$event_type" in
    phase_started)
      CURRENT_PHASE=$(echo "$line" | jq -r '.phase_name // ""' 2>/dev/null)
      ;;
    plan_started)
      CURRENT_PLAN=$(echo "$line" | jq -r '.plan_id // ""' 2>/dev/null)
      ;;
    subagent_start)
      AGENT_COUNT=$(( AGENT_COUNT + 1 ))
      # Agents just became busy — good time to show suggestions
      if [ "$AGENT_COUNT" -eq 1 ]; then
        printf '\033[3;1H\033[J'
        node "${PLUGIN_ROOT}/bin/lib/idle-suggestions.cjs" \
          --phase "$CURRENT_PHASE" \
          --plan "$CURRENT_PLAN" \
          2>/dev/null || echo "  (suggestions unavailable)"
      fi
      ;;
    subagent_stop)
      AGENT_COUNT=$(( AGENT_COUNT > 0 ? AGENT_COUNT - 1 : 0 ))
      ;;
  esac
done
```

### Pattern 2: CJS Module with No Top-Level Side Effects

Follows `bin/lib/event-bus.cjs` convention: CRITICAL comment, lazy requires inside functions, exported named functions only. Required because `pde-tools.cjs` does conditional require at the top of its case dispatch.

**What:** `idle-suggestions.cjs` exports `getSuggestions(phaseContext)` and `formatSuggestions(suggestions)`. No `require` calls at module load time that touch the filesystem or spawn processes.

**When to use:** Any lib module that may be required from `pde-tools.cjs`.

**Trade-offs:** Slightly more boilerplate than top-level requires. Required by existing convention — do not deviate.

**Example module structure:**
```javascript
'use strict';
// CRITICAL: No top-level side effects. Lazy-require inside functions only.

function getSuggestions(opts) {
  const fs = require('fs');
  const path = require('path');
  // ... read state files, return suggestion array
}

function formatSuggestions(suggestions) {
  // ... return ANSI-colored terminal string
}

module.exports = { getSuggestions, formatSuggestions };
```

### Pattern 3: Phase-Context-Aware Suggestion Catalog

The suggestion engine maps current PDE phase type to a ranked suggestion set. Phase type is derived from STATE.md `current_phase` field plus the ROADMAP.md phase description (to infer phase purpose without parsing the full plan).

**What:** A static object mapping phase keywords to suggestion categories. No LLM call required — all suggestions are pre-authored and context-filtered at render time.

**When to use:** Any feature that needs to surface contextually relevant content without incurring LLM latency.

**Trade-offs:** Fast and zero-cost. Suggestions are pre-written, not generated. The catalog must be updated when new phase types are introduced. This is a feature, not a bug — pre-authored suggestions are more reliable than generated ones.

**Catalog structure (conceptual):**
```javascript
const SUGGESTION_CATALOG = {
  research: [
    { id: 'curate-refs', title: 'Curate reference screenshots', timeEst: '5-10 min',
      prompt: 'Screenshot 3 competitor UIs that handle [current feature] well. Save to .planning/research/refs/.' },
    { id: 'domain-docs', title: 'Write domain knowledge', timeEst: '10-15 min',
      prompt: 'List 5 business rules or edge cases for [current phase feature] that PDE might not know.' },
  ],
  plan: [
    { id: 'review-plan', title: 'Review upcoming plan', timeEst: '3-5 min',
      prompt: 'Read the current PLAN.md and note any tasks where your domain knowledge is needed.' },
    { id: 'prep-fixtures', title: 'Prepare test fixtures', timeEst: '10-20 min',
      prompt: 'Create test data files for [current phase] so the executor can use real examples.' },
  ],
  execute: [
    { id: 'review-artifacts', title: 'Review produced artifacts', timeEst: '5 min',
      prompt: 'Check .planning/ for new files from the last plan. Note any corrections for the next iteration.' },
    { id: 'taste-decisions', title: 'Make human-taste decisions', timeEst: '5-10 min',
      prompt: 'If design tokens were generated, pick your preferred color palette variant now.' },
  ],
  design: [
    { id: 'competitor-screenshots', title: 'Capture competitor UI screenshots', timeEst: '10 min',
      prompt: 'Take 3 screenshots of competitor designs for the feature being designed.' },
    { id: 'annotate-wireframes', title: 'Annotate existing wireframes', timeEst: '5-10 min',
      prompt: 'Open the latest WFR artifact and add inline comments for any corrections.' },
  ],
  // generic fallback for unknown phase types
  _default: [
    { id: 'user-stories', title: 'Externalize user stories', timeEst: '10 min',
      prompt: 'Write 3 user stories from the current phase that PDE can verify against.' },
    { id: 'git-hygiene', title: 'Git housekeeping', timeEst: '5 min',
      prompt: 'Squash fixup commits, update branch descriptions, or prune stale branches.' },
  ],
};
```

---

## Data Flow

### "Agent is busy" → "Here is what to do" Flow

```
1. User invokes /pde:execute-phase (or /pde:plan-phase, /pde:build, etc.)
   └─> Orchestrator workflow begins

2. Orchestrator spawns first subagent
   └─> SubagentStart hook fires (Claude Code hook, existing)
   └─> pde-tools.cjs "subagent-start" case block runs
   └─> PdeEventBus.dispatch("subagent_start", { agent_type, session_id })
   └─> NDJSON line appended: { event_type: "subagent_start", ts: ..., agent_type: ... }

3. pane-idle-suggestions.sh detects "subagent_start" in NDJSON tail
   └─> AGENT_COUNT increments to 1 (transition from idle to busy)
   └─> Shell calls: node idle-suggestions.cjs --phase <current> --plan <current>

4. idle-suggestions.cjs:
   a. Reads .planning/STATE.md (synchronous fs.readFileSync)
      └─> Extracts: current_phase, current_milestone, status
   b. Reads .planning/ROADMAP.md (first 30 lines for upcoming phase preview)
      └─> Extracts: next 2-3 phase names for "context preview" suggestions
   c. Reads .planning/phases/{N}/PLAN.md if it exists
      └─> Extracts: incomplete tasks (for "help complete" suggestions)
   d. Classifies phase type from phase name keywords
      (research|competitive|opportunity → "research" class)
      (plan|check-readiness → "plan" class)
      (execute → "execute" class)
      (wireframe|mockup|ideate|brief|critique → "design" class)
   e. Looks up SUGGESTION_CATALOG[phaseType] (with _default fallback)
   f. Returns top 4 suggestions ranked by: context relevance > time estimate

5. pane-idle-suggestions.sh renders output to terminal:
   └─> Clears pane content area (ANSI escape)
   └─> Prints header: "[ while you wait ]  Phase: {current_phase}"
   └─> Prints 4 ranked suggestions with: title, time estimate, actionable prompt

6. Suggestions remain displayed until:
   - subagent_stop fires AND AGENT_COUNT returns to 0 (all agents done)
   - A new phase_started / plan_started event fires (refresh with new context)
   - User manually switches tmux pane focus
```

### State Reading (what idle-suggestions.cjs reads and why)

```
.planning/STATE.md
    └─> current_phase (number + name) — required for catalog lookup
    └─> status: in_progress / complete — suppress suggestions if complete

.planning/ROADMAP.md
    └─> Upcoming phase names (lines after current) — for "context preview" suggestions
    └─> Capped at 30 lines to keep read fast

.planning/phases/{N}/PLAN.md  (if exists, graceful skip if not)
    └─> Incomplete tasks — for "review what's being built" suggestions
    └─> Only the task list section (first 80 lines)

/tmp/pde-session-{id}.ndjson  (indirectly — pane script reads, not idle-suggestions.cjs)
    └─> event_type: subagent_start — idle window detected
    └─> event_type: phase_started — context refresh trigger
    └─> event_type: plan_started — context refresh trigger

.planning/config.json  (optional, graceful skip)
    └─> monitoring.enabled — if false, don't render suggestions
    └─> model_profile — may inform which suggestions are relevant
```

---

## tmux Dashboard Integration

### 7th Pane Placement

The existing full layout creates 6 panes in 2 columns (3 left, 3 right). The idle suggestions pane becomes the 7th pane. Two layout options are viable:

**Option A (recommended): Bottom banner across full width**

Add a horizontal split below the existing 2-column layout. The suggestions pane spans the full terminal width, giving suggestion text room to breathe. Requires `build_full_layout()` to add a final `split-window -v` below the existing 6 panes before labeling and starting processes.

```
┌──────────────────────┬──────────────────────┐
│   agent activity     │   pipeline progress  │
├──────────────────────┼──────────────────────┤
│   file changes       │   log stream         │
├──────────────────────┼──────────────────────┤
│   context window     │   token / cost       │
├──────────────────────┴──────────────────────┤
│           while you wait                    │  ← NEW pane
└─────────────────────────────────────────────┘
```

**Option B: 4th pane in right column**

Split pane-token-meter vertically. Narrower but doesn't change the left column. Higher implementation complexity because it requires adjusting `-p 50` splits in right column.

Recommendation: Option A. Wider pane means more suggestion text visible without truncation. One additional `split-window -v -p 20` after the 6-pane layout is complete suffices.

### monitor-dashboard.sh Modification

`build_full_layout()` receives one new block after the 6 existing panes:

```bash
# P6: idle suggestions (full-width bottom banner)
P6=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0" -p 20)
tmux select-pane -t "${P6}" -T "while you wait"
tmux send-keys -t "${P6}" "bash '${PLUGIN_ROOT}/bin/pane-idle-suggestions.sh' '${ndjson}'" C-m
```

`build_minimal_layout()` is NOT modified — small terminals get 2 panes (agent activity + pipeline progress), unchanged. The idle suggestions pane is full-layout-only.

`setMaxListeners(20)` in `event-bus.cjs` already accounts for 6 panes + additional consumers — no change needed.

---

## Anti-Patterns

### Anti-Pattern 1: LLM-Generated Suggestions at Render Time

**What people do:** Call Claude API inside `idle-suggestions.cjs` to generate personalized suggestions based on current project state.

**Why it's wrong:** Introduces LLM latency (seconds) into a UI render path that fires on every subagent_start event. Creates cost for every agent spawn. Requires API key handling in a pane script. Violates PDE's session-based model (background processes cannot make Claude API calls from within a hook).

**Do this instead:** Pre-author suggestion catalog keyed by phase type. Use state file reading (fast, synchronous) for context. Phase type covers 90% of the contextual variation that matters. LLM generation would add cost and latency for marginal personalization gain.

### Anti-Pattern 2: Writing State Files from the Pane Script

**What people do:** Have `pane-idle-suggestions.sh` write a `.planning/idle-state.json` to track which suggestions were shown, user dismissals, etc.

**Why it's wrong:** Pane scripts are read-only observers in the existing architecture. All 6 existing pane scripts call no write operations. Introducing write behavior in a pane script creates a second write path into `.planning/` that bypasses `pde-tools.cjs` validation and locking. The pane runs as a background process concurrent with workflow execution — file contention is a real risk.

**Do this instead:** Accept stateless rendering. Suggestions are re-derived from state files on each refresh. No need to track "shown" state — users can dismiss by switching tmux pane focus. If dismissal tracking becomes needed in a later milestone, add a `pde-tools.cjs idle-dismiss` command that owns the write path.

### Anti-Pattern 3: Polling STATE.md in a Loop

**What people do:** Run a `while true; do sleep 10; node idle-suggestions.cjs; done` loop that re-reads state every N seconds.

**Why it's wrong:** Creates constant process churn (spawning node every 10 seconds) whether or not anything changed. Cannot distinguish between "agent working" and "agent idle" — suggests all the time or never. Ignores the event stream that already provides the correct trigger signals.

**Do this instead:** Use the NDJSON tail as the trigger signal, exactly as all 6 existing pane scripts do. Refresh suggestions on `subagent_start` (agent became busy → show suggestions) and `phase_started`/`plan_started` (new context available → refresh content). No polling.

### Anti-Pattern 4: Adding a New Event Type for Idle Detection

**What people do:** Add a new `agent_idle` event type emitted by the orchestrator when it detects no active agents.

**Why it's wrong:** Idle detection requires no new events — `subagent_stop` with AGENT_COUNT returning to 0 is the existing signal. Adding a new event type requires modifying `pde-tools.cjs` hook handlers and the event schema, touching more existing code than necessary.

**Do this instead:** Track AGENT_COUNT in the pane script's bash loop (increment on `subagent_start`, decrement on `subagent_stop`). When it transitions from 1 to 0, all agents completed. No new events needed.

### Anti-Pattern 5: Blocking `build_minimal_layout()` Entry

**What people do:** Add the suggestions pane to both `build_full_layout()` and `build_minimal_layout()`, so the pane always appears.

**Why it's wrong:** The minimal layout exists precisely because small terminals cannot handle 6 panes gracefully. Adding a 7th (or 3rd) pane to the minimal layout defeats the adaptive degradation logic. On a 80x24 terminal, 3 panes are cramped and the suggestion text will truncate to unreadable width.

**Do this instead:** Add the 7th pane to `build_full_layout()` only. The `build_minimal_layout()` path remains a 2-pane layout showing only agent activity and pipeline progress.

---

## Build Order

Dependencies are strict in one direction: the suggestion engine must exist before the pane script that calls it, and the pane script must exist before `monitor-dashboard.sh` adds it to the layout.

```
Phase 1: idle-suggestions.cjs (core engine, no external deps)
    └─> Unit-testable in isolation: node idle-suggestions.cjs --phase "execute-phase-70" --plan "1"
    └─> No dashboard changes yet; can be developed and tested standalone
    └─> Outputs: ANSI-colored terminal string, graceful fallback if STATE.md missing

Phase 2: pane-idle-suggestions.sh (pane script, depends on Phase 1)
    └─> Can test standalone: bash pane-idle-suggestions.sh /tmp/pde-session-test.ndjson
    └─> Inject test events via: echo '{"event_type":"subagent_start","ts":"..."}' >> /tmp/pde-session-test.ndjson
    └─> No dashboard changes yet; visible only when run directly

Phase 3: monitor-dashboard.sh modification (depends on Phase 2)
    └─> Add P6 pane in build_full_layout() only
    └─> Test: /pde:monitor (kill existing session first)
    └─> Verify: 7 panes visible on full-size terminal, 2 panes on small terminal

Phase 4: pde-tools.cjs idle command (optional, depends on Phase 1)
    └─> Adds: node pde-tools.cjs idle suggest
    └─> Outputs suggestion list to stdout (non-dashboard access path)
    └─> Useful for: scripts, testing, headless mode without tmux
```

**Minimum shippable:** Phases 1-3 alone deliver the full feature. Phase 4 is additive convenience.

---

## Integration Points

### Existing Infrastructure Consumed (Read-Only)

| Infrastructure | How Consumed | Notes |
|---------------|-------------|-------|
| `/tmp/pde-session-{id}.ndjson` | `tail -F` in pane script, identical to all 6 existing panes | No modification needed |
| `.planning/STATE.md` | `fs.readFileSync` in idle-suggestions.cjs | Graceful skip if missing; same pattern as other lib modules |
| `.planning/ROADMAP.md` | First 30 lines only; cap prevents slow reads on large roadmaps | Graceful skip if missing |
| `.planning/phases/{N}/PLAN.md` | First 80 lines if current phase dir is known | Graceful skip if not found |
| `.planning/config.json` | `monitoring.enabled` check; follows config.cjs patterns | Graceful skip uses defaults |
| `bin/lib/event-bus.cjs` | Not directly consumed by idle system; NDJSON is the interface | Event bus writes; pane reads |
| `bin/lib/model-profiles.cjs` | Optional: may inform suggestion relevance by model tier | Graceful skip |

### Existing Infrastructure Extended (Modified)

| Component | What Changes | Risk Level |
|-----------|-------------|-----------|
| `bin/monitor-dashboard.sh` `build_full_layout()` | Add 1 pane creation block and 1 `send-keys` call at end | LOW — additive; existing layout unaffected |
| `bin/pde-tools.cjs` | Add `idle` command case (optional) | LOW — additive case block, no existing paths touched |
| `workflows/monitor.md` | Update pane count description | NONE — documentation only |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| pane-idle-suggestions.sh ↔ idle-suggestions.cjs | CLI invocation: `node idle-suggestions.cjs --phase X --plan Y` | Pane is orchestrator, engine is pure function |
| idle-suggestions.cjs ↔ .planning/ | Direct synchronous file reads (no pde-tools.cjs intermediary) | Acceptable for read-only; follows pane-token-meter.sh precedent of direct node reads |
| pane-idle-suggestions.sh ↔ NDJSON | `tail -F` read-only | Identical to all other pane scripts; no risk |
| pane-idle-suggestions.sh ↔ monitor-dashboard.sh | Script path passed as `send-keys` argument | No API surface; just a file path |

---

## Scaling Considerations

This system operates entirely within a single user's local machine. There are no multi-user or server scaling dimensions. The relevant scaling axis is session complexity:

| Session Scale | Architecture Adjustments |
|--------------|--------------------------|
| Short session (< 50 events) | No adjustment needed; NDJSON stays small |
| Long session (500+ events) | `tail -F` reads only new lines; no reprocessing of history — no issue |
| Many parallel agents (wave of 10+) | AGENT_COUNT tracking still works; suggestion refresh fires on first spawn only (AGENT_COUNT == 1 transition), not on every spawn |
| Very large ROADMAP.md or PLAN.md | 30-line / 80-line caps prevent slow reads; content may be truncated but that's acceptable |

**First bottleneck:** None expected within normal PDE usage. The `node idle-suggestions.cjs` call on each `subagent_start` transition adds ~20ms — imperceptible to users and infrequent (once per wave, not once per event).

---

## Sources

- `bin/lib/event-bus.cjs` — NDJSON schema, event types, dispatch pattern (direct codebase inspection)
- `bin/pane-agent-activity.sh`, `bin/pane-token-meter.sh`, `bin/pane-context-window.sh` — pane script pattern (direct codebase inspection)
- `bin/monitor-dashboard.sh` — `build_full_layout()`, `build_minimal_layout()`, layout primitives (direct codebase inspection)
- `bin/pde-tools.cjs` — command dispatch pattern, case block structure, lazy-require convention (direct codebase inspection)
- `.planning/PROJECT.md` — zero-npm constraint, file-based state model, v0.10 milestone goals, existing event/dashboard architecture description
- `memory/project_idle_time_productivity.md` — feature intent: activity categories, human-machine feedback loop goal, tmux pane template approach

---

*Architecture research for: PDE v0.10 — Idle Time Productivity Integration*
*Researched: 2026-03-20*
