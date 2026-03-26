---
phase: 139-production-hardening
plan: 02
subsystem: relay
tags: [downsampling, relay, observability, hrd-03, hrd-04]
requirements-completed: [HRD-03, HRD-04]

dependency-graph:
  requires:
    - bin/lib/relay.cjs (TailCursor/BatchQueue from Phase 134)
  provides:
    - Counter-mod downsampling filter in relay onLine callback
    - Unit tests for downsampling logic
  affects:
    - Relay event volume (reduces high-frequency tool events by ~80% at default rate)

tech-stack:
  added: []
  patterns:
    - Counter-mod pattern for per-type event downsampling (typeCounters Map)
    - DOWNSAMPLE_RATE > 1 guard to allow full pass-through at rate=1

key-files:
  created:
    - tests/relay-downsample.test.cjs
  modified:
    - bin/lib/relay.cjs

decisions:
  - "[Phase 139-02]: DOWNSAMPLE_TYPES uses actual PDE event types (bash_called, file_changed, tool_called) — not tool_start/tool_complete which do not exist in PDE"
  - "[Phase 139-02]: DOWNSAMPLE_RATE > 1 guard ensures rate=1 fully disables downsampling without special-casing the counter logic"
  - "[Phase 139-02]: typeCounters placed inside startRelay() scope — reset per relay session, not shared across relay instances"

metrics:
  duration: 81s
  completed: "2026-03-26T01:25:10Z"
  tasks-completed: 2
  files-modified: 2
---

# Phase 139 Plan 02: Relay Downsampling and Buffer Cap Traceability Summary

Counter-mod downsampling filter in relay.cjs reduces bash_called/file_changed/tool_called event volume by keeping every Nth event (default N=5), while all lifecycle/error/approval events always pass through; HRD-03 buffer cap verified via existing Test 14.

## Tasks Completed

### Task 1: Add counter-mod downsampling to relay.cjs onLine callback

Added three constants in `startRelay()` before the TailCursor construction:
- `DOWNSAMPLE_TYPES` set with the three high-frequency PDE event types
- `DOWNSAMPLE_RATE` from `process.env.PDE_DOWNSAMPLE_RATE` (default `'5'`)
- `typeCounters` Map for independent per-type counter tracking

Inserted downsample check in the TailCursor onLine callback after WireEnvelopeSchema validation succeeds, before `batchQueue.push()`. The check uses `count % DOWNSAMPLE_RATE !== 0` to drop non-kept events, with a `DOWNSAMPLE_RATE > 1` guard so rate=1 passes all events through.

Created `tests/relay-downsample.test.cjs` with 4 unit tests covering: counter-mod keep-every-Nth, non-downsampled types never in DOWNSAMPLE_TYPES, independent per-type counters, and rate=1 disabling.

**Commit:** dc53024

### Task 2: Verify existing buffer cap test passes (HRD-03 traceability)

Confirmed `tests/phase-134/test-relay-batch.cjs` Test 14 ("buffer cap drops oldest events when maxBufferSize exceeded") passes after the downsampling changes. The BatchQueue `maxBufferSize=1000` drop-oldest semantics are intact and untouched by the downsampling additions.

No code changes required. Verification only.

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run tests/relay-downsample.test.cjs` | 4/4 PASS |
| `npx vitest run tests/phase-134/test-relay-batch.cjs` | 4/4 PASS (incl. Test 14) |
| `DOWNSAMPLE_TYPES` present in relay.cjs | PASS |
| `DOWNSAMPLE_RATE` env var wiring present | PASS |
| `typeCounters` Map present | PASS |
| `tool_start`/`tool_complete` not used functionally | PASS (comment only) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — downsampling is fully wired and operational.

## Self-Check: PASSED

- `tests/relay-downsample.test.cjs` — exists and passes
- `bin/lib/relay.cjs` — contains DOWNSAMPLE_TYPES, DOWNSAMPLE_RATE, typeCounters
- Commit dc53024 — verified present
