import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, accessSync, constants } from 'node:fs';
import { resolve } from 'node:path';

const PLUGIN_ROOT = resolve(import.meta.dirname, '../..');
const paneSrc = readFileSync(resolve(PLUGIN_ROOT, 'bin/pane-experiment.sh'), 'utf8');
const dashboardSrc = readFileSync(resolve(PLUGIN_ROOT, 'bin/monitor-dashboard.sh'), 'utf8');
const logStreamSrc = readFileSync(resolve(PLUGIN_ROOT, 'bin/pane-log-stream.sh'), 'utf8');

const EVENT_TYPES = [
  'experiment.start',
  'experiment.iteration',
  'experiment.keep',
  'experiment.discard',
  'experiment.crash',
  'experiment.complete',
];

describe('OBS-02: pane-experiment.sh', () => {
  it('exists and is executable', () => {
    accessSync(resolve(PLUGIN_ROOT, 'bin/pane-experiment.sh'), constants.X_OK);
  });

  for (const type of EVENT_TYPES) {
    it(`handles ${type} in case block`, () => {
      assert.ok(paneSrc.includes(type), `Missing case for ${type}`);
    });
  }

  it('uses tail -F for streaming (not polling)', () => {
    assert.ok(paneSrc.includes('tail -F'), 'Missing tail -F streaming');
  });

  it('receives NDJSON path as $1', () => {
    assert.ok(paneSrc.includes('NDJSON="${1:-}"') || paneSrc.includes('NDJSON="$1"'),
      'Missing $1 argument for NDJSON path');
  });

  it('displays iteration count', () => {
    assert.ok(paneSrc.includes('Iteration') || paneSrc.includes('iteration'),
      'Missing iteration display');
  });

  it('displays best metric', () => {
    assert.ok(paneSrc.includes('Best metric') || paneSrc.includes('best_metric') || paneSrc.includes('BEST_METRIC') || paneSrc.includes('Best Metric'),
      'Missing best metric display');
  });

  it('displays keep/discard counts', () => {
    assert.ok(paneSrc.includes('Keep') || paneSrc.includes('keep'),
      'Missing keep count display');
    assert.ok(paneSrc.includes('Discard') || paneSrc.includes('discard'),
      'Missing discard count display');
  });

  it('displays remaining budget', () => {
    assert.ok(paneSrc.includes('Remaining') || paneSrc.includes('remaining') || paneSrc.includes('Budget left') || paneSrc.includes('budget'),
      'Missing remaining budget display');
  });
});

describe('OBS-02: monitor-dashboard.sh wires experiment pane', () => {
  it('references pane-experiment.sh', () => {
    assert.ok(dashboardSrc.includes('pane-experiment.sh'), 'Missing pane-experiment.sh reference');
  });

  it('labels a pane "experiment"', () => {
    assert.ok(dashboardSrc.includes('"experiment"'), 'Missing experiment pane label');
  });
});

describe('OBS-02: pane-log-stream.sh experiment color', () => {
  it('has experiment.* case branch', () => {
    assert.ok(
      logStreamSrc.includes('experiment.*') || logStreamSrc.includes('experiment.'),
      'Missing experiment.* case in log stream'
    );
  });

  it('uses cyan color for experiment events', () => {
    // Find the experiment case section and verify cyan escape code
    const lines = logStreamSrc.split('\n');
    const expIdx = lines.findIndex(l => l.includes('experiment.'));
    assert.ok(expIdx >= 0, 'No experiment case line found');
    // Check nearby lines for cyan escape
    const nearby = lines.slice(expIdx, expIdx + 5).join('\n');
    assert.ok(nearby.includes('\\033[36m') || nearby.includes('36m'),
      'Missing cyan color code near experiment case');
  });
});
