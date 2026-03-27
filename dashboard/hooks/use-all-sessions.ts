"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionListItem } from '@/lib/queries';

export function useAllSessions(pollIntervalMs = 5000): SessionListItem[] {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    const tick = async () => {
      const res = await fetch('/api/sessions');
      if (res.status === 401) {
        clearInterval(id);
        router.push('/sign-in');
        return;
      }
      if (!res.ok) return;
      const data: SessionListItem[] = await res.json();
      setSessions(data);
    };
    tick();
    id = setInterval(tick, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs, router]);

  return sessions;
}
