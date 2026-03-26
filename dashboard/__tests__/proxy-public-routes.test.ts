import { describe, it, expect } from 'vitest';
import { PUBLIC_ROUTES } from '../proxy';

describe('proxy.ts — public route configuration', () => {
  it('Test PR-01: /api/approval-response is in PUBLIC_ROUTES', () => {
    expect(PUBLIC_ROUTES).toContain('/api/approval-response');
  });

  it('Test PR-02: /api/cron/gc is in PUBLIC_ROUTES', () => {
    expect(PUBLIC_ROUTES).toContain('/api/cron/gc');
  });

  it('Test PR-03: /api/ingest is in PUBLIC_ROUTES (regression)', () => {
    expect(PUBLIC_ROUTES).toContain('/api/ingest');
  });

  it('Test PR-04: /sign-in(.*) is in PUBLIC_ROUTES (regression)', () => {
    expect(PUBLIC_ROUTES).toContain('/sign-in(.*)');
  });
});
