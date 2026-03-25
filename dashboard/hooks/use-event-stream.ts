"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WireEnvelope } from '@/lib/wire-schema';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'polling';

export interface UseEventStreamReturn {
  events: WireEnvelope[];
  connectionStatus: ConnectionStatus;
}

/** Maximum rolling buffer size — prevents unbounded memory in long sessions */
const MAX_EVENTS = 200;

/** Missed-heartbeat fallback threshold: 30s = 2× the 15s SSE heartbeat interval */
const HEARTBEAT_TIMEOUT_MS = 30_000;

/** Polling interval when SSE falls back (D-05) */
const POLL_INTERVAL_MS = 3_000;

/** Attempt SSE reconnect after this many poll cycles */
const SSE_RETRY_AFTER_POLLS = 10;

export function useEventStream(sessionId: string): UseEventStreamReturn {
  const [events, setEvents] = useState<WireEnvelope[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [usingPolling, setUsingPolling] = useState(false);

  // Cursor tracking — shared across SSE and polling modes
  const lastTsRef = useRef<number>(0);
  // Count consecutive SSE errors to decide fallback timing
  const sseErrorCountRef = useRef<number>(0);
  // Heartbeat timeout handle
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Poll cycle counter for SSE retry
  const pollCycleRef = useRef<number>(0);

  /** Prepend new events to the rolling buffer (newest-first for display) */
  const appendEvents = useCallback((incoming: WireEnvelope[]) => {
    if (incoming.length === 0) return;
    setEvents((prev) => {
      const merged = [...incoming, ...prev];
      return merged.slice(0, MAX_EVENTS);
    });
  }, []);

  /** Reset the missed-heartbeat timer. Called on every message received. */
  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setTimeout(() => {
      // 30 seconds of silence — fall back to polling
      setUsingPolling(true);
    }, HEARTBEAT_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    if (usingPolling) {
      // --- Polling mode ---
      setConnectionStatus('polling');
      pollCycleRef.current = 0;

      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/poll?session=${encodeURIComponent(sessionId)}&last_ts=${lastTsRef.current}`
          );
          if (!res.ok) return; // transient error — retry next cycle

          const data = await res.json() as { events: WireEnvelope[]; cursor: number };
          if (data.events && data.events.length > 0) {
            appendEvents(data.events);
            lastTsRef.current = data.cursor;
          }
        } catch {
          // Network error — continue polling
        }

        pollCycleRef.current += 1;

        // Periodically retry SSE reconnect (every 10th poll cycle)
        if (pollCycleRef.current >= SSE_RETRY_AFTER_POLLS) {
          setUsingPolling(false);
        }
      }, POLL_INTERVAL_MS);

      return () => clearInterval(pollInterval);
    }

    // --- SSE mode ---
    setConnectionStatus('connecting');
    sseErrorCountRef.current = 0;

    const es = new EventSource(`/api/events?session=${encodeURIComponent(sessionId)}`);

    es.onopen = () => {
      setConnectionStatus('connected');
      sseErrorCountRef.current = 0;
      resetHeartbeatTimer();
    };

    // Handle named 'pde-event' events from the SSE stream
    es.addEventListener('pde-event', (e: MessageEvent) => {
      resetHeartbeatTimer();
      try {
        const envelope = JSON.parse(e.data) as WireEnvelope;
        appendEvents([envelope]);
        // Update cursor from event's relay_ts (ms timestamp)
        const ts = new Date(envelope.relay_ts).getTime();
        if (ts > lastTsRef.current) lastTsRef.current = ts;
      } catch {
        // Malformed event — skip
      }
    });

    // Handle the unnamed 'message' event (e.g., the initial connected confirmation)
    es.onmessage = () => {
      resetHeartbeatTimer();
    };

    es.onerror = () => {
      setConnectionStatus('reconnecting');
      sseErrorCountRef.current += 1;

      // After 2 consecutive errors, give up on SSE and switch to polling
      if (sseErrorCountRef.current >= 2) {
        es.close();
        setUsingPolling(true);
      }
      // Otherwise let the browser's built-in EventSource retry handle it
    };

    // Start heartbeat timer immediately — if SSE open is slow, still fall back after 30s
    resetHeartbeatTimer();

    return () => {
      es.close();
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    };
  }, [sessionId, usingPolling, appendEvents, resetHeartbeatTimer]);

  return { events, connectionStatus };
}
