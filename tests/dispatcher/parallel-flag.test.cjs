'use strict';

/**
 * parallel-flag.test.cjs — CLI behavioral tests for --parallel flag in pde-tools.cjs
 *
 * Phase 144: Local CLI Dispatch
 * Satisfies: DSP-04, DSP-05
 *
 * Gaps filled:
 *   - DSP-04: Running without --parallel produces JSON with "parallel": false
 *   - DSP-05: Running with --parallel produces JSON with "parallel": true
 *
 * Uses vitest globals (globals: true in vitest.config.ts).
 * Uses child_process.execFileSync to invoke the actual CLI and parse its JSON output.
 * All arguments are hardcoded literals — no user-controlled input.
 */

const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PDE_TOOLS = path.join(PROJECT_ROOT, 'bin', 'pde-tools.cjs');

/**
 * Run pde-tools.cjs init execute-phase 144 with optional extra args array.
 * Returns the parsed JSON output object.
 *
 * @param {string[]} extraArgs - Additional CLI arguments (all hardcoded literals in tests)
 * @returns {object} Parsed JSON output from the command
 */
function runInitExecutePhase(extraArgs) {
  const args = ['init', 'execute-phase', '144', ...(extraArgs || [])];
  const stdout = execFileSync(process.execPath, [PDE_TOOLS, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(stdout.trim());
}

describe('pde-tools.cjs init execute-phase --parallel flag', () => {

  // ─── DSP-04: Without --parallel → parallel field is false ────────────────

  it('DSP-04: running without --parallel produces JSON output with "parallel": false', () => {
    const result = runInitExecutePhase();

    // The output must contain a "parallel" key
    expect(result).toHaveProperty('parallel');
    // And it must not be true (backward compatible — zero behavioral change)
    expect(result.parallel).toBe(false);
  });

  // ─── DSP-05: With --parallel → parallel field is true ────────────────────

  it('DSP-05: running with --parallel produces JSON output with "parallel": true', () => {
    const result = runInitExecutePhase(['--parallel']);

    // The output must contain a "parallel" key
    expect(result).toHaveProperty('parallel');
    // And it must be exactly true (opt-in parallel execution enabled)
    expect(result.parallel).toBe(true);
  });

  // ─── Regression guard: non-parallel run is backward-compatible ───────────

  it('DSP-04 regression: without --parallel, baseline fields are present and parallel is false', () => {
    const result = runInitExecutePhase();

    // These fields must always be present regardless of --parallel (backward compatibility)
    expect(result).toHaveProperty('executor_model');
    expect(result).toHaveProperty('phase_found');
    // parallel must be explicitly false, not absent
    expect(result.parallel).toBe(false);
  });

});
