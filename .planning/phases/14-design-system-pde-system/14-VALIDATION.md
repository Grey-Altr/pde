---
phase: 14
slug: design-system-pde-system
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-15
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `assert` + `--self-test` pattern (established in Phases 12–13) |
| **Config file** | None — self-test is activated by `--self-test` CLI flag on each lib file |
| **Quick run command** | `node bin/lib/design.cjs --self-test` |
| **Full suite command** | `node bin/lib/design.cjs --self-test && node bin/pde-tools.cjs design ensure-dirs 2>&1` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node bin/lib/design.cjs --self-test`
- **After every plan wave:** Run `node bin/lib/design.cjs --self-test && node bin/pde-tools.cjs design ensure-dirs 2>&1`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | SYS-01 | unit | `node bin/lib/design.cjs --self-test` | ✅ existing | ⬜ pending |
| 14-01-02 | 01 | 1 | SYS-01 | integration | Manual inspection of `visual/SYS-tokens.json` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | SYS-02 | integration | `node -e "require('fs').readFileSync('.planning/design/assets/tokens.css','utf-8').includes('--color')"` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | SYS-02 | unit | Add dark mode CSS block assembly test to design.cjs self-test | ❌ W0 | ⬜ pending |
| 14-01-05 | 01 | 1 | SYS-03 | integration | Manual inspection of `visual/SYS-typography.css` | ❌ W0 (manual) | ⬜ pending |
| 14-01-06 | 01 | 1 | SYS-03 | integration | Manual inspection of `visual/SYS-colors.css` | ❌ W0 (manual) | ⬜ pending |
| 14-01-07 | 01 | 1 | SYS-03 | integration | Manual inspection of `visual/SYS-spacing.css` | ❌ W0 (manual) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Add dark mode CSS block assembly tests to `bin/lib/design.cjs` self-test — covers SYS-02 dark mode requirement (added in Phase 15.1-02)
- [~] Integration smoke test for `/pde:system`: manual-only — requires Claude to generate real DTCG tokens from a brief (not automatable as a unit test). Verified manually during Phase 14 execution.

*The core `dtcgToCssLines` and manifest CRUD tests already exist in design.cjs self-test from Phase 12.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DTCG JSON contains all 7 categories | SYS-01 | Structure varies by brief input | Inspect `visual/SYS-tokens.json` for color, typography, spacing, shadows, borders, motion, components sections |
| Typography tokens rendered correctly | SYS-03 | Visual correctness | Open `visual/SYS-preview.html` in browser, verify type scale renders |
| Color palette has 11 steps | SYS-03 | Visual/structural | Inspect `visual/SYS-colors.css` for 50–950 scale values |
| Spacing tokens at standard scale | SYS-03 | Structural completeness | Inspect `visual/SYS-spacing.css` for expected spacing values |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete (Phase 15.1-02)
