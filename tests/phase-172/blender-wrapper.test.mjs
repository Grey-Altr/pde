/**
 * tests/phase-172/blender-wrapper.test.mjs
 * TDD tests for bin/lib/app-wrappers/blender-wrapper.cjs (WRAP-01, WRAP-04)
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildCapabilityModel, getMetadata, parseMajorVersion } = require('../../bin/lib/app-wrappers/blender-wrapper.cjs');
const { validateCapabilityModel } = require('../../bin/lib/cli-anything/model.cjs');

const mockEntry = {
  slug: 'blender',
  binaryPath: '/usr/bin/blender',
  version: 'Blender 4.2.0',
  executionMode: 'headless',
  status: 'approved',
  displayProbe: { available: true, method: 'WindowServer' },
};

describe('buildCapabilityModel', () => {
  it('returns a valid CapabilityModel with meta.source = blender binary path', () => {
    const model = buildCapabilityModel(mockEntry);
    expect(model.meta.source).toBe('/usr/bin/blender');
  });

  it('version field in meta matches registryEntry.version', () => {
    const model = buildCapabilityModel(mockEntry);
    expect(model.meta.version).toBe('Blender 4.2.0');
  });

  it('capabilities array is non-empty', () => {
    const model = buildCapabilityModel(mockEntry);
    expect(model.capabilities.length).toBeGreaterThan(0);
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

describe('blender capabilities', () => {
  it('includes a blender_render capability with --background and --factory-startup in extensions', () => {
    const model = buildCapabilityModel(mockEntry);
    const renderCap = model.capabilities.find(c => c.name === 'blender_render');
    expect(renderCap).toBeDefined();
    expect(renderCap.extensions.subcommandPath).toContain('--background');
    expect(renderCap.extensions.subcommandPath).toContain('--factory-startup');
  });

  it('includes a blender_python_exec capability for running Python scripts', () => {
    const model = buildCapabilityModel(mockEntry);
    const pyCap = model.capabilities.find(c => c.name === 'blender_python_exec');
    expect(pyCap).toBeDefined();
    expect(pyCap.description).toBeTruthy();
  });

  it('includes a blender_export capability for exporting scenes', () => {
    const model = buildCapabilityModel(mockEntry);
    const exportCap = model.capabilities.find(c => c.name === 'blender_export');
    expect(exportCap).toBeDefined();
  });

  it('render capability input schema has blendFile, outputPath, format, frame properties', () => {
    const model = buildCapabilityModel(mockEntry);
    const renderCap = model.capabilities.find(c => c.name === 'blender_render');
    const props = renderCap.inputSchema.properties;
    expect(props).toHaveProperty('blendFile');
    expect(props).toHaveProperty('outputPath');
    expect(props).toHaveProperty('format');
    expect(props).toHaveProperty('frame');
  });

  it('python-exec capability input schema has blendFile and pythonScript or pythonExpr', () => {
    const model = buildCapabilityModel(mockEntry);
    const pyCap = model.capabilities.find(c => c.name === 'blender_python_exec');
    const props = pyCap.inputSchema.properties;
    expect(props).toHaveProperty('blendFile');
    expect(props.pythonScript || props.pythonExpr).toBeDefined();
  });
});

describe('wrapper-metadata.json', () => {
  it('getMetadata returns startupMs: 5000', () => {
    const meta = getMetadata(mockEntry);
    expect(meta.startupMs).toBe(5000);
  });

  it('getMetadata returns asyncRequired: true', () => {
    const meta = getMetadata(mockEntry);
    expect(meta.asyncRequired).toBe(true);
  });

  it('getMetadata returns executionMode: "headless"', () => {
    const meta = getMetadata(mockEntry);
    expect(meta.executionMode).toBe('headless');
  });

  it('getMetadata returns slug: "blender"', () => {
    const meta = getMetadata(mockEntry);
    expect(meta.slug).toBe('blender');
  });
});

describe('version parsing', () => {
  it('parseMajorVersion("Blender 4.0.0") returns 4', () => {
    expect(parseMajorVersion('Blender 4.0.0')).toBe(4);
  });

  it('parseMajorVersion("Blender 2.93 (sub 5)") returns 2', () => {
    expect(parseMajorVersion('Blender 2.93 (sub 5)')).toBe(2);
  });

  it('parseMajorVersion(null) returns null', () => {
    expect(parseMajorVersion(null)).toBeNull();
  });
});
