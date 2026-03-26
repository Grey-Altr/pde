---
phase: 139-production-hardening
verified: 2026-03-25T18:32:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 139: Production Hardening Verification Report

**Phase Goal:** The system handles real-world usage patterns without cost surprises, resource exhaustion, or data accumulation
**Verified:** 2026-03-25T18:32:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Redis per-session keys receive 7-day TTL on every ingest batch | VERIFIED | p.expire on events key + session metadata key (604800s) at lines 96-97 of ingest route; global sessions registry is never expired; Tests H-02, H-03, H-04 pass |
| 2  | Excessive ingest requests are rejected with 429 and Retry-After header | VERIFIED | ratelimit.limit('ingest') at line 16 of ingest route; returns 429 + Retry-After integer + X-RateLimit-Remaining:0; Test H-01 passes |
| 3  | A daily cron endpoint deletes sessions idle 7+ days from Redis | VERIFIED | gc/route.ts: CRON_SECRET auth, zrange byScore stale detection, pipeline del+zrem; vercel.json crons at 0 3 * * *; Tests H-05 through H-10 all pass |
| 4  | High-frequency tool events are downsampled at 1-in-N in the relay before transmission | VERIFIED | DOWNSAMPLE_TYPES Set + DOWNSAMPLE_RATE + counter-mod check in relay.cjs onLine callback; 4/4 tests pass |
| 5  | Relay buffer cap at 1000 events is enforced with drop-oldest semantics | VERIFIED | BatchQueue.push() checks maxBufferSize=1000 and calls queue.shift(); Test 14 passes |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| dashboard/lib/ratelimit.ts | Singleton Ratelimit with slidingWindow | VERIFIED | Exists, exports ratelimit, slidingWindow(120, '1 m'), prefix pde:ratelimit, analytics false |
| dashboard/app/api/ingest/route.ts | Rate limit check + TTL expire calls | VERIFIED | imports ratelimit, calls ratelimit.limit('ingest'), returns 429 + headers, sets TTL_7_DAYS = 604800, two p.expire calls (per-session only) |
| dashboard/app/api/cron/gc/route.ts | Daily GC cron endpoint | VERIFIED | exports GET + dynamic, CRON_SECRET auth, zrange byScore, pipeline del + zrem |
| dashboard/vercel.json | Cron schedule for /api/cron/gc | VERIFIED | crons array with path /api/cron/gc, schedule 0 3 * * * |
| dashboard/__tests__/hardening.test.ts | Unit tests for TTL, rate limit, and GC | VERIFIED | 10 tests across 2 describe blocks; all 10 pass |
| bin/lib/relay.cjs | Downsample filter in TailCursor onLine callback | VERIFIED | DOWNSAMPLE_TYPES, DOWNSAMPLE_RATE, typeCounters, counter-mod check before batchQueue.push |
| tests/relay-downsample.test.cjs | Unit tests for downsampling logic | VERIFIED | 4 tests; all pass; no require('vitest') |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| dashboard/app/api/ingest/route.ts | dashboard/lib/ratelimit.ts | import { ratelimit } | WIRED | Import at line 8; ratelimit.limit('ingest') at line 16 |
| dashboard/app/api/ingest/route.ts | Upstash Redis pipeline | p.expire calls | WIRED | p.expire for events and session keys at lines 96-97; inside await p.exec() |
| dashboard/vercel.json | dashboard/app/api/cron/gc/route.ts | crons path config | WIRED | "/api/cron/gc" in vercel.json matches route file path |
| bin/lib/relay.cjs | TailCursor onLine callback | counter-mod filter before batchQueue.push | WIRED | DOWNSAMPLE_TYPES.has at line 475, runs before batchQueue.push at line 484 |
| bin/lib/relay.cjs | PDE_DOWNSAMPLE_RATE env var | process.env.PDE_DOWNSAMPLE_RATE | WIRED | Number(process.env.PDE_DOWNSAMPLE_RATE ?? '5') at line 455 |

---

### Data-Flow Trace (Level 4)

Not applicable. All artifacts are infrastructure (API routes, relay daemon filter) not UI components rendering dynamic data from a store.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Hardening tests (TTL, rate limit, GC) | vitest run __tests__/hardening.test.ts | 10/10 PASS | PASS |
| Relay downsample tests | vitest run tests/relay-downsample.test.cjs | 4/4 PASS | PASS |
| Buffer cap test (HRD-03 traceability) | vitest run tests/phase-134/test-relay-batch.cjs | 4/4 PASS incl. Test 14 | PASS |
| Global sessions key never expired | grep for p.expire global key in ingest route | No matches | PASS |
| Downsampled event types are actual PDE types | Verified against hooks/emit-event.cjs | bash_called/file_changed/tool_called confirmed | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HRD-01 | 139-01 | Redis sorted sets have 7-day TTL | SATISFIED | p.expire with 604800s in ingest route; refreshed per batch; Tests H-02 and H-03 pass |
| HRD-02 | 139-01 | Rate limiting via @upstash/ratelimit | SATISFIED | ratelimit.limit('ingest') before auth; 429 + Retry-After + X-RateLimit-Remaining:0; Test H-01 passes |
| HRD-03 | 139-02 | Relay buffer cap at 1000 events | SATISFIED | BatchQueue maxBufferSize=1000 with drop-oldest; Test 14 passes |
| HRD-04 | 139-02 | Event downsampling during autonomous mode | SATISFIED | Counter-mod filter in relay.cjs for actual PDE types (bash_called, file_changed, tool_called) at default rate=5; PDE_DOWNSAMPLE_RATE configurable; 4/4 tests pass. The REQUIREMENTS.md and ROADMAP reference tool_start/tool_complete which do not exist in PDE -- Plan 02 corrects this with a documented decision; hooks/emit-event.cjs confirms the actual event types |
| HRD-05 | 139-01 | Vercel cron job for daily GC | SATISFIED | gc/route.ts with CRON_SECRET auth; vercel.json at 0 3 * * *; Tests H-05 through H-10 pass |

**Orphaned requirements:** None. All 5 HRD requirements are claimed by plans and verified.

**Traceability table note:** The traceability table in REQUIREMENTS.md shows dash-dash for Plan and Verified columns on HRD-01 through HRD-05. This is a documentation-only gap; the implementations and tests are fully verified.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| .planning/ROADMAP.md | 24, 182-183 | Phase 139 plan checkboxes still unchecked [ ] | Info | Documentation only; code fully implemented |
| .planning/REQUIREMENTS.md | 48 | HRD-04 text references tool_start/tool_complete which do not exist in PDE | Info | Stale requirement text; Plan 02 explicitly corrects to actual PDE event types; no functional impact |
| .planning/REQUIREMENTS.md | 100-104 | Traceability rows for HRD-01 to HRD-05 show dash-dash for Plan and Verified | Info | Documentation gap only |

No blocker or warning anti-patterns in implementation files.

---

### Human Verification Required

#### 1. Live Redis TTL Confirmation

**Test:** After deploying, use Upstash console or redis-cli to inspect TTL on a session key after an ingest POST. Check pde:default:events:{id}, pde:default:session:{id}, and pde:default:sessions.
**Expected:** Per-session keys show TTL close to 604800 seconds; global sessions key shows -1 (no expiry).
**Why human:** TTL behavior requires live Upstash Redis; unit tests use mocks.

#### 2. Vercel Cron Execution

**Test:** Deploy to Vercel with CRON_SECRET env var set. Check Vercel dashboard cron logs at or after 3 AM UTC.
**Expected:** Cron job shows successful execution returning JSON with ok:true and appropriate deleted.count.
**Why human:** Vercel cron scheduling requires a deployed environment.

#### 3. Live Rate Limiting

**Test:** Send 121+ POST requests to /api/ingest within one minute using a valid relay token.
**Expected:** Requests 1-120 return 200; request 121+ returns 429 with Retry-After header set to a positive integer.
**Why human:** Upstash sliding window state requires live Redis; unit tests control the mock directly.

---

### Gaps Summary

No gaps. All 5 observable truths are verified, all artifacts are substantive and wired, and all 18 tests across 3 test files pass. The only open items are live-environment validations that require deployment.

The HRD-04 requirement text mismatch (tool_start/tool_complete vs actual bash_called/file_changed/tool_called) is a stale documentation artifact. Plan 02 explicitly corrects this with a documented decision, the implementation uses the verified-correct PDE event types, and the tests confirm the behavior. This does not affect goal achievement.

---

_Verified: 2026-03-25T18:32:00Z_
_Verifier: Claude (gsd-verifier)_
