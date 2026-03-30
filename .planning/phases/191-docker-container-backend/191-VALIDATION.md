---
phase: 191
slug: docker-container-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 191 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (dispatcher CJS), vitest (dashboard TS) |
| **Quick run command** | `node --test tests/dispatcher/coordinator-docker.test.cjs 2>&1 \| tail -30` |
| **Full suite command** | `node --test tests/dispatcher/ && cd dashboard && npx vitest run` |
| **Estimated runtime** | ~20 seconds (mocked dockerode) |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 191-01-01 | 01 | 1 | CLD-04 | unit | `node --test tests/dispatcher/coordinator-docker.test.cjs` | ❌ W0 | pending |
| 191-01-02 | 01 | 1 | CLD-05 | unit | `node --test tests/dispatcher/coordinator-docker.test.cjs` | ❌ W0 | pending |
| 191-02-01 | 02 | 2 | CLD-03 | unit | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | ✅ | pending |

---

## Wave 0 Requirements

- [ ] `tests/dispatcher/coordinator-docker.test.cjs` — Docker dispatch test file (created in Plan 01 TDD)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Docker container spawns and streams | CLD-04 | Requires Docker Desktop running | Set `DOCKER_AVAILABLE=1`, run integration test |
| No dangling containers after test | CLD-04 SC-4 | Requires Docker CLI | `docker ps -a --filter label=pde-session` returns empty |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
