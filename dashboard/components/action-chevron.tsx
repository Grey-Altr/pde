"use client";

import { Card, CardContent } from '@/components/ui/card';
import { sessionColor } from '@/lib/session-colors';
import type { WireEnvelope } from '@/lib/wire-schema';

/** Extract the last 3 unique consecutive event_type values for a session */
export function extractLastEventTypes(events: WireEnvelope[], sessionId: string): string[] {
  const sessionEvents = events.filter(e => e.session_id === sessionId);

  // Deduplicate consecutive identical event_types
  const deduped: string[] = [];
  for (const ev of sessionEvents) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== ev.event_type) {
      deduped.push(ev.event_type);
    }
  }

  // Return last 3
  return deduped.slice(-3);
}

export function ActionChevron({
  events,
  sessionId,
}: {
  events: WireEnvelope[];
  sessionId: string;
}) {
  const eventTypes = extractLastEventTypes(events, sessionId);

  if (eventTypes.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-6">
          <p className="text-sm font-semibold mb-2">Action Timeline</p>
          <p className="text-sm text-muted-foreground">No events yet</p>
        </CardContent>
      </Card>
    );
  }

  const accentColor = sessionColor(0);

  return (
    <Card className="w-full">
      <CardContent className="py-4">
        <p className="text-sm font-semibold mb-3">Action Timeline</p>
        <div className="flex items-center gap-1 flex-wrap">
          {eventTypes.map((eventType, index) => {
            const isCurrent = index === eventTypes.length - 1;
            return (
              <div key={`${eventType}-${index}`} className="flex items-center gap-1">
                <span
                  className={`text-xs px-2 py-1 rounded font-mono ${
                    isCurrent
                      ? 'font-semibold text-background'
                      : 'text-muted-foreground bg-muted'
                  }`}
                  style={isCurrent ? { backgroundColor: accentColor } : undefined}
                >
                  {eventType}
                </span>
                {index < eventTypes.length - 1 && (
                  <span className="text-muted-foreground text-xs">›</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
