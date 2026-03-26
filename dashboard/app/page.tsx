import { Suspense } from 'react';
import { getSessions } from '@/lib/queries';
import { SessionCard } from '@/components/session-card';
import { Skeleton } from '@/components/ui/skeleton';

function SessionListSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}

async function SessionList() {
  const sessions = await getSessions();

  if (sessions.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-lg font-semibold">No sessions yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a PDE session on your machine to see it appear here. Make sure PDE_REMOTE is set.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="px-4 sm:px-8 max-w-screen-sm mx-auto py-12 pb-24 md:pb-12">
      <h1 className="text-xl sm:text-[28px] font-semibold leading-[1.1]">Sessions</h1>
      <Suspense fallback={<SessionListSkeleton />}>
        <SessionList />
      </Suspense>
    </main>
  );
}
