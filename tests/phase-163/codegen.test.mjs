import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Will fail until codegen.cjs is implemented
let jsonSchemaToZod, generateToolSource, generateTools, typeCheckGeneratedFile;
try {
  const codegen = require('../../bin/lib/cli-anything/codegen.cjs');
  jsonSchemaToZod = codegen.jsonSchemaToZod;
  generateToolSource = codegen.generateToolSource;
  generateTools = codegen.generateTools;
  typeCheckGeneratedFile = codegen.typeCheckGeneratedFile;
} catch (e) {
  // Module not yet implemented — tests will fail
}

// Load fixture
const fixturePath = path.join(__dirname, 'fixtures/openapi-petstore.json');
const petstoreSpec = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

describe('AI SDK codegen', () => {
  describe('jsonSchemaToZod', () => {
    it('converts { type: "string" } to z.string()', () => {
      const result = jsonSchemaToZod({ type: 'string' });
      expect(result).toContain('z.string()');
    });

    it('converts { type: "number" } to z.number()', () => {
      const result = jsonSchemaToZod({ type: 'number' });
      expect(result).toContain('z.number()');
    });

    it('converts { type: "integer" } to z.number()', () => {
      const result = jsonSchemaToZod({ type: 'integer' });
      expect(result).toContain('z.number()');
    });

    it('converts { type: "boolean" } to z.boolean()', () => {
      const result = jsonSchemaToZod({ type: 'boolean' });
      expect(result).toContain('z.boolean()');
    });

    it('converts enum to z.enum([...]) array form (NOT object form)', () => {
      const result = jsonSchemaToZod({ type: 'string', enum: ['a', 'b'] });
      expect(result).toContain('z.enum(["a", "b"])');
      // Must NOT use object form (Zod v4 requirement — only array form is valid)
      expect(result).not.toContain('z.enum({');
    });

    it('converts array schema to z.array(...)', () => {
      const result = jsonSchemaToZod({ type: 'array', items: { type: 'string' } });
      expect(result).toContain('z.array(z.string())');
    });

    it('converts object with required field — no .optional()', () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toContain('name: z.string()');
      // Required field must NOT have .optional()
      expect(result).not.toMatch(/name: z\.string\(\)\.optional\(\)/);
    });

    it('optional fields get .optional() suffix', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tag: { type: 'string' },
        },
        required: ['name'],
      };
      const result = jsonSchemaToZod(schema);
      // name is required — no .optional()
      expect(result).not.toMatch(/name:\s*z\.string\(\)\.optional\(\)/);
      // tag is optional — gets .optional()
      expect(result).toContain('tag: z.string().optional()');
    });

    it('returns z.unknown() at depth > 8 (circular ref guard)', () => {
      // Build deeply nested schema
      let deep = { type: 'string' };
      for (let i = 0; i < 10; i++) {
        deep = { type: 'object', properties: { nested: deep } };
      }
      const result = jsonSchemaToZod(deep, 9); // Pass depth=9 to force guard
      expect(result).toBe('z.unknown()');
    });

    it('returns z.unknown() for null/undefined schema', () => {
      expect(jsonSchemaToZod(null)).toBe('z.unknown()');
      expect(jsonSchemaToZod(undefined)).toBe('z.unknown()');
    });

    it('appends .describe() when schema has description', () => {
      const result = jsonSchemaToZod({ type: 'string', description: 'A name' });
      expect(result).toContain('.describe("A name")');
    });
  });

  describe('generateToolSource', () => {
    const sampleCapability = {
      name: 'listPets',
      description: 'List all pets',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'integer' } },
      },
      outputSchema: null,
      method: 'GET',
      path: '/pets',
      extensions: {},
    };

    const meta = {
      source: 'petstore.json',
      type: 'openapi',
      generatedAt: '2026-03-28T00:00:00Z',
    };

    it('generates string containing export const', () => {
      const result = generateToolSource([sampleCapability], meta);
      expect(result).toContain('export const');
    });

    it('generates tool() wrapper', () => {
      const result = generateToolSource([sampleCapability], meta);
      expect(result).toContain('tool({');
    });

    it('uses inputSchema: (NOT parameters:)', () => {
      const result = generateToolSource([sampleCapability], meta);
      expect(result).toContain('inputSchema:');
      expect(result).not.toContain('parameters:');
    });

    it('includes description field', () => {
      const result = generateToolSource([sampleCapability], meta);
      expect(result).toContain('description:');
    });

    it('includes execute: async function', () => {
      const result = generateToolSource([sampleCapability], meta);
      expect(result).toContain('execute: async');
    });

    it('includes correct AI SDK import', () => {
      const result = generateToolSource([sampleCapability], meta);
      expect(result).toContain("import { tool } from 'ai'");
    });

    it('includes zod import', () => {
      const result = generateToolSource([sampleCapability], meta);
      expect(result).toContain("import { z } from 'zod'");
    });

    it('generates one export per capability', () => {
      const cap2 = { ...sampleCapability, name: 'createPet', description: 'Create a pet', method: 'POST' };
      const result = generateToolSource([sampleCapability, cap2], meta);
      const exportCount = (result.match(/export const/g) || []).length;
      expect(exportCount).toBe(2);
    });

    it('does NOT contain "parameters:" anywhere in template strings', () => {
      const result = generateToolSource([sampleCapability], meta);
      expect(result).not.toContain('parameters:');
    });
  });

  describe('generateTools (end-to-end with tsc)', () => {
    it('generates tools.ts from OpenAPI petstore capabilities', async () => {
      // Build capabilities from petstore spec manually (simulating parser output)
      const capabilities = [
        {
          name: 'listPets',
          description: 'List all pets',
          inputSchema: { type: 'object', properties: { limit: { type: 'integer' } } },
          outputSchema: null,
          method: 'GET',
          path: '/pets',
          extensions: {},
        },
        {
          name: 'createPet',
          description: 'Create a pet',
          inputSchema: { type: 'object', properties: { name: { type: 'string' }, tag: { type: 'string' } }, required: ['name'] },
          outputSchema: null,
          method: 'POST',
          path: '/pets',
          extensions: {},
        },
        {
          name: 'getPet',
          description: 'Get a pet by ID',
          inputSchema: { type: 'object', properties: { petId: { type: 'string' } }, required: ['petId'] },
          outputSchema: null,
          method: 'GET',
          path: '/pets/{petId}',
          extensions: {},
        },
      ];

      const model = {
        meta: {
          source: 'petstore.json',
          type: 'openapi',
          version: '1.0.0',
          auth: {},
          generatedAt: new Date().toISOString(),
        },
        capabilities,
      };

      const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-test-'));
      try {
        await generateTools(model, outputDir);
        const toolsTs = fs.readFileSync(path.join(outputDir, 'tools.ts'), 'utf8');
        expect(toolsTs).toContain('export const listPets');
        expect(toolsTs).toContain('export const createPet');
        expect(toolsTs).toContain('export const getPet');
        expect(toolsTs).toContain('inputSchema:');
        expect(toolsTs).not.toContain('parameters:');
        expect(toolsTs).toContain("import { tool } from 'ai'");
      } finally {
        fs.rmSync(outputDir, { recursive: true });
      }
    });
  });
});
