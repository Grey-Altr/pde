import type { NextRequest } from 'next/server';

export const ALLOWED_ORIGINS: Set<string> = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
  ].filter((v): v is string => typeof v === 'string'),
);

export function validateOrigin(req: Request | NextRequest): Response | null {
  const origin = req.headers.get('origin');
  if (origin !== null && !ALLOWED_ORIGINS.has(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return null;
}
