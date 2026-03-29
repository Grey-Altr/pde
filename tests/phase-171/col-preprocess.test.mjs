/**
 * tests/phase-171/col-preprocess.test.mjs
 * Tests for preprocessHelpText in bin/lib/app-discovery.cjs (DISC-04)
 *
 * All subprocess calls are mocked via dependency injection (_fns).
 * No real col binary invocation.
 */

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let mod;

// Load the CJS module
try {
  mod = require('../../bin/lib/app-discovery.cjs');
} catch (_) {
  mod = null;
}

// ---------------------------------------------------------------------------
// preprocessHelpText
// ---------------------------------------------------------------------------
describe('preprocessHelpText', () => {
  it('returns clean text unchanged with parseQuality clean', () => {
    const result = mod.preprocessHelpText('Usage: blender [options]', {
      spawnFn: vi.fn(),
    });
    expect(result).toEqual({ text: 'Usage: blender [options]', parseQuality: 'clean' });
  });

  it('strips backspaces via col -b and returns parseQuality degraded', () => {
    const rawText = 'N\x08Name\x08e';
    const spawnFn = vi.fn().mockReturnValue({
      stdout: 'Name',
      stderr: '',
      status: 0,
      error: null,
    });
    const result = mod.preprocessHelpText(rawText, { spawnFn });
    expect(result.text).toBe('Name');
    expect(result.parseQuality).toBe('degraded');
    expect(spawnFn).toHaveBeenCalledWith('col', ['-b'], expect.objectContaining({
      input: rawText,
      encoding: 'utf8',
    }));
  });

  it('uses regex fallback when col -b fails (ENOENT)', () => {
    const rawText = 'H\x08He\x08el\x08lp\x08p';
    const spawnFn = vi.fn().mockReturnValue({
      stdout: '',
      stderr: '',
      status: null,
      error: { code: 'ENOENT' },
    });
    const result = mod.preprocessHelpText(rawText, { spawnFn });
    expect(result.text).toBe('Help');
    expect(result.parseQuality).toBe('degraded');
  });

  it('regex fallback correctly decodes bold man-page encoding', () => {
    // Bold encoding: each char is X-backspace-X (e.g., N\x08N A\x08A M\x08M E\x08E)
    const rawText = 'N\x08NA\x08AM\x08ME\x08E';
    const spawnFn = vi.fn().mockReturnValue({
      stdout: '',
      stderr: '',
      status: null,
      error: { code: 'ENOENT' },
    });
    const result = mod.preprocessHelpText(rawText, { spawnFn });
    expect(result.text).toBe('NAME');
    expect(result.parseQuality).toBe('degraded');
  });
});
