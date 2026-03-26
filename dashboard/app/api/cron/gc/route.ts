import type { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  // Auth guard: Vercel sends Authorization: Bearer <CRON_SECRET> automatically
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Find sessions idle for 7+ days (scored by last_event_ts in ms)
  const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const staleIds = (await redis.zrange('pde:default:sessions', '-inf', cutoffMs, {
    byScore: true,
  })) as string[];

  let count = 0;

  if (staleIds.length > 0) {
    const p = redis.pipeline();
    for (const id of staleIds) {
      p.del(`pde:default:events:${id}`);
      p.del(`pde:default:session:${id}`);
      p.zrem('pde:default:sessions', id);
    }
    await p.exec();
    count = staleIds.length;
  }

  return Response.json({
    ok: true,
    deleted: { count },
    cutoff: new Date(cutoffMs).toISOString(),
    ran_at: new Date().toISOString(),
  });
}
