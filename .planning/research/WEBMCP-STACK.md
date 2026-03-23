# Technology Stack: WebMCP Browser Integration

**Project:** PDE v0.14 Browser Integration
**Researched:** 2026-03-23

## Recommended Stack

### Core: Browser Automation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @playwright/mcp | latest (via npx) | Browser automation MCP server | Official Microsoft package, stdio transport, 25 tools, accessibility-tree-based, headless mode, zero plugin deps |

### Deferred: WebMCP Exposure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| navigator.modelContext | W3C Draft (Chrome 146) | Expose PDE to browser-based AI consumers | W3C standard, no npm dependency, but deferred until spec matures |

### Infrastructure (Existing, No Changes)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| mcp-bridge.cjs | Current | Policy layer, tool mapping, probe/degrade | Proven across 6 servers |
| npx | System | Playwright MCP execution | Same pattern as Stitch |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Browser automation | @playwright/mcp (Microsoft) | BrowserMCP (browsermcp.io) | Community project, less stable |
| Browser automation | @playwright/mcp | browser-use MCP | Python-focused, PDE is JS |
| Browser automation | @playwright/mcp | Browserbase MCP | Cloud-hosted, requires billing |
| Visual comparison | File-size + hash comparison | Pixelmatch / resemblejs | Would add npm deps to plugin root |

## Installation

```bash
# Headless mode (recommended for PDE autonomous execution)
claude mcp add playwright -- npx @playwright/mcp@latest --headless

# Headed mode (interactive debugging only)
claude mcp add playwright -- npx @playwright/mcp@latest

# Verify
claude mcp list | grep playwright
```

Zero npm install at PDE plugin root. npx handles package resolution.

## Sources

- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp) (HIGH confidence)
- [Simon Willison: Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) (HIGH confidence)
- [WebMCP W3C Draft](https://webmachinelearning.github.io/webmcp/) (LOW confidence)
