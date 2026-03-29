import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const require = createRequire(import.meta.url);
const { generateSocialCards } = require('../../bin/lib/image-pipeline/social.cjs');

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'social-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('generateSocialCards()', () => {
  it('Test Social-1: returns array of 3 results', async () => {
    const results = await generateSocialCards({
      title: 'My Product',
      description: 'A great description',
      slug: 'my-product',
      outputDir: tmpDir,
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(3);
  });

  it('Test Social-2: each result has correct platform suffix in filename (-twitter, -linkedin, -facebook)', async () => {
    const results = await generateSocialCards({
      title: 'My Product',
      description: 'A great description',
      slug: 'my-product',
      outputDir: tmpDir,
    });

    const platforms = results.map(r => r.meta.params.platform);
    expect(platforms).toContain('twitter');
    expect(platforms).toContain('linkedin');
    expect(platforms).toContain('facebook');

    // Also verify file paths contain the platform suffix
    const twitterResult = results.find(r => r.meta.params.platform === 'twitter');
    const linkedinResult = results.find(r => r.meta.params.platform === 'linkedin');
    const facebookResult = results.find(r => r.meta.params.platform === 'facebook');

    expect(twitterResult.path).toMatch(/-twitter\.png$/);
    expect(linkedinResult.path).toMatch(/-linkedin\.png$/);
    expect(facebookResult.path).toMatch(/-facebook\.png$/);
  });

  it('Test Social-3: each variant has correct dimensions in meta', async () => {
    const results = await generateSocialCards({
      title: 'My Product',
      description: 'A great description',
      slug: 'my-product',
      outputDir: tmpDir,
    });

    const twitterResult = results.find(r => r.meta.params.platform === 'twitter');
    const linkedinResult = results.find(r => r.meta.params.platform === 'linkedin');
    const facebookResult = results.find(r => r.meta.params.platform === 'facebook');

    expect(twitterResult.meta.dimensions).toEqual({ width: 1200, height: 628 });
    expect(linkedinResult.meta.dimensions).toEqual({ width: 1200, height: 627 });
    expect(facebookResult.meta.dimensions).toEqual({ width: 1200, height: 630 });
  });
});
