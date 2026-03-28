# Connecting Desktop Clients to PDE MCP Server

## Prerequisites

- PDE dashboard deployed to Vercel (URL: `https://your-dashboard.vercel.app`)
- Clerk authentication configured on the dashboard

## Claude Code (Native Streamable HTTP)

Claude Code supports Streamable HTTP natively. No relay package needed.

**CLI method (user-scope):**
```bash
claude mcp add pde-remote --transport http https://your-dashboard.vercel.app/api/mcp
```

**Config file method (project-scope `.mcp.json`):**
```json
{
  "mcpServers": {
    "pde-remote": {
      "type": "http",
      "url": "https://your-dashboard.vercel.app/api/mcp"
    }
  }
}
```

On first connection, Claude Code will open a browser window for Clerk OAuth authentication.

## Cursor (Native Streamable HTTP)

Cursor supports Streamable HTTP natively when a `"url"` key is present.

**Config file (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "pde-remote": {
      "url": "https://your-dashboard.vercel.app/api/mcp"
    }
  }
}
```

Note: Cursor 2.6.x has a known bug where SSE fallback is broken, but this does not affect PDE since the endpoint is Streamable HTTP (not SSE).

## Gemini CLI (Native Streamable HTTP)

Gemini CLI supports Streamable HTTP via the `"httpUrl"` field. Do NOT use `"url"` — that selects SSE transport.

**Config file (`~/.gemini/settings.json` or project-level `.gemini/settings.json`):**
```json
{
  "mcpServers": {
    "pde-remote": {
      "httpUrl": "https://your-dashboard.vercel.app/api/mcp",
      "timeout": 30000
    }
  }
}
```

Gemini CLI auto-discovers OAuth endpoints from `.well-known/oauth-authorization-server` — no manual auth configuration needed.

## Legacy Clients (stdio-only, via mcp-remote relay)

For MCP clients that do not support remote HTTP URLs natively, use the `mcp-remote` relay:

```json
{
  "mcpServers": {
    "pde-remote": {
      "command": "npx",
      "args": ["mcp-remote", "https://your-dashboard.vercel.app/api/mcp"]
    }
  }
}
```

`mcp-remote` (v0.1.38) handles OAuth flows automatically and stores credentials in `~/.mcp-auth`.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 403 Origin not allowed | Browser-based request from unlisted origin | Add origin to ALLOWED_ORIGINS in lib/mcp/origin-guard.ts |
| 401 Unauthorized | Missing or expired Clerk OAuth token | Re-authenticate; check Clerk dashboard for active OAuth apps |
| 307 Redirect to sign-in | /api/mcp not in proxy.ts PUBLIC_ROUTES | Verify proxy.ts includes '/api/mcp' |
| Connection timeout | maxDuration too low or Fluid Compute not enabled | Check vercel.json has "fluid": true |
| Gemini CLI tools timeout | Using `"url"` instead of `"httpUrl"` | Use `"httpUrl"` for Streamable HTTP in Gemini CLI settings |
| 400 relay_depth_exceeded | Request arrived via nested relay chain | Direct client connection only — do not chain through another relay |

**Important:** `@mcp-b/webmcp-local-relay` is NOT used for desktop client connectivity. It is a browser WebMCP bridge used in Phase 157.
