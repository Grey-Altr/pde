---
phase: 111
slug: visual-metric-scripts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 111 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node:test`) |
| **Config file** | none — discovered by `node --test tests/` |
| **Quick run command** | `node --test tests/phase-111/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~5 seconds (contract tests only, no Playwright) |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-111/`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 111-01-01 | 01 | 1 | VIS-01, VIS-06, VIS-07 | unit | `node --test tests/phase-111/dom-metric.test.mjs` | ❌ W0 | ⬜ pending |
| 111-01-02 | 01 | 1 | VIS-02, VIS-06, VIS-07 | unit | `node --test tests/phase-111/a11y-metric.test.mjs` | ❌ W0 | ⬜ pending |
| 111-01-03 | 01 | 1 | VIS-03, VIS-06, VIS-07 | unit | `node --test tests/phase-111/contrast-metric.test.mjs` | ❌ W0 | ⬜ pending |
| 111-01-04 | 01 | 1 | VIS-04, VIS-06, VIS-07 | unit | `node --test tests/phase-111/responsive-metric.test.mjs` | ❌ W0 | ⬜ pending |
| 111-01-05 | 01 | 1 | VIS-05, VIS-06, VIS-07 | unit | `node --test tests/phase-111/mermaid-metric.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-111/dom-metric.test.mjs` — covers VIS-01, VIS-06, VIS-07
- [ ] `tests/phase-111/a11y-metric.test.mjs` — covers VIS-02, VIS-06, VIS-07
- [ ] `tests/phase-111/contrast-metric.test.mjs` — covers VIS-03, VIS-06, VIS-07
- [ ] `tests/phase-111/responsive-metric.test.mjs` — covers VIS-04, VIS-06, VIS-07
- [ ] `tests/phase-111/mermaid-metric.test.mjs` — covers VIS-05, VIS-06, VIS-07
- [ ] `references/experiments/fixtures/good-wireframe.html` — score verification fixture
- [ ] `references/experiments/fixtures/bad-wireframe.html` — score discrimination fixture

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Score accuracy for good wireframes (DOM score >= 60) | VIS-01 | Requires Playwright MCP + rendered HTML | Run `node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html` and verify score >= 60 |
| Multi-breakpoint responsive capture | VIS-04 | Requires live Playwright resize | Run `node bin/responsive-metric.cjs` on a fixture and verify 3 breakpoints captured |
| Mermaid CDN rendering | VIS-05 | Requires network + Playwright | Run `node bin/mermaid-metric.cjs` on a fixture with valid Mermaid and verify non-zero score |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
