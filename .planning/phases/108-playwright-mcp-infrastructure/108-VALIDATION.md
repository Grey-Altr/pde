---
phase: 108
slug: playwright-mcp-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 108 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node:test`) |
| **Config file** | None — tests run directly |
| **Quick run command** | `node --test tests/phase-108/mcp-bridge-playwright.test.mjs` |
| **Full suite command** | `node --test tests/**/*.test.mjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-108/mcp-bridge-playwright.test.mjs`
- **After every plan wave:** Run `node --test tests/**/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 108-01-01 | 01 | 1 | PLAY-01 | unit | `node --test tests/phase-108/mcp-bridge-playwright.test.mjs` | W0 | pending |
| 108-01-02 | 01 | 1 | PLAY-02 | unit | same | W0 | pending |
| 108-01-03 | 01 | 1 | PLAY-03 | unit | same | W0 | pending |
| 108-01-04 | 01 | 1 | PLAY-04 | unit | same | W0 | pending |
| 108-01-05 | 01 | 1 | PLAY-05 | unit | same | W0 | pending |
| 108-01-06 | 01 | 1 | PLAY-06 | structural | same | W0 | pending |
| 108-01-07 | 01 | 1 | PLAY-07 | unit | same | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-108/mcp-bridge-playwright.test.mjs` — structural assertions for PLAY-01 through PLAY-07

*Existing infrastructure covers framework requirements — Node.js built-in test runner already in use across all phases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live tool name verification (MCP-08 gate) | PLAY-07 | Requires Playwright MCP installed and running | 1. Run `claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access` 2. Call `mcp__playwright__browser_snapshot` 3. Confirm response — tool prefix verified |
| No orphan Chrome processes | PLAY-08 | Requires session lifecycle observation | 1. Start Claude Code session with Playwright MCP 2. End session 3. Check `ps aux | grep chrome` — no orphan processes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
