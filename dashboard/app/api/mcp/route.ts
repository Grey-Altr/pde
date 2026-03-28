import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyClerkToken } from '@clerk/mcp-tools/next';
import { auth } from '@clerk/nextjs/server';
import { registerPdeTools } from '@/lib/mcp/server-factory';
import { validateOrigin } from '@/lib/mcp/origin-guard';

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
  const rejection = validateOrigin(req);
  if (rejection) return rejection;
  return authHandler(req);
}

export { guardedHandler as GET, guardedHandler as POST, guardedHandler as DELETE };
