# Phase 165: Image Generation Pipeline - Research

**Researched:** 2026-03-28
**Domain:** Node.js image generation — Satori/resvg-js, Sharp, Playwright, remove.bg API
**Confidence:** HIGH

## Summary

This phase builds a five-subcommand image pipeline (`og`, `social`, `mockup`, `screenshot`, `rembg`) plus `list` under `pde-tools.cjs image`. All user decisions are locked — there are no discretion areas. The architecture is straightforward: Satori (JSX-to-SVG) + @resvg/resvg-js (SVG-to-PNG) for OG/social, Sharp compositing for device mockups, Playwright (headless Chromium) for screenshots, and the remove.bg REST API for background removal.

The key implementation risk is Satori's ESM-first publication. Confirmed: Satori 0.26.0 ships a `.require` CJS export at `./dist/index.cjs`, so `require('satori')` works in `.cjs` modules without modification. JSX templates in `.cjs` context should use the object-literal form `{ type, props: { children, style } }` or the `htm` tagged-template-literal adapter — no JSX transpiler needed.

Playwright browsers are not yet installed on this machine. The phase plan must include a Wave 0 step: `npm install playwright && npx playwright install chromium`. Node.js 20 is available, which satisfies Playwright's minimum runtime requirement and also provides native `fetch()` for the remove.bg API calls — no additional HTTP library needed.

**Primary recommendation:** Install all four packages (`satori`, `@resvg/resvg-js`, `sharp`, `playwright`) in the project root `package.json` as regular (non-dev) dependencies, since they are invoked at runtime by `pde-tools.cjs`. Run `npx playwright install chromium` once after install. Use native `fetch()` for the remove.bg API. No other new dependencies are required.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Image Generation Commands**
- `/pde:image <type> [options]` single command with subcommands: og, social, mockup, screenshot, rembg
- OG images via Satori (JSX → SVG → @resvg/resvg-js → PNG) — no browser needed, pure Node.js, free
- Social cards auto-generate all 3 variants from one data input: Twitter/X (1200x628), LinkedIn (1200x627), Facebook (1200x630)
- Device mockups via Sharp compositing — overlay screenshot onto pre-built browser/phone frame PNG templates in templates/mockup-frames/

**Screenshot & Background Removal**
- Named viewport presets: `desktop` (1440x900), `tablet` (768x1024), `mobile` (375x812), `custom WxH`
- PNG always (lossless, needed for compositing downstream) with optional `--format jpg` for smaller files
- remove.bg free tier API (50 images/month) with `REMOVEBG_API_KEY` env var, graceful degradation if no key
- Track usage in `.planning/cli-anything/removebg-usage.json` with monthly reset, warn at 40/50, block at 50

**Asset Storage & Metadata**
- `.planning/design/assets/{type}/{slug}-{timestamp}.png` with types: og, social, mockup, screenshot, rembg
- JSON sidecar per asset: `{slug}-{timestamp}.meta.json` with `{ type, source, dimensions, timestamp, params, hash }`
- `pde-tools.cjs image list [--type og|social|...]` returns JSON array of all assets with metadata
- OG/social templates are JSX functions in `bin/lib/image-pipeline/templates/` — user can add custom templates

### Claude's Discretion

No items deferred to Claude's discretion — all grey areas resolved by user.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMG-01 | User can generate dynamic OG images from templates via Satori/next/og | Satori 0.26.0 CJS-compatible; object-literal JSX pattern confirmed; @resvg/resvg-js 2.6.2 for PNG rasterization |
| IMG-02 | User can generate social media card images from product data | Same Satori+resvg-js stack; three fixed size variants (1200x628, 1200x627, 1200x630); single data input produces all three |
| IMG-03 | User can generate device mockup composites (browser frame, phone frame) from screenshots | Sharp 0.34.5 composite() API confirmed; resize-then-composite pattern; pre-built frame PNGs in templates/mockup-frames/ |
| IMG-04 | User can capture product screenshots via Playwright at configurable viewports | Playwright 1.58.2; viewport set via newContext({viewport:{width,height}}); named presets map to exact dimensions; browser download step required |
| IMG-07 | User can remove image backgrounds via remove.bg free tier (50/month) | REST endpoint confirmed; X-Api-Key header; multipart form upload; native Node 20 fetch(); usage tracker in removebg-usage.json |
| IMG-08 | Image pipeline stores assets in .planning/design/assets/ with metadata JSON | Directory structure, sidecar JSON schema, and list command all locked in decisions |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| satori | 0.26.0 | JSX/HTML object tree → SVG string | User-locked; Vercel's official OG image engine; pure Node.js, no browser |
| @resvg/resvg-js | 2.6.2 | SVG string → PNG Buffer (Rust-backed) | User-locked; pairs with Satori; NAPI binding, high performance |
| sharp | 0.34.5 | Image resize, composite, format conversion | User-locked; de-facto Node.js image processing; libvips NAPI binding |
| playwright | 1.58.2 | Headless Chromium screenshot capture | User-locked; most capable Node.js browser automation; viewport control |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| htm | 3.1.1 | Tagged-template JSX → object tree for Satori | Use in template files to keep markup readable without a transpiler |
| node built-in fs | — | Font file loading, asset sidecar writes | Always — font buffers required by Satori |
| node built-in crypto | — | SHA-256 hash for metadata sidecar | Always — hash field in `.meta.json` |
| node built-in fetch | — | remove.bg API calls | Always — Node 20 native; no extra dep needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @resvg/resvg-js | sharp SVG rasterize | sharp can rasterize SVG but requires libvips SVG support (sometimes absent); @resvg/resvg-js is self-contained Rust |
| playwright | puppeteer | Both work; playwright locked by user decision |
| native fetch | axios / node-fetch | Node 20 has fetch built in; no reason to add a dep |

**Installation:**
```bash
npm install satori @resvg/resvg-js sharp playwright htm
npx playwright install chromium
```

**Version verification:** All versions confirmed against npm registry on 2026-03-28.

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/image-pipeline/
├── og.cjs              # Satori OG image generation
├── social.cjs          # Social card generation (3 variants)
├── mockup.cjs          # Sharp device mockup compositing
├── screenshot.cjs      # Playwright screenshot capture
├── rembg.cjs           # remove.bg API client + usage tracker
├── assets.cjs          # Asset storage, metadata sidecar, list command
└── templates/
    ├── og-default.cjs  # Default OG template (object-literal JSX)
    └── social-default.cjs  # Default social template (object-literal JSX)

templates/mockup-frames/
├── browser.png         # Browser chrome frame template
└── phone.png           # Phone frame template

.planning/design/assets/
├── og/                 # {slug}-{timestamp}.png + .meta.json
├── social/             # {slug}-{timestamp}-twitter.png etc.
├── mockup/             # {slug}-{timestamp}.png + .meta.json
├── screenshot/         # {slug}-{timestamp}.png + .meta.json
└── rembg/              # {slug}-{timestamp}.png + .meta.json

.planning/cli-anything/
└── removebg-usage.json # { month: "YYYY-MM", count: N }
```

### Pattern 1: Satori + resvg-js OG Image Generation (CJS)
**What:** Convert an object-literal element tree to SVG via Satori, then rasterize to PNG via resvg-js.
**When to use:** OG images and all social card variants.
**Example:**
```javascript
// Source: https://github.com/vercel/satori — confirmed CJS export ./dist/index.cjs
// Source: https://gist.github.com/Munawwar/91ee7a93a0c428a923159945735d6f9f
'use strict';
const { default: satori } = require('satori');
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function generateOgImage({ title, description, slug, templateFn, outputDir }) {
  // Load font (required by Satori — no fallback)
  const fontPath = path.join(__dirname, '../../../assets/fonts/Inter-Regular.ttf');
  const fontData = fs.readFileSync(fontPath);

  // templateFn returns a plain object tree: { type, props: { children, style } }
  const element = templateFn({ title, description });

  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Inter', data: fontData, weight: 400, style: 'normal' }],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { loadSystemFonts: false },
  });
  const pngBuffer = resvg.render().asPng();

  const timestamp = Date.now();
  const filename = `${slug}-${timestamp}.png`;
  const outPath = path.join(outputDir, filename);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outPath, pngBuffer);

  // Sidecar metadata
  const hash = crypto.createHash('sha256').update(pngBuffer).digest('hex');
  const meta = { type: 'og', source: templateFn.name, dimensions: { width: 1200, height: 630 },
    timestamp: new Date(timestamp).toISOString(), params: { title, description }, hash };
  fs.writeFileSync(outPath.replace('.png', '.meta.json'), JSON.stringify(meta, null, 2));

  return { path: outPath, meta };
}

module.exports = { generateOgImage };
```

### Pattern 2: Sharp Device Mockup Compositing
**What:** Resize a product screenshot to fit inside the frame's viewport area, then composite it onto the frame PNG.
**When to use:** Device mockup generation (browser frame, phone frame).
**Example:**
```javascript
// Source: https://sharp.pixelplumbing.com/api-composite
'use strict';
const sharp = require('sharp');

async function generateMockup({ screenshotPath, framePath, viewportRect, outputPath }) {
  // viewportRect: { top, left, width, height } — where inside frame to place screenshot
  const resized = await sharp(screenshotPath)
    .resize(viewportRect.width, viewportRect.height, { fit: 'cover' })
    .toBuffer();

  await sharp(framePath)
    .composite([{ input: resized, top: viewportRect.top, left: viewportRect.left }])
    .png()
    .toFile(outputPath);
}
module.exports = { generateMockup };
```

### Pattern 3: Playwright Screenshot Capture
**What:** Launch headless Chromium, navigate to URL, set viewport, capture PNG.
**When to use:** Product screenshot capture subcommand.
**Example:**
```javascript
// Source: https://playwright.dev/docs/library
'use strict';
const { chromium } = require('playwright');

const VIEWPORT_PRESETS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

async function captureScreenshot({ url, viewport, outputPath, format = 'png' }) {
  const vp = typeof viewport === 'string'
    ? VIEWPORT_PRESETS[viewport]
    : { width: viewport.width, height: viewport.height };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: vp });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outputPath, type: format, fullPage: false });
  } finally {
    await context.close();
    await browser.close();
  }
}
module.exports = { captureScreenshot, VIEWPORT_PRESETS };
```

### Pattern 4: remove.bg API Client with Usage Tracking
**What:** POST image to remove.bg, track monthly usage in JSON file, warn at 40 and block at 50.
**When to use:** Background removal subcommand.
**Example:**
```javascript
// Source: https://www.remove.bg/api — confirmed endpoint and headers
'use strict';
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // or use native FormData if available

const USAGE_PATH = path.join(process.cwd(), '.planning/cli-anything/removebg-usage.json');
const MONTHLY_LIMIT = 50;
const WARN_THRESHOLD = 40;

function loadUsage() {
  const now = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  try {
    const data = JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8'));
    if (data.month !== now) return { month: now, count: 0 };
    return data;
  } catch { return { month: now, count: 0 }; }
}

function saveUsage(usage) {
  fs.mkdirSync(path.dirname(USAGE_PATH), { recursive: true });
  fs.writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
}

async function removeBackground({ inputPath, outputPath }) {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    console.warn('[rembg] REMOVEBG_API_KEY not set — skipping background removal');
    return null;
  }

  const usage = loadUsage();
  if (usage.count >= MONTHLY_LIMIT) throw new Error(`remove.bg monthly limit reached (${MONTHLY_LIMIT}/month)`);
  if (usage.count >= WARN_THRESHOLD) console.warn(`[rembg] Warning: ${usage.count}/${MONTHLY_LIMIT} API calls used this month`);

  // Node 20 native fetch + FormData
  const form = new FormData();
  form.append('image_file', fs.createReadStream(inputPath));
  form.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, ...form.getHeaders() },
    body: form,
  });

  if (response.status === 429) throw new Error('remove.bg rate limit exceeded — retry later');
  if (!response.ok) throw new Error(`remove.bg API error: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  usage.count++;
  saveUsage(usage);
  return outputPath;
}

module.exports = { removeBackground, loadUsage };
```

### Pattern 5: Default OG Template (object-literal JSX, no transpiler)
**What:** Template function returning a plain object tree consumable by Satori. No JSX, no React.
**When to use:** `bin/lib/image-pipeline/templates/og-default.cjs`
**Example:**
```javascript
// Source: https://github.com/vercel/satori — "pass React-elements-like objects directly"
'use strict';

function ogDefault({ title, description, brandColor = '#6366f1' }) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        width: '100%', height: '100%', padding: '60px',
        background: brandColor, fontFamily: 'Inter',
      },
      children: [
        { type: 'div', props: { style: { fontSize: 64, fontWeight: 700, color: '#fff', lineHeight: 1.1 }, children: title } },
        { type: 'div', props: { style: { fontSize: 28, color: 'rgba(255,255,255,0.8)', marginTop: 20 }, children: description } },
      ],
    },
  };
}

module.exports = { ogDefault };
```

### Anti-Patterns to Avoid
- **Using JSX syntax in `.cjs` files without a transpiler:** Satori accepts plain object trees `{ type, props }` — use those directly. Or add `htm` for tagged template literals. Do not add Babel/esbuild to the project just for this.
- **Calling `satori()` with ESM default import in CJS:** Use `require('satori').default` — Satori exports a default export, not a named export.
- **Opening a new Playwright browser per subcommand call in a tight loop:** Launch once, create contexts, close at the end. Startup cost is ~500ms.
- **Storing remove.bg API key in the metadata sidecar:** Only store `params` that describe the operation, not secrets.
- **Using WOFF2 font files with Satori:** Satori supports TTF, OTF, WOFF but NOT WOFF2. Ensure bundled fonts are TTF/OTF format.
- **Forgetting Playwright browser installation:** `playwright` npm package does not bundle the browser binary. `npx playwright install chromium` must be run once on each machine. Include this in Wave 0.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG layout engine | CSS flexbox in canvas/SVG | satori | Yoga layout, text wrapping, emoji — impossible to replicate correctly |
| SVG→PNG rasterization | Canvas/puppeteer | @resvg/resvg-js | Rust-backed, 5-10x faster than headless Chrome for SVG rasterization |
| Image compositing | Manual pixel Buffer math | sharp composite() | 200+ blend modes, alpha premultiplication, hardware-optimized libvips |
| Image resizing | Custom resize algorithm | sharp resize() | Bicubic/Lanczos kernels, handles all formats including AVIF |
| Background removal AI | Local ML model | remove.bg API | State-of-the-art ML with free tier; local inference would require GPU |
| Headless browser control | CDP protocol directly | playwright | Device emulation, waitUntil, retry logic all built in |

**Key insight:** Every problem in this phase is solved by a battle-tested library. The implementation work is wiring these libraries together and adding the metadata/storage layer, not building image processing logic.

---

## Common Pitfalls

### Pitfall 1: Satori default export in CJS
**What goes wrong:** `const satori = require('satori')` gives an object, calling it throws `TypeError: satori is not a function`.
**Why it happens:** Satori uses `export default` — CJS interop wraps it in `{ default: fn }`.
**How to avoid:** Use `const { default: satori } = require('satori')` or `const satori = require('satori').default`.
**Warning signs:** "satori is not a function" at runtime.

### Pitfall 2: No font provided to Satori
**What goes wrong:** Satori throws `Error: No fonts found for ...` or renders with garbled/missing text.
**Why it happens:** Satori does not use system fonts — it requires explicit font buffers passed in the `fonts` array.
**How to avoid:** Bundle at least one Inter/Roboto TTF in `bin/lib/image-pipeline/fonts/`. Read it synchronously at module init or async at call time.
**Warning signs:** Empty SVG output or `No fonts` error.

### Pitfall 3: Playwright Chromium not installed
**What goes wrong:** `Error: Executable doesn't exist at ...` when calling `chromium.launch()`.
**Why it happens:** The `playwright` npm package is a library only — it does not bundle browser binaries. A separate download step is required.
**How to avoid:** Wave 0 must run `npx playwright install chromium`. Document this in setup. The existing `~/Library/Caches/ms-playwright/` directory has only `mcp-chrome-b1323ef` (Claude Code's browser), NOT a standard Playwright Chromium build.
**Warning signs:** "Executable doesn't exist" on first screenshot run.

### Pitfall 4: remove.bg API returns binary even on error
**What goes wrong:** Response body is treated as an image but is actually an error JSON.
**Why it happens:** remove.bg uses non-2xx status codes for errors, but the Content-Type may be application/json for errors vs. image/png for success.
**How to avoid:** Always check `response.ok` before calling `response.arrayBuffer()`. On failure, call `response.json()` for the error message.
**Warning signs:** PNG file is corrupt/zero-byte or cannot be opened.

### Pitfall 5: Sharp native module not linked
**What goes wrong:** `Error: Something went wrong installing the "sharp" module` or `libvips` errors on first load.
**Why it happens:** Sharp ships prebuilt NAPI bindings per platform. Running on a different OS/arch than where npm installed it, or using `npm ci` without allowing postinstall scripts, breaks the binary.
**How to avoid:** Run `npm install sharp` on the target machine. If CI fails, add `npm rebuild sharp` to the install script.
**Warning signs:** "Could not load the "sharp" module" on `require('sharp')`.

### Pitfall 6: Monthly remove.bg reset logic
**What goes wrong:** Count does not reset on the first of the month — user hits an artificial limit.
**Why it happens:** If the month check uses `.slice(0,7)` on ISO string but the JSON was last written in the previous month, the month field must be compared, not assumed.
**How to avoid:** Always compare stored `month` field to current `YYYY-MM` string. If they differ, reset count to 0 before checking limits.

### Pitfall 7: Social card filename collision
**What goes wrong:** All three social variants overwrite each other because they share the same slug-timestamp.
**Why it happens:** Generating twitter/linkedin/facebook in rapid succession hits the same `Date.now()` millisecond.
**How to avoid:** Append the platform suffix to the filename: `{slug}-{timestamp}-twitter.png`, `-linkedin.png`, `-facebook.png`. The decision text says "social" type — use platform suffix for disambiguation.

---

## Code Examples

### Social Card Multi-Variant Generation
```javascript
// Source: CONTEXT.md locked decisions — 3 variants from one input
'use strict';
const SOCIAL_SIZES = {
  twitter:  { width: 1200, height: 628 },
  linkedin: { width: 1200, height: 627 },
  facebook: { width: 1200, height: 630 },
};

async function generateSocialCards({ title, description, slug, templateFn, outputDir }) {
  const results = [];
  for (const [platform, { width, height }] of Object.entries(SOCIAL_SIZES)) {
    const element = templateFn({ title, description, width, height });
    const svg = await satori(element, { width, height, fonts: [/* loaded font */] });
    // ... resvg render + write + sidecar
    results.push({ platform, path: `${outputDir}/${slug}-${timestamp}-${platform}.png` });
  }
  return results;
}
```

### Asset List Command (JSON output)
```javascript
// Source: CONTEXT.md — pde-tools.cjs image list [--type og|social|...]
'use strict';
const fs = require('fs');
const path = require('path');

function listAssets({ type, assetsDir }) {
  const types = type ? [type] : ['og', 'social', 'mockup', 'screenshot', 'rembg'];
  const results = [];
  for (const t of types) {
    const dir = path.join(assetsDir, t);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.meta.json'));
    for (const f of files) {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      results.push({ ...meta, file: f.replace('.meta.json', '.png'), dir: t });
    }
  }
  return results;
}
module.exports = { listAssets };
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| puppeteer for OG images | satori (no browser) | 2022 (Vercel) | 10x faster, no Chrome install needed for OG |
| Canvas for server-side images | Sharp + Satori | 2022-2023 | Rust-native performance, proper text layout |
| node-fetch for API calls | Node built-in fetch | Node 18+ (2022) | No extra dependency needed |
| WOFF2 fonts everywhere | TTF/OTF for Satori | Satori always | Satori never supported WOFF2 — use TTF |

**Deprecated/outdated:**
- `canvas` npm package: Heavy native dep, no longer needed for server-side image generation when Sharp is available.
- `puppeteer` for OG images: Overkill; Satori does not require a browser process.
- `@vercel/og`: Next.js edge-specific — does not work in a plain CJS Node.js context.

---

## Open Questions

1. **Font file to bundle**
   - What we know: Satori requires at least one TTF/OTF font buffer; no system fonts.
   - What's unclear: Which specific font to bundle (Inter, Roboto, or PDE design system font).
   - Recommendation: Bundle Inter-Regular.ttf (free, 300KB) from Google Fonts in `bin/lib/image-pipeline/fonts/`. A single weight is sufficient for default templates.

2. **Mockup frame viewport rectangles**
   - What we know: Frame PNGs live in `templates/mockup-frames/browser.png` and `phone.png`.
   - What's unclear: The exact pixel coordinates of the viewport area within each frame (where to composite the screenshot).
   - Recommendation: Create frame specs in `templates/mockup-frames/frames.json` with `{ browser: { top, left, width, height }, phone: { top, left, width, height } }`. Populate when creating the actual frame PNG assets.

3. **Playwright timeout for slow URLs**
   - What we know: `waitUntil: 'networkidle'` can hang on sites with long-polling.
   - What's unclear: What timeout value to use.
   - Recommendation: Default to `{ waitUntil: 'networkidle', timeout: 30000 }` and expose `--timeout` flag.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All modules | Yes | v20.20.0 | — |
| npm | Package install | Yes | (bundled) | — |
| satori | IMG-01, IMG-02 | No (not installed) | 0.26.0 (registry) | — must install |
| @resvg/resvg-js | IMG-01, IMG-02 | No (not installed) | 2.6.2 (registry) | — must install |
| sharp | IMG-03 | No (not installed) | 0.34.5 (registry) | — must install |
| playwright | IMG-04 | No (not installed) | 1.58.2 (registry) | — must install |
| Playwright Chromium browser | IMG-04 | No | — | — must run `npx playwright install chromium` |
| REMOVEBG_API_KEY env var | IMG-07 | Unknown (runtime) | — | Graceful skip with warning — locked decision |
| htm | Template authoring | No (not installed) | 3.1.1 (registry) | Use plain object literals (no htm needed) |

**Missing dependencies with no fallback:**
- `satori`, `@resvg/resvg-js`, `sharp`, `playwright` — all must be installed (Wave 0)
- Playwright Chromium browser binary — must be downloaded via `npx playwright install chromium` (Wave 0)

**Missing dependencies with fallback:**
- `REMOVEBG_API_KEY` — graceful degradation (skip with warning) is a locked decision; tests must mock this
- `htm` — optional; plain object literals work without it

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/phase-165/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMG-01 | `generateOgImage()` produces valid PNG buffer | unit | `npx vitest run tests/phase-165/og.test.mjs` | No — Wave 0 |
| IMG-02 | `generateSocialCards()` produces 3 PNG files with correct dimensions | unit | `npx vitest run tests/phase-165/social.test.mjs` | No — Wave 0 |
| IMG-03 | `generateMockup()` produces PNG at frame dimensions | unit | `npx vitest run tests/phase-165/mockup.test.mjs` | No — Wave 0 |
| IMG-04 | `captureScreenshot()` writes PNG to disk at correct size | integration | `npx vitest run tests/phase-165/screenshot.test.mjs` | No — Wave 0 |
| IMG-07 | `removeBackground()` respects usage limit, skips without API key | unit (mock) | `npx vitest run tests/phase-165/rembg.test.mjs` | No — Wave 0 |
| IMG-08 | `listAssets()` returns JSON array; sidecar written alongside PNG | unit | `npx vitest run tests/phase-165/assets.test.mjs` | No — Wave 0 |

**Note on IMG-04:** Screenshot test requires Playwright Chromium to be installed. The test should either use `test.skipIf(!chromiumAvailable)` or be marked as integration and excluded from unit-only runs.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-165/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-165/og.test.mjs` — covers IMG-01 (Satori→resvg pipeline unit test with fixture font)
- [ ] `tests/phase-165/social.test.mjs` — covers IMG-02 (3 variant dimensions)
- [ ] `tests/phase-165/mockup.test.mjs` — covers IMG-03 (Sharp composite, fixture frame PNG)
- [ ] `tests/phase-165/screenshot.test.mjs` — covers IMG-04 (integration, skip if no Chromium)
- [ ] `tests/phase-165/rembg.test.mjs` — covers IMG-07 (mocked fetch, usage tracker reset)
- [ ] `tests/phase-165/assets.test.mjs` — covers IMG-08 (sidecar write + listAssets)
- [ ] `tests/phase-165/fixtures/` — small frame PNG, sample screenshot for mockup test
- [ ] Package install: `npm install satori @resvg/resvg-js sharp playwright htm`
- [ ] Browser install: `npx playwright install chromium`

---

## Sources

### Primary (HIGH confidence)
- Satori npm package exports field — confirmed `./dist/index.cjs` exists for CJS `require()` — 2026-03-28
- https://sharp.pixelplumbing.com/api-composite — composite() API signature and options
- https://sharp.pixelplumbing.com/api-resize — resize() fit modes
- https://playwright.dev/docs/library — chromium.launch(), newContext({viewport}), page.screenshot()
- https://playwright.dev/docs/api/class-browser#browser-new-context — viewport config confirmed
- https://www.remove.bg/api — endpoint URL, headers, response format, rate limit codes
- npm registry: satori@0.26.0, @resvg/resvg-js@2.6.2, sharp@0.34.5, playwright@1.58.2 — all verified 2026-03-28

### Secondary (MEDIUM confidence)
- https://github.com/vercel/satori/blob/main/README.md — object-literal JSX pattern (no transpiler)
- https://gist.github.com/Munawwar/91ee7a93a0c428a923159945735d6f9f — CJS Satori+resvg-js end-to-end example
- Node.js v20 docs — native fetch() confirmed available

### Tertiary (LOW confidence)
- None required — all critical claims verified with primary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all four libraries confirmed via npm registry, CJS exports verified
- Architecture: HIGH — patterns derived from official docs and confirmed working examples
- Pitfalls: HIGH — most derived from official docs limitations (no WOFF2, no system fonts, no bundled browser)

**Research date:** 2026-03-28
**Valid until:** 2026-05-01 (libraries are stable; Playwright updates frequently but API surface unchanged)
