/**
 * tests/phase-173/pde-tools-app-register.test.mjs
 * TDD tests for pde-tools app register subcommand (REG-02)
 *
 * Tests: case 'register' presence, usage error, registerDynamicServer call, safeReadFile usage
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const pdeToolsPath = path.join(projectRoot, 'bin', 'pde-tools.cjs');

// Read the source once for source-inspection tests
const pdeToolsSource = fs.readFileSync(pdeToolsPath, 'utf8');

describe('pde-tools app register', () => {
  it('prints usage error to stderr and exits non-zero when no slug argument provided', () => {
    const result = spawnSync('node', [pdeToolsPath, 'app', 'register'], {
      encoding: 'utf8',
      cwd: projectRoot,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Usage: pde-tools app register');
  });

  it("source contains case 'register': in the app switch", () => {
    expect(pdeToolsSource).toContain("case 'register':");
  });

  it("default error message includes 'register' in the Available subcommands list", () => {
    expect(pdeToolsSource).toContain('Available: discover, probe, list, approve, wrap, register');
  });

  it("register case contains call to registerDynamicServer", () => {
    expect(pdeToolsSource).toContain('registerDynamicServer');
  });

  it("register case uses safeReadFile (not fs.readFileSync) for capability-model.json", () => {
    // The register case should use safeReadFile from core.cjs, not fs.readFileSync
    // Find the register case block and verify safeReadFile is used
    const registerIdx = pdeToolsSource.indexOf("case 'register':");
    expect(registerIdx).toBeGreaterThan(-1);

    // Get text from the register case to the next case/default
    const afterRegister = pdeToolsSource.slice(registerIdx);
    const nextCaseIdx = afterRegister.indexOf('default:');
    const registerBlock = afterRegister.slice(0, nextCaseIdx > 0 ? nextCaseIdx : afterRegister.length);

    expect(registerBlock).toContain('safeReadFile');
  });
});
