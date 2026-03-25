"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import type { WireEnvelope } from '@/lib/wire-schema';

interface EventLogProps {
  events: WireEnvelope[];
}

function formatRelativeTs(isoString: string): string {
  const ts = new Date(isoString).getTime();
  const ageS = Math.floor((Date.now() - ts) / 1000);
  if (ageS < 60) return `${ageS}s ago`;
  const ageM = Math.floor(ageS / 60);
  return `${ageM}m ago`;
}

export function EventLog({ events }: EventLogProps) {
  const displayEvents = events.slice(0, 10);

  if (displayEvents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No events yet</p>
    );
  }

  return (
    <ScrollArea className="max-h-[250px]">
      <div>
        {displayEvents.map((ev, idx) => (
          <div
            key={`${ev.seq}-${idx}`}
            className="flex items-center gap-2 h-9 font-mono text-sm"
          >
            <span>{ev.event_type}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{formatRelativeTs(ev.relay_ts)}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
