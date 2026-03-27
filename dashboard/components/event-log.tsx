"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { filterEvents, EVENT_FILTER_GROUPS, type FilterGroup } from '@/lib/event-types';
import type { WireEnvelope } from '@/lib/wire-schema';
import type { ConnectionStatus } from '@/hooks/use-event-stream';
import { sessionColor } from '@/lib/session-colors';
import { cn } from '@/lib/utils';

export interface EventLogProps {
  events: WireEnvelope[];
  connectionStatus: ConnectionStatus;
  sessionFilter?: string;
  sessionIds?: string[];
}

function formatRelativeTs(isoString: string): string {
  const ts = new Date(isoString).getTime();
  const ageS = Math.floor((Date.now() - ts) / 1000);
  if (ageS < 60) return `${ageS}s ago`;
  const ageM = Math.floor(ageS / 60);
  return `${ageM}m ago`;
}

export function EventLog({ events, connectionStatus, sessionFilter, sessionIds }: EventLogProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterGroup>('all');

  // Filter by session if not 'all'
  const sessionFiltered = useMemo(() => {
    if (!sessionFilter || sessionFilter === 'all') return events;
    return events.filter(e => e.session_id === sessionFilter);
  }, [events, sessionFilter]);

  // events are newest-first; reverse to chronological (oldest first) for log display
  const chronological = useMemo(() => [...sessionFiltered].reverse(), [sessionFiltered]);
  const showSessionTags = (sessionIds?.length ?? 0) > 1;

  const filteredEvents = useMemo(
    () => filterEvents(chronological, selectedFilter),
    [chronological, selectedFilter]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEvents.length]);

  const dimmed = connectionStatus === 'reconnecting';

  return (
    <Card className="w-full">
      <CardContent className="py-4">
        <p className="text-sm font-semibold mb-2">Event Log</p>
        <Tabs defaultValue="all" onValueChange={(v) => setSelectedFilter(v as FilterGroup)}>
          <TabsList className="w-full">
            {(Object.keys(EVENT_FILTER_GROUPS) as FilterGroup[]).map((group) => (
              <TabsTrigger
                key={group}
                value={group}
                className="flex-1 min-h-[44px] min-w-[44px] capitalize"
              >
                {group}
              </TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(EVENT_FILTER_GROUPS) as FilterGroup[]).map((group) => (
            <TabsContent key={group} value={group}>
              <div
                ref={group === selectedFilter ? scrollRef : undefined}
                onScroll={group === selectedFilter ? onScroll : undefined}
                className={`overflow-y-auto max-h-[400px]${dimmed ? ' opacity-60' : ''}`}
              >
                {filteredEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 px-2">
                    {selectedFilter === 'all' ? 'No events' : 'No matching events'}
                  </p>
                ) : (
                  filteredEvents.map((ev, idx) => {
                    const sessionIdx = sessionIds ? sessionIds.indexOf(ev.session_id ?? '') : -1;
                    const color = sessionIdx >= 0 ? sessionColor(sessionIdx) : undefined;
                    return (
                      <div
                        key={`${ev.seq}-${idx}`}
                        className="flex items-center gap-2 py-1.5 px-2 font-mono text-sm border-b border-border/50 last:border-b-0"
                      >
                        {showSessionTags && color && (
                          <Badge
                            variant="secondary"
                            className={cn("shrink-0 text-xs px-1 py-0")}
                            style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }}
                          >
                            {(ev.session_id ?? '').slice(0, 6)}
                          </Badge>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-semibold shrink-0">
                          {ev.event_type}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {formatRelativeTs(ev.relay_ts)}
                        </span>
                        {ev.extensions && Object.keys(ev.extensions).length > 0 && (
                          <span className="text-muted-foreground truncate">
                            {Object.keys(ev.extensions)[0]}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
