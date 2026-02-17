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
ls -la ~/.claude/statusline.js
```
Expected: file exists and is readable.

### 2. Settings configured
Read `~/.claude/settings.json` and verify:
- `statusLine` key exists
- `command` value references `statusline.js`
- `padding` is set

### 3. Node.js version
```bash
node --version
```
Must be >= 18 (for fetch API support).

### 4. Credential access
**macOS:**
```bash
security find-generic-password -s "Claude Code-credentials" 2>&1 | head -3
```

**Linux:**
```bash
secret-tool lookup service "Claude Code-credentials" 2>&1 | head -3
```

Should not return an error about item not found.

### 5. Cache status
```bash
ls -la ${TMPDIR:-/tmp}/claude_usage_cache_*.json 2>/dev/null || echo "No cache files found"
```
Report count and age of cache files.

### 6. Quick smoke test
```bash
echo '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0},"context_window":{"used_percentage":50},"workspace":{"current_dir":"/tmp"},"session_id":"healthcheck"}' | node ~/.claude/statusline.js
```
Should produce two lines of output without errors.

## Output Format

Present results as a checklist:
- [x] Check passed
- [ ] Check failed — explain what's wrong and how to fix it

If any check fails, provide specific fix instructions (e.g., `ccs install`, `update Node.js`).
