'use strict';
/**
 * strategy-weights.cjs — Meta-optimization: compute strategy effectiveness weights
 * from JSONL experiment history.
 *
 * Exports:
 *   computeStrategyWeights(cwd, limit) -> Array<{ tag, keep_rate, total }>
 *   extractTags(description)           -> Array<string>
 *
 * META-01: computeStrategyWeights reads all results.jsonl files under
 *   .planning/experiments/ and returns strategies sorted by KEEP rate.
 * META-02: extractTags extracts keyword signals from iteration descriptions.
 * MIN_SAMPLE = 3: strategies with fewer occurrences are filtered out.
 *
 * Under 100 lines — scope creep prevention.
 */

const fs = require('fs');
const path = require('path');

const MIN_SAMPLE = 3;

/**
 * extractTags(description) -> string[]
 *
 * Extracts lowercase words longer than 4 characters containing only a-z.
 * Used as strategy signal keys from iteration description text.
 */
function extractTags(description) {
  if (!description || typeof description !== 'string') return [];
  const words = description.toLowerCase().split(/\s+/);
  return words.filter(w => w.length > 4 && /^[a-z]+$/.test(w));
}

/**
 * computeStrategyWeights(cwd, limit) -> Array<{ tag, keep_rate, total }>
 *
 * Scans .planning/experiments/{slug}/results.jsonl for all experiment slugs,
 * aggregates KEEP/total counts per tag, filters by MIN_SAMPLE, and returns
 * top `limit` strategies sorted by keep_rate descending.
 *
 * @param {string} cwd   - Project root directory (default: '.')
 * @param {number} limit - Max results to return (default: 3)
 * @returns {Array<{ tag: string, keep_rate: number, total: number }>}
 */
function computeStrategyWeights(cwd, limit = 3) {
  const experimentsDir = path.join(cwd || '.', '.planning', 'experiments');
  if (!fs.existsSync(experimentsDir)) return [];

  const strategyMap = new Map();
  try {
    for (const slug of fs.readdirSync(experimentsDir)) {
      const jsonlPath = path.join(experimentsDir, slug, 'results.jsonl');
      if (!fs.existsSync(jsonlPath)) continue;
      const lines = fs.readFileSync(jsonlPath, 'utf-8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line);
          const tags = extractTags(row.description || '');
          for (const tag of tags) {
            const entry = strategyMap.get(tag) || { keep: 0, total: 0 };
            entry.total++;
            if (row.status === 'KEEP') entry.keep++;
            strategyMap.set(tag, entry);
          }
        } catch { /* skip malformed rows */ }
      }
    }
  } catch { return []; }

  return Array.from(strategyMap.entries())
    .map(([tag, { keep, total }]) => ({ tag, keep_rate: total > 0 ? keep / total : 0, total }))
    .filter(s => s.total >= MIN_SAMPLE)
    .sort((a, b) => b.keep_rate - a.keep_rate)
    .slice(0, limit);
}

module.exports = { computeStrategyWeights, extractTags };

// ─── CLI entry point ──────────────────────────────────────────────────────────
// When invoked directly with --strategy-hint, prints a strategy_hint XML block
// to stdout for injection into experiment runner prompts (META-04).
// Exits 0 always — empty output signals no history available.
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--strategy-hint')) {
    const weights = computeStrategyWeights('.');
    if (weights.length === 0) process.exit(0);
    const lines = weights.map(w => w.tag + ': ' + Math.round(w.keep_rate * 100) + '% keep rate (' + w.total + ' runs)');
    console.log('<strategy_hint>');
    console.log('Historical strategy effectiveness (top ' + weights.length + ' by KEEP rate):');
    lines.forEach(l => console.log(l));
    console.log('Prefer strategies matching these patterns when generating mutations.');
    console.log('</strategy_hint>');
  }
}
