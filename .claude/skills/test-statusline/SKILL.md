---
name: test-statusline
description: Test statusline.js with mock JSON input and validate output
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read
argument-hint: [low|medium|high|null]
---

# Test statusline.js

Run `scripts/statusline.js` with mock JSON input to verify output formatting and color-coded progress bars.

## Instructions

Based on `$ARGUMENTS`, pick one of these test scenarios:

### `low` — Low usage (all green)
```bash
echo '{"model":{"display_name":"Claude Opus 4"},"cost":{"total_cost_usd":0.12},"context_window":{"used_percentage":25},"workspace":{"current_dir":"/Users/test/my-project"},"session_id":"test-low"}' | node scripts/statusline.js
```

### `medium` — Medium usage (yellow zone)
```bash
echo '{"model":{"display_name":"Claude Sonnet 4.5"},"cost":{"total_cost_usd":1.87},"context_window":{"used_percentage":75},"workspace":{"current_dir":"/Users/test/big-refactor"},"session_id":"test-medium"}' | node scripts/statusline.js
```

### `high` — High usage (red zone)
```bash
echo '{"model":{"display_name":"Claude Opus 4"},"cost":{"total_cost_usd":5.42},"context_window":{"used_percentage":95},"workspace":{"current_dir":"/Users/test/marathon-session"},"session_id":"test-high"}' | node scripts/statusline.js
```

### `null` — Null/missing values (fallback handling)
```bash
echo '{"model":{},"cost":{},"context_window":{},"workspace":{},"session_id":"test-null"}' | node scripts/statusline.js
```

### No argument — Run all scenarios
If `$ARGUMENTS` is empty, run **all four** scenarios above sequentially and compare outputs.

## Validation

After running, verify:
1. **Line 1** contains model name (or `?` for null), folder name, and cost
2. **Line 2** contains context progress bar with percentage
3. No errors or crashes in stderr
4. Null scenario shows safe fallbacks: `[?]`, `$0.0000`, `0%`

Report PASS/FAIL for each check.
