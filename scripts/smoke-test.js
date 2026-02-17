#!/usr/bin/env node
import { execFileSync } from "child_process";
import { readFileSync } from "fs";

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
