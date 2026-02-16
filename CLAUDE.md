# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An npm package (`claude-code-statusline`, alias `ccs`) that installs a bash script into `~/.claude/` and configures Claude Code's `settings.json` to display real-time usage stats (context %, session %, weekly %, cost) in the status line. The npm layer is purely an installer/manager — the actual work happens in the bash script.

## Commands

```bash
# Test CLI locally
node bin/cli.js install
node bin/cli.js uninstall
node bin/cli.js status

# Test statusline.sh directly with mock input
echo '{"model":{"display_name":"Opus 4"},"cost":{"total_cost_usd":0.5},"context_window":{"used_percentage":42},"workspace":{"current_dir":"/tmp/test"},"session_id":"dev"}' | bash scripts/statusline.sh

# Dry-run npm publish check
npm pack --dry-run
```

There are no build steps, no tests, and no linter configured.

## Architecture

- **ES Modules** (`"type": "module"`) — all `.js` files use `import`/`export`
- **Zero dependencies** — only Node.js built-ins (fs, os, path, child_process, url)
- **macOS only** — bash script uses `security` (Keychain) and BSD `date -jf`

### Flow

`bin/cli.js` parses argv → dynamic-imports `src/install.js`, `src/uninstall.js`, or `src/status.js`.

**Install**: platform guard → `check-deps.js` (verifies jq/curl/bc/security) → copies `scripts/statusline.sh` to `~/.claude/statusline.sh` → `settings.js` merges `statusLine` key into `~/.claude/settings.json` (with timestamped backup).

**Uninstall**: deletes the script → removes `statusLine` key from settings (with backup).

### Key Design Decisions

- `src/paths.js` uses `import.meta.url` to resolve `scripts/statusline.sh` relative to the package, not cwd
- `settings.js` does shallow merge — only touches the `statusLine` key, preserves everything else
- `hasStatusLine()` uses `includes('statusline.sh')` for soft matching (tolerates `~/` vs absolute paths)
- Install is idempotent: re-running updates the script but skips settings if already configured
- `settings.json` path written as tilde (`~/.claude/statusline.sh`), not absolute
- `statusLine` config includes `padding: 2` for multi-line output spacing

### statusline.sh Input/Output

**Input**: JSON via stdin (provided by Claude Code) with fields: `model.display_name`, `cost.total_cost_usd`, `context_window.used_percentage`, `workspace.current_dir`, `session_id`.

**Output**: Two-line ANSI-colored text:
- **Line 1**: `[Model] 📁 folder | $cost` — model (cyan), workspace folder, session cost (yellow)
- **Line 2**: `▓▓░░ ctx N% | sess: ▓▓░░ N% Xh | week: ▓▓░░ N% Xd` — context + usage bars

Progress bars color-coded via `color_for_pct()`: green (<70%), yellow (70-89%), red (>=90%). Uses `echo -e` for ANSI escape codes.

**Usage API**: Fetches `GET https://api.anthropic.com/api/oauth/usage` with OAuth token from macOS Keychain (`Claude Code-credentials`), requires header `anthropic-beta: oauth-2025-04-20`.

**Cache**: Isolated per session at `/tmp/claude_usage_cache_<session_id>.json` with 60s TTL. Null values have safe fallbacks (MODEL→"?", COST→0, USED_PCT→0).

## Skills

Dev and user skills are available in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `/test-statusline [low\|medium\|high\|null]` | Test statusline.sh with mock JSON input |
| `/dev-install [install\|uninstall\|status]` | Quick CLI command runner for local dev |
| `/statusline-check` | Health check + troubleshooting for installed statusline |
| `/clear-cache` | Remove usage cache files from /tmp |
