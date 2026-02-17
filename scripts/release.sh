#!/bin/bash
set -e

echo "=== Release Checklist ==="

# 1. Clean git state
if [ -n "$(git status --porcelain)" ]; then
  echo "  FAIL: Working directory is not clean"
  exit 1
fi
echo "  PASS: Clean git state"

# 2. Run tests
echo "  Running smoke tests..."
npm test
echo ""

# 3. Verify package contents
echo "  Checking package contents..."
npm pack --dry-run 2>&1
echo ""

# 4. Confirm
VERSION=$(node -p "JSON.parse(require('fs').readFileSync('package.json','utf-8')).version")
echo "Ready to publish v${VERSION}"
read -p "Continue? (y/N) " -n 1 -r
echo ""
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

# 5. Publish
npm publish
git tag "v${VERSION}"
git push --tags

echo ""
echo "Published v${VERSION}"
