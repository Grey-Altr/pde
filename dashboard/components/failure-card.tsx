"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SessionListItem } from '@/lib/queries';

interface FailureCardProps {
  session: SessionListItem;
  onRetry?: (sessionId: string) => Promise<void> | void;
  onAbandon?: (sessionId: string) => Promise<void> | void;
  onKill?: (sessionId: string) => Promise<void> | void;
}

export function FailureCard({ session, onRetry, onAbandon, onKill }: FailureCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [killConfirm, setKillConfirm] = useState(false);

  async function handleAction(fn?: (id: string) => Promise<void> | void) {
    if (!fn) return;
    setSubmitting(true);
    try {
      await fn(session.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full border-destructive/50 bg-destructive/5">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-destructive">
              Session Failed
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {session.id.slice(0, 12)}…
            </p>
            {session.phase && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Phase {session.phase}{session.plan ? ` / Plan ${session.plan}` : ''}
              </p>
            )}
          </div>
          <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive font-mono shrink-0">
            {session.lastEventType || 'unknown'}
          </span>
        </div>

        {killConfirm ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Kill session and remove worktree? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="min-h-[44px] min-w-[44px]"
                disabled={submitting}
                onClick={() => handleAction(onKill).then(() => setKillConfirm(false))}
              >
                Confirm Kill
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px]"
                disabled={submitting}
                onClick={() => setKillConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] border-green-500/40 text-green-600 hover:bg-green-500/10"
              disabled={submitting}
              onClick={() => handleAction(onRetry)}
            >
              Retry
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              disabled={submitting}
              onClick={() => handleAction(onAbandon)}
            >
              Abandon
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              disabled={submitting}
              onClick={() => setKillConfirm(true)}
            >
              Kill
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
