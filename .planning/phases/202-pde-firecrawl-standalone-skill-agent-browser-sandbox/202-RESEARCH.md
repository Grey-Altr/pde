# Phase 202: /pde:firecrawl Standalone Skill + Agent + Browser Sandbox - Research

**Researched:** 2026-03-31
**Domain:** Firecrawl MCP — autonomous agent dispatch, browser sandbox (interact), consent gates, credit caps
**Confidence:** HIGH

## Summary

Phase 202 extends the existing `commands/firecrawl.md` and `workflows/firecrawl.md` (created in Phase 200) with two new subcommands: `agent` and `interact`. Both operations are the highest-cost Firecrawl features — the agent consumes hundreds to thousands of credits per run and browser sessions bill at 2–7 credits per session minute — so every dispatch requires explicit user consent and credit caps enforced before the MCP call is made.

The agent workflow is asynchronous: `firecrawl_agent` returns a job ID immediately and the caller polls `firecrawl_agent_status` until status is `completed` or `failed`. The interact workflow is session-bound: `firecrawl_interact` requires a `scrapeId` from a prior `firecrawl_scrape` call and keeps the browser alive for 10 minutes by default (5-minute idle TTL), auto-terminating without user intervention. Playwright code can be executed directly inside the live session via the `code` parameter (Node.js, Python, or Bash).

Both new subcommands follow the same credit-guard pattern established by scrape/search/map/extract/crawl in Phase 200: `probeFirecrawl()` first, then consent gate, then semaphore acquire, then MCP call, then `incrementFirecrawlUsage()`, then semaphore release. The primary differences are the consent gate (new for agent/interact — the existing subcommands did not require explicit confirmation) and the polling loop for agent status.

**Primary recommendation:** Extend `workflows/firecrawl.md` with `agent` and `agent-status` subcommand sections and an `interact` subcommand section. Update `commands/firecrawl.md` to allow `mcp__firecrawl__firecrawl_agent`, `mcp__firecrawl__firecrawl_agent_status`, and `mcp__firecrawl__firecrawl_interact` in the `allowed-tools` list. No changes to `mcp-bridge.cjs` or `firecrawl-cache.cjs` — all necessary TOOL_MAP entries and credit infrastructure already exist.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md and ROADMAP:
- Depends on Phase 199 (firecrawl-cache.cjs) and Phase 200 (Firecrawl tools available)
- Phase 200 already created commands/firecrawl.md and workflows/firecrawl.md with scrape/search/map/extract/crawl subcommands — Phase 202 EXTENDS these files with agent and interact subcommands
- firecrawl_agent requires consent gate showing estimated credit cost — agent call does NOT proceed without explicit user confirmation
- Every agent dispatch must include --max-credits cap
- firecrawl_agent_status returns current status and structured JSON results when complete
- firecrawl_interact launches cloud browser session with documented TTL — auto-terminated on expiry
- User can execute Playwright code inside browser sandbox session
- Blocker: changeTracking format requires markdown co-requested — verify before writing watch subcommand prose
- Blocker: git-diff mode (free) vs JSON mode (5 credits/page) cost difference must be enforced in workflow prose — default to git-diff, JSON mode explicit opt-in only

### Claude's Discretion
All implementation choices at Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGT-01 | User can delegate natural language web research to firecrawl_agent with mandatory maxCredits cap and user consent gate | firecrawl_agent accepts `prompt`, `urls`, `schema`, `maxCredits`; consent gate pattern defined below; 2500-credit default cap must be displayed and confirmed before dispatch |
| AGT-02 | User can check agent job status and retrieve structured JSON results via firecrawl_agent_status | firecrawl_agent_status accepts `id` (job ID); polls until `completed`/`failed`; response includes `creditsUsed`, structured data matching schema, `expiresAt` (24h retention) |
| AGT-03 | User can launch cloud browser sessions via firecrawl_interact for auth-gated content extraction with session TTL management | firecrawl_interact requires a `scrapeId` from a prior scrape call; TTL=10min default, idle=5min default; auto-terminates; session ID returned for subsequent interact calls |
| AGT-04 | User can execute Playwright code in browser sandbox sessions and extract content from authenticated pages | firecrawl_interact `code` parameter accepts Node.js, Python, or Bash; `page` variable is a live Playwright Page object pre-connected to the browser; `language` param selects runtime |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mcp__firecrawl__firecrawl_agent` | MCP tool (firecrawl-mcp) | Autonomous async web research | Only Firecrawl tool that spans multi-domain research without per-URL calls |
| `mcp__firecrawl__firecrawl_agent_status` | MCP tool (firecrawl-mcp) | Poll async agent job | Pairs with firecrawl_agent; no alternative for checking job completion |
| `mcp__firecrawl__firecrawl_interact` | MCP tool (firecrawl-mcp) | Cloud browser session + Playwright execution | Replaces deprecated firecrawl_browser_create/execute/delete; single-call interface |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mcp-bridge.cjs::probeFirecrawl()` | Phase 198 | Credit guard + API key check | First call in every subcommand |
| `mcp-bridge.cjs::acquireFirecrawlSemaphore()` | Phase 198 | Max-2-concurrent enforcement | Before agent and interact calls (high duration operations) |
| `mcp-bridge.cjs::incrementFirecrawlUsage()` | Phase 198 | Deduct credits from config.json | After each successful operation |
| `firecrawl-cache.cjs::writeSource()` | Phase 199 | Cache agent results to disk | Store completed agent output as markdown in scrapes/ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `firecrawl_interact` | `firecrawl_browser_create` + `firecrawl_browser_execute` | Deprecated; two-call session lifecycle is more complex; interact is the modern single-call interface |
| Polling loop in workflow prose | Background job with webhook | PDE workflows are synchronous-first; polling is simpler and consistent with crawl subcommand pattern |

---

## Architecture Patterns

### Existing File Structure (Phase 202 extends, does not replace)

```
commands/
└── firecrawl.md          # ADD: agent, agent-status, interact to allowed-tools list + subcommand routing
workflows/
└── firecrawl.md          # ADD: ## Subcommand: agent, ## Subcommand: agent-status, ## Subcommand: interact sections
bin/lib/
├── mcp-bridge.cjs        # NO CHANGES NEEDED — TOOL_MAP entries already present (lines 270-272)
└── firecrawl-cache.cjs   # NO CHANGES NEEDED — writeSource() handles agent result storage
```

### Pattern 1: Consent Gate (new for Phase 202)

Agent and interact calls display cost estimate and require explicit user confirmation before proceeding. This is NOT in the existing scrape/search/map/extract/crawl subcommands. It must be added as a new step between credit guard check and semaphore acquire.

**What:** Display estimated cost, prompt user to confirm, halt if denied.
**When to use:** Any subcommand with unbounded or high per-minute billing (agent, interact).
**Example prose:**

```
Display consent prompt:
  Firecrawl Agent — Estimated cost: up to {MAX_CREDITS} credits (default cap: 2,500)
  Model: spark-1-mini (default, 60% cheaper) or spark-1-pro if --model pro specified
  Current balance: {result.credits.remaining} credits remaining
  Proceed? (y/N)

IF user does not confirm: Display "Agent dispatch cancelled." and halt.
IF user confirms: Continue to semaphore acquire.
```

### Pattern 2: Async Job Polling (consistent with crawl subcommand)

The crawl subcommand already demonstrates a polling loop with 5-minute timeout. Agent status polling follows the same structure.

```
Poll every 15-30 seconds:
  mcp__firecrawl__firecrawl_agent_status({ id: JOB_ID })

Status values: "processing" | "completed" | "failed" | "cancelled"
Poll guidance: "at least 2-3 minutes before considering failed"
Timeout: 5 minutes (300 seconds), consistent with crawl subcommand
Result retention: 24 hours after completion
```

### Pattern 3: Interact = Scrape First, Then Interact

`firecrawl_interact` requires a `scrapeId` from a prior `firecrawl_scrape` call. The interact subcommand must:
1. Run `firecrawl_scrape` on the target URL first
2. Extract `scrapeId` from response metadata
3. Display browser session info (TTL, idle timeout)
4. Accept Playwright code or natural language prompt from user
5. Call `firecrawl_interact` with `scrapeId` + `code` or `prompt`

```
firecrawl_interact({
  scrapeId: SCRAPE_ID,           // from prior scrape metadata
  code: PLAYWRIGHT_CODE,         // OR
  prompt: NATURAL_LANGUAGE,      // one of these is required
  language: "node",              // "node" | "python" | "bash"
  timeout: 30                    // 1-300 seconds per interaction
})
```

Session TTL: 10 minutes total, 5 minutes idle — auto-terminated, no user action required.

### Pattern 4: Credit Tracking for Variable-Cost Operations

Agent costs are variable (a few hundred to 2,500 credits per run). Interact bills at 2 credits/minute (code-only) or 7 credits/minute (with prompt). Since actual cost is unknown until completion:

- Before dispatch: Show estimated cap (MAX_CREDITS for agent; TTL × rate for interact)
- After completion: Use `creditsUsed` from response to call `incrementFirecrawlUsage(creditsUsed)`
- If response does not include `creditsUsed`: Fall back to conservative estimate (MAX_CREDITS for agent; TTL × 7 for interact)

### Anti-Patterns to Avoid

- **Calling agent without consent gate:** The entire point of AGT-01 is that the agent does NOT proceed without explicit confirmation. Never route to agent dispatch before displaying the consent prompt.
- **Calling interact without scrape first:** `firecrawl_interact` requires a `scrapeId`. There is no "launch browser from scratch" path — you must scrape first.
- **Using deprecated browser tools:** `firecrawl_browser_create` / `firecrawl_browser_execute` / `firecrawl_browser_delete` are marked deprecated in TOOL_MAP. Do not implement the interact subcommand using these tools.
- **Hard-coding maxCredits:** The `--max-credits` flag must be user-overridable. Default is 2,500 but user must be able to pass `--max-credits N` to set a lower cap.
- **Caching interact results directly as scrape cache:** Agent results are structured JSON — write them as JSON strings or as markdown summary via `writeSource()`. Interact results are arbitrary page content — write via `writeSource()` with type `'interact'`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser session lifecycle | Custom session tracking, TTL timers | `firecrawl_interact` (TTL auto-managed by cloud) | Firecrawl cloud auto-terminates at 10min; no client-side timer needed |
| Consent prompting | Custom readline/stdin | Workflow prose instruction to display and await user text response | Claude Code workflows prompt natively; no Node.js stdin needed |
| Credit estimation | Complex per-operation cost calculators | Display max cap (2,500 default); actual charged via `creditsUsed` in response | Actual cost is non-deterministic; cap is the enforceable contract |
| Async job management | Background queues, DB persistence | Polling loop in workflow prose (matches crawl subcommand pattern) | Simple synchronous poll + display matches PDE workflow conventions |
| Playwright session setup | Page navigation, auth flows from scratch | `firecrawl_interact` with `scrapeId` from prior scrape | Firecrawl manages browser state, cookies, and CDP connection |

**Key insight:** Both the agent and interact features are remote cloud resources. The TTL is server-enforced, job state is server-stored, and browser lifecycle is fully managed. The workflow's only job is to initiate, display status, and collect results.

---

## Common Pitfalls

### Pitfall 1: firecrawl_interact Requires scrapeId, Not URL

**What goes wrong:** Developer writes interact subcommand to accept a URL directly and passes it as `url` to `firecrawl_interact`. The call fails or returns unexpected results.
**Why it happens:** The interact docs describe "scrape a URL and then interact" — it's easy to interpret this as a single call.
**How to avoid:** The workflow must call `firecrawl_scrape` first, extract `scrapeId` from `response.metadata.scrapeId`, then pass that to `firecrawl_interact`.
**Warning signs:** MCP error about missing `scrapeId` parameter.

### Pitfall 2: Agent maxCredits Not Exposed to User

**What goes wrong:** Workflow hard-codes `maxCredits: 2500` without a `--max-credits N` override flag. User has no way to set a lower cap for testing or a higher cap for deep research.
**Why it happens:** Default value is documented as 2,500, so it feels like a constant.
**How to avoid:** Parse `--max-credits N` from arguments (default: 500 for caution, or 2500 matching Firecrawl default). Display the active cap in the consent prompt so users see what they are authorizing.

### Pitfall 3: Consent Gate Not Blocking the MCP Call

**What goes wrong:** Workflow displays the consent prompt but then calls `firecrawl_agent` regardless of user response (prompt is informational, not a gate).
**Why it happens:** Workflow prose doesn't explicitly halt on "N" response.
**How to avoid:** Consent gate prose must include: `IF user does not respond "y" or "yes": Display "Agent dispatch cancelled." and halt immediately.`

### Pitfall 4: Agent Status Polling Insufficient Duration

**What goes wrong:** Polling loop times out after 1-2 minutes and reports "failed" when the agent is still processing a complex query.
**Why it happens:** Firecrawl docs say "poll every 15-30 seconds for at least 2-3 minutes" — a shorter loop fails for real research tasks.
**How to avoid:** Set poll interval to 15 seconds, timeout to 5 minutes (300 seconds) — matches the crawl subcommand pattern. Always display "Agent still processing... ({elapsed}s elapsed)" during the wait.

### Pitfall 5: Credit Tracking Before vs After Completion

**What goes wrong:** `incrementFirecrawlUsage()` is called with an estimated amount before completion. If the call fails or returns fewer-than-max credits used, the local balance is permanently wrong.
**Why it happens:** Other subcommands (scrape, search) have fixed credit costs called after success. Agent has variable cost.
**How to avoid:** For agent, call `incrementFirecrawlUsage(result.creditsUsed)` from the completed response. If `creditsUsed` is absent, fall back to `MAX_CREDITS` as a conservative over-deduct. For interact, use actual session duration × rate if available, else TTL × 7 as worst case.

### Pitfall 6: TOOL_MAP Status is VERIFY_REQUIRED

**What goes wrong:** Commands file adds `mcp__firecrawl__firecrawl_agent` to `allowed-tools` but the MCP server does not expose this tool under that exact name, causing silent failures.
**Why it happens:** All Firecrawl tools in TOOL_MAP are marked `TOOL_MAP_VERIFY_REQUIRED` — they were registered before live verification.
**How to avoid:** The plan should include a verification task that calls `firecrawl_agent_status` with a dummy ID to confirm the tool is registered in the MCP server. If it returns a "job not found" error (not a "tool not found" error), the tool name is confirmed.

---

## Code Examples

Verified patterns from official sources and existing codebase conventions:

### Agent Subcommand — Consent Gate and Dispatch

```
// Source: workflows/firecrawl.md pattern (Phase 200) + docs.firecrawl.dev/features/agent

## Subcommand: agent QUERY [--max-credits N] [--model mini|pro] [--urls URL1,URL2]

**Step 1: Parse arguments**
SET QUERY = all tokens before first -- flag
SET MAX_CREDITS = value after --max-credits (default: 500)
SET MODEL = value after --model ("spark-1-mini" default, "spark-1-pro" if "pro" specified)
SET URLS = comma-split value after --urls (optional)

**Step 2: Credit guard check**
[probeFirecrawl() — same pattern as other subcommands]

**Step 3: Consent gate (REQUIRED — agent does NOT proceed without explicit user confirmation)**
Display:
  Firecrawl Agent Research
  Query: {QUERY}
  Credit cap: {MAX_CREDITS} (use --max-credits N to adjust)
  Model: {MODEL}
  Current balance: {result.credits.remaining} credits
  Estimated cost: up to {MAX_CREDITS} credits (most runs: a few hundred)

  Proceed? Type "yes" to confirm, anything else to cancel.

IF user response is not "yes": Display "Agent dispatch cancelled." and halt.

**Step 4: Acquire semaphore**
[acquireFirecrawlSemaphore() — same pattern as crawl subcommand]

**Step 5: Call mcp__firecrawl__firecrawl_agent**
mcp__firecrawl__firecrawl_agent({
  prompt: QUERY,
  maxCredits: MAX_CREDITS,
  ...(URLS.length > 0 && { urls: URLS }),
  ...(SCHEMA && { schema: PARSED_SCHEMA })
})
// Returns: { id: "agent-job-xxxx" }

**Step 6: Poll mcp__firecrawl__firecrawl_agent_status (5-minute timeout)**
Poll every 15 seconds. Display "Agent processing... ({elapsed}s)" each iteration.
IF elapsed > 300s: Display job ID, instruct user to run /pde:firecrawl agent-status {JOB_ID}. Release semaphore. Halt.
IF status === "completed": Continue to Step 7.
IF status === "failed": Display error, release semaphore, halt.

**Step 7: Track credits + release semaphore**
incrementFirecrawlUsage(result.creditsUsed || MAX_CREDITS)
Release semaphore.

**Step 8: Cache results**
writeSource('firecrawl-agent-{JOB_ID}', JSON.stringify(result.data, null, 2),
  { type: 'agent', added_by: 'pde:firecrawl agent' })

**Step 9: Display results**
Agent completed — {JOB_ID}
  Credits used: {result.creditsUsed}
  Cached at: .planning/research/firecrawl-cache/scrapes/firecrawl-agent-{JOB_ID}.md

  {pretty-printed result.data}
```

### agent-status Subcommand

```
// Source: docs.firecrawl.dev/features/agent — status polling endpoint

## Subcommand: agent-status JOB_ID

**Step 1: Parse arguments**
SET JOB_ID = first argument after "agent-status"
IF JOB_ID is missing: Display "Error: job ID required. Usage: /pde:firecrawl agent-status <job-id>" and halt.

**Step 2: Call mcp__firecrawl__firecrawl_agent_status**
mcp__firecrawl__firecrawl_agent_status({ id: JOB_ID })

**Step 3: Display result**
IF status === "processing": Display "Agent {JOB_ID} is still running. Re-run to check again."
IF status === "completed": Display pretty-printed data + creditsUsed
IF status === "failed": Display error details
IF status === "cancelled": Display "Agent job was cancelled."
```

### interact Subcommand

```
// Source: docs.firecrawl.dev/features/interact
// Pattern: scrape first → extract scrapeId → consent gate → interact

## Subcommand: interact URL [--playwright CODE_FILE | --prompt "NATURAL_LANGUAGE"] [--language node|python|bash]

**Step 1: Parse arguments**
SET URL = first argument after "interact"
SET CODE_FILE = path after --playwright (optional)
SET NATURAL_PROMPT = value after --prompt (optional)
SET LANGUAGE = value after --language (default: "node")
IF neither --playwright nor --prompt: Display error and halt (one is required for interact phase)

**Step 2: Credit guard check**
[probeFirecrawl() — same pattern as other subcommands]

**Step 3: Consent gate**
Display:
  Firecrawl Browser Sandbox
  URL: {URL}
  Session TTL: 10 minutes (auto-terminated)
  Idle TTL: 5 minutes (auto-terminated if no activity)
  Credit cost: 2–7 credits/minute (code-only: 2/min; with AI prompt: 7/min)
  Estimated max cost (full 10min session): {10 * rate} credits
  Current balance: {result.credits.remaining} credits

  Proceed? Type "yes" to confirm, anything else to cancel.

IF user response is not "yes": Display "Browser session cancelled." and halt.

**Step 4: Acquire semaphore**
[acquireFirecrawlSemaphore() — same pattern]

**Step 5: Scrape URL to obtain scrapeId**
mcp__firecrawl__firecrawl_scrape({ url: URL, onlyMainContent: false })
// Extract scrapeId from response.metadata.scrapeId
// Track 1 credit for the scrape: incrementFirecrawlUsage(1)

**Step 6: Read code if --playwright flag used**
IF CODE_FILE: Read file content as CODE_STRING
IF --prompt: SET CODE_STRING = null; use NATURAL_PROMPT as prompt parameter

**Step 7: Call mcp__firecrawl__firecrawl_interact**
mcp__firecrawl__firecrawl_interact({
  scrapeId: SCRAPE_ID,
  ...(CODE_STRING && { code: CODE_STRING, language: LANGUAGE }),
  ...(NATURAL_PROMPT && { prompt: NATURAL_PROMPT }),
  timeout: 30
})

**Step 8: Track credits + release semaphore**
// Interact: use 2 credits/min minimum (conservative; actual billed by Firecrawl cloud)
// We track 2 credits as a floor estimate — actual balance reconciliation happens via dashboard
incrementFirecrawlUsage(2)
Release semaphore.

**Step 9: Display result**
Browser session completed
  Session: {scrapeId}
  Extracted content: {result markdown or structured data}
  Note: Session TTL is 10 minutes. Re-run /pde:firecrawl interact {URL} for a new session.

Display result content.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `firecrawl_browser_create` + `firecrawl_browser_execute` + `firecrawl_browser_delete` | `firecrawl_interact` (scrape + interact pattern) | Marked deprecated in mcp-bridge.cjs Phase 198 | Simpler one-call interface; no session lifecycle management |
| Static credit cost per operation | Variable `creditsUsed` from response | Firecrawl v2 agent API | Track after completion, not before |

**Deprecated/outdated:**
- `firecrawl_browser_create` / `firecrawl_browser_execute` / `firecrawl_browser_delete`: Deprecated — use `firecrawl_interact` instead (already noted in TOOL_MAP comments)
- `firecrawl_browser`: Older browser integration — fully replaced by interact pattern

---

## Open Questions

1. **Whether `maxCredits` is a parameter on the `firecrawl_agent` MCP tool (vs. REST API only)**
   - What we know: The REST API `/v2/agent` accepts `maxCredits` with default 2500. The MCP tool README lists `prompt`, `urls`, `schema` — `maxCredits` is not in the MCP tool schema found in `src/index.ts`.
   - What's unclear: Whether the MCP server passes `maxCredits` through to the REST layer when specified in tool call args.
   - Recommendation: The consent gate and display of the cap still have value even if `maxCredits` is not a runtime parameter on the MCP tool. Plan should include: (a) show the cap in consent gate, (b) attempt to pass `maxCredits` in the tool call, (c) note in workflow prose that if the MCP tool does not accept `maxCredits`, the cap is advisory only (the consent gate itself is the safety mechanism). The planner should add a verification task to confirm `maxCredits` behavior on first live call. **Confidence: MEDIUM** — REST API verified, MCP tool parameter not confirmed.

2. **Exact `scrapeId` field path in firecrawl_scrape response**
   - What we know: Interact docs say "scrapeId from prior scrape's `data.metadata.scrapeId`". MCP tool response format may differ from REST API response format.
   - What's unclear: Whether MCP tool returns top-level `scrapeId` or nested under `metadata`.
   - Recommendation: Plan should include a verification step that scrapes a simple URL and logs the full response structure to identify the correct path for `scrapeId`.

3. **Credit billing for interact sessions**
   - What we know: REST API docs state 2 credits/min (code-only) and 7 credits/min (with prompt). These are per-minute rates for the session duration.
   - What's unclear: Whether the MCP tool response includes session duration or `creditsUsed` to enable accurate tracking.
   - Recommendation: Use conservative 2-credit floor for `incrementFirecrawlUsage` calls, noting this is an undercount. Document that users should verify actual usage in the Firecrawl dashboard.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `mcp__firecrawl__firecrawl_agent` | AGT-01 | TOOL_MAP_VERIFY_REQUIRED | unknown | None — no fallback for autonomous research |
| `mcp__firecrawl__firecrawl_agent_status` | AGT-02 | TOOL_MAP_VERIFY_REQUIRED | unknown | None — required for job polling |
| `mcp__firecrawl__firecrawl_interact` | AGT-03, AGT-04 | TOOL_MAP_VERIFY_REQUIRED | unknown | None — no fallback for browser sandbox |
| `FIRECRAWL_API_KEY` env var | All operations | Set (required since Phase 198) | — | probeFirecrawl() returns available:false if missing |
| `bin/lib/mcp-bridge.cjs` | Credit guard + semaphore | Present (Phase 198) | — | — |
| `bin/lib/firecrawl-cache.cjs` | Agent result caching | Present (Phase 199) | — | — |
| `commands/firecrawl.md` | Command routing | Present (Phase 200) | — | — |
| `workflows/firecrawl.md` | Subcommand prose | Present (Phase 200) | — | — |

**Missing dependencies with no fallback:**
- `mcp__firecrawl__firecrawl_agent`, `mcp__firecrawl__firecrawl_agent_status`, `mcp__firecrawl__firecrawl_interact` — all three are `TOOL_MAP_VERIFY_REQUIRED`, meaning they were registered before live verification. The first plan wave should include a TOOL_MAP verification task using a minimal call to confirm tool names are correct.

**Missing dependencies with fallback:**
- None — Firecrawl availability is already checked by `probeFirecrawl()` which returns `available: false` if key is missing or credits exhausted.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — PDE uses workflow integration testing (manual execution of /pde:firecrawl commands) |
| Config file | none |
| Quick run command | `node -e "const m = require('./bin/lib/mcp-bridge.cjs'); console.log(Object.keys(m.TOOL_MAP).filter(k => k.startsWith('firecrawl')))"` |
| Full suite command | Manual: run each subcommand with --dry-run or against real Firecrawl API |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGT-01 | Consent gate blocks agent dispatch without "yes" | integration | Manual: `/pde:firecrawl agent "test"` — verify prompt appears and "N" halts | ❌ Wave 0 |
| AGT-01 | maxCredits cap appears in consent gate display | integration | Manual: verify consent gate shows cap amount | ❌ Wave 0 |
| AGT-02 | agent-status returns job details | integration | Manual: `/pde:firecrawl agent-status <real-job-id>` | ❌ Wave 0 |
| AGT-03 | interact subcommand launches browser with TTL display | integration | Manual: `/pde:firecrawl interact https://example.com --prompt "get title"` | ❌ Wave 0 |
| AGT-04 | Playwright code executes inside session | integration | Manual: `/pde:firecrawl interact URL --playwright test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node -e "const m = require('./bin/lib/mcp-bridge.cjs'); const keys = Object.keys(m.TOOL_MAP).filter(k => k.startsWith('firecrawl')); console.log('TOOL_MAP firecrawl entries:', keys.length, keys.join(', '))"` — verify agent/agent-status/interact entries present
- **Per wave merge:** Manual smoke test of consent gate display
- **Phase gate:** All four success criteria demonstrated before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] TOOL_MAP verification for `firecrawl:agent`, `firecrawl:agent-status`, `firecrawl:interact` — confirm MCP tool names are correct against live server
- [ ] Confirm `scrapeId` field path in `firecrawl_scrape` response (needed before interact subcommand implementation)

*(No new test files required — PDE uses workflow prose integration testing, not unit test files)*

---

## Sources

### Primary (HIGH confidence)
- `commands/firecrawl.md` — existing command file structure and allowed-tools pattern (read directly)
- `workflows/firecrawl.md` — existing workflow structure with 5 subcommands, credit guard pattern, semaphore pattern (read directly)
- `bin/lib/mcp-bridge.cjs` lines 260-274 — confirmed TOOL_MAP entries for firecrawl:agent, firecrawl:agent-status, firecrawl:interact (read directly)
- `bin/lib/firecrawl-cache.cjs` — confirmed writeSource(), writeCrawl(), writeSnapshot() API (read directly)
- [docs.firecrawl.dev/features/agent](https://docs.firecrawl.dev/features/agent) — firecrawl_agent parameters, maxCredits default 2500, creditsUsed in response, 24h retention
- [docs.firecrawl.dev/features/interact](https://docs.firecrawl.dev/features/interact) — firecrawl_interact parameters, scrapeId required, TTL 10min/5min idle, credit costs 2/min and 7/min
- GitHub firecrawl/firecrawl-mcp-server src/index.ts — firecrawl_interact schema: scrapeId, code, prompt, language, timeout

### Secondary (MEDIUM confidence)
- WebSearch: maxCredits parameter for firecrawl_agent — default 2500, used to cap spending; dashboard cap matches this value
- WebSearch: firecrawl_browser_create deprecated in favor of firecrawl_interact — confirmed by mcp-bridge.cjs comments

### Tertiary (LOW confidence)
- MCP tool `maxCredits` as a parameter vs. REST-API-only — not confirmed in MCP tool schema; REST API confirmed only

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — TOOL_MAP entries confirmed in mcp-bridge.cjs; API parameters confirmed via official docs
- Architecture patterns: HIGH — extend pattern is identical to Phase 200 scrape/search/map/extract/crawl; consent gate is new but simple prose pattern
- Pitfalls: HIGH — scrapeId requirement and deprecated browser tools are clearly documented; maxCredits MCP uncertainty is flagged as MEDIUM
- Open questions: Documented with recommendations; do not block planning

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Firecrawl API stable; MCP server tool names stable)
