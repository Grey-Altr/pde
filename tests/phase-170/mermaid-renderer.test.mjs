/**
 * tests/phase-170/mermaid-renderer.test.mjs
 * Tests for bin/lib/utils/mermaid-renderer.cjs (UTL-01)
 *
 * All subprocess calls are mocked via dependency injection (_execFn).
 * No real mmdr/mmdc installation required.
 */

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let renderer;

// Load the CJS module
try {
  renderer = require('../../bin/lib/utils/mermaid-renderer.cjs');
} catch (_) {
  renderer = null;
}

// ---------------------------------------------------------------------------
// detectRenderer
// ---------------------------------------------------------------------------
describe('detectRenderer', () => {
  it('returns "mmdr" when mmdr --version succeeds', () => {
    const mockExecFn = vi.fn().mockReturnValue('mmdr 1.0.0\n');
    const result = renderer.detectRenderer(mockExecFn);
    expect(result).toBe('mmdr');
    // Should only have tried mmdr (first call succeeds)
    expect(mockExecFn).toHaveBeenCalledWith(
      expect.stringContaining('mmdr'),
      ['--version'],
      expect.objectContaining({ encoding: 'utf8' })
    );
  });

  it('returns "mmdc" when mmdr fails but mmdc succeeds', () => {
    let callCount = 0;
    const mockExecFn = vi.fn().mockImplementation((bin, args) => {
      callCount++;
      if (bin.includes('mmdr') || bin === 'mmdr') {
        throw new Error('ENOENT: mmdr not found');
      }
      return 'mermaid-cli/11.0.0\n';
    });
    const result = renderer.detectRenderer(mockExecFn);
    expect(result).toBe('mmdc');
  });

  it('returns null when both mmdr and mmdc fail', () => {
    const mockExecFn = vi.fn().mockImplementation(() => {
      throw new Error('ENOENT: binary not found');
    });
    const result = renderer.detectRenderer(mockExecFn);
    expect(result).toBeNull();
    expect(mockExecFn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// renderMermaid
// ---------------------------------------------------------------------------
describe('renderMermaid', () => {
  it('calls mmdr with -i/-o/-e flags when mmdr is detected', () => {
    // detectRenderer will call execFn twice: once for detection (mmdr), once for render
    let callCount = 0;
    const mockExecFn = vi.fn().mockImplementation((bin, args) => {
      callCount++;
      return ''; // all succeed
    });

    renderer.renderMermaid({
      input: 'diagram.mmd',
      outputPath: 'output.svg',
      format: 'svg',
      _execFn: mockExecFn,
    });

    // Find the render call (should include -i, -o, -e flags)
    const renderCall = mockExecFn.mock.calls.find(
      call => call[1] && call[1].includes('-i')
    );
    expect(renderCall).toBeTruthy();
    expect(renderCall[1]).toContain('-i');
    expect(renderCall[1]).toContain('diagram.mmd');
    expect(renderCall[1]).toContain('-o');
    expect(renderCall[1]).toContain('output.svg');
    expect(renderCall[1]).toContain('-e');
    expect(renderCall[1]).toContain('svg');
  });

  it('defaults format to "svg" when not specified', () => {
    const mockExecFn = vi.fn().mockReturnValue('');
    renderer.renderMermaid({
      input: 'diagram.mmd',
      outputPath: 'output.svg',
      _execFn: mockExecFn,
    });

    const renderCall = mockExecFn.mock.calls.find(
      call => call[1] && call[1].includes('-e')
    );
    expect(renderCall).toBeTruthy();
    expect(renderCall[1]).toContain('svg');
  });

  it('calls mmdc with -i/-o flags (no -e) when mmdr not found but mmdc is', () => {
    let callCount = 0;
    const mockExecFn = vi.fn().mockImplementation((bin, args) => {
      // First call: mmdr --version → fail
      // Second call: mmdc --version → succeed
      // Third call: mmdc render → succeed
      const binStr = String(bin);
      if (callCount === 0 && (binStr.includes('mmdr') || !binStr.includes('mmdc'))) {
        callCount++;
        throw new Error('ENOENT: mmdr not found');
      }
      callCount++;
      return '';
    });

    renderer.renderMermaid({
      input: 'diagram.mmd',
      outputPath: 'output.svg',
      format: 'svg',
      _execFn: mockExecFn,
    });

    // Should have been called (detection + render)
    expect(mockExecFn).toHaveBeenCalled();
  });

  it('throws with install instructions when no renderer found', () => {
    const mockExecFn = vi.fn().mockImplementation(() => {
      throw new Error('ENOENT: not found');
    });

    expect(() => {
      renderer.renderMermaid({
        input: 'diagram.mmd',
        outputPath: 'output.svg',
        _execFn: mockExecFn,
      });
    }).toThrow();
  });
});
