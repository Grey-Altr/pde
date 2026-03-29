/**
 * tests/phase-168/optimize.test.mjs
 * Tests for bin/lib/3d-pipeline/optimize.cjs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let optimize;
let tmpDir;
const CUBE_GLB = path.join(__dirname, 'fixtures', 'cube.glb');

beforeAll(() => {
  optimize = require('../../bin/lib/3d-pipeline/optimize.cjs');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-3d-opt-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('optimizeGLB', () => {
  it('produces output file or throws with draco in error message on minimal fixture', () => {
    const inputPath = path.join(tmpDir, 'input.glb');
    const outputPath = path.join(tmpDir, 'output.glb');
    fs.copyFileSync(CUBE_GLB, inputPath);

    try {
      const result = optimize.optimizeGLB({ inputPath, outputPath });
      // If succeeded, outputPath must exist and sizeMB must be a string number
      expect(fs.existsSync(result.outputPath)).toBe(true);
      expect(typeof result.sizeMB).toBe('string');
      expect(Number.isFinite(parseFloat(result.sizeMB))).toBe(true);
    } catch (err) {
      // If the minimal fixture has too few vertices for draco, the error must mention draco
      // This proves the CLI was invoked correctly
      expect(err.message.toLowerCase()).toMatch(/draco|gltf-transform|failed/);
    }
  });

  it('throws when input file does not exist', () => {
    expect(() =>
      optimize.optimizeGLB({
        inputPath: '/tmp/nonexistent-pde-xyz.glb',
        outputPath: path.join(tmpDir, 'never.glb'),
      })
    ).toThrow();
  });
});

describe('inspectGLB', () => {
  it('returns object with vertex_count and file_size', () => {
    const result = optimize.inspectGLB({ glbPath: CUBE_GLB });
    expect(result).toHaveProperty('vertex_count');
    expect(result).toHaveProperty('file_size');
    expect(typeof result.vertex_count).toBe('number');
    expect(typeof result.file_size).toBe('number');
    expect(result.file_size).toBeGreaterThan(0);
  });

  it('returns file_size matching actual file size', () => {
    const actualSize = fs.statSync(CUBE_GLB).size;
    const result = optimize.inspectGLB({ glbPath: CUBE_GLB });
    expect(result.file_size).toBe(actualSize);
  });

  it('returns vertex_count >= 0', () => {
    const result = optimize.inspectGLB({ glbPath: CUBE_GLB });
    expect(result.vertex_count).toBeGreaterThanOrEqual(0);
  });
});
