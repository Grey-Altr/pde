---
phase: 68
slug: critique-stitch-comparison
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node:test`) |
| **Config file** | none — tests run directly with `node --test` |
| **Quick run command** | `node --test tests/phase-68/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs tests/phase-67/*.test.mjs tests/phase-68/*.test.mjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-68/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs tests/phase-67/*.test.mjs tests/phase-68/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 68-01-01 | 01 | 1 | CRT-01 | unit (file parse) | `node --test tests/phase-68/stitch-detection.test.mjs` | ❌ W0 | ⬜ pending |
| 68-01-02 | 01 | 1 | CRT-02 | unit (file parse) | `node --test tests/phase-68/token-suppression.test.mjs` | ❌ W0 | ⬜ pending |
| 68-01-03 | 01 | 1 | CRT-03 | unit (file parse) | `node --test tests/phase-68/png-multimodal.test.mjs` | ❌ W0 | ⬜ pending |
| 68-01-04 | 01 | 1 | CRT-04 | unit (file parse) | `node --test tests/phase-68/stitch-comparison-section.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-68/stitch-detection.test.mjs` — CRT-01: manifest-read, STITCH_ARTIFACTS, Step 2g ordering
- [ ] `tests/phase-68/token-suppression.test.mjs` — CRT-02: SUPPRESS_TOKEN_FINDINGS, scope correct, color contrast preserved
- [ ] `tests/phase-68/png-multimodal.test.mjs` — CRT-03: PNG path construction, HAS_PNG, visual observation requirement
- [ ] `tests/phase-68/stitch-comparison-section.test.mjs` — CRT-04: section present, gated, compliance %, not in Action List, not in DESIGN-STATE items

*Existing infrastructure covers test runner — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual observations reference screenshot content | CRT-03 | Image-derived observations require multimodal model judgment | Run `/pde:critique` on a Stitch wireframe; verify CRT report contains observations referencing "screenshot" or "image" that describe visual properties not derivable from HTML alone |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
