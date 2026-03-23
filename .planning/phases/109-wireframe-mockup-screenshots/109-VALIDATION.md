---
phase: 109
slug: wireframe-mockup-screenshots
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 109 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node:test`) |
| **Config file** | none — `node:test` is built into Node.js |
| **Quick run command** | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` |
| **Full suite command** | `node --test tests/phase-108/mcp-bridge-playwright.test.mjs tests/phase-109/wireframe-mockup-screenshots.test.mjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-108/mcp-bridge-playwright.test.mjs tests/phase-109/wireframe-mockup-screenshots.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 109-01-01 | 01 | 0 | WFR-01 | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | --- W0 | pending |
| 109-01-02 | 01 | 0 | WFR-02 | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | --- W0 | pending |
| 109-01-03 | 01 | 0 | WFR-03 | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | --- W0 | pending |
| 109-01-04 | 01 | 0 | WFR-04 | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | --- W0 | pending |
| 109-01-05 | 01 | 0 | WFR-05 | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | --- W0 | pending |
| 109-01-06 | 01 | 0 | MOK-01 | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | --- W0 | pending |
| 109-01-07 | 01 | 0 | MOK-02 | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | --- W0 | pending |
| 109-01-08 | 01 | 0 | MOK-03 | structural | `node --test tests/phase-109/wireframe-mockup-screenshots.test.mjs` | --- W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-109/wireframe-mockup-screenshots.test.mjs` — structural tests for WFR-01 through WFR-05 and MOK-01 through MOK-03

*Existing `node:test` infrastructure from Phase 108 covers the framework requirement.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual PNG screenshot quality | WFR-01, MOK-01 | Requires live Playwright MCP server + HTML files to screenshot | Run `/pde:wireframe` on a real project, verify PNG files appear in `screenshots/` subdirectory |
| 1280x800 viewport dimensions | WFR-05 | Requires live browser to verify pixel dimensions | Open generated PNG, verify dimensions are 1280x800 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
