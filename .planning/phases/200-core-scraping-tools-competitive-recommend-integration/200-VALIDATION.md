---
phase: 200
slug: core-scraping-tools-competitive-recommend-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 200 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + manual CLI verification |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 200-01-01 | 01 | 1 | SCR-01 | grep | `grep "firecrawl_scrape" bin/mcp-bridge.cjs` | ✅ | ⬜ pending |
| 200-01-02 | 01 | 1 | SCR-02 | grep | `grep "firecrawl_search" bin/mcp-bridge.cjs` | ✅ | ⬜ pending |
| 200-01-03 | 01 | 1 | SCR-03 | grep | `grep "firecrawl_map" bin/mcp-bridge.cjs` | ✅ | ⬜ pending |
| 200-01-04 | 01 | 1 | SCR-04 | grep | `grep "firecrawl_extract" bin/mcp-bridge.cjs` | ✅ | ⬜ pending |
| 200-01-05 | 01 | 1 | SCR-05 | grep | `grep "firecrawl_search_and_scrape\|search-with-scrape\|search_with_scrape" bin/mcp-bridge.cjs` | ✅ | ⬜ pending |
| 200-01-06 | 01 | 1 | CRL-01 | grep | `grep "FIRECRAWL_CRAWL_MAX_PAGES\|crawl.*limit\|maxPages" bin/mcp-bridge.cjs` | ✅ | ⬜ pending |
| 200-02-01 | 02 | 2 | PIP-01 | grep | `grep -i "firecrawl" commands/competitive.md` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — Phase 198 established TOOL_MAP, credit guards, and probe/degrade contract.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| firecrawl_scrape returns JS-rendered content | SCR-01 | Requires live Firecrawl API call | Call mcp__firecrawl__scrape with a JS-heavy URL, verify markdown output |
| competitive.md output quality improvement | PIP-01 | Subjective quality comparison | Run /pde:competitive before and after, compare output depth |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
