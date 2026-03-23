# Domain Pitfalls: WebMCP Browser Integration

**Domain:** Browser automation and WebMCP for PDE
**Researched:** 2026-03-23

## Critical Pitfalls

### Pitfall 1: Confusing Playwright MCP with WebMCP
**What goes wrong:** Building WebMCP exposure infrastructure when the actual need is browser automation for PDE's own workflows. These are opposite directions: Playwright MCP = PDE controls a browser. WebMCP = a browser exposes PDE to external agents.
**Why it happens:** Both have "MCP" and "browser" in the name. The project_webmcp.md memory note describes both use cases without clearly separating them.
**Consequences:** Wasted phases building spec-unstable WebMCP adapter when Playwright MCP delivers immediate value.
**Prevention:** Phase A through C address Playwright MCP (browser automation). Phase D-E address WebMCP exposure. Never mix them in the same phase.
**Detection:** If a phase mentions both `navigator.modelContext` and `browser_take_screenshot`, it is mixing concerns.

### Pitfall 2: Headed browser mode in autonomous execution
**What goes wrong:** Claude Code subagent worktrees spawn visible Chrome windows. Multiple worktrees = multiple browser windows stealing focus, creating zombie processes on crash, and confusing the user.
**Why it happens:** Playwright MCP defaults to headed mode. Easy to forget `--headless` in APPROVED_SERVERS installCmd.
**Consequences:** Unusable during autonomous execution. Potential zombie Chrome processes consuming resources.
**Prevention:** Hardcode `--headless` in APPROVED_SERVERS.installCmd. Only override for interactive debugging via explicit flag.
**Detection:** Multiple Chrome processes visible in Activity Monitor during autonomous PDE execution.

### Pitfall 3: Tool name prefix mismatch
**What goes wrong:** TOOL_MAP entries assume `mcp__playwright__browser_navigate` format, but Claude Code may use a different namespace prefix depending on the server name registered via `claude mcp add`.
**Why it happens:** The MCP tool namespace is derived from the server name at registration time, not from the package itself.
**Consequences:** All Playwright tool calls fail silently, degrading to "unavailable" path without useful error messages.
**Prevention:** All entries marked TOOL_MAP_VERIFY_REQUIRED. Include live verification phase (same as Phase 44 pattern for Stitch).
**Detection:** Probe returns false despite Playwright MCP being registered and functional.

## Moderate Pitfalls

### Pitfall 4: file:// URL security restrictions
**What goes wrong:** Playwright MCP may block file:// navigation for security. Wireframe validation (the highest-value use case) requires file:// access.
**Prevention:** Test file:// in Phase 1. Fallback: serve wireframes via `npx serve .planning/design/ux/wireframes/ -p 0` (random port, zero deps).

### Pitfall 5: Screenshot file size bloat
**What goes wrong:** Each wireframe generates a PNG screenshot. Projects with 20+ screens produce 20+ screenshots per version, accumulating rapidly.
**Prevention:** Use .gitignore for screenshots directory. Store only latest version. Consider JPEG quality reduction.

### Pitfall 6: Timing issues with deploy verification
**What goes wrong:** Deploy smoke test navigates to $DEPLOY_URL before Vercel build completes. Gets 404 or build-in-progress page.
**Prevention:** deploy.md uses `--no-wait` flag. Add retry loop with exponential backoff (max 3 attempts, 10s/20s/40s) before declaring deploy verification failed.

## Minor Pitfalls

### Pitfall 7: Browser version mismatch
**What goes wrong:** npx caches an old @playwright/mcp version with an incompatible Chrome version.
**Prevention:** Use `npx @playwright/mcp@latest` (already in proposed installCmd). Playwright MCP bundles its own Chrome.

### Pitfall 8: macOS Gatekeeper blocking Chrome
**What goes wrong:** First Playwright MCP launch triggers macOS Gatekeeper dialog for the bundled Chrome binary.
**Prevention:** Document in AUTH_INSTRUCTIONS that first run may require Gatekeeper approval.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| APPROVED_SERVERS + TOOL_MAP | Tool name prefix mismatch (Pitfall 3) | Live verification before workflow integration |
| Wireframe integration | file:// restrictions (Pitfall 4) | Test in Phase 1, have npx serve fallback |
| Deploy verification | Timing issues (Pitfall 6) | Retry loop with backoff |
| WebMCP exposure | Premature spec adoption | Defer until spec stabilizes |
| Autonomous execution | Headed browser (Pitfall 2) | Always --headless |

## Sources

- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp) (HIGH confidence)
- [Simon Willison: Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) (HIGH confidence)
- PDE codebase: mcp-bridge.cjs TOOL_MAP_VERIFY_REQUIRED pattern, wireframe.md --no-playwright stub (verified from source)
- [WebMCP browser compatibility](https://dev.to/ai-agent-economy/webmcp-in-2026-which-browsers-support-navigatormodelcontext-complete-compatibility-status-1oe4) (MEDIUM confidence)
