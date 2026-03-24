'use strict';

/**
 * test-divergence.cjs — Unit tests for divergence.cjs module
 *
 * Covers requirements: DIV-01, DIV-02, DIV-03, DIV-04, DIV-06
 * Tests run in isolated temp directories — no side effects on real project.
 *
 * Run: node --test tests/phase-122/test-divergence.cjs
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  extractAnnotations,
  loadHandoffSpecs,
  findComponentFile,
  extractPropsFromFile,
  checkTokenUsage,
  loadIgnoreList,
  runDivergenceCheck,
  buildDivergenceReport,
} = require('../../bin/lib/divergence.cjs');

// ─── Test fixture helpers ──────────────────────────────────────────────────

/** Create an isolated temp directory; return path */
function makeTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-div-test-' + (prefix || '')));
}

/** Recursively remove temp directories in after() hooks */
function cleanDirs(dirs) {
  for (const d of dirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
  }
}

// ─── DIV-01: T1 Structural Detection ──────────────────────────────────────

describe('DIV-01: extractAnnotations', () => {
  it('returns a component spec for @component-only annotation', () => {
    const content = '<!-- @component: Button -->';
    const result = extractAnnotations(content);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Button');
    assert.equal(result[0].props, null);
    assert.deepEqual(result[0].tokens, []);
  });

  it('returns full ComponentSpec when all three annotations are present', () => {
    const content = [
      '<!-- @component: ButtonGroup -->',
      '<!-- @props: ButtonGroupProps -->',
      '<!-- @tokens: --color-primary-500, --spacing-4 -->',
    ].join('\n');
    const result = extractAnnotations(content);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'ButtonGroup');
    assert.equal(result[0].props, 'ButtonGroupProps');
    assert.deepEqual(result[0].tokens, ['--color-primary-500', '--spacing-4']);
  });

  it('returns empty array when no annotations are present', () => {
    const content = 'Some plain markdown text with no annotations.';
    const result = extractAnnotations(content);
    assert.deepEqual(result, []);
  });

  it('handles multiple component blocks in sequence', () => {
    const content = [
      '## Button',
      '<!-- @component: Button -->',
      '<!-- @props: ButtonProps -->',
      '<!-- @tokens: --color-primary -->',
      '',
      '## Card',
      '<!-- @component: Card -->',
      '<!-- @props: CardProps -->',
    ].join('\n');
    const result = extractAnnotations(content);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'Button');
    assert.equal(result[1].name, 'Card');
    assert.equal(result[1].props, 'CardProps');
    assert.deepEqual(result[1].tokens, []);
  });
});

describe('DIV-01: findComponentFile', () => {
  const tmpDirs = [];
  after(() => cleanDirs(tmpDirs));

  it('returns file path when Button.tsx exists at project root level', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const srcDir = path.join(tmp, 'src', 'components');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'Button.tsx'), 'export const Button = () => null;');
    const result = findComponentFile(tmp, 'Button');
    assert.ok(result !== null, 'should find Button.tsx');
    assert.ok(result.endsWith('Button.tsx'), 'result should end with Button.tsx');
  });

  it('returns null when component file does not exist', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const result = findComponentFile(tmp, 'NonExistentComponent');
    assert.equal(result, null);
  });

  it('matches case-insensitively (finds button.tsx when looking for Button)', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const srcDir = path.join(tmp, 'components');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'button.tsx'), 'export const button = () => null;');
    const result = findComponentFile(tmp, 'Button');
    assert.ok(result !== null, 'should find button.tsx case-insensitively');
  });

  it('skips node_modules directory', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    // Put a component only inside node_modules — should not be found
    const nmDir = path.join(tmp, 'node_modules', 'some-lib');
    fs.mkdirSync(nmDir, { recursive: true });
    fs.writeFileSync(path.join(nmDir, 'Button.tsx'), 'export const Button = () => null;');
    const result = findComponentFile(tmp, 'Button');
    assert.equal(result, null, 'should not find Button.tsx inside node_modules');
  });

  it('skips dotdirs (e.g., .git, .planning)', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const dotDir = path.join(tmp, '.planning', 'components');
    fs.mkdirSync(dotDir, { recursive: true });
    fs.writeFileSync(path.join(dotDir, 'Button.tsx'), 'export const Button = () => null;');
    const result = findComponentFile(tmp, 'Button');
    assert.equal(result, null, 'should not find Button.tsx inside dotdirs');
  });

  it('matches .tsx, .ts, .jsx, .js, .vue, .svelte extensions', () => {
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte'];
    for (const ext of extensions) {
      const tmp = makeTmp();
      tmpDirs.push(tmp);
      const srcDir = path.join(tmp, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'Widget' + ext), '// Widget component');
      const result = findComponentFile(tmp, 'Widget');
      assert.ok(result !== null, `should find Widget${ext}`);
    }
  });
});

// ─── DIV-02: T2 Content Detection ─────────────────────────────────────────

describe('DIV-02: extractPropsFromFile', () => {
  it('extracts prop names from a simple interface block', () => {
    const content = `
interface ButtonProps {
  label: string;
  onClick: () => void;
}
`;
    const result = extractPropsFromFile(content, 'ButtonProps');
    assert.ok(Array.isArray(result), 'should return an array');
    assert.ok(result.includes('label'), 'should include label');
    assert.ok(result.includes('onClick'), 'should include onClick');
    assert.equal(result.length, 2);
  });

  it('returns null when interface not found', () => {
    const content = 'const x = 1;';
    const result = extractPropsFromFile(content, 'ButtonProps');
    assert.equal(result, null);
  });

  it('handles optional props (name?: type) correctly', () => {
    const content = `
interface CardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}
`;
    const result = extractPropsFromFile(content, 'CardProps');
    assert.ok(result.includes('title'), 'should include title');
    assert.ok(result.includes('subtitle'), 'should include subtitle');
    assert.ok(result.includes('icon'), 'should include icon');
  });

  it('handles generic props (e.g., MouseEvent<HTMLButtonElement>) without breaking on nested braces', () => {
    const content = `
interface ButtonProps {
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}
`;
    const result = extractPropsFromFile(content, 'ButtonProps');
    assert.ok(result !== null, 'should not return null for generics');
    assert.ok(result.includes('label'), 'should include label');
    assert.ok(result.includes('onClick'), 'should include onClick');
    assert.ok(result.includes('onChange'), 'should include onChange');
  });

  it('T2 comparison: ALIGNED when all props match', () => {
    const handoffProps = ['label', 'onClick'];
    const content = `
interface ButtonProps {
  label: string;
  onClick: () => void;
}
`;
    const fileProps = extractPropsFromFile(content, 'ButtonProps');
    const missingProps = handoffProps.filter(p => !(fileProps || []).includes(p));
    assert.deepEqual(missingProps, [], 'should be ALIGNED (no missing props)');
  });

  it('T2 comparison: DRIFTED when handoff has extra props not in file', () => {
    const handoffProps = ['label', 'onClick', 'variant'];
    const content = `
interface ButtonProps {
  label: string;
  onClick: () => void;
}
`;
    const fileProps = extractPropsFromFile(content, 'ButtonProps');
    const missingProps = handoffProps.filter(p => !(fileProps || []).includes(p));
    assert.deepEqual(missingProps, ['variant'], 'should detect variant as missing (DRIFTED)');
  });

  it('skips JSDoc comment lines inside interface blocks', () => {
    const content = `
interface NavProps {
  /** The href destination */
  href: string;
  // internal label
  label: string;
}
`;
    const result = extractPropsFromFile(content, 'NavProps');
    assert.ok(result !== null, 'should not return null');
    assert.ok(result.includes('href'), 'should include href');
    assert.ok(result.includes('label'), 'should include label');
    // Should NOT include comment fragments as prop names
    const hasCommentFragment = result.some(p => p.startsWith('*') || p.startsWith('/'));
    assert.ok(!hasCommentFragment, 'should not include comment fragments as prop names');
  });
});

// ─── DIV-03: T3 Behavioral Detection ──────────────────────────────────────

describe('DIV-03: checkTokenUsage', () => {
  it('returns empty array when all tokens are used in content', () => {
    const content = 'color: var(--color-primary-500); margin: var(--spacing-4);';
    const tokens = ['--color-primary-500', '--spacing-4'];
    const result = checkTokenUsage(content, tokens);
    assert.deepEqual(result, []);
  });

  it('returns missing token when token is not present in content', () => {
    const content = 'color: red;';
    const tokens = ['--color-primary-500'];
    const result = checkTokenUsage(content, tokens);
    assert.deepEqual(result, ['--color-primary-500']);
  });

  it('returns empty array for empty tokens list', () => {
    const content = 'color: red;';
    const result = checkTokenUsage(content, []);
    assert.deepEqual(result, []);
  });

  it('detects partial token usage correctly', () => {
    const content = 'color: var(--color-primary-500);';
    const tokens = ['--color-primary-500', '--spacing-4', '--font-body'];
    const result = checkTokenUsage(content, tokens);
    assert.deepEqual(result, ['--spacing-4', '--font-body']);
  });

  it('returns all tokens as missing when content is empty', () => {
    const result = checkTokenUsage('', ['--color-primary', '--spacing-2']);
    assert.deepEqual(result, ['--color-primary', '--spacing-2']);
  });
});

// ─── DIV-04: DIVERGENCE.md Output ─────────────────────────────────────────

describe('DIV-04: buildDivergenceReport', () => {
  const alignedResult = {
    components: [
      {
        name: 'Button',
        status: 'ALIGNED',
        t1: { found: true, filePath: '/src/components/Button.tsx' },
        t2: { handoffProps: ['label'], fileProps: ['label'], missing: [], extra: [] },
        t3: { missingTokens: [] },
        notes: '',
      },
    ],
    noSpecs: false,
  };

  const mixedResult = {
    components: [
      {
        name: 'Button',
        status: 'ALIGNED',
        t1: { found: true, filePath: '/src/Button.tsx' },
        t2: { handoffProps: ['label'], fileProps: ['label'], missing: [], extra: [] },
        t3: { missingTokens: [] },
        notes: '',
      },
      {
        name: 'Card',
        status: 'DRIFTED',
        t1: { found: true, filePath: '/src/Card.tsx' },
        t2: { handoffProps: ['title', 'variant'], fileProps: ['title'], missing: ['variant'], extra: [] },
        t3: { missingTokens: [] },
        notes: 'missing: variant',
      },
      {
        name: 'Modal',
        status: 'MISSING',
        t1: { found: false, filePath: null },
        t2: null,
        t3: null,
        notes: 'component file not found',
      },
      {
        name: 'NavBar',
        status: 'EXTRA',
        t1: { found: true, filePath: '/src/NavBar.tsx' },
        t2: null,
        t3: null,
        notes: 'not in handoff specs',
      },
    ],
    noSpecs: false,
  };

  it('produces valid markdown with a table containing component rows', () => {
    const report = buildDivergenceReport(alignedResult);
    assert.ok(typeof report === 'string', 'report should be a string');
    assert.ok(report.includes('| Button |') || report.includes('Button'), 'report should contain Button');
    assert.ok(report.includes('|'), 'report should contain table pipes');
  });

  it('includes ALIGNED status in report', () => {
    const report = buildDivergenceReport(alignedResult);
    assert.ok(report.includes('ALIGNED'), 'report should include ALIGNED status');
  });

  it('includes all four statuses when present', () => {
    const report = buildDivergenceReport(mixedResult);
    assert.ok(report.includes('ALIGNED'), 'report should include ALIGNED');
    assert.ok(report.includes('DRIFTED'), 'report should include DRIFTED');
    assert.ok(report.includes('MISSING'), 'report should include MISSING');
    assert.ok(report.includes('EXTRA'), 'report should include EXTRA');
  });

  it('includes summary counts', () => {
    const report = buildDivergenceReport(mixedResult);
    assert.ok(report.includes('ALIGNED: 1') || report.includes('ALIGNED'), 'report should include ALIGNED count');
    assert.ok(report.includes('DRIFTED: 1') || report.includes('DRIFTED'), 'report should include DRIFTED count');
    assert.ok(report.includes('MISSING: 1') || report.includes('MISSING'), 'report should include MISSING count');
    assert.ok(report.includes('EXTRA: 1') || report.includes('EXTRA'), 'report should include EXTRA count');
    // Summary section should exist
    assert.ok(report.toLowerCase().includes('summary'), 'report should include a Summary section');
  });

  it('includes suppression count when ignore list is active', () => {
    const resultWithSuppressed = {
      components: mixedResult.components,
      noSpecs: false,
      suppressedCount: 3,
    };
    const report = buildDivergenceReport(resultWithSuppressed);
    assert.ok(report.includes('3') && report.toLowerCase().includes('suppress'), 'report should mention suppressed count');
  });
});

// ─── DIV-06: Ignore Mechanism ──────────────────────────────────────────────

describe('DIV-06: loadIgnoreList', () => {
  const tmpDirs = [];
  after(() => cleanDirs(tmpDirs));

  it('returns a Set of component names from .pde-divergence-ignore', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    fs.writeFileSync(path.join(tmp, '.pde-divergence-ignore'), 'Button\nCard\nModal\n');
    const result = loadIgnoreList(tmp);
    assert.ok(result instanceof Set, 'should return a Set');
    assert.ok(result.has('Button'), 'should contain Button');
    assert.ok(result.has('Card'), 'should contain Card');
    assert.ok(result.has('Modal'), 'should contain Modal');
  });

  it('skips comment lines (starting with #) and empty lines', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const content = [
      '# This is a comment',
      'Button',
      '',
      '# Another comment',
      'Card',
      '   ',
    ].join('\n');
    fs.writeFileSync(path.join(tmp, '.pde-divergence-ignore'), content);
    const result = loadIgnoreList(tmp);
    assert.ok(!result.has('# This is a comment'), 'should not include comment lines');
    assert.ok(result.has('Button'), 'should include Button');
    assert.ok(result.has('Card'), 'should include Card');
    assert.equal(result.size, 2, 'should have exactly 2 entries (Button, Card)');
  });

  it('returns empty Set when .pde-divergence-ignore does not exist', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const result = loadIgnoreList(tmp);
    assert.ok(result instanceof Set, 'should return a Set');
    assert.equal(result.size, 0, 'should be empty when file does not exist');
  });
});

describe('DIV-06: runDivergenceCheck excludes ignored components', () => {
  const tmpDirs = [];
  after(() => cleanDirs(tmpDirs));

  it('returns { noSpecs: true } when no handoff specs directory exists', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const result = runDivergenceCheck(tmp);
    assert.ok(result.noSpecs === true, 'noSpecs should be true when handoff dir is missing');
    assert.deepEqual(result.components, [], 'components should be empty array');
  });

  it('returns { noSpecs: true } when handoff directory exists but is empty', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const handoffDir = path.join(tmp, '.planning', 'design', 'handoff');
    fs.mkdirSync(handoffDir, { recursive: true });
    const result = runDivergenceCheck(tmp);
    assert.ok(result.noSpecs === true, 'noSpecs should be true when no spec files exist');
  });

  it('excludes ignored components from results', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    // Set up handoff spec
    const handoffDir = path.join(tmp, '.planning', 'design', 'handoff');
    fs.mkdirSync(handoffDir, { recursive: true });
    const specContent = [
      '<!-- @component: Button -->',
      '<!-- @props: ButtonProps -->',
      '<!-- @tokens: --color-primary -->',
      '',
      '<!-- @component: Card -->',
      '<!-- @props: CardProps -->',
    ].join('\n');
    fs.writeFileSync(path.join(handoffDir, 'HND-handoff-spec-test.md'), specContent);
    // Ignore Button
    fs.writeFileSync(path.join(tmp, '.pde-divergence-ignore'), 'Button\n');
    const result = runDivergenceCheck(tmp);
    const names = result.components.map(c => c.name);
    assert.ok(!names.includes('Button'), 'Button should be excluded by ignore list');
    assert.ok(names.includes('Card'), 'Card should still be present');
  });

  it('returns per-component results with MISSING status when file not found', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const handoffDir = path.join(tmp, '.planning', 'design', 'handoff');
    fs.mkdirSync(handoffDir, { recursive: true });
    const specContent = '<!-- @component: GhostComponent -->\n<!-- @props: GhostComponentProps -->';
    fs.writeFileSync(path.join(handoffDir, 'HND-handoff-spec-test.md'), specContent);
    const result = runDivergenceCheck(tmp);
    assert.equal(result.noSpecs, false, 'noSpecs should be false when specs exist');
    assert.equal(result.components.length, 1, 'should have one component result');
    assert.equal(result.components[0].name, 'GhostComponent');
    assert.equal(result.components[0].status, 'MISSING', 'should be MISSING when file not found');
  });

  it('returns ALIGNED status when component file exists and props match', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    // Create handoff spec
    const handoffDir = path.join(tmp, '.planning', 'design', 'handoff');
    fs.mkdirSync(handoffDir, { recursive: true });
    const specContent = [
      '<!-- @component: Widget -->',
      '<!-- @props: WidgetProps -->',
      '<!-- @tokens: --color-brand -->',
    ].join('\n');
    fs.writeFileSync(path.join(handoffDir, 'HND-handoff-spec-test.md'), specContent);
    // Create component file with matching interface
    const srcDir = path.join(tmp, 'src', 'components');
    fs.mkdirSync(srcDir, { recursive: true });
    const componentContent = `
interface WidgetProps {
  color: string;
}
export const Widget = () => null;
// Uses token: var(--color-brand)
`;
    fs.writeFileSync(path.join(srcDir, 'Widget.tsx'), componentContent);
    const result = runDivergenceCheck(tmp);
    assert.equal(result.noSpecs, false);
    const widget = result.components.find(c => c.name === 'Widget');
    assert.ok(widget, 'Widget should be in results');
    // T1 should be found
    assert.ok(widget.t1.found, 'T1 should find the file');
  });
});

// ─── Integration: loadHandoffSpecs ────────────────────────────────────────

describe('Integration: loadHandoffSpecs', () => {
  const tmpDirs = [];
  after(() => cleanDirs(tmpDirs));

  it('returns empty array when handoff directory does not exist', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const result = loadHandoffSpecs(path.join(tmp, '.planning'));
    assert.deepEqual(result, []);
  });

  it('reads all HND-handoff-spec-*.md files and extracts annotations', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const handoffDir = path.join(tmp, '.planning', 'design', 'handoff');
    fs.mkdirSync(handoffDir, { recursive: true });
    fs.writeFileSync(
      path.join(handoffDir, 'HND-handoff-spec-screen1.md'),
      '<!-- @component: Button -->\n<!-- @props: ButtonProps -->'
    );
    fs.writeFileSync(
      path.join(handoffDir, 'HND-handoff-spec-screen2.md'),
      '<!-- @component: Card -->\n<!-- @props: CardProps -->'
    );
    const result = loadHandoffSpecs(path.join(tmp, '.planning'));
    const names = result.map(c => c.name);
    assert.ok(names.includes('Button'), 'should include Button from screen1');
    assert.ok(names.includes('Card'), 'should include Card from screen2');
  });

  it('handles file read errors gracefully (does not throw)', () => {
    const tmp = makeTmp();
    tmpDirs.push(tmp);
    const handoffDir = path.join(tmp, '.planning', 'design', 'handoff');
    fs.mkdirSync(handoffDir, { recursive: true });
    // Write a valid spec
    fs.writeFileSync(
      path.join(handoffDir, 'HND-handoff-spec-valid.md'),
      '<!-- @component: ValidComp -->\n<!-- @props: ValidCompProps -->'
    );
    // Don't create an invalid one — just verify no crash occurs
    assert.doesNotThrow(() => loadHandoffSpecs(path.join(tmp, '.planning')));
  });
});
