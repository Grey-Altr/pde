/**
 * FIG-01 — Figma color conversion and non-destructive merge logic
 *
 * Tests figmaColorToCss() and mergeTokens() functions inline (no external imports).
 * These functions are embedded in the sync-figma.md workflow — not in a shared module.
 * Zero npm dependency: pure Node.js built-ins only.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Inline implementations (matches sync-figma.md embedded logic) ─────────────

function figmaColorToCss(color) {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  if (color.a === 1 || color.a === undefined) {
    return `#${r}${g}${b}`;
  }
  const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}${a}`;
}

function mergeTokens(existing, incoming) {
  const merged = JSON.parse(JSON.stringify(existing)); // deep clone — non-mutating
  for (const [group, tokens] of Object.entries(incoming)) {
    if (!merged[group]) merged[group] = {};
    for (const [key, token] of Object.entries(tokens)) {
      if (merged[group][key]) {
        // UPDATE: update $value, preserve existing $description if incoming has none
        merged[group][key].$value = token.$value;
        if (token.$description) merged[group][key].$description = token.$description;
      } else {
        // INSERT: new token from Figma
        merged[group][key] = token;
      }
    }
  }
  return merged;
}

// ─── figmaColorToCss tests ─────────────────────────────────────────────────────

describe('FIG-01 — figmaColorToCss color conversion', () => {
  it('converts blue (r:0, g:0.4, b:1, a:1) to #0066ff', () => {
    assert.equal(figmaColorToCss({ r: 0, g: 0.4, b: 1, a: 1 }), '#0066ff');
  });

  it('converts white (r:1, g:1, b:1, a:1) to #ffffff', () => {
    assert.equal(figmaColorToCss({ r: 1, g: 1, b: 1, a: 1 }), '#ffffff');
  });

  it('converts black (r:0, g:0, b:0, a:1) to #000000', () => {
    assert.equal(figmaColorToCss({ r: 0, g: 0, b: 0, a: 1 }), '#000000');
  });

  it('returns 8-char hex with alpha when a < 1 (r:1, g:0, b:0, a:0.5)', () => {
    const result = figmaColorToCss({ r: 1, g: 0, b: 0, a: 0.5 });
    assert.equal(result.length, 9, `Expected 9-char hex (#RRGGBBAA), got "${result}" (length ${result.length})`);
    assert.match(result, /^#[0-9a-f]{8}$/, `Expected #RRGGBBAA format, got "${result}"`);
    assert.equal(result, '#ff000080'); // r=255, g=0, b=0, a=128 (0x80)
  });

  it('treats undefined alpha as 1 (6-char hex output)', () => {
    const result = figmaColorToCss({ r: 0.5, g: 0.5, b: 0.5 });
    assert.equal(result.length, 7, `Expected 7-char hex (#RRGGBB), got "${result}"`);
    assert.match(result, /^#[0-9a-f]{6}$/, `Expected #RRGGBB format, got "${result}"`);
  });
});

// ─── mergeTokens tests ─────────────────────────────────────────────────────────

describe('FIG-01 — mergeTokens non-destructive merge', () => {
  const existingTokens = {
    color: {
      primary: { $type: 'color', $value: '#old', $description: 'PDE token' },
    },
    spacing: {
      sm: { $type: 'dimension', $value: '4px' },
    },
  };

  const incomingTokens = {
    color: {
      primary: { $type: 'color', $value: '#new' },
      secondary: { $type: 'color', $value: '#aabb' },
    },
  };

  it('preserves existing tokens NOT in incoming (spacing.sm)', () => {
    const merged = mergeTokens(existingTokens, incomingTokens);
    assert.ok(merged.spacing, 'spacing group should be preserved');
    assert.ok(merged.spacing.sm, 'spacing.sm should be preserved');
    assert.equal(merged.spacing.sm.$value, '4px', 'spacing.sm.$value should be unchanged');
  });

  it('updates $value for existing tokens that match incoming', () => {
    const merged = mergeTokens(existingTokens, incomingTokens);
    assert.equal(merged.color.primary.$value, '#new', 'primary.$value should be updated from #old to #new');
  });

  it('preserves existing $description when incoming has none', () => {
    const merged = mergeTokens(existingTokens, incomingTokens);
    assert.equal(
      merged.color.primary.$description,
      'PDE token',
      'primary.$description should be preserved when incoming.primary has no $description'
    );
  });

  it('inserts new tokens from incoming', () => {
    const merged = mergeTokens(existingTokens, incomingTokens);
    assert.ok(merged.color.secondary, 'secondary token should be inserted');
    assert.equal(merged.color.secondary.$value, '#aabb', 'secondary.$value should match incoming');
  });

  it('does not mutate the original existing object', () => {
    const original = JSON.parse(JSON.stringify(existingTokens));
    mergeTokens(existingTokens, incomingTokens);
    assert.deepEqual(existingTokens, original, 'existing object must not be mutated');
  });
});
