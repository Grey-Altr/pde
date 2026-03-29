import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/openapi-petstore.json'), 'utf8'));

// Lazy-load parser so tests fail with clear message if file missing
let parser;
try {
  parser = require('../../bin/lib/cli-anything/parsers/openapi.cjs');
} catch (e) {
  parser = null;
}

const { CapabilitySchema, validateCapabilityModel } = require('../../bin/lib/cli-anything/model.cjs');

describe('OpenAPI parser', () => {
  it('parses 3 capabilities from petstore fixture (listPets, createPet, getPet)', async () => {
    expect(parser).not.toBeNull();
    const caps = await parser.parse('petstore.json', fixture);
    expect(caps).toHaveLength(3);
    const names = caps.map(c => c.name);
    expect(names).toContain('listPets');
    expect(names).toContain('createPet');
    expect(names).toContain('getPet');
  });

  it('listPets capability has correct name, description, and inputSchema', async () => {
    const caps = await parser.parse('petstore.json', fixture);
    const listPets = caps.find(c => c.name === 'listPets');
    expect(listPets).toBeDefined();
    expect(listPets.description).toBeTruthy();
    expect(listPets.method).toBe('GET');
    expect(listPets.path).toBe('/pets');
    // inputSchema should have the 'limit' query param
    expect(listPets.inputSchema.type).toBe('object');
    expect(listPets.inputSchema.properties).toBeDefined();
  });

  it('createPet capability has method POST and path /pets', async () => {
    const caps = await parser.parse('petstore.json', fixture);
    const createPet = caps.find(c => c.name === 'createPet');
    expect(createPet).toBeDefined();
    expect(createPet.method).toBe('POST');
    expect(createPet.path).toBe('/pets');
  });

  it('createPet inputSchema.properties contains resolved Pet schema fields (name, id, tag) — NOT a $ref string', async () => {
    const caps = await parser.parse('petstore.json', fixture);
    const createPet = caps.find(c => c.name === 'createPet');
    expect(createPet).toBeDefined();
    const props = createPet.inputSchema.properties;
    // $ref should be resolved — properties should be actual fields
    expect(props).toBeDefined();
    expect(props.name).toBeDefined();
    expect(props.id).toBeDefined();
    expect(props.tag).toBeDefined();
    // Verify no $ref strings remain
    expect(JSON.stringify(props)).not.toContain('$ref');
  });

  it('getPet capability has path parameter petId in inputSchema', async () => {
    const caps = await parser.parse('petstore.json', fixture);
    const getPet = caps.find(c => c.name === 'getPet');
    expect(getPet).toBeDefined();
    expect(getPet.inputSchema.properties).toBeDefined();
    expect(getPet.inputSchema.properties.petId).toBeDefined();
    expect(getPet.inputSchema.properties.petId.type).toBe('string');
  });

  it('each capability has extensions.operationId and extensions.tags', async () => {
    const caps = await parser.parse('petstore.json', fixture);
    for (const cap of caps) {
      expect(cap.extensions).toBeDefined();
      expect(cap.extensions).toHaveProperty('operationId');
      expect(cap.extensions).toHaveProperty('tags');
    }
  });

  it('extracts securitySchemes into meta.auth via extractAuth', async () => {
    const auth = parser.extractAuth(fixture);
    expect(auth).toBeDefined();
    expect(auth.api_key).toBeDefined();
    expect(auth.api_key.type).toBe('apiKey');
  });

  it('empty paths object produces empty capabilities array', async () => {
    const emptySpec = { openapi: '3.0.0', info: { title: 'Empty', version: '1.0.0' }, paths: {} };
    const caps = await parser.parse('empty.json', emptySpec);
    expect(caps).toHaveLength(0);
  });

  it('each capability passes CapabilitySchema.safeParse', async () => {
    const caps = await parser.parse('petstore.json', fixture);
    for (const cap of caps) {
      const result = CapabilitySchema.safeParse(cap);
      expect(result.success, `Capability '${cap.name}' failed CapabilitySchema: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('parser output passes validateCapabilityModel', async () => {
    const caps = await parser.parse('petstore.json', fixture);
    const auth = parser.extractAuth(fixture);
    const model = {
      meta: {
        source: 'petstore.json',
        type: 'openapi',
        version: fixture.info?.version || '1.0.0',
        auth,
        generatedAt: new Date().toISOString(),
      },
      capabilities: caps,
    };
    expect(() => validateCapabilityModel(model)).not.toThrow();
  });
});
