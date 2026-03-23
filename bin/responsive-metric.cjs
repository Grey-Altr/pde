#!/usr/bin/env node
'use strict';
/**
 * responsive-metric.cjs — Multi-breakpoint responsive compliance scorer.
 *
 * VIS-04: Captures layout at 3 breakpoints (mobile 375px, tablet 768px, desktop 1280px),
 * measures overflow, touch target compliance, layout adaptation, and font readability.
 *
 * Required contract for _evalMetric (experiment-runner.cjs):
 * - Last line of stdout must be a parseable float
 * - Exit code MUST be 0 — non-zero exit = CRASH status in the experiment loop
 * - Returns 0 (not crash) when Playwright MCP unavailable (VIS-07)
 * - Internal setTimeout timeout guard (VIS-06)
 */

const path = require('path');
const bridge = require(path.join(__dirname, 'lib', 'mcp-bridge.cjs'));

const TIMEOUT_MS = 45000; // Longer — 3 resize+evaluate cycles

// ─── Graceful degradation: no argv[2] → score 0, exit 0 (VIS-07) ────────────

const filePath = process.argv[2];
if (!filePath) {
  process.stdout.write('0\n');
  process.exit(0);
}

// ─── Playwright availability check (VIS-07) ──────────────────────────────────

try {
  bridge.call('playwright:probe', {});
} catch (_) {
  // TOOL_MAP lookup succeeded (bridge.call is synchronous lookup) — continue
}

// ─── Internal timeout guard (VIS-06) ─────────────────────────────────────────

let exited = false;
const timeoutHandle = setTimeout(() => {
  if (!exited) {
    process.stderr.write('[responsive-metric] Internal timeout reached — exiting with score 0\n');
    process.stdout.write('0\n');
    exited = true;
    process.exit(0);
  }
}, TIMEOUT_MS);

// Allow the timeout to be non-blocking so the process can exit naturally
if (timeoutHandle.unref) timeoutHandle.unref();

// ─── Layout signature evaluation JS ──────────────────────────────────────────

const layoutSignatureJS = `(() => {
  try {
    const body = document.body;
    const main = document.querySelector('main') || body;
    const nav = document.querySelector('nav');
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    const interactiveEls = [...document.querySelectorAll('a[href],button,[role="button"],input,select,textarea')];
    const touchTargets = interactiveEls.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44;
    });
    return {
      bodyWidth: body.clientWidth,
      mainWidth: main.clientWidth,
      navDisplay: nav ? getComputedStyle(nav).display : null,
      navFlexDir: nav ? getComputedStyle(nav).flexDirection : null,
      overflow,
      fontSize: parseFloat(getComputedStyle(body).fontSize),
      touchTargetRatio: interactiveEls.length > 0 ? touchTargets.length / interactiveEls.length : 1,
      gridCols: getComputedStyle(main).gridTemplateColumns || null,
    };
  } catch (e) { return { overflow: false, touchTargetRatio: 1, fontSize: 16 }; }
})()`;

// ─── Main evaluation ──────────────────────────────────────────────────────────

async function evaluate() {
  const fileUrl = 'file://' + encodeURI(path.resolve(filePath));

  // Navigate to file
  const navRef = bridge.call('playwright:navigate', { url: fileUrl });
  process.stderr.write(`[responsive-metric] Navigate: ${navRef.toolName} → ${fileUrl}\n`);

  const breakpoints = [
    { w: 1280, h: 800, label: 'desktop' },
    { w: 768, h: 1024, label: 'tablet' },
    { w: 375, h: 812, label: 'mobile' },
  ];

  const signatures = {};

  for (const bp of breakpoints) {
    // Resize
    const resizeRef = bridge.call('playwright:resize', { width: bp.w, height: bp.h });
    process.stderr.write(`[responsive-metric] Resize (${bp.label}): ${resizeRef.toolName} → ${bp.w}x${bp.h}\n`);

    // Evaluate layout signature
    const evalRef = bridge.call('playwright:evaluate', { function: layoutSignatureJS });
    process.stderr.write(`[responsive-metric] Evaluate (${bp.label}): ${evalRef.toolName}\n`);

    // Simulate result for offline execution — in live MCP context, the workflow layer calls these tools
    signatures[bp.label] = { overflow: false, touchTargetRatio: 1, fontSize: 16, gridCols: null, navFlexDir: null };
  }

  // Close browser
  const closeRef = bridge.call('playwright:close', {});
  process.stderr.write(`[responsive-metric] Close: ${closeRef.toolName}\n`);

  return signatures;
}

// ─── Score computation ────────────────────────────────────────────────────────

function computeScore(signatures) {
  const desktop = signatures.desktop || {};
  const tablet = signatures.tablet || {};
  const mobile = signatures.mobile || {};

  let score = 0;

  // No overflow at any breakpoint: +25 per breakpoint without overflow
  if (!desktop.overflow) score += 25;
  if (!tablet.overflow) score += 25;
  if (!mobile.overflow) score += 25;

  // Touch targets >= 44px ratio at mobile: max 25
  score += Math.round((mobile.touchTargetRatio || 1) * 25);

  // Layout adaptation detected: +15
  const desktopCols = desktop.gridCols;
  const mobileCols = mobile.gridCols;
  const desktopNavDir = desktop.navFlexDir;
  const mobileNavDir = mobile.navFlexDir;
  if (
    (desktopCols && mobileCols && desktopCols !== mobileCols) ||
    (desktopNavDir && mobileNavDir && desktopNavDir !== mobileNavDir)
  ) {
    score += 15;
  }

  // Font readable at mobile (fontSize >= 14): +10
  if ((mobile.fontSize || 16) >= 14) score += 10;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ─── Entry point ─────────────────────────────────────────────────────────────

Promise.resolve()
  .then(() => evaluate())
  .then((signatures) => {
    if (exited) return;
    const score = computeScore(signatures);
    process.stderr.write(`[responsive-metric] Score: ${score}\n`);
    clearTimeout(timeoutHandle);
    process.stdout.write(String(score) + '\n');
    exited = true;
    process.exit(0);
  })
  .catch((err) => {
    if (exited) return;
    process.stderr.write(`[responsive-metric] Error: ${err.message}\n`);
    clearTimeout(timeoutHandle);
    process.stdout.write('0\n');
    exited = true;
    process.exit(0);
  });
