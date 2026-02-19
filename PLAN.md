# PLAN: Publish ccs-stats v1.0.0 to npm

## Context

ccs-stats is technically ready for publishing — 14 smoke tests passing, CI/CD configured, SECURITY.md and README in place. Three things remain:

- 12 files with uncommitted changes
- Package does not exist on npm yet → first publish must be done manually (`publish.yml` only works for subsequent releases)
- `NPM_TOKEN` has already been added to GitHub secrets

---

## Steps

### Step 1: Commit and push all pending changes

Changes are grouped into 5 focused commits on branch `chore/rename-and-improvements`:

| # | Commit | Files |
|---|--------|-------|
| 1 | `chore: rename package from claude-code-statusline to ccs-stats` | `package.json`, `bin/cli.js`, `README.md`, `.npmignore`, `docs/npm-publish-setup.md`, `scripts/release.sh` |
| 2 | `fix: harden statusline robustness and credential handling` | `scripts/statusline.js`, `src/settings.js` |
| 3 | `test: strengthen smoke tests with content validation and path safety` | `scripts/smoke-test.js` |
| 4 | `ci: expand matrix to ubuntu+macOS × Node 18/20/22` | `.github/workflows/ci.yml` |
| 5 | `docs: add SECURITY.md and refresh CLAUDE.md and TODO` | `SECURITY.md`, `CLAUDE.md`, `TODO.md` |

After push, open a PR from `chore/rename-and-improvements` → `main`. This triggers CI (ubuntu + macOS × Node 18/20/22 — 6 jobs). Wait for all to pass before merging and continuing.

---

### Step 2: First npm publish — manual (one-time only)

The first publish must be done locally because `publish.yml` assumes the package already exists on npm. New packages require manual registration first.

```bash
npm login                    # sign in to npmjs.com (skip if already logged in)
npm pack --dry-run           # verify package contents one last time
npm publish --access public  # --access public required for new unscoped packages
```

---

### Step 3: Create GitHub release (optional but recommended)

After successful npm publish:

```bash
git tag v1.0.0
git push --tags
```

`publish.yml` will trigger on the tag but gracefully fail with "already published" — harmless. Alternatively, create the release from GitHub UI and write release notes there.

---

### Step 4: Verify

```bash
npm view ccs-stats     # version and metadata visible?
npx ccs-stats install  # installs correctly?
ccs status             # shows ACTIVE?
ccs uninstall          # cleans up correctly?
```

---

### Step 5: Subsequent releases (automated)

```bash
npm version patch   # or minor / major — updates package.json, creates commit
git push && git push --tags   # triggers publish.yml → automatic npm publish
```

Or use the interactive release script:

```bash
bash scripts/release.sh  # clean state check → tests → confirm → publish → tag → push
```

---

## Critical Files

| File | Role |
|------|------|
| `package.json` | name: ccs-stats, version: 1.0.0, files whitelist |
| `scripts/release.sh` | Interactive release script |
| `.github/workflows/publish.yml` | Tag push → automated publish |
| `docs/npm-publish-setup.md` | Detailed setup guide |

## Verification Checklist

- [ ] `npm test` → 14/14 passing
- [ ] `npm pack --dry-run` → correct files, no `smoke-test.js` or `release.sh` included
- [ ] CI green on all 6 matrix jobs after push
- [ ] `npm view ccs-stats` → package visible after publish
- [ ] `npx ccs-stats install` → installs and works correctly
