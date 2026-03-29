/**
 * tests/phase-175/gimp-chain.test.mjs
 * Tests for bin/lib/design-pipeline/gimp-chain.cjs (PIPE-03)
 *
 * buildRetouchScript: version-aware Script-Fu generation (2.x vs 3.x)
 * runGIMPRetouchChain: spawns GIMP, reads temp PNG, calls saveAsset with type='mockup'
 * Temp PNG cleaned up in finally block on both success and failure.
 *
 * Mocking strategy: vi.spyOn on module.exports for all CJS dependencies.
 * Version strings must use parseMajorVersion-compatible format: "GIMP X.Y.Z"
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
const assetsModule = require('../../bin/lib/image-pipeline/assets.cjs');
// gimp-wrapper is required inside buildRetouchScript — load it to be in cache
const gimpWrapperModule = require('../../bin/lib/app-wrappers/gimp-wrapper.cjs');

// Load production module AFTER dependencies are cached
const { runGIMPRetouchChain, buildRetouchScript } = require('../../bin/lib/design-pipeline/gimp-chain.cjs');

// Spy on module.exports properties
const spawnSpy = vi.spyOn(childProcess, 'spawn');
const saveAssetSpy = vi.spyOn(assetsModule, 'saveAsset');
// Do NOT spy on buildGimpArgs/parseMajorVersion — let real implementations run

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

describe('buildRetouchScript', () => {
  // parseMajorVersion in gimp-wrapper.cjs matches: /(?:GIMP|version)\s+(\d+)\./i
  // So version strings must be "GIMP X.Y.Z" or "version X.Y.Z"

  it('returns Script-Fu with file-png-save for GIMP version 2.10.36', () => {
    const registryEntry = { version: 'GIMP 2.10.36', binaryPath: '/usr/bin/gimp' };
    const script = buildRetouchScript({
      inputPath: '/tmp/input.png',
      outputPath: '/tmp/output.png',
      registryEntry,
    });
    expect(script).toContain('file-png-save');
    expect(script).not.toContain('gimp-file-export');
  });

  it('returns Script-Fu with gimp-file-export for GIMP version 3.0.2', () => {
    const registryEntry = { version: 'GIMP 3.0.2', binaryPath: '/usr/bin/gimp-3.0' };
    const script = buildRetouchScript({
      inputPath: '/tmp/input.png',
      outputPath: '/tmp/output.png',
      registryEntry,
    });
    expect(script).toContain('gimp-file-export');
    expect(script).not.toContain('file-png-save');
  });

  it('includes brightness/contrast adjustment in both versions', () => {
    const entry2 = { version: 'GIMP 2.10.36', binaryPath: '/usr/bin/gimp' };
    const entry3 = { version: 'GIMP 3.0.2', binaryPath: '/usr/bin/gimp-3.0' };

    const script2 = buildRetouchScript({ inputPath: '/tmp/in.png', outputPath: '/tmp/out.png', registryEntry: entry2 });
    const script3 = buildRetouchScript({ inputPath: '/tmp/in.png', outputPath: '/tmp/out.png', registryEntry: entry3 });

    expect(script2).toContain('gimp-brightness-contrast');
    expect(script3).toContain('gimp-brightness-contrast');
  });
});

describe('runGIMPRetouchChain', () => {
  let tempDir;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gimp-chain-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('calls saveAsset with type="mockup" and slug containing "-gimp-retouched"', async () => {
    const registryEntry = {
      binaryPath: '/usr/bin/gimp',
      version: 'GIMP 2.10.36',
      executionMode: 'headless',
    };

    const inputPngPath = path.join(tempDir, 'input.png');
    fs.writeFileSync(inputPngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    saveAssetSpy.mockReturnValue({
      path: path.join(tempDir, 'mockup', 'my-asset-gimp-retouched-123.png'),
      metaPath: path.join(tempDir, 'mockup', 'my-asset-gimp-retouched-123.meta.json'),
      meta: { type: 'mockup', hash: 'abc123' },
    });

    spawnSpy.mockImplementation((cmd, args) => {
      const proc = new EventEmitter();
      proc.stderr = new EventEmitter();
      proc.stdout = new EventEmitter();
      proc.stdin = { write: vi.fn(), end: vi.fn() };
      setImmediate(() => {
        // The scriptFu contains the temp output path inside quotes.
        // Match a path like /tmp/my-asset-gimp-1234567890123.png
        const argsStr = JSON.stringify(args);
        const match = argsStr.match(/(\/[^"]*gimp-\d+\.png)/);
        if (match) {
          try { fs.writeFileSync(match[1], Buffer.from('fake-png-data')); } catch (_) {}
        }
        proc.emit('close', 0);
      });
      return proc;
    });

    const result = await runGIMPRetouchChain({
      inputPngPath,
      slug: 'my-asset',
      registryEntry,
    });

    expect(saveAssetSpy).toHaveBeenCalledOnce();
    const saveCall = saveAssetSpy.mock.calls[0][0];
    expect(saveCall.type).toBe('mockup');
    expect(saveCall.slug).toContain('-gimp-retouched');
    expect(result).toEqual(saveAssetSpy.mock.results[0].value);
  });

  it('rejects with "GIMP retouch failed" on non-zero exit code', async () => {
    const registryEntry = {
      binaryPath: '/usr/bin/gimp',
      version: 'GIMP 2.10.36',
      executionMode: 'headless',
    };

    const inputPngPath = path.join(tempDir, 'input.png');
    fs.writeFileSync(inputPngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    spawnSpy.mockReturnValue(makeMockProcess(1, 'GIMP error: Script-Fu error'));

    await expect(
      runGIMPRetouchChain({
        inputPngPath,
        slug: 'fail-asset',
        registryEntry,
      })
    ).rejects.toThrow(/GIMP retouch failed/i);
  });

  it('cleans up temp PNG after successful run', async () => {
    const registryEntry = {
      binaryPath: '/usr/bin/gimp',
      version: 'GIMP 2.10.36',
      executionMode: 'headless',
    };

    const inputPngPath = path.join(tempDir, 'input.png');
    fs.writeFileSync(inputPngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    let capturedTempOutput;

    spawnSpy.mockImplementation((cmd, args) => {
      const proc = new EventEmitter();
      proc.stderr = new EventEmitter();
      proc.stdout = new EventEmitter();
      proc.stdin = { write: vi.fn(), end: vi.fn() };
      setImmediate(() => {
        const argsStr = JSON.stringify(args);
        const match = argsStr.match(/(\/[^"]*gimp-\d+\.png)/);
        if (match) {
          capturedTempOutput = match[1];
          try { fs.writeFileSync(match[1], Buffer.from('fake-png-data')); } catch (_) {}
        }
        proc.emit('close', 0);
      });
      return proc;
    });

    saveAssetSpy.mockReturnValue({
      path: path.join(tempDir, 'test.png'),
      metaPath: path.join(tempDir, 'test.meta.json'),
      meta: { type: 'mockup' },
    });

    await runGIMPRetouchChain({
      inputPngPath,
      slug: 'cleanup-asset',
      registryEntry,
    });

    if (capturedTempOutput) {
      expect(fs.existsSync(capturedTempOutput)).toBe(false);
    }
  });

  it('cleans up temp PNG after GIMP spawn failure', async () => {
    const registryEntry = {
      binaryPath: '/usr/bin/gimp',
      version: 'GIMP 2.10.36',
      executionMode: 'headless',
    };

    const inputPngPath = path.join(tempDir, 'input.png');
    fs.writeFileSync(inputPngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    let capturedTempOutput;

    spawnSpy.mockImplementation((cmd, args) => {
      const proc = new EventEmitter();
      proc.stderr = new EventEmitter();
      proc.stdout = new EventEmitter();
      proc.stdin = { write: vi.fn(), end: vi.fn() };
      setImmediate(() => {
        const argsStr = JSON.stringify(args);
        const match = argsStr.match(/(\/[^"]*gimp-\d+\.png)/);
        if (match) {
          capturedTempOutput = match[1];
          try { fs.writeFileSync(match[1], Buffer.from('partial-data')); } catch (_) {}
        }
        proc.emit('close', 1);
      });
      return proc;
    });

    await expect(
      runGIMPRetouchChain({
        inputPngPath,
        slug: 'cleanup-fail',
        registryEntry,
      })
    ).rejects.toThrow(/GIMP retouch failed/i);

    if (capturedTempOutput) {
      expect(fs.existsSync(capturedTempOutput)).toBe(false);
    }
  });
});
