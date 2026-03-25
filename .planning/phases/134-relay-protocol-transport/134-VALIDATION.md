---
phase: 134
slug: relay-protocol-transport
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 134 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts or "none — Wave 0 installs" |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 134-01-01 | 01 | 1 | RLY-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 134-01-02 | 01 | 1 | RLY-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 134-01-03 | 01 | 1 | RLY-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 134-01-04 | 01 | 1 | RLY-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 134-01-05 | 01 | 1 | RLY-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test framework setup (vitest) if not already present
- [ ] Test stubs for RLY-01 through RLY-05
- [ ] Shared fixtures for relay daemon, mock Upstash, mock NDJSON files

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Relay invisible to PDE when PDE_REMOTE unset | RLY-04 | Environment-dependent integration | Unset PDE_REMOTE, run PDE session, verify zero network calls in logs |
| Broken relay zero-impact on PDE | RLY-05 | Requires simulating network failure during live session | Start relay with invalid endpoint, run PDE session, verify no slowdowns or errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
