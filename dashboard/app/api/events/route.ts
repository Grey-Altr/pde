import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Fluid Compute Hobby max is 300s

function encodeSSEEvent(id: string, eventType: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    `id: ${id}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
  );
}

export async function GET(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session');
  if (!sessionId) {
    return new Response('Missing required query param: session', { status: 400 });
  }

  // Last-Event-ID sent by EventSource on reconnect for cursor-based resume (Pattern 2)
  const lastEventId = req.headers.get('last-event-id') ?? '0';
  let lastScore = Number(lastEventId) || 0;

  const encoder = new TextEncoder();

  // Use 'default' as user namespace key segment since Clerk userId is only available
  // after auth(); single-user dashboard — namespace is always 'default' for now.
  const redisKey = `pde:default:events:${sessionId}`;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function safeEnqueue(chunk: Uint8Array) {
        if (!closed) {
          try {
            controller.enqueue(chunk);
          } catch {
            // controller already closed
          }
        }
      }

      // Send connection confirmation event
      safeEnqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      );

      // Heartbeat every 15 seconds — SSE comment lines, NOT dispatched to message handlers
      // Client detects missed heartbeat at 30s and falls back to polling (D-04)
      const heartbeat = setInterval(() => {
        safeEnqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15_000);

      // Poll Redis every 2 seconds for new events to push over SSE stream
      const poller = setInterval(async () => {
        try {
          // zrange with byScore: true fetches members with score > lastScore
          // withScores: true returns [member, score, member, score, ...] pairs
          const results = await redis.zrange<string[]>(
            redisKey,
            lastScore + 1,
            '+inf',
            { byScore: true, count: 50, offset: 0, withScores: true }
          );

          if (results && results.length > 0) {
            // Results interleaved: [member0, score0, member1, score1, ...]
            for (let i = 0; i < results.length; i += 2) {
              const member = results[i];
              const score = Number(results[i + 1]);

              let eventData: unknown;
              try {
                eventData = JSON.parse(member);
              } catch {
                eventData = member;
              }

              safeEnqueue(encodeSSEEvent(String(score), 'pde-event', eventData));
              lastScore = score;
            }
          }
        } catch {
          // Redis errors are transient — skip cycle, don't crash stream
        }
      }, 2_000);

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poller);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Prevents nginx/Vercel edge proxy buffering
    },
  });
}
