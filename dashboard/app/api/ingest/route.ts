export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRelayToken } from '@/lib/auth';
import { WireEnvelopeSchema } from '@/lib/wire-schema';
import { redis } from '@/lib/redis';

const BatchSchema = z.array(WireEnvelopeSchema).min(1).max(100);

export async function POST(request: Request): Promise<NextResponse> {
  // Step 1: Validate Bearer token (DSH-06)
  if (!validateRelayToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Step 2: Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Step 3: Validate with zod (batch of 1-100 WireEnvelopes)
  const result = BatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 422 });
  }

  const validatedBatch = result.data;
  const sessionId = validatedBatch[0].session_id;
  const lastEvent = validatedBatch[validatedBatch.length - 1];

  // Step 4: Build Redis pipeline (D-03) -- single round-trip
  const p = redis.pipeline();

  // Write each event to its session sorted set (D-02: pde:default:events:{session_id})
  for (const event of validatedBatch) {
    p.zadd(`pde:default:events:${sessionId}`, {
      score: new Date(event.relay_ts).getTime(),
      member: JSON.stringify(event),
    });
  }

  // Update session registry sorted set (D-01)
  p.zadd('pde:default:sessions', {
    score: Date.now(),
    member: sessionId,
  });

  // Update session metadata hash (D-01)
  const lastEventPayload = lastEvent as Record<string, unknown>;
  p.hset(`pde:default:session:${sessionId}`, {
    last_event_ts: String(Date.now()),
    last_event_type: lastEvent.event_type,
    phase: String(lastEventPayload.phase_name ?? ''),
    plan: String(lastEventPayload.plan_name ?? ''),
    started_at: String(new Date(validatedBatch[0].relay_ts).getTime()),
  });

  // Track pending approval on session hash (APR-01: enables approval badge on SessionCard)
  for (const event of validatedBatch) {
    if (event.event_type === 'approval_request' && event.approval_id) {
      p.hset('pde:default:session:' + sessionId, {
        pending_approval_id: event.approval_id,
      });
    } else if (event.event_type === 'approval_response' && event.approval_id) {
      p.hset('pde:default:session:' + sessionId, {
        pending_approval_id: '',
      });
    }
  }

  // Step 5: Execute pipeline (single HTTP round-trip to Upstash)
  await p.exec();

  // Step 5b: Fire push notifications for approval_request and error events
  for (const event of validatedBatch) {
    if (event.event_type === 'approval_request' && event.approval_id) {
      const { sendPushToOwner } = await import('@/app/actions');
      const eventPayload = event as Record<string, unknown>;
      sendPushToOwner({
        title: 'Approval Required',
        body: typeof eventPayload.context === 'string' ? eventPayload.context : 'PDE needs your approval',
        url: '/',
        tag: `approval-${event.approval_id}`,
      }).catch(() => {});
      break;
    } else if (event.event_type === 'error' || event.event_type === 'critical_error') {
      const { sendPushToOwner } = await import('@/app/actions');
      const eventPayload = event as Record<string, unknown>;
      sendPushToOwner({
        title: 'PDE Error',
        body: typeof eventPayload.message === 'string' ? eventPayload.message : 'A critical error occurred',
        url: '/',
        tag: 'error-notification',
      }).catch(() => {});
      break;
    }
  }

  // Step 6: Return success
  return NextResponse.json({ ok: true, count: validatedBatch.length });
}
