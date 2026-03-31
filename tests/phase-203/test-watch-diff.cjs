'use strict';

/**
 * Phase 203 Plan 01 — writeDiff() + snapshot diff logic unit tests
 * Run: node tests/phase-203/test-watch-diff.cjs
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── Test runner helpers ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

function summary() {
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// ─── Setup temp projectRoot ───────────────────────────────────────────────────

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-phase-203-'));

function cleanup() {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });

// ─── Load module under test ───────────────────────────────────────────────────

const cache = require('../../bin/lib/firecrawl-cache.cjs');
const { slugifyUrl, readSnapshot, writeSnapshot, ensureCacheDir, resolveCacheDir } = cache;

// ─── Tests: readSnapshot returns null for nonexistent slug ───────────────────

console.log('\nreadSnapshot behavior:');

test('readSnapshot returns null when slug does not exist', () => {
  const result = readSnapshot('nonexistent-slug-xyz-999', tmpDir);
  assert.strictEqual(result, null,
    `Expected null but got: ${JSON.stringify(result)}`);
});

test('readSnapshot returns null for empty string slug', () => {
  const result = readSnapshot('', tmpDir);
  assert.strictEqual(result, null,
    `Expected null but got: ${JSON.stringify(result)}`);
});

// ─── Tests: writeDiff ─────────────────────────────────────────────────────────

console.log('\nwriteDiff behavior:');

test('writeDiff is exported from firecrawl-cache.cjs', () => {
  assert.ok(typeof cache.writeDiff === 'function',
    `Expected writeDiff to be a function, got: ${typeof cache.writeDiff}`);
});

test('writeDiff returns { slug, path, linesChanged }', () => {
  const url = 'https://example.com/pricing';
  const diffText = '@@ -1,3 +1,3 @@\n # Pricing\n-Starter: $9/mo\n+Starter: $12/mo';
  const linesChanged = 2;
  const previousScrapeAt = '2026-03-29T10:00:00Z';

  const result = cache.writeDiff(url, diffText, linesChanged, previousScrapeAt, tmpDir);

  assert.ok(result !== null && typeof result === 'object',
    `Expected object return value, got: ${typeof result}`);
  assert.ok(typeof result.slug === 'string' && result.slug.length > 0,
    `Expected non-empty slug, got: ${JSON.stringify(result.slug)}`);
  assert.ok(typeof result.path === 'string' && result.path.length > 0,
    `Expected non-empty path, got: ${JSON.stringify(result.path)}`);
  assert.strictEqual(result.linesChanged, linesChanged,
    `Expected linesChanged=${linesChanged}, got: ${result.linesChanged}`);
});

test('writeDiff writes file to snapshots/{slug}-diff.md', () => {
  const url = 'https://competitor.example.com/features';
  const diffText = '@@ -5,2 +5,2 @@\n-Free: 3 projects\n+Free: 1 project';
  const linesChanged = 2;
  const previousScrapeAt = '2026-03-28T08:00:00Z';

  const result = cache.writeDiff(url, diffText, linesChanged, previousScrapeAt, tmpDir);

  // File must exist
  assert.ok(fs.existsSync(result.path),
    `Diff file not found at: ${result.path}`);

  // Path must be under snapshots/ dir
  const snapshotsDir = path.join(resolveCacheDir(tmpDir), 'snapshots');
  assert.ok(result.path.startsWith(snapshotsDir),
    `Expected path under ${snapshotsDir}, got: ${result.path}`);

  // Filename must end with {slug}-diff.md
  const slug = slugifyUrl(url);
  assert.ok(result.path.endsWith(`${slug}-diff.md`),
    `Expected filename ending with ${slug}-diff.md, got: ${path.basename(result.path)}`);
});

test('writeDiff file contains URL in header', () => {
  const url = 'https://acme.io/pricing';
  const diffText = '@@ -1,1 +1,1 @@\n-old line\n+new line';
  const linesChanged = 2;
  const previousScrapeAt = '2026-03-27T12:00:00Z';

  const result = cache.writeDiff(url, diffText, linesChanged, previousScrapeAt, tmpDir);
  const content = fs.readFileSync(result.path, 'utf-8');

  assert.ok(content.includes(url),
    `Expected diff file to contain URL "${url}"\nActual content:\n${content}`);
});

test('writeDiff file contains linesChanged count', () => {
  const url = 'https://beta.example.org/roadmap';
  const diffText = '@@ -2,3 +2,3 @@\n line1\n-old line2\n+new line2\n line3';
  const linesChanged = 2;
  const previousScrapeAt = '2026-03-26T09:00:00Z';

  const result = cache.writeDiff(url, diffText, linesChanged, previousScrapeAt, tmpDir);
  const content = fs.readFileSync(result.path, 'utf-8');

  assert.ok(content.includes(String(linesChanged)),
    `Expected diff file to contain linesChanged "${linesChanged}"\nActual content:\n${content}`);
});

test('writeDiff file contains previousScrapeAt date', () => {
  const url = 'https://delta.io/changelog';
  const diffText = '@@ -1,2 +1,2 @@\n ctx\n-old\n+new';
  const linesChanged = 2;
  const previousScrapeAt = '2026-03-25T15:30:00Z';

  const result = cache.writeDiff(url, diffText, linesChanged, previousScrapeAt, tmpDir);
  const content = fs.readFileSync(result.path, 'utf-8');

  assert.ok(content.includes(previousScrapeAt),
    `Expected diff file to contain previousScrapeAt "${previousScrapeAt}"\nActual content:\n${content}`);
});

test('writeDiff file contains fenced diff block with diffText', () => {
  const url = 'https://gamma.tools/pricing';
  const diffText = '@@ -3,1 +3,1 @@\n-$49/mo\n+$59/mo';
  const linesChanged = 2;
  const previousScrapeAt = '2026-03-24T06:00:00Z';

  const result = cache.writeDiff(url, diffText, linesChanged, previousScrapeAt, tmpDir);
  const content = fs.readFileSync(result.path, 'utf-8');

  // Must have diff fenced code block
  assert.ok(content.includes('```diff'),
    `Expected diff file to contain opening fenced \`\`\`diff block\nActual content:\n${content}`);
  assert.ok(content.includes(diffText),
    `Expected diff file to contain diffText\nActual content:\n${content}`);
});

test('writeDiff creates snapshots/ dir via ensureCacheDir if needed', () => {
  // Use a fresh tmpDir for this test to verify dir creation
  const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-fresh-'));
  try {
    const snapshotsDir = path.join(resolveCacheDir(freshDir), 'snapshots');
    // Verify it does NOT exist yet
    assert.ok(!fs.existsSync(snapshotsDir),
      `Expected snapshots/ to not exist before writeDiff call`);

    const url = 'https://fresh.example.com/page';
    const result = cache.writeDiff(url, '@@ -1,1 +1,1 @@\n-a\n+b', 2, '2026-03-01T00:00:00Z', freshDir);

    assert.ok(fs.existsSync(snapshotsDir),
      `Expected snapshots/ to be created by writeDiff, path: ${snapshotsDir}`);
    assert.ok(fs.existsSync(result.path),
      `Expected diff file to exist at: ${result.path}`);
  } finally {
    fs.rmSync(freshDir, { recursive: true, force: true });
  }
});

// ─── Tests: writeSnapshot/readSnapshot round-trip ────────────────────────────

console.log('\nwriteSnapshot/readSnapshot round-trip:');

test('writeSnapshot then readSnapshot returns original content', () => {
  const url = 'https://roundtrip.example.com/page';
  const content = '# My Page\nSome content here.';

  const written = writeSnapshot(url, content, tmpDir);
  const slug = written.slug;
  const read = readSnapshot(slug, tmpDir);

  assert.strictEqual(read, content,
    `Round-trip failed: written content does not match read content`);
});

test('readSnapshot returns null after non-existent slug write attempt', () => {
  // This just verifies there's no bleed between calls
  const result = readSnapshot('definitely-not-written-' + Date.now(), tmpDir);
  assert.strictEqual(result, null,
    `Expected null but got: ${JSON.stringify(result)}`);
});

// ─── Summary ──────────────────────────────────────────────────────────────────

summary();
