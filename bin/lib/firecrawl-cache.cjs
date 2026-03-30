'use strict';

const fs = require('fs');
const path = require('path');
const { safeReadFile } = require('./core.cjs');

// ─── URL Slug Generation ─────────────────────────────────────────────────────

/**
 * Convert a URL to a deterministic, filesystem-safe slug.
 * Strips protocol, replaces unsafe chars with dashes, collapses, lowercases, truncates.
 * @param {string} url
 * @returns {string}
 */
function slugifyUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[\/\?#&=:@]/g, '-')
    .replace(/\./g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 200);
}

// ─── Path Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the firecrawl cache directory path.
 * @param {string} [projectRoot]
 * @returns {string}
 */
function resolveCacheDir(projectRoot) {
  return path.join(projectRoot || process.cwd(), '.planning', 'research', 'firecrawl-cache');
}

/**
 * Resolve the sources-manifest.json path.
 * @param {string} [projectRoot]
 * @returns {string}
 */
function resolveManifestPath(projectRoot) {
  return path.join(projectRoot || process.cwd(), '.planning', 'sources-manifest.json');
}

// ─── Directory Setup ─────────────────────────────────────────────────────────

/**
 * Ensure the firecrawl cache directory tree exists (scrapes/, crawls/, snapshots/).
 * @param {string} [projectRoot]
 */
function ensureCacheDir(projectRoot) {
  const cacheDir = resolveCacheDir(projectRoot);
  fs.mkdirSync(path.join(cacheDir, 'scrapes'), { recursive: true });
  fs.mkdirSync(path.join(cacheDir, 'crawls'), { recursive: true });
  fs.mkdirSync(path.join(cacheDir, 'snapshots'), { recursive: true });
}

// ─── Manifest I/O ────────────────────────────────────────────────────────────

/**
 * Read the sources manifest. Returns default empty manifest if file missing.
 * @param {string} [projectRoot]
 * @returns {Object}
 */
function readManifest(projectRoot) {
  const manifestPath = resolveManifestPath(projectRoot);
  const raw = safeReadFile(manifestPath);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // Corrupt manifest — return default
    }
  }
  const now = new Date().toISOString();
  return {
    schema_version: '1.0.0',
    created_at: now,
    updated_at: now,
    sources: [],
  };
}

/**
 * Write the sources manifest atomically using PID-suffixed tmp file + rename.
 * @param {string} projectRoot
 * @param {Object} manifest
 */
function writeManifest(projectRoot, manifest) {
  const manifestPath = resolveManifestPath(projectRoot);
  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  manifest.updated_at = new Date().toISOString();
  const tmpPath = manifestPath + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.renameSync(tmpPath, manifestPath);
}

// ─── Source I/O (scrapes/) ───────────────────────────────────────────────────

/**
 * Write scraped content to the cache. Idempotent by default — skips if file
 * already exists unless opts.force is true.
 *
 * @param {string} url — original URL
 * @param {string} content — markdown content
 * @param {Object} [metadata] — { type, added_by, ... }
 * @param {Object} [opts] — { force: boolean }
 * @param {string} [projectRoot]
 * @returns {{ slug: string, path: string, cached: boolean, written: boolean }}
 */
function writeSource(url, content, metadata, opts, projectRoot) {
  metadata = metadata || {};
  opts = opts || {};

  const slug = slugifyUrl(url);
  ensureCacheDir(projectRoot);

  const filePath = path.join(resolveCacheDir(projectRoot), 'scrapes', slug + '.md');

  // Idempotent: if file exists and not forcing, return cached
  if (fs.existsSync(filePath) && !opts.force) {
    return { slug, path: filePath, cached: true, written: false };
  }

  // Write content
  fs.writeFileSync(filePath, content, 'utf-8');

  // Update manifest atomically
  const manifest = readManifest(projectRoot);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const now = new Date().toISOString();

  const entry = {
    slug,
    url,
    type: metadata.type || 'scrape',
    format: 'markdown',
    word_count: wordCount,
    scraped_at: now,
    cached_path: filePath,
    added_by: metadata.added_by || 'cache-module',
  };

  // Deduplicate by slug — update existing or append
  const idx = manifest.sources.findIndex(s => s.slug === slug);
  if (idx >= 0) {
    manifest.sources[idx] = entry;
  } else {
    manifest.sources.push(entry);
  }

  writeManifest(projectRoot, manifest);

  return { slug, path: filePath, cached: false, written: true };
}

/**
 * Read a scraped source by slug.
 * @param {string} slug
 * @param {string} [projectRoot]
 * @returns {string|null}
 */
function readSource(slug, projectRoot) {
  const filePath = path.join(resolveCacheDir(projectRoot), 'scrapes', slug + '.md');
  return safeReadFile(filePath);
}

// ─── Crawl I/O (crawls/) ────────────────────────────────────────────────────

/**
 * Write crawl results — a directory of individual page files.
 *
 * @param {string} url — root URL of the crawl
 * @param {Array<{url: string, content: string}>} pages — crawled pages
 * @param {Object} [metadata]
 * @param {Object} [opts]
 * @param {string} [projectRoot]
 * @returns {{ slug: string, path: string, page_count: number }}
 */
function writeCrawl(url, pages, metadata, opts, projectRoot) {
  metadata = metadata || {};
  opts = opts || {};

  const slug = slugifyUrl(url);
  ensureCacheDir(projectRoot);

  const crawlDir = path.join(resolveCacheDir(projectRoot), 'crawls', slug);
  fs.mkdirSync(crawlDir, { recursive: true });

  let totalWordCount = 0;

  pages.forEach((page, index) => {
    const pageSlug = slugifyUrl(page.url);
    const fileName = `${index}-${pageSlug}.md`;
    fs.writeFileSync(path.join(crawlDir, fileName), page.content, 'utf-8');
    totalWordCount += page.content.split(/\s+/).filter(Boolean).length;
  });

  // Update manifest
  const manifest = readManifest(projectRoot);
  const now = new Date().toISOString();

  const entry = {
    slug,
    url,
    type: 'crawl',
    format: 'markdown',
    page_count: pages.length,
    total_word_count: totalWordCount,
    scraped_at: now,
    cached_path: crawlDir,
    added_by: metadata.added_by || 'cache-module',
  };

  const idx = manifest.sources.findIndex(s => s.slug === slug);
  if (idx >= 0) {
    manifest.sources[idx] = entry;
  } else {
    manifest.sources.push(entry);
  }

  writeManifest(projectRoot, manifest);

  return { slug, path: crawlDir, page_count: pages.length };
}

// ─── Snapshot I/O (snapshots/) ───────────────────────────────────────────────

/**
 * Write a snapshot for change tracking.
 * @param {string} url
 * @param {string} content
 * @param {string} [projectRoot]
 * @returns {{ slug: string, path: string }}
 */
function writeSnapshot(url, content, projectRoot) {
  const slug = slugifyUrl(url);
  ensureCacheDir(projectRoot);

  const filePath = path.join(resolveCacheDir(projectRoot), 'snapshots', slug + '.md');
  fs.writeFileSync(filePath, content, 'utf-8');

  return { slug, path: filePath };
}

/**
 * Read a snapshot by slug.
 * @param {string} slug
 * @param {string} [projectRoot]
 * @returns {string|null}
 */
function readSnapshot(slug, projectRoot) {
  const filePath = path.join(resolveCacheDir(projectRoot), 'snapshots', slug + '.md');
  return safeReadFile(filePath);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  slugifyUrl,
  ensureCacheDir,
  resolveCacheDir,
  resolveManifestPath,
  readManifest,
  writeManifest,
  writeSource,
  readSource,
  writeCrawl,
  writeSnapshot,
  readSnapshot,
};
