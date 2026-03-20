---
phase: 65
slug: mcp-bridge-quota-infrastructure
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
audited: 2026-03-20
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | none — inline assertions in test scripts |
| **Quick run command** | `node --test tests/phase-65/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-65/*.test.mjs` |
| **Test count** | 49 tests across 4 files |
| **Estimated runtime** | ~67ms |

---

## Sampling Rate

- **After every task commit:** Run quick syntax/import check
- **After every plan wave:** Run full verification script
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** <1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 65-01-01 | 01 | 1 | MCP-01 | integration | `node --test tests/phase-65/stitch-bridge-registration.test.mjs` | YES | green |
| 65-01-02 | 01 | 1 | MCP-02 | integration | `node --test tests/phase-65/tool-map-stitch.test.mjs` | YES | green |
| 65-01-03 | 01 | 1 | MCP-03 | integration | `node --test tests/phase-65/stitch-bridge-registration.test.mjs` | YES | green |
| 65-01-04 | 01 | 1 | MCP-05 | integration+manual | `node --test tests/phase-65/tool-map-stitch.test.mjs` (automated: markers); Live server probe (manual) | YES | green |
| 65-01-05 | 01 | 2 | QUOTA-01 | unit | `node --test tests/phase-65/quota-counter.test.mjs` | YES | green |
| 65-01-06 | 01 | 2 | QUOTA-02 | unit | `node --test tests/phase-65/quota-counter.test.mjs` | YES | green |
| 65-01-07 | 01 | 2 | QUOTA-03 | unit | `node --test tests/phase-65/quota-counter.test.mjs` | YES | green |
| 65-01-08 | 01 | 2 | QUOTA-04 | integration | `node --test tests/phase-65/quota-display.test.mjs` | YES | green |

*Status: pending / green / red / flaky*

---

## Test File Coverage

| Test File | Tests | Requirements | Status |
|-----------|-------|-------------|--------|
| stitch-bridge-registration.test.mjs | 13 | MCP-01, MCP-03 | PASS |
| tool-map-stitch.test.mjs | 15 | MCP-02, MCP-05 | PASS |
| quota-counter.test.mjs | 18 | QUOTA-01, QUOTA-02, QUOTA-03 | PASS |
| quota-display.test.mjs | 3 | QUOTA-04 | PASS |
| **Total** | **49** | **8 requirements** | **ALL PASS** |

---

## Wave 0 Requirements

- [x] Test files exist at `tests/phase-65/*.test.mjs`
- [x] Existing mcp-bridge.cjs readable and parseable
- [x] All 4 test files run green

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Stitch MCP tool name verification | MCP-05 (partial) | Requires running MCP server with valid API key | Run `/pde:connect stitch` with STITCH_API_KEY set, verify TOOL_MAP entries match live server |

*Note: QUOTA-03 exhaustion and QUOTA-04 display are now fully covered by automated tests (quota-counter.test.mjs and quota-display.test.mjs). Removed from manual-only.*

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** APPROVED

---

## Validation Audit 2026-03-20

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 49 |
| All passing | YES |
