/**
 * Tests for bin/lib/charts.cjs — SVG chart generators
 * Phase 179: CHT-01 through CHT-04
 */

import { createRequire } from 'module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const { burndownChart, velocityChart, phaseTimelineChart, effortBreakdownChart } =
  require('../../bin/lib/charts.cjs');

// ─── MOCK_IR fixture (matches Phase 178 shape) ────────────────────────────────

const MOCK_IR = {
  schema_version: '1.0',
  extracted_at: '2026-03-30T01:00:00.000Z',
  source_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  project: {
    name: 'Platform Development Engine',
    core_value: 'Any user can go from idea to shipped product.',
  },
  phases: {
    total: 9,
    completed: 2,
    completion_pct: 22,
    phase_list: [
      { name: '176-data-extraction-ir-foundation', completed: true },
      { name: '177-command-interface-+-workflow-shell', completed: true },
      { name: '178-reference-personas-+-rendering-engine', completed: false },
    ],
  },
  requirements: {
    total: 58,
    completed: 12,
    blocked: 2,
    categories: [
      { name: 'Rendering', total: 7, completed: 3 },
      { name: 'Command', total: 5, completed: 4 },
      { name: 'Charts', total: 6, completed: 0 },
    ],
  },
  git_velocity: {
    total_commits: 42,
    commits_per_phase: 3.5,
    recent_activity: '2026-03-30',
  },
  cost_timing: {
    total_duration_min: 180,
    phases_with_timing: 6,
    avg_duration_min: 30,
  },
};

const MOCK_IR_UNAVAILABLE_REQUIREMENTS = {
  ...MOCK_IR,
  requirements: { unavailable: true, reason: 'REQUIREMENTS.md not found' },
};

const MOCK_IR_UNAVAILABLE_PHASES = {
  ...MOCK_IR,
  phases: { unavailable: true, reason: 'no phases data' },
};

const MOCK_IR_UNAVAILABLE_TIMING = {
  ...MOCK_IR,
  cost_timing: { unavailable: true, reason: 'no timing data' },
};

const MOCK_IR_ZERO_REQUIREMENTS = {
  ...MOCK_IR,
  requirements: { total: 0, completed: 0, blocked: 0, categories: [] },
};

const MOCK_IR_EMPTY_CATEGORIES = {
  ...MOCK_IR,
  requirements: { total: 10, completed: 5, blocked: 0, categories: [] },
};

// ─── burndownChart ────────────────────────────────────────────────────────────

describe('burndownChart (CHT-01)', () => {
  it('returns a string containing <svg with valid data', () => {
    const svg = burndownChart(MOCK_IR);
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });

  it('includes xmlns and viewBox', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox');
  });

  it('has role="img" for accessibility', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).toContain('role="img"');
  });

  it('has aria-labelledby="burndown-title"', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).toContain('aria-labelledby="burndown-title"');
  });

  it('has <title id="burndown-title"> element', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).toContain('<title id="burndown-title">');
  });

  it('contains a <polyline element for the data line', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).toContain('<polyline');
  });

  it('includes <details fallback table', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).toContain('<details');
    expect(svg).toContain('<table');
  });

  it('fallback table has class chart-data-table', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).toContain('chart-data-table');
  });

  it('returns placeholder SVG when requirements.unavailable is true', () => {
    const svg = burndownChart(MOCK_IR_UNAVAILABLE_REQUIREMENTS);
    expect(svg).toContain('<svg');
    expect(svg).toContain('unavailable');
  });

  it('does not throw when requirements.unavailable is true', () => {
    expect(() => burndownChart(MOCK_IR_UNAVAILABLE_REQUIREMENTS)).not.toThrow();
  });

  it('returns placeholder SVG when requirements.total === 0', () => {
    const svg = burndownChart(MOCK_IR_ZERO_REQUIREMENTS);
    expect(svg).toContain('<svg');
    expect(svg).toContain('insufficient data');
  });

  it('does not contain <script tags', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).not.toContain('<script');
  });

  it('does not contain external href or src URLs', () => {
    const svg = burndownChart(MOCK_IR);
    expect(svg).not.toMatch(/href="http/);
    expect(svg).not.toMatch(/src="http/);
  });
});

// ─── velocityChart ────────────────────────────────────────────────────────────

describe('velocityChart (CHT-02)', () => {
  it('returns a string containing <svg', () => {
    const svg = velocityChart(MOCK_IR);
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });

  it('includes xmlns and viewBox', () => {
    const svg = velocityChart(MOCK_IR);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox');
  });

  it('has role="img" for accessibility', () => {
    const svg = velocityChart(MOCK_IR);
    expect(svg).toContain('role="img"');
  });

  it('has aria-labelledby="velocity-title"', () => {
    const svg = velocityChart(MOCK_IR);
    expect(svg).toContain('aria-labelledby="velocity-title"');
  });

  it('has <title id="velocity-title"> element', () => {
    const svg = velocityChart(MOCK_IR);
    expect(svg).toContain('<title id="velocity-title">');
  });

  it('contains <rect bars for the chart', () => {
    const svg = velocityChart(MOCK_IR);
    expect(svg).toContain('<rect');
  });

  it('includes <details fallback table', () => {
    const svg = velocityChart(MOCK_IR);
    expect(svg).toContain('<details');
    expect(svg).toContain('<table');
  });

  it('returns placeholder SVG when phases.unavailable is true', () => {
    const svg = velocityChart(MOCK_IR_UNAVAILABLE_PHASES);
    expect(svg).toContain('<svg');
    expect(svg).toContain('unavailable');
  });

  it('does not throw when phases.unavailable is true', () => {
    expect(() => velocityChart(MOCK_IR_UNAVAILABLE_PHASES)).not.toThrow();
  });

  it('does not contain <script tags', () => {
    const svg = velocityChart(MOCK_IR);
    expect(svg).not.toContain('<script');
  });

  it('does not contain external URLs', () => {
    const svg = velocityChart(MOCK_IR);
    expect(svg).not.toMatch(/href="http/);
    expect(svg).not.toMatch(/src="http/);
  });
});

// ─── phaseTimelineChart ───────────────────────────────────────────────────────

describe('phaseTimelineChart (CHT-03)', () => {
  it('returns a string containing <svg', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });

  it('includes xmlns and viewBox', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox');
  });

  it('has role="img" for accessibility', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(svg).toContain('role="img"');
  });

  it('has aria-labelledby="timeline-title"', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(svg).toContain('aria-labelledby="timeline-title"');
  });

  it('has <title id="timeline-title"> element', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(svg).toContain('<title id="timeline-title">');
  });

  it('contains horizontal <rect bars', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(svg).toContain('<rect');
  });

  it('includes <details fallback table', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(svg).toContain('<details');
    expect(svg).toContain('<table');
  });

  it('returns placeholder SVG when cost_timing.unavailable is true', () => {
    const svg = phaseTimelineChart(MOCK_IR_UNAVAILABLE_TIMING);
    expect(svg).toContain('<svg');
    expect(svg).toContain('unavailable');
  });

  it('does not throw when cost_timing.unavailable is true', () => {
    expect(() => phaseTimelineChart(MOCK_IR_UNAVAILABLE_TIMING)).not.toThrow();
  });

  it('does not contain <script tags', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(svg).not.toContain('<script');
  });

  it('does not contain external URLs', () => {
    const svg = phaseTimelineChart(MOCK_IR);
    expect(svg).not.toMatch(/href="http/);
    expect(svg).not.toMatch(/src="http/);
  });
});

// ─── effortBreakdownChart ─────────────────────────────────────────────────────

describe('effortBreakdownChart (CHT-04)', () => {
  it('returns a string containing <svg', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });

  it('includes xmlns and viewBox', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox');
  });

  it('has role="img" for accessibility', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(svg).toContain('role="img"');
  });

  it('has aria-labelledby="effort-title"', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(svg).toContain('aria-labelledby="effort-title"');
  });

  it('has <title id="effort-title"> element', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(svg).toContain('<title id="effort-title">');
  });

  it('contains <rect bars per category', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(svg).toContain('<rect');
  });

  it('includes <details fallback table', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(svg).toContain('<details');
    expect(svg).toContain('<table');
  });

  it('returns placeholder SVG when requirements.unavailable is true', () => {
    const svg = effortBreakdownChart(MOCK_IR_UNAVAILABLE_REQUIREMENTS);
    expect(svg).toContain('<svg');
    expect(svg).toContain('unavailable');
  });

  it('does not throw when requirements.unavailable is true', () => {
    expect(() => effortBreakdownChart(MOCK_IR_UNAVAILABLE_REQUIREMENTS)).not.toThrow();
  });

  it('returns placeholder SVG when categories is empty', () => {
    const svg = effortBreakdownChart(MOCK_IR_EMPTY_CATEGORIES);
    expect(svg).toContain('<svg');
    expect(svg).toContain('insufficient data');
  });

  it('does not throw when categories is empty', () => {
    expect(() => effortBreakdownChart(MOCK_IR_EMPTY_CATEGORIES)).not.toThrow();
  });

  it('does not contain <script tags', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(svg).not.toContain('<script');
  });

  it('does not contain external URLs', () => {
    const svg = effortBreakdownChart(MOCK_IR);
    expect(svg).not.toMatch(/href="http/);
    expect(svg).not.toMatch(/src="http/);
  });
});
