# Research Summary: PDE Remote Dashboard Event Transport

**Domain:** Real-time event transport from local CLI plugin to cloud-hosted PWA
**Researched:** 2026-03-24
**Overall confidence:** HIGH

## Executive Summary

The core question was: how should NDJSON events get from PDE (a Claude Code plugin on the user's local machine) to a cloud-hosted Next.js PWA? Seven transport options were evaluated against six criteria, with the decisive constraint being PDE's zero npm dependencies requirement.

**Upstash Redis via its REST API is the clear winner.** It is the only option that satisfies all constraints: zero npm deps (pure HTTP POST to REST endpoint), durable storage (Redis LIST for history replay), real-time notification (Redis PUBLISH for push), free at hobby scale (500K commands/month), and ecosystem-aligned (Upstash powers Vercel KV). The transport module is approximately 60 lines of CJS code using `node:https`.

The architecture is push-based: PDE fires HTTP POST requests to Upstash's `/pipeline` endpoint (combining LPUSH + PUBLISH in one call), and the PWA reads via a Next.js Route Handler that serves SSE to the browser. Local NDJSON files remain as the ground truth -- if the network is down or Upstash is unreachable, events are never lost locally. The remote push is purely fire-and-forget.

Node.js HTTP capability was confirmed: `node:https` is stable on Node 20.20.0 (PDE's current runtime), and `fetch()` is available but experimental. The recommendation is `node:https` for PDE transport and `fetch()` for the PWA where Vercel controls the runtime.

## Key Findings

**Stack:** Upstash Redis REST API via `node:https` (PDE side, zero deps) + `@upstash/redis` (PWA side) + Next.js Route Handler SSE
**Architecture:** Push-based, fire-and-forget. PDE -> Upstash -> PWA. No inbound connections to local machine.
**Critical pitfall:** Blocking hook execution with synchronous HTTP -- must be fire-and-forget or PDE breaks Claude Code

## Implications for Roadmap

Based on research, suggested phase structure for the transport portion of the Remote Dashboard milestone:

1. **Transport Module** - Build `lib/transport.cjs` with Upstash REST client
   - Addresses: fire-and-forget push, batching, zero-dep constraint
   - Avoids: blocking hook execution (Pitfall #1), fetch() instability (Pitfall #7)

2. **Event Bus Integration** - Wire transport into `event-bus.cjs` dispatch()
   - Addresses: seamless integration with existing event infrastructure
   - Avoids: breaking existing local NDJSON pipeline

3. **PWA Event Ingestion** - Build SSE Route Handler + EventSource client
   - Addresses: history replay, near-real-time delivery
   - Avoids: SSE timeout issues (Pitfall #4) via EventSource auto-reconnect

4. **Session & Auth** - Connection string generation, Upstash token management
   - Addresses: session isolation, security
   - Avoids: token leakage (Pitfall #6)

5. **Data Lifecycle** - TTL, LTRIM, session cleanup
   - Addresses: unbounded LIST growth (Pitfall #3), free tier conservation (Pitfall #2)
   - Avoids: storage exhaustion, silent 429 errors

**Phase ordering rationale:**
- Transport module first because it can be tested independently (push events, verify in Upstash console)
- Event bus integration second because it connects transport to existing infrastructure
- PWA ingestion third because it needs transport working to have events to consume
- Auth/lifecycle last because they're polish -- the system works without them in dev

**Research flags for phases:**
- Phase 3 (PWA SSE): Likely needs deeper research on Vercel serverless timeout behavior and Edge Runtime SSE capabilities
- Phase 1-2 (Transport): Standard patterns, unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Upstash REST API verified via official docs. node:https confirmed on Node 20. |
| Features | HIGH | Based on direct code review of event-bus.cjs and emit-event.cjs |
| Architecture | HIGH | Push-based pattern is standard. Upstash pipeline API verified. |
| Pitfalls | HIGH | Hook timeout constraint verified in code (5000ms). Free tier limits from official pricing. |
| Cost estimates | MEDIUM | Based on projected usage. Actual usage may vary. |
| SSE on Vercel | MEDIUM | Serverless timeout limits documented but SSE-specific behavior needs phase-level testing |

## Gaps to Address

- **Vercel serverless SSE duration:** Exact behavior of streaming responses on Hobby plan needs testing. Documentation says 10s function timeout but streaming may behave differently.
- **Edge Runtime for SSE:** Could extend SSE connection duration. Needs phase-specific research on what Node.js APIs are available in Edge Runtime (specifically @upstash/redis compatibility).
- **Push notification integration:** web-push for approval gates is a separate concern from event transport. Needs its own research when that feature is scoped.
- **Upstash SUBSCRIBE over SSE:** Upstash has a built-in SSE subscribe endpoint. Could the PWA use this directly instead of a Route Handler proxy? Needs testing for CORS and auth implications.
- **PDE process model nuance:** The current hook-based model (`spawnSync` per hook) means each event push is from a fresh Node process. If PDE moves to a long-running model (v1 standalone CLI), batching and persistent connections become viable. Transport design should be ready for this evolution.
