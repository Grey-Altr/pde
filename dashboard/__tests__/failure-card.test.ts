import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FailureCard } from '@/components/failure-card';
import type { SessionListItem } from '@/lib/queries';

const mockSession: SessionListItem = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  status: 'error',
  phase: 'phase-147',
  plan: '03',
  lastEventType: 'error',
  lastEventTs: Date.now() - 5000,
  startedAt: Date.now() - 60000,
  pendingApprovalId: null,
};

describe('FailureCard', () => {
  it('renders Retry and Abandon buttons', () => {
    render(FailureCard({ session: mockSession }));
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /abandon/i })).toBeTruthy();
  });

  it('Retry and Abandon buttons have min-h-[44px] class', () => {
    render(FailureCard({ session: mockSession }));
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    const abandonBtn = screen.getByRole('button', { name: /abandon/i });
    expect(retryBtn.className).toContain('min-h-[44px]');
    expect(abandonBtn.className).toContain('min-h-[44px]');
  });

  it('Kill button has min-h-[44px] class', () => {
    render(FailureCard({ session: mockSession }));
    const killBtn = screen.getByRole('button', { name: /kill/i });
    expect(killBtn.className).toContain('min-h-[44px]');
  });

  it('Kill button triggers AlertDialog open state', async () => {
    const user = userEvent.setup();
    render(FailureCard({ session: mockSession }));
    const killBtn = screen.getByRole('button', { name: /kill/i });
    await user.click(killBtn);
    // AlertDialog should be visible with "Kill session?" title
    expect(screen.getByText('Kill session?')).toBeTruthy();
  });
});
