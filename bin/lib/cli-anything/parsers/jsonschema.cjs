'use strict';

/**
 * jsonschema.cjs — JSON Schema parser
 * Maps root properties and $defs entries to flat capability array.
 *
 * Strategy:
 * - If root schema has properties: produce one capability named after the source slug
 * - If $defs or definitions exist: produce one capability per entry
 * - Both can coexist (root + $defs)
 */

const path = require('path');

/**
 * Derive a clean slug from a source file path.
 * @param {string} source - File path or URL
 * @returns {string} Lowercase slug
 */
function slugFromSource(source) {
  return path.basename(source).replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'root';
}

/**
 * Parse a JSON Schema file into capabilities.
 * @param {string} source - File path (used for slug/naming)
 * @param {object} schema - Parsed JSON Schema
 * @returns {Promise<Array>} Capability objects matching CapabilitySchema
 */
async function parse(source, schema) {
  const capabilities = [];
  const baseName = slugFromSource(source);

  // Root schema as a capability (if it has properties)
  if (schema.properties && Object.keys(schema.properties).length > 0) {
    const inputSchema = {
      type: schema.type || 'object',
      properties: schema.properties,
    };
    if (schema.required && schema.required.length > 0) {
      inputSchema.required = schema.required;
    }

    capabilities.push({
      name: baseName,
      description: schema.description || `Root schema from ${path.basename(source)}`,
      inputSchema,
      outputSchema: null,
      method: null,
      path: null,
      extensions: {
        schemaId: schema.$id || null,
        sourceType: 'root',
      },
    });
  }

  // $defs entries as capabilities (JSON Schema 2020-12+)
  // Also handle legacy "definitions" key (JSON Schema draft-04/06/07)
  const defs = schema.$defs || schema.definitions || {};
  for (const [defName, defSchema] of Object.entries(defs)) {
    const inputSchema = {
      type: defSchema.type || 'object',
      properties: defSchema.properties || {},
    };
    if (defSchema.required && defSchema.required.length > 0) {
      inputSchema.required = defSchema.required;
    }

    capabilities.push({
      name: defName,
      description: defSchema.description || `${defName} definition`,
      inputSchema,
      outputSchema: null,
      method: null,
      path: null,
      extensions: {
        schemaId: defSchema.$id || null,
        sourceType: '$defs',
      },
    });
  }

  return capabilities;
}

module.exports = { parse };
