/**
 * tests/phase-175/blender-chain.test.mjs
 * Tests for bin/lib/design-pipeline/blender-chain.cjs (PIPE-02)
 *
 * runBlenderGLBChain connects Blender export -> optimizeGLB -> generateEmbed.
 * Temp GLB is cleaned up in finally block on both success and failure.
 *
 * Mocking strategy: vi.spyOn on module exports for all CJS dependencies.
 * CJS require() caches modules, so spying on module.exports properties
 * intercepts calls from production code that lazy-requires the same path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import childProcess from 'child_process';
import { EventEmitter } from 'events';

const require = createRequire(import.meta.url);

// Load all dependency modules first so they're in require cache
const optimizeModule = require('../../bin/lib/3d-pipeline/optimize.cjs');
const embedModule = require('../../bin/lib/3d-pipeline/embed.cjs');

// Load production module AFTER dependencies are in cache
const { runBlenderGLBChain } = require('../../bin/lib/design-pipeline/blender-chain.cjs');

// Spy on module.exports properties — since CJS require() returns the same object,
// spying here intercepts calls from the production module's lazy require.
const spawnSpy = vi.spyOn(childProcess, 'spawn');
const optimizeGLBSpy = vi.spyOn(optimizeModule, 'optimizeGLB');
const generateEmbedSpy = vi.spyOn(embedModule, 'generateEmbed');

// --- Helpers ---

function makeMockProcess(exitCode = 0, stderrData = '') {
  const proc = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stdin = { write: vi.fn(), end: vi.fn() };
  setImmediate(() => {
    if (stderrData) proc.stderr.emit('data', stderrData);
    proc.emit('close', exitCode);
  });
  return proc;
}

// --- Tests ---

describe('runBlenderGLBChain', () => {
  let tempDir;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blender-chain-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('calls optimizeGLB with temp GLB path on successful Blender spawn', async () => {
    spawnSpy.mockReturnValue(makeMockProcess(0));
    optimizeGLBSpy.mockImplementation(({ inputPath, outputPath }) => {
      fs.writeFileSync(outputPath, Buffer.alloc(8));
      return { outputPath, sizeMB: '0.00' };
    });
    generateEmbedSpy.mockReturnValue({
      snippet: '<model-viewer src="test.glb"></model-viewer>',
      html: '<html></html>',
      embedPath: path.join(tempDir, 'test-embed.html'),
    });

    const registryEntry = {
      binaryPath: '/usr/bin/blender',
      version: '4.0',
      executionMode: 'headless',
    };

    const result = await runBlenderGLBChain({
      blendFile: path.join(tempDir, 'test.blend'),
      slug: 'test-asset',
      registryEntry,
      projectRoot: tempDir,
    });

    expect(optimizeGLBSpy).toHaveBeenCalledOnce();
    const optimizeCall = optimizeGLBSpy.mock.calls[0][0];
    expect(optimizeCall.inputPath).toMatch(/test-asset-raw-\d+\.glb$/);

    expect(generateEmbedSpy).toHaveBeenCalledOnce();
    const embedCall = generateEmbedSpy.mock.calls[0][0];
    expect(embedCall.slug).toBe('test-asset');

    expect(result).toHaveProperty('glbPath');
    expect(result).toHaveProperty('embedPath');
    expect(result).toHaveProperty('snippet');
  });

  it('rejects with "Blender export failed" on non-zero exit code', async () => {
    spawnSpy.mockReturnValue(makeMockProcess(1, 'Fatal error in Blender'));

    const registryEntry = {
      binaryPath: '/usr/bin/blender',
      version: '4.0',
      executionMode: 'headless',
    };

    await expect(
      runBlenderGLBChain({
        blendFile: path.join(tempDir, 'test.blend'),
        slug: 'test-asset',
        registryEntry,
        projectRoot: tempDir,
      })
    ).rejects.toThrow(/Blender export failed/i);
  });

  it('cleans up temp GLB after successful run', async () => {
    let capturedTempGlb;
    spawnSpy.mockReturnValue(makeMockProcess(0));
    optimizeGLBSpy.mockImplementation(({ inputPath, outputPath }) => {
      capturedTempGlb = inputPath;
      fs.writeFileSync(inputPath, Buffer.alloc(8));
      fs.writeFileSync(outputPath, Buffer.alloc(8));
      return { outputPath, sizeMB: '0.00' };
    });
    generateEmbedSpy.mockReturnValue({
      snippet: '<model-viewer></model-viewer>',
      html: '<html></html>',
      embedPath: path.join(tempDir, 'embed.html'),
    });

    const registryEntry = {
      binaryPath: '/usr/bin/blender',
      version: '4.0',
      executionMode: 'headless',
    };

    await runBlenderGLBChain({
      blendFile: path.join(tempDir, 'test.blend'),
      slug: 'cleanup-test',
      registryEntry,
      projectRoot: tempDir,
    });

    expect(capturedTempGlb).toBeTruthy();
    expect(fs.existsSync(capturedTempGlb)).toBe(false);
  });

  it('cleans up temp GLB when optimizeGLB throws', async () => {
    let capturedTempGlb;
    spawnSpy.mockReturnValue(makeMockProcess(0));
    optimizeGLBSpy.mockImplementation(({ inputPath }) => {
      capturedTempGlb = inputPath;
      fs.writeFileSync(inputPath, Buffer.alloc(8));
      throw new Error('gltf-transform draco failed');
    });

    const registryEntry = {
      binaryPath: '/usr/bin/blender',
      version: '4.0',
      executionMode: 'headless',
    };

    await expect(
      runBlenderGLBChain({
        blendFile: path.join(tempDir, 'test.blend'),
        slug: 'fail-test',
        registryEntry,
        projectRoot: tempDir,
      })
    ).rejects.toThrow();

    expect(capturedTempGlb).toBeTruthy();
    expect(fs.existsSync(capturedTempGlb)).toBe(false);
  });
});
