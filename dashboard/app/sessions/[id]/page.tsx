import { notFound } from 'next/navigation';
import { getSessionMeta, getRecentEvents } from '@/lib/queries';
import { redis } from '@/lib/redis';
import { SessionDetailClient } from './session-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getSessionMeta(id);
  if (!session) notFound();

  const initialEvents = await getRecentEvents(id, 50);

  // Hydrate persisted cost from Redis for TokenPlayground
  const raw = await redis.hgetall(`pde:default:session:${id}`) as Record<string, string> | null;
  const initialPersistedCostUsd = Number(raw?.cost_usd_cents ?? 0) / 10_000;

  return (
    <SessionDetailClient
      sessionId={id}
      initialSession={session}
      initialEvents={initialEvents}
      initialPersistedCostUsd={initialPersistedCostUsd}
    />
  );
}
