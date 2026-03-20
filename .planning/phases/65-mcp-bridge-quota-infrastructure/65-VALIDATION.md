---
phase: 65
slug: mcp-bridge-quota-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert + bash verification scripts |
| **Config file** | none — inline assertions in test scripts |
| **Quick run command** | `node -e "require('./lib/mcp-bridge.cjs')"` |
| **Full suite command** | `bash .planning/phases/65-mcp-bridge-quota-infrastructure/verify.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick syntax/import check
- **After every plan wave:** Run full verification script
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 65-01-01 | 01 | 1 | MCP-01 | integration | `grep -c "stitch" lib/mcp-bridge.cjs` | TBD | pending |
| 65-01-02 | 01 | 1 | MCP-02 | integration | `grep -c "TOOL_MAP" lib/mcp-bridge.cjs` | TBD | pending |
| 65-01-03 | 01 | 1 | MCP-03 | integration | `grep -c "STITCH_API_KEY" lib/mcp-bridge.cjs` | TBD | pending |
| 65-01-04 | 01 | 1 | MCP-05 | manual | Live server probe required | N/A | pending |
| 65-01-05 | 01 | 1 | QUOTA-01 | unit | `node -e "require('.planning/config.json')"` | TBD | pending |
| 65-01-06 | 01 | 1 | QUOTA-02 | unit | Threshold check script | TBD | pending |
| 65-01-07 | 01 | 1 | QUOTA-03 | integration | Fallback path verification | TBD | pending |
| 65-01-08 | 01 | 1 | QUOTA-04 | integration | `/pde:progress` and `/pde:health` output check | TBD | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Verification script stub at `.planning/phases/65-mcp-bridge-quota-infrastructure/verify.sh`
- [ ] Existing mcp-bridge.cjs readable and parseable

*Existing infrastructure covers most phase requirements — verification is primarily grep-based.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Stitch MCP tool name verification | MCP-05 | Requires running MCP server with valid API key | Run `/pde:connect stitch` with STITCH_API_KEY set, verify TOOL_MAP entries match live server |
| Quota exhaustion fallback UX | QUOTA-03 | Requires simulating quota exhaustion state | Set quota counter to max in config.json, run Stitch-dependent command, verify fallback message |
| Progress/health quota display | QUOTA-04 | Requires visual inspection of command output | Run `/pde:progress` and `/pde:health`, verify quota counters and 80% warning display |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
