#!/bin/bash
# Pre-commit hook: run npm test before any git commit
# Claude Code passes the Bash tool input as JSON via stdin

input=$(cat)

# Check if this is a git commit command
echo "$input" | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  try {
    const cmd = JSON.parse(Buffer.concat(chunks)).command || '';
    process.exit(cmd.includes('git commit') ? 0 : 1);
  } catch { process.exit(1); }
});
" || exit 0

# It's a git commit — run smoke tests first
echo "[pre-commit] Running smoke tests before commit..."
npm --prefix /Users/ali.koyuncu/Projects/side/ccs test
