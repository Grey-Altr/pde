"use client";

import { useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import type { WireEnvelope } from '@/lib/wire-schema';

interface ApprovalCardProps {
  event: WireEnvelope;         // The pending approval_request event
  sessionId: string;           // For the POST request
  onResponded?: () => void;    // Optional callback after response submitted
}

type PendingAction = 'approve' | 'deny';

function formatRelativeTime(ts: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  } catch {
    return ts;
  }
}

export function ApprovalCard({ event, sessionId, onResponded }: ApprovalCardProps) {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>('approve');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAction, setSubmittedAction] = useState<PendingAction>('approve');
  const [error, setError] = useState<string | null>(null);

  const ev = event as Record<string, unknown>;
  const context = (ev.context as string) ?? event.event_type;
  const phaseName = ev.phase_name as string | undefined;
  const planName = ev.plan_name as string | undefined;

  function openDialog(action: PendingAction) {
    setPendingAction(action);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/approval-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          approval_id: event.approval_id,
          action: pendingAction,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      setSubmittedAction(pendingAction);
      setSubmitted(true);
      setOpen(false);
      onResponded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="w-full border-amber-500/50 bg-amber-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            {submittedAction === 'approve' ? (
              <>
                <span className="text-green-600 text-lg" aria-hidden>&#10003;</span>
                <p className="text-sm font-medium text-green-700">Approval submitted</p>
              </>
            ) : (
              <>
                <span className="text-red-600 text-lg" aria-hidden>&#10007;</span>
                <p className="text-sm font-medium text-red-700">Denied</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const actionLabel = pendingAction === 'approve' ? 'Approve' : 'Deny';
  const actionDescription =
    pendingAction === 'approve'
      ? 'approve this request'
      : 'deny this request';

  return (
    <>
      <Card className="w-full border-amber-500/50 bg-amber-500/5">
        <CardContent className="py-4 space-y-3">
          {/* Header */}
          <div>
            <p className="text-sm font-bold">Approval Required</p>
            <p className="text-sm text-muted-foreground mt-0.5">{context}</p>
            {(phaseName || planName) && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {[phaseName, planName].filter(Boolean).join(' / ')}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatRelativeTime(event.ts)}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 min-h-[44px] rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              onClick={() => openDialog('approve')}
              disabled={submitting}
            >
              Approve
            </button>
            <button
              type="button"
              className="flex-1 min-h-[44px] rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              onClick={() => openDialog('deny')}
              disabled={submitting}
            >
              Deny
            </button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md rounded-lg bg-background p-6 shadow-lg">
            <AlertDialog.Title className="text-base font-bold mb-2">
              Confirm {actionLabel}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-4">
              Are you sure you want to {actionDescription}? This action cannot be undone.
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
                className={`min-h-[44px] px-4 rounded-md text-white text-sm font-medium transition-colors disabled:opacity-50 ${
                  pendingAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : `Confirm ${actionLabel}`}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
