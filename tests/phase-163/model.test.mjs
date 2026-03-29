import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load model module using absolute path to avoid resolution issues
const modelPath = resolve(__dirname, '../../bin/lib/cli-anything/model.cjs');
const { validateCapabilityModel } = require(modelPath);

const validModel = {
  meta: {
    source: 'tests/fixtures/openapi-petstore.json',
    type: 'openapi',
    version: '1.0.0',
    auth: {},
    generatedAt: '2026-03-29T00:00:00.000Z',
  },
  capabilities: [
    {
      name: 'listPets',
      description: 'List all pets',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: null,
      method: 'GET',
      path: '/pets',
      extensions: {},
    },
  ],
};

describe('validateCapabilityModel', () => {
  it('accepts a valid capability model', () => {
    expect(() => validateCapabilityModel(validModel)).not.toThrow();
    const result = validateCapabilityModel(validModel);
    expect(result.meta.source).toBe('tests/fixtures/openapi-petstore.json');
    expect(result.capabilities).toHaveLength(1);
  });

  it('throws when meta.source is missing', () => {
    const invalid = { ...validModel, meta: { ...validModel.meta, source: undefined } };
    expect(() => validateCapabilityModel(invalid)).toThrow('Invalid capability model');
  });

  it('throws when meta.type is not a valid enum value', () => {
    const invalid = { ...validModel, meta: { ...validModel.meta, type: 'rest' } };
    expect(() => validateCapabilityModel(invalid)).toThrow('Invalid capability model');
  });

  it('accepts a model with an empty capabilities array', () => {
    const emptyModel = { ...validModel, capabilities: [] };
    expect(() => validateCapabilityModel(emptyModel)).not.toThrow();
    const result = validateCapabilityModel(emptyModel);
    expect(result.capabilities).toHaveLength(0);
  });
});
