export const RELAY_DEPTH_LIMIT = 1;

/**
 * Validates the X-PDE-Relay-Depth header on an incoming request.
 *
 * Prevents circular relay chains where a relay client relays to PDE which
 * would relay back to the originating relay — causing an infinite loop.
 *
 * Header semantics:
 * - Header absent (null): direct client connection — always allowed
 * - depth 0: first relay hop (Cursor, Gemini CLI) — allowed
 * - depth >= 1: circular relay attempt — rejected with 400
 * - NaN (garbage header value): treated as non-relay — allowed
 *
 * @returns null if request is allowed to proceed.
 * @returns Response with 400 status if relay depth limit is exceeded.
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
