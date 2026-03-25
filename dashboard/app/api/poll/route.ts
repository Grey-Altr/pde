import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const session = searchParams.get('session');
  if (!session) {
    return NextResponse.json({ error: 'Missing required query param: session' }, { status: 400 });
  }

  const lastTs = searchParams.get('last_ts') ?? '0';
  const cursor = Number(lastTs) || 0;

  const redisKey = `pde:default:events:${session}`;

  // Fetch events with score > cursor using zrangebyscore equivalent:
  // zrange with byScore: true and withScores: true returns [member, score, ...] pairs
  let results: string[] = [];
  try {
    results = await redis.zrange<string[]>(
      redisKey,
      cursor + 1,
      '+inf',
      { byScore: true, withScores: true }
    ) ?? [];
  } catch {
    return NextResponse.json({ error: 'Redis error' }, { status: 500 });
  }

  const events: unknown[] = [];
  let newCursor = cursor;

  // Results interleaved: [member0, score0, member1, score1, ...]
  for (let i = 0; i < results.length; i += 2) {
    const member = results[i];
    const score = Number(results[i + 1]);

    try {
      events.push(JSON.parse(member));
    } catch {
      events.push(member);
    }

    if (score > newCursor) newCursor = score;
  }

  return NextResponse.json({ events, cursor: newCursor });
}
