import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const ALLOWED_ORIGINS: Set<string> = new Set(
  [process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3000'].filter(
    (o): o is string => typeof o === 'string',
  ),
);

/**
 * Validates the Origin header on an incoming request.
 *
 * Per MCP spec MUST requirement: every request must have its Origin header
 * validated. Null origin (no Origin header) is explicitly allowed because
 * desktop clients (npx relay, Claude Code CLI) do not send Origin headers.
 *
 * @returns Response with 403 status if origin is present but not allowlisted.
 * @returns null if origin is absent or is in ALLOWED_ORIGINS.
 */
export function validateOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin');

  if (origin !== null && !ALLOWED_ORIGINS.has(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }

  return null;
}
