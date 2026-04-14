#!/bin/bash
# ============================================================================
# release.sh — atomic version bump
# ============================================================================
# Usage:
#   scripts/release.sh            # auto-bumps to next version (current+1)
#   scripts/release.sh v2150      # bumps to a specific version
#
# Updates in a single operation:
#   - APP_VERSION in app.js
#   - CACHE_NAME in sw.js
#   - ?v= cache-busters on every script tag in index.html
# Then runs:
#   - node tests/run_tests.js
#   - scripts/check_versions.sh
#
# Does NOT commit or push. That's still on you. But it makes the commit
# trivial — no manual three-file editing, no version skew.
# ============================================================================

set -e
cd "$(dirname "$0")/.."

# Ensure node is findable even if the script was launched from a minimal shell
export PATH="/opt/homebrew/bin:/usr/local/bin:/opt/local/bin:$HOME/.nvm/versions/node/current/bin:$HOME/.volta/bin:$HOME/.asdf/shims:$HOME/.local/bin:$PATH"
if [ -z "$(command -v node 2>/dev/null)" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh" > /dev/null 2>&1 || true
fi
HAS_NODE=$(command -v node > /dev/null 2>&1 && echo "yes" || echo "no")

CURRENT=$(grep -E "^const APP_VERSION" app.js | head -1 | sed -E "s/.*'(v[0-9]+)'.*/\1/")
if [ -z "$CURRENT" ]; then
  echo "✗ Could not read current APP_VERSION from app.js"
  exit 1
fi
CURRENT_NUM=${CURRENT#v}

if [ -n "$1" ]; then
  NEW="$1"
  # Normalise: ensure leading 'v'
  [[ "$NEW" =~ ^v ]] || NEW="v$NEW"
else
  NEW_NUM=$((CURRENT_NUM + 1))
  NEW="v$NEW_NUM"
fi
NEW_NUM=${NEW#v}

echo "▶ Bumping $CURRENT → $NEW"

# 1. app.js
sed -i.bak "s|const APP_VERSION = '$CURRENT';|const APP_VERSION = '$NEW';|" app.js
rm -f app.js.bak

# 2. sw.js
sed -i.bak "s|const CACHE_NAME = 'kiki-marine-$CURRENT';|const CACHE_NAME = 'kiki-marine-$NEW';|" sw.js
rm -f sw.js.bak

# 3. index.html cache-busters — replace every ?v=NNNN after a script src=
#    (uses sed with portable syntax that works on macOS BSD sed)
sed -i.bak -E "s|(\.js)\?v=v?[0-9]+|\1?v=$NEW_NUM|g" index.html
rm -f index.html.bak

echo "  ✓ app.js: APP_VERSION = '$NEW'"
echo "  ✓ sw.js: CACHE_NAME = 'kiki-marine-$NEW'"
echo "  ✓ index.html: cache-busters → ?v=$NEW_NUM"

# 4. Verify everything
echo ""
if [ "$HAS_NODE" = "yes" ]; then
  echo "▶ Running tests…"
  if ! node tests/run_tests.js > /tmp/kiki_test_output.log 2>&1; then
    echo "✗ Tests failed — rolling back is manual. See /tmp/kiki_test_output.log"
    tail -30 /tmp/kiki_test_output.log
    exit 1
  fi
  PASSED=$(grep -oE "[0-9]+ tests? passed" /tmp/kiki_test_output.log | head -1)
  echo "  ✓ $PASSED"
else
  echo "▶ Skipping tests — Node.js not installed locally."
  echo "  (Install with 'brew install node' to enable local testing.)"
fi

echo ""
echo "▶ Version consistency check…"
bash scripts/check_versions.sh || {
  echo ""
  echo "NOTE: You must add a CHANGELOG.md entry for $NEW before committing."
  echo "The pre-commit hook will block the commit until you do."
  exit 0
}

echo ""
echo "✓ Release $NEW ready."
echo ""
echo "Next steps:"
echo "  1. Add a new entry to the top of CHANGELOG.md:"
echo ""
echo "     ## $NEW — $(date +%Y-%m-%d)"
echo ""
echo "     ### Added / Changed / Fixed / Removed"
echo "     - <describe your changes>"
echo ""
echo "  2. git add -A && git commit -m \"$NEW: <summary>\""
echo "  3. git push origin main"
