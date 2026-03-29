import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/openapi-petstore.json'), 'utf8'));

// Parser will be implemented in Plan 163-02
describe('OpenAPI parser', () => {
  it.todo('parses 3 capabilities from petstore fixture (listPets, createPet, getPet)');
  it.todo('listPets capability has correct name, description, and inputSchema');
  it.todo('createPet capability has method POST and path /pets');
  it.todo('getPet capability has path parameter petId in inputSchema');
  it.todo('parser output passes validateCapabilityModel');
  it.todo('extracts securitySchemes into meta.auth');
});
