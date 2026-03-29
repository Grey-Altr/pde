import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/mcp-tools-list.json'), 'utf8'));

// Parser will be implemented in Plan 163-03
describe('MCP parser', () => {
  it.todo('parses 2 capabilities from mcp-tools-list fixture');
  it.todo('get_design_state capability has correct name and description');
  it.todo('get_design_state inputSchema includes product property');
  it.todo('list_artifacts capability has optional filter property');
  it.todo('parser output passes validateCapabilityModel');
  it.todo('runs mcp:// command via child_process and parses tools/list response');
});
