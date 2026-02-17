# PLAN: statusline.sh → statusline.js Migration ✅ COMPLETED

> This plan has been implemented (on `feat/statusline-node-rewrite` branch).

---

# PLAN: DX & Quality Improvements ✅ COMPLETED

Developer experience and quality improvements inspired by the `everything-claude-code` repo.

**Principle:** No over-engineering. Zero-dep philosophy preserved. Only high-value, low-effort additions suitable for a small project.

---

## Step 1: `npm test` Script (Smoke Test)

Add a zero-dependency smoke test to `package.json`. Catches broken statusline before publish.

**Chosen approach:** Separate `scripts/smoke-test.js` file — more readable and extensible.

```javascript
#!/usr/bin/env node
import { execSync } from "child_process";

const tests = [
  { name: "Normal input", input: '{"model":{"display_name":"Test"},...}' },
  { name: "Null fields", input: '{"model":{},"cost":{},...}' },
  { name: "Empty object", input: '{}' },
  { name: "High usage", input: '..., "used_percentage":95, ...}' },
  { name: "Overflow", input: '..., "used_percentage":150, ...}' },
];
// + CLI help test
// + console.log check in statusline.js
```

```json
"scripts": {
  "test": "node scripts/smoke-test.js",
  "prepublishOnly": "npm test"
}
```

---

## Step 2: Conventional Commits Rule

Add commit style rule to CLAUDE.md:

```markdown
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
```

**Why:** Existing commit history is inconsistent. A one-liner rule ensures Claude generates consistent commit messages.

---

## Step 3: `/verify` Skill

New skill for one-command project health check. `.claude/skills/verify/SKILL.md`:

Runs in sequence:
1. **Smoke test**: `npm test`
2. **Install cycle**: install → status (ACTIVE) → uninstall → status (NOT INSTALLED)
3. **console.log check**: must not exist in `scripts/statusline.js`
4. **Package check**: `npm pack --dry-run` — verify correct files are included
5. **No hardcoded paths**: grep `src/` for hardcoded `~/.claude` or `/tmp/`

Reports PASS/FAIL for each check.

---

## Step 4: Doc File Blocker

**Chosen approach:** CLAUDE.md rule instead of a hook — simpler, effective enough.

```markdown
- Do not create unnecessary files (CHANGELOG, CONTRIBUTING, TODO, etc.)
```

---

## Step 5: console.log Warning

**Chosen approach:** Include in smoke test (`scripts/smoke-test.js`) rather than a hook — works in both CI and local.

```javascript
const src = readFileSync("scripts/statusline.js", "utf-8");
if (src.includes("console.log")) {
  console.error("  FAIL: console.log found in statusline.js");
  process.exit(1);
}
```

---

## Step 6: Release Script

`scripts/release.sh` — automates the publish process:

1. Verify clean git state
2. Run `npm test`
3. `npm pack --dry-run` to verify package contents
4. Confirm version with user
5. `npm publish` → `git tag` → `git push --tags`

---

## Step 7: QA Agent — Confidence Filter

Added to `senior-qa` agent:

```
Only report issues you are >80% confident about. Do not flag stylistic preferences
or hypothetical edge cases that cannot occur with Claude Code's actual stdin format.
```

---

## Step 8: CLAUDE.md — Rules Section

Added rules section with:
- Conventional commits format
- No `console.log` in statusline.js
- Do not create unnecessary files
- No hardcoded paths — use `src/paths.js`

---

## Summary: Change Matrix

| # | File | Action | Effort |
|---|------|--------|--------|
| 1 | `scripts/smoke-test.js` | **NEW** | 15min |
| 1 | `package.json` | Update (scripts) | 2min |
| 2 | `CLAUDE.md` | Update (commit style + rules) | 2min |
| 3 | `.claude/skills/verify/SKILL.md` | **NEW** | 10min |
| 4-5 | `scripts/smoke-test.js` | Update (console.log check) | 2min |
| 6 | `scripts/release.sh` | **NEW** | 10min |
| 7 | `.claude/agents/senior-qa.md` | Update | 2min |

**Total:** 3 new files, 4 updates, ~45min effort

### Deliberately NOT Added

- ESLint/markdownlint devDependencies (breaks zero-dep philosophy)
- Rules directory structure (CLAUDE.md is sufficient)
- CI/CD pipeline (premature for current project stage)
- Multi-agent orchestration (over-engineering)
- MCP/plugin system (unnecessary)
- Session management, checkpoints (overkill for a small project)
- New agents (2 is enough for ~10 files)
