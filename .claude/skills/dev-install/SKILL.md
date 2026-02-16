---
name: dev-install
description: Run install/uninstall/status CLI commands for local development
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read
argument-hint: [install|uninstall|status]
---

# Dev Install

Quick shortcut to run the CLI during local development.

## Instructions

Run the CLI command based on `$ARGUMENTS`:

```bash
node bin/cli.js $ARGUMENTS
```

If `$ARGUMENTS` is empty, default to `status`.

## Post-run Verification

After the command completes, verify the result:

### After `install`
1. Check `~/.claude/statusline.sh` exists: `ls -la ~/.claude/statusline.sh`
2. Check `~/.claude/settings.json` contains `statusLine` key: read the file and confirm the `statusLine` configuration is present

### After `uninstall`
1. Confirm `~/.claude/statusline.sh` is gone: `ls ~/.claude/statusline.sh 2>&1`
2. Confirm `statusLine` key removed from `~/.claude/settings.json`: read the file and check

### After `status`
Just display the output — no additional checks needed.

Report what happened and whether verification passed.
