import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/graphql-introspection.json'), 'utf8'));

const require = createRequire(import.meta.url);
const { parseIntrospectionResult, parse, INTROSPECTION_QUERY, argsToJsonSchema, gqlTypeToJsonSchema } =
  require('../../bin/lib/cli-anything/parsers/graphql.cjs');

const { CapabilitySchema } = require('../../bin/lib/cli-anything/model.cjs');

describe('GraphQL parser', () => {
  it('parses 3 capabilities from introspection fixture (user, users, createUser)', () => {
    const caps = parseIntrospectionResult(fixture.data);
    expect(caps).toHaveLength(3);
    const names = caps.map(c => c.name);
    expect(names).toContain('user');
    expect(names).toContain('users');
    expect(names).toContain('createUser');
  });

  it('user capability has correct name and description', () => {
    const caps = parseIntrospectionResult(fixture.data);
    const user = caps.find(c => c.name === 'user');
    expect(user).toBeDefined();
    expect(user.description).toBe('Get a user by ID');
    expect(user.inputSchema.properties.id).toBeDefined();
  });

  it('createUser capability has args name and email in inputSchema', () => {
    const caps = parseIntrospectionResult(fixture.data);
    const createUser = caps.find(c => c.name === 'createUser');
    expect(createUser).toBeDefined();
    expect(createUser.inputSchema.properties.name).toBeDefined();
    expect(createUser.inputSchema.properties.email).toBeDefined();
  });

  it('users capability has empty inputSchema properties (no args)', () => {
    const caps = parseIntrospectionResult(fixture.data);
    const users = caps.find(c => c.name === 'users');
    expect(users).toBeDefined();
    expect(Object.keys(users.inputSchema.properties)).toHaveLength(0);
  });

  it('query capabilities have method null (not HTTP)', () => {
    const caps = parseIntrospectionResult(fixture.data);
    for (const cap of caps) {
      expect(cap.method).toBeNull();
      expect(cap.path).toBeNull();
    }
  });

  it('each capability has extensions.parentType set to Query or Mutation', () => {
    const caps = parseIntrospectionResult(fixture.data);
    const user = caps.find(c => c.name === 'user');
    const users = caps.find(c => c.name === 'users');
    const createUser = caps.find(c => c.name === 'createUser');
    expect(user.extensions.parentType).toBe('Query');
    expect(users.extensions.parentType).toBe('Query');
    expect(createUser.extensions.parentType).toBe('Mutation');
  });

  it('User type (non-root OBJECT) is NOT included as a capability', () => {
    const caps = parseIntrospectionResult(fixture.data);
    const names = caps.map(c => c.name);
    // "id" and "name" are fields of User type, not root capabilities
    expect(names).not.toContain('id');
    // None of the capabilities should have parentType "User"
    for (const cap of caps) {
      expect(cap.extensions.parentType).not.toBe('User');
    }
  });

  it('handles introspection JSON wrapper (data.__schema)', () => {
    // fixture has { data: { __schema: {...} } } — parseIntrospectionResult accepts the data object
    const caps = parseIntrospectionResult(fixture.data);
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });

  it('each capability passes CapabilitySchema.safeParse', () => {
    const caps = parseIntrospectionResult(fixture.data);
    for (const cap of caps) {
      const result = CapabilitySchema.safeParse(cap);
      expect(result.success, `Capability ${cap.name} failed validation: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('INTROSPECTION_QUERY is a non-empty string containing __schema', () => {
    expect(typeof INTROSPECTION_QUERY).toBe('string');
    expect(INTROSPECTION_QUERY).toContain('__schema');
    expect(INTROSPECTION_QUERY).toContain('queryType');
    expect(INTROSPECTION_QUERY).toContain('mutationType');
  });

  it('parse() sends introspection query to HTTP endpoint and returns capabilities', async () => {
    // Mock global fetch
    const mockResponse = {
      ok: true,
      json: async () => fixture,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    try {
      const caps = await parse('https://example.com/graphql', null);
      expect(Array.isArray(caps)).toBe(true);
      expect(caps).toHaveLength(3);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('argsToJsonSchema converts args array to JSON Schema properties', () => {
    const args = [
      { name: 'id', description: 'User ID', type: { name: 'String', kind: 'SCALAR', ofType: null } },
    ];
    const schema = argsToJsonSchema(args);
    expect(schema.type).toBe('object');
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.id.type).toBe('string');
  });

  it('argsToJsonSchema with empty args returns empty properties', () => {
    const schema = argsToJsonSchema([]);
    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties)).toHaveLength(0);
  });

  it('gqlTypeToJsonSchema converts LIST type to array schema', () => {
    const listType = { name: null, kind: 'LIST', ofType: { name: 'User', kind: 'OBJECT' } };
    const schema = gqlTypeToJsonSchema(listType);
    expect(schema.type).toBe('array');
    expect(schema.items).toBeDefined();
  });
});
