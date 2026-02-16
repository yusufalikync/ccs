---
name: clear-cache
description: Clear statusline usage cache files from /tmp
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash
---

# Clear Cache

Remove statusline usage cache files to force fresh API data on next status line refresh.

## Instructions

### 1. List existing cache files
```bash
ls -la /tmp/claude_usage_cache_*.json 2>/dev/null || echo "No cache files found"
```

### 2. Delete cache files
```bash
rm -f /tmp/claude_usage_cache_*.json
```

### 3. Confirm cleanup
```bash
ls /tmp/claude_usage_cache_*.json 2>/dev/null && echo "WARNING: Some files remain" || echo "All cache files cleared"
```

Report how many files were removed and confirm the cleanup is complete. The status line will fetch fresh usage data on its next refresh cycle (within 60 seconds).
