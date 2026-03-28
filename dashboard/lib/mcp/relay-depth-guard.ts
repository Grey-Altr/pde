/**
 * relay-depth-guard.ts — MCP relay depth enforcement module
 *
 * Prevents circular relay chains by inspecting the X-PDE-Relay-Depth header.
 * Mirrors the pattern of origin-guard.ts for consistency.
 *
 * Relay depth semantics:
 *   - No header (null): direct client request — always allowed
 *   - depth 0: first relay hop (intended Cursor/Gemini CLI use case) — allowed
 *   - depth >= 1: circular relay attempt — rejected with 400
 *   - NaN from garbage header: treated as non-relay — allowed
 *
 * Phase 162 / MEB-02
 */

export const RELAY_DEPTH_LIMIT = 1;

/**
 * Validates the X-PDE-Relay-Depth header on an incoming request.
 *
 * Runs BEFORE auth (validateOrigin → validateRelayDepth → authHandler) so that
 * circular relay attempts are denied cheaply without burning Clerk token validation.
 *
 * @returns Response with 400 status (JSON body) if relay depth >= RELAY_DEPTH_LIMIT.
 * @returns null if header is absent, non-numeric, or depth < RELAY_DEPTH_LIMIT.
 */
export function validateRelayDepth(req: Request): Response | null {
  const depthHeader = req.headers.get('x-pde-relay-depth');
  if (depthHeader === null) return null;

  const depth = parseInt(depthHeader, 10);
  if (isNaN(depth) || depth < RELAY_DEPTH_LIMIT) return null;

  return new Response(
    JSON.stringify({ error: 'relay_depth_exceeded', received_depth: depth }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  );
}
