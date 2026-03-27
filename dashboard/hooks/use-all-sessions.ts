"use client";

import { useState, useEffect } from 'react';
import type { SessionListItem } from '@/lib/queries';

export function useAllSessions(pollIntervalMs: number = 5000): SessionListItem[] {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) return;
        const data = await res.json() as SessionListItem[];
        if (!cancelled) setSessions(data);
      } catch {
        // Network error — continue polling
      }
    }

    fetchSessions();
    const interval = setInterval(fetchSessions, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return sessions;
}
