---
phase: 189
slug: technical-debt-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 189 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + CLI verification |
| **Config file** | vitest.config.mjs |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Verify changed files contain expected content
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 189-01-01 | 01 | 1 | DEB-01 | grep | `grep -c 'CLAUDE_PLUGIN_ROOT' skills/execute-phase.md` | ✅ | ⬜ pending |
| 189-02-01 | 02 | 1 | DEB-02 | CLI | `npx knip --reporter json` | ❌ W0 | ⬜ pending |
| 189-03-01 | 03 | 1 | DEB-03 | CLI | `npx jscpd --reporters json` | ❌ W0 | ⬜ pending |
| 189-04-01 | 04 | 2 | DEB-04 | CLI | `npx eslint .` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- knip, jscpd, eslint need configuration before meaningful runs
- ESLint plugins need devDep installation

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
