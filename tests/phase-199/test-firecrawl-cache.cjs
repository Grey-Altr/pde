'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Module under test
const cache = require('../../bin/lib/firecrawl-cache.cjs');

let testCount = 0;
let passCount = 0;

function tmpRoot() {
  const dir = path.join(os.tmpdir(), 'pde-cache-test-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  fs.mkdirSync(dir, { recursive: true });
  // Create .planning directory structure expected by the module
  fs.mkdirSync(path.join(dir, '.planning', 'research'), { recursive: true });
  return dir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
  }
}

console.log('firecrawl-cache.cjs tests\n');

// ─── slugifyUrl tests ────────────────────────────────────────────────────────

test('slugifyUrl: pricing URL produces correct slug', () => {
  const slug = cache.slugifyUrl('https://competitor.com/pricing?plan=pro');
  assert.strictEqual(slug, 'competitor-com-pricing-plan-pro');
});

test('slugifyUrl: path segments produce dashes', () => {
  const slug = cache.slugifyUrl('https://example.com/a/b');
  assert.strictEqual(slug, 'example-com-a-b');
});

test('slugifyUrl: deterministic -- same URL gives same slug', () => {
  const a = cache.slugifyUrl('https://example.com/test');
  const b = cache.slugifyUrl('https://example.com/test');
  assert.strictEqual(a, b);
});

test('slugifyUrl: truncates to max 200 chars', () => {
  const longUrl = 'https://example.com/' + 'a'.repeat(300);
  const slug = cache.slugifyUrl(longUrl);
  assert.ok(slug.length <= 200, `slug length ${slug.length} exceeds 200`);
});

// ─── ensureCacheDir tests ────────────────────────────────────────────────────

test('ensureCacheDir: creates scrapes/, crawls/, snapshots/ subdirectories', () => {
  const root = tmpRoot();
  try {
    cache.ensureCacheDir(root);
    const cacheDir = path.join(root, '.planning', 'research', 'firecrawl-cache');
    assert.ok(fs.existsSync(path.join(cacheDir, 'scrapes')), 'scrapes/ missing');
    assert.ok(fs.existsSync(path.join(cacheDir, 'crawls')), 'crawls/ missing');
    assert.ok(fs.existsSync(path.join(cacheDir, 'snapshots')), 'snapshots/ missing');
  } finally {
    cleanup(root);
  }
});

// ─── writeSource / readSource tests ──────────────────────────────────────────

test('writeSource: writes content and returns correct result', () => {
  const root = tmpRoot();
  try {
    const result = cache.writeSource('https://example.com/page', 'Hello world content', {}, {}, root);
    assert.strictEqual(result.cached, false);
    assert.strictEqual(result.written, true);
    assert.ok(result.slug, 'slug should be present');
    assert.ok(result.path, 'path should be present');
  } finally {
    cleanup(root);
  }
});

test('readSource: reads back exact content written by writeSource', () => {
  const root = tmpRoot();
  try {
    const content = 'This is test markdown content.\n\n## Section\n\nParagraph.';
    cache.writeSource('https://example.com/roundtrip', content, {}, {}, root);
    const slug = cache.slugifyUrl('https://example.com/roundtrip');
    const readBack = cache.readSource(slug, root);
    assert.strictEqual(readBack, content);
  } finally {
    cleanup(root);
  }
});

test('writeSource: second call with same URL returns cached:true (idempotent)', () => {
  const root = tmpRoot();
  try {
    cache.writeSource('https://example.com/idem', 'content', {}, {}, root);
    const result2 = cache.writeSource('https://example.com/idem', 'content', {}, {}, root);
    assert.strictEqual(result2.cached, true);
    assert.strictEqual(result2.written, false);
  } finally {
    cleanup(root);
  }
});

test('writeSource: with force:true overwrites existing', () => {
  const root = tmpRoot();
  try {
    cache.writeSource('https://example.com/force', 'original', {}, {}, root);
    const result = cache.writeSource('https://example.com/force', 'updated', {}, { force: true }, root);
    assert.strictEqual(result.written, true);
    const slug = cache.slugifyUrl('https://example.com/force');
    const readBack = cache.readSource(slug, root);
    assert.strictEqual(readBack, 'updated');
  } finally {
    cleanup(root);
  }
});

test('writeSource: updates sources-manifest.json with entry', () => {
  const root = tmpRoot();
  try {
    cache.writeSource('https://example.com/manifest-test', 'Some words here for counting', { type: 'scrape' }, {}, root);
    const manifest = cache.readManifest(root);
    assert.ok(manifest.sources.length >= 1, 'manifest should have at least 1 source');
    const entry = manifest.sources.find(s => s.url === 'https://example.com/manifest-test');
    assert.ok(entry, 'entry for URL should exist');
    assert.ok(entry.slug, 'entry.slug should exist');
    assert.strictEqual(entry.type, 'scrape');
    assert.ok(entry.word_count > 0, 'word_count should be > 0');
    assert.ok(entry.scraped_at, 'scraped_at should exist');
  } finally {
    cleanup(root);
  }
});

// ─── readManifest tests ─────────────────────────────────────────────────────

test('readManifest: returns default empty manifest when file does not exist', () => {
  const root = tmpRoot();
  try {
    const manifest = cache.readManifest(root);
    assert.strictEqual(manifest.schema_version, '1.0.0');
    assert.ok(Array.isArray(manifest.sources));
    assert.strictEqual(manifest.sources.length, 0);
  } finally {
    cleanup(root);
  }
});

// ─── writeCrawl tests ────────────────────────────────────────────────────────

test('writeCrawl: creates crawl directory with individual page files', () => {
  const root = tmpRoot();
  try {
    const pages = [
      { url: 'https://site.com/', content: '# Home page' },
      { url: 'https://site.com/about', content: '# About page' },
    ];
    const result = cache.writeCrawl('https://site.com', pages, {}, {}, root);
    assert.ok(result.slug, 'slug should be present');
    const crawlDir = path.join(root, '.planning', 'research', 'firecrawl-cache', 'crawls', result.slug);
    assert.ok(fs.existsSync(crawlDir), 'crawl directory should exist');
    const files = fs.readdirSync(crawlDir);
    assert.strictEqual(files.length, 2, 'should have 2 page files');
  } finally {
    cleanup(root);
  }
});

// ─── writeSnapshot / readSnapshot tests ──────────────────────────────────────

test('writeSnapshot: writes to snapshots/{slug}.md', () => {
  const root = tmpRoot();
  try {
    const result = cache.writeSnapshot('https://example.com/snap', 'snapshot content', root);
    assert.ok(result.slug, 'slug should be present');
    const snapPath = path.join(root, '.planning', 'research', 'firecrawl-cache', 'snapshots', result.slug + '.md');
    assert.ok(fs.existsSync(snapPath), 'snapshot file should exist');
  } finally {
    cleanup(root);
  }
});

test('readSnapshot: reads back exact content written by writeSnapshot', () => {
  const root = tmpRoot();
  try {
    const content = 'Snapshot baseline content for change tracking.';
    cache.writeSnapshot('https://example.com/snapread', content, root);
    const slug = cache.slugifyUrl('https://example.com/snapread');
    const readBack = cache.readSnapshot(slug, root);
    assert.strictEqual(readBack, content);
  } finally {
    cleanup(root);
  }
});

// ─── Atomic manifest write test ──────────────────────────────────────────────

test('manifest: atomic tmp+rename -- no .tmp file persists after write', () => {
  const root = tmpRoot();
  try {
    cache.writeSource('https://example.com/atomic', 'content', {}, {}, root);
    const manifestDir = path.join(root, '.planning');
    const files = fs.readdirSync(manifestDir);
    const tmpFiles = files.filter(f => f.includes('.tmp'));
    assert.strictEqual(tmpFiles.length, 0, `tmp files should not persist, found: ${tmpFiles.join(', ')}`);
  } finally {
    cleanup(root);
  }
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passCount}/${testCount} tests passed`);
if (passCount < testCount) {
  console.log(`${testCount - passCount} test(s) FAILED`);
  process.exit(1);
}
console.log('All tests passed!');
