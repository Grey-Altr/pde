import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const {
  computePhash,
  hammingDistance,
  classifyChange,
  runVisualDiff,
} = require('../../bin/lib/image-pipeline/visual-diff.cjs');

// Load fixture buffers
const redPng = readFileSync(join(__dirname, 'fixtures/red-100x100.png'));
const bluePng = readFileSync(join(__dirname, 'fixtures/blue-100x100.png'));
const redSlightPng = readFileSync(join(__dirname, 'fixtures/red-slight-100x100.png'));

let tmpDir;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'vdiff-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// computePhash()
// ---------------------------------------------------------------------------
describe('computePhash()', () => {
  it('returns an array of length 64', async () => {
    const hash = await computePhash(redPng);
    expect(hash).toHaveLength(64);
  });

  it('all values are 0 or 1', async () => {
    const hash = await computePhash(redPng);
    expect(hash.every(b => b === 0 || b === 1)).toBe(true);
  });

  it('same image twice produces identical hash', async () => {
    const h1 = await computePhash(redPng);
    const h2 = await computePhash(redPng);
    expect(h1).toEqual(h2);
  });

  it('identical buffers produce Hamming distance 0', async () => {
    const h1 = await computePhash(redPng);
    const h2 = await computePhash(redPng);
    expect(hammingDistance(h1, h2)).toBe(0);
  });

  it('red and blue images produce Hamming distance > 0', async () => {
    const hRed = await computePhash(redPng);
    const hBlue = await computePhash(bluePng);
    expect(hammingDistance(hRed, hBlue)).toBeGreaterThan(0);
  });

  it('red-slight image produces non-zero distance from solid red (images differ perceptually)', async () => {
    // Note: pHash on solid-color synthetic images can produce counterintuitive
    // relative distances (Pitfall 5 in RESEARCH.md). We only assert that the
    // slight variant IS distinct from solid red (distance > 0), not that it's
    // "closer" to red than blue — that ordering is unreliable for uniform images.
    const hRed = await computePhash(redPng);
    const hSlight = await computePhash(redSlightPng);
    const distSlight = hammingDistance(hRed, hSlight);
    expect(distSlight).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// hammingDistance()
// ---------------------------------------------------------------------------
describe('hammingDistance()', () => {
  it('all-zero vs all-zero returns 0', () => {
    const zeros = new Array(64).fill(0);
    expect(hammingDistance(zeros, zeros)).toBe(0);
  });

  it('all-zero vs all-one returns 64', () => {
    const zeros = new Array(64).fill(0);
    const ones = new Array(64).fill(1);
    expect(hammingDistance(zeros, ones)).toBe(64);
  });

  it('first half different returns 32', () => {
    const a = new Array(64).fill(0);
    const b = [...new Array(32).fill(1), ...new Array(32).fill(0)];
    expect(hammingDistance(a, b)).toBe(32);
  });

  it('single bit different returns 1', () => {
    const a = new Array(64).fill(0);
    const b = new Array(64).fill(0);
    b[0] = 1;
    expect(hammingDistance(a, b)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// classifyChange()
// ---------------------------------------------------------------------------
describe('classifyChange()', () => {
  it('distance 0 returns tier "unchanged" and score 0', () => {
    const result = classifyChange(0);
    expect(result.tier).toBe('unchanged');
    expect(result.score).toBe(0);
  });

  it('distance 1 returns tier "minor"', () => {
    expect(classifyChange(1).tier).toBe('minor');
  });

  it('distance 5 returns tier "minor" with score ~8', () => {
    const result = classifyChange(5);
    expect(result.tier).toBe('minor');
    expect(result.score).toBe(Math.round((5 / 64) * 100));
  });

  it('distance 6 returns tier "significant"', () => {
    expect(classifyChange(6).tier).toBe('significant');
  });

  it('distance 15 returns tier "significant" with score ~23', () => {
    const result = classifyChange(15);
    expect(result.tier).toBe('significant');
    expect(result.score).toBe(Math.round((15 / 64) * 100));
  });

  it('distance 16 returns tier "major" with score 25', () => {
    const result = classifyChange(16);
    expect(result.tier).toBe('major');
    expect(result.score).toBe(25);
  });

  it('distance 20 returns tier "major" with score ~31', () => {
    const result = classifyChange(20);
    expect(result.tier).toBe('major');
    expect(result.score).toBe(Math.round((20 / 64) * 100));
  });

  it('score is always Math.round((dist/64)*100)', () => {
    for (const dist of [0, 1, 5, 6, 10, 15, 16, 32, 64]) {
      expect(classifyChange(dist).score).toBe(Math.round((dist / 64) * 100));
    }
  });
});

// ---------------------------------------------------------------------------
// runVisualDiff()
// ---------------------------------------------------------------------------
describe('runVisualDiff()', () => {
  it('writes a .md report file to assetsDir', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    expect(result.reportPath).toBeDefined();
    expect(existsSync(result.reportPath)).toBe(true);
    expect(result.reportPath).toMatch(/\.md$/);
  });

  it('writes a .json sidecar file to assetsDir', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    expect(result.jsonPath).toBeDefined();
    expect(existsSync(result.jsonPath)).toBe(true);
    expect(result.jsonPath).toMatch(/\.json$/);
  });

  it('JSON sidecar has required top-level keys', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    const json = JSON.parse(readFileSync(result.jsonPath, 'utf8'));
    expect(json).toHaveProperty('branchA');
    expect(json).toHaveProperty('branchB');
    expect(json).toHaveProperty('generatedAt');
    expect(json).toHaveProperty('summary');
    expect(json).toHaveProperty('assets');
  });

  it('JSON summary has all 7 required count keys', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    const { summary } = JSON.parse(readFileSync(result.jsonPath, 'utf8'));
    expect(summary).toHaveProperty('total');
    expect(summary).toHaveProperty('unchanged');
    expect(summary).toHaveProperty('minor');
    expect(summary).toHaveProperty('significant');
    expect(summary).toHaveProperty('major');
    expect(summary).toHaveProperty('new');
    expect(summary).toHaveProperty('deleted');
  });

  it('HEAD vs HEAD produces only unchanged assets (no changed/new/deleted)', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    const { summary } = result;
    expect(summary.minor).toBe(0);
    expect(summary.significant).toBe(0);
    expect(summary.major).toBe(0);
    expect(summary.new).toBe(0);
    expect(summary.deleted).toBe(0);
  });

  it('assets array contains elements with required fields when changed', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    const { assets } = result;
    expect(Array.isArray(assets)).toBe(true);
    // All assets in HEAD vs HEAD should be unchanged
    for (const asset of assets) {
      expect(asset).toHaveProperty('path');
      expect(asset).toHaveProperty('status');
    }
  });

  it('unchanged assets have status "unchanged"', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    const { assets } = result;
    const nonUnchanged = assets.filter(a => a.status !== 'unchanged');
    expect(nonUnchanged).toHaveLength(0);
  });

  it('summary total equals unchanged count when HEAD vs HEAD', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    const { summary } = result;
    expect(summary.total).toBe(summary.unchanged);
  });

  it('branchA and branchB are recorded correctly in JSON', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    const json = JSON.parse(readFileSync(result.jsonPath, 'utf8'));
    expect(json.branchA).toBe('HEAD');
    expect(json.branchB).toBe('HEAD');
  });

  it('generatedAt is a valid ISO timestamp', async () => {
    const result = await runVisualDiff({
      branchA: 'HEAD',
      branchB: 'HEAD',
      assetsDir: tmpDir,
      cwd: process.cwd(),
    });

    const json = JSON.parse(readFileSync(result.jsonPath, 'utf8'));
    expect(json.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
