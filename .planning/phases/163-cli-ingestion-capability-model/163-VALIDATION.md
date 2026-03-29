---
phase: 163
slug: cli-ingestion-capability-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 163 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run tests/phase-163/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/phase-163/ --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-163/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/phase-163/ --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 163-01-01 | 01 | 0 | CLI-01..06 | unit | `npx vitest run tests/phase-163/` | ❌ W0 | ⬜ pending |
| 163-02-01 | 02 | 1 | CLI-01 | unit | `npx vitest run tests/phase-163/openapi-parser.test.mjs` | ❌ W0 | ⬜ pending |
| 163-02-02 | 02 | 1 | CLI-02 | unit | `npx vitest run tests/phase-163/jsonschema-parser.test.mjs` | ❌ W0 | ⬜ pending |
| 163-03-01 | 03 | 2 | CLI-03 | unit | `npx vitest run tests/phase-163/graphql-parser.test.mjs` | ❌ W0 | ⬜ pending |
| 163-03-02 | 03 | 2 | CLI-04 | unit | `npx vitest run tests/phase-163/mcp-parser.test.mjs` | ❌ W0 | ⬜ pending |
| 163-04-01 | 04 | 3 | CLI-05 | unit | `npx vitest run tests/phase-163/tool-generator.test.mjs` | ❌ W0 | ⬜ pending |
| 163-04-02 | 04 | 3 | CLI-06 | unit | `npx vitest run tests/phase-163/tool-generator.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-163/` directory — test scaffolds for all parsers and generators
- [ ] `tests/phase-163/fixtures/` — sample OpenAPI, JSON Schema, GraphQL specs for testing
- [ ] `ai` package — devDependency for tsc validation of generated tool definitions

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP live introspection | CLI-04 | Requires running MCP server | Start pde-mcp-server, run ingest against it, verify capability model |
| GraphQL live introspection | CLI-03 | Requires running GraphQL endpoint | Start a test GraphQL server or use a public endpoint |
| tsc --noEmit on generated .ts | CLI-05,06 | Requires TypeScript compiler | Run tsc on generated tools.ts, verify zero errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
