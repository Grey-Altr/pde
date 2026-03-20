---
phase: 58
slug: event-infrastructure-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 58 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert + shell scripts (zero deps) |
| **Config file** | none — inline validation via bash |
| **Quick run command** | `node bin/pde-tools.cjs event-emit '{"event_type":"test"}' 2>/dev/null; echo $?` |
| **Full suite command** | `bash .planning/phases/58-event-infrastructure-core/validate-events.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick validation command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | EVNT-01 | structural | `grep schema_version /tmp/pde-session-*.ndjson` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EVNT-02 | behavioral | `node -e "require('./bin/lib/event-bus.cjs')"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EVNT-03 | integration | `cat hooks/hooks.json \| jq '.PostToolUse'` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EVNT-05 | structural | `grep extensions /tmp/pde-session-*.ndjson` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EVNT-06 | behavioral | concurrent write test script | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `validate-events.sh` — shell script testing NDJSON output, schema shape, concurrent writes
- [ ] Event bus module loadable without side effects

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hook latency within 5% of baseline | EVNT-02 | Requires timing comparison across sessions | Run PDE command with/without hooks, compare wall clock |
| Malformed payload silent failure | EVNT-01 | Edge case requires intentional bad input | Pass invalid JSON to event-emit, verify no crash |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
