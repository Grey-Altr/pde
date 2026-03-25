import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import type { SessionListItem } from '@/lib/queries';

interface SessionCardProps {
  session: SessionListItem;
}

function formatElapsed(startedAt: number, status: SessionListItem['status']): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  if (status === 'complete') {
    return minutes < 1 ? 'Ended just now' : `Ended ${minutes}m ago`;
  }
  return minutes < 1 ? 'Running <1m' : `Running ${minutes}m`;
}

function formatLastEvent(lastEventTs: number): string {
  const ageS = Math.floor((Date.now() - lastEventTs) / 1000);
  if (ageS < 60) return `Last event ${ageS}s ago`;
  const ageM = Math.floor(ageS / 60);
  return `Last event ${ageM}m ago`;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link href={`/sessions/${session.id}`} className="block w-full">
      <Card className="w-full">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge status={session.status} />
              {session.pendingApprovalId && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                  Approval
                </Badge>
              )}
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {formatElapsed(session.startedAt, session.status)}
            </span>
          </div>
          <div className="mt-1">
            <p className="text-base font-semibold">{session.phase || 'Unknown phase'}</p>
            <p className="text-sm text-muted-foreground">{session.plan || 'Unknown plan'}</p>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {formatLastEvent(session.lastEventTs)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
