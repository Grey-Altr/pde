/**
 * tests/phase-172/gimp-wrapper.test.mjs
 * Tests for bin/lib/app-wrappers/gimp-wrapper.cjs (WRAP-02 / WRAP-04 / WRAP-06)
 *
 * Covers version-conditional Script-Fu invocation (GIMP 2.x vs 3.x).
 * See 172-RESEARCH.md Pattern 5 for verified API details.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const gimpWrapper = require(path.join(__dirname, '../../bin/lib/app-wrappers/gimp-wrapper.cjs'));
const { validateCapabilityModel } = require(path.join(__dirname, '../../bin/lib/cli-anything/model.cjs'));

const mockEntry2x = {
  slug: 'gimp',
  binaryPath: '/usr/bin/gimp',
  version: 'GIMP 2.10.38',
  executionMode: 'headless',
  status: 'approved',
  displayProbe: { available: true, method: 'WindowServer' },
};

const mockEntry3x = {
  slug: 'gimp',
  binaryPath: '/usr/bin/gimp-3.0',
  version: 'GNU Image Manipulation Program version 3.0.2',
  executionMode: 'headless',
  status: 'approved',
  displayProbe: { available: true, method: 'WindowServer' },
};

describe('parseMajorVersion', () => {
  it('parseMajorVersion("GIMP 2.10.38") returns 2', () => {
    expect(gimpWrapper.parseMajorVersion('GIMP 2.10.38')).toBe(2);
  });

  it('parseMajorVersion("GNU Image Manipulation Program version 3.0.2") returns 3', () => {
    expect(gimpWrapper.parseMajorVersion('GNU Image Manipulation Program version 3.0.2')).toBe(3);
  });

  it('parseMajorVersion(null) returns null', () => {
    expect(gimpWrapper.parseMajorVersion(null)).toBe(null);
  });

  it('parseMajorVersion(undefined) returns null', () => {
    expect(gimpWrapper.parseMajorVersion(undefined)).toBe(null);
  });
});

describe('buildGimpArgs', () => {
  it('GIMP 2.x: includes --batch with (gimp-quit 0) and does NOT include --quit', () => {
    const args = gimpWrapper.buildGimpArgs('(some-script)', mockEntry2x);
    const joined = args.join(' ');
    expect(joined).toContain('(gimp-quit 0)');
    // --quit should not be a standalone arg for 2.x
    expect(args).not.toContain('--quit');
  });

  it('GIMP 3.x: includes --quit flag and does NOT include (gimp-quit 0)', () => {
    const args = gimpWrapper.buildGimpArgs('(some-script)', mockEntry3x);
    expect(args).toContain('--quit');
    const joined = args.join(' ');
    expect(joined).not.toContain('(gimp-quit 0)');
  });

  it('both versions include --no-interface flag', () => {
    const args2x = gimpWrapper.buildGimpArgs('(some-script)', mockEntry2x);
    const args3x = gimpWrapper.buildGimpArgs('(some-script)', mockEntry3x);
    expect(args2x).toContain('--no-interface');
    expect(args3x).toContain('--no-interface');
  });

  it('both versions include --batch with the scriptFu expression', () => {
    const expr = '(car (gimp-image-list))';
    const args2x = gimpWrapper.buildGimpArgs(expr, mockEntry2x);
    const args3x = gimpWrapper.buildGimpArgs(expr, mockEntry3x);
    // --batch should precede the expr
    const batchIdx2x = args2x.indexOf('--batch');
    expect(batchIdx2x).toBeGreaterThanOrEqual(0);
    expect(args2x[batchIdx2x + 1]).toBe(expr);
    const batchIdx3x = args3x.indexOf('--batch');
    expect(batchIdx3x).toBeGreaterThanOrEqual(0);
    expect(args3x[batchIdx3x + 1]).toBe(expr);
  });
});

describe('getScriptFuTemplates', () => {
  it('GIMP 2.x file-load template uses 2-arg: (gimp-file-load RUN-NONINTERACTIVE "/path" "")', () => {
    const templates = gimpWrapper.getScriptFuTemplates(mockEntry2x);
    expect(templates.fileLoad).toContain('""');
    expect(templates.fileLoad).toContain('{inputPath}');
  });

  it('GIMP 3.x file-load template uses 1-arg: (gimp-file-load RUN-NONINTERACTIVE "/path")', () => {
    const templates = gimpWrapper.getScriptFuTemplates(mockEntry3x);
    expect(templates.fileLoad).not.toContain('""');
    expect(templates.fileLoad).toContain('{inputPath}');
  });

  it('GIMP 3.x export template uses gimp-file-export not file-png-save', () => {
    const templates = gimpWrapper.getScriptFuTemplates(mockEntry3x);
    expect(templates.fileExport).toContain('gimp-file-export');
    expect(templates.fileExport).not.toContain('file-png-save');
  });

  it('GIMP 2.x export template uses file-png-save not gimp-file-export', () => {
    const templates = gimpWrapper.getScriptFuTemplates(mockEntry2x);
    expect(templates.fileExport).toContain('file-png-save');
    expect(templates.fileExport).not.toContain('gimp-file-export');
  });

  it('GIMP 3.x drawable template uses (vector drawable)', () => {
    const templates = gimpWrapper.getScriptFuTemplates(mockEntry3x);
    expect(templates.drawableWrap).toContain('vector');
  });

  it('GIMP 2.x drawable template uses bare drawable', () => {
    const templates = gimpWrapper.getScriptFuTemplates(mockEntry2x);
    expect(templates.drawableWrap).toBe('drawable');
  });
});

describe('buildCapabilityModel', () => {
  it('GIMP 2.x: model meta.version contains "2"', () => {
    const model = gimpWrapper.buildCapabilityModel(mockEntry2x);
    expect(model.meta.version).toContain('2');
  });

  it('GIMP 3.x: model meta.version contains "3"', () => {
    const model = gimpWrapper.buildCapabilityModel(mockEntry3x);
    expect(model.meta.version).toContain('3');
  });

  it('capabilities include "batch" command with Script-Fu expression input', () => {
    const model = gimpWrapper.buildCapabilityModel(mockEntry2x);
    const batchCap = model.capabilities.find(c => c.name.includes('batch'));
    expect(batchCap).toBeDefined();
    expect(batchCap.inputSchema.properties).toHaveProperty('scriptFu');
  });

  it('capabilities include "file_convert" command', () => {
    const model = gimpWrapper.buildCapabilityModel(mockEntry2x);
    const convertCap = model.capabilities.find(c => c.name.includes('file_convert') || c.name.includes('convert'));
    expect(convertCap).toBeDefined();
  });

  it('validateCapabilityModel does not throw on GIMP 2.x model', () => {
    const model = gimpWrapper.buildCapabilityModel(mockEntry2x);
    expect(() => validateCapabilityModel(model)).not.toThrow();
  });

  it('validateCapabilityModel does not throw on GIMP 3.x model', () => {
    const model = gimpWrapper.buildCapabilityModel(mockEntry3x);
    expect(() => validateCapabilityModel(model)).not.toThrow();
  });
});

describe('getMetadata', () => {
  it('returns slug: "gimp"', () => {
    const meta = gimpWrapper.getMetadata(mockEntry2x);
    expect(meta.slug).toBe('gimp');
  });

  it('returns startupMs: 10000', () => {
    const meta = gimpWrapper.getMetadata(mockEntry2x);
    expect(meta.startupMs).toBe(10000);
  });

  it('returns asyncRequired: true', () => {
    const meta = gimpWrapper.getMetadata(mockEntry2x);
    expect(meta.asyncRequired).toBe(true);
  });

  it('returns gimpMajorVersion: 2 for 2.x entry', () => {
    const meta = gimpWrapper.getMetadata(mockEntry2x);
    expect(meta.gimpMajorVersion).toBe(2);
  });

  it('returns gimpMajorVersion: 3 for 3.x entry', () => {
    const meta = gimpWrapper.getMetadata(mockEntry3x);
    expect(meta.gimpMajorVersion).toBe(3);
  });
});
