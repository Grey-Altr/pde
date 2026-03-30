/**
 * tests/phase-184/portfolio-cmd.test.mjs
 * Unit tests for pde-tools portfolio subcommand routing
 *
 * Coverage:
 *   - Unknown portfolio subcommand outputs error message
 *   - portfolio build routes to cmdPortfolioBuild (empty paths -> empty portfolioIR)
 *   - portfolio render without args outputs error
 */

import { describe, it, expect } from 'vitest';
import { execFileSync, execFile } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDE_TOOLS = path.resolve(__dirname, '../../bin/pde-tools.cjs');
const NODE = process.execPath;

function run(args, opts = {}) {
  try {
    const stdout = execFileSync(NODE, [PDE_TOOLS, ...args], {
      encoding: 'utf-8',
      timeout: 10000,
      ...opts,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (e) {
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || '',
      exitCode: e.status || 1,
    };
  }
}

describe('pde-tools portfolio subcommand routing', () => {
  it('outputs "Unknown portfolio subcommand" for unknown subcommand', () => {
    const result = run(['portfolio', 'unknown-subcommand']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Unknown portfolio subcommand');
  });

  it('outputs "Unknown portfolio subcommand" for missing subcommand', () => {
    const result = run(['portfolio']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Unknown portfolio subcommand');
  });

  it('portfolio build with no paths outputs empty portfolioIR JSON', () => {
    const result = run(['portfolio', 'build']);
    expect(result.exitCode).toBe(0);
    // Should output JSON with schema_version and project_count: 0
    const output = result.stdout.trim();
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch (_) {
      // May be @file: prefix for large output
      expect(output).toMatch(/^@file:|^\{/);
      return;
    }
    expect(parsed.schema_version).toBe('1.0');
    expect(parsed.project_count).toBe(0);
    expect(parsed.available_count).toBe(0);
  });

  it('portfolio render without args outputs error message', () => {
    const result = run(['portfolio', 'render']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Missing portfolio-ir-path argument');
  });
});
