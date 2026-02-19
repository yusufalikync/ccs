# ccs-stats (ccs)

npm package that installs a Node.js statusline script into `~/.claude/` and configures `settings.json` to display real-time usage stats (context %, session %, weekly %, cost). The npm layer is the installer — the actual work happens in `scripts/statusline.js`.

## Commands

```bash
# Test CLI locally
node bin/cli.js install
node bin/cli.js uninstall
node bin/cli.js status

# Test statusline.js directly with mock input
echo '{"model":{"display_name":"Opus 4"},"cost":{"total_cost_usd":0.5},"context_window":{"used_percentage":42},"workspace":{"current_dir":"/tmp/test"},"session_id":"dev"}' | node scripts/statusline.js

# Run smoke tests
npm test

# Dry-run npm publish check
npm pack --dry-run

# Publish to npm (runs npm test via prepublishOnly hook)
npm publish

# Release with full checklist (clean state, test, tag, publish)
bash scripts/release.sh
```

There are no build steps and no linter configured. Smoke tests run via `npm test` (14 tests in `scripts/smoke-test.js`). `prepublishOnly` runs tests automatically before `npm publish`.

## Architecture

- **ES Modules** (`"type": "module"`) — all `.js` files use `import`/`export`
- **Zero dependencies** — only Node.js built-ins (fs, os, path, child_process, url)
- **Cross-platform** — macOS and Linux (verified); Windows experimental (credential access unverified)

### Flow

`bin/cli.js` parses argv → dynamic-imports `src/install.js`, `src/uninstall.js`, or `src/status.js`.

**Install**: `src/check-deps.js` (verifies Node >= 18) → copies `scripts/statusline.js` to `~/.claude/statusline.js` → cleans up old `statusline.sh` if present → `settings.js` merges `statusLine` key into `~/.claude/settings.json` (with timestamped backup).

**Test**: `scripts/smoke-test.js` — runs statusline with 11 mock inputs (normal, null, empty, high, overflow, zero + git repo, dirty state, detached HEAD, non-git dir, nonexistent dir), verifies 2-line output and content (model name, cost format, progress bar chars); injects a mock cache file to test sess/week bar rendering; checks CLI help; ensures no `console.log` in statusline.js. All paths are `__dirname`-relative — safe to run from any cwd.

**Release**: `scripts/release.sh` — verifies clean git state → `npm pack --dry-run` → confirms version → `npm publish` (triggers `prepublishOnly` → tests) → `git tag` → `git push` → `git push --tags`.

**Uninstall**: deletes the script → removes `statusLine` key from settings (with backup).

**Status**: checks if `~/.claude/statusline.js` exists and `settings.json` has `statusLine` configured → reports ACTIVE, PARTIAL, or NOT INSTALLED.

### Key Design Decisions

- `src/paths.js` uses `import.meta.url` to resolve `scripts/statusline.js` relative to the package, not cwd
- `settings.js` does shallow merge — only touches the `statusLine` key, preserves everything else
- `hasStatusLine()` uses `includes('statusline.')` for soft matching (tolerates `.sh` and `.js` variants)
- Install is idempotent: re-running updates the script but skips settings if already configured
- `settings.json` command written as `node ~/.claude/statusline.js`
- `statusLine` config includes `padding: 2` for multi-line output spacing
- Install auto-cleans old `statusline.sh` for backward compatibility
- `getGitInfo()` runs `git rev-parse` + `git status --porcelain --untracked-files=no` per response; returns `null` outside git repos (branch section hidden automatically)
- `getGitInfo()` detached HEAD falls back to `git rev-parse --short HEAD` (short commit hash)
- `getGitInfo()` all `execSync` calls have `timeout: 3000` to prevent hangs on network-mounted paths
- macOS `security` keychain call also has `timeout: 3000` — locked Keychain would otherwise block indefinitely
- `path.basename(dir)` used for folder extraction — cross-platform safe (replaces manual split)
- `homedir()` from `os` used for credentials path — more reliable than `HOME`/`USERPROFILE` env chain
- `getOAuthToken()` checks `expiresAt` on credentials — skips expired tokens rather than attempting a doomed API call
- JSON.parse on stdin wrapped in try/catch with `{}` fallback — safe against malformed input
- `cost` coerced with `Number()` — prevents `toFixed()` crash if API sends cost as a string
- `fetchUsage()` checks `resp.ok` before calling `resp.json()` — non-2xx responses (401/403/500) return `null` silently
- `fetchUsage()` prunes cache files older than 24h on each cache write — prevents unbounded tmpdir growth
- `backup()` in `settings.js` is wrapped in try/catch at call sites — disk-full/permission errors log a warning instead of crashing install
- `bin/cli.js` unknown commands print `Error: unknown command 'X'` and exit 1 — help text only shown for `help`/`--help`/`-h`

### statusline.js Input/Output

**Input**: JSON via stdin (provided by Claude Code) with fields: `model.display_name`, `cost.total_cost_usd`, `context_window.used_percentage`, `workspace.current_dir`, `session_id`.

**Output**: Two-line ANSI-colored text:
- **Line 1**: `[Model] 📁 folder | ✹branch | $cost` — model (cyan), folder, git branch (green), dirty marker ✹ (purple, hidden when clean), session cost (yellow)
- **Line 2**: `▓▓░░ ctx N% | sess: ▓▓░░ N% Xh | week: ▓▓░░ N% Xd` — context + usage bars

Progress bars color-coded via `colorForPct()`: green (<70%), yellow (70-89%), red (>=90%).

**Usage API**: Fetches `GET https://api.anthropic.com/api/oauth/usage` with OAuth token from platform credential store, requires header `anthropic-beta: oauth-2025-04-20`.

**Credential access**: priority order: `CLAUDE_CODE_OAUTH_TOKEN` env var → `~/.claude/.credentials.json` file (primary on Linux; present on macOS and Windows when available) → macOS Keychain (`security`, fallback since macOS deletes the file after login). Verified on macOS and Linux; Windows experimental.

**Cache**: Isolated per session at `<tmpdir>/claude_usage_cache_<session_id>.json` with 60s TTL. Stale files older than 24h are pruned on each cache write. Null values have safe fallbacks (MODEL→"?", COST→0, USED_PCT→0).

## Rules

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- No `console.log` in `scripts/statusline.js` — use `process.stdout.write()` instead
- Do not create unnecessary files (CHANGELOG, CONTRIBUTING, etc.)
- No hardcoded paths — use `src/paths.js` for all path constants

## Gotchas

- `statusline.js` runs on **every** Claude Code response — keep it fast, no heavy computation
- Usage data requires **OAuth login** (Pro/Max plan) — API key users see only context bar
- `fetch()` requires Node >= 18 — this is why `engines.node` is set to `>=18`
- Cache files in `tmpdir` are per-session — stale data across sessions is expected, not a bug
- `hasStatusLine()` soft-matches `statusline.` (not `.js`) to handle upgrades from old `.sh` installs
- `getGitInfo()` adds 2 synchronous git subprocess calls per response — keep surrounding logic minimal
- Git branch dirty marker uses true-color ANSI (`\x1b[38;2;R;G;Bm`) — requires a truecolor terminal; degrades silently otherwise

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | Push to main, PRs | Smoke tests + install/uninstall cycle on ubuntu + macOS with Node 18, 20, 22 matrix (6 jobs) |
| `publish.yml` | Tag `v*` push | Run tests → verify package → `npm publish --provenance` (requires `NPM_TOKEN` secret, see [setup guide](docs/npm-publish-setup.md)) |
| `package-audit.yml` | PRs | Verify package contents, zero-dep policy, and engine constraint |

## Agents

Custom agents are available in `.claude/agents/`:

| Agent | Purpose |
|-------|---------|
| `senior-js-dev` | Code writing, review, and refactoring — ES Modules, cross-platform, zero-dep focused |
| `senior-qa` | Testing, edge cases, regression — read-only, reports PASS/FAIL with mock input scenarios |

## Skills

Dev and user skills are available in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `/test-statusline [low\|medium\|high\|null]` | Test statusline.js with mock JSON input |
| `/dev-install [install\|uninstall\|status]` | Quick CLI command runner for local dev |
| `/statusline-check` | Health check + troubleshooting for installed statusline |
| `/clear-cache` | Remove usage cache files from /tmp |
| `/verify` | Full project verification — smoke tests, install/uninstall cycle, console.log check, `npm pack --dry-run`, no hardcoded paths |
