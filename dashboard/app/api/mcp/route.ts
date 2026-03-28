import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyClerkToken } from '@clerk/mcp-tools/next';
import { auth } from '@clerk/nextjs/server';
import { registerPdeTools } from '@/lib/mcp/server-factory';
import { validateOrigin } from '@/lib/mcp/origin-guard';
import { validateRelayDepth } from '@/lib/mcp/relay-depth-guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const mcpHandler = createMcpHandler(
  (server) => { registerPdeTools(server); },
  {},
  { basePath: '/api' },
);

const authHandler = withMcpAuth(
  mcpHandler,
  async (_, token) => {
    const clerkAuth = await auth({ acceptsToken: 'oauth_token' });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  },
);

async function guardedHandler(req: Request) {
  const originRejection = validateOrigin(req);
  if (originRejection) return originRejection;

  const relayRejection = validateRelayDepth(req);
  if (relayRejection) return relayRejection;

  return authHandler(req);
}

export { guardedHandler as GET, guardedHandler as POST, guardedHandler as DELETE };
