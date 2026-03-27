"use client";

import { useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import type { SessionListItem } from '@/lib/queries';

interface FailureCardProps {
  session: SessionListItem;
  onRetry?: (sessionId: string) => void;
  onAbandon?: (sessionId: string) => void;
  onKill?: (sessionId: string) => void;
}

function formatElapsed(startedAt: number): string {
  const elapsedMs = Date.now() - startedAt;
  const elapsedS = Math.floor(elapsedMs / 1000);
  if (elapsedS < 60) return `${elapsedS}s`;
  const elapsedM = Math.floor(elapsedS / 60);
  if (elapsedM < 60) return `${elapsedM}m`;
  const elapsedH = Math.floor(elapsedM / 60);
  return `${elapsedH}h`;
}

export function FailureCard({ session, onRetry, onAbandon, onKill }: FailureCardProps) {
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleRetry() {
    setSubmitting(true);
    try {
      onRetry?.(session.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAbandon() {
    setSubmitting(true);
    try {
      onAbandon?.(session.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleKill() {
    setSubmitting(true);
    setKillDialogOpen(false);
    try {
      onKill?.(session.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card className="w-full border-destructive/50 bg-destructive/5">
        <CardContent className="py-4 space-y-3">
          {/* Header */}
          <div>
            <p className="text-sm font-bold text-destructive">Session Failed</p>
            {(session.phase || session.plan) && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {[session.phase, session.plan].filter(Boolean).join(' / ')}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Elapsed: {formatElapsed(session.startedAt)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 min-h-[44px] min-w-[44px] rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              onClick={handleRetry}
              disabled={submitting}
            >
              Retry
            </button>
            <button
              type="button"
              className="flex-1 min-h-[44px] min-w-[44px] rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              onClick={handleAbandon}
              disabled={submitting}
            >
              Abandon
            </button>
            <button
              type="button"
              className="flex-1 min-h-[44px] min-w-[44px] rounded-md bg-destructive hover:bg-destructive/80 text-destructive-foreground text-sm font-medium transition-colors disabled:opacity-50"
              onClick={() => setKillDialogOpen(true)}
              disabled={submitting}
            >
              Kill
            </button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog.Root open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md rounded-lg bg-background p-6 shadow-lg">
            <AlertDialog.Title className="text-base font-bold mb-2">
              Kill session?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-4">
              This will terminate the session immediately. The worktree will be removed.
            </AlertDialog.Description>
            <div className="flex gap-2 justify-end">
              <AlertDialog.Close
                className="min-h-[44px] px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
                disabled={submitting}
              >
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                className="min-h-[44px] px-4 rounded-md bg-destructive hover:bg-destructive/80 text-destructive-foreground text-sm font-medium transition-colors disabled:opacity-50"
                onClick={handleKill}
                disabled={submitting}
              >
                {submitting ? 'Killing...' : 'Kill Session'}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
