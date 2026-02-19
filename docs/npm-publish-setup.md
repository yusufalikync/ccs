# npm Publish Setup Guide

How to set up automated npm publishing for `ccs-stats`.

## Prerequisites

- An [npm account](https://www.npmjs.com/signup)
- The `ccs` GitHub repo with push access

## Step 1: Create an npm Access Token

1. Go to [npmjs.com](https://www.npmjs.com) → Sign in
2. Click your profile picture (top right) → **Access Tokens**
3. Click **Generate New Token** → **Granular Access Token**
4. Configure:
   - **Token name**: `ccs-github-actions`
   - **Expiration**: 365 days (or your preference)
   - **Packages and scopes**: Select **Read and write**
   - **Select packages**: Choose `ccs-stats` (or "All packages" if first publish)
5. Click **Generate Token**
6. **Copy the token** — you won't see it again

## Step 2: Add the Token to GitHub

1. Go to your repo: `https://github.com/yusufalikync/ccs`
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Configure:
   - **Name**: `NPM_TOKEN`
   - **Secret**: Paste the npm token from Step 1
5. Click **Add secret**

## Step 3: First Manual Publish (One-Time)

For the very first publish, you need to do it locally because the package doesn't exist on npm yet:

```bash
# Make sure you're logged in to npm
npm login

# Verify package contents
npm pack --dry-run

# Publish for the first time
npm publish --access public
```

After this, all future publishes can be automated via GitHub Actions.

## Step 4: Automated Publishing (After First Publish)

To publish a new version:

```bash
# 1. Update version in package.json
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)

# 2. Push the commit and tag
git push && git push --tags
```

This triggers the `publish.yml` workflow which:
1. Runs smoke tests
2. Verifies package contents
3. Publishes to npm with provenance

### Alternative: Use the Release Script

```bash
bash scripts/release.sh
```

This does everything in one step: checks clean git state, runs tests, confirms version, publishes, and pushes the tag.

## Verifying

After publishing:
- Check npm: `https://www.npmjs.com/package/ccs-stats`
- Check GitHub Actions: `https://github.com/yusufalikync/ccs/actions`
- Test install: `npx ccs-stats install`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm ERR! 403` | Token doesn't have write access — regenerate with correct permissions |
| `npm ERR! 402` | Package name may be taken — check `npm view ccs-stats` |
| GitHub Action fails | Check that `NPM_TOKEN` secret is set correctly in repo settings |
| `npm ERR! ENEEDAUTH` | `NODE_AUTH_TOKEN` not set — verify the secret name is exactly `NPM_TOKEN` |
