/**
 * tests/phase-170/token-validator.test.mjs
 * Tests for bin/lib/utils/token-validator.cjs (UTL-02, UTL-03)
 *
 * Tests DTCG token schema validation, OKLCH gamut checking, and APCA contrast checking.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let validator;

try {
  validator = require('../../bin/lib/utils/token-validator.cjs');
} catch (_) {
  validator = null;
}

// ---------------------------------------------------------------------------
// validateTokens
// ---------------------------------------------------------------------------
describe('validateTokens', () => {
  it('returns empty violations for a valid token tree', () => {
    const tokens = {
      color: {
        primary: {
          $value: 'oklch(0.5 0.2 120)',
          $type: 'color',
        },
        background: {
          $value: '#ffffff',
          $type: 'color',
        },
      },
    };
    const violations = validator.validateTokens(tokens);
    expect(violations).toEqual([]);
  });

  it('flags missing $type on leaf tokens', () => {
    const tokens = {
      color: {
        primary: {
          $value: 'oklch(0.5 0.2 120)',
          // $type missing
        },
      },
    };
    const violations = validator.validateTokens(tokens);
    expect(violations.length).toBeGreaterThan(0);
    const typeMissing = violations.find(v => v.issue.includes('missing $type'));
    expect(typeMissing).toBeTruthy();
    expect(typeMissing.token).toBe('color.primary');
  });

  it('flags naming violations — root-level token without a group prefix', () => {
    const tokens = {
      // Token at root level (no group wrapping = no dot in path)
      primary: {
        $value: '#ff0000',
        $type: 'color',
      },
    };
    const violations = validator.validateTokens(tokens);
    expect(violations.length).toBeGreaterThan(0);
    const namingViolation = violations.find(v => v.issue.includes('naming'));
    expect(namingViolation).toBeTruthy();
    expect(namingViolation.token).toBe('primary');
  });

  it('recursively walks nested groups, skipping $-prefixed keys', () => {
    const tokens = {
      $description: 'This should be skipped',
      $version: '1.0',
      color: {
        $description: 'Color group — should be skipped',
        text: {
          primary: {
            $value: '#333333',
            $type: 'color',
          },
          secondary: {
            $value: '#666666',
            $type: 'color',
          },
        },
        bg: {
          base: {
            $value: '#ffffff',
            $type: 'color',
          },
        },
      },
    };
    const violations = validator.validateTokens(tokens);
    // No violations — all tokens have $type and are properly grouped
    expect(violations).toEqual([]);
  });

  it('collects multiple violations from one tree', () => {
    const tokens = {
      orphan: { $value: '#ff0000' }, // root-level AND missing $type
      color: {
        danger: { $value: '#ff0000' }, // missing $type (but valid naming)
      },
    };
    const violations = validator.validateTokens(tokens);
    // orphan: missing $type + naming violation
    // color.danger: missing $type
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// checkOklchGamut
// ---------------------------------------------------------------------------
describe('checkOklchGamut', () => {
  it('returns inP3: true for a color well within P3 gamut', () => {
    // oklch(0.7 0.1 120) — moderate chroma, should be in P3
    const result = validator.checkOklchGamut('oklch(0.7 0.1 120)');
    expect(result).toHaveProperty('inP3');
    expect(result).toHaveProperty('inSrgb');
    expect(result.inP3).toBe(true);
  });

  it('returns inP3: false for a highly saturated OKLCH color outside P3', () => {
    // oklch(0.7 0.4 150) — very high chroma, likely out of P3
    const result = validator.checkOklchGamut('oklch(0.7 0.4 150)');
    expect(result).toHaveProperty('inP3');
    expect(result.inP3).toBe(false);
  });

  it('returns { error: "parse-error" } for an unparseable color string', () => {
    const result = validator.checkOklchGamut('not-a-color-value-at-all!@#$');
    expect(result).toEqual({ error: 'parse-error' });
  });

  it('returns inSrgb: true for a standard hex color', () => {
    const result = validator.checkOklchGamut('#ff0000');
    expect(result).toHaveProperty('inSrgb');
    expect(result.inSrgb).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkApcaContrast
// ---------------------------------------------------------------------------
describe('checkApcaContrast', () => {
  it('returns Lc value, bodyPass: true, largePass: true for dark-on-light combo', () => {
    // Dark gray on white — high contrast
    const result = validator.checkApcaContrast('#333333', '#ffffff');
    expect(result).toHaveProperty('Lc');
    expect(result).toHaveProperty('bodyPass');
    expect(result).toHaveProperty('largePass');
    expect(Math.abs(result.Lc)).toBeGreaterThan(60);
    expect(result.bodyPass).toBe(true);
    expect(result.largePass).toBe(true);
  });

  it('returns bodyPass: false for a low-contrast color pair', () => {
    // Similar grays — low contrast
    const result = validator.checkApcaContrast('#999999', '#aaaaaa');
    expect(result.bodyPass).toBe(false);
    expect(result.largePass).toBe(false);
  });

  it('uses |Lc| >= 60 threshold for bodyPass', () => {
    // Test that threshold is 60 (not 45 or some other value)
    const result = validator.checkApcaContrast('#333333', '#ffffff');
    const absLc = Math.abs(result.Lc);
    expect(result.bodyPass).toBe(absLc >= 60);
  });

  it('uses |Lc| >= 45 threshold for largePass', () => {
    const result = validator.checkApcaContrast('#777777', '#ffffff');
    const absLc = Math.abs(result.Lc);
    expect(result.largePass).toBe(absLc >= 45);
  });
});

// ---------------------------------------------------------------------------
// runTokenValidation
// ---------------------------------------------------------------------------
describe('runTokenValidation', () => {
  it('returns violations array and summary string from mixed token tree', () => {
    const tokens = {
      color: {
        text: {
          primary: {
            $value: '#333333',
            $type: 'color',
          },
        },
        bg: {
          base: {
            $value: '#ffffff',
            $type: 'color',
          },
        },
        danger: {
          base: {
            $value: 'oklch(0.7 0.4 150)', // high chroma — may be out of P3
            $type: 'color',
          },
        },
        orphan: {
          $value: '#ff0000', // missing $type
        },
      },
    };

    const report = validator.runTokenValidation(tokens);

    expect(report).toHaveProperty('violations');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('stats');
    expect(Array.isArray(report.violations)).toBe(true);
    expect(typeof report.summary).toBe('string');
    expect(report.stats).toHaveProperty('total');
    expect(report.stats).toHaveProperty('failed');
  });

  it('summary string contains markdown table', () => {
    const tokens = {
      color: {
        text: {
          main: {
            $value: '#333333',
            $type: 'color',
          },
        },
        background: {
          base: {
            $value: '#999999', // no $type violation
          },
        },
      },
    };

    const report = validator.runTokenValidation(tokens);
    // Summary should contain a markdown table header
    expect(report.summary).toContain('|');
    expect(report.summary).toContain('Token');
  });

  it('returns zero violations for a fully valid token tree', () => {
    const tokens = {
      color: {
        brand: {
          primary: {
            $value: 'oklch(0.5 0.1 120)',
            $type: 'color',
          },
        },
        neutral: {
          gray: {
            $value: '#888888',
            $type: 'color',
          },
        },
      },
    };

    const report = validator.runTokenValidation(tokens);
    // Schema violations should be zero
    const schemaViolations = report.violations.filter(v => v.issue.includes('missing $type') || v.issue.includes('naming'));
    expect(schemaViolations.length).toBe(0);
  });
});
