import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

export const PUBLIC_ROUTES = [
  '/sign-in(.*)',
  '/api/ingest',               // relay Bearer token (existing)
  '/api/approval-response',    // relay polls with Bearer token — INT-01 fix
  '/api/cron/gc',              // Vercel cron uses CRON_SECRET — INT-02 fix
  '/api/mcp',                                    // RMT-01: MCP handles own auth via withMcpAuth
  '/.well-known/oauth-protected-resource(.*)',    // RMT-02: public for MCP client OAuth discovery
  '/.well-known/oauth-authorization-server(.*)',  // RMT-02: public for MCP client OAuth discovery
] as const;

const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTES]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
