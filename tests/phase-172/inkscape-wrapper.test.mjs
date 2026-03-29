/**
 * tests/phase-172/inkscape-wrapper.test.mjs
 * TDD tests for bin/lib/app-wrappers/inkscape-wrapper.cjs (WRAP-03, WRAP-05)
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildCapabilityModel, getMetadata, parseMajorVersion } = require('../../bin/lib/app-wrappers/inkscape-wrapper.cjs');
const { validateCapabilityModel } = require('../../bin/lib/cli-anything/model.cjs');

const mockEntry = {
  slug: 'inkscape',
  binaryPath: '/usr/bin/inkscape',
  version: 'Inkscape 1.3.2 (091e20e, 2023-11-25)',
  executionMode: 'headless',
  status: 'approved',
  displayProbe: { available: true, method: 'WindowServer' },
};

describe('buildCapabilityModel', () => {
  it('returns a valid CapabilityModel with meta.source = inkscape binary path', () => {
    const model = buildCapabilityModel(mockEntry);
    expect(model.meta.source).toBe('/usr/bin/inkscape');
  });

  it('version field in meta matches registryEntry.version', () => {
    const model = buildCapabilityModel(mockEntry);
    expect(model.meta.version).toBe('Inkscape 1.3.2 (091e20e, 2023-11-25)');
  });

  it('capabilities array includes an export capability', () => {
    const model = buildCapabilityModel(mockEntry);
    const exportCap = model.capabilities.find(c => c.name === 'inkscape_export');
    expect(exportCap).toBeDefined();
  });

  it('meta.type = "cli"', () => {
    const model = buildCapabilityModel(mockEntry);
    expect(model.meta.type).toBe('cli');
  });

  it('validateCapabilityModel does not throw on returned model', () => {
    const model = buildCapabilityModel(mockEntry);
    expect(() => validateCapabilityModel(model)).not.toThrow();
  });
});

describe('inkscape capabilities', () => {
  it('export capability input schema has inputSvg, outputFile, exportType, dpi properties', () => {
    const model = buildCapabilityModel(mockEntry);
    const exportCap = model.capabilities.find(c => c.name === 'inkscape_export');
    const props = exportCap.inputSchema.properties;
    expect(props).toHaveProperty('inputSvg');
    expect(props).toHaveProperty('outputFile');
    expect(props).toHaveProperty('exportType');
    expect(props).toHaveProperty('dpi');
  });

  it('export capability input schema also has optional width and height', () => {
    const model = buildCapabilityModel(mockEntry);
    const exportCap = model.capabilities.find(c => c.name === 'inkscape_export');
    const props = exportCap.inputSchema.properties;
    expect(props).toHaveProperty('width');
    expect(props).toHaveProperty('height');
  });

  it('--export-overwrite is documented in export capability description', () => {
    const model = buildCapabilityModel(mockEntry);
    const exportCap = model.capabilities.find(c => c.name === 'inkscape_export');
    expect(exportCap.description).toMatch(/export-overwrite/i);
  });

  it('no capability references --without-gui (deprecated Inkscape 0.9x flag)', () => {
    const model = buildCapabilityModel(mockEntry);
    const json = JSON.stringify(model);
    expect(json).not.toContain('--without-gui');
  });

  it('no capability references --batch-process (deprecated flag)', () => {
    const model = buildCapabilityModel(mockEntry);
    const json = JSON.stringify(model);
    expect(json).not.toContain('--batch-process');
  });

  it('export capability description is non-empty string', () => {
    const model = buildCapabilityModel(mockEntry);
    const exportCap = model.capabilities.find(c => c.name === 'inkscape_export');
    expect(typeof exportCap.description).toBe('string');
    expect(exportCap.description.length).toBeGreaterThan(10);
  });
});

describe('wrapper-metadata.json', () => {
  it('getMetadata returns startupMs: 1000', () => {
    const meta = getMetadata(mockEntry);
    expect(meta.startupMs).toBe(1000);
  });

  it('getMetadata returns asyncRequired: true', () => {
    const meta = getMetadata(mockEntry);
    expect(meta.asyncRequired).toBe(true);
  });

  it('getMetadata returns executionMode: "headless"', () => {
    const meta = getMetadata(mockEntry);
    expect(meta.executionMode).toBe('headless');
  });

  it('getMetadata returns slug: "inkscape"', () => {
    const meta = getMetadata(mockEntry);
    expect(meta.slug).toBe('inkscape');
  });
});

describe('version parsing', () => {
  it('parseMajorVersion("Inkscape 1.3.2 (091e20e, 2023-11-25)") returns 1', () => {
    expect(parseMajorVersion('Inkscape 1.3.2 (091e20e, 2023-11-25)')).toBe(1);
  });

  it('parseMajorVersion("Inkscape 1.2.1 (9c6d41e, 2022-07-14)") returns 1', () => {
    expect(parseMajorVersion('Inkscape 1.2.1 (9c6d41e, 2022-07-14)')).toBe(1);
  });

  it('parseMajorVersion(null) returns null', () => {
    expect(parseMajorVersion(null)).toBeNull();
  });
});
