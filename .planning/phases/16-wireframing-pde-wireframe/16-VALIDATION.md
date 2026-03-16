---
phase: 16
slug: wireframing-pde-wireframe
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `assert` + manual end-to-end (same as Phases 14-15) |
| **Config file** | None — no test runner; infrastructure tests use `--self-test` flag pattern |
| **Quick run command** | `node bin/lib/design.cjs --self-test` |
| **Full suite command** | `node bin/lib/design.cjs --self-test` + manual: run `/pde:wireframe` on a test project and inspect HTML output |
| **Estimated runtime** | ~2 seconds (automated) + manual inspection |

---

## Sampling Rate

- **After every task commit:** Run `node bin/lib/design.cjs --self-test`
- **After every plan wave:** Manual end-to-end: run `/pde:wireframe "login" lofi` and open `index.html` in browser; verify `assets/tokens.css` link resolves; verify `pde-state--error` section present
- **Before `/gsd:verify-work`:** All three WFR requirements verified
- **Max feedback latency:** 2 seconds (automated)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | WFR-01 | smoke | `node -e "require('fs').existsSync('.planning/design/ux/wireframes/login.html')"` after skill run | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | WFR-01 | smoke | `node -e "require('fs').existsSync('.planning/design/ux/wireframes/index.html')"` | ❌ W0 | ⬜ pending |
| 16-01-03 | 01 | 1 | WFR-01 | smoke | Check HTML contains `pde-state--error` | ❌ W0 | ⬜ pending |
| 16-01-04 | 01 | 1 | WFR-01 | manual | Fidelity enum validation halts on unknown value | ❌ W0 (manual) | ⬜ pending |
| 16-01-05 | 01 | 1 | WFR-02 | smoke | Check HTML contains `tokens.css` link | ❌ W0 | ⬜ pending |
| 16-01-06 | 01 | 1 | WFR-02 | manual | Fallback palette when tokens absent | ❌ W0 (manual) | ⬜ pending |
| 16-01-07 | 01 | 1 | WFR-03 | manual | Two identical runs produce identical structure | ❌ W0 (manual) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `workflows/wireframe.md` — primary deliverable (Wave 1)
- [ ] `commands/wireframe.md` — update from stub to `@workflows/wireframe.md` delegation (Wave 1)
- [ ] No new test file needed in `design.cjs` — wireframe uses no new infrastructure code
- [ ] Manual smoke test procedure documented in this file (Phase gate)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTML opens in browser without server | WFR-01 | Requires browser environment | Open `ux/wireframes/login.html` via `file://` URL |
| Fidelity enum rejects unknown values | WFR-01 | Workflow behavior, not code | Run `/pde:wireframe "login" highfidelity` — must error and halt |
| Tokens cascade to wireframes | WFR-02 | Requires visual browser inspection | Open wireframe, verify CSS custom properties resolve |
| Fallback when tokens absent | WFR-02 | Requires file deletion + browser test | Delete `assets/tokens.css`, open wireframe, verify fallback styles |
| Structural consistency across runs | WFR-03 | Requires dual-run comparison | Run same command twice, diff output HTML structure |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
