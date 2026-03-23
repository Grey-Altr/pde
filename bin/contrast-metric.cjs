#!/usr/bin/env node
'use strict';
/**
 * contrast-metric.cjs — WCAG contrast pass rate metric.
 *
 * Navigates to the target HTML file via Playwright MCP and evaluates text
 * element contrast ratios using the WCAG 2.1 relative luminance formula.
 * Returns the count of elements passing AA contrast thresholds.
 *
 * Contract: exit 0 always, last line of stdout = numeric score (pass count).
 * VIS-03: WCAG 2.1 AA contrast evaluation — 4.5:1 normal text, 3.0:1 large text
 * VIS-06: timeout-safe — internal timeout prevents hanging.
 * VIS-07: prints 0 and exits 0 when Playwright MCP unavailable or no file arg.
 *
 * Scoring: count of elements passing AA threshold (direction: max)
 *
 * Usage: node bin/contrast-metric.cjs <path-to-html-file>
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
  process.stderr.write('contrast-metric: timeout reached, returning 0\n');
  process.stdout.write('0\n');
  process.exit(0);
}, TIMEOUT_MS);

async function run() {
  try {
    const fileUrl = 'file://' + encodeURI(path.resolve(filePath));

    // Navigate to the HTML file
    bridge.call('playwright:navigate', { url: fileUrl });

    // Evaluate WCAG contrast inline — complete WCAG 2.1 formula
    const evalResult = bridge.call('playwright:evaluate', {
      function: `(() => {
        try {
          // WCAG 2.1 sRGB linearization
          function sRGBtoLinear(c) {
            const s = c / 255;
            return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          }

          // WCAG 2.1 relative luminance (W3C spec formula)
          function luminance(r, g, b) {
            return 0.2126 * sRGBtoLinear(r)
                 + 0.7152 * sRGBtoLinear(g)
                 + 0.0722 * sRGBtoLinear(b);
          }

          // WCAG contrast ratio
          function contrastRatio(L1, L2) {
            const lighter = Math.max(L1, L2);
            const darker  = Math.min(L1, L2);
            return (lighter + 0.05) / (darker + 0.05);
          }

          // Parse computed color string: Chrome normalizes all formats to rgb()/rgba()
          function parseRGBA(str) {
            if (!str || str === 'transparent') return null;
            const m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
            if (!m) return null;
            return {
              r: parseInt(m[1], 10),
              g: parseInt(m[2], 10),
              b: parseInt(m[3], 10),
              a: m[4] !== undefined ? parseFloat(m[4]) : 1,
            };
          }

          // Walk parent chain to find effective (non-transparent) background color
          function getEffectiveBg(el) {
            let current = el;
            while (current && current !== document.documentElement) {
              const bg = window.getComputedStyle(current).backgroundColor;
              const parsed = parseRGBA(bg);
              if (parsed && parsed.a > 0) {
                return [parsed.r, parsed.g, parsed.b];
              }
              current = current.parentElement;
            }
            // Default: white background at root
            return [255, 255, 255];
          }

          // Text elements to check for contrast
          const textSelectors = 'h1,h2,h3,h4,h5,h6,p,span,a,li,td,th,label,button';
          const elements = document.querySelectorAll(textSelectors);

          let pass = 0;
          let fail = 0;
          let skip = 0;

          elements.forEach(el => {
            try {
              const style = window.getComputedStyle(el);

              // Skip hidden elements
              if (style.display === 'none' || style.visibility === 'hidden') {
                skip++;
                return;
              }

              // Skip elements with no text content
              let hasText = false;
              el.childNodes.forEach(node => {
                if (node.nodeType === 3 && node.textContent.trim().length > 0) {
                  hasText = true;
                }
              });
              if (!hasText) {
                skip++;
                return;
              }

              // Get foreground color
              const fgColor = parseRGBA(style.color);
              if (!fgColor) { skip++; return; }

              // Get effective background color
              const [bgR, bgG, bgB] = getEffectiveBg(el);

              const fgL = luminance(fgColor.r, fgColor.g, fgColor.b);
              const bgL = luminance(bgR, bgG, bgB);
              const ratio = contrastRatio(fgL, bgL);

              // WCAG AA threshold: large text uses 3.0, normal text uses 4.5
              // Large text: >= 24px, or >= 18.66px and bold (weight >= 700)
              const fontSize = parseFloat(style.fontSize);
              const fontWeight = parseInt(style.fontWeight, 10) || 400;
              const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

              const threshold = isLargeText ? 3.0 : 4.5;

              if (ratio >= threshold) {
                pass++;
              } else {
                fail++;
              }
            } catch (_) {
              skip++;
            }
          });

          return { pass, fail, skip, total: pass + fail };
        } catch (e) {
          return { pass: 0, fail: 0, skip: 0, total: 0, error: e.message };
        }
      })()`
    });

    // Parse the result from the MCP tool response
    let score = 0;
    try {
      const data = typeof evalResult === 'string' ? JSON.parse(evalResult) : evalResult;
      if (data && typeof data.pass === 'number') {
        score = data.pass;
      } else if (data && data.toolName && data.args !== undefined) {
        // bridge.call returned tool descriptor — Playwright MCP unavailable at runtime
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
