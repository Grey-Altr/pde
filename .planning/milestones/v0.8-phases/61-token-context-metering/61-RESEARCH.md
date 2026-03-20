# Phase 61: Token & Context Metering — Research

**Researched:** 2026-03-20
**Domain:** Token estimation, cost metering, context window tracking in tmux-based TUI dashboards
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOKN-01 | Token estimation uses chars/4 heuristic for all text content, clearly labeled "~est." | Heuristic validation, bash arithmetic pattern, display labeling conventions |
| TOKN-02 | Cost estimation uses per-model pricing from existing model-profiles configuration | Anthropic official pricing table, Node.js pricing lookup pattern, model-profiles.cjs integration |
| TOKN-03 | Context window utilization displayed as percentage with orchestrator scope label | Context window sizes from Anthropic docs, progress bar in terminal, scope labeling |
</phase_requirements>

---

## Summary

Phase 61 replaces two stub pane scripts (`pane-token-meter.sh` and `pane-context-window.sh`) with live implementations that consume the NDJSON event stream to display running token/cost estimates and context window utilization. The technical surface is narrow: shell arithmetic, a small Node.js pricing lookup embedded in the pane script, and careful terminal formatting. There are no new dependencies; everything uses the existing tool chain (bash, Node.js, `tail -F`).

The chars/4 heuristic is the locked estimation strategy. It is deliberately imprecise — "4 characters per token" is the Anthropic-published rule of thumb for English prose and approximately correct for code and JSON. The dashboard exists to surface order-of-magnitude cost awareness, not billing accuracy. All displays are labeled "~est." to make this explicit.

The context window pane is scoped strictly to the orchestrator. Claude Code subagents each have their own separate context windows; the dashboard cannot observe them. The label "Orchestrator context (~estimated)" is required by TOKN-03 and must not be elided. The percentage is computed from estimated token count divided by the model's context window size (from the Anthropic docs: Opus 4.6 and Sonnet 4.6 = 1M tokens, Haiku 4.5 = 200k tokens).

**Primary recommendation:** Implement both pane scripts as self-contained bash/Node.js scripts that read pricing and context window data from a small embedded constants object. Keep the pricing table in `pane-token-meter.sh` as an inline constant (no new config files). The model name comes from `config.json`'s `model_profile` field, resolved against the existing `model-profiles.cjs` mapping at display time.

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| bash | 3.2+ | pane script shell, arithmetic, event loop | Project-standard; all pane scripts are bash |
| Node.js | 18+ | JSON parsing, pricing lookup, division math | Project-standard; already used in monitor-dashboard.sh and validation scripts |
| tail -F | POSIX | Stream new NDJSON lines into pane | Established Phase 59 pattern; self-heals if file not yet created |
| printf | bash builtin | Terminal formatting, ANSI colors, cursor positioning | Already used in all pane scripts; no external dep |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| jq | 1.6+ | Extract fields from NDJSON events | When needing cleaner JSON field extraction; already soft-checked in monitor-dashboard.sh |
| `\033[N;1H\033[J` (ANSI) | — | Cursor repositioning to overwrite previous display | Avoids scroll; the existing pane-token-meter.sh already uses this pattern |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline pricing constants in bash | Separate pricing.json config file | New config file adds complexity; inline constants in a ~60-line script are simpler and co-located with the code that uses them |
| Node.js for pricing lookup | Pure bash arithmetic with `bc` | `bc` is not universally installed; Node.js `Math.round` handles floats correctly; project already uses Node.js inline in scripts |
| chars/4 in bash `$(( ))` | Pipe to `awk '{print int($0/4)}'` | Bash `$(( ))` is sufficient for integer division; awk adds a subprocess per line |
| Hardcoded context window per model tier | Dynamic API lookup at display time | API lookup adds latency and network dep; context windows are stable; hardcode with a comment referencing the docs URL |

**Installation:** No new dependencies. All required tools are already in the project toolchain.

---

## Architecture Patterns

### Recommended Changes to Existing Files

```
bin/
├── pane-token-meter.sh       # REPLACE stub with live implementation
└── pane-context-window.sh    # REPLACE static placeholder with live implementation

.planning/phases/61-token-context-metering/
└── validate-token-metering.sh  # NEW: Nyquist validation script
```

No new commands, workflows, or config files are needed. Both scripts already receive `$NDJSON` as `$1`. The context window pane currently takes no args; Phase 61 should pass the NDJSON path to it (requires a one-line change in `monitor-dashboard.sh`'s `build_full_layout` function).

### Pattern 1: Live Token Accumulator with Cost Display

**What:** `tail -F` loop that accumulates estimated token counts, looks up per-model pricing, and overwrites the display every N events.

**When to use:** This is the core pattern for `pane-token-meter.sh`.

```bash
#!/usr/bin/env bash
# pane-token-meter.sh — live token estimate and cost meter
# TOKN-01: chars/4 heuristic, labeled "~est."
# TOKN-02: per-model pricing from model-profiles config

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-token-meter.sh <ndjson-path>"
  exit 1
fi

# Resolve model profile from config.json (use Node.js for portability)
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
CONFIG_PATH="${PLUGIN_ROOT}/.planning/config.json"

# Inline pricing lookup via Node.js — runs ONCE at startup
MODEL_INFO=$(node -e "
  const fs = require('fs');
  const path = require('path');
  const { MODEL_PROFILES } = require('${PLUGIN_ROOT}/bin/lib/model-profiles.cjs');

  // Pricing table (USD per million tokens, from Anthropic docs 2026-03-20)
  // Source: https://platform.claude.com/docs/en/about-claude/pricing
  const PRICING = {
    opus:   { input: 5.00,  output: 25.00, context_window: 1000000 },
    sonnet: { input: 3.00,  output: 15.00, context_window: 1000000 },
    haiku:  { input: 1.00,  output: 5.00,  context_window:  200000 },
  };

  let profile = 'balanced';
  let agentModel = 'sonnet'; // safe default
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join('${PLUGIN_ROOT}', '.planning', 'config.json'), 'utf-8'));
    profile = cfg.model_profile || 'balanced';
    // Orchestrator is pde-executor in balanced/budget; use its model as the representative
    const map = MODEL_PROFILES['pde-executor'];
    if (map) agentModel = map[profile] || 'sonnet';
  } catch {}

  const p = PRICING[agentModel] || PRICING['sonnet'];
  // Output: model|input_price_per_mtok|output_price_per_mtok|context_window
  process.stdout.write(agentModel + '|' + p.input + '|' + p.output + '|' + p.context_window);
" 2>/dev/null)

# Parse model info (fallback to sonnet pricing if node fails)
MODEL_NAME=$(echo "$MODEL_INFO" | cut -d'|' -f1)
INPUT_PRICE=$(echo "$MODEL_INFO" | cut -d'|' -f2)
OUTPUT_PRICE=$(echo "$MODEL_INFO" | cut -d'|' -f3)
CONTEXT_WINDOW=$(echo "$MODEL_INFO" | cut -d'|' -f4)

MODEL_NAME="${MODEL_NAME:-sonnet}"
INPUT_PRICE="${INPUT_PRICE:-3.00}"
OUTPUT_PRICE="${OUTPUT_PRICE:-15.00}"
CONTEXT_WINDOW="${CONTEXT_WINDOW:-1000000}"

echo "[ token / cost ]  model: ${MODEL_NAME}  (~est.)"
echo ""

TOTAL_TOKENS=0
EVENT_COUNT=0

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  line_len=${#line}
  est_tokens=$(( line_len / 4 ))
  TOTAL_TOKENS=$(( TOTAL_TOKENS + est_tokens ))
  EVENT_COUNT=$(( EVENT_COUNT + 1 ))

  if [ $(( EVENT_COUNT % 5 )) -eq 0 ] || [ "$EVENT_COUNT" -le 5 ]; then
    # Compute cost: tokens / 1,000,000 * price
    # Use Node.js for float arithmetic — bash $(( )) is integers only
    COST_LINE=$(node -e "
      const t = ${TOTAL_TOKENS};
      const ip = ${INPUT_PRICE};
      const op = ${OUTPUT_PRICE};
      // Estimate: 70% input, 30% output (heuristic for agentic workloads)
      const cost = (t * 0.7 / 1000000 * ip) + (t * 0.3 / 1000000 * op);
      process.stdout.write('\$' + cost.toFixed(4));
    " 2>/dev/null)
    COST_LINE="${COST_LINE:-\$?.????}"

    # Context utilization percentage
    CTX_PCT=$(( TOTAL_TOKENS * 100 / CONTEXT_WINDOW ))
    [ "$CTX_PCT" -gt 100 ] && CTX_PCT=100

    printf '\033[3;1H\033[J'
    printf '  Events:      %d\n' "$EVENT_COUNT"
    printf '  Tokens:      %d (~est.)\n' "$TOTAL_TOKENS"
    printf '  Cost:        %s (~est.)\n' "$COST_LINE"
    printf '  Ctx window:  %d%%  (%d / %d tokens)\n' "$CTX_PCT" "$TOTAL_TOKENS" "$CONTEXT_WINDOW"
    printf '\n'
    printf '\033[90m  Heuristic: chars/4. Model: %s.\033[0m\n' "$MODEL_NAME"
    printf '\033[90m  Scope: orchestrator only (not subagents)\033[0m\n'
  fi
done
```

### Pattern 2: Context Window Pane — Bar Display

**What:** `pane-context-window.sh` displays context utilization as a visual bar with percentage. Receives NDJSON path and tracks token count independently.

**When to use:** This is the core pattern for `pane-context-window.sh`.

**Key decision:** The context window pane and the token meter pane could share state, but they run in separate tmux panes as separate processes. The cleanest approach is for each to independently accumulate its own token count from the NDJSON stream. State sharing between pane processes requires IPC (named pipes, files) which REQUIREMENTS.md explicitly prohibits for named pipes. Using a shared counter file is viable but adds write-lock complexity. Independent accumulation is simpler and correct — both panes will converge to the same total (starting from the same NDJSON file).

```bash
#!/usr/bin/env bash
# pane-context-window.sh — orchestrator context window utilization
# TOKN-03: percentage with "Orchestrator context (~estimated)" label

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  # Fallback: static display (dashboard running without args — old behavior)
  echo "[ context window ]"
  echo ""
  echo "  Orchestrator context (~estimated)"
  echo ""
  echo "  No NDJSON path provided."
  while true; do sleep 60; done
fi

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# Resolve context window size from model profile
CONTEXT_WINDOW=$(node -e "
  const fs = require('fs');
  const path = require('path');
  const { MODEL_PROFILES } = require('${PLUGIN_ROOT}/bin/lib/model-profiles.cjs');
  const CONTEXT = { opus: 1000000, sonnet: 1000000, haiku: 200000 };
  let w = 1000000;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join('${PLUGIN_ROOT}', '.planning', 'config.json'), 'utf-8'));
    const profile = cfg.model_profile || 'balanced';
    const map = MODEL_PROFILES['pde-executor'];
    const model = (map && map[profile]) || 'sonnet';
    w = CONTEXT[model] || 1000000;
  } catch {}
  process.stdout.write(String(w));
" 2>/dev/null)
CONTEXT_WINDOW="${CONTEXT_WINDOW:-1000000}"

echo "[ context window ]"
echo ""
echo "  Orchestrator context (~estimated)"
echo ""

TOTAL_TOKENS=0
EVENT_COUNT=0
BAR_WIDTH=32

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  line_len=${#line}
  est_tokens=$(( line_len / 4 ))
  TOTAL_TOKENS=$(( TOTAL_TOKENS + est_tokens ))
  EVENT_COUNT=$(( EVENT_COUNT + 1 ))

  if [ $(( EVENT_COUNT % 5 )) -eq 0 ] || [ "$EVENT_COUNT" -le 5 ]; then
    PCT=$(( TOTAL_TOKENS * 100 / CONTEXT_WINDOW ))
    [ "$PCT" -gt 100 ] && PCT=100
    FILLED=$(( PCT * BAR_WIDTH / 100 ))
    EMPTY=$(( BAR_WIDTH - FILLED ))

    BAR=""
    i=0
    while [ $i -lt $FILLED ]; do BAR="${BAR}#"; i=$(( i + 1 )); done
    while [ $i -lt $BAR_WIDTH ]; do BAR="${BAR} "; i=$(( i + 1 )); done

    printf '\033[4;1H\033[J'
    printf '  Usage:  %d%%  (~est.)\n' "$PCT"
    printf '\n'
    printf '  [%s]\n' "$BAR"
    printf '\n'
    printf '\033[90m  %d / %d tokens (~est.)\033[0m\n' "$TOTAL_TOKENS" "$CONTEXT_WINDOW"
    printf '\033[90m  Scope: orchestrator only (not subagents)\033[0m\n'
  fi
done
```

### Pattern 3: monitor-dashboard.sh Patch

`pane-context-window.sh` currently receives no arguments. Phase 61 must patch `monitor-dashboard.sh` to pass `$ndjson` to it:

```bash
# In build_full_layout(), change this line:
tmux send-keys -t "${P3}" "bash '${PLUGIN_ROOT}/bin/pane-context-window.sh'" C-m
# To:
tmux send-keys -t "${P3}" "bash '${PLUGIN_ROOT}/bin/pane-context-window.sh' '${ndjson}'" C-m
```

This is a one-line change in an existing function. No layout changes needed.

### Anti-Patterns to Avoid

- **State sharing between pane processes via temp files:** Requires file-locking logic. Independent accumulation per pane is simpler and sufficient.
- **Using `bc` for float arithmetic:** `bc` is not guaranteed to be installed. Node.js is already required by the project and handles floats cleanly.
- **`$(( ))` for cost calculation:** Bash integer arithmetic truncates `0.000003 * 5` to 0. Always use Node.js for USD cost math.
- **Spawning node for EVERY event line:** The cost calculation node invocation runs once every 5 events. Spawning a new node process per event would add ~50ms of latency per event and saturate the pane's CPU at scale.
- **Dynamic API pricing lookup:** Pricing changes infrequently; network lookups from a pane script add latency, failure modes, and auth complexity. Embed the pricing table as inline constants with a comment referencing the source URL and date.
- **Displaying raw dollars without "~est.":** TOKN-01 and success criterion 1 require the approximation label on every numeric display. Never display a bare token count or cost figure.
- **Implying subagent coverage:** The context window pane label must read "Orchestrator context (~estimated)". Any label that does not scope to the orchestrator violates TOKN-03 and success criterion 3.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Float arithmetic in bash | `bc` pipeline or custom float emulation | Node.js one-liner inline | Node.js is already a project dependency; `bc` has inconsistent availability; inline node handles 4-digit precision trivially |
| Model name → pricing lookup | Parse model-profiles.cjs manually in bash | Require model-profiles.cjs from Node.js inline | model-profiles.cjs is the authoritative source; requiring it directly avoids duplication |
| Context window size lookup | Hardcode per-model in bash variable | Single Node.js lookup from pricing constants at startup | Centralizes the lookup, survives profile changes, and runs only once per pane lifetime |
| Token accumulation | External counter file, Redis, etc. | In-process bash variable (`TOTAL_TOKENS`) | The pane is a single long-running process; in-process variables are simplest and reliable |
| Progress bar rendering | ncurses / blessed / tput setab | Pure bash string construction (`#` fill + space fill) | REQUIREMENTS.md prohibits terminal-owning frameworks; bash string construction is 5 lines |
| Cursor control | Full curses redraw | `\033[N;1H\033[J` ANSI escape | Already used in the existing pane-token-meter.sh stub; consistent with project patterns |

**Key insight:** The entire implementation fits in ~60 lines per pane script. The only real logic is: accumulate `${#line}/4` per event, compute cost as float, render a bar. Resist the urge to add classes, modules, or config files.

---

## Common Pitfalls

### Pitfall 1: Integer Division Truncates Small Costs to Zero

**What goes wrong:** `COST=$(( TOTAL_TOKENS * 3 / 1000000 ))` returns 0 for any session under 333,333 tokens because bash integer arithmetic discards the fractional part first.

**Why it happens:** Bash `$(( ))` is strictly integer. Multiplying 10,000 tokens by $3/MTok gives $0.03 — but `10000 * 3 / 1000000` = `30000 / 1000000` = 0 in integer math.

**How to avoid:** Use Node.js for all cost calculations. The pattern `node -e "process.stdout.write((${TOTAL_TOKENS} / 1000000 * 3).toFixed(4))"` is correct and runs in ~30ms.

**Warning signs:** Cost display always shows `$0.0000` regardless of event count.

### Pitfall 2: Cursor Repositioning Assumptions About Pane Line Count

**What goes wrong:** `\033[3;1H` moves cursor to row 3, column 1 — but if the pane is shorter than 3 rows (e.g., in minimal layout fallback), the cursor wraps and output is garbled.

**Why it happens:** The full 6-pane layout gives each pane roughly 10-15 rows. The minimal layout shows only agent activity and pipeline progress panes (token meter not shown in minimal layout). So this is a non-issue in practice — token meter and context window only appear in the full layout where pane height is sufficient.

**How to avoid:** Confirm in `monitor-dashboard.sh` that token meter and context window panes are only spawned in `build_full_layout`, not `build_minimal_layout`. (They already are — only agent activity and pipeline progress are in the minimal layout.)

**Warning signs:** Garbled output, text appearing in the wrong pane.

### Pitfall 3: Model Profile Resolution Race Condition

**What goes wrong:** The pane script runs the model/pricing Node.js lookup at startup. If `config.json` is modified after the pane starts (e.g., profile is changed mid-session), the pricing displayed becomes stale.

**Why it happens:** The startup lookup is a one-time read.

**How to avoid:** This is acceptable for Phase 61. The profile is set before the dashboard is launched and does not change during a normal PDE session. Document this as a known limitation. The Future Requirements section already lists TOKN-05 (per-agent breakdown) which would need live resolution.

**Warning signs:** No warning — this is a design choice, not a bug.

### Pitfall 4: NDJSON Line Length vs. Actual Content Length

**What goes wrong:** The `${#line}` measurement in pane-token-meter.sh counts the entire NDJSON line including JSON structure characters (`{"schema_version":"1.0","ts":...}`). This is intentional — the chars/4 heuristic applies to the whole serialized event — but users may question why even session_start events contribute token counts.

**Why it happens:** The event stream itself IS the content being metered. The shell script is applying chars/4 to the serialized event bytes, not to some extracted "content" field.

**How to avoid:** This is the correct behavior per TOKN-01. The heuristic measures the raw stream bytes. Document this in the pane's footer comment. The "~est." label is the user-facing acknowledgment of imprecision.

**Warning signs:** None — this is expected behavior.

### Pitfall 5: Node.js Subprocess Per 5 Events — Latency Budget

**What goes wrong:** Each cost update spawns a Node.js process. At very high event rates (e.g., a fast bash_called flood), the 5-event refresh cadence triggers ~1 node invocation per second. Node startup overhead is ~30-50ms on a warm system.

**Why it happens:** Node cold-start overhead.

**How to avoid:** The 5-event batching already mitigates this. Additionally, the NDJSON stream from PDE is low-frequency (Claude Code emits events at tool-call granularity, not millisecond granularity). In practice, event rates are under 10/second during active operation. At 5-event batching, that is at most 2 node invocations/second — well within budget. If the rate becomes a concern, increase the batch size to 20.

**Warning signs:** Pane appears to lag or freeze; CPU usage spikes in a pane process.

### Pitfall 6: Haiku 4.5 Context Window (200k, Not 1M)

**What goes wrong:** Displaying context utilization as X% of 1M tokens when the active model is Haiku 4.5 (200k context) makes the percentage 5x too small.

**Why it happens:** Opus and Sonnet (latest) have 1M token context windows; Haiku 4.5 has 200k. This is a meaningful difference for context window tracking.

**How to avoid:** The pricing/context lookup must include context window size per model tier. The embedded constants must have `haiku: { context_window: 200000 }` vs `opus/sonnet: { context_window: 1000000 }`. Verified from Anthropic models overview (2026-03-20).

**Warning signs:** Context bar appears very low even after many events when using a haiku-profile PDE session.

---

## Code Examples

Verified patterns from the project and official Anthropic documentation:

### Pricing Constants (authoritative as of 2026-03-20)

```javascript
// Source: https://platform.claude.com/docs/en/about-claude/pricing (fetched 2026-03-20)
// Source: https://platform.claude.com/docs/en/about-claude/models/overview (fetched 2026-03-20)
const PRICING = {
  opus:   { input_per_mtok: 5.00,  output_per_mtok: 25.00, context_window: 1000000 },
  sonnet: { input_per_mtok: 3.00,  output_per_mtok: 15.00, context_window: 1000000 },
  haiku:  { input_per_mtok: 1.00,  output_per_mtok: 5.00,  context_window:  200000 },
};
// Note: model-profiles.cjs uses 'opus'/'sonnet'/'haiku' as the tier names.
// Map these directly — no translation needed.
```

### Float Cost Calculation (inline node)

```bash
# Source: project pattern from validate-archival.sh (node inline invocations)
COST_LINE=$(node -e "
  const tokens = ${TOTAL_TOKENS};
  const ip = ${INPUT_PRICE};
  const op = ${OUTPUT_PRICE};
  // 70/30 input/output split heuristic for agentic workloads
  const cost = (tokens * 0.7 / 1e6 * ip) + (tokens * 0.3 / 1e6 * op);
  process.stdout.write('\$' + cost.toFixed(4) + ' ~est.');
" 2>/dev/null)
COST_LINE="${COST_LINE:-\$0.0000 ~est.}"  # fallback if node unavailable
```

### model-profiles.cjs Integration (require from inline node)

```bash
# Source: model-profiles.cjs module.exports pattern (bin/lib/model-profiles.cjs)
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
MODEL_TIER=$(node -e "
  const path = require('path');
  const { MODEL_PROFILES } = require(path.join('${PLUGIN_ROOT}', 'bin', 'lib', 'model-profiles.cjs'));
  let tier = 'sonnet';
  try {
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync(path.join('${PLUGIN_ROOT}', '.planning', 'config.json'), 'utf-8'));
    const profile = cfg.model_profile || 'balanced';
    const map = MODEL_PROFILES['pde-executor'];
    if (map && map[profile]) tier = map[profile];
  } catch {}
  process.stdout.write(tier);
" 2>/dev/null)
MODEL_TIER="${MODEL_TIER:-sonnet}"
```

### Terminal Progress Bar (pure bash)

```bash
# Source: bash string construction pattern — no external tools
render_bar() {
  local pct="$1"
  local width=32
  local filled=$(( pct * width / 100 ))
  local bar=""
  local i=0
  while [ $i -lt $filled ]; do bar="${bar}#"; i=$(( i + 1 )); done
  while [ $i -lt $width ]; do bar="${bar} "; i=$(( i + 1 )); done
  printf '  [%s]  %d%%\n' "$bar" "$pct"
}
```

### Cursor Overwrite Pattern (already in pane-token-meter.sh)

```bash
# Source: existing pane-token-meter.sh (Phase 59 implementation)
# Moves cursor to row 3, clears from cursor to end of screen, then reprints
printf '\033[3;1H\033[J'
printf '  Events:      %d\n' "$EVENT_COUNT"
printf '  Tokens:      %d (~est.)\n' "$TOTAL_TOKENS"
printf '  Cost:        %s\n' "$COST_LINE"
```

### Validation Script Pattern (from validate-archival.sh)

```bash
# Source: .planning/phases/60-session-archival/validate-archival.sh
# Standard check/pass/fail pattern for Phase 6x validation scripts
check() {
  local id="$1"; local result="$2"; local reason="${3:-}"
  if [ "$result" = "PASS" ]; then echo "$id PASS"; PASS_COUNT=$((PASS_COUNT + 1));
  else echo "$id FAIL: $reason"; FAIL_COUNT=$((FAIL_COUNT + 1)); fi
}
```

---

## Prior Art Analysis

### How Other CLI/TUI Token Meters Work

**Warp terminal (MEDIUM confidence — from WebSearch):** Warp integrates an AI token counter in its terminal status bar. It reads token counts from API response headers (`x-anthropic-tokens-remaining` or similar) rather than estimating from content. This approach requires API access at display time — not available to a passive event stream consumer.

**Simon Willison's llm tool (MEDIUM confidence):** The `llm` CLI uses tiktoken for exact token counts. Tiktoken requires a Python install and model-specific BPE vocabulary files (several MB each). This is explicitly out of scope per REQUIREMENTS.md: "Zero-npm constraint is a project-level invariant" and "Exact token counting: Anthropic provides no local tokenizer for Claude 3+ models."

**Aider cost tracking (MEDIUM confidence):** Aider tracks token usage from API response `usage` fields (which include exact input/output token counts). This is the most accurate approach but requires a live API connection. PDE's dashboard is a passive consumer of the NDJSON event stream — API responses are not routed through it.

**Key insight for PDE:** PDE cannot intercept API response usage data because Claude Code does not expose it to hooks. The chars/4 heuristic is the only viable approach for a passive stream consumer. This is the correct tradeoff — it delivers useful order-of-magnitude estimates without adding API dependencies or violating the zero-npm constraint.

### chars/4 Heuristic Empirical Validation

The Anthropic pricing documentation itself states: "As a rough estimate, 1 token is approximately 4 characters or 0.75 words in English." This is sourced directly from the official pricing FAQ (platform.claude.com/docs/en/about-claude/pricing, "How is token usage calculated?").

For PDE's NDJSON events, the content being metered is:
- NDJSON metadata overhead: ~100 characters per event (`schema_version`, `ts`, `session_id`, `event_type`, `extensions` keys) → ~25 tokens
- Actual content fields: file paths (20-80 chars), agent types (10-20 chars), commands (up to 200 chars per REQUIREMENTS.md)

A typical `subagent_start` event is ~160 characters → ~40 tokens. A `file_changed` event with a short path is ~200 characters → ~50 tokens. These are plausible estimates for event metadata; they do not account for the actual prompt/response content that Claude Code is processing.

**Important caveat:** The NDJSON events are NOT the Claude Code conversation. They are hook-generated metadata. The token meter measures event stream volume, which correlates with but does not directly represent Claude's actual context usage. The "~est." label and "Orchestrator context (~estimated)" scope label are necessary and correct.

---

## Edge Cases & Failure Modes

### EF-01: Node.js Unavailable at Pane Start

**Scenario:** `node` binary not found (unlikely in project but defensive).

**Behavior:** The startup pricing lookup returns an empty string. Bash fallbacks: `MODEL_TIER="${MODEL_TIER:-sonnet}"`, `INPUT_PRICE="${INPUT_PRICE:-3.00}"`, etc.

**Mitigation:** The fallback to sonnet pricing is the least surprising default — it is the most common model in the balanced profile.

### EF-02: config.json Unreadable at Pane Start

**Scenario:** Dashboard launched before PDE session starts, config.json not yet written or locked.

**Behavior:** The Node.js config read throws; the fallback model tier is used. The pane displays "sonnet" pricing and 1M context window, which is correct for the balanced profile's executor model.

**Mitigation:** The fallback is safe. The pricing will be slightly wrong for budget profile (haiku) sessions, but the "~est." label communicates imprecision.

### EF-03: NDJSON File Does Not Exist Yet

**Scenario:** Dashboard launched before any PDE command runs; NDJSON file hasn't been created.

**Behavior:** `tail -F` waits indefinitely. The pane shows the header line and blank accumulator fields.

**Mitigation:** This is the correct behavior per Phase 59 patterns. `tail -F` self-heals when the file appears. The pane header "waiting for session events..." banner should remain visible during this idle period.

### EF-04: NDJSON File Contains Corrupt Lines

**Scenario:** Partial write or file corruption produces a non-JSON line.

**Behavior:** `${#line}` still works (it measures bytes regardless of JSON validity). The token count accumulates based on raw byte length, which is fine — we're doing chars/4 on the raw content.

**Mitigation:** No special handling needed. The heuristic does not depend on JSON parsing.

### EF-05: Very Long Event Lines (e.g., large command output)

**Scenario:** A `bash_called` event with a long command (up to 200 chars per emit-event.cjs slice) produces a line of ~350 chars → ~88 tokens per event. This inflates the estimate.

**Behavior:** The token estimate grows faster than typical for sessions with many bash calls.

**Mitigation:** This is expected and correct — large events represent larger context consumption. The chars/4 heuristic is applied uniformly. Document in pane footer: "Heuristic: chars/4 of event stream."

### EF-06: Integer Overflow in TOTAL_TOKENS

**Scenario:** A very long session generates enough events to push `TOTAL_TOKENS` near bash's 64-bit integer limit (~9.2 × 10^18). At 88 tokens/event, this would require ~10^17 events. Not a practical concern.

**Mitigation:** No mitigation needed. Bash integers are 64-bit signed; overflow is not a real risk for any realistic PDE session.

### EF-07: Context Percentage Exceeds 100%

**Scenario:** The estimated token count exceeds the model's context window size (possible since the estimate is the event stream, not actual conversation tokens).

**Behavior:** Without a cap, the percentage could exceed 100%.

**Mitigation:** Add `[ "$CTX_PCT" -gt 100 ] && CTX_PCT=100` after the percentage calculation. Display shows "100% (capped)" or just "100% ~est." — either is acceptable.

---

## Performance Considerations

### Event Processing Latency

The pane scripts run in tmux panes that are already decoupled from the Claude Code execution path. Latency in pane processing does not affect PDE workflows.

For the token meter pane specifically:
- `${#line}` — O(1) — bash measures string length inline
- `$(( ))` arithmetic — O(1) — bash integer arithmetic
- `tail -F` pipe read — driven by kernel; no busy-wait
- Node.js cost calculation — spawned every 5 events — ~30-50ms startup, then exits
- `printf` with ANSI cursor move — O(1) — syscall overhead only

At a sustained event rate of 10 events/second (high for PDE), the node spawn occurs every ~500ms. This is well within acceptable display latency for a monitoring dashboard.

### Memory

The pane script accumulates TOTAL_TOKENS as a bash integer variable. There is no growing buffer or array. Memory usage is constant regardless of session length.

### CPU

The `tail -F` process reads from a kernel pipe; it sleeps between reads. CPU usage for a quiet pane is effectively zero. The Node.js subprocess spawns are the only non-trivial CPU events, and they are O(events/5) frequency.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API response parsing for exact token counts | chars/4 heuristic for passive stream | N/A — PDE context requires estimation | Estimates will be off from actual API usage by 0-40% depending on content type; labeled ~est. |
| tiktoken / sentencepiece for exact counts | No local tokenizer | Claude 3+ uses a proprietary tokenizer with no public BPE vocab | Exact counting requires Anthropic's count_tokens API (deferred to TOKN-04 in Future Requirements) |
| Whole-screen TUI redraws via curses | Targeted cursor repositioning `\033[N;1H\033[J` | Always for tmux panes | Full redraws in a tmux pane cause flicker; cursor repositioning only redraws changed content |
| Separate config file for pricing | Inline constants with source URL comment | N/A — project constraint (zero new deps, zero new files) | Simpler; no config parsing overhead; pricing updates are manual but infrequent |

**Deprecated/outdated:**
- `\033[2J` (clear entire screen): causes flicker in tmux panes; use `\033[N;1H\033[J` to clear from cursor position instead
- Spawning `awk` per line for math: replaced by bash `$(( ))` for integers and inline node for floats

---

## Open Questions

1. **Haiku 3 retirement on 2026-04-19**
   - What we know: Claude Haiku 3 (`claude-3-haiku-20240307`) is deprecated and will be retired April 19, 2026. model-profiles.cjs uses the alias `haiku` which currently resolves to `haiku-4-5`.
   - What's unclear: Whether any PDE agent currently maps to `haiku` in a way that resolves to Haiku 3 specifically.
   - Recommendation: The pricing constants should use `haiku` as the key, and assume it means the current-generation Haiku (4.5: $1/$5/MTok, 200k context). The alias in model-profiles.cjs points to `haiku` generically; actual model resolution is handled by Claude Code, not PDE. The pricing lookup is correct at the tier level.

2. **Token estimation validation against real sessions**
   - What we know: STATE.md documents this blocker: "chars/4 proxy measurement needs empirical validation against real session NDJSON; if tokenx 1.3.0 is vendored, confirm CJS build is current at implementation time."
   - What's unclear: How far off is chars/4 for PDE's actual event content (mix of JSON metadata, file paths, command snippets)?
   - Recommendation: The validation script should compute the estimated total from a real NDJSON fixture and compare chars/4 to known-good values. A ±40% error is acceptable given the "~est." labeling. Exact validation against Anthropic's actual token counts requires the count_tokens API (TOKN-04, deferred). For Phase 61, acceptance is: "estimate is not zero, not wildly large, and labeled ~est."

3. **Updating monitor-dashboard.sh to pass NDJSON to context window pane**
   - What we know: Currently `pane-context-window.sh` is called with no args. Phase 61 needs it to receive the NDJSON path.
   - What's unclear: Whether changing the invocation in `monitor-dashboard.sh` will break the Phase 59 validation script.
   - Recommendation: Check `validate-dashboard.sh` — it does NOT test the pane invocation arguments, only the presence of string patterns in the scripts. Adding the `$ndjson` argument is safe. The pane script should also handle the no-arg case gracefully (static fallback display) for backward compatibility.

---

## Validation Architecture

> nyquist_validation is enabled (key is absent from workflow config defaults section, which means enabled).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bash + Node.js inline (zero deps, matches Phases 59/60 pattern) |
| Config file | none — inline validation via bash script |
| Quick run command | `bash .planning/phases/61-token-context-metering/validate-token-metering.sh --quick` |
| Full suite command | `bash .planning/phases/61-token-context-metering/validate-token-metering.sh` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOKN-01 | pane-token-meter.sh labels output with `~est.` | structural | `grep '~est\.' bin/pane-token-meter.sh` | ❌ Wave 0 |
| TOKN-01 | chars/4 heuristic: `line_len / 4` present | structural | `grep 'line_len / 4\|${#line}' bin/pane-token-meter.sh` | ❌ Wave 0 |
| TOKN-01 | Token count displayed with ~est. label from fixture NDJSON | unit | Node.js inline: simulate 5 events, verify output contains `~est.` | ❌ Wave 0 |
| TOKN-02 | Pricing constants for opus/sonnet/haiku present in pane-token-meter.sh | structural | `grep -E 'opus.*5\|sonnet.*3\|haiku.*1' bin/pane-token-meter.sh` | ❌ Wave 0 |
| TOKN-02 | Sonnet cost differs from Haiku cost for same token count | unit | Node.js inline: compute cost at sonnet vs haiku rate, verify different | ❌ Wave 0 |
| TOKN-03 | pane-context-window.sh contains `Orchestrator context (~estimated)` | structural | `grep 'Orchestrator context (~estimated)' bin/pane-context-window.sh` | ❌ Wave 0 |
| TOKN-03 | Context percentage is integer between 0-100 | unit | Node.js inline: 10000 tokens / 1000000 context = 1% | ❌ Wave 0 |
| TOKN-03 | pane-context-window.sh contains "not subagents" scope label | structural | `grep 'subagents' bin/pane-context-window.sh` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bash .planning/phases/61-token-context-metering/validate-token-metering.sh --quick`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/61-token-context-metering/validate-token-metering.sh` — new validation script

*(No existing test infrastructure covers TOKN-01/02/03. All checks are new.)*

---

## Sources

### Primary (HIGH confidence)

- `https://platform.claude.com/docs/en/about-claude/pricing` — Anthropic official pricing table (fetched 2026-03-20): Opus 4.6 $5/$25/MTok, Sonnet 4.6 $3/$15/MTok, Haiku 4.5 $1/$5/MTok
- `https://platform.claude.com/docs/en/about-claude/models/overview` — Anthropic official model specs (fetched 2026-03-20): context windows — Opus 4.6: 1M tokens, Sonnet 4.6: 1M tokens, Haiku 4.5: 200k tokens
- Anthropic pricing FAQ ("How is token usage calculated?"): "1 token is approximately 4 characters or 0.75 words in English" — official chars/4 validation
- `bin/lib/model-profiles.cjs` — authoritative model tier mapping (opus/sonnet/haiku); MODEL_PROFILES exports confirmed by direct read
- `bin/pane-token-meter.sh` (Phase 59 stub) — existing chars/4 implementation pattern and `${#line}/4` idiom
- `bin/pane-context-window.sh` (Phase 59 stub) — "Orchestrator context (~estimated)" label already in place; Phase 61 replaces the static display with live content
- `bin/monitor-dashboard.sh` (Phase 59) — `build_full_layout` function shows pane invocation pattern; one-line change needed to pass NDJSON to context window pane
- `.planning/phases/60-session-archival/validate-archival.sh` — canonical Nyquist validation script pattern for this milestone

### Secondary (MEDIUM confidence)

- Anthropic pricing page FAQ ("How is token usage calculated?"): "4 characters or 0.75 words" — cross-verified against model-pricing documentation
- Phase 59 RESEARCH.md prior art section — confirmed zero-npm constraint, blessed/ink prohibition, named-pipe prohibition

### Tertiary (LOW confidence — mark for validation)

- WebSearch: Aider and llm CLI token tracking patterns — confirmed these use API response usage fields or tiktoken; neither is viable for PDE's passive event stream consumer role. MEDIUM confidence on the assertion (multiple sources agree).
- WebSearch: Warp terminal token display — uses API response headers; not applicable to PDE context. LOW confidence (single source).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are existing project dependencies; no new choices required
- Architecture patterns: HIGH — direct extension of Phase 59 pane script patterns; pricing from official Anthropic docs
- Pricing constants: HIGH — from official Anthropic pricing page fetched 2026-03-20
- Context window sizes: HIGH — from official Anthropic models overview fetched 2026-03-20
- Pitfalls: HIGH for EF-01 through EF-07 — based on bash behavior analysis and project constraints
- Prior art analysis: MEDIUM — secondary sources for Aider/llm/Warp patterns

**Research date:** 2026-03-20
**Valid until:** 2026-06-20 for tool patterns (stable); 2026-05-20 for pricing (review after any Anthropic pricing announcement)

**Pricing review trigger:** Re-verify if Anthropic announces model pricing changes or if a new model generation is released that maps to the `opus`/`sonnet`/`haiku` tier aliases in model-profiles.cjs.
