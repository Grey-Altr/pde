---
status: partial
phase: 156-remote-mcp-server-foundation
source: [156-VERIFICATION.md]
started: 2026-03-28T19:15:00Z
updated: 2026-03-28T19:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end MCP client connection
expected: Claude Code or Cursor connects to deployed /api/mcp via Streamable HTTP and can call tools
result: [pending]

### 2. 401 vs 307 behavior on unauthenticated requests
expected: POST /api/mcp without auth token returns 401 from withMcpAuth, NOT 307 redirect from Clerk middleware
result: [pending]

### 3. Stateless mode (no Mcp-Session-Id header)
expected: Response from /api/mcp does not include Mcp-Session-Id header (sessionIdGenerator: undefined)
result: [pending]

### 4. RMT-07 requirements text alignment
expected: REQUIREMENTS.md RMT-07 text references `mcp-remote` for desktop relay (not `@mcp-b/webmcp-local-relay` which is Phase 157 browser WebMCP)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
