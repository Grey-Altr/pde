import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/jsonschema-users.json'), 'utf8'));

// Lazy-load parser so tests fail with clear message if file missing
let parser;
try {
  parser = require('../../bin/lib/cli-anything/parsers/jsonschema.cjs');
} catch (e) {
  parser = null;
}

const { CapabilitySchema, validateCapabilityModel } = require('../../bin/lib/cli-anything/model.cjs');

describe('JSON Schema parser', () => {
  it('parses top-level schema as a single capability (root from users fixture)', async () => {
    expect(parser).not.toBeNull();
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    // Should produce root + Address + Preferences = 3 total
    expect(caps).toHaveLength(3);
    // First capability should be the root schema
    const rootCap = caps.find(c => c.extensions.sourceType === 'root');
    expect(rootCap).toBeDefined();
  });

  it('Users fixture produces 3 capabilities (root + Address + Preferences from $defs)', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    expect(caps).toHaveLength(3);
    const names = caps.map(c => c.name);
    expect(names).toContain('Address');
    expect(names).toContain('Preferences');
    // Root capability named from filename slug
    const rootCap = caps.find(c => c.extensions.sourceType === 'root');
    expect(rootCap).toBeDefined();
    expect(rootCap.name).toBeTruthy();
  });

  it('root capability inputSchema has name, email, age properties', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    const rootCap = caps.find(c => c.extensions.sourceType === 'root');
    expect(rootCap).toBeDefined();
    const props = rootCap.inputSchema.properties;
    expect(props).toBeDefined();
    expect(props.name).toBeDefined();
    expect(props.email).toBeDefined();
    expect(props.age).toBeDefined();
  });

  it('root capability inputSchema.required includes name and email', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    const rootCap = caps.find(c => c.extensions.sourceType === 'root');
    expect(rootCap.inputSchema.required).toContain('name');
    expect(rootCap.inputSchema.required).toContain('email');
  });

  it('Address capability has inputSchema with street, city, zip properties and required: [street, city]', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    const addressCap = caps.find(c => c.name === 'Address');
    expect(addressCap).toBeDefined();
    const props = addressCap.inputSchema.properties;
    expect(props.street).toBeDefined();
    expect(props.city).toBeDefined();
    expect(props.zip).toBeDefined();
    expect(addressCap.inputSchema.required).toContain('street');
    expect(addressCap.inputSchema.required).toContain('city');
  });

  it('Preferences capability has inputSchema with theme (enum: light/dark) and notifications (boolean)', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    const prefsCap = caps.find(c => c.name === 'Preferences');
    expect(prefsCap).toBeDefined();
    const props = prefsCap.inputSchema.properties;
    expect(props.theme).toBeDefined();
    expect(props.theme.enum).toEqual(['light', 'dark']);
    expect(props.notifications).toBeDefined();
    expect(props.notifications.type).toBe('boolean');
  });

  it('schema with no $defs produces single capability from root', async () => {
    const simpleSchema = {
      type: 'object',
      description: 'A simple schema',
      properties: {
        foo: { type: 'string' },
        bar: { type: 'integer' },
      },
    };
    const caps = await parser.parse('/path/to/simple.json', simpleSchema);
    expect(caps).toHaveLength(1);
    expect(caps[0].extensions.sourceType).toBe('root');
    expect(caps[0].inputSchema.properties.foo).toBeDefined();
    expect(caps[0].inputSchema.properties.bar).toBeDefined();
  });

  it('schema with $defs but no root properties produces only $defs capabilities', async () => {
    const defsOnlySchema = {
      type: 'object',
      $defs: {
        Widget: { type: 'object', properties: { id: { type: 'string' } } },
        Gadget: { type: 'object', properties: { name: { type: 'string' } } },
      },
    };
    const caps = await parser.parse('/path/to/defs-only.json', defsOnlySchema);
    expect(caps).toHaveLength(2);
    const names = caps.map(c => c.name);
    expect(names).toContain('Widget');
    expect(names).toContain('Gadget');
    // No root capability
    expect(caps.every(c => c.extensions.sourceType !== 'root')).toBe(true);
  });

  it('each capability has method: null and path: null', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    for (const cap of caps) {
      expect(cap.method).toBeNull();
      expect(cap.path).toBeNull();
    }
  });

  it('capability description populated from schema description or fallback', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    for (const cap of caps) {
      expect(cap.description).toBeTruthy();
      expect(typeof cap.description).toBe('string');
    }
  });

  it('each capability passes CapabilitySchema.safeParse', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    for (const cap of caps) {
      const result = CapabilitySchema.safeParse(cap);
      expect(result.success, `Capability '${cap.name}' failed CapabilitySchema: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('parser output passes validateCapabilityModel', async () => {
    const caps = await parser.parse('/path/to/jsonschema-users.json', fixture);
    const model = {
      meta: {
        source: '/path/to/jsonschema-users.json',
        type: 'jsonschema',
        version: '2020-12',
        auth: {},
        generatedAt: new Date().toISOString(),
      },
      capabilities: caps,
    };
    expect(() => validateCapabilityModel(model)).not.toThrow();
  });
});
