---
phase: 145
slug: agent-sdk-orchestrator
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 145 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run tests/dispatcher/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/ --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/dispatcher/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/ --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 145-01-01 | 01 | 0 | SDK-01 | smoke | `node -e "require('./packages/dispatcher/lib/sdk-bridge.cjs')"` | ❌ W0 | ⬜ pending |
| 145-01-02 | 01 | 0 | SDK-02 | unit | `npx vitest run tests/dispatcher/orchestrator.test.cjs` | ❌ W0 | ⬜ pending |
| 145-01-03 | 01 | 0 | SDK-03 | unit | `npx vitest run tests/dispatcher/orchestrator.test.cjs` | ❌ W0 | ⬜ pending |
| 145-01-04 | 01 | 0 | SDK-04 | unit | `npx vitest run tests/dispatcher/orchestrator.test.cjs` | ❌ W0 | ⬜ pending |
| 145-01-05 | 01 | 0 | SDK-05 | unit | `npx vitest run tests/dispatcher/orchestrator.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dispatcher/sdk-bridge.test.cjs` — covers dynamic import isolation, sdkQuery result extraction, error handling
- [ ] `tests/dispatcher/orchestrator.test.cjs` — covers SDK-02 through SDK-05 with mocked sdkQuery
- [ ] `packages/dispatcher/lib/sdk-bridge.cjs` — the ESM bridge (prerequisite for all other files)
- [ ] Package install: `cd packages/dispatcher && npm install @anthropic-ai/claude-agent-sdk` — required before any import

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DAG analysis produces correct phase graph | SDK-02 | Requires real ROADMAP.md content and LLM reasoning | Run `analyzeDag()` with test ROADMAP.md, verify output structure |
| Failure summary is human-readable | SDK-04 | Quality is subjective — readable vs raw NDJSON | Run `summarizeFailure()` with sample NDJSON, review output |
| Conflict triage suggests valid resolution | SDK-05 | Resolution quality depends on context | Run `triageConflicts()` with sample conflict, verify strategy makes sense |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
