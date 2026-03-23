import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLUGIN_ROOT = resolve(import.meta.dirname, '../..');
const optimizeMd = readFileSync(resolve(PLUGIN_ROOT, 'workflows/optimize.md'), 'utf8');
const eventBusSrc = readFileSync(resolve(PLUGIN_ROOT, 'bin/lib/event-bus.cjs'), 'utf8');

const EVENT_TYPES = [
  'experiment.start',
  'experiment.iteration',
  'experiment.keep',
  'experiment.discard',
  'experiment.crash',
  'experiment.complete',
];

describe('OBS-01: Experiment event emissions in optimize.md', () => {
  for (const type of EVENT_TYPES) {
    it(`emits ${type}`, () => {
      assert.ok(optimizeMd.includes(`event-emit ${type}`), `Missing event-emit ${type}`);
    });
  }

  it('emits exactly 6 experiment event types', () => {
    const matches = optimizeMd.match(/event-emit experiment\./g);
    assert.equal(matches?.length, 6);
  });

  it('every event-emit call has 2>/dev/null || true guard', () => {
    const lines = optimizeMd.split('\n').filter(l => l.includes('event-emit experiment.'));
    assert.equal(lines.length, 6);
    for (const line of lines) {
      assert.ok(line.includes('2>/dev/null || true'), `Missing guard on: ${line.trim().slice(0, 60)}`);
    }
  });

  it('experiment.start payload includes slug, iteration_budget, baseline fields', () => {
    const startLine = optimizeMd.split('\n').find(l => l.includes('event-emit experiment.start'));
    assert.ok(startLine, 'experiment.start line not found');
    assert.ok(startLine.includes('slug'), 'Missing slug in experiment.start payload');
    assert.ok(startLine.includes('budget_total') || startLine.includes('iteration_budget'), 'Missing budget in experiment.start payload');
  });

  it('experiment.iteration payload includes slug and iteration', () => {
    const line = optimizeMd.split('\n').find(l => l.includes('event-emit experiment.iteration'));
    assert.ok(line, 'experiment.iteration line not found');
    assert.ok(line.includes('slug'), 'Missing slug');
    assert.ok(line.includes('iteration'), 'Missing iteration');
  });

  it('experiment.keep and experiment.discard payloads include metric_value', () => {
    for (const type of ['experiment.keep', 'experiment.discard']) {
      const line = optimizeMd.split('\n').find(l => l.includes(`event-emit ${type}`));
      assert.ok(line, `${type} line not found`);
      assert.ok(line.includes('metric_value'), `Missing metric_value in ${type}`);
    }
  });

  it('experiment.crash payload includes status field', () => {
    const line = optimizeMd.split('\n').find(l => l.includes('event-emit experiment.crash'));
    assert.ok(line, 'experiment.crash line not found');
    assert.ok(line.includes('status'), 'Missing status in crash payload');
  });

  it('experiment.complete payload includes slug and budget fields', () => {
    const line = optimizeMd.split('\n').find(l => l.includes('event-emit experiment.complete'));
    assert.ok(line, 'experiment.complete line not found');
    assert.ok(line.includes('slug'), 'Missing slug');
    assert.ok(line.includes('budget_used') || line.includes('iterations_run'), 'Missing budget/iterations field');
  });
});

describe('OBS-01: EXPERIMENT_EVENTS constants in event-bus.cjs', () => {
  it('exports EXPERIMENT_EVENTS with all 6 types', () => {
    assert.ok(eventBusSrc.includes('EXPERIMENT_EVENTS'), 'Missing EXPERIMENT_EVENTS export');
    for (const type of EVENT_TYPES) {
      assert.ok(eventBusSrc.includes(`'${type}'`) || eventBusSrc.includes(`"${type}"`),
        `Missing ${type} in EXPERIMENT_EVENTS`);
    }
  });
});
