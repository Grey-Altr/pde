---
phase: 9
slug: fix-runtime-crash
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in (bash smoke tests) |
| **Config file** | none — bash smoke tests only |
| **Quick run command** | `node lib/ui/render.cjs banner "SMOKE TEST"` |
| **Full suite command** | `for cmd in banner panel progress checkpoint divider splash; do node lib/ui/render.cjs $cmd "TEST" 2>&1; echo "exit:$?"; done` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node lib/ui/render.cjs banner "SMOKE TEST" 2>&1; echo "exit:$?"`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | BRAND-04 | smoke | `node lib/ui/render.cjs banner "PDE TEST" 2>&1; echo "exit:$?"` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | BRAND-05 | smoke | `node lib/ui/render.cjs splash 2>&1; echo "exit:$?"` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | BRAND-05 | smoke | `for cmd in panel progress checkpoint divider; do node lib/ui/render.cjs $cmd "TEST" 2>&1; done` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/telemetry.cjs` — create the missing module (covers BRAND-04, BRAND-05)

*The entire phase deliverable IS the Wave 0 gap — creating the missing module enables all verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI banners display correctly with block characters | BRAND-04 | Visual rendering quality | Run `node lib/ui/render.cjs banner "PDE TEST"` and visually confirm block-char output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
