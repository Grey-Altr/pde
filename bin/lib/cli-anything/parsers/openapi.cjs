'use strict';

/**
 * openapi.cjs — OpenAPI 3.x parser
 * Maps paths + operations to flat capability array.
 * Resolves $ref pointers against components.schemas.
 */

/**
 * Recursively resolve $ref pointers in a schema object.
 * @param {object} schema - JSON Schema with possible $ref
 * @param {object} components - OpenAPI components object
 * @param {Set} visited - Circular reference guard
 * @returns {object} Resolved schema
 */
function resolveRefs(schema, components, visited = new Set()) {
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.$ref) {
    const refPath = schema.$ref; // e.g., "#/components/schemas/Pet"
    if (visited.has(refPath)) return {}; // circular ref guard
    visited.add(refPath);
    // Parse path: "#/components/schemas/Pet" -> ["components", "schemas", "Pet"]
    const parts = refPath.replace(/^#\//, '').split('/');
    let resolved = components;
    // Navigate relative to components (skip "components" prefix if present)
    const startIdx = parts[0] === 'components' ? 1 : 0;
    for (let i = startIdx; i < parts.length; i++) {
      resolved = resolved?.[parts[i]];
    }
    if (!resolved) return {};
    return resolveRefs(resolved, components, new Set(visited));
  }
  // Recurse into properties, items, etc.
  const result = Array.isArray(schema) ? [...schema] : { ...schema };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = resolveRefs(value, components, new Set(visited));
    }
  }
  return result;
}

/**
 * Build inputSchema from OpenAPI operation parameters + requestBody.
 * @param {Array} parameters - OpenAPI operation parameters
 * @param {object} requestBody - OpenAPI request body
 * @param {object} components - OpenAPI components object
 * @returns {object} JSON Schema object
 */
function buildInputSchema(parameters, requestBody, components) {
  const properties = {};
  const required = [];

  // Path/query/header parameters
  for (const param of (parameters || [])) {
    const resolved = param.$ref ? resolveRefs(param, components) : param;
    const paramSchema = resolved.schema ? resolveRefs(resolved.schema, components) : { type: 'string' };
    properties[resolved.name] = paramSchema;
    if (resolved.required) required.push(resolved.name);
  }

  // Request body
  if (requestBody) {
    const body = requestBody.$ref ? resolveRefs(requestBody, components) : requestBody;
    const content = body.content || {};
    const jsonContent = content['application/json'];
    if (jsonContent?.schema) {
      const bodySchema = resolveRefs(jsonContent.schema, components);
      if (bodySchema.type === 'object' && bodySchema.properties) {
        Object.assign(properties, bodySchema.properties);
        if (bodySchema.required) required.push(...bodySchema.required);
      } else {
        properties.body = bodySchema;
        if (body.required) required.push('body');
      }
    }
  }

  const schema = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  return schema;
}

/**
 * Build outputSchema from OpenAPI operation responses.
 * @param {object} responses - OpenAPI responses object
 * @param {object} components - OpenAPI components object
 * @returns {object|null} JSON Schema or null
 */
function buildOutputSchema(responses, components) {
  const successResponse = responses?.['200'] || responses?.['201'] || responses?.['202'];
  if (!successResponse) return null;
  const resp = successResponse.$ref ? resolveRefs(successResponse, components) : successResponse;
  const content = resp.content || {};
  const jsonContent = content['application/json'];
  if (!jsonContent?.schema) return null;
  return resolveRefs(jsonContent.schema, components);
}

/**
 * Extract auth schemes from OpenAPI components.securitySchemes.
 * @param {object} spec - OpenAPI spec
 * @returns {object} Auth schemes map
 */
function extractAuth(spec) {
  const schemes = spec.components?.securitySchemes || {};
  const auth = {};
  for (const [name, scheme] of Object.entries(schemes)) {
    auth[name] = {
      type: scheme.type,
      in: scheme.in || null,
      name: scheme.name || null,
      scheme: scheme.scheme || null,
    };
  }
  return auth;
}

/**
 * Parse an OpenAPI 3.x spec into capabilities.
 * @param {string} source - File path or URL (for metadata)
 * @param {object} spec - Parsed OpenAPI JSON
 * @returns {Promise<Array>} Capability objects matching CapabilitySchema
 */
async function parse(source, spec) {
  const capabilities = [];
  const components = spec.components || {};
  const methods = ['get', 'post', 'put', 'patch', 'delete'];

  for (const [pathStr, pathItem] of Object.entries(spec.paths || {})) {
    for (const method of methods) {
      const op = pathItem[method];
      if (!op) continue;

      const inputSchema = buildInputSchema(op.parameters, op.requestBody, components);
      const outputSchema = buildOutputSchema(op.responses, components);

      capabilities.push({
        name: op.operationId || `${method}_${pathStr.replace(/\W+/g, '_')}`,
        description: op.summary || op.description || '',
        inputSchema,
        outputSchema,
        method: method.toUpperCase(),
        path: pathStr,
        extensions: {
          operationId: op.operationId || null,
          tags: op.tags || [],
        },
      });
    }
  }

  return capabilities;
}

module.exports = { parse, resolveRefs, buildInputSchema, buildOutputSchema, extractAuth };
