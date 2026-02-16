# Claude Code Statusline

**C**laude **C**ode **S**tatusline(ccs):  Real-time usage stats in Claude Code's status line — see your session limit, weekly limit, remaining time, context usage, and cost at a glance.

```text
[Opus 4.6] 📁 my-project | $0.3595
▓▓▓▓░░░░░░░░░░░░░░░░ ctx 20% | sess: ▓▓▓▓▓▓▓▓░░ 88% 3h24m | week: ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 63% 2d10h
```

The status line uses ANSI colors to indicate usage levels: green (<70%), yellow (70-89%), and red (>=90%).

![screenshot](./docs/pic/screenshot.png)

## Quick Start

```bash
npx claude-code-usage-statusline install
```

That's it. Restart Claude Code and the status line appears.

## Requirements

| Requirement | Details |
|-------------|---------|
| **OS** | macOS only (uses Keychain & BSD `date`) |
| **Claude Code** | Logged in via OAuth — Pro or Max plan |
| **jq** | `brew install jq` |
| **Node.js** | >= 18 (for the installer only) |

> `curl` and `bc` are included with macOS by default.

## Installation

### Option 1: npx (no global install)

```bash
npx claude-code-usage-statusline install
```

### Option 2: Global install

```bash
npm install -g claude-code-usage-statusline
ccus install
```

### What happens during install

1. Checks for required dependencies (`jq`, `curl`, `bc`, `security`)
2. Copies `statusline.sh` to `~/.claude/statusline.sh`
3. Adds `statusLine` config to `~/.claude/settings.json` (creates a backup first)

> Existing settings are preserved — only the `statusLine` key is added. Running install multiple times is safe (idempotent).

## Usage

```bash
ccus install      # Install script & configure settings
ccus uninstall    # Remove script & clean up settings
ccus status       # Check if statusline is active
```

`ccus` and `claude-code-usage-statusline` are interchangeable.

## What It Shows

**Line 1 — Session info:**

| Segment | Description |
|---------|-------------|
| `[Opus 4.6]` | Active model (cyan) |
| `📁 my-project` | Current workspace folder |
| `$0.3595` | Current session cost (yellow) |

**Line 2 — Usage bars:**

| Segment | Description |
|---------|-------------|
| `▓▓▓▓░░░░ ctx 20%` | Context window usage with color-coded progress bar |
| `sess: 88% 3h24m` | 5-hour rolling window utilization + time until reset |
| `week: 63% 2d10h` | 7-day rolling window utilization + time until reset |

Progress bars are color-coded: green (<70%), yellow (70-89%), red (>=90%). If usage data is unavailable, line 2 shows only the context bar.

## How It Works

```text
Claude Code response
  → triggers statusline.sh via stdin
    → parses model, cost, context from JSON input
    → reads OAuth token from macOS Keychain
    → fetches usage from api.anthropic.com/api/oauth/usage (cached 60s)
    → outputs formatted status line with progress bars
```

The script caches API responses at `/tmp/claude_usage_cache_<session_id>.json` (60-second TTL, isolated per session) to avoid hitting the API on every response.

### API Details

- **Endpoint:** `GET https://api.anthropic.com/api/oauth/usage`
- **Auth:** OAuth token from macOS Keychain (`Claude Code-credentials`)
- **Required header:** `anthropic-beta: oauth-2025-04-20`

## Uninstalling

```bash
ccus uninstall
```

This removes `~/.claude/statusline.sh` and deletes the `statusLine` key from `~/.claude/settings.json` (with backup). No other settings are modified.

## Limitations

- **macOS only** — uses `security` (Keychain) and BSD `date -jf`. Linux is not supported yet.
- **OAuth login only** — API key authentication does not have access to the usage endpoint.
- **Beta header may change** — `anthropic-beta: oauth-2025-04-20` could be updated by Anthropic in the future. If the status line stops showing usage data, check for an updated version of this package.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Usage data not showing | Make sure you're logged in via OAuth (`claude` command), not API key |
| `jq: command not found` | `brew install jq` |
| Stale data | Delete `/tmp/claude_usage_cache_*.json` to force a fresh API call |
| Status line not appearing | Run `ccus status` to check, then restart Claude Code |

## License

[MIT](./LICENSE)
