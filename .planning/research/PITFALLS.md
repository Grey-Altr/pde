# Pitfalls Research: PDE Remote Dashboard

**Domain:** Remote monitoring/control layer for local-first CLI tool
**Researched:** 2026-03-24
**Confidence:** HIGH (architecture-specific pitfalls verified across multiple sources)

## Critical Pitfalls

### Pitfall 1: Approval Gate TOCTOU Race Conditions

**Severity:** CRITICAL -- can cause unintended code execution

**What goes wrong:**
User taps "Approve" on PWA for a specific action, but by the time the approval reaches the local PDE instance, the session has moved on. The approval either: (a) applies to a different pending action, (b) arrives after PDE timed out waiting, or (c) arrives for a session that no longer exists. This is a Time-of-Check-to-Time-of-Use (TOCTOU) vulnerability. Codex CLI 0.98.0 had exactly this bug -- parallel tool calls caused approval "swaps" where the UI asked to approve one command but a different command executed.

**Why it happens:**
The approval request and the approval response travel through an asynchronous, multi-hop path: PDE -> relay -> cloud -> SSE -> PWA -> user tap -> cloud -> relay -> PDE. Any step can introduce latency. Meanwhile, PDE's local state is mutable -- the pending action may timeout, be superseded, or the session may end.

**How to avoid:**
- Every approval request gets a unique, cryptographically random `approval_id` (UUID v4 minimum)
- PDE only accepts approval responses that match the *currently pending* `approval_id`
- Approvals carry a `session_id` + `approval_id` pair; both must match
- PDE has a local approval timeout (e.g., 5 minutes); after timeout, the approval_id is invalidated server-side too
- The cloud relay must reject stale approvals before forwarding (don't rely on PDE alone)
- Display the specific action being approved in the PWA UI with enough context to prevent "blind approve"

**Warning signs:**
- Tests pass approval without checking IDs
- Approval endpoint accepts any session's approval_id
- No TTL on pending approvals in the cloud relay
- PWA shows "Approve" button without showing what action is being approved

**Phase to address:** Phase 1 (Relay Protocol Design) -- the approval wire format must include these fields from day one. Retrofitting approval IDs into an existing protocol is painful.

---

### Pitfall 2: Unbounded /tmp/ Queue Growth During Network Outages

**Severity:** CRITICAL -- can fill disk and crash PDE or other system processes

**What goes wrong:**
PDE writes NDJSON events to /tmp/ session files. The relay module reads these and pushes to cloud. When the user's internet drops (laptop lid close, WiFi switch, VPN reconnect), the relay can't push. If the relay continues reading events and buffering them in memory, OOM. If it stops reading, /tmp/ files grow unbounded. A 10,000-event autonomous run at ~500 bytes/event = ~5MB, manageable. But if the relay retries with exponential backoff and queues 50,000 events across multiple sessions, /tmp/ fills up. On macOS, /tmp/ is on the boot volume.

**Why it happens:**
Developers test on stable connections. The "offline" case is easy to forget. The relay is additive to PDE -- PDE already writes to /tmp/ for the tmux dashboard. Adding a relay reader that can't keep up creates invisible backpressure.

**How to avoid:**
- Implement a hard cap on relay buffer: max 1000 events in memory, max 10MB per session on disk
- When buffer is full, drop oldest non-critical events (keep phase transitions, approvals, errors; drop verbose telemetry)
- The relay module must be a "best effort" push -- PDE must NEVER block or slow down waiting for relay
- Add a circuit breaker: after N consecutive push failures, stop trying for M seconds (not just exponential backoff)
- Monitor /tmp/ usage and log warnings at 80% of cap
- On reconnect, send a "gap" marker event so the dashboard knows events were dropped

**Warning signs:**
- Relay has no max buffer size constant
- No distinction between "must-deliver" events (approvals) and "best-effort" events (telemetry)
- Tests don't simulate network outage scenarios
- No "gap" or "events_dropped" event type in the protocol

**Phase to address:** Phase 1 (Relay Module) -- buffer management must be designed before any HTTP push code. This is the relay's primary responsibility.

---

### Pitfall 3: SSE Timeout on Vercel Serverless (Dashboard Goes Dead)

**Severity:** CRITICAL -- dashboard appears "connected" but receives no updates

**What goes wrong:**
Vercel serverless functions have hard timeout limits: 10 seconds on Hobby, 60 seconds on Pro (up to 300s with Fluid Compute on Pro). SSE connections that exceed these limits are silently terminated by the platform. The dashboard shows a "connected" indicator but receives no new events. Users stare at a frozen dashboard thinking PDE is stuck when it's actually the SSE connection that died.

**Why it happens:**
SSE works perfectly in local dev (no timeout). Developers ship to Vercel and it works for the first 10-60 seconds. The connection drop is silent -- no error event fires on the client EventSource.

**How to avoid:**
- Do NOT use long-lived SSE from Vercel serverless functions
- Use one of these patterns instead:
  - **Polling with SSE fallback:** Client polls every 2-3 seconds, SSE only for sub-second delivery when available
  - **Edge Runtime SSE:** Vercel Edge Runtime supports long-lived connections (no timeout), but has 128MB memory limit and no Node.js APIs
  - **External SSE provider:** Use Upstash Redis pub/sub or Ably/Pusher for the real-time channel, Vercel only serves the API
- Implement client-side reconnection with heartbeat detection: if no event received in 10 seconds, reconnect
- Show "reconnecting..." UI state -- never let the dashboard appear connected when it isn't

**Warning signs:**
- SSE endpoint is a standard Node.js serverless function (not Edge)
- No heartbeat/keepalive events in the SSE stream
- Client EventSource has no `onerror` handler with reconnection logic
- Works in dev, mysteriously stops updating in production

**Phase to address:** Phase 2 (Dashboard MVP) -- the real-time delivery mechanism must be chosen before building any dashboard UI. This is an architectural decision, not a bug to fix later.

---

### Pitfall 4: State Divergence -- Dashboard Shows Stale Reality

**Severity:** HIGH -- erodes user trust, causes incorrect approval decisions

**What goes wrong:**
Dashboard shows phase 3 executing; local PDE has already moved to phase 5. User sees an approval gate for phase 3 that PDE has already auto-timed-out. User approves. Now PDE gets an approval for a completed phase. Alternatively: dashboard shows "idle" but PDE is mid-execution because events haven't propagated yet. User closes laptop thinking PDE is done.

**Why it happens:**
There are three independent clocks: PDE local time, cloud relay time, and the user's browser time. Event delivery has variable latency (batching + HTTP push + cloud processing + SSE/polling delivery). The dashboard's state is always a projection of the past, never the present. The gap between "event happened" and "dashboard shows it" is typically 1-5 seconds but can be 30+ seconds during network hiccups.

**How to avoid:**
- Every event carries a monotonic sequence number AND a wall-clock timestamp
- Dashboard shows "last updated: X seconds ago" prominently -- never hide staleness
- If last update > 10 seconds old, show an amber "possibly stale" indicator
- If last update > 60 seconds old, show a red "connection lost" indicator
- For approval gates specifically: include a "this approval was requested X seconds ago" countdown
- Server-side: maintain a "session heartbeat" that PDE sends every 5 seconds; dashboard knows session is alive vs. dead
- Consider "pull on demand" for approval gates: when user opens an approval, PWA does a fresh HTTP GET to verify it's still pending

**Warning signs:**
- Dashboard has no "last updated" indicator
- No heartbeat mechanism -- dashboard can't distinguish "no events" from "disconnected"
- Approval UI doesn't show when the approval was requested
- No sequence numbers in events -- can't detect gaps

**Phase to address:** Phase 1 (Protocol) for sequence numbers/timestamps; Phase 2 (Dashboard) for staleness UI; Phase 3 (Approval Gates) for fresh-pull verification.

---

### Pitfall 5: Security Surface -- Cloud Endpoint Accepts Events From Anywhere

**Severity:** HIGH -- event injection, session hijacking, data exfiltration

**What goes wrong:**
The cloud relay endpoint is a public HTTPS URL. Anyone who discovers it (or reverse-engineers the PDE plugin) can: (a) inject fake events to pollute a user's dashboard, (b) replay captured events, (c) send fake approval responses, (d) enumerate session IDs to sniff other users' event streams. PDE events may contain file paths, code snippets, error messages with sensitive context.

**Why it happens:**
"It's just a monitoring dashboard" mentality. Security gets deferred to "later." But the approval gate feature makes this a control plane, not just observability. An attacker who can inject approvals can cause PDE to execute arbitrary actions.

**How to avoid:**
- Authentication: each PDE instance gets a short-lived JWT (or similar) on registration. Token includes `user_id` and `session_id` claims
- Token rotation: tokens expire every 1 hour, PDE refreshes silently
- Event signing: each event batch includes an HMAC signature using a shared secret established at session registration
- Rate limiting: max 100 events/second per session, max 10 sessions per user
- The dashboard SSE/polling endpoint requires its own authentication (user's Vercel/OAuth session)
- Approval responses require the dashboard's auth token AND match the session's approval_id -- two independent auth checks
- Never include raw file contents in events -- only paths, diff summaries, metadata
- Scrub sensitive environment variable names from events before push

**Warning signs:**
- Relay endpoint has no authentication middleware
- Events include `process.env` values or full file contents
- No rate limiting on event ingestion
- Session IDs are predictable (sequential integers, timestamps)
- Same auth token used for both event push and dashboard viewing

**Phase to address:** Phase 1 (Auth + Relay Protocol). Security cannot be retrofitted. The auth flow must be designed before the first event is pushed.

---

### Pitfall 6: iOS PWA Push Notifications Are Unreliable (Especially in EU)

**Severity:** HIGH -- core feature doesn't work for significant user segment

**What goes wrong:**
Web Push on iOS has a ~70-85% delivery rate (vs ~95% on Android). In the EU, PWA push notifications do not work at all -- Apple removed standalone PWA support under the Digital Markets Act in iOS 17.4 (2024). PWAs in EU open in Safari tabs without push capability. This was NOT reversed for push notifications despite Apple reinstating basic PWA support. Additionally, iOS requires the PWA to be installed to the Home Screen before push works, and Safari can clear the Service Worker state if the PWA hasn't been opened recently, silently breaking the push subscription.

**Why it happens:**
Developers test on Android or desktop Chrome where Web Push is reliable. iOS restrictions aren't encountered until real users report "I never got the notification." EU users may not report anything because they never got push working in the first place.

**How to avoid:**
- Do NOT make push notifications the primary notification channel
- Implement a tiered notification strategy:
  1. **Primary:** In-app polling (dashboard auto-refreshes, shows approval banners)
  2. **Secondary:** Email notifications for approval gates (reliable, works everywhere)
  3. **Tertiary:** Web Push for users who opt in and meet platform requirements
- Show clear status: "Push notifications: active / not available on your device / not supported in your region"
- For approval gates specifically: implement a "check for pending approvals" button that works regardless of push
- Consider SMS as a future channel for critical approvals (high delivery rate, works everywhere)

**Warning signs:**
- Push notifications are the only notification mechanism
- No fallback for when push subscription silently breaks
- No analytics on push delivery rate per platform
- EU users are not tested
- No "check for approvals" manual refresh option

**Phase to address:** Phase 2 (Dashboard MVP) should use polling as primary. Phase 3 (Notifications) adds push as enhancement, never as sole mechanism.

---

### Pitfall 7: Zero-NPM-Dep Constraint Makes Relay Fragile

**Severity:** HIGH -- no retry, no circuit breaker, no connection pooling out of the box

**What goes wrong:**
PDE's hard constraint is zero npm dependencies at the plugin root. The relay module must use Node.js built-in `fetch()` (or `node:https`). Built-in fetch has: no automatic retry, no timeout by default (must use AbortController), no built-in circuit breaker, and each request pays full TLS handshake cost without explicit connection reuse configuration. A naive `fetch()` call that fails silently on network error, with no retry, means events are permanently lost.

**Why it happens:**
`fetch()` looks simple. `await fetch(url, { method: 'POST', body: batch })` -- done, right? But production HTTP is hard. Libraries like `got`, `ky`, `undici` exist because raw fetch is insufficient for production use. The zero-dep constraint means reimplementing retry, timeout, circuit breaker, and keepalive logic by hand.

**How to avoid:**
- Build a small (~100 LOC) `resilientFetch` wrapper that includes:
  - `AbortController` with configurable timeout (default 10s)
  - Exponential backoff retry (3 attempts, 1s/2s/4s delays)
  - Circuit breaker (open after 5 consecutive failures, half-open after 30s)
  - HTTP keepalive via `{ keepalive: true }` option (supported in Node 18+)
- Undici IS built into Node.js (it powers the global `fetch()`). Connection pooling happens automatically for the same origin when using `keepalive: true`
- Batch events (send 10-50 at once, not individually) to amortize TLS overhead
- All relay failures must be logged but must NEVER propagate to PDE's main execution flow

**Warning signs:**
- Raw `fetch()` calls without AbortController
- No retry logic in the relay module
- Individual event push (one HTTP request per event)
- Relay errors cause unhandled promise rejections
- No connection reuse between requests

**Phase to address:** Phase 1 (Relay Module). The `resilientFetch` wrapper should be the first code written. Everything else depends on it.

---

## Moderate Pitfalls

### Pitfall 8: Cost Surprise From Autonomous Runs

**Severity:** MODERATE -- unexpectedly high bills, not a technical failure

**What goes wrong:**
Normal usage (10 sessions/day, 1000 events/session) costs almost nothing. But autonomous runs can generate 10,000-50,000 events per session. Cost math:

**Upstash Redis:** $0.20 per 100K commands. 10 sessions x 1000 events = 10K commands = free tier (500K commands/month free). But 5 autonomous runs x 50K events = 250K commands + reads for dashboard polling = ~500K commands = at the edge of free tier. Heavy month with multiple autonomous sessions: $1-5.

**Vercel Functions:** $0.60 per 1M invocations. If each event batch triggers an API route + dashboard polls every 2 seconds across 8 hours of active use = 14,400 poll requests/day + event pushes. 1M invocations/month included on Hobby. Comfortable margin.

**Bandwidth:** NDJSON events are small (~500 bytes). 500K events/month = ~250MB. Well within Upstash's 200GB free bandwidth and Vercel's included transfer.

**The real surprise:** It's not the per-unit cost. It's that autonomous mode can 10-50x your event volume overnight, and if you're on Upstash pay-as-you-go with no budget cap, you won't know until the bill. Also, multi-dimensional Vercel billing (CPU time + memory + invocations) means costs compound in ways not obvious from invocation count alone.

**How to avoid:**
- Set a hard event rate limit: max 10 events/second pushed to cloud (buffer/drop the rest locally)
- Implement event downsampling for autonomous mode: only push phase transitions, errors, and approval gates; skip verbose telemetry
- Set Upstash spend cap (available in dashboard)
- Log estimated monthly cost in PDE's tmux dashboard as a running counter
- Alert user when event volume exceeds 10x normal threshold

**Warning signs:**
- No event rate limiting in relay
- All event types pushed equally regardless of mode (interactive vs autonomous)
- No cost monitoring or estimation
- No Upstash spend cap configured

**Phase to address:** Phase 1 (Relay) for rate limiting and downsampling. Phase 4 (Production Hardening) for cost monitoring.

---

### Pitfall 9: Session Identity Collisions and Cleanup

**Severity:** MODERATE -- wrong data on dashboard, leaked sessions

**What goes wrong:**
PDE sessions need unique IDs that link local execution to cloud dashboard. If session IDs collide (two machines, same user, both generate the same ID), events interleave on the dashboard. If sessions aren't cleaned up, the cloud accumulates zombie sessions that consume storage and confuse the UI. Multi-machine users (desktop + laptop) need their sessions properly namespaced.

**Why it happens:**
Session ID generation seems trivial. `Date.now()` or `randomUUID()` alone might seem sufficient. But: (a) `Date.now()` has millisecond resolution -- two rapid session starts collide, (b) sessions need to survive PDE restarts gracefully (is it a new session or continuation?), (c) cloud has no way to know when a session ended if PDE crashes.

**How to avoid:**
- Session ID = `${machineId}-${crypto.randomUUID()}` where machineId is derived from hostname + username hash
- Store session ID in the /tmp/ session file so it persists across PDE restarts within the same logical session
- Cloud-side: sessions auto-expire after 24 hours of no events (configurable)
- PDE sends explicit "session_end" event on clean shutdown
- Dashboard UI groups sessions by machine and shows active vs. expired
- Cloud-side garbage collection: delete session data after 7 days

**Warning signs:**
- Session IDs are just timestamps or sequential numbers
- No session expiry mechanism on the cloud side
- No "session_end" event in the protocol
- Dashboard shows sessions from weeks ago with no way to clean up
- Multi-machine user sees interleaved events

**Phase to address:** Phase 1 (Protocol) for session ID format. Phase 2 (Dashboard) for session list UI. Phase 4 (Production) for cleanup/GC.

---

### Pitfall 10: Backward Compatibility -- Opt-in Goes Wrong

**Severity:** MODERATE -- breaks existing users who don't want remote features

**What goes wrong:**
The relay module is loaded at PDE startup. If it throws (misconfigured, missing config, network code has a bug), it takes down PDE's entire hook chain. Or: the relay adds perceptible latency to PDE's event loop, making the local tmux dashboard feel sluggish. Or: users who never configured remote monitoring see error messages about failed cloud connections in their terminal.

**Why it happens:**
Additive features are supposed to be safe. But the relay module hooks into PDE's event pipeline. If the hook is synchronous, or if it awaits network calls in the hot path, it blocks PDE. If it throws an unhandled error, the hook system may abort.

**How to avoid:**
- Relay module is gated behind explicit opt-in: `PDE_REMOTE=true` environment variable or `.pde-remote.json` config file
- If not opted in, the relay module code is never loaded (not loaded-but-disabled)
- Relay hook is strictly async and fire-and-forget -- PDE event emission never awaits relay
- Wrap the entire relay in a top-level try/catch that logs to a separate relay.log but NEVER throws into PDE's stack
- Integration test: run full PDE session with relay module present but misconfigured -- verify PDE works perfectly

**Warning signs:**
- Relay code is imported unconditionally at PDE startup
- Relay hook uses `await` in the event emission path
- No try/catch around relay initialization
- No test that verifies PDE works when relay is broken/misconfigured
- Error messages about cloud connection appear when user hasn't opted in

**Phase to address:** Phase 1 (Relay Module) -- the isolation boundary must be established first. Test it by deliberately breaking the relay and verifying PDE still works.

---

## Minor Pitfalls

### Pitfall 11: Latency Perception -- "Real-Time" Expectations

**What goes wrong:**
Users expect the PWA dashboard to update within 100ms of local PDE actions (like their tmux dashboard does). Actual end-to-end latency: PDE event write (~1ms) + relay batch window (~500ms) + HTTP push (~100-500ms) + cloud processing (~50ms) + SSE/poll delivery (~0-3000ms) = 650ms-4s typical. During network congestion: 5-15 seconds. Users perceive > 2 seconds as "broken."

**Prevention:**
- Set expectations in UI: "Updates every 1-3 seconds" label
- Use optimistic updates where possible: show "sending approval..." immediately on tap, confirm when acknowledged
- Prioritize approval gate events for immediate push (don't batch them)
- Show a "latency indicator" (like video call quality bars) so users understand the delay is network, not a bug

**Phase to address:** Phase 2 (Dashboard UX).

---

### Pitfall 12: Service Worker Lifecycle Gotchas

**What goes wrong:**
PWA Service Worker is updated by the browser on its own schedule. A stale Service Worker can serve cached API responses, breaking real-time functionality. Or: the Service Worker's push subscription gets cleared by iOS after inactivity (confirmed behavior), silently breaking notifications.

**Prevention:**
- Implement `skipWaiting()` + `clients.claim()` for immediate SW activation
- Version the SW file and check on each dashboard load
- Store push subscription server-side and re-register on each PWA open
- API routes should have `Cache-Control: no-store` headers

**Phase to address:** Phase 2 (PWA Setup).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip event batching, push individually | Simpler relay code | 10-50x HTTP overhead, TLS per event | Never -- batching is trivial and essential |
| Use polling instead of SSE entirely | Avoids Vercel SSE timeout complexity | Higher latency (2-3s floor), more function invocations | Acceptable for MVP, replace with Edge SSE or external provider later |
| Store events in Vercel KV instead of Upstash Redis | One fewer external service | Vercel KV has lower throughput limits, 1MB value size limit | Acceptable if event volume stays low (< 1000/day) |
| Skip auth on relay endpoint initially | Faster development | Any authenticated PDE user can inject events into any session | Never -- auth must be day one. Even a simple shared secret is better than nothing |
| Hardcode session timeout to 1 hour | No cleanup logic needed | Long autonomous runs get disconnected; zombie sessions if too long | Only in MVP, replace with heartbeat-based timeout |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Upstash Redis | Using `GET`/`SET` for event storage (wrong data structure) | Use Redis Streams (`XADD`/`XREAD`) -- purpose-built for ordered event ingestion with consumer groups |
| Vercel Edge Runtime | Assuming Node.js APIs are available | Edge Runtime has no `fs`, no `node:` imports, limited to Web APIs. Use Node.js runtime for API routes that need full Node |
| Web Push API | Requesting notification permission on first visit | Only request after user explicitly opts in (e.g., clicks "Enable notifications"). Safari blocks repeated permission requests |
| EventSource (SSE client) | No reconnection logic, trusting browser auto-reconnect | Browser reconnects but may lose events during gap. Implement manual reconnect with `Last-Event-ID` header to resume from last received event |
| AbortController (fetch timeout) | Creating one AbortController per request without cleanup | Always call `controller.abort()` in error paths to prevent memory leaks. Don't share controllers across requests -- aborting one would abort all |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Pushing every NDJSON line individually | High latency, excessive function invocations | Batch 10-50 events per push, flush on timer (500ms) or batch full | Immediately in production -- even 10 events/second = 10 TLS handshakes/second |
| Dashboard polling every 500ms | Smooth updates but high invocation cost | Poll every 2-3 seconds, use SSE/Edge for sub-second when needed | At 10+ concurrent dashboard viewers = 20+ req/sec constant load |
| Storing full event history in Redis | Works initially | Use TTL (24h) on event streams, archive to cheaper storage | When Redis memory exceeds 256MB free tier (~500K events) |
| JSON.parse on every poll response | Invisible on small payloads | Use NDJSON streaming response, parse incrementally | When response exceeds 100KB (~200 events) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Session tokens in URL query params | Tokens logged in server access logs, browser history, referer headers | Use `Authorization: Bearer` header for API calls, httpOnly cookies for dashboard |
| No CORS restrictions on relay endpoint | Any website can push events to your relay | Strict CORS: only allow requests from PDE (no Origin header = server-to-server) and your dashboard domain |
| Approval gate without re-authentication | Stolen dashboard session = ability to approve actions on user's machine | Require re-authentication (or at minimum, session freshness check) for approval actions |
| Event payloads include secrets | `.env` values, API keys, passwords visible in dashboard | Scrub events at the relay layer BEFORE push. Regex filter for common secret patterns. Never include `process.env` in events |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Dashboard shows raw NDJSON events | Overwhelming, unreadable, feels like a log viewer not a dashboard | Aggregate events into meaningful states: "Phase 3 executing, 47% complete, 12 files changed" |
| No indication of connection status | User doesn't know if dashboard is live or stale | Always-visible connection indicator: green (live), amber (delayed), red (disconnected) |
| Approval gate shows technical details only | User can't make informed approve/deny decision | Show: what action, what files affected, risk level, and allow viewing diff before approving |
| Multiple sessions shown equally | Confusing when user has 3 old sessions and 1 active | Auto-focus active session, collapse/archive completed sessions, clear visual hierarchy |

## "Looks Done But Isn't" Checklist

- [ ] **Relay push:** Works on stable WiFi but -- test on 3G throttle, test with WiFi off mid-push, test VPN reconnect
- [ ] **SSE connection:** Works in dev -- test on Vercel production with actual serverless timeouts
- [ ] **Push notifications:** Works on Android Chrome -- test on iOS Safari (must be home-screen installed), test after 48 hours of inactivity
- [ ] **Approval gate:** Works when clicked within 5 seconds -- test approval after 5 minutes, test approval after session ended, test double-tap
- [ ] **Multi-session:** Works with one session -- test with 3 concurrent sessions on 2 machines
- [ ] **Backward compatibility:** Works with relay configured -- test with relay not configured, test with relay misconfigured, test with relay endpoint down
- [ ] **EU users:** Push works in US -- test with EU-based iOS device (push will not work, verify graceful degradation)
- [ ] **Cost:** Works on free tier with test load -- estimate cost for heaviest real-world month (autonomous runs)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Approval TOCTOU race | LOW | Add approval_id validation server-side; existing approvals without IDs are rejected. No data migration needed |
| /tmp/ overflow | MEDIUM | Add buffer cap + event priority. Requires relay module changes. Lost events during outage are unrecoverable (acceptable -- dashboard is best-effort) |
| SSE timeout in production | HIGH | Architecture change: move from serverless SSE to Edge Runtime or external provider. May require rewriting real-time delivery layer |
| State divergence | LOW | Add sequence numbers to events, staleness indicators to UI. Incremental improvement, no breaking changes |
| Security breach via unauthenticated endpoint | HIGH | Must add auth retroactively. Existing sessions need re-registration. Potential data exposure of all events pushed before auth was added |
| iOS push failure | LOW | Add email/polling fallback. Push was never the sole mechanism if designed correctly |
| Cost overrun | LOW | Add rate limiting and downsampling. Immediate effect. Set Upstash spend cap |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Approval TOCTOU | Phase 1: Protocol Design | Unit test: send approval with wrong/expired ID, verify rejection |
| /tmp/ overflow | Phase 1: Relay Module | Integration test: simulate 60s network outage during 10K event burst, verify /tmp/ stays under cap |
| SSE timeout | Phase 2: Dashboard MVP | E2E test: deploy to Vercel, verify events received after 120s of connection |
| State divergence | Phase 2: Dashboard UI | Manual test: induce 30s network delay, verify staleness indicator appears |
| Security surface | Phase 1: Auth + Protocol | Penetration test: attempt event injection without valid token, attempt cross-session approval |
| iOS push unreliability | Phase 3: Notifications | Real-device test: iOS in US and EU, verify graceful degradation |
| Zero-dep relay fragility | Phase 1: Relay Module | Unit test: verify resilientFetch retries, circuit breaks, and times out correctly |
| Cost surprise | Phase 4: Production Hardening | Load test: simulate 50K events/session, calculate projected monthly cost |
| Session identity | Phase 1: Protocol | Test: launch 2 sessions simultaneously on same machine, verify distinct IDs and correct routing |
| Backward compatibility | Phase 1: Relay Module | Integration test: full PDE session with `PDE_REMOTE` unset, verify zero relay code loaded |
| Latency perception | Phase 2: Dashboard UX | Measure: end-to-end latency from PDE event to dashboard render, set p95 target |
| Service Worker lifecycle | Phase 2: PWA Setup | Test: deploy SW update, verify new version activates within 1 page reload |

## Sources

- [Codex CLI 0.98.0 Approval Swap TOCTOU Bug](https://codefix.dev/2026/02/09/codex-cli-0-98-0-approval-swap-parallel-tool-calls-toctou/) - MEDIUM confidence (community analysis of real vulnerability)
- [Gemini CLI TOCTOU Race Condition](https://github.com/google-gemini/gemini-cli/issues/20746) - HIGH confidence (official GitHub issue)
- [PWA iOS Limitations and Safari Support 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) - HIGH confidence (comprehensive, current guide)
- [PWA Push Notifications on iOS in 2026](https://webscraft.org/blog/pwa-pushspovischennya-na-ios-u-2026-scho-realno-pratsyuye?lang=en) - MEDIUM confidence (corroborated by MagicBell guide)
- [Reliable Push Notifications on PWAs for iOS and Android](https://edana.ch/en/2026/03/19/push-notifications-on-web-applications-pwa-is-it-really-reliable-on-ios-and-android/) - MEDIUM confidence (70-85% iOS delivery rate figure)
- [Vercel SSE Time Limits](https://community.vercel.com/t/sse-time-limits/5954) - HIGH confidence (official Vercel community)
- [Fixing Slow SSE in Next.js and Vercel](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996) - MEDIUM confidence (practitioner experience)
- [Vercel Function Pricing](https://vercel.com/docs/functions/usage-and-pricing) - HIGH confidence (official docs)
- [Upstash Redis Pricing](https://upstash.com/docs/redis/overall/pricing) - HIGH confidence (official docs)
- [Node.js Fetch Timeout and Retry Guide](https://tasukehub.com/articles/nodejs-fetch-timeout-retry-guide?lang=en) - MEDIUM confidence (verified against Node.js docs)
- [Node.js Backpressuring in Streams](https://nodejs.org/en/learn/modules/backpressuring-in-streams) - HIGH confidence (official Node.js docs)
- [Apple DMA and Apps in the EU](https://developer.apple.com/support/dma-and-apps-in-the-eu/) - HIGH confidence (official Apple developer docs)

---
*Pitfalls research for: PDE Remote Dashboard -- adding remote monitoring/control to local-first CLI tool*
*Researched: 2026-03-24*
