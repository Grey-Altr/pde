---
phase: 80
slug: print-collateral
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 80 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest / manual HTML inspection |
| **Config file** | vitest.config.ts or "none — Wave 0 installs" |
| **Quick run command** | `npx vitest run --reporter=verbose tests/phases/80` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose tests/phases/80`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 80-01-01 | 01 | 1 | PRNT-01 | unit | `npx vitest run tests/phases/80/flyer-page-spec.test.ts` | ❌ W0 | ⬜ pending |
| 80-01-02 | 01 | 1 | PRNT-02 | unit | `npx vitest run tests/phases/80/prepress-disclaimer.test.ts` | ❌ W0 | ⬜ pending |
| 80-01-03 | 01 | 1 | PRNT-03 | unit | `npx vitest run tests/phases/80/series-template.test.ts` | ❌ W0 | ⬜ pending |
| 80-01-04 | 01 | 1 | PRNT-04 | manual | Visual inspection of composition quality | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phases/80/flyer-page-spec.test.ts` — stubs for PRNT-01 (@page size, bleed zone, safe zone, CMYK table)
- [ ] `tests/phases/80/prepress-disclaimer.test.ts` — stubs for PRNT-02 (disclaimer adjacency check)
- [ ] `tests/phases/80/series-template.test.ts` — stubs for PRNT-03 ({{variable}} slot detection)
- [ ] Test fixture: sample experience product config for flyer generation

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Awwwards-level composition quality | PRNT-04 | Subjective visual assessment of hierarchy, negative space, typeface count, legibility | Open generated flyer HTML in browser, verify: clear focal hierarchy, intentional negative space, max 3 typefaces, legible at print size |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
