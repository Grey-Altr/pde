import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/mcp-tools-list.json'), 'utf8'));

const require = createRequire(import.meta.url);
const { parseMCPToolsList } = require('../../bin/lib/cli-anything/parsers/mcp.cjs');
const { CapabilitySchema } = require('../../bin/lib/cli-anything/model.cjs');

describe('MCP parser', () => {
  it('parses 2 capabilities from mcp-tools-list fixture', () => {
    const caps = parseMCPToolsList(fixture.tools);
    expect(caps).toHaveLength(2);
    const names = caps.map(c => c.name);
    expect(names).toContain('get_design_state');
    expect(names).toContain('list_artifacts');
  });

  it('get_design_state capability has correct name and description', () => {
    const caps = parseMCPToolsList(fixture.tools);
    const cap = caps.find(c => c.name === 'get_design_state');
    expect(cap).toBeDefined();
    expect(cap.description).toBe('Get the current design pipeline state');
  });

  it('get_design_state inputSchema includes product property with type string', () => {
    const caps = parseMCPToolsList(fixture.tools);
    const cap = caps.find(c => c.name === 'get_design_state');
    expect(cap.inputSchema.properties.product).toBeDefined();
    expect(cap.inputSchema.properties.product.type).toBe('string');
  });

  it('get_design_state inputSchema.required contains product', () => {
    const caps = parseMCPToolsList(fixture.tools);
    const cap = caps.find(c => c.name === 'get_design_state');
    expect(cap.inputSchema.required).toBeDefined();
    expect(cap.inputSchema.required).toContain('product');
  });

  it('list_artifacts capability has optional filter property', () => {
    const caps = parseMCPToolsList(fixture.tools);
    const cap = caps.find(c => c.name === 'list_artifacts');
    expect(cap).toBeDefined();
    expect(cap.inputSchema.properties.filter).toBeDefined();
    if (cap.inputSchema.required) {
      expect(cap.inputSchema.required).not.toContain('filter');
    }
  });

  it('each capability has method: null and path: null', () => {
    const caps = parseMCPToolsList(fixture.tools);
    for (const cap of caps) {
      expect(cap.method).toBeNull();
      expect(cap.path).toBeNull();
    }
  });

  it('each capability has extensions.transport set to stdio', () => {
    const caps = parseMCPToolsList(fixture.tools);
    for (const cap of caps) {
      expect(cap.extensions.transport).toBe('stdio');
    }
  });

  it('parseMCPToolsList uses custom transport name when provided', () => {
    const caps = parseMCPToolsList(fixture.tools, 'sse');
    for (const cap of caps) {
      expect(cap.extensions.transport).toBe('sse');
    }
  });

  it('each capability passes CapabilitySchema.safeParse', () => {
    const caps = parseMCPToolsList(fixture.tools);
    for (const cap of caps) {
      const result = CapabilitySchema.safeParse(cap);
      expect(result.success, 'Capability ' + cap.name + ' failed: ' + JSON.stringify(result.error && result.error.issues)).toBe(true);
    }
  });

  it('parseMCPToolsList handles empty tools array', () => {
    const caps = parseMCPToolsList([]);
    expect(caps).toHaveLength(0);
  });

  it('parseMCPToolsList handles tool with no inputSchema', () => {
    const tools = [{ name: 'bare_tool', description: 'A tool with no schema' }];
    const caps = parseMCPToolsList(tools);
    expect(caps).toHaveLength(1);
    expect(caps[0].inputSchema).toEqual({ type: 'object', properties: {} });
  });

  it('outputSchema is null for all MCP capabilities', () => {
    const caps = parseMCPToolsList(fixture.tools);
    for (const cap of caps) {
      expect(cap.outputSchema).toBeNull();
    }
  });
});
