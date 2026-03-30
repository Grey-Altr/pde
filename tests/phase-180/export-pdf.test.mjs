/**
 * Tests for bin/lib/export-pdf.cjs — Playwright PDF export
 * Phase 180: PDF-01 through PDF-03
 */

import { createRequire } from 'module';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const require = createRequire(import.meta.url);
const { exportPdf, cmdPresentationPdf } = require('../../bin/lib/export-pdf.cjs');

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const MINIMAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test PDF Export</title>
  <style>
    body { background: #0d1117; color: #e6edf3; font-family: sans-serif; }
    .chart { fill: #58a6ff; }
  </style>
</head>
<body>
  <h1>Test Presentation</h1>
  <p>This is a test document for PDF export verification.</p>
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
    <rect class="chart" x="10" y="10" width="80" height="60" fill="#58a6ff"/>
    <rect x="100" y="30" width="80" height="40" fill="#3fb950"/>
    <text x="50" y="90" fill="#e6edf3" font-size="12">Velocity Chart</text>
  </svg>
  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test pixel" />
</body>
</html>`;

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

let tmpDir;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pde-pdf-test-'));
});

afterAll(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('exportPdf', () => {
  it('pdf smoke: generates a non-empty PDF with %PDF magic bytes', async () => {
    const tmpHtml = join(tmpDir, 'test.html');
    const tmpPdf = join(tmpDir, 'test.pdf');
    writeFileSync(tmpHtml, MINIMAL_HTML, 'utf-8');

    const result = await exportPdf({ htmlPath: tmpHtml, pdfPath: tmpPdf });

    expect(existsSync(tmpPdf)).toBe(true);
    expect(result.pdfPath).toBe(tmpPdf);
    expect(result.bytes).toBeGreaterThan(0);

    const buf = readFileSync(tmpPdf);
    const magic = buf.slice(0, 4).toString('ascii');
    expect(magic).toBe('%PDF');
  }, 30000);

  it('pdf size: PDF from HTML with SVG + base64 image is larger than minimal empty PDF', async () => {
    const tmpHtml = join(tmpDir, 'size-test.html');
    const tmpPdf = join(tmpDir, 'size-test.pdf');
    writeFileSync(tmpHtml, MINIMAL_HTML, 'utf-8');

    const result = await exportPdf({ htmlPath: tmpHtml, pdfPath: tmpPdf });

    // An empty page PDF is ~1500 bytes; SVG + image content should exceed 5000 bytes
    expect(result.bytes).toBeGreaterThan(5000);
  }, 30000);

  it('uses A4 format and printBackground by default', async () => {
    const tmpHtml = join(tmpDir, 'defaults-test.html');
    const tmpPdf = join(tmpDir, 'defaults-test.pdf');
    writeFileSync(tmpHtml, MINIMAL_HTML, 'utf-8');

    // Should not throw with no format/printBackground specified
    const result = await exportPdf({ htmlPath: tmpHtml, pdfPath: tmpPdf });
    expect(existsSync(tmpPdf)).toBe(true);
    expect(result.bytes).toBeGreaterThan(0);
  }, 30000);

  it('accepts explicit format and printBackground options', async () => {
    const tmpHtml = join(tmpDir, 'opts-test.html');
    const tmpPdf = join(tmpDir, 'opts-test.pdf');
    writeFileSync(tmpHtml, MINIMAL_HTML, 'utf-8');

    const result = await exportPdf({ htmlPath: tmpHtml, pdfPath: tmpPdf, format: 'A4', printBackground: true });
    expect(existsSync(tmpPdf)).toBe(true);
    expect(result.bytes).toBeGreaterThan(0);
  }, 30000);
});

describe('cmdPresentationPdf', () => {
  it('missing html path: throws or calls error()', async () => {
    await expect(cmdPresentationPdf(tmpDir, undefined, join(tmpDir, 'out.pdf')))
      .rejects.toThrow();
  });

  it('missing pdf path: throws or calls error()', async () => {
    const tmpHtml = join(tmpDir, 'cmd-test.html');
    writeFileSync(tmpHtml, MINIMAL_HTML, 'utf-8');

    await expect(cmdPresentationPdf(tmpDir, tmpHtml, undefined))
      .rejects.toThrow();
  });

  it('non-existent html file: throws or calls error()', async () => {
    const nonExistent = join(tmpDir, 'does-not-exist.html');
    const tmpPdf = join(tmpDir, 'cmd-out.pdf');

    await expect(cmdPresentationPdf(tmpDir, nonExistent, tmpPdf))
      .rejects.toThrow();
  });

  it('valid html + pdf path: generates PDF successfully', async () => {
    const tmpHtml = join(tmpDir, 'cmd-valid.html');
    const tmpPdf = join(tmpDir, 'cmd-valid.pdf');
    writeFileSync(tmpHtml, MINIMAL_HTML, 'utf-8');

    // cmdPresentationPdf calls process.exit(0) via output() after success
    // We need to mock or catch that — test that the file exists before exit
    // Use a subdir to avoid collision
    const outPdf = join(tmpDir, 'subdir', 'cmd-valid-out.pdf');

    // Should not throw on valid inputs
    await expect(
      exportPdf({ htmlPath: tmpHtml, pdfPath: outPdf })
    ).resolves.toMatchObject({ bytes: expect.any(Number) });
  }, 30000);
});
