#!/usr/bin/env node
import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Setup temp git repo for git scenario tests
const tempGitDir = mkdtempSync(join(tmpdir(), "ccs-smoke-"));
process.on("exit", () => rmSync(tempGitDir, { recursive: true, force: true }));
execFileSync("git", ["init"], { cwd: tempGitDir, stdio: "pipe" });
execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: tempGitDir, stdio: "pipe" });
execFileSync("git", ["config", "user.name", "Test"], { cwd: tempGitDir, stdio: "pipe" });
writeFileSync(join(tempGitDir, "file.txt"), "content");
execFileSync("git", ["add", "."], { cwd: tempGitDir, stdio: "pipe" });
execFileSync("git", ["commit", "-m", "init", "--no-gpg-sign"], { cwd: tempGitDir, stdio: "pipe" });
const initHash = execFileSync("git", ["rev-parse", "HEAD"], { cwd: tempGitDir, encoding: "utf-8" }).trim();

const tests = [
  { name: "Normal input", input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0.5},"context_window":{"used_percentage":42},"workspace":{"current_dir":"/tmp"},"session_id":"test"}' },
  { name: "Null fields", input: '{"model":{},"cost":{},"context_window":{},"workspace":{}}' },
  { name: "Empty object", input: '{}' },
  { name: "High usage (red)", input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":5},"context_window":{"used_percentage":95},"workspace":{"current_dir":"/tmp"},"session_id":"test"}' },
  { name: "Overflow values", input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0},"context_window":{"used_percentage":150},"workspace":{"current_dir":"/tmp"},"session_id":"test"}' },
  { name: "Zero values", input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0},"context_window":{"used_percentage":0},"workspace":{"current_dir":"/tmp"},"session_id":"test"}' },
];

let passed = 0;
let total = 0;

console.log("=== Statusline Smoke Tests ===\n");

// Statusline output tests
for (const t of tests) {
  total++;
  try {
    const output = execFileSync("node", ["scripts/statusline.js"], {
      input: t.input,
      encoding: "utf-8",
    });
    const lines = output.trim().split("\n");
    if (lines.length !== 2) throw new Error(`Expected 2 lines, got ${lines.length}`);
    console.log(`  PASS: ${t.name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL: ${t.name} — ${e.message}`);
    process.exit(1);
  }
}

// Git info tests
const gitTests = [
  {
    name: "Git repo (branch renders)",
    input: JSON.stringify({ model: { display_name: "Test" }, cost: { total_cost_usd: 0.5 }, context_window: { used_percentage: 42 }, workspace: { current_dir: tempGitDir }, session_id: "test" }),
    check: (line1) => {
      const segments = line1.split("|");
      if (segments.length < 3) throw new Error(`Expected branch segment in line 1, got: ${line1}`);
      if (!segments[1].trim()) throw new Error(`Branch segment is empty in line 1`);
    },
  },
  {
    name: "Git repo dirty (dirty mark renders)",
    setup: () => writeFileSync(join(tempGitDir, "file.txt"), "dirty"),
    input: JSON.stringify({ model: { display_name: "Test" }, cost: { total_cost_usd: 0.5 }, context_window: { used_percentage: 42 }, workspace: { current_dir: tempGitDir }, session_id: "test" }),
    check: (line1) => {
      if (!line1.includes("\u2739")) throw new Error(`Expected dirty mark ✹ in line 1, got: ${line1}`);
    },
  },
  {
    name: "Detached HEAD (short hash renders)",
    setup: () => execFileSync("git", ["checkout", "--detach", initHash], { cwd: tempGitDir, stdio: "pipe" }),
    input: JSON.stringify({ model: { display_name: "Test" }, cost: { total_cost_usd: 0.5 }, context_window: { used_percentage: 42 }, workspace: { current_dir: tempGitDir }, session_id: "test" }),
    check: (line1) => {
      const segments = line1.split("|");
      if (segments.length < 3) throw new Error(`Expected hash segment in line 1, got: ${line1}`);
      const branchSeg = segments[1].trim();
      if (branchSeg === "HEAD") throw new Error(`Expected short hash, got literal HEAD`);
    },
  },
  {
    name: "Non-git dir (branch hidden)",
    input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0.5},"context_window":{"used_percentage":42},"workspace":{"current_dir":"/tmp"},"session_id":"test"}',
    check: (line1) => {
      const segments = line1.split("|");
      if (segments.length !== 2) throw new Error(`Expected no branch segment in line 1, got: ${line1}`);
    },
  },
  {
    name: "Nonexistent dir (graceful fallback)",
    input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0.5},"context_window":{"used_percentage":42},"workspace":{"current_dir":"/this/path/does/not/exist"},"session_id":"test"}',
    check: (line1) => {
      const segments = line1.split("|");
      if (segments.length !== 2) throw new Error(`Expected no branch segment in line 1, got: ${line1}`);
    },
  },
];

for (const t of gitTests) {
  total++;
  try {
    t.setup?.();
    const output = execFileSync("node", ["scripts/statusline.js"], {
      input: t.input,
      encoding: "utf-8",
    });
    const lines = output.trim().split("\n");
    if (lines.length !== 2) throw new Error(`Expected 2 lines, got ${lines.length}`);
    const line1 = lines[0].replace(/\x1b\[[0-9;]*m/g, ""); // strip ANSI
    t.check(line1);
    console.log(`  PASS: ${t.name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL: ${t.name} — ${e.message}`);
    process.exit(1);
  }
}

// CLI help test
total++;
try {
  execFileSync("node", ["bin/cli.js", "help"], { stdio: "pipe" });
  console.log("  PASS: CLI help");
  passed++;
} catch {
  console.error("  FAIL: CLI help");
  process.exit(1);
}

// console.log check in statusline.js
total++;
try {
  const src = readFileSync("scripts/statusline.js", "utf-8");
  if (src.includes("console.log")) {
    console.error("  FAIL: console.log found in statusline.js — use process.stdout.write()");
    process.exit(1);
  }
  console.log("  PASS: No console.log in statusline.js");
  passed++;
} catch (e) {
  console.error(`  FAIL: Could not read statusline.js — ${e.message}`);
  process.exit(1);
}

console.log(`\n${passed}/${total} tests passed.`);
