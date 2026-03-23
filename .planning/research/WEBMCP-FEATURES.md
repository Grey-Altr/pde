# Feature Landscape: WebMCP Browser Integration

**Domain:** Browser automation and WebMCP for PDE design pipeline
**Researched:** 2026-03-23

## Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Wireframe screenshot capture | Wireframes are HTML, visual validation is obvious | Low | file:// navigation + browser_take_screenshot |
| Deploy smoke test | Deploy outputs URL, users expect verification | Low | browser_navigate + browser_snapshot |
| Graceful degradation | All 6 existing MCP servers degrade gracefully | Low | Existing probe/degrade contract |
| Headless mode | Autonomous execution cannot show browser windows | Low | --headless flag |
| APPROVED_SERVERS entry | Security policy requires it | Low | 7 lines in mcp-bridge.cjs |

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| A11y tree from browser_snapshot | Full AOM tree reveals missing landmarks, labels, heading hierarchy | Low | Complements Axe MCP |
| Visual regression between wireframe versions | Catch unintended changes after /pde:iterate | Medium | Screenshot + comparison logic |
| Mockup-to-deploy visual comparison | Verify deployed site matches design intent | Medium | Screenshot both, compare |
| Competitive site screenshots | Visual competitive analysis | Medium | Extends /pde:competitive |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| WebMCP exposure before PDE-as-MCP-server | Hard prerequisite missing | Build Phases A-C before D-E |
| Headed browser in subagent worktrees | Focus-stealing, zombie processes | Always --headless for autonomous |
| Cookie persistence in .planning/ | Security risk | Ephemeral browser sessions |
| Full web scraping | Scope creep | Playwright only for PDE artifacts + deploy verification |

## Feature Dependencies

```
APPROVED_SERVERS entry -> TOOL_MAP -> Workflow integration
                                   +-> wireframe.md Step 5d (stub exists)
                                   +-> critique.md (a11y perspective)
                                   +-> deploy.md (smoke test)
                                   +-> mockup.md (screenshot capture)
```

## MVP Recommendation

Prioritize:
1. APPROVED_SERVERS + TOOL_MAP (infrastructure)
2. Wireframe screenshots (highest value, stub exists)
3. Deploy smoke testing (natural extension of existing deploy)
4. Critique a11y tree (low complexity, high value)

Defer:
- Visual regression (needs image diff without npm deps)
- WebMCP exposure (blocked on PDE-as-MCP-server)

## Sources

- PDE wireframe.md Step 5d, critique.md, deploy.md, mcp-integration.md (verified from codebase)
- [Playwright MCP tools](https://github.com/microsoft/playwright-mcp) (HIGH confidence)
