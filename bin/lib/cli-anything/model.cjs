'use strict';

/**
 * model.cjs — Capability model Zod schema
 *
 * Defines the unified CapabilityModel data structure that all parsers
 * (OpenAPI, JSON Schema, GraphQL, MCP) produce. Downstream generators
 * (tool(), SKILL.md, MCP server) consume this structure.
 */

const { z } = require('zod');

/**
 * A single capability (function/operation/tool) extracted from an API spec.
 */
const CapabilitySchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()).nullable(),
  method: z.string().nullable(),
  path: z.string().nullable(),
  extensions: z.record(z.string(), z.unknown()),
});

/**
 * The full capability model produced by ingesting a spec.
 */
const CapabilityModelSchema = z.object({
  meta: z.object({
    source: z.string(),
    type: z.enum(['openapi', 'jsonschema', 'graphql', 'mcp']),
    version: z.string(),
    auth: z.record(z.string(), z.unknown()),
    generatedAt: z.string(),
  }),
  capabilities: z.array(CapabilitySchema),
});

/**
 * Validate a capability model object, throwing on invalid input.
 * @param {unknown} data - Object to validate
 * @returns {import('zod').infer<typeof CapabilityModelSchema>} Validated model
 */
function validateCapabilityModel(data) {
  const result = CapabilityModelSchema.safeParse(data);
  if (!result.success) {
    const issues = JSON.stringify(result.error.issues, null, 2);
    throw new Error(`Invalid capability model:\n${issues}`);
  }
  return result.data;
}

module.exports = { CapabilitySchema, CapabilityModelSchema, validateCapabilityModel };
