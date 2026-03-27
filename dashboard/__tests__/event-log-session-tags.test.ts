import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Source inspection test — validates EventLog color-coded session tags without DOM rendering
// (project uses node environment; no @testing-library/react available)
const source = readFileSync(
  path.resolve(import.meta.dirname, '../components/event-log.tsx'),
  'utf-8'
);

describe('EventLog color-coded session tags (DSH-03)', () => {
  it('EventLog accepts sessionIds prop for color assignment', () => {
    expect(source).toContain('sessionIds');
    expect(source).toMatch(/sessionIds\??\s*:\s*string\[\]/);
  });

  it('EventLog imports sessionColor from session-colors', () => {
    expect(source).toContain("from '@/lib/session-colors'");
    expect(source).toContain('sessionColor');
  });

  it('EventLog imports Badge component for session tag display', () => {
    expect(source).toContain("from '@/components/ui/badge'");
    expect(source).toContain('<Badge');
  });

  it('EventLog only shows session tags when there are multiple sessions', () => {
    // Guard: sessionIds.length > 1
    expect(source).toContain('sessionIds.length > 1');
  });

  it('EventLog uses sessionColor with the session index for color assignment', () => {
    // The per-event session index lookup and color application
    expect(source).toContain('sessionIds?.indexOf(ev.session_id)');
    expect(source).toContain('sessionColor(sessionIndex)');
  });

  it('EventLog displays truncated session ID (first 8 chars) in the tag', () => {
    expect(source).toContain('ev.session_id.slice(0, 8)');
  });

  it('EventLog applies sessionColor class to the Badge with cn()', () => {
    // The Badge should receive the color class via cn()
    expect(source).toContain('cn(');
    expect(source).toContain('sessionColor(sessionIndex)');
  });
});
