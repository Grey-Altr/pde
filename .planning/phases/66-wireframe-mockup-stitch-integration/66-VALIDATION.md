---
phase: 66
slug: wireframe-mockup-stitch-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — Wave 0 creates test files |
| **Quick run command** | `node --test tests/phase-66/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-66/*.test.mjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-66/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-66/*.test.mjs`
- **Before `/pde:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 66-01-01 | 01 | 1 | WFR-01 | unit | `node --test tests/phase-66/wireframe-stitch-flag.test.mjs` | ❌ W0 | ⬜ pending |
| 66-01-02 | 01 | 1 | WFR-02, WFR-03 | unit | `node --test tests/phase-66/wireframe-stitch-flag.test.mjs` | ❌ W0 | ⬜ pending |
| 66-01-03 | 01 | 1 | WFR-04 | unit | `node --test tests/phase-66/annotation-injection.test.mjs` | ❌ W0 | ⬜ pending |
| 66-02-01 | 02 | 1 | WFR-05 | unit | `node --test tests/phase-66/mockup-stitch-flag.test.mjs` | ❌ W0 | ⬜ pending |
| 66-03-01 | 03 | 1 | CONSENT-01, CONSENT-02, CONSENT-03 | unit | `node --test tests/phase-66/consent-gates.test.mjs` | ❌ W0 | ⬜ pending |
| 66-03-02 | 03 | 1 | CONSENT-04 | unit | `node --test tests/phase-66/consent-gates.test.mjs` | ❌ W0 | ⬜ pending |
| 66-04-01 | 04 | 1 | WFR-06, EFF-04 | unit | `node --test tests/phase-66/fallback-behavior.test.mjs` | ❌ W0 | ⬜ pending |
| 66-04-02 | 04 | 1 | EFF-01, EFF-02, EFF-05 | unit | `node --test tests/phase-66/fallback-behavior.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-66/wireframe-stitch-flag.test.mjs` — stubs for WFR-01, WFR-02, WFR-03
- [ ] `tests/phase-66/mockup-stitch-flag.test.mjs` — stubs for WFR-05
- [ ] `tests/phase-66/annotation-injection.test.mjs` — stubs for WFR-04, stitch_annotated manifest flag
- [ ] `tests/phase-66/consent-gates.test.mjs` — stubs for CONSENT-01 through CONSENT-04
- [ ] `tests/phase-66/fallback-behavior.test.mjs` — stubs for WFR-06, EFF-01, EFF-02, EFF-04, EFF-05

*Existing node:test infrastructure from Phase 65 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stitch MCP live connection | MCP-05 | Requires valid STITCH_API_KEY and live server | Run `/pde:connect stitch --confirm` with valid API key |
| Visual quality of Stitch-generated screens | WFR-01 | Subjective visual assessment | Open STH-{slug}.html in browser, compare to brief |
| AskUserQuestion consent prompt display | CONSENT-01 | Requires interactive Claude Code session | Run `/pde:wireframe --use-stitch` and verify prompt appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
