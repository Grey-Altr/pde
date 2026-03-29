# Known Design App Integrations

Reference catalog for PDE desktop app discovery (Phase 171+). Documents bundle IDs, pip status, executionMode classification, and discovery hints for supported design applications.

> This file is the human-readable companion to the `APP_CATALOG` array in `bin/lib/app-discovery.cjs`.

---

## Blender

| Property | Value |
|----------|-------|
| **Slug** | `blender` |
| **macOS Bundle ID** | `org.blenderfoundation.blender` |
| **macOS Binary** | Inside bundle at `Contents/MacOS/Blender` (capital B - verified via plutil CFBundleExecutable) |
| **Linux Binary** | `/usr/bin/blender`, `/usr/local/bin/blender` |
| **Windows Binary** | `C:\Program Files\Blender Foundation\Blender 4.x\blender.exe` (version in dir name) |
| **pip Module** | `bpy` - Blender-as-Python-module (build from source only; NOT on standard PyPI). **Supplemental probe only** - do not use as primary binary path. |
| **executionMode** | `headless` |
| **Headless Flag** | `--background` (mature since Blender 2.x) |
| **Version Detection** | `blender --version` parses `Blender X.Y.Z` |
| **Env Var Override** | `BLENDER_BIN=/path/to/blender` |

### Discovery Hints

- On macOS, `mdfind` with bundle ID `org.blenderfoundation.blender` is most reliable - Blender installer does NOT add to PATH by default
- The binary inside the .app bundle is named `Blender` (capital B) - always use `plutil` to read `CFBundleExecutable` from `Info.plist`
- On Windows, the version number is in the directory name (`Blender 4.2`); use `fs.readdirSync` to find the highest version
- Headless invocation: `blender --background [file.blend] --python script.py`
- API differences between 3.x and 4.x are minimal for CLI invocation; Python API mostly stable

---

## GIMP

| Property | Value |
|----------|-------|
| **Slug** | `gimp` |
| **macOS Bundle ID** | `org.gimp.gimp` |
| **macOS Binary** | Inside bundle at `Contents/MacOS/gimp` (lowercase - verify via plutil) |
| **Linux Binary** | `/usr/bin/gimp`, `/usr/bin/gimp-3.0`, `/usr/bin/gimp-2.10` |
| **Windows Binary** | `C:\Program Files\GIMP 3\bin\gimp-3.0.exe` or `C:\Program Files\GIMP 2\bin\gimp-2.10.exe` |
| **pip Module** | None - GIMP has no pip-installable form |
| **executionMode** | `headless` |
| **Headless Flag** | `-i` / `--no-interface` |
| **Version Detection** | `gimp --version` parses `GNU Image Manipulation Program version X.Y.Z` or `GIMP version X.Y.Z` |
| **Env Var Override** | `GIMP_BIN=/path/to/gimp` |

### GIMP 3.x Breaking Changes (March 2025)

- `gimp-file-load` now takes 1 string argument (GFile) instead of 2 strings
- `TRUE`/`FALSE` replaced with `#t`/`#f` in Script-Fu v3 dialect
- `script-fu-register` deprecated in favor of `script-fu-register-filter`
- Batch invocation changed: GIMP 3.x uses `gimp -i -b 'cmd' --quit`; GIMP 2.10 uses `gimp -i -b 'cmd' -b '(gimp-quit 0)'`

### Discovery Hints

- Phase 172 MUST version-branch on major version (2.x vs 3.x) for correct batch invocation
- CLI aliases to probe: `gimp`, `gimp-3.0`, `gimp-2.10`, `gimp-2.99`
- GIMP startup can be slow even for `--version` (up to 10s) - use generous timeout
- GIMP 3.0 released March 2025; most Linux distros still ship 2.10 as of 2026

---

## Inkscape

| Property | Value |
|----------|-------|
| **Slug** | `inkscape` |
| **macOS Bundle ID** | `org.inkscape.Inkscape` (capital I) |
| **macOS Binary** | Inside bundle at `Contents/MacOS/inkscape` - verify via plutil |
| **Linux Binary** | `/usr/bin/inkscape`, `/usr/local/bin/inkscape` |
| **Windows Binary** | `C:\Program Files\Inkscape\bin\inkscape.exe` |
| **pip Module** | None - Inkscape has no standard pip form |
| **executionMode** | `headless` |
| **Headless Flag** | None needed - `--export-type` automatically suppresses GUI in Inkscape 1.x |
| **Version Detection** | `inkscape --version` parses `Inkscape X.Y.Z (hash, date)` |
| **Env Var Override** | `INKSCAPE_BIN=/path/to/inkscape` |

### Discovery Hints

- Inkscape 1.x does NOT need display flags or Xvfb for headless export
- Export invocation: `inkscape --export-type=png --export-filename=out.png input.svg`
- Deprecated flags (pre-1.0): `--export-png`, `--export-pdf`, `--export-eps` - all replaced by `--export-type` + `--export-filename`
- Shell mode: `inkscape --shell` allows batch processing via stdin pipe (useful for many conversions)
- Adding `--batch-process` is unnecessary for Inkscape 1.x export commands

---

## Discovery Tier Reference

| Tier | Method | Platform | Notes |
|------|--------|----------|-------|
| 1 | Environment variable (`APP_BIN`) | All | Highest priority - user override |
| 2 | `which` / `where.exe` | All | PATH-based lookup |
| 3 | `python3 -m {module}` | All | pip module probe (supplemental for some apps) |
| 4 | `mdfind` + Spotlight | macOS only | Bundle ID query - most reliable for macOS .app bundles |
| 5 | Well-known paths | All | Hardcoded install locations per platform |

If all five tiers fail, the app is registered with `executionMode: 'mock'` - no agent can invoke it until it is installed and re-discovered.

---

*Catalog created: Phase 171 (DISC-06)*
*Last updated: Phase 171*
