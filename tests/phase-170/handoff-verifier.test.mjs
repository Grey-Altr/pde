/**
 * tests/phase-170/handoff-verifier.test.mjs
 * Tests for bin/lib/utils/handoff-verifier.cjs (UTL-07, UTL-08)
 *
 * All FS and subprocess calls are mocked via dependency injection.
 * No real files or grep binary access required.
 */

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const handoffVerifier = require('../../bin/lib/utils/handoff-verifier.cjs');
const { parseHandoffSpec, searchForExport, verifyHandoff, findLatestHandoffSpec } = handoffVerifier;

// ---------------------------------------------------------------------------
// Sample fixture data
// ---------------------------------------------------------------------------

const SAMPLE_SPEC = `# Handoff Spec

## Component API

| Component | Props | File |
|-----------|-------|------|
| Button | variant, size, disabled | src/components/Button.tsx |
| Card | title, children | src/components/Card.tsx |
| Modal | isOpen, onClose, title | src/components/Modal.tsx |
`;

// ---------------------------------------------------------------------------
// parseHandoffSpec
// ---------------------------------------------------------------------------

describe('parseHandoffSpec', () => {
  it('extracts component array from markdown table', () => {
    const result = parseHandoffSpec(SAMPLE_SPEC);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  it('extracts component name, props, and file from each row', () => {
    const result = parseHandoffSpec(SAMPLE_SPEC);

    expect(result[0]).toMatchObject({
      component: 'Button',
      props: 'variant, size, disabled',
      file: 'src/components/Button.tsx',
    });
    expect(result[1]).toMatchObject({
      component: 'Card',
      props: 'title, children',
      file: 'src/components/Card.tsx',
    });
  });

  it('handles extra whitespace around pipe characters', () => {
    const spec = `| Component | Props | File |
|-----------|-------|------|
|  MyComp  |  propA  |  src/MyComp.tsx  |`;

    const result = parseHandoffSpec(spec);
    expect(result.length).toBe(1);
    expect(result[0].component).toBe('MyComp');
    expect(result[0].props).toBe('propA');
    expect(result[0].file).toBe('src/MyComp.tsx');
  });

  it('skips separator rows (|---|)', () => {
    const result = parseHandoffSpec(SAMPLE_SPEC);
    // Should only have data rows, not separator
    const hasSeparator = result.some(r => r.component && r.component.includes('---'));
    expect(hasSeparator).toBe(false);
  });

  it('skips header row', () => {
    const result = parseHandoffSpec(SAMPLE_SPEC);
    const hasHeader = result.some(r => r.component === 'Component');
    expect(hasHeader).toBe(false);
  });

  it('returns empty array when no table rows found', () => {
    const noTable = '# No table here\n\nJust some text.';
    const result = parseHandoffSpec(noTable);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// searchForExport
// ---------------------------------------------------------------------------

describe('searchForExport', () => {
  it('returns array of file paths when grep finds matches', () => {
    const mockExecFn = vi.fn().mockReturnValue('src/components/Button.tsx\nsrc/index.ts\n');

    const result = searchForExport('Button', 'src', mockExecFn);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain('src/components/Button.tsx');
    expect(result).toContain('src/index.ts');
  });

  it('returns empty array when grep exits 1 (no matches)', () => {
    const mockExecFn = vi.fn().mockImplementation(() => {
      const err = new Error('grep: no matches');
      err.status = 1;
      throw err;
    });

    const result = searchForExport('NonExistentComponent', 'src', mockExecFn);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('returns empty array when grep throws any error', () => {
    const mockExecFn = vi.fn().mockImplementation(() => {
      throw new Error('ENOENT: directory not found');
    });

    const result = searchForExport('Button', 'nonexistent', mockExecFn);

    expect(result).toEqual([]);
  });

  it('calls grep with correct arguments', () => {
    const mockExecFn = vi.fn().mockReturnValue('src/Button.tsx\n');

    searchForExport('MyComponent', 'src/', mockExecFn);

    expect(mockExecFn).toHaveBeenCalledTimes(1);
    const [cmd, args] = mockExecFn.mock.calls[0];
    expect(cmd).toBe('grep');
    expect(args).toContain('-r');
    expect(args).toContain('-l');
    expect(args.some(a => a.includes('MyComponent'))).toBe(true);
    expect(args[args.length - 1]).toBe('src/');
  });

  it('filters empty strings from results', () => {
    const mockExecFn = vi.fn().mockReturnValue('src/Button.tsx\n\n');
    const result = searchForExport('Button', 'src', mockExecFn);
    expect(result.every(p => p.length > 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// verifyHandoff
// ---------------------------------------------------------------------------

describe('verifyHandoff', () => {
  it('returns no-spec status when _readFn throws ENOENT', () => {
    const mockReadFn = vi.fn().mockImplementation(() => {
      const err = new Error('ENOENT: no such file or directory');
      err.code = 'ENOENT';
      throw err;
    });

    const result = verifyHandoff({
      specPath: '/nonexistent/spec.md',
      srcDir: 'src',
      _readFn: mockReadFn,
      _execFn: vi.fn(),
    });

    expect(result.status).toBe('no-spec');
    expect(result.message).toContain('/pde:handoff');
  });

  it('marks components as matched when grep finds export', () => {
    const mockReadFn = vi.fn().mockReturnValue(SAMPLE_SPEC);
    const mockExecFn = vi.fn().mockReturnValue('src/components/Button.tsx\n');

    const result = verifyHandoff({
      specPath: '/some/spec.md',
      srcDir: 'src',
      _readFn: mockReadFn,
      _execFn: mockExecFn,
    });

    expect(result.status).toBe('complete');
    const buttonGap = result.gaps.find(g => g.component === 'Button');
    expect(buttonGap).toBeDefined();
    expect(buttonGap.gapType).toBe('matched');
  });

  it('marks components as missing when grep returns empty', () => {
    const mockReadFn = vi.fn().mockReturnValue(SAMPLE_SPEC);
    const mockExecFn = vi.fn().mockImplementation(() => {
      throw new Error('no matches');
    });

    const result = verifyHandoff({
      specPath: '/some/spec.md',
      srcDir: 'src',
      _readFn: mockReadFn,
      _execFn: mockExecFn,
    });

    expect(result.status).toBe('complete');
    result.gaps.forEach(gap => {
      expect(gap.gapType).toBe('missing');
    });
  });

  it('returns complete status with gaps array and markdown and stats', () => {
    const mockReadFn = vi.fn().mockReturnValue(SAMPLE_SPEC);
    // Button found, Card and Modal missing
    const mockExecFn = vi.fn().mockImplementation((cmd, args) => {
      if (args.some(a => a.includes('Button'))) return 'src/Button.tsx\n';
      throw new Error('no matches');
    });

    const result = verifyHandoff({
      specPath: '/some/spec.md',
      srcDir: 'src',
      _readFn: mockReadFn,
      _execFn: mockExecFn,
    });

    expect(result.status).toBe('complete');
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(result.gaps.length).toBe(3);
    expect(typeof result.markdown).toBe('string');
    expect(result.stats).toMatchObject({
      total: 3,
      matched: 1,
      missing: 2,
    });
  });

  it('gap report markdown contains required table header columns', () => {
    const mockReadFn = vi.fn().mockReturnValue(SAMPLE_SPEC);
    const mockExecFn = vi.fn().mockReturnValue('src/Button.tsx\n');

    const result = verifyHandoff({
      specPath: '/some/spec.md',
      srcDir: 'src',
      _readFn: mockReadFn,
      _execFn: mockExecFn,
    });

    expect(result.markdown).toContain('Component');
    expect(result.markdown).toContain('Spec Status');
    expect(result.markdown).toContain('Code Status');
    expect(result.markdown).toContain('Gap Type');
  });

  it('gap report includes each component name', () => {
    const mockReadFn = vi.fn().mockReturnValue(SAMPLE_SPEC);
    const mockExecFn = vi.fn().mockReturnValue('src/Button.tsx\n');

    const result = verifyHandoff({
      specPath: '/some/spec.md',
      srcDir: 'src',
      _readFn: mockReadFn,
      _execFn: mockExecFn,
    });

    expect(result.markdown).toContain('Button');
    expect(result.markdown).toContain('Card');
    expect(result.markdown).toContain('Modal');
  });

  it('gap structures contain required fields', () => {
    const mockReadFn = vi.fn().mockReturnValue(SAMPLE_SPEC);
    const mockExecFn = vi.fn().mockReturnValue('');

    const result = verifyHandoff({
      specPath: '/some/spec.md',
      srcDir: 'src',
      _readFn: mockReadFn,
      _execFn: mockExecFn,
    });

    for (const gap of result.gaps) {
      expect(gap).toHaveProperty('component');
      expect(gap).toHaveProperty('specStatus');
      expect(gap).toHaveProperty('codeStatus');
      expect(gap).toHaveProperty('gapType');
      expect(gap).toHaveProperty('files');
    }
  });
});

// ---------------------------------------------------------------------------
// findLatestHandoffSpec
// ---------------------------------------------------------------------------

describe('findLatestHandoffSpec', () => {
  it('returns path to highest version when multiple spec files exist', () => {
    const mockReaddir = vi.fn().mockReturnValue([
      'HND-handoff-spec-v1.md',
      'HND-handoff-spec-v3.md',
      'HND-handoff-spec-v2.md',
      'other-file.md',
    ]);

    const result = findLatestHandoffSpec('/some/design/handoff', mockReaddir);

    expect(result).not.toBeNull();
    expect(result).toContain('HND-handoff-spec-v3.md');
  });

  it('returns null when no handoff spec files exist', () => {
    const mockReaddir = vi.fn().mockReturnValue(['other-file.md']);

    const result = findLatestHandoffSpec('/some/design/handoff', mockReaddir);

    expect(result).toBeNull();
  });

  it('returns null when directory is empty', () => {
    const mockReaddir = vi.fn().mockReturnValue([]);

    const result = findLatestHandoffSpec('/some/design/handoff', mockReaddir);

    expect(result).toBeNull();
  });

  it('returns null when _readdirFn throws (no directory)', () => {
    const mockReaddir = vi.fn().mockImplementation(() => {
      const err = new Error('ENOENT');
      err.code = 'ENOENT';
      throw err;
    });

    const result = findLatestHandoffSpec('/nonexistent', mockReaddir);

    expect(result).toBeNull();
  });

  it('includes the design directory in the returned path', () => {
    const mockReaddir = vi.fn().mockReturnValue(['HND-handoff-spec-v1.md']);

    const result = findLatestHandoffSpec('/custom/design/handoff', mockReaddir);

    expect(result).toContain('/custom/design/handoff');
  });
});
