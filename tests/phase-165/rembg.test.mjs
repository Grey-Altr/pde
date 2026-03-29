/**
 * rembg.test.mjs — Tests for bin/lib/image-pipeline/rembg.cjs
 *
 * All 6 behaviors from the plan:
 *   REMBG-1: removeBackground() returns null and logs warning when REMOVEBG_API_KEY is not set
 *   REMBG-2: removeBackground() throws Error when monthly count >= 50
 *   REMBG-3: removeBackground() logs warning when monthly count >= 40
 *   REMBG-4: loadUsage() resets count to 0 when stored month differs from current month
 *   REMBG-5: removeBackground() increments usage count after successful API call (mock fetch)
 *   REMBG-6: removeBackground() calls remove.bg API with correct URL, X-Api-Key header (mock fetch)
 *   Security: API key is NOT stored in metadata sidecar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';

const require = createRequire(import.meta.url);

// ---- Helpers ----------------------------------------------------------------

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function prevMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/**
 * Create a tiny valid PNG buffer (1x1 pixel, minimal valid PNG).
 */
function makePngBuffer() {
  // Minimal valid 1x1 transparent PNG
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length + type
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, crc
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

// ---- Test setup -------------------------------------------------------------

let tmpDir;
let usageFilePath;
let inputFilePath;
let assetsDir;
let rembg; // will be re-required per test with patched env

// We patch USAGE_PATH by using environment variable override OR by mocking the module.
// Since the module uses process.cwd()-relative path, we inject via a wrapper approach.
// The simplest approach: require the module fresh, patch internal constants via monkey-patch.
// Actually, we'll use vi.mock for the usage file path via a helper approach.

// Since rembg.cjs uses process.cwd() for USAGE_PATH, we patch process.cwd() per test.
const originalCwd = process.cwd;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'rembg-test-'));
  usageFilePath = join(tmpDir, '.planning/cli-anything/removebg-usage.json');
  inputFilePath = join(tmpDir, 'input.png');
  assetsDir = join(tmpDir, 'assets');

  mkdirSync(dirname(usageFilePath), { recursive: true });
  mkdirSync(assetsDir, { recursive: true });

  // Write a valid input PNG
  writeFileSync(inputFilePath, makePngBuffer());

  // Override process.cwd() so USAGE_PATH resolves to tmpDir
  process.cwd = () => tmpDir;

  // Clear module cache to get a fresh instance with the patched cwd
  delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
  delete require.cache[require.resolve('../../bin/lib/image-pipeline/assets.cjs')];
  rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

  // Clear API key by default
  delete process.env.REMOVEBG_API_KEY;

  // Reset fetch mock
  vi.restoreAllMocks();
});

afterEach(() => {
  process.cwd = originalCwd;
  delete process.env.REMOVEBG_API_KEY;
  vi.restoreAllMocks();
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

// ---- REMBG-1 ----------------------------------------------------------------

describe('REMBG-1: no API key', () => {
  it('returns null when REMOVEBG_API_KEY is not set', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await rembg.removeBackground({ inputPath: inputFilePath, slug: 'test', outputDir: assetsDir });
    expect(result).toBeNull();
  });

  it('logs a warning when REMOVEBG_API_KEY is not set', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await rembg.removeBackground({ inputPath: inputFilePath, slug: 'test', outputDir: assetsDir });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('REMOVEBG_API_KEY'));
  });
});

// ---- REMBG-2 ----------------------------------------------------------------

describe('REMBG-2: usage limit reached', () => {
  it('throws Error when monthly count >= 50', async () => {
    process.env.REMOVEBG_API_KEY = 'test-key-123';
    // Write usage file with count at the limit
    writeFileSync(usageFilePath, JSON.stringify({ month: currentMonth(), count: 50 }));
    // Re-require with fresh state
    delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
    rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

    await expect(
      rembg.removeBackground({ inputPath: inputFilePath, slug: 'test', outputDir: assetsDir })
    ).rejects.toThrow(/50/);
  });
});

// ---- REMBG-3 ----------------------------------------------------------------

describe('REMBG-3: usage warning threshold', () => {
  it('logs warning when monthly count >= 40 (but < 50)', async () => {
    process.env.REMOVEBG_API_KEY = 'test-key-123';
    writeFileSync(usageFilePath, JSON.stringify({ month: currentMonth(), count: 42 }));
    delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
    rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => makePngBuffer().buffer,
    });

    await rembg.removeBackground({ inputPath: inputFilePath, slug: 'test-warn', outputDir: assetsDir });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/42/));
  });
});

// ---- REMBG-4 ----------------------------------------------------------------

describe('REMBG-4: monthly reset', () => {
  it('resets count to 0 when stored month differs from current month', () => {
    writeFileSync(usageFilePath, JSON.stringify({ month: prevMonth(), count: 35 }));
    delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
    rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

    const usage = rembg.loadUsage();
    expect(usage.count).toBe(0);
    expect(usage.month).toBe(currentMonth());
  });

  it('returns fresh { month, count: 0 } when usage file does not exist', () => {
    // No file written — should return defaults
    const usage = rembg.loadUsage();
    expect(usage.count).toBe(0);
    expect(usage.month).toBe(currentMonth());
  });
});

// ---- REMBG-5 ----------------------------------------------------------------

describe('REMBG-5: usage count increment', () => {
  it('increments usage count after successful API call', async () => {
    process.env.REMOVEBG_API_KEY = 'test-key-123';
    writeFileSync(usageFilePath, JSON.stringify({ month: currentMonth(), count: 5 }));
    delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
    rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => makePngBuffer().buffer,
    });

    await rembg.removeBackground({ inputPath: inputFilePath, slug: 'test-count', outputDir: assetsDir });

    const usage = JSON.parse(readFileSync(usageFilePath, 'utf8'));
    expect(usage.count).toBe(6);
  });
});

// ---- REMBG-6 ----------------------------------------------------------------

describe('REMBG-6: API call correctness', () => {
  it('calls remove.bg API with correct URL and X-Api-Key header', async () => {
    process.env.REMOVEBG_API_KEY = 'my-secret-key';
    delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
    rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

    let capturedUrl;
    let capturedHeaders;
    global.fetch = vi.fn().mockImplementation(async (url, opts) => {
      capturedUrl = url;
      capturedHeaders = opts.headers;
      return { ok: true, arrayBuffer: async () => makePngBuffer().buffer };
    });

    await rembg.removeBackground({ inputPath: inputFilePath, slug: 'test-api', outputDir: assetsDir });

    expect(capturedUrl).toBe('https://api.remove.bg/v1.0/removebg');
    expect(capturedHeaders['X-Api-Key']).toBe('my-secret-key');
  });

  it('throws on 429 rate limit response', async () => {
    process.env.REMOVEBG_API_KEY = 'my-secret-key';
    delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
    rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limit',
    });

    await expect(
      rembg.removeBackground({ inputPath: inputFilePath, slug: 'test-429', outputDir: assetsDir })
    ).rejects.toThrow(/rate limit/i);
  });

  it('throws on non-ok response with error detail', async () => {
    process.env.REMOVEBG_API_KEY = 'my-secret-key';
    delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
    rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      text: async () => 'payment required',
    });

    await expect(
      rembg.removeBackground({ inputPath: inputFilePath, slug: 'test-402', outputDir: assetsDir })
    ).rejects.toThrow(/402/);
  });
});

// ---- Security ---------------------------------------------------------------

describe('Security: API key not in metadata sidecar', () => {
  it('does not store API key in the meta.json sidecar', async () => {
    process.env.REMOVEBG_API_KEY = 'super-secret-key-do-not-leak';
    delete require.cache[require.resolve('../../bin/lib/image-pipeline/rembg.cjs')];
    rembg = require('../../bin/lib/image-pipeline/rembg.cjs');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => makePngBuffer().buffer,
    });

    const result = await rembg.removeBackground({ inputPath: inputFilePath, slug: 'test-security', outputDir: assetsDir });

    // Check the meta object itself
    const metaStr = JSON.stringify(result.meta);
    expect(metaStr).not.toContain('super-secret-key-do-not-leak');

    // Also check the sidecar file on disk
    const metaFilePath = result.path.replace('.png', '.meta.json');
    const sidecarStr = readFileSync(metaFilePath, 'utf8');
    expect(sidecarStr).not.toContain('super-secret-key-do-not-leak');
  });
});
