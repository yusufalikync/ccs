#!/usr/bin/env node
import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Setup temp git repo for git scenario tests
const tempGitDir = mkdtempSync(join(tmpdir(), "ccs-smoke-"));
// Setup isolated non-git dir for branch-hidden tests (avoids /tmp git-repo ambiguity)
const tempNonGitDir = mkdtempSync(join(tmpdir(), "ccs-smoke-nongit-"));
process.on("exit", () => {
  rmSync(tempGitDir, { recursive: true, force: true });
  rmSync(tempNonGitDir, { recursive: true, force: true });
  try { unlinkSync(join(tmpdir(), "claude_usage_cache_smoke-usage-test.json")); } catch { /* ok if missing */ }
});
execFileSync("git", ["init"], { cwd: tempGitDir, stdio: "pipe" });
execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: tempGitDir, stdio: "pipe" });
execFileSync("git", ["config", "user.name", "Test"], { cwd: tempGitDir, stdio: "pipe" });
writeFileSync(join(tempGitDir, "file.txt"), "content");
execFileSync("git", ["add", "."], { cwd: tempGitDir, stdio: "pipe" });
execFileSync("git", ["commit", "-m", "init", "--no-gpg-sign"], { cwd: tempGitDir, stdio: "pipe" });
const initHash = execFileSync("git", ["rev-parse", "HEAD"], { cwd: tempGitDir, encoding: "utf-8" }).trim();

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

const tests = [
  {
    name: "Normal input",
    input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0.5},"context_window":{"used_percentage":42},"workspace":{"current_dir":"/tmp"},"session_id":"test"}',
    check: (lines) => {
      const l1 = stripAnsi(lines[0]);
      const l2 = stripAnsi(lines[1]);
      if (!l1.includes("Test")) throw new Error(`Model name missing from line 1: ${l1}`);
      if (!l1.includes("$")) throw new Error(`Cost missing from line 1: ${l1}`);
      if (!l2.includes("ctx")) throw new Error(`ctx label missing from line 2: ${l2}`);
      if (!/[▓░]/.test(l2)) throw new Error(`Progress bar chars missing from line 2: ${l2}`);
    },
  },
  { name: "Null fields", input: '{"model":{},"cost":{},"context_window":{},"workspace":{}}' },
  { name: "Empty object", input: '{}' },
  {
    name: "High usage (red)",
    input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":5},"context_window":{"used_percentage":95},"workspace":{"current_dir":"/tmp"},"session_id":"test"}',
    check: (lines) => {
      const l2 = stripAnsi(lines[1]);
      if (!l2.includes("95%")) throw new Error(`Expected 95% in line 2: ${l2}`);
    },
  },
  {
    name: "Overflow values",
    input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0},"context_window":{"used_percentage":150},"workspace":{"current_dir":"/tmp"},"session_id":"test"}',
    check: (lines) => {
      const l2 = stripAnsi(lines[1]);
      if (!/▓{20}/.test(l2)) throw new Error(`Expected fully filled bar for overflow in line 2: ${l2}`);
    },
  },
  {
    name: "Zero values",
    input: '{"model":{"display_name":"Test"},"cost":{"total_cost_usd":0},"context_window":{"used_percentage":0},"workspace":{"current_dir":"/tmp"},"session_id":"test"}',
    check: (lines) => {
      const l2 = stripAnsi(lines[1]);
      if (!l2.includes("0%")) throw new Error(`Expected 0% in line 2: ${l2}`);
    },
  },
];

let passed = 0;
let total = 0;

console.log("=== Statusline Smoke Tests ===\n");

const failures = [];

// Statusline output tests
for (const t of tests) {
  total++;
  try {
    const output = execFileSync("node", [join(__dirname, "statusline.js")], {
      input: t.input,
      encoding: "utf-8",
    });
    const lines = output.trim().split("\n");
    if (lines.length !== 2) throw new Error(`Expected 2 lines, got ${lines.length}`);
    t.check?.(lines);
    console.log(`  PASS: ${t.name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL: ${t.name} — ${e.message}`);
    failures.push(t.name);
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
    setup: () => {
      // Restore clean working tree before detaching (dirty test left file modified)
      execFileSync("git", ["checkout", "--", "file.txt"], { cwd: tempGitDir, stdio: "pipe" });
      execFileSync("git", ["checkout", "--detach", initHash], { cwd: tempGitDir, stdio: "pipe" });
    },
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
    input: JSON.stringify({ model: { display_name: "Test" }, cost: { total_cost_usd: 0.5 }, context_window: { used_percentage: 42 }, workspace: { current_dir: tempNonGitDir }, session_id: "test" }),
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
    const output = execFileSync("node", [join(__dirname, "statusline.js")], {
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
    failures.push(t.name);
  }
}

// Usage bars test — inject mock cache to exercise sess/week render path
total++;
try {
  const mockSessionId = "smoke-usage-test";
  const mockCache = {
    five_hour: { utilization: 45, resets_at: "2099-01-01T00:00:00Z" },
    seven_day: { utilization: 30, resets_at: "2099-01-01T00:00:00Z" },
  };
  writeFileSync(
    join(tmpdir(), `claude_usage_cache_${mockSessionId}.json`),
    JSON.stringify(mockCache),
    { mode: 0o600 }
  );
  const usageInput = JSON.stringify({
    model: { display_name: "Test" },
    cost: { total_cost_usd: 0.1 },
    context_window: { used_percentage: 20 },
    workspace: { current_dir: "/tmp" },
    session_id: mockSessionId,
  });
  const output = execFileSync("node", [join(__dirname, "statusline.js")], {
    input: usageInput,
    encoding: "utf-8",
  });
  const lines = output.trim().split("\n");
  if (lines.length !== 2) throw new Error(`Expected 2 lines, got ${lines.length}`);
  const l2 = stripAnsi(lines[1]);
  if (!l2.includes("sess:")) throw new Error(`Expected sess: in line 2: ${l2}`);
  if (!l2.includes("week:")) throw new Error(`Expected week: in line 2: ${l2}`);
  if (!l2.includes("45%")) throw new Error(`Expected 45% in line 2: ${l2}`);
  if (!l2.includes("30%")) throw new Error(`Expected 30% in line 2: ${l2}`);
  console.log("  PASS: Usage bars (sess+week)");
  passed++;
} catch (e) {
  console.error(`  FAIL: Usage bars (sess+week) — ${e.message}`);
  failures.push("Usage bars (sess+week)");
}

// CLI help test
total++;
try {
  execFileSync("node", [join(__dirname, "..", "bin", "cli.js"), "help"], { stdio: "pipe" });
  console.log("  PASS: CLI help");
  passed++;
} catch {
  console.error("  FAIL: CLI help");
  failures.push("CLI help");
}

// console.log check in statusline.js
total++;
try {
  const src = readFileSync(join(__dirname, "statusline.js"), "utf-8");
  if (src.includes("console.log")) {
    console.error("  FAIL: console.log found in statusline.js — use process.stdout.write()");
    failures.push("No console.log in statusline.js");
  } else {
    console.log("  PASS: No console.log in statusline.js");
    passed++;
  }
} catch (e) {
  console.error(`  FAIL: Could not read statusline.js — ${e.message}`);
  failures.push("No console.log in statusline.js");
}

console.log(`\n${passed}/${total} tests passed.`);
if (failures.length > 0) {
  console.error(`\nFailed tests:\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
