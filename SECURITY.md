# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✓         |

## Data Handled

`ccs-stats` reads your Claude Code OAuth token from (in priority order):

1. `CLAUDE_CODE_OAUTH_TOKEN` environment variable
2. `~/.claude/.credentials.json` file
3. macOS Keychain via the `security` command

The token is used **solely** to fetch usage data from `https://api.anthropic.com/api/oauth/usage`. It is never logged, transmitted elsewhere, or stored beyond a 60-second cache in your system's temp directory (`<tmpdir>/claude_usage_cache_<session_id>.json`). Cache files are created with `0600` permissions (owner read/write only) and pruned after 24 hours.

`ccs-stats` also writes to `~/.claude/settings.json` (install/uninstall only) and creates a timestamped backup before any modification.

## Reporting a Vulnerability

For sensitive disclosures, please use [GitHub's private vulnerability reporting](https://github.com/yusufalikync/ccs/security/advisories/new). This keeps the report private until a fix is ready.

For non-sensitive issues, open a [GitHub issue](https://github.com/yusufalikync/ccs/issues) with the title prefix `[SECURITY]`.
