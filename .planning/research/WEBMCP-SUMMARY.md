# Project Research Summary: WebMCP Browser Integration

**Project:** PDE v0.14 Browser Integration
**Domain:** Browser automation + WebMCP W3C standard for Claude Code plugin architecture
**Researched:** 2026-03-23
**Confidence:** MEDIUM-HIGH (Playwright MCP: HIGH, WebMCP spec: LOW)

## Executive Summary

"WebMCP integration" decomposes into two fundamentally different capabilities that must never be conflated. **Playwright MCP** (browser automation) gives PDE workflows the ability to navigate pages, capture screenshots, and extract accessibility trees -- it is immediately actionable, follows the exact same stdio/mcp-bridge.cjs pattern as the 6 existing MCP servers, requires zero npm dependencies, and already has workflow stubs in wireframe.md and critique.md. **WebMCP (W3C spec)** exposes PDE planning state to browser-based AI consumers via `navigator.modelContext` -- it requires PDE to first become an MCP server, the spec is in draft status (Chrome 146 Canary only, no Firefox/Safari), and should be deferred entirely.

The recommended approach is to build Playwright MCP integration across 4 focused phases: infrastructure registration, wireframe screenshot capture, critique accessibility enrichment, and deploy smoke testing. Each phase is small (estimated 6-8 requirements), well-scoped, and delivers standalone value. The architecture researcher confirmed that Playwright MCP slots into mcp-bridge.cjs identically to the Stitch pattern (stdio transport, `npx @playwright/mcp@latest --headless`, zero plugin-root deps). The features researcher identified 4 concrete workflow integration points with existing stubs. The stack is a single dependency managed entirely by npx.

The primary risks are: tool name prefix mismatch (TOOL_MAP entries need live verification before workflow integration), file:// URL restrictions in Playwright MCP (wireframe validation depends on local file access), and headed browser mode escaping into autonomous execution (zombie Chrome processes). All three have concrete prevention strategies identified by the pitfalls researcher and validated by the architecture researcher. The WebMCP W3C spec is explicitly not a risk because it is deferred -- but the naming confusion between "Playwright MCP" and "WebMCP" is itself a critical pitfall that must be addressed in documentation.

## Key Findings

### Recommended Stack

The stack is remarkably minimal. A single external package consumed via npx, layered onto existing PDE infrastructure.

**Core technologies:**
- **@playwright/mcp** (latest via npx): Browser automation MCP server -- official Microsoft package, 25 tools (10 relevant to PDE), stdio transport, headless mode, accessibility tree extraction
- **mcp-bridge.cjs** (existing): Policy layer for APPROVED_SERVERS, TOOL_MAP, probe/degrade -- proven across 6 servers, requires only ~20 lines of additions
- **npx** (system): Package execution without install -- same zero-dependency pattern as Stitch MCP

**Alternatives rejected:** BrowserMCP (community, less stable), browser-use MCP (Python-focused), Browserbase MCP (cloud-hosted, requires billing), pixelmatch/resemblejs (would add npm deps to plugin root).

**Critical constraint:** Zero npm dependencies at plugin root. Playwright MCP bundles its own Chrome binary, managed entirely by npx. PDE never touches browser binaries directly.

### Expected Features

**Must have (table stakes):**
- Wireframe screenshot capture -- wireframe.md Step 5d already has a `--no-playwright` stub and probe infrastructure
- Deploy smoke test -- navigate to $DEPLOY_URL, verify expected sections render
- Graceful degradation -- all existing MCP servers degrade; Playwright must follow the same contract
- Headless mode -- autonomous execution cannot spawn visible browser windows
- APPROVED_SERVERS entry -- security policy enforcement via mcp-bridge.cjs

**Should have (differentiators):**
- A11y tree from `browser_snapshot` -- complements Axe MCP with full AOM tree (landmarks, labels, heading hierarchy)
- Visual regression between wireframe versions -- catch unintended changes after `/pde:iterate`
- Mockup-to-deploy visual comparison -- verify deployed site matches design intent
- Competitive site screenshots -- visual competitive analysis extending `/pde:competitive`

**Defer (v2+):**
- WebMCP exposure via `navigator.modelContext` -- blocked on PDE-as-MCP-server and immature W3C spec
- Visual diff with pixel comparison -- requires npm deps (pixelmatch) or custom implementation; use file-size/hash comparison initially
- Cookie/session persistence -- all PDE use cases work with ephemeral browser sessions
- Full web scraping -- scope creep; Playwright only for PDE artifacts and deploy verification

### Architecture Approach

Playwright MCP integrates as the 7th entry in mcp-bridge.cjs APPROVED_SERVERS using stdio transport, identical to the Stitch/Pencil pattern. No new npm dependencies, no new bin/ scripts, no changes to core.cjs. The browser process spawns via `npx @playwright/mcp@latest --headless`, lives inside the Claude Code session lifecycle, and dies when the session ends. Screenshots are stored in existing design directories (`.planning/design/ux/wireframes/screenshots/`, `.planning/deploy-staging/`). All tool calls flow through Claude Code's MCP runtime -- mcp-bridge.cjs remains a policy/coordination layer only.

**Major components:**
1. **APPROVED_SERVERS entry** -- playwright server registration with stdio transport, headless installCmd, probe tool definition (~7 lines)
2. **TOOL_MAP entries** -- 10 canonical-to-raw tool name mappings (navigate, screenshot, snapshot, click, type, wait, evaluate, pdf, close, probe) (~10 lines, all VERIFY_REQUIRED)
3. **Workflow integrations** -- wireframe.md Step 5d screenshot capture, critique.md a11y tree extraction, deploy.md post-deploy smoke test, mockup.md screenshot capture (4 workflow files modified)

**File changes required:**
- `bin/lib/mcp-bridge.cjs`: ~20 lines (APPROVED_SERVERS + TOOL_MAP + AUTH_INSTRUCTIONS)
- `references/mcp-integration.md`: Update server count, add Playwright enhancement recipe
- `workflows/wireframe.md`: Replace Step 5d stub with actual Playwright calls
- `workflows/critique.md`: Add optional browser_snapshot in accessibility perspective
- `workflows/deploy.md`: Add post-deploy smoke test (Step 4b)
- `workflows/mockup.md`: Add screenshot capture (optional, lower priority)

### Critical Pitfalls

1. **Confusing Playwright MCP with WebMCP** -- These are opposite directions (PDE controls browser vs. browser exposes PDE). Never mix them in the same phase. Detection: if a phase mentions both `navigator.modelContext` and `browser_take_screenshot`, it is mixing concerns.

2. **Headed browser in autonomous execution** -- Subagent worktrees spawn visible Chrome windows, stealing focus and creating zombies. Prevention: hardcode `--headless` in APPROVED_SERVERS.installCmd. Only override via explicit interactive debugging flag.

3. **Tool name prefix mismatch** -- TOOL_MAP assumes `mcp__playwright__*` format but Claude Code derives the namespace from the server name at registration. All entries marked VERIFY_REQUIRED. Must live-verify before workflow integration (same Phase 44 pattern used for Stitch).

4. **file:// URL security restrictions** -- Wireframe validation (highest-value use case) requires file:// access. Playwright MCP may block it. Test in Phase 1. Fallback: `npx serve .planning/design/ux/wireframes/ -p 0`.

5. **Deploy verification timing** -- Smoke test navigates to $DEPLOY_URL before Vercel build completes. Prevention: retry loop with exponential backoff (3 attempts, 10s/20s/40s).

## Implications for Roadmap

Based on combined research, 4 phases for Playwright MCP integration, with WebMCP deferred to a separate future milestone.

### Phase 1: Playwright MCP Infrastructure (~6-8 requirements)
**Rationale:** All workflow integrations depend on APPROVED_SERVERS registration and verified TOOL_MAP entries. This is the foundation.
**Delivers:** Playwright MCP registered in mcp-bridge.cjs, tool names live-verified, probe/degrade working, mcp-integration.md updated.
**Addresses:** APPROVED_SERVERS entry, headless mode, graceful degradation (3 table-stakes features)
**Avoids:** Tool name prefix mismatch (Pitfall 3) via live verification; headed browser (Pitfall 2) via hardcoded --headless; file:// restrictions (Pitfall 4) via early testing

### Phase 2: Wireframe + Mockup Screenshot Integration (~6-8 requirements)
**Rationale:** Wireframe.md already has a stub (Step 5d, `--no-playwright` flag, Step 3 probe). Highest-value integration with lowest implementation risk. Mockup screenshot capture is the same pattern.
**Delivers:** Automated wireframe screenshots saved to `.planning/design/ux/wireframes/screenshots/`, mockup screenshots, degradation path tested.
**Addresses:** Wireframe screenshot capture (table stakes), visual regression foundation (differentiator)
**Avoids:** Screenshot file size bloat (Pitfall 5) via .gitignore and latest-only storage

### Phase 3: Critique A11y Integration (~4-6 requirements)
**Rationale:** Low complexity (single tool call), high value (richer accessibility data). Builds on Phase 1 infrastructure. Independent of Phase 2.
**Delivers:** `browser_snapshot` AOM tree feeding into critique accessibility perspective alongside Axe MCP results. Graceful degradation when neither is available.
**Addresses:** A11y tree from browser_snapshot (differentiator)
**Avoids:** No phase-specific pitfalls; standard probe/degrade pattern

### Phase 4: Deploy Smoke Test (~4-6 requirements)
**Rationale:** Depends on Phase 1 infrastructure. Complements existing deploy.md Gate 4/4. Lower priority than wireframe/critique because deploy verification is valuable but not blocking.
**Delivers:** Automated post-deploy navigation, screenshot, section verification written to deploy-manifest.json.
**Addresses:** Deploy smoke test (table stakes), mockup-to-deploy comparison foundation (differentiator)
**Avoids:** Timing issues (Pitfall 6) via retry loop with exponential backoff

### Phase Ordering Rationale

- **Phase 1 first:** All workflow integrations depend on mcp-bridge.cjs registration and verified tool names. No integration work can proceed until TOOL_MAP entries are live-verified.
- **Phase 2 before 3/4:** Wireframe has existing stubs (lowest friction), highest user-visible value, and validates the full tool call chain (navigate + screenshot) that later phases reuse.
- **Phase 3 and 4 are independent:** Could be reordered or parallelized. Phase 3 is smaller but Phase 4 delivers more visible value. Current ordering reflects complexity (simpler first).
- **WebMCP exposure is a separate milestone:** Not a phase in this milestone. Blocked on PDE-as-MCP-server (EXT-05 through EXT-08) and W3C spec maturity. Revisit when Chrome 146 reaches stable and Firefox ships support.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Needs live verification of tool name prefixes. The `mcp__playwright__*` convention is assumed but not confirmed. This is a known unknown that Phase 1 must resolve before Phase 2 begins.
- **Phase 4:** Deploy timing behavior (Vercel build completion signals, retry strategies) may need experimentation.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Wireframe.md already has the probe/degrade stub, Step 5d stub, and `--no-playwright` flag. The pattern is fully documented in mcp-integration.md.
- **Phase 3:** Single tool call (`browser_snapshot`) parsed as text. Same pattern as existing Axe MCP integration in critique.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Single dependency (@playwright/mcp), official Microsoft package, zero npm deps at plugin root, proven npx pattern |
| Features | HIGH | 4 concrete workflow integration points identified with existing stubs in codebase. Feature list derived from actual PDE workflow files. |
| Architecture | HIGH | Identical to 6 existing MCP server integrations. mcp-bridge.cjs pattern is proven. ~20 lines of config additions. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls well-documented with prevention strategies. file:// URL support is the main uncertainty requiring live testing. |

**Overall confidence:** MEDIUM-HIGH

The Playwright MCP integration path is high-confidence across all dimensions. The only area pulling confidence below HIGH is the WebMCP W3C spec (LOW confidence, draft status) -- but since that is explicitly deferred, it does not affect the actionable phases.

### Gaps to Address

- **Tool name prefix verification:** TOOL_MAP entries assume `mcp__playwright__*` format. Must be live-verified in Phase 1 before any workflow integration. Same validation pattern as Phase 44 (Stitch).
- **file:// URL support:** Wireframe validation requires navigating to `file:///` paths. Playwright MCP may restrict this. Needs testing. Fallback: `npx serve` with random port.
- **Headless Chrome in worktrees:** Behavior of headless Chrome spawned inside Claude Code subagent worktrees during autonomous execution has not been tested. Potential for resource contention.
- **Performance impact:** Browser automation adds latency to wireframe/deploy workflows. Impact on AutoResearch loops (rapid autonomous iteration) needs benchmarking.
- **Screenshot comparison strategy:** Visual regression without npm deps limits comparison to file-size and hash. Adequate for detecting changes but not for measuring similarity. May need to revisit in v2.

## Sources

### Primary (HIGH confidence)
- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp) -- Official Microsoft repository, tool list, transport options
- [Simon Willison: Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) -- Practical setup guide, headed/headless modes
- [Builder.io: Playwright MCP Server with Claude Code](https://www.builder.io/blog/playwright-mcp-server-claude-code) -- Integration patterns
- PDE codebase: mcp-bridge.cjs, wireframe.md, critique.md, deploy.md, mockup.md, mcp-integration.md -- verified integration points and existing stubs

### Secondary (MEDIUM confidence)
- [Patrick Brosset: WebMCP updates](https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/) -- Spec author clarifications on WebMCP direction
- [Chrome 146 WebMCP early preview](https://venturebeat.com/infrastructure/google-chrome-ships-webmcp-in-early-preview-turning-every-website-into-a) -- Browser support timeline
- [WebMCP browser compatibility status](https://dev.to/ai-agent-economy/webmcp-in-2026-which-browsers-support-navigatormodelcontext-complete-compatibility-status-1oe4) -- Cross-browser readiness

### Tertiary (LOW confidence)
- [WebMCP W3C Draft](https://webmachinelearning.github.io/webmcp/) -- Specification in draft status, API surface may change

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
