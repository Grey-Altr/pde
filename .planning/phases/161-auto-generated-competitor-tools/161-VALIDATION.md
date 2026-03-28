---
phase: 161
slug: auto-generated-competitor-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 161 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 161-01-01 | 01 | 0 | ADV-02 | unit | `cd dashboard && npx vitest run tests/sanitize-tool-description.test.ts` | ❌ W0 | ⬜ pending |
| 161-01-02 | 01 | 0 | ADV-04 | unit | `cd dashboard && npx vitest run tests/competitor-tools-registry.test.ts` | ❌ W0 | ⬜ pending |
| 161-01-03 | 01 | 1 | ADV-01 | unit | `cd dashboard && npx vitest run tests/competitor-tools-registry.test.ts` | ❌ W0 | ⬜ pending |
| 161-01-04 | 01 | 1 | ADV-02 | unit | `cd dashboard && npx vitest run tests/sanitize-tool-description.test.ts` | ❌ W0 | ⬜ pending |
| 161-01-05 | 01 | 1 | ADV-01 | structural | `grep -q 'Step 8' workflows/competitive.md` | N/A | ⬜ pending |
| 161-02-01 | 02 | 0 | ADV-03 | unit | `cd dashboard && npx vitest run tests/use-competitor-tools.test.ts` | ❌ W0 | ⬜ pending |
| 161-02-02 | 02 | 2 | ADV-03 | structural | `grep -q 'useCompetitorTools' dashboard/hooks/use-webmcp-tools.ts` | N/A | ⬜ pending |
| 161-02-03 | 02 | 2 | ADV-03 | structural | `grep -c 'export' dashboard/lib/mcp/browser-tools/index.ts` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/tests/sanitize-tool-description.test.ts` — stubs for ADV-02 sanitization pipeline
- [ ] `dashboard/tests/competitor-tools-registry.test.ts` — stubs for ADV-04 registry persistence
- [ ] `dashboard/tests/use-competitor-tools.test.ts` — stubs for ADV-03 browser tool hook

*Existing vitest infrastructure covers test framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser AI agent sees competitor tool | ADV-03 | Requires live WebMCP browser environment | 1. Run competitive with --webmcp 2. Approve a tool via gate 3. Check navigator.modelContext |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
