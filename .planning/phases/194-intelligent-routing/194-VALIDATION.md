---
phase: 194
slug: intelligent-routing
status: draft
nyquist_compliant: false
created: 2026-03-30
---

# Phase 194 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (globals: true) |
| **Quick run command** | `npx vitest run tests/dispatcher/classify.test.cjs 2>&1 \| tail -20` |
| **Full suite command** | `npx vitest run tests/dispatcher/` |
| **Estimated runtime** | ~15 seconds (pure sync functions) |

## Wave 0 Requirements

- [ ] `tests/dispatcher/classify.test.cjs` — classifier unit tests (TDD)
- [ ] `packages/dispatcher/lib/classify.cjs` — classifier module

**Approval:** pending
