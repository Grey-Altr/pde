/**
 * tests/phase-168/generate.test.mjs
 * Tests for bin/lib/3d-pipeline/generate.cjs (TRD-01)
 *
 * All external dependencies (@huggingface/inference, convert3D) are mocked via
 * dependency injection (_hfClient, _convertFn parameters). No real HF API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Load module under test
// ---------------------------------------------------------------------------
const { generate3D } = require('../../bin/lib/3d-pipeline/generate.cjs');

// ---------------------------------------------------------------------------
// Minimal fake image Blob (as returned by HF textToImage)
// ---------------------------------------------------------------------------
const FAKE_IMAGE_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes

function makeFakeBlob(bytes = FAKE_IMAGE_BYTES) {
  return {
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

// ---------------------------------------------------------------------------
// Factory helpers for mock dependencies
// ---------------------------------------------------------------------------
function makeMockHfClient(options = {}) {
  return {
    textToImage: vi.fn().mockResolvedValue(options.blob || makeFakeBlob()),
  };
}

const DEFAULT_CONVERT_RESULT = {
  glbPath: '/tmp/pde-test/model.glb',
  metaPath: '/tmp/pde-test/model.meta.json',
  meta: {
    source_model: 'stabilityai/stable-fast-3d',
    input_type: 'image', // will be overridden to 'text' by generate3D
    input_hash: 'abc123',
    slug: 'model',
    file_size: 12,
    vertex_count: 100,
    timestamp: new Date().toISOString(),
    glb_path: '.planning/design/3d/model.glb',
  },
};

function makeMockConvertFn(result = DEFAULT_CONVERT_RESULT) {
  return vi.fn().mockResolvedValue(JSON.parse(JSON.stringify(result)));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('generate3D', () => {
  const originalToken = process.env.HF_TOKEN;

  beforeEach(() => {
    process.env.HF_TOKEN = 'test-token-456';
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.HF_TOKEN;
    } else {
      process.env.HF_TOKEN = originalToken;
    }
  });

  it('throws if HF_TOKEN is missing', async () => {
    delete process.env.HF_TOKEN;
    await expect(generate3D({ prompt: 'a red cube' })).rejects.toThrow('HF_TOKEN');
  });

  it('calls textToImage with FLUX.1-schnell model', async () => {
    const mockClient = makeMockHfClient();
    const mockConvert = makeMockConvertFn();

    await generate3D({
      prompt: 'a product display stand',
      slug: 'stand',
      _hfClient: mockClient,
      _convertFn: mockConvert,
    });

    expect(mockClient.textToImage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'black-forest-labs/FLUX.1-schnell',
        inputs: 'a product display stand',
      })
    );
  });

  it('passes image buffer to convert3D', async () => {
    const mockClient = makeMockHfClient();
    const mockConvert = makeMockConvertFn();

    await generate3D({
      prompt: 'a cube',
      slug: 'cube',
      _hfClient: mockClient,
      _convertFn: mockConvert,
    });

    expect(mockConvert).toHaveBeenCalledWith(
      expect.objectContaining({
        imageBuffer: expect.any(Buffer),
        slug: 'cube',
      })
    );
  });

  it('returns result with meta.input_type = "text"', async () => {
    const mockClient = makeMockHfClient();
    const mockConvert = makeMockConvertFn();

    const result = await generate3D({
      prompt: 'a sphere',
      slug: 'sphere',
      _hfClient: mockClient,
      _convertFn: mockConvert,
    });

    expect(result.meta.input_type).toBe('text');
  });

  it('includes prompt in returned meta', async () => {
    const mockClient = makeMockHfClient();
    const mockConvert = makeMockConvertFn();

    const result = await generate3D({
      prompt: 'a blue vase',
      slug: 'vase',
      _hfClient: mockClient,
      _convertFn: mockConvert,
    });

    expect(result.meta).toHaveProperty('prompt', 'a blue vase');
  });

  it('returns { glbPath, metaPath, meta }', async () => {
    const mockClient = makeMockHfClient();
    const mockConvert = makeMockConvertFn();

    const result = await generate3D({
      prompt: 'a table',
      slug: 'table',
      _hfClient: mockClient,
      _convertFn: mockConvert,
    });

    expect(result).toHaveProperty('glbPath');
    expect(result).toHaveProperty('metaPath');
    expect(result).toHaveProperty('meta');
    expect(typeof result.glbPath).toBe('string');
    expect(typeof result.metaPath).toBe('string');
    expect(typeof result.meta).toBe('object');
  });
});
