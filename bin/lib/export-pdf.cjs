'use strict';

/**
 * export-pdf.cjs — Playwright-based PDF export for PDE presentations.
 *
 * Provides:
 *   - exportPdf()          — Export an HTML file to PDF via Playwright page.pdf()
 *   - cmdPresentationPdf() — CLI handler for `pde-tools presentation pdf <html> <pdf>`
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { error, output } = require('./core.cjs');

/**
 * Export an HTML file to PDF using Playwright headless Chromium.
 *
 * Uses page.goto() with 'file://' protocol (not page.setContent()) to ensure
 * relative resources, inline SVG, and base64 images are resolved correctly.
 * Always uses printBackground: true by default to preserve the PDE dark theme.
 *
 * @param {object} opts
 * @param {string} opts.htmlPath        - Absolute or relative path to the source HTML file
 * @param {string} opts.pdfPath         - Destination path for the generated PDF
 * @param {string} [opts.format]        - PDF page format (default: 'A4')
 * @param {boolean} [opts.printBackground] - Preserve background colors/images (default: true)
 * @returns {Promise<{ pdfPath: string, bytes: number }>}
 */
async function exportPdf({ htmlPath, pdfPath, format = 'A4', printBackground = true }) {
  const resolvedHtml = path.resolve(htmlPath);
  const resolvedPdf = path.resolve(pdfPath);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Use file:// protocol to ensure inline resources load correctly.
    // waitUntil: 'networkidle' ensures all resources (SVG, base64 images) are rendered.
    await page.goto('file://' + resolvedHtml, { waitUntil: 'networkidle' });

    await page.pdf({ path: resolvedPdf, format, printBackground });

    await context.close();
  } finally {
    await browser.close();
  }

  const bytes = fs.statSync(resolvedPdf).size;
  return { pdfPath: resolvedPdf, bytes };
}

/**
 * CLI handler for `pde-tools presentation pdf <htmlPath> <pdfPath>`.
 *
 * Validates inputs, ensures the output directory exists, calls exportPdf(),
 * and outputs the result JSON. Calls error() (process.exit(1)) on failure.
 *
 * @param {string} cwd       - Project root (from pde-tools.cjs)
 * @param {string} htmlPath  - Path to source HTML presentation
 * @param {string} pdfPath   - Destination PDF path
 * @returns {Promise<void>}
 */
async function cmdPresentationPdf(cwd, htmlPath, pdfPath) {
  if (!htmlPath) {
    throw new Error('Missing required argument: htmlPath. Usage: pde-tools presentation pdf <html-path> <pdf-path>');
  }
  if (!pdfPath) {
    throw new Error('Missing required argument: pdfPath. Usage: pde-tools presentation pdf <html-path> <pdf-path>');
  }

  const resolvedHtml = path.resolve(cwd, htmlPath);
  const resolvedPdf = path.resolve(cwd, pdfPath);

  if (!fs.existsSync(resolvedHtml)) {
    throw new Error(`HTML file not found: ${resolvedHtml}`);
  }

  // Ensure output directory exists
  const pdfDir = path.dirname(resolvedPdf);
  fs.mkdirSync(pdfDir, { recursive: true });

  const result = await exportPdf({ htmlPath: resolvedHtml, pdfPath: resolvedPdf });

  output({
    success: true,
    pdfPath: result.pdfPath,
    bytes: result.bytes,
    message: `PDF exported successfully: ${result.pdfPath} (${result.bytes} bytes)`,
  });
}

module.exports = { exportPdf, cmdPresentationPdf };
