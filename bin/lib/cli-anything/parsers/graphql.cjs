'use strict';

/**
 * graphql.cjs — GraphQL introspection parser
 *
 * Converts GraphQL introspection responses or .graphql SDL files
 * into flat capability arrays matching CapabilitySchema.
 *
 * Exports: parse, parseIntrospectionResult, INTROSPECTION_QUERY, argsToJsonSchema, gqlTypeToJsonSchema
 */

const path = require('path');

/**
 * Standard GraphQL introspection query that fetches schema structure.
 */
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        name kind description
        fields(includeDeprecated: false) {
          name description
          args { name description type { name kind ofType { name kind } } }
          type { name kind ofType { name kind ofType { name kind } } }
        }
      }
    }
  }
`;

/**
 * Map a GraphQL scalar name to JSON Schema type string.
 * Handles NON_NULL wrappers by traversing ofType.
 */
function gqlTypeToJsonSchemaType(gqlType) {
  if (!gqlType) return 'string';
  if (gqlType.kind === 'NON_NULL' && gqlType.ofType) {
    return gqlTypeToJsonSchemaType(gqlType.ofType);
  }
  const name = gqlType.name;
  if (name === 'String' || name === 'ID') return 'string';
  if (name === 'Int' || name === 'Float') return 'number';
  if (name === 'Boolean') return 'boolean';
  return 'string';
}

/**
 * Convert an array of GraphQL field args to a JSON Schema object.
 */
function argsToJsonSchema(args) {
  const properties = {};
  for (const arg of (args || [])) {
    properties[arg.name] = {
      type: gqlTypeToJsonSchemaType(arg.type),
      description: arg.description || '',
    };
  }
  return { type: 'object', properties };
}

/**
 * Convert a GraphQL return type to a JSON Schema representation.
 */
function gqlTypeToJsonSchema(gqlType) {
  if (!gqlType) return { type: 'string' };
  if (gqlType.kind === 'NON_NULL' && gqlType.ofType) {
    return gqlTypeToJsonSchema(gqlType.ofType);
  }
  if (gqlType.kind === 'LIST') {
    return {
      type: 'array',
      items: gqlType.ofType ? gqlTypeToJsonSchema(gqlType.ofType) : {},
    };
  }
  if (gqlType.kind === 'OBJECT') {
    return { type: 'object', description: gqlType.name || '' };
  }
  return { type: gqlTypeToJsonSchemaType(gqlType) };
}

/**
 * Parse a GraphQL introspection result data object into capabilities.
 * Accepts the data object from { data: { __schema: {...} } } responses.
 */
function parseIntrospectionResult(introspectionData) {
  const schema = introspectionData.__schema;
  if (!schema) {
    throw new Error('parseIntrospectionResult: expected introspectionData.__schema to be defined');
  }

  const rootTypeNames = new Set(
    [schema.queryType && schema.queryType.name, schema.mutationType && schema.mutationType.name].filter(Boolean)
  );

  const rootTypes = (schema.types || []).filter(function(t) { return rootTypeNames.has(t.name); });

  const capabilities = [];
  for (const type of rootTypes) {
    for (const field of (type.fields || [])) {
      capabilities.push({
        name: field.name,
        description: field.description || '',
        inputSchema: argsToJsonSchema(field.args || []),
        outputSchema: gqlTypeToJsonSchema(field.type),
        method: null,
        path: null,
        extensions: {
          parentType: type.name,
          returnType: field.type,
        },
      });
    }
  }

  return capabilities;
}

/**
 * Basic SDL extraction: find Query and Mutation type blocks, extract field names.
 */
function parseSDL(sdl, source) {
  const capabilities = [];
  const typeBlockRegex = /type\s+(Query|Mutation)\s*\{([^}]*)\}/gs;
  let match;
  while ((match = typeBlockRegex.exec(sdl)) !== null) {
    const typeName = match[1];
    const body = match[2];
    const fieldRegex = /^\s*(\w+)\s*(?:\([^)]*\))?\s*:/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      capabilities.push({
        name: fieldName,
        description: '',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: null,
        method: null,
        path: null,
        extensions: {
          parentType: typeName,
          source: source,
        },
      });
    }
  }
  return capabilities;
}

/**
 * Parse a GraphQL spec source into capabilities.
 */
async function parse(source, content) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: INTROSPECTION_QUERY }),
    });
    if (!response.ok) {
      throw new Error('GraphQL introspection failed: HTTP ' + response.status + ' from ' + source);
    }
    const json = await response.json();
    if (json.errors) {
      throw new Error('GraphQL introspection errors: ' + JSON.stringify(json.errors));
    }
    return parseIntrospectionResult(json.data);
  }

  let sdl = content;
  if (!sdl && (source.endsWith('.graphql') || source.endsWith('.gql'))) {
    const fs = require('fs');
    sdl = fs.readFileSync(source, 'utf8');
  }

  if (typeof sdl === 'string') {
    return parseSDL(sdl, source);
  }

  throw new Error('GraphQL parser: unrecognized source "' + source + '". Expected http/https URL or .graphql/.gql file.');
}

module.exports = {
  parse: parse,
  parseIntrospectionResult: parseIntrospectionResult,
  INTROSPECTION_QUERY: INTROSPECTION_QUERY,
  argsToJsonSchema: argsToJsonSchema,
  gqlTypeToJsonSchema: gqlTypeToJsonSchema,
};
