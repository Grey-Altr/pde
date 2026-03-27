"use client";
import { useState, useEffect } from 'react';
import type { SessionListItem } from '@/lib/queries';

export function useAllSessions(pollIntervalMs = 5000): SessionListItem[] {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  useEffect(() => {
    const tick = () => fetch('/api/sessions').then(r => r.json()).then(setSessions).catch(() => {});
    tick();
    const id = setInterval(tick, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs]);
  return sessions;
}
