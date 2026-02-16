---
name: statusline-check
description: Health check and troubleshooting for installed statusline
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read
---

# Statusline Health Check

Run a comprehensive health check on the installed statusline setup and provide troubleshooting guidance.

## Checklist

Run these checks in order and report results:

### 1. Script installed
```bash
ls -la ~/.claude/statusline.sh
```
Expected: file exists and is readable.

### 2. Settings configured
Read `~/.claude/settings.json` and verify:
- `statusLine` key exists
- `command` value references `statusline.sh`
- `padding` is set

### 3. Dependencies available
```bash
which jq && jq --version
which curl && curl --version | head -1
which bc
which security
```
All four must be found.

### 4. Keychain access
```bash
security find-generic-password -s "Claude Code-credentials" 2>&1 | head -3
```
Should not return "security: SecKeychainSearchCopyNext: The specified item could not be found".

### 5. Cache status
```bash
ls -la /tmp/claude_usage_cache_*.json 2>/dev/null || echo "No cache files found"
```
Report count and age of cache files.

### 6. Quick smoke test
```bash
echo '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0},"context_window":{"used_percentage":50},"workspace":{"current_dir":"/tmp"},"session_id":"healthcheck"}' | bash ~/.claude/statusline.sh
```
Should produce two lines of output without errors.

## Output Format

Present results as a checklist:
- [x] Check passed
- [ ] Check failed — explain what's wrong and how to fix it

If any check fails, provide specific fix instructions (e.g., `brew install jq`, `node bin/cli.js install`).
