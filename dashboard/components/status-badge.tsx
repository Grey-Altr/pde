import { Badge } from '@/components/ui/badge';
import type { SessionStatus } from '@/lib/session-status';

interface StatusBadgeProps {
  status: SessionStatus;
}

const statusConfig: Record<SessionStatus, { dotClass: string; label: string }> = {
  active:   { dotClass: 'bg-green-500 animate-pulse', label: 'Active' },
  idle:     { dotClass: 'bg-amber-500',               label: 'Idle' },
  error:    { dotClass: 'bg-red-500',                 label: 'Error' },
  complete: { dotClass: 'bg-zinc-500',                label: 'Complete' },
  failed:   { dotClass: 'bg-red-700',                 label: 'Failed' },
  queued:   { dotClass: 'bg-sky-500',                 label: 'Queued' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { dotClass, label } = statusConfig[status];
  return (
    <div className="flex min-h-[44px] items-center">
      <Badge variant="secondary" className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${dotClass}`} />
        {label}
      </Badge>
    </div>
  );
}
