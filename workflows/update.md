<purpose>
Check for PDE updates via npm, display changelog for versions between installed and latest, obtain user confirmation, and execute clean installation with cache clearing.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="get_installed_version">
Detect whether PDE is installed locally or globally by checking both locations and validating install integrity.

First, derive `PREFERRED_RUNTIME` from the invoking prompt's `execution_context` path:
- Path contains `/.codex/` -> `codex`
- Path contains `/.gemini/` -> `gemini`
- Path contains `/.config/opencode/` or `/.opencode/` -> `opencode`
- Otherwise -> `claude`

Use `PREFERRED_RUNTIME` as the first runtime checked so `/pde:update` targets the runtime that invoked it.

```bash
# Runtime candidates: "<runtime>:<config-dir>"
RUNTIME_DIRS="claude:.claude opencode:.config/opencode opencode:.opencode gemini:.gemini codex:.codex"

# PREFERRED_RUNTIME should be set from execution_context before running this block.
# If not set, infer from runtime env vars; fallback to claude.
if [ -z "$PREFERRED_RUNTIME" ]; then
  if [ -n "$CODEX_HOME" ]; then
    PREFERRED_RUNTIME="codex"
  elif [ -n "$GEMINI_CONFIG_DIR" ]; then
    PREFERRED_RUNTIME="gemini"
  elif [ -n "$OPENCODE_CONFIG_DIR" ] || [ -n "$OPENCODE_CONFIG" ]; then
    PREFERRED_RUNTIME="opencode"
  elif [ -n "$CLAUDE_CONFIG_DIR" ]; then
    PREFERRED_RUNTIME="claude"
  else
    PREFERRED_RUNTIME="claude"
  fi
fi

# Reorder entries so preferred runtime is checked first.
ORDERED_RUNTIME_DIRS=""
for entry in $RUNTIME_DIRS; do
  runtime="${entry%%:*}"
  if [ "$runtime" = "$PREFERRED_RUNTIME" ]; then
    ORDERED_RUNTIME_DIRS="$ORDERED_RUNTIME_DIRS $entry"
  fi
done
for entry in $RUNTIME_DIRS; do
  runtime="${entry%%:*}"
  if [ "$runtime" != "$PREFERRED_RUNTIME" ]; then
    ORDERED_RUNTIME_DIRS="$ORDERED_RUNTIME_DIRS $entry"
  fi
done

# Check local first (takes priority only if valid and distinct from global)
LOCAL_VERSION_FILE="" LOCAL_MARKER_FILE="" LOCAL_DIR="" LOCAL_RUNTIME=""
for entry in $ORDERED_RUNTIME_DIRS; do
  runtime="${entry%%:*}"
  dir="${entry#*:}"
  if [ -f "./$dir/pde/VERSION" ] || [ -f "./$dir/pde/workflows/update.md" ]; then
    LOCAL_RUNTIME="$runtime"
    LOCAL_VERSION_FILE="./$dir/pde/VERSION"
    LOCAL_MARKER_FILE="./$dir/pde/workflows/update.md"
    LOCAL_DIR="$(cd "./$dir" 2>/dev/null && pwd)"
    break
  fi
done

GLOBAL_VERSION_FILE="" GLOBAL_MARKER_FILE="" GLOBAL_DIR="" GLOBAL_RUNTIME=""
for entry in $ORDERED_RUNTIME_DIRS; do
  runtime="${entry%%:*}"
  dir="${entry#*:}"
  if [ -f "$HOME/$dir/pde/VERSION" ] || [ -f "$HOME/$dir/pde/workflows/update.md" ]; then
    GLOBAL_RUNTIME="$runtime"
    GLOBAL_VERSION_FILE="$HOME/$dir/pde/VERSION"
    GLOBAL_MARKER_FILE="$HOME/$dir/pde/workflows/update.md"
    GLOBAL_DIR="$(cd "$HOME/$dir" 2>/dev/null && pwd)"
    break
  fi
done

# Only treat as LOCAL if the resolved paths differ (prevents misdetection when CWD=$HOME)
IS_LOCAL=false
if [ -n "$LOCAL_VERSION_FILE" ] && [ -f "$LOCAL_VERSION_FILE" ] && [ -f "$LOCAL_MARKER_FILE" ] && grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+' "$LOCAL_VERSION_FILE"; then
  if [ -z "$GLOBAL_DIR" ] || [ "$LOCAL_DIR" != "$GLOBAL_DIR" ]; then
    IS_LOCAL=true
  fi
fi

if [ "$IS_LOCAL" = true ]; then
  INSTALLED_VERSION="$(cat "$LOCAL_VERSION_FILE")"
  INSTALL_SCOPE="LOCAL"
  TARGET_RUNTIME="$LOCAL_RUNTIME"
elif [ -n "$GLOBAL_VERSION_FILE" ] && [ -f "$GLOBAL_VERSION_FILE" ] && [ -f "$GLOBAL_MARKER_FILE" ] && grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+' "$GLOBAL_VERSION_FILE"; then
  INSTALLED_VERSION="$(cat "$GLOBAL_VERSION_FILE")"
  INSTALL_SCOPE="GLOBAL"
  TARGET_RUNTIME="$GLOBAL_RUNTIME"
elif [ -n "$LOCAL_RUNTIME" ] && [ -f "$LOCAL_MARKER_FILE" ]; then
  # Runtime detected but VERSION missing/corrupt: treat as unknown version, keep runtime target
  INSTALLED_VERSION="0.0.0"
  INSTALL_SCOPE="LOCAL"
  TARGET_RUNTIME="$LOCAL_RUNTIME"
elif [ -n "$GLOBAL_RUNTIME" ] && [ -f "$GLOBAL_MARKER_FILE" ]; then
  INSTALLED_VERSION="0.0.0"
  INSTALL_SCOPE="GLOBAL"
  TARGET_RUNTIME="$GLOBAL_RUNTIME"
else
  INSTALLED_VERSION="0.0.0"
  INSTALL_SCOPE="UNKNOWN"
  TARGET_RUNTIME="claude"
fi

echo "$INSTALLED_VERSION"
echo "$INSTALL_SCOPE"
echo "$TARGET_RUNTIME"
```

Parse output:
- Line 1 = installed version (`0.0.0` means unknown version)
- Line 2 = install scope (`LOCAL`, `GLOBAL`, or `UNKNOWN`)
- Line 3 = target runtime (`claude`, `opencode`, `gemini`, or `codex`)
- If scope is `UNKNOWN`, proceed to install step using `--claude --global` fallback.

If multiple runtime installs are detected and the invoking runtime cannot be determined from execution_context, ask the user which runtime to update before running install.

**If VERSION file missing:**
```
## PDE Update

**Installed version:** Unknown

Your installation doesn't include version tracking.

Running fresh install...
```

Proceed to install step (treat as version 0.0.0 for comparison).
</step>

<step name="check_latest_version">
Check npm for latest version:

```bash
npm view pde-engine-pde version 2>/dev/null
```

**If npm check fails:**
```
Couldn't check for updates (offline or npm unavailable).

To update manually: `npx pde-engine-pde --global`
```

Exit.
</step>

<step name="compare_versions">
Compare installed vs latest:

**If installed == latest:**
```
## PDE Update

**Installed:** X.Y.Z
**Latest:** X.Y.Z

You're already on the latest version.
```

Exit.

**If installed > latest:**
```
## PDE Update

**Installed:** X.Y.Z
**Latest:** A.B.C

You're ahead of the latest release (development version?).
```

Exit.
</step>

<step name="show_changes_and_confirm">
**If update available**, fetch and show what's new BEFORE updating:

1. Fetch changelog from GitHub raw URL
2. Extract entries between installed and latest versions
3. Display preview and ask for confirmation:

```
## PDE Update Available

**Installed:** 1.5.10
**Latest:** 1.5.15

### What's New
```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" divider
```

## [1.5.15] - 2026-01-20

### Added
- Feature X

## [1.5.14] - 2026-01-18

### Fixed
- Bug fix Y

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" divider
```

⚠️  **Note:** The installer performs a clean install of PDE folders:
- `commands/pde/` will be wiped and replaced
- `pde/` will be wiped and replaced
- `agents/pde-*` files will be replaced

(Paths are relative to detected runtime install location:
global: `/Users/greyaltaer/.claude/`, `~/.config/opencode/`, `~/.opencode/`, `~/.gemini/`, or `~/.codex/`
local: `./.claude/`, `./.config/opencode/`, `./.opencode/`, `./.gemini/`, or `./.codex/`)

Your custom files in other locations are preserved:
- Custom commands not in `commands/pde/` ✓
- Custom agents not prefixed with `pde-` ✓
- Custom hooks ✓
- Your CLAUDE.md files ✓

If you've modified any PDE files directly, they'll be automatically backed up to `pde-local-patches/` and can be reapplied with `/pde:reapply-patches` after the update.
```

Use AskUserQuestion:
- Question: "Proceed with update?"
- Options:
  - "Yes, update now"
  - "No, cancel"

**If user cancels:** Exit.
</step>

<step name="hash_based_safe_update">

## Hash-Based Safe File Update

Before overwriting installed files with the new version, consult the manifest to preserve user modifications.

1. Check if `.planning/config/files-manifest.csv` exists:
```bash
MANIFEST_PATH=".planning/config/files-manifest.csv"
if [ ! -f "$MANIFEST_PATH" ]; then
  echo "No manifest found — will generate after update (first run with manifest support)"
  MANIFEST_EXISTS=false
else
  MANIFEST_EXISTS=true
fi
```

2. If manifest exists, for each file being updated:
```bash
# For each file in the update set:
# Use pde-tools.cjs to classify each file
RESULT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" manifest check)
```

Parse the JSON result. For each file in the `files` array:
- If `modified: false` (hash matches manifest) → **auto-update**: overwrite silently with the new version, then update the manifest entry with the new hash
- If `modified: true` (hash differs from manifest) → **preserve**: skip overwriting, add to conflict list

3. After all files processed, display conflict summary if any files were preserved:
```
## User-Modified Files Preserved

The following files were modified by you and NOT overwritten during this update:

| File | Action |
|------|--------|
| workflows/execute-phase.md | Preserved (user-modified) |
| references/quality-standards.md | Preserved (user-modified) |

To manually merge upstream changes into your modified files:
  1. Check the changelog for what changed
  2. Compare your version with the new stock version
  3. Apply relevant changes manually
```

4. After the update completes (whether manifest existed or not), regenerate the manifest:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" manifest init
```

This ensures:
- First update with manifest support: all files updated normally (no manifest to check), manifest created for next time
- Subsequent updates: hash comparison protects user modifications
</step>

<step name="run_update">
Run the update using the install type detected in step 1:

Build runtime flag from step 1:
```bash
RUNTIME_FLAG="--$TARGET_RUNTIME"
```

**If LOCAL install:**
```bash
npx -y pde-engine-pde@latest "$RUNTIME_FLAG" --local
```

**If GLOBAL install:**
```bash
npx -y pde-engine-pde@latest "$RUNTIME_FLAG" --global
```

**If UNKNOWN install:**
```bash
npx -y pde-engine-pde@latest --claude --global
```

Capture output. If install fails, show error and exit.

Clear the update cache so statusline indicator disappears:

```bash
# Clear update cache across all runtime directories
for dir in .claude .config/opencode .opencode .gemini .codex; do
  rm -f "./$dir/cache/pde-update-check.json"
  rm -f "$HOME/$dir/cache/pde-update-check.json"
done
```

The SessionStart hook (`pde-check-update.js`) writes to the detected runtime's cache directory, so all paths must be cleared to prevent stale update indicators.
</step>

<step name="display_result">
Format completion message (changelog was already shown in confirmation step):

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" checkpoint "PDE Updated: v{old} -> v{new}"
```

Restart your runtime to pick up the new commands.
</step>


<step name="check_local_patches">
After update completes, check if the installer detected and backed up any locally modified files:

Check for pde-local-patches/backup-meta.json in the config directory.

**If patches found:**

```
Local patches were backed up before the update.
Run /pde:reapply-patches to merge your modifications into the new version.
```

**If no patches:** Continue normally.
</step>
</process>

<success_criteria>
- [ ] Installed version read correctly
- [ ] Latest version checked via npm
- [ ] Update skipped if already current
- [ ] Changelog fetched and displayed BEFORE update
- [ ] Clean install warning shown
- [ ] User confirmation obtained
- [ ] Update executed successfully
- [ ] Restart reminder shown
</success_criteria>
