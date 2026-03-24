// Phase 98 -- Prose Drift and LDP Glob Fix
// Validates 3 requirements:
//   QUAL-01: critique.md BIZ-3 LDP glob uses correct stem (no -spec)
//   INTG-01: All 6 workflow prose sections say "21 fields" (not "20 fields")
//   FOUND-02: hasDeployStaging present in prose field lists

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function readWorkflow(name) {
  return readFileSync(resolve(ROOT, 'workflows', name), 'utf-8');
}

// ---------------------------------------------------------------------------
// QUAL-01: critique.md BIZ-3 LDP glob uses correct stem
// ---------------------------------------------------------------------------
describe('QUAL-01: critique.md LDP glob stem matches producer output', () => {
  const critique = readWorkflow('critique.md');

  test('critique.md does not contain stale LDP-landing-page-spec-v glob', () => {
    assert.ok(
      !critique.includes('LDP-landing-page-spec-v'),
      'critique.md must NOT contain "LDP-landing-page-spec-v" -- stale glob that misses producer output'
    );
  });

  test('critique.md contains correct LDP-landing-page-v*.md glob', () => {
    assert.ok(
      critique.includes('LDP-landing-page-v*.md'),
      'critique.md must contain "LDP-landing-page-v*.md" -- matches wireframe.md producer stem'
    );
  });
});

// ---------------------------------------------------------------------------
// INTG-01: All targeted workflow prose sections say "21 fields"
// ---------------------------------------------------------------------------
describe('INTG-01: workflow prose references 21 fields (not 20)', () => {
  test('competitive.md anti-pattern prose says "fewer than 21 fields"', () => {
    const content = readWorkflow('competitive.md');
    assert.ok(
      content.includes('fewer than 21 fields'),
      'competitive.md must contain "fewer than 21 fields" in anti-pattern prose'
    );
  });

  test('opportunity.md anti-pattern prose says "fewer than 21 fields"', () => {
    const content = readWorkflow('opportunity.md');
    assert.ok(
      content.includes('fewer than 21 fields'),
      'opportunity.md must contain "fewer than 21 fields" in anti-pattern prose'
    );
  });

  test('system.md prose says "twenty-one-field JSON object"', () => {
    const content = readWorkflow('system.md');
    assert.ok(
      content.includes('twenty-one-field'),
      'system.md must contain "twenty-one-field" in prose'
    );
  });

  test('critique.md prose says "ALL TWENTY-ONE current flag values"', () => {
    const critique = readWorkflow('critique.md');
    assert.ok(
      critique.includes('TWENTY-ONE'),
      'critique.md must contain "TWENTY-ONE" in coverage prose'
    );
  });

  test('hig.md prose says "ALL TWENTY-ONE current coverage flag values"', () => {
    const content = readWorkflow('hig.md');
    assert.ok(
      content.includes('TWENTY-ONE'),
      'hig.md must contain "TWENTY-ONE" in coverage prose'
    );
  });

  test('handoff.md prose says "twenty-one current flag values"', () => {
    const content = readWorkflow('handoff.md');
    assert.ok(
      content.includes('twenty-one current flag values'),
      'handoff.md must contain "twenty-one current flag values" in coverage prose'
    );
  });
});

// ---------------------------------------------------------------------------
// FOUND-02: hasDeployStaging in prose field lists
// ---------------------------------------------------------------------------
describe('FOUND-02: hasDeployStaging present in prose field lists', () => {
  const PROSE_FIELD_LIST_FILES = [
    'system.md',
    'critique.md',
    'hig.md',
    'handoff.md',
    'competitive.md',
    'opportunity.md',
  ];

  for (const filename of PROSE_FIELD_LIST_FILES) {
    test(`${filename} prose includes hasDeployStaging`, () => {
      const content = readWorkflow(filename);
      assert.ok(
        content.includes('hasDeployStaging'),
        `${filename} must contain "hasDeployStaging" in its field references`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Regression: no stale "20 fields" in the specific prose lines Phase 98 fixed
// ---------------------------------------------------------------------------
describe('Regression: no stale "20 fields" in targeted prose sections', () => {
  test('competitive.md does not say "fewer than 20 fields"', () => {
    const content = readWorkflow('competitive.md');
    assert.ok(
      !content.includes('fewer than 20 fields'),
      'competitive.md must NOT contain "fewer than 20 fields" -- stale prose'
    );
  });

  test('opportunity.md does not say "fewer than 20 fields"', () => {
    const content = readWorkflow('opportunity.md');
    assert.ok(
      !content.includes('fewer than 20 fields'),
      'opportunity.md must NOT contain "fewer than 20 fields" -- stale prose'
    );
  });

  test('system.md does not say "twenty-field JSON object" (stale)', () => {
    const content = readWorkflow('system.md');
    assert.ok(
      !content.includes('twenty-field JSON object'),
      'system.md must NOT contain "twenty-field JSON object" -- should be "twenty-one-field"'
    );
  });

  test('critique.md does not say "ALL TWENTY current" (stale)', () => {
    const critique = readWorkflow('critique.md');
    assert.ok(
      !critique.match(/ALL TWENTY current/),
      'critique.md must NOT contain "ALL TWENTY current" -- should be "ALL TWENTY-ONE current"'
    );
  });

  test('hig.md does not say "ALL TWENTY current" (stale)', () => {
    const content = readWorkflow('hig.md');
    assert.ok(
      !content.match(/ALL TWENTY current/),
      'hig.md must NOT contain "ALL TWENTY current" -- should be "ALL TWENTY-ONE current"'
    );
  });

  test('handoff.md does not say "ALL twenty current flag values" (stale)', () => {
    const content = readWorkflow('handoff.md');
    // Must not have "twenty current" without the "-one" -- but "twenty-one current" is fine
    const hasStale = content.includes('ALL twenty current flag values');
    assert.ok(
      !hasStale,
      'handoff.md must NOT contain "ALL twenty current flag values" -- should be "ALL twenty-one current flag values"'
    );
  });
});
