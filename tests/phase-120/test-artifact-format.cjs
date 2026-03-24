'use strict';

/**
 * test-artifact-format.cjs — Unit tests for artifact-format.cjs module
 *
 * Covers requirements: FMT-01, FMT-02, FMT-03
 * Tests run in isolated temp directories — no side effects on real project.
 *
 * Run: node --test tests/phase-120/test-artifact-format.cjs
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  generateFileAnnotations,
  generateTailwindTheme,
  generateCssVarsFromTheme,
  dtcgToThemeLines,
  typeToNamespace,
  detectFramework,
  generateComponentStub,
} = require('../../bin/lib/artifact-format.cjs');

// ─── Test fixture helpers ──────────────────────────────────────────────────

/**
 * Create a temp directory with a package.json for framework detection tests.
 */
function createTmpWithPackageJson(deps, devDeps) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-fmt-test-'));
  const pkg = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: deps || {},
    devDependencies: devDeps || {},
  };
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8');
  return tmpDir;
}

/**
 * Create a temp directory without a package.json.
 */
function createTmpNoPackageJson() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-fmt-no-pkg-'));
}

// ─── FMT-01: @file Annotations ────────────────────────────────────────────

describe('FMT-01: generateFileAnnotations', () => {
  it('produces 3-line HTML comment block with name, props, tokens', () => {
    const result = generateFileAnnotations({
      name: 'Button',
      props: 'ButtonProps',
      tokens: ['--color-primary', '--radius-md'],
    });
    assert.ok(result.includes('<!-- @component: Button -->'), 'should include @component line');
    assert.ok(result.includes('<!-- @props: ButtonProps -->'), 'should include @props line');
    assert.ok(result.includes('<!-- @tokens: --color-primary, --radius-md -->'), 'should include @tokens line');
  });

  it('produces annotations extractable via the standard regex', () => {
    const result = generateFileAnnotations({
      name: 'Card',
      props: 'CardProps',
      tokens: ['--color-surface', '--spacing-base'],
    });
    const regex = /<!-- @(component|props|tokens): ([^>]+) -->/g;
    const matches = [...result.matchAll(regex)];
    assert.equal(matches.length, 3, 'regex should match exactly 3 annotations');
    assert.equal(matches[0][1], 'component');
    assert.equal(matches[0][2], 'Card');
    assert.equal(matches[1][1], 'props');
    assert.equal(matches[1][2], 'CardProps');
    assert.equal(matches[2][1], 'tokens');
    assert.equal(matches[2][2], '--color-surface, --spacing-base');
  });

  it('omits @tokens line when tokens array is empty', () => {
    const result = generateFileAnnotations({ name: 'Icon', props: 'IconProps', tokens: [] });
    assert.ok(!result.includes('@tokens'), 'should not include @tokens line when empty');
    const regex = /<!-- @(component|props|tokens): ([^>]+) -->/g;
    const matches = [...result.matchAll(regex)];
    assert.equal(matches.length, 2, 'regex should match exactly 2 annotations');
  });

  it('omits @tokens line when tokens is not provided', () => {
    const result = generateFileAnnotations({ name: 'Badge' });
    assert.ok(!result.includes('@tokens'), 'should not include @tokens line when missing');
  });

  it('defaults props name to {name}Props when not provided', () => {
    const result = generateFileAnnotations({ name: 'Tooltip' });
    assert.ok(result.includes('<!-- @props: TooltipProps -->'), 'should default props to TooltipProps');
  });

  it('output format is exactly 3 lines when all fields present', () => {
    const result = generateFileAnnotations({
      name: 'Button',
      props: 'ButtonProps',
      tokens: ['--color-primary'],
    });
    const lines = result.split('\n').filter(l => l.length > 0);
    assert.equal(lines.length, 3, 'should produce exactly 3 non-empty lines');
  });
});

// ─── FMT-02: DTCG-to-Tailwind @theme ─────────────────────────────────────

describe('FMT-02: typeToNamespace', () => {
  it('maps color to --color-', () => {
    assert.equal(typeToNamespace('color'), '--color-');
  });

  it('maps dimension to --spacing-', () => {
    assert.equal(typeToNamespace('dimension'), '--spacing-');
  });

  it('maps fontFamily to --font-', () => {
    assert.equal(typeToNamespace('fontFamily'), '--font-');
  });

  it('maps fontSize to --text-', () => {
    assert.equal(typeToNamespace('fontSize'), '--text-');
  });

  it('maps fontWeight to --font-weight-', () => {
    assert.equal(typeToNamespace('fontWeight'), '--font-weight-');
  });

  it('maps borderRadius to --radius-', () => {
    assert.equal(typeToNamespace('borderRadius'), '--radius-');
  });

  it('maps shadow to --shadow-', () => {
    assert.equal(typeToNamespace('shadow'), '--shadow-');
  });

  it('maps unknown type to -- (generic)', () => {
    assert.equal(typeToNamespace('unknownType'), '--');
  });

  it('maps null/undefined to -- (generic)', () => {
    assert.equal(typeToNamespace(null), '--');
    assert.equal(typeToNamespace(undefined), '--');
  });
});

describe('FMT-02: generateTailwindTheme', () => {
  const sampleTokens = {
    color: {
      primary: { $value: 'oklch(0.7 0.15 150)', $type: 'color' },
      surface: { $value: 'oklch(0.95 0.02 90)', $type: 'color' },
    },
    spacing: {
      base: { $value: '8px', $type: 'dimension' },
    },
    typography: {
      fontFamily: { $value: 'Inter, sans-serif', $type: 'fontFamily' },
    },
  };

  it('produces @theme { } block', () => {
    const result = generateTailwindTheme(sampleTokens);
    assert.ok(result.startsWith('@theme {'), 'output should start with @theme {');
    assert.ok(result.includes('}'), 'output should contain closing brace');
  });

  it('maps color $type to --color- prefix', () => {
    const result = generateTailwindTheme(sampleTokens);
    assert.ok(result.includes('--color-primary:'), 'should contain --color-primary');
    assert.ok(result.includes('--color-surface:'), 'should contain --color-surface');
  });

  it('maps dimension $type to --spacing- prefix', () => {
    const result = generateTailwindTheme(sampleTokens);
    assert.ok(result.includes('--spacing-base:'), 'should contain --spacing-base');
  });

  it('maps fontFamily $type to --font- prefix', () => {
    const result = generateTailwindTheme(sampleTokens);
    assert.ok(result.includes('--font-fontFamily:'), 'should contain --font-fontFamily');
  });

  it('passes OKLCH values through unmodified', () => {
    const result = generateTailwindTheme(sampleTokens);
    assert.ok(result.includes('oklch(0.7 0.15 150)'), 'OKLCH value should be unmodified');
    assert.ok(result.includes('oklch(0.95 0.02 90)'), 'OKLCH value should be unmodified');
  });

  it('handles 3-level nesting (e.g. color.primary.500)', () => {
    const deepTokens = {
      color: {
        primary: {
          '500': { $value: 'oklch(0.7 0.15 150)', $type: 'color' },
          '600': { $value: 'oklch(0.6 0.18 150)', $type: 'color' },
        },
      },
    };
    const result = generateTailwindTheme(deepTokens);
    assert.ok(result.includes('--color-primary-500:'), 'should flatten to --color-primary-500');
    assert.ok(result.includes('--color-primary-600:'), 'should flatten to --color-primary-600');
  });

  it('returns empty string for null tokens', () => {
    const result = generateTailwindTheme(null);
    assert.equal(result, '', 'should return empty string for null');
  });

  it('returns empty string for empty tokens object', () => {
    const result = generateTailwindTheme({});
    assert.equal(result, '', 'should return empty string for empty object');
  });
});

describe('FMT-02: generateCssVarsFromTheme (companion :root block)', () => {
  const colorTokens = {
    color: {
      primary: { $value: 'oklch(0.7 0.15 150)', $type: 'color' },
    },
  };

  it('produces :root { } block', () => {
    const result = generateCssVarsFromTheme(colorTokens);
    assert.ok(result.includes(':root {'), 'output should include :root {');
    assert.ok(result.includes('}'), 'output should contain closing brace');
  });

  it('uses same variable names as @theme block', () => {
    const themeResult = generateTailwindTheme(colorTokens);
    const rootResult = generateCssVarsFromTheme(colorTokens);
    // Both should contain --color-primary
    assert.ok(themeResult.includes('--color-primary:'), '@theme should have --color-primary');
    assert.ok(rootResult.includes('--color-primary:'), ':root should have --color-primary');
  });

  it('returns empty string for empty tokens', () => {
    const result = generateCssVarsFromTheme({});
    assert.equal(result, '', 'should return empty string for empty tokens');
  });
});

// ─── FMT-03: Framework Detection + Component Stubs ───────────────────────

describe('FMT-03: detectFramework', () => {
  let tmpDirs = [];

  after(() => {
    for (const d of tmpDirs) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
    }
  });

  it('returns Vue when vue is in dependencies', () => {
    const tmp = createTmpWithPackageJson({ vue: '^3.0.0' }, {});
    tmpDirs.push(tmp);
    assert.equal(detectFramework(tmp), 'Vue');
  });

  it('returns Svelte when svelte is in devDependencies', () => {
    const tmp = createTmpWithPackageJson({}, { svelte: '^4.0.0' });
    tmpDirs.push(tmp);
    assert.equal(detectFramework(tmp), 'Svelte');
  });

  it('returns React when react and react-dom are both present', () => {
    const tmp = createTmpWithPackageJson({ react: '^18.0.0', 'react-dom': '^18.0.0' }, {});
    tmpDirs.push(tmp);
    assert.equal(detectFramework(tmp), 'React');
  });

  it('returns null when react is present without react-dom (testing lib false positive)', () => {
    const tmp = createTmpWithPackageJson({}, { '@testing-library/react': '^14.0.0', react: '^18.0.0' });
    tmpDirs.push(tmp);
    assert.equal(detectFramework(tmp), null);
  });

  it('returns null when package.json is missing (graceful fallback)', () => {
    const tmp = createTmpNoPackageJson();
    tmpDirs.push(tmp);
    assert.equal(detectFramework(tmp), null);
  });

  it('prioritizes Vue over Svelte and React', () => {
    const tmp = createTmpWithPackageJson({ vue: '^3.0.0', svelte: '^4.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' }, {});
    tmpDirs.push(tmp);
    assert.equal(detectFramework(tmp), 'Vue');
  });

  it('prioritizes Svelte over React', () => {
    const tmp = createTmpWithPackageJson({ svelte: '^4.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' }, {});
    tmpDirs.push(tmp);
    assert.equal(detectFramework(tmp), 'Svelte');
  });
});

describe('FMT-03: generateComponentStub', () => {
  it('generates React FC stub with FC<Props> signature', () => {
    const result = generateComponentStub('Button', ['label', 'onClick'], 'React');
    assert.ok(result.includes("FC<ButtonProps>"), 'React stub should include FC<ButtonProps>');
    assert.ok(result.includes('interface ButtonProps'), 'React stub should include interface ButtonProps');
  });

  it('generates Vue defineProps stub', () => {
    const result = generateComponentStub('Button', ['label'], 'Vue');
    assert.ok(result.includes('defineProps<Props>()') || result.includes('defineProps<ButtonProps>()'), 'Vue stub should use defineProps<Props>');
    assert.ok(result.includes('<script setup lang="ts">'), 'Vue stub should use <script setup lang="ts">');
  });

  it('generates Svelte export let stub', () => {
    const result = generateComponentStub('Button', ['label'], 'Svelte');
    assert.ok(result.includes('export let'), 'Svelte stub should use export let');
    assert.ok(result.includes('<script lang="ts">'), 'Svelte stub should include <script lang="ts">');
  });

  it('defaults to React stub when framework is null', () => {
    const result = generateComponentStub('Icon', ['size'], null);
    assert.ok(result.includes('FC<IconProps>'), 'null framework should default to React stub');
  });

  it('defaults to React stub when framework is undefined', () => {
    const result = generateComponentStub('Icon', ['size'], undefined);
    assert.ok(result.includes('FC<IconProps>'), 'undefined framework should default to React stub');
  });

  it('includes prop names in React stub', () => {
    const result = generateComponentStub('Card', ['title', 'description'], 'React');
    assert.ok(result.includes('title'), 'React stub should include title prop');
    assert.ok(result.includes('description'), 'React stub should include description prop');
  });

  it('includes prop names in Vue stub', () => {
    const result = generateComponentStub('Card', ['title', 'description'], 'Vue');
    assert.ok(result.includes('title'), 'Vue stub should include title prop');
  });

  it('includes prop names in Svelte stub', () => {
    const result = generateComponentStub('Card', ['title', 'description'], 'Svelte');
    assert.ok(result.includes('title'), 'Svelte stub should include title prop');
  });
});
