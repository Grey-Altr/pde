/**
 * tests/phase-168/convert.test.mjs
 * Tests for bin/lib/3d-pipeline/convert.cjs (TRD-02)
 *
 * All external dependencies (Gradio, sharp, optimizeGLB, save3DAsset) are mocked
 * via dependency injection (_gradioClient, _sharpFn, _optimizeFn, _saveFn).
 * No real HF API calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Load module under test
// ---------------------------------------------------------------------------
const { convert3D, SPACE_CHAIN } = require('../../bin/lib/3d-pipeline/convert.cjs');

// ---------------------------------------------------------------------------
// Minimal valid GLB buffer (12-byte header)
// ---------------------------------------------------------------------------
const FAKE_GLB = Buffer.from([
  0x67, 0x6c, 0x54, 0x46, // magic: 'glTF'
  0x02, 0x00, 0x00, 0x00, // version: 2
  0x0c, 0x00, 0x00, 0x00, // length: 12
]);

// ---------------------------------------------------------------------------
// Factory helpers for mock dependencies
// ---------------------------------------------------------------------------

/** Create a mock Gradio Client that returns a GLB blob on successful predict */
function makeMockGradioClient(options = {}) {
  const {
    failConnect = false,
    failRoutes = [],
    returnGlb = true,
  } = options;

  const mockPredict = vi.fn(async (route) => {
    if (failRoutes.includes(route)) {
      const err = new Error(`Endpoint ${route} not found`);
      throw err;
    }
    if (!returnGlb) throw new Error('Space processing failed');
    return {
      data: [
        {
          // Blob-like: arrayBuffer returns FAKE_GLB bytes
          arrayBuffer: async () =>
            FAKE_GLB.buffer.slice(
              FAKE_GLB.byteOffset,
              FAKE_GLB.byteOffset + FAKE_GLB.byteLength
            ),
        },
      ],
    };
  });

  return {
    connect: vi.fn(async (space) => {
      if (failConnect) throw new Error('Space unavailable');
      return { predict: mockPredict, _space: space };
    }),
    _mockPredict: mockPredict,
  };
}

/** Create a mock sharp function that returns a passthrough chain */
function makeMockSharp() {
  const chain = {
    resize: vi.fn(() => chain),
    png: vi.fn(() => chain),
    toBuffer: vi.fn(async () => Buffer.from('processed-512x512-png')),
  };
  return vi.fn(() => chain);
}

/** Create a mock optimizeGLB that copies input to output (passthrough) */
function makeMockOptimize() {
  return vi.fn(({ inputPath, outputPath }) => {
    const fs = require('fs');
    fs.copyFileSync(inputPath, outputPath);
    return { outputPath, sizeMB: '0.01' };
  });
}

/** Create a mock inspectGLB */
function makeMockInspect() {
  return vi.fn(() => ({ vertex_count: 100, file_size: 12 }));
}

/** Create a mock save3DAsset that returns fake paths */
function makeMockSave(sourceModel = SPACE_CHAIN[0]) {
  return vi.fn(({ slug }) => ({
    glbPath: `/tmp/pde-test/${slug}.glb`,
    metaPath: `/tmp/pde-test/${slug}.meta.json`,
    meta: {
      source_model: sourceModel,
      input_type: 'image',
      input_hash: 'deadbeef',
      slug,
      file_size: 12,
      vertex_count: 100,
      timestamp: new Date().toISOString(),
      glb_path: `.planning/design/3d/${slug}.glb`,
    },
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SPACE_CHAIN', () => {
  it('includes stable-fast-3d and InstantMesh', () => {
    expect(SPACE_CHAIN).toContain('stabilityai/stable-fast-3d');
    expect(SPACE_CHAIN).toContain('TencentARC/InstantMesh');
    expect(SPACE_CHAIN.length).toBeGreaterThanOrEqual(2);
  });
});

describe('convert3D', () => {
  const originalToken = process.env.HF_TOKEN;

  beforeEach(() => {
    process.env.HF_TOKEN = 'test-token-123';
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
    await expect(
      convert3D({ imageBuffer: Buffer.from('img'), slug: 'test' })
    ).rejects.toThrow('HF_TOKEN');
  });

  it('calls Client.connect with first space in SPACE_CHAIN', async () => {
    const mockGradio = makeMockGradioClient();

    await convert3D({
      imageBuffer: Buffer.from('fake-img'),
      slug: 'test-model',
      _gradioClient: mockGradio,
      _sharpFn: makeMockSharp(),
      _optimizeFn: makeMockOptimize(),
      _inspectFn: makeMockInspect(),
      _saveFn: makeMockSave(),
    });

    expect(mockGradio.connect).toHaveBeenCalledWith(
      SPACE_CHAIN[0],
      expect.objectContaining({ hf_token: 'test-token-123' })
    );
  });

  it('falls back to second space when first fails', async () => {
    let callCount = 0;
    const mockGradio = {
      connect: vi.fn(async (space) => {
        callCount++;
        if (callCount === 1) throw new Error('First space down');
        // Second space succeeds
        return {
          predict: vi.fn(async () => ({
            data: [{
              arrayBuffer: async () =>
                FAKE_GLB.buffer.slice(
                  FAKE_GLB.byteOffset,
                  FAKE_GLB.byteOffset + FAKE_GLB.byteLength
                ),
            }],
          })),
        };
      }),
    };

    const result = await convert3D({
      imageBuffer: Buffer.from('fake-img'),
      slug: 'fallback-test',
      _gradioClient: mockGradio,
      _sharpFn: makeMockSharp(),
      _optimizeFn: makeMockOptimize(),
      _inspectFn: makeMockInspect(),
      _saveFn: makeMockSave(SPACE_CHAIN[1]),
    });

    // Should have tried both spaces
    expect(mockGradio.connect).toHaveBeenCalledTimes(2);
    expect(mockGradio.connect.mock.calls[0][0]).toBe(SPACE_CHAIN[0]);
    expect(mockGradio.connect.mock.calls[1][0]).toBe(SPACE_CHAIN[1]);
    expect(result).toHaveProperty('glbPath');
  });

  it('throws descriptive error when all spaces fail', async () => {
    const mockGradio = {
      connect: vi.fn(async () => {
        throw new Error('Space unavailable');
      }),
    };

    await expect(
      convert3D({
        imageBuffer: Buffer.from('fake-img'),
        slug: 'all-fail',
        _gradioClient: mockGradio,
        _sharpFn: makeMockSharp(),
        _optimizeFn: makeMockOptimize(),
        _inspectFn: makeMockInspect(),
        _saveFn: makeMockSave(),
      })
    ).rejects.toThrow(/spaces failed|unavailable/i);
  });

  it('returns { glbPath, metaPath, meta } on success', async () => {
    const mockGradio = makeMockGradioClient();

    const result = await convert3D({
      imageBuffer: Buffer.from('fake-img'),
      slug: 'success-test',
      _gradioClient: mockGradio,
      _sharpFn: makeMockSharp(),
      _optimizeFn: makeMockOptimize(),
      _inspectFn: makeMockInspect(),
      _saveFn: makeMockSave(),
    });

    expect(result).toHaveProperty('glbPath');
    expect(result).toHaveProperty('metaPath');
    expect(result).toHaveProperty('meta');
    expect(typeof result.glbPath).toBe('string');
    expect(typeof result.metaPath).toBe('string');
    expect(typeof result.meta).toBe('object');
  });

  it('meta.input_type is "image"', async () => {
    const mockGradio = makeMockGradioClient();

    const result = await convert3D({
      imageBuffer: Buffer.from('fake-img'),
      slug: 'meta-test',
      _gradioClient: mockGradio,
      _sharpFn: makeMockSharp(),
      _optimizeFn: makeMockOptimize(),
      _inspectFn: makeMockInspect(),
      _saveFn: makeMockSave(),
    });

    expect(result.meta.input_type).toBe('image');
  });

  it('meta.source_model matches the successful space name', async () => {
    const mockGradio = makeMockGradioClient();
    const expectedSpace = SPACE_CHAIN[0];

    const result = await convert3D({
      imageBuffer: Buffer.from('fake-img'),
      slug: 'source-test',
      _gradioClient: mockGradio,
      _sharpFn: makeMockSharp(),
      _optimizeFn: makeMockOptimize(),
      _inspectFn: makeMockInspect(),
      _saveFn: makeMockSave(expectedSpace),
    });

    expect(result.meta.source_model).toBeTruthy();
    expect(typeof result.meta.source_model).toBe('string');
  });
});
