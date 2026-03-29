import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/graphql-introspection.json'), 'utf8'));

// Parser will be implemented in Plan 163-03
describe('GraphQL parser', () => {
  it.todo('parses 3 capabilities from introspection fixture (user, users, createUser)');
  it.todo('user capability has correct name and description');
  it.todo('createUser capability has args name and email in inputSchema');
  it.todo('query capabilities have method null (not HTTP)');
  it.todo('parser output passes validateCapabilityModel');
  it.todo('handles introspection JSON wrapper (data.__schema)');
});
