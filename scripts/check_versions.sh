#!/bin/bash
# ============================================================================
# check_versions.sh — verify APP_VERSION, CACHE_NAME, and cache-busters match
# ============================================================================
# Run this before committing to make sure no version is out of sync. If any
# of them disagree, refresh will fail on MacBook Chrome (the v2147 bug).
#
# Exit codes:
#   0 = all versions match
#   1 = mismatch found
# ============================================================================

set -e
cd "$(dirname "$0")/.."

APP_VERSION=$(grep -E "^const APP_VERSION" app.js | head -1 | sed -E "s/.*'(v[0-9]+)'.*/\1/")
CACHE_NAME=$(grep -E "^const CACHE_NAME" sw.js | head -1 | sed -E "s/.*'kiki-marine-(v[0-9]+)'.*/\1/")
# Find the highest cache-buster in index.html script tags
HTML_VER=$(grep -oE '\?v=v?[0-9]+' index.html | grep -oE 'v?[0-9]+$' | sort -u | tr '\n' ' ')

FAIL=0
echo "APP_VERSION (app.js):       $APP_VERSION"
echo "CACHE_NAME  (sw.js):        $CACHE_NAME"
echo "index.html cache-busters:   $HTML_VER"

if [ "$APP_VERSION" != "$CACHE_NAME" ]; then
  echo "  ✗ APP_VERSION and CACHE_NAME do not match"
  FAIL=1
fi

# Every cache-buster in index.html should equal the numeric part of APP_VERSION
APP_VERSION_NUM=${APP_VERSION#v}
for ver in $HTML_VER; do
  ver_num=${ver#v}
  if [ "$ver_num" != "$APP_VERSION_NUM" ]; then
    echo "  ✗ index.html cache-buster '$ver' does not match APP_VERSION '$APP_VERSION'"
    FAIL=1
  fi
done

# Check CHANGELOG has an entry for the current version
if ! grep -qE "^## $APP_VERSION\b" CHANGELOG.md; then
  echo "  ✗ CHANGELOG.md missing entry for $APP_VERSION"
  FAIL=1
fi

if [ $FAIL -eq 0 ]; then
  echo "  ✓ All versions match and CHANGELOG has an entry"
fi

exit $FAIL
