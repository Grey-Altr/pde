/**
 * PEN-01 — DTCG-to-Pencil variable format conversion
 *
 * Tests dtcgToPencilVariables() and mergePencilVariables() functions inline
 * (no external imports). These functions are embedded in sync-pencil.md — not
 * in a shared module. Zero npm dependency: pure Node.js built-ins only.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Inline implementations (matches sync-pencil.md embedded logic) ─────────────

function dtcgToPencilVariables(dtcgTokens, prefix) {
  const result = {};
  for (const [key, value] of Object.entries(dtcgTokens)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value.$type && value.$value !== undefined) {
      const pencilType = value.$type === 'color' ? 'color'
        : (value.$type === 'dimension' || value.$type === 'fontWeight') ? 'number'
        : (value.$type === 'fontFamily' || value.$type === 'string') ? 'string'
        : null;
      if (pencilType !== null) {
        const pencilValue = pencilType === 'number'
          ? parseFloat(String(value.$value).replace('px', ''))
          : value.$value;
        result[fullKey] = { type: pencilType, value: pencilValue };
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, dtcgToPencilVariables(value, fullKey));
    }
  }
  return result;
}

function mergePencilVariables(existing, incoming) {
  const merged = Object.assign({}, existing);
  for (const [key, variable] of Object.entries(incoming)) {
    merged[key] = variable;
  }
  return merged;
}

// ─── dtcgToPencilVariables tests ──────────────────────────────────────────────

describe('PEN-01 — dtcgToPencilVariables conversion', () => {
  it('converts color token {$type:"color",$value:"#3b82f6"} to {type:"color",value:"#3b82f6"}', () => {
    const dtcg = { primary: { '500': { $type: 'color', $value: '#3b82f6' } } };
    const result = dtcgToPencilVariables(dtcg, 'color');
    assert.deepEqual(result['color.primary.500'], { type: 'color', value: '#3b82f6' });
  });

  it('converts dimension token {$type:"dimension",$value:"16px"} to {type:"number",value:16}', () => {
    const dtcg = { base: { $type: 'dimension', $value: '16px' } };
    const result = dtcgToPencilVariables(dtcg, 'spacing');
    assert.deepEqual(result['spacing.base'], { type: 'number', value: 16 });
  });

  it('converts fontWeight token {$type:"fontWeight",$value:700} to {type:"number",value:700}', () => {
    const dtcg = { bold: { $type: 'fontWeight', $value: 700 } };
    const result = dtcgToPencilVariables(dtcg, 'font');
    assert.deepEqual(result['font.bold'], { type: 'number', value: 700 });
  });

  it('converts fontFamily token {$type:"fontFamily",$value:"Inter"} to {type:"string",value:"Inter"}', () => {
    const dtcg = { sans: { $type: 'fontFamily', $value: 'Inter' } };
    const result = dtcgToPencilVariables(dtcg, 'font');
    assert.deepEqual(result['font.sans'], { type: 'string', value: 'Inter' });
  });

  it('skips shadow type (unsupported) — returns empty result', () => {
    const dtcg = { base: { $type: 'shadow', $value: '0 1px 3px #000' } };
    const result = dtcgToPencilVariables(dtcg, 'shadow');
    assert.equal(Object.keys(result).length, 0);
  });

  it('handles nested DTCG groups with correct dot-notation keys', () => {
    const dtcg = {
      color: {
        primary: {
          '500': { $type: 'color', $value: '#3b82f6' },
          '600': { $type: 'color', $value: '#2563eb' },
        },
      },
    };
    const result = dtcgToPencilVariables(dtcg, '');
    assert.deepEqual(result['color.primary.500'], { type: 'color', value: '#3b82f6' });
    assert.deepEqual(result['color.primary.600'], { type: 'color', value: '#2563eb' });
  });

  it('handles empty input — returns empty object', () => {
    const result = dtcgToPencilVariables({}, '');
    assert.deepEqual(result, {});
  });
});

// ─── mergePencilVariables tests ───────────────────────────────────────────────

describe('PEN-01 — mergePencilVariables non-destructive merge', () => {
  const existing = {
    'color.primary': { type: 'color', value: '#old' },
    'color.background': { type: 'color', value: '#ffffff' },
  };

  const incoming = {
    'color.primary': { type: 'color', value: '#new' },
    'spacing.base': { type: 'number', value: 16 },
  };

  it('preserves existing keys not in incoming (color.background)', () => {
    const merged = mergePencilVariables(existing, incoming);
    assert.ok(merged['color.background'], 'color.background should be preserved');
    assert.deepEqual(merged['color.background'], { type: 'color', value: '#ffffff' });
  });

  it('updates existing keys that are in incoming (color.primary)', () => {
    const merged = mergePencilVariables(existing, incoming);
    assert.deepEqual(merged['color.primary'], { type: 'color', value: '#new' });
  });

  it('inserts new keys from incoming (spacing.base)', () => {
    const merged = mergePencilVariables(existing, incoming);
    assert.deepEqual(merged['spacing.base'], { type: 'number', value: 16 });
  });
});
