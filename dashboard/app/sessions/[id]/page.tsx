import { notFound } from 'next/navigation';
import { getSessionMeta, getRecentEvents } from '@/lib/queries';
import { SessionDetailClient } from './session-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getSessionMeta(id);
  if (!session) notFound();

  const initialEvents = await getRecentEvents(id, 10);

  return (
    <SessionDetailClient
      sessionId={id}
      initialSession={session}
      initialEvents={initialEvents}
    />
  );
}
