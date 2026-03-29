/**
 * tests/phase-173/server-gen-python.test.mjs
 * TDD tests for server-gen.cjs pip module handler (REG-03)
 *
 * Tests: validateModuleName, generatePythonModuleHandler
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateModuleName, generatePythonModuleHandler } = require('../../bin/lib/cli-anything/server-gen.cjs');

// ─── validateModuleName tests ─────────────────────────────────────────────────

describe('validateModuleName', () => {
  it('does not throw for valid module name: rembg', () => {
    expect(() => validateModuleName('rembg')).not.toThrow();
  });

  it('does not throw for valid module name with hyphen: imageio-ffmpeg', () => {
    expect(() => validateModuleName('imageio-ffmpeg')).not.toThrow();
  });

  it('does not throw for valid module name with underscore: torch_utils', () => {
    expect(() => validateModuleName('torch_utils')).not.toThrow();
  });

  it('throws with "Invalid pip module name" for shell injection: rembg; echo pwned', () => {
    expect(() => validateModuleName('rembg; echo pwned')).toThrow('Invalid pip module name');
  });

  it('throws with "Invalid pip module name" for path traversal: ../etc/passwd', () => {
    expect(() => validateModuleName('../etc/passwd')).toThrow('Invalid pip module name');
  });

  it('throws with "Invalid pip module name" for command substitution: $(whoami)', () => {
    expect(() => validateModuleName('$(whoami)')).toThrow('Invalid pip module name');
  });

  it('throws with "moduleName must be a non-empty string" for empty string', () => {
    expect(() => validateModuleName('')).toThrow('moduleName must be a non-empty string');
  });

  it('throws with "moduleName must be a non-empty string" for non-string (number 123)', () => {
    expect(() => validateModuleName(123)).toThrow('moduleName must be a non-empty string');
  });
});

// ─── generatePythonModuleHandler tests ───────────────────────────────────────

describe('generatePythonModuleHandler', () => {
  it('returns a string containing spawnSync with python3 -m argument array', () => {
    const cap = { name: 'remove_bg', description: 'Remove background from image' };
    const handler = generatePythonModuleHandler('rembg', cap);

    expect(typeof handler).toBe('string');
    expect(handler).toContain("spawnSync('python3',");
    expect(handler).toContain("'-m'");
    expect(handler).toContain('"rembg"');
  });

  it('output does NOT contain BINARY constant reference', () => {
    const cap = { name: 'remove_bg', description: 'Remove background' };
    const handler = generatePythonModuleHandler('rembg', cap);

    expect(handler).not.toContain('BINARY');
  });

  it('output contains DRY_RUN check', () => {
    const cap = { name: 'remove_bg', description: 'Remove background' };
    const handler = generatePythonModuleHandler('rembg', cap);

    expect(handler).toContain('DRY_RUN');
  });

  it('uses argument array — no shell string concatenation for module name', () => {
    const cap = { name: 'remove_bg', description: 'Remove background' };
    const handler = generatePythonModuleHandler('rembg', cap);

    // Argument array: ['-m', 'rembg', ...args] not shell string concatenation
    expect(handler).toMatch(/\['-m',\s*"rembg"/);
  });

  it('embeds module name as string literal (not variable reference)', () => {
    const cap = { name: 'remove_bg', description: 'Remove background' };
    const handler = generatePythonModuleHandler('imageio-ffmpeg', cap);

    expect(handler).toContain('"imageio-ffmpeg"');
  });

  it('throws when moduleName contains shell metacharacters (security check)', () => {
    const cap = { name: 'remove_bg', description: 'Remove background' };

    expect(() => generatePythonModuleHandler('rembg; rm -rf /', cap)).toThrow('Invalid pip module name');
  });
});
