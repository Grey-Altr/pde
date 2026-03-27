import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Source inspection test — validates structural requirements without DOM rendering
// (project uses node environment; no @testing-library/react available)
const source = readFileSync(
  path.resolve(import.meta.dirname, '../components/failure-card.tsx'),
  'utf-8'
);

describe('FailureCard component structure', () => {
  it('is a "use client" component', () => {
    expect(source).toContain('"use client"');
  });

  it('Retry button has min-h-[44px] class', () => {
    // All three action buttons must have min-h-[44px]
    const minHMatches = source.match(/min-h-\[44px\]/g) ?? [];
    expect(minHMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('imports AlertDialog from @base-ui/react/alert-dialog', () => {
    expect(source).toContain("from '@base-ui/react/alert-dialog'");
  });

  it('contains "Kill session?" AlertDialog title', () => {
    expect(source).toContain('Kill session?');
  });

  it('contains onRetry, onAbandon, onKill in props', () => {
    expect(source).toContain('onRetry');
    expect(source).toContain('onAbandon');
    expect(source).toContain('onKill');
  });

  it('contains "Session Failed" header', () => {
    expect(source).toContain('Session Failed');
  });

  it('contains border-destructive/50 destructive card styling', () => {
    expect(source).toContain('border-destructive/50');
    expect(source).toContain('bg-destructive/5');
  });

  it('Kill button opens AlertDialog (killDialogOpen state)', () => {
    expect(source).toContain('killDialogOpen');
    expect(source).toContain('setKillDialogOpen(true)');
  });

  it('all three action buttons have disabled={submitting} state', () => {
    const disabledMatches = source.match(/disabled=\{submitting\}/g) ?? [];
    // At least 3 buttons + Close button in dialog = 4 or more
    expect(disabledMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('AlertDialog description mentions worktree removal', () => {
    expect(source).toContain('worktree will be removed');
  });
});
