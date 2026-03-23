#!/usr/bin/env node
'use strict';
/**
 * a11y-metric.cjs — Accessibility violations metric.
 *
 * Navigates to the target HTML file via Playwright MCP and uses the AOM
 * snapshot (browser_snapshot) to detect accessibility violations. Uses
 * line-based pattern matching on the AOM text — reflects what assistive
 * technology sees, not just what the DOM contains.
 *
 * Contract: exit 0 always, last line of stdout = numeric score (0-100).
 * VIS-02: a11y violations — missing landmarks, unlabeled controls, heading skips
 * VIS-06: timeout-safe — internal timeout prevents hanging.
 * VIS-07: prints 0 and exits 0 when Playwright MCP unavailable or no file arg.
 *
 * Scoring: score = Math.max(0, 100 - violations * 10)
 * Direction: max (higher = fewer violations = better accessibility)
 *
 * Usage: node bin/a11y-metric.cjs <path-to-html-file>
 */

const path = require('path');
const { createRequire } = require('module');
const req = createRequire(__filename);
const bridge = req(path.join(__dirname, 'lib', 'mcp-bridge.cjs'));

const filePath = process.argv[2];

// VIS-07: no file path = degrade gracefully
if (!filePath) {
  process.stdout.write('0\n');
  process.exit(0);
}

// VIS-07: probe Playwright availability before any browser call
let playwrightAvailable = false;
try {
  const result = bridge.call('playwright:probe', {});
  playwrightAvailable = !!result;
} catch (_) {
  playwrightAvailable = false;
}

if (!playwrightAvailable) {
  process.stdout.write('0\n');
  process.exit(0);
}

// Internal timeout guard (VIS-06: timeout-safe)
const TIMEOUT_MS = 30000;
const timeoutId = setTimeout(() => {
  process.stderr.write('a11y-metric: timeout reached, returning 0\n');
  process.stdout.write('0\n');
  process.exit(0);
}, TIMEOUT_MS);

async function run() {
  try {
    const fileUrl = 'file://' + encodeURI(path.resolve(filePath));

    // Navigate to the HTML file
    bridge.call('playwright:navigate', { url: fileUrl });

    // Get AOM tree via browser_snapshot (Pattern 5: uses AOM, not browser_evaluate)
    // AOM gives the accessibility tree — what assistive technology sees
    const snapshotResult = bridge.call('playwright:snapshot', {});

    // If bridge.call returned the tool descriptor instead of executing (no Playwright runtime),
    // check if it's just a { toolName, args } descriptor and degrade
    if (snapshotResult && snapshotResult.toolName && snapshotResult.args !== undefined) {
      // Playwright MCP not actually available at runtime
      clearTimeout(timeoutId);
      try { bridge.call('playwright:close', {}); } catch (_) {}
      process.stdout.write('0\n');
      process.exit(0);
    }

    const aomText = typeof snapshotResult === 'string'
      ? snapshotResult
      : JSON.stringify(snapshotResult || '');

    let violations = 0;

    // Check for missing landmarks (AOM pattern: "- main", "- navigation", "- banner")
    const hasMain = /\b(main|role="main")\b/i.test(aomText)
      || /- main\b/.test(aomText)
      || /\[main\]/.test(aomText);
    const hasNavigation = /\b(navigation|role="navigation")\b/i.test(aomText)
      || /- navigation\b/.test(aomText)
      || /\[navigation\]/.test(aomText);
    const hasBanner = /\b(banner|role="banner")\b/i.test(aomText)
      || /- banner\b/.test(aomText)
      || /\[banner\]/.test(aomText);

    if (!hasMain) violations++;
    if (!hasNavigation) violations++;
    if (!hasBanner) violations++;

    // Count unlabeled controls (AOM shows: - button "" or - textbox "")
    // Pattern: role + empty string name
    const unlabeledPattern = /- (button|link|textbox|combobox|checkbox|radio)\s+""\s/gi;
    const unlabeledMatches = aomText.match(unlabeledPattern) || [];
    violations += unlabeledMatches.length;

    // Heading hierarchy: parse heading levels, detect skips
    // AOM format: "- heading "Text" [level=N]" or "- heading "Text" level N"
    const headingLevelPattern = /heading[^"]*"[^"]*"[^[\n]*(?:\[level=(\d+)\]|level\s+(\d+))/gi;
    const headingLevels = [];
    let hMatch;
    while ((hMatch = headingLevelPattern.exec(aomText)) !== null) {
      const level = parseInt(hMatch[1] || hMatch[2], 10);
      if (!isNaN(level)) headingLevels.push(level);
    }

    // Check for heading hierarchy skips (e.g., h1 to h3 without h2)
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i - 1] > 1) {
        violations++;
      }
    }

    // Score: inverse of violations (higher score = fewer violations)
    const score = Math.max(0, 100 - violations * 10);

    clearTimeout(timeoutId);

    // Close browser in finally path
    try { bridge.call('playwright:close', {}); } catch (_) {}

    process.stdout.write(String(score) + '\n');
    process.exit(0);
  } catch (_) {
    clearTimeout(timeoutId);
    try { bridge.call('playwright:close', {}); } catch (__) {}
    process.stdout.write('0\n');
    process.exit(0);
  }
}

run();
