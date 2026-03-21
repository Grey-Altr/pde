---
phase: 70
slug: hook-integration-and-delivery-architecture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 70 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x / Node.js assert |
| **Config file** | none — Wave 0 installs if needed |
| **Quick run command** | `node hooks/tests/test-idle-suggestions.cjs` |
| **Full suite command** | `node hooks/tests/test-idle-suggestions.cjs --full` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node hooks/tests/test-idle-suggestions.cjs`
- **After every plan wave:** Run `node hooks/tests/test-idle-suggestions.cjs --full`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 70-01-01 | 01 | 1 | DLVR-01 | integration | `node hooks/tests/test-idle-suggestions.cjs --test=zero-stdout` | ❌ W0 | ⬜ pending |
| 70-01-02 | 01 | 1 | DLVR-02 | integration | `node hooks/tests/test-idle-suggestions.cjs --test=event-gating` | ❌ W0 | ⬜ pending |
| 70-01-03 | 01 | 1 | DLVR-03 | integration | `node hooks/tests/test-idle-suggestions.cjs --test=no-spurious-update` | ❌ W0 | ⬜ pending |
| 70-01-04 | 01 | 1 | DLVR-04 | integration | `node hooks/tests/test-idle-suggestions.cjs --test=no-planning-files` | ❌ W0 | ⬜ pending |
| 70-02-01 | 02 | 2 | DLVR-05 | manual | Review Getting Started docs | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `hooks/tests/test-idle-suggestions.cjs` — test harness for idle suggestion handler
- [ ] Test fixtures for mock NDJSON event streams

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Getting Started docs contain threshold config | DLVR-05 | Documentation content review | Verify `messageIdleNotifThresholdMs: 5000` appears in Getting Started with correct `~/.CLAUDE.json` key |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
