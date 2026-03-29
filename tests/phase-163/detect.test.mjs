import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { detectSpecType } = require('../../bin/lib/cli-anything/detect.cjs');

describe('detectSpecType', () => {
  it("returns 'mcp' for mcp:// source", () => {
    expect(detectSpecType('mcp://my-server', null)).toBe('mcp');
  });

  it("returns 'graphql' for .graphql extension", () => {
    expect(detectSpecType('schema.graphql', null)).toBe('graphql');
  });

  it("returns 'graphql' for .gql extension", () => {
    expect(detectSpecType('schema.gql', null)).toBe('graphql');
  });

  it("returns 'openapi' for content with openapi key", () => {
    expect(detectSpecType('spec.json', { openapi: '3.0.0' })).toBe('openapi');
  });

  it("returns 'openapi' for content with swagger key", () => {
    expect(detectSpecType('spec.json', { swagger: '2.0' })).toBe('openapi');
  });

  it("returns 'jsonschema' for content with $schema key", () => {
    expect(detectSpecType('spec.json', { $schema: 'https://json-schema.org/draft/2020-12/schema' })).toBe('jsonschema');
  });

  it("returns 'jsonschema' for content with type and properties keys", () => {
    expect(detectSpecType('spec.json', { type: 'object', properties: {} })).toBe('jsonschema');
  });

  it("returns 'http-probe' for https:// URL without content", () => {
    expect(detectSpecType('https://api.example.com', null)).toBe('http-probe');
  });

  it("returns 'http-probe' for http:// URL without content", () => {
    expect(detectSpecType('http://api.example.com', null)).toBe('http-probe');
  });

  it("returns 'unknown' for unrecognized source", () => {
    expect(detectSpecType('some-random-file.txt', null)).toBe('unknown');
  });
});
