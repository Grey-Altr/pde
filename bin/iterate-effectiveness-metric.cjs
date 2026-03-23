#!/usr/bin/env node
'use strict';
/**
 * iterate-effectiveness-metric.cjs -- Iterate improvement delta metric.
 *
 * Measures the DOM quality improvement produced by one /pde:iterate cycle.
 * Contract: exit 0 always, last line of stdout = numeric delta score.
 *
 * ITER-01: before/after screenshot capture (optional, via Playwright MCP)
 * ITER-02: visual delta measurement (post_score - pre_score)
 * ITER-04: outputs delta; convergence speed derived from JSONL history in report
 *
 * Usage: node bin/iterate-effectiveness-metric.cjs --fixture pre.html post.html
 * --fixture: use a pre-existing wireframe pair (REQUIRED in Phase 113)
 *
 * In Phase 116+, live measurement can be enabled by updating verify to invoke
 * /pde:iterate on actual wireframes and measuring delta on real output.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Timeout guard (VIS-06: timeout-safe -- fixture mode is fast, but leave margin)
const TIMEOUT_MS = 45000;
const timeoutId = setTimeout(() => {
  process.stderr.write('iterate-effectiveness-metric: timeout reached, returning 0\n');
  process.stdout.write('0\n');
  process.exit(0);
}, TIMEOUT_MS);

// ─── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fixtureIdx = args.indexOf('--fixture');

// VIS-07: no --fixture flag or fewer than 2 paths after it = degrade gracefully
if (fixtureIdx === -1 || args.length < fixtureIdx + 3) {
  clearTimeout(timeoutId);
  process.stdout.write('0\n');
  process.exit(0);
}

const prePath = args[fixtureIdx + 1];
const postPath = args[fixtureIdx + 2];

// ─── Helper: measure DOM score via dom-metric.cjs ─────────────────────────────

/**
 * measureDomScore(htmlPath)
 *
 * Calls dom-metric.cjs as a child process and parses the numeric score
 * from its stdout. Returns 0 on any failure (matching VIS-07 degradation).
 */
function measureDomScore(htmlPath) {
  const result = spawnSync(
    'node',
    [path.join(__dirname, 'dom-metric.cjs'), htmlPath],
    { encoding: 'utf-8', timeout: 15000 }
  );
  if (result.status !== 0 || !result.stdout) {
    return 0;
  }
  const lines = result.stdout.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) {
    return 0;
  }
  const score = parseFloat(lines[lines.length - 1]);
  if (isNaN(score)) {
    return 0;
  }
  return score;
}

// ─── Helper: capture screenshot via Playwright MCP (ITER-01) ─────────────────

/**
 * captureScreenshot(htmlPath, label)
 *
 * Attempts to capture a screenshot using the Playwright MCP bridge.
 * Failure must NOT prevent metric output -- screenshot is an optional enhancement.
 */
function captureScreenshot(htmlPath, label) {
  try {
    const bridge = require(path.join(__dirname, 'lib', 'mcp-bridge.cjs'));
    const screenshotPath = path.join(
      process.cwd(),
      '.planning', 'design', 'ux', 'wireframes', 'screenshots',
      label + '-' + path.basename(htmlPath, '.html') + '.png'
    );
    bridge.call('playwright:screenshot', {
      filename: screenshotPath,
      type: 'png',
    });
  } catch (err) {
    process.stderr.write('iterate-effectiveness-metric: screenshot skipped: ' + err.message + '\n');
  }
}

// ─── Main run() function ──────────────────────────────────────────────────────

async function run() {
  try {
    // Resolve paths relative to cwd if not absolute
    const resolvedPre = path.isAbsolute(prePath) ? prePath : path.resolve(process.cwd(), prePath);
    const resolvedPost = path.isAbsolute(postPath) ? postPath : path.resolve(process.cwd(), postPath);

    // Verify both files exist -- missing fixture = graceful degradation
    if (!fs.existsSync(resolvedPre) || !fs.existsSync(resolvedPost)) {
      clearTimeout(timeoutId);
      process.stdout.write('0\n');
      process.exit(0);
    }

    // Measure PRE score (ITER-02: before)
    const preScore = measureDomScore(resolvedPre);

    // Attempt pre-iterate screenshot (ITER-01: before/after capture, optional)
    captureScreenshot(resolvedPre, 'pre-iterate');

    // Measure POST score (ITER-02: after)
    const postScore = measureDomScore(resolvedPost);

    // Attempt post-iterate screenshot (ITER-01: before/after capture, optional)
    captureScreenshot(resolvedPost, 'post-iterate');

    // Compute delta (ITER-02: visual delta = post - pre)
    // ITER-04: outputs delta; convergence speed derived from JSONL history in report
    const delta = postScore - preScore;

    clearTimeout(timeoutId);

    process.stdout.write(String(delta) + '\n');
    process.exit(0);
  } catch (err) {
    clearTimeout(timeoutId);
    process.stdout.write('0\n');
    process.exit(0);
  }
}

run();
