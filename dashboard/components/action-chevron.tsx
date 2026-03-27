"use client";

import { ChevronRight } from 'lucide-react';
import { sessionColor } from '@/lib/session-colors';
import type { WireEnvelope } from '@/lib/wire-schema';

interface ActionChevronProps {
  events: WireEnvelope[];
  sessionId: string;
  /** Optional index for color accent (0-based position of session in a list) */
  colorIndex?: number;
}

/**
 * Extracts the last 3 unique event_type values for the given sessionId,
 * ordered oldest-to-newest so the rightmost item is the current state.
 */
export function extractLastEventTypes(events: WireEnvelope[], sessionId: string): string[] {
  const sessionEvents = events.filter(e => e.session_id === sessionId);
  // Deduplicate consecutive identical event types, then take last 3
  const deduped: string[] = [];
  for (const ev of sessionEvents) {
    if (deduped[deduped.length - 1] !== ev.event_type) {
      deduped.push(ev.event_type);
    }
  }
  return deduped.slice(-3);
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function ActionChevron({ events, sessionId, colorIndex = 0 }: ActionChevronProps) {
  const eventTypes = extractLastEventTypes(events, sessionId);
  const accent = sessionColor(colorIndex);

  if (eventTypes.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">No events</span>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {eventTypes.map((eventType, index) => {
        const isCurrent = index === eventTypes.length - 1;
        const isFirst = index === 0;

        return (
          <div key={`${eventType}-${index}`} className="flex items-center gap-1">
            {!isFirst && (
              <ChevronRight
                className="w-3 h-3 text-muted-foreground/50 shrink-0"
                aria-hidden
              />
            )}
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
              style={
                isCurrent
                  ? { backgroundColor: `${accent}25`, color: accent, border: `1px solid ${accent}50` }
                  : { backgroundColor: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
              }
            >
              {formatEventType(eventType)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
