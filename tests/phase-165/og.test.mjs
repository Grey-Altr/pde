import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const require = createRequire(import.meta.url);
const { generateOgImage } = require('../../bin/lib/image-pipeline/og.cjs');

// PNG magic bytes: 0x89 0x50 0x4E 0x47
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'og-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('generateOgImage()', () => {
  it('Test OG-1: returns a PNG buffer starting with PNG magic bytes', async () => {
    const result = await generateOgImage({
      title: 'My Product',
      description: 'A great product description',
      slug: 'my-product',
      outputDir: tmpDir,
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(100);
    // Check PNG magic bytes: 89 50 4E 47
    expect(result.buffer[0]).toBe(0x89);
    expect(result.buffer[1]).toBe(0x50);
    expect(result.buffer[2]).toBe(0x4e);
    expect(result.buffer[3]).toBe(0x47);
  });

  it('Test OG-2: returns { path, meta } where meta.dimensions = { width: 1200, height: 630 }', async () => {
    const result = await generateOgImage({
      title: 'My Product',
      description: 'A great description',
      slug: 'my-product',
      outputDir: tmpDir,
    });

    expect(result.path).toBeTruthy();
    expect(result.meta).toBeTruthy();
    expect(result.meta.dimensions).toEqual({ width: 1200, height: 630 });
  });

  it('Test OG-3: writes .meta.json sidecar with type="og"', async () => {
    const result = await generateOgImage({
      title: 'My Product',
      description: 'A great description',
      slug: 'sidecar-test',
      outputDir: tmpDir,
    });

    expect(existsSync(result.path)).toBe(true);
    const metaPath = result.path.replace('.png', '.meta.json');
    expect(existsSync(metaPath)).toBe(true);

    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    expect(meta.type).toBe('og');
  });
});
