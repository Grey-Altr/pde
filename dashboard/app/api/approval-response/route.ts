export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateRelayToken } from '@/lib/auth';
import { writeApprovalResponse, readApprovalResponse } from '@/lib/queries';
import { z } from 'zod';

const ApprovalResponseSchema = z.object({
  session_id:  z.string().uuid(),
  approval_id: z.string().uuid(),
  action:      z.enum(['approved', 'denied']),
});

// POST -- dashboard user submits approval/denial (Clerk auth, same as /api/poll)
export async function POST(request: Request): Promise<NextResponse> {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = ApprovalResponseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 422 });
  }

  const { session_id, approval_id, action } = result.data;
  await writeApprovalResponse(session_id, approval_id, action, userId ?? 'unknown');

  return NextResponse.json({ ok: true });
}

// GET -- PDE relay polls for pending approval response (Bearer token auth, same as /api/ingest)
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!validateRelayToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId  = searchParams.get('session_id');
  const approvalId = searchParams.get('approval_id');

  if (!sessionId || !approvalId) {
    return NextResponse.json(
      { error: 'Missing required query params: session_id, approval_id' },
      { status: 400 }
    );
  }

  const data = await readApprovalResponse(sessionId, approvalId);
  if (!data) {
    return NextResponse.json({ pending: true }, { status: 404 });
  }

  return NextResponse.json(data);
}
