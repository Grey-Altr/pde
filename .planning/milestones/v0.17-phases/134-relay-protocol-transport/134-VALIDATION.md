---
phase: 134
slug: relay-protocol-transport
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
updated: 2026-03-25
---

# Phase 134 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts (globals: true, CJS support) |
| **Quick run command** | `npx vitest run tests/phase-134/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/phase-134/` |
| **Estimated runtime** | ~4 seconds |
| **Actual runtime** | 3.91s (33 tests, 6 files) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-134/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/phase-134/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 4 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 134-01-T1 | 01 | 1 | RLY-02 | unit | `npx vitest run tests/phase-134/test-relay-protocol.cjs` | test-relay-protocol.cjs (8 tests) | ✅ green |
| 134-02-T1 | 02 | 2 | RLY-01, RLY-02, RLY-03 | unit | `npx vitest run tests/phase-134/test-relay-tail.cjs tests/phase-134/test-relay-circuit.cjs tests/phase-134/test-relay-batch.cjs` | 3 files (14 tests) | ✅ green |
| 134-03-T1 | 03 | 3 | RLY-04, RLY-05 | unit | `npx vitest run tests/phase-134/test-relay-hooks.cjs` | test-relay-hooks.cjs (6 tests) | ✅ green |
| 134-03-T2 | 03 | 3 | RLY-01, RLY-03, RLY-05 | integration | `npx vitest run tests/phase-134/test-relay-e2e.cjs` | test-relay-e2e.cjs (5 tests) | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Matrix

| Requirement | Description | Test Files | Test Count | Status |
|-------------|-------------|------------|------------|--------|
| RLY-01 | Relay tails NDJSON, events reach HTTP endpoint, zero npm deps | test-relay-tail.cjs, test-relay-batch.cjs, test-relay-e2e.cjs | 14 | ✅ COVERED |
| RLY-02 | Wire envelope with seq/session_id/machine_id/relay_ts/approval_id validated by zod | test-relay-protocol.cjs | 8 | ✅ COVERED |
| RLY-03 | Circuit breaker stops after N failures, resumes after cooldown | test-relay-circuit.cjs, test-relay-e2e.cjs | 7 | ✅ COVERED |
| RLY-04 | PDE_REMOTE unset = zero relay activity, zero network calls | test-relay-hooks.cjs | 2 | ✅ COVERED |
| RLY-05 | Broken relay = zero impact on PDE session execution | test-relay-hooks.cjs, test-relay-e2e.cjs | 3 | ✅ COVERED |

**Coverage: 5/5 requirements (100%)**

---

## Wave 0 Requirements

- [x] Test framework setup (vitest 4.1.1 with globals:true for CJS)
- [x] vitest.config.ts created in Plan 01 Task 1
- [x] All test files created alongside implementation (TDD: RED→GREEN)

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Upstash Redis ingest | RLY-01 | Requires live PDE_REMOTE endpoint and bearer token | Set PDE_REMOTE to dashboard URL, run PDE session, check Redis sorted sets |
| Real PDE session lifecycle | RLY-04, RLY-05 | Requires actual Claude Code session with hooks active | Run PDE session with/without PDE_REMOTE, verify ps output and PID file lifecycle |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none needed — TDD pattern)
- [x] No watch-mode flags
- [x] Feedback latency < 15s (actual: ~4s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** passed

---

## Validation Audit 2026-03-25

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 33 |
| Test files | 6 |
| Requirements covered | 5/5 |

*Reconstructed from execution artifacts (3 SUMMARY.md files, 6 test files). Original VALIDATION.md predated plan revision and contained stale task IDs.*
