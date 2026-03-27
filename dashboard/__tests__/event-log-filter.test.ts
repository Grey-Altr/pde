import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Source inspection test — validates EventLog session filtering without DOM rendering
// (project uses node environment; no @testing-library/react available)
const source = readFileSync(
  path.resolve(import.meta.dirname, '../components/event-log.tsx'),
  'utf-8'
);

describe('EventLog session filtering (DSH-02)', () => {
  it('EventLog accepts sessionFilter prop in its props interface', () => {
    expect(source).toContain('sessionFilter');
    // The prop is typed as an optional string
    expect(source).toMatch(/sessionFilter\??\s*:\s*string/);
  });

  it('EventLog applies session_id filter when sessionFilter is not "all"', () => {
    // The filtering condition must check against 'all' before filtering
    expect(source).toContain("sessionFilter === 'all'");
    expect(source).toContain('ev.session_id === sessionFilter');
  });

  it('EventLog session filter is applied before the event type filter', () => {
    // sessionFiltered must be consumed by the next filter step (filterEvents)
    expect(source).toContain('sessionFiltered');
    expect(source).toContain('filterEvents(sessionFiltered');
  });

  it('EventLog passes sessionFilter through to the component function signature', () => {
    // The destructured props must include sessionFilter
    expect(source).toMatch(/\{\s*events.*sessionFilter.*\}/s);
  });
});
