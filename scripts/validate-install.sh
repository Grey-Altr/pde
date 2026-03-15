#!/usr/bin/env bash
# validate-install.sh — PDE install validation
# Checks for hardcoded usernames, GSD references, version mismatches, and missing marketplace.json

set -e

ERRORS=0

echo "PDE Install Validation"
echo "======================"

# Check 1: No hardcoded usernames in source files
# Checks for actual developer home directory paths (using current $USER or common long usernames)
# Intentionally skips generic placeholder paths like /Users/name/ used in documentation examples
echo ""
echo "Checking for hardcoded usernames..."
HARDCODED=$(grep -r --include="*.md" --include="*.json" --include="*.cjs" --include="*.sh" \
  -l "/Users/$USER/" bin/ lib/ commands/ workflows/ templates/ references/ .claude-plugin/ \
  2>/dev/null || true)
if [ -n "$HARDCODED" ]; then
  echo "  ERROR: Hardcoded absolute paths for user '$USER' found in:"
  echo "$HARDCODED"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No hardcoded usernames found"
fi

# Check 2a: No GSD references in documentation
echo ""
echo "Checking for GSD references in documentation..."
GSD_DOCS=$(grep -ril "gsd\|get-shit-done" README.md GETTING-STARTED.md 2>/dev/null || true)
if [ -n "$GSD_DOCS" ]; then
  echo "  ERROR: GSD references found in documentation:"
  echo "$GSD_DOCS"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No GSD references in documentation"
fi

# Check 2b: No GSD references in source directories
echo ""
echo "Checking for GSD references in source files..."
GSD_SRC=$(grep -ril "gsd\|get-shit-done" bin/ lib/ commands/ workflows/ templates/ references/ .claude-plugin/ \
  2>/dev/null || true)
if [ -n "$GSD_SRC" ]; then
  echo "  ERROR: GSD references found in source files:"
  echo "$GSD_SRC"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No GSD references in source files"
fi

# Check 3: VERSION and plugin.json version in sync
echo ""
echo "Checking version consistency..."
VERSION_FILE=$(cat VERSION 2>/dev/null | tr -d '[:space:]')
PLUGIN_VERSION=$(grep '"version"' .claude-plugin/plugin.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
if [ "$VERSION_FILE" != "$PLUGIN_VERSION" ]; then
  echo "  ERROR: Version mismatch — VERSION=$VERSION_FILE, plugin.json=$PLUGIN_VERSION"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: Version consistent ($VERSION_FILE)"
fi

# Check 4: marketplace.json exists
echo ""
echo "Checking marketplace.json..."
if [ ! -f ".claude-plugin/marketplace.json" ]; then
  echo "  ERROR: .claude-plugin/marketplace.json not found — plugin not distributable"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: marketplace.json exists"
fi

echo ""
echo "======================"
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS error(s) found"
  exit 1
else
  echo "PASSED: All checks clean"
fi
