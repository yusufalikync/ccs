---
name: verify
description: Run full project verification — smoke tests, CLI checks, and code quality
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Grep
---

# Verify

Run all checks in sequence and report results.

## Instructions

### 1. Smoke tests
```bash
npm test
```
All tests must pass.

### 2. Install cycle
```bash
node bin/cli.js install
node bin/cli.js status
node bin/cli.js uninstall
node bin/cli.js status
```
- After install: status should show ACTIVE
- After uninstall: status should show NOT INSTALLED

### 3. console.log check
Grep `scripts/statusline.js` for `console.log`. It must NOT contain any — only `process.stdout.write()` is allowed.

### 4. Package check
```bash
npm pack --dry-run
```
Verify these are included: `bin/cli.js`, `src/`, `scripts/statusline.js`. Verify `scripts/smoke-test.js` is NOT included (excluded by design — only `scripts/statusline.js` is in the package).

### 5. No hardcoded paths
Grep `src/` files for hardcoded `~/.claude` or `/tmp/` paths. All paths should come from `src/paths.js` or `os.tmpdir()`.

## Output

Report each check as:
- PASS: Check description
- FAIL: Check description — what went wrong and how to fix

Final summary: `X/5 checks passed.`
