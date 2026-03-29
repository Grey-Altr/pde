/**
 * tests/phase-169/cad.test.mjs
 * Tests for bin/lib/3d-pipeline/cad.cjs (TRD-06, TRD-07)
 *
 * All subprocess calls are mocked via dependency injection (_execFn).
 * No real Python/CadQuery installation required.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cad;
let tmpDir;

const FIXTURE_STEP = path.join(__dirname, 'fixtures', 'simple-box.step');

beforeAll(() => {
  cad = require('../../bin/lib/3d-pipeline/cad.cjs');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-cad-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// checkCadQuery
// ---------------------------------------------------------------------------
describe('checkCadQuery', () => {
  it('returns true when _execFn does not throw', () => {
    const mockExecFn = vi.fn().mockReturnValue('');
    const result = cad.checkCadQuery('python3', mockExecFn);
    expect(result).toBe(true);
  });

  it('returns false when _execFn throws', () => {
    const throwingExecFn = vi.fn().mockImplementation(() => {
      throw new Error('No module named cadquery');
    });
    const result = cad.checkCadQuery('python3', throwingExecFn);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPythonVersion
// ---------------------------------------------------------------------------
describe('getPythonVersion', () => {
  it('parses "Python 3.11.11" correctly', () => {
    const mockExecFn = vi.fn().mockReturnValue('Python 3.11.11\n');
    const result = cad.getPythonVersion('python3', mockExecFn);
    expect(result).toEqual({ major: 3, minor: 11 });
  });

  it('returns null on failure', () => {
    const throwingExecFn = vi.fn().mockImplementation(() => {
      throw new Error('python3 not found');
    });
    const result = cad.getPythonVersion('python3', throwingExecFn);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateStep
// ---------------------------------------------------------------------------
describe('validateStep', () => {
  it('returns valid=true for fixture file', () => {
    const result = cad.validateStep(FIXTURE_STEP);
    expect(result.valid).toBe(true);
    expect(typeof result.size).toBe('number');
    expect(result.size).toBeGreaterThan(0);
  });

  it('returns valid=false for missing file', () => {
    const result = cad.validateStep(path.join(tmpDir, 'nonexistent-file.step'));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('file does not exist');
  });

  it('returns valid=false for empty file', () => {
    const emptyPath = path.join(tmpDir, 'empty.step');
    fs.writeFileSync(emptyPath, '');
    const result = cad.validateStep(emptyPath);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('file is empty');
  });

  it('returns valid=false for wrong header', () => {
    const badPath = path.join(tmpDir, 'bad-header.step');
    fs.writeFileSync(badPath, 'NOT-A-STEP-FILE\nsome other content\n');
    const result = cad.validateStep(badPath);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing ISO-10303-21 header');
  });
});

// ---------------------------------------------------------------------------
// saveCADAsset
// ---------------------------------------------------------------------------
describe('saveCADAsset', () => {
  it('writes .step + .cq.py + .meta.json files', () => {
    const result = cad.saveCADAsset({
      slug: 'bracket',
      stepPath: FIXTURE_STEP,
      scriptContent: 'import cadquery as cq\n',
      params: { length: 80 },
      assetsDir: tmpDir,
    });

    const stepFiles = fs.readdirSync(tmpDir).filter(f => f.match(/^bracket-.*\.step$/));
    const scriptFiles = fs.readdirSync(tmpDir).filter(f => f.match(/^bracket-.*\.cq\.py$/));
    const metaFiles = fs.readdirSync(tmpDir).filter(f => f.match(/^bracket-.*\.meta\.json$/));

    expect(stepFiles.length).toBeGreaterThanOrEqual(1);
    expect(scriptFiles.length).toBeGreaterThanOrEqual(1);
    expect(metaFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('metadata contains required fields', () => {
    const result = cad.saveCADAsset({
      slug: 'bracket-meta',
      stepPath: FIXTURE_STEP,
      scriptContent: 'import cadquery as cq\n',
      params: { length: 80 },
      assetsDir: tmpDir,
    });

    const meta = JSON.parse(fs.readFileSync(result.metaPath, 'utf8'));

    expect(meta).toHaveProperty('source_script');
    expect(meta).toHaveProperty('params');
    expect(meta).toHaveProperty('timestamp');
    expect(meta).toHaveProperty('file_size');
    expect(meta).toHaveProperty('step_version');
    expect(meta).toHaveProperty('slug');
    expect(meta).toHaveProperty('step_path');

    expect(meta.step_version).toBe('ISO-10303-21');
    expect(meta.params.length).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// runCadScript
// ---------------------------------------------------------------------------
describe('runCadScript', () => {
  it('calls _execFn with python binary, script path, and output path', () => {
    const mockExec = vi.fn();
    cad.runCadScript({
      pythonBin: 'python3',
      scriptContent: 'print("ok")',
      outputStepPath: '/tmp/out.step',
      _execFn: mockExec,
    });

    expect(mockExec).toHaveBeenCalledTimes(1);
    const callArgs = mockExec.mock.calls[0];
    expect(callArgs[0]).toBe('python3');
    expect(Array.isArray(callArgs[1])).toBe(true);
    expect(callArgs[1][1]).toBe('/tmp/out.step');
  });

  it('cleans up temp script file on subprocess error', () => {
    const thrownExecFn = vi.fn().mockImplementation(() => {
      throw new Error('python crashed');
    });

    let caught = false;
    try {
      cad.runCadScript({
        pythonBin: 'python3',
        scriptContent: 'raise Exception("fail")',
        outputStepPath: '/tmp/fail-out.step',
        _execFn: thrownExecFn,
      });
    } catch (err) {
      caught = true;
    }

    expect(caught).toBe(true);

    // Verify no pde-cad-*.py temp files remain from this call
    const tmpFiles = fs.readdirSync(os.tmpdir()).filter(f => f.match(/^pde-cad-\d+\.py$/));
    // All temp files should have been cleaned up
    expect(tmpFiles.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// generateCAD
// ---------------------------------------------------------------------------
describe('generateCAD', () => {
  it('returns result with meta containing step_version', async () => {
    let callCount = 0;
    const mockExecFn = vi.fn().mockImplementation((bin, args) => {
      callCount++;
      // First call: checkCadQuery (import cadquery) — succeed
      if (args && args[0] === '-c') return '';
      // Second call: getPythonVersion (--version)
      if (args && args[0] === '--version') return 'Python 3.11.11\n';
      // Third call: runCadScript — write a valid STEP file at outputStepPath
      if (args && args.length === 2) {
        const outputPath = args[1];
        fs.copyFileSync(FIXTURE_STEP, outputPath);
        return '';
      }
      return '';
    });

    const result = await cad.generateCAD({
      description: 'simple box for testing',
      slug: 'test-box',
      _execFn: mockExecFn,
      _scriptContent: 'import cadquery as cq\nPARAMS = {"length": 80.0, "width": 50.0, "height": 25.0}\nresult = cq.Workplane("XY").box(PARAMS["length"], PARAMS["width"], PARAMS["height"])\nimport sys\noutput_path = sys.argv[1] if len(sys.argv) > 1 else "output.step"\ncq.exporters.export(result, output_path, exportType="STEP")\n',
      assetsDir: tmpDir,
    });

    expect(result.meta.step_version).toBe('ISO-10303-21');
    expect(fs.existsSync(result.stepPath)).toBe(true);
  });

  it('throws with install instructions when CadQuery not available', async () => {
    const throwingMock = vi.fn().mockImplementation(() => {
      throw new Error('No module named cadquery');
    });

    await expect(
      cad.generateCAD({
        description: 'box',
        slug: 'box',
        _execFn: throwingMock,
      })
    ).rejects.toThrow('CadQuery not found');
  });
});
