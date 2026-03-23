#!/usr/bin/env node
'use strict';
/**
 * dom-metric.cjs — DOM structure metric scoring.
 *
 * Navigates to the target HTML file via Playwright MCP and evaluates DOM
 * structure quality: semantic element diversity, landmark coverage, heading
 * hierarchy, and interactive element count.
 *
 * Contract: exit 0 always, last line of stdout = numeric score (0-100).
 * VIS-01: scores semantic elements (nav, main, article, section, header, footer)
 * VIS-06: timeout-safe — internal timeout prevents hanging.
 * VIS-07: prints 0 and exits 0 when Playwright MCP unavailable or no file arg.
 *
 * Usage: node bin/dom-metric.cjs <path-to-html-file>
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
  process.stderr.write('dom-metric: timeout reached, returning 0\n');
  process.stdout.write('0\n');
  process.exit(0);
}, TIMEOUT_MS);

async function run() {
  try {
    const fileUrl = 'file://' + encodeURI(path.resolve(filePath));

    // Navigate to the HTML file
    bridge.call('playwright:navigate', { url: fileUrl });

    // Evaluate DOM structure scoring inline
    const evalResult = bridge.call('playwright:evaluate', {
      function: `(() => {
        try {
          const allElements = document.querySelectorAll('*');
          const totalElements = allElements.length;

          // Tag diversity: unique tag names (penalizes div-soup)
          const allTags = new Set();
          allElements.forEach(el => allTags.add(el.tagName.toLowerCase()));
          const diversityScore = Math.min(15, (allTags.size / 15) * 15);

          // Landmark coverage: semantic sectioning elements + ARIA roles
          // VIS-01: header,nav,main,footer,aside,section,article
          const landmarkSelectors = [
            'header', 'nav', 'main', 'footer', 'aside', 'section', 'article',
            '[role="banner"]', '[role="navigation"]', '[role="main"]',
            '[role="contentinfo"]', '[role="complementary"]', '[role="region"]'
          ];
          const landmarkCount = landmarkSelectors.reduce((count, sel) => {
            return count + document.querySelectorAll(sel).length;
          }, 0);
          const landmarkScore = Math.min(20, (landmarkCount / 5) * 20);

          // Heading structure: h1 presence + hierarchy penalty
          const h1Count = document.querySelectorAll('h1').length;
          const hasH1 = h1Count > 0;
          let headingScore = hasH1 ? 10 : 0;

          // Penalize heading level skips (-3 per skip)
          const headingLevels = [];
          document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
            headingLevels.push(parseInt(el.tagName[1], 10));
          });
          let headingPenalty = 0;
          for (let i = 1; i < headingLevels.length; i++) {
            if (headingLevels[i] - headingLevels[i - 1] > 1) {
              headingPenalty += 3;
            }
          }
          headingScore = Math.max(0, headingScore - headingPenalty);

          // Interactive elements: a[href], button, input, select, textarea
          const interactiveCount = document.querySelectorAll(
            'a[href],button,input,select,textarea'
          ).length;
          const interactiveScore = Math.min(15, (interactiveCount / 8) * 15);

          // Complexity bonus: total element count
          const complexityScore = Math.min(15, (totalElements / 50) * 15);

          // Image alt text coverage
          const images = document.querySelectorAll('img');
          const imagesWithAlt = document.querySelectorAll('img[alt]');
          const altScore = images.length > 0
            ? Math.min(15, (imagesWithAlt.length / images.length) * 15)
            : 15;

          // Labeled form controls coverage
          const inputs = document.querySelectorAll('input,select,textarea');
          let labeledCount = 0;
          inputs.forEach(el => {
            if (el.id && document.querySelector('label[for="' + el.id + '"]')) {
              labeledCount++;
            } else if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) {
              labeledCount++;
            }
          });
          const labelScore = inputs.length > 0
            ? Math.min(10, (labeledCount / inputs.length) * 10)
            : 10;

          const raw = diversityScore + landmarkScore + headingScore
            + interactiveScore + complexityScore + altScore + labelScore;
          const score = Math.round(Math.max(0, Math.min(100, raw)));

          return { score, totalElements, landmarkCount, h1Count, interactiveCount };
        } catch (e) {
          return { score: 0, error: e.message };
        }
      })()`
    });

    // Parse the result from the MCP tool response
    let score = 0;
    try {
      const data = typeof evalResult === 'string' ? JSON.parse(evalResult) : evalResult;
      if (data && typeof data.score === 'number') {
        score = data.score;
      } else if (data && data.args && data.args.function) {
        // bridge.call returned { toolName, args } — Playwright MCP unavailable at runtime
        score = 0;
      } else {
        score = 0;
      }
    } catch (_) {
      score = 0;
    }

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
