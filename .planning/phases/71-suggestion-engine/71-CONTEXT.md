# Phase 71: Suggestion Engine - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

A standalone, unit-testable CJS module (`bin/lib/idle-suggestions.cjs`) that reads current phase state and returns a ranked suggestion list from the catalog within 2 seconds using no LLM calls. The hook handler from Phase 70 calls this module via direct `require()`. The module does NOT own the suggestion catalog content (Phase 72) or the dashboard pane (Phase 73) — it produces structured output that those phases consume.

</domain>

<decisions>
## Implementation Decisions

### Output format and visual style
- Lowercase tech-noir aesthetic — all text lowercase, underscore-separated labels, daemon-log feel
- Block elements (`█ ▒ ░`) with slash-fill lines (`////`) as category separators
- Block char intensity encodes resumption cost: `░` = low, `▒` = medium, `█` = high
- Fixed 32-char width for slash-fill lines
- Max 7 suggestions returned
- All categories always visible — empty categories show `-- none` rather than being hidden
- Stats footer line at bottom: `// gen:N shown:N cut:N budget:~Nmin`
- Category labels: `blocker`, `next_phase`, `review`, `think`
- Metadata per suggestion: `Nmin // resumption:low|med|high`

### Phase classification logic
- Event-type inference from the triggering NDJSON event: `plan_started` → plan, `phase_started` → check context, etc.
- DESIGN-STATE.md gets its own detection path: if file exists AND has incomplete stages → classify as `design`
- Fallback on unknown/missing state: empty zero-state message `// awaiting phase data...` — no suggestions until classification succeeds

### Ranking and priority model
- Fixed priority order: `blocker` > `next_phase` > `review` > `think`
- Blockers always first (ENGN-03 requirement)
- Upcoming-phase prep prioritized over artifact reviews (forward-looking over retrospective)
- Knowledge capture prompts (`think`) lowest priority
- Time-bounded filtering uses fixed heuristics per phase type: research 5-10min, plan 3-5min, execute 10-30min per task
- Tiebreaker within category: lower resumption cost wins
- Suggestions exceeding estimated remaining time are filtered out (counted in stats footer `cut:N`)

### Integration seam with hook handler
- Hook calls engine via direct `require('../bin/lib/idle-suggestions.cjs')` — no spawnSync overhead
- Minimal data contract: hook passes `cwd` (project root) and `event` (last meaningful NDJSON event object)
- Engine reads STATE.md, ROADMAP.md, DESIGN-STATE.md, and design-manifest.json itself (within the 3-file-read budget — STATE.md + ROADMAP.md + one of DESIGN-STATE.md or design-manifest.json)

### Claude's Discretion
- Whether engine returns JSON array (hook formats to markdown) or final markdown string — pick the cleanest testing/separation boundary
- Exact event-type-to-phase-category mapping logic
- How to extract upcoming phase info from ROADMAP.md within the read budget
- Internal data structures for suggestion candidates before ranking

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Hook infrastructure (Phase 70)
- `hooks/idle-suggestions.cjs` — Current hook handler with event gating, marker file idempotency, and placeholder output that this engine replaces
- `hooks/hooks.json` — Notification hook registration with `idle_prompt` matcher and `async: true`

### Event infrastructure (Phase 58/v0.8)
- `bin/lib/event-bus.cjs` — NDJSON event bus, session file path pattern (`/tmp/pde-session-{sessionId}.ndjson`), event schema
- `hooks/emit-event.cjs` — Reference implementation for hook → CJS module pattern

### State and design modules
- `bin/lib/state.cjs` — STATE.md parsing, `blockers` extraction, `current_phase` / `current_phase_name` fields
- `bin/lib/design.cjs` — DESIGN-STATE.md and design-manifest.json management
- `bin/lib/roadmap.cjs` — ROADMAP.md parsing for next-phase lookup

### Requirements
- `.planning/REQUIREMENTS.md` §Suggestion Engine — ENGN-01 through ENGN-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/state.cjs` `cmdStateLoad()`: Already parses STATE.md frontmatter and body, extracts blockers array, current_phase, current_phase_name — reuse directly
- `bin/lib/roadmap.cjs`: Parses ROADMAP.md phase list — can extract next-phase entry for preview suggestions
- `bin/lib/design.cjs`: Manages DESIGN-STATE.md with stage completion tracking — can detect incomplete design stages
- `bin/lib/core.cjs` `loadConfig()`: Reads `.planning/config.json` for session ID and monitoring config

### Established Patterns
- All `bin/lib/*.cjs` modules export functions that take `cwd` as first argument — new module should follow this
- Zero npm dependencies — all modules use Node.js built-ins only
- `os.tmpdir()` for all temp file paths (cross-platform /tmp/)
- Hook handlers use stdin JSON parse → process → exit 0 pattern

### Integration Points
- `hooks/idle-suggestions.cjs` line 65-75: Replace placeholder content write with `require('../bin/lib/idle-suggestions.cjs')` call
- `/tmp/pde-suggestions-{sessionId}.md`: Output file path already established by Phase 70 hook
- `pde-tools.cjs`: May need a `suggest` subcommand for the Phase 73 CLI fallback (`/pde:suggestions`)

</code_context>

<specifics>
## Specific Ideas

- Visual style inspired by daemon log output — quiet, lowercase, monospace-native
- Block element intensity as a data channel (cost encoding) rather than just decoration
- Stats footer gives transparency into the ranking/filtering process without cluttering the main list

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 71-suggestion-engine*
*Context gathered: 2026-03-21*
