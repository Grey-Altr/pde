---
phase: 165
slug: image-generation-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 165 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run tests/phase-165/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/phase-165/ --reporter=verbose` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-165/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/phase-165/ --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Wave 0 Requirements

- [ ] `npm install satori @resvg/resvg-js sharp` — core image processing dependencies
- [ ] `tests/phase-165/` directory — test scaffolds
- [ ] `bin/lib/image-pipeline/fonts/Inter-Regular.ttf` — bundled font for Satori

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Playwright screenshot capture | IMG-04 | Requires Chromium browser binary | Run `/pde:image screenshot <url>`, verify PNG output |
| remove.bg background removal | IMG-07 | Requires REMOVEBG_API_KEY env var | Set key, run `/pde:image rembg <image>`, verify transparent PNG |
| Device mockup compositing | IMG-03 | Requires visual inspection of overlay quality | Run `/pde:image mockup <screenshot>`, inspect frame alignment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
