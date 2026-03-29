import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/jsonschema-users.json'), 'utf8'));

// Parser will be implemented in Plan 163-02
describe('JSON Schema parser', () => {
  it.todo('parses top-level schema as a single capability');
  it.todo('capability name derived from $schema or filename');
  it.todo('capability description populated from schema description');
  it.todo('inputSchema contains all top-level properties');
  it.todo('$defs expanded and preserved in inputSchema');
  it.todo('parser output passes validateCapabilityModel');
});
