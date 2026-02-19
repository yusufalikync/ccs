#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync, writeFileSync, statSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join, basename } from "path";

// --- ANSI color codes ---
const COLORS = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  purple: "\x1b[38;2;101;68;237m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};

function colorForPct(pct) {
  if (pct >= 90) return COLORS.red;
  if (pct >= 70) return COLORS.yellow;
  return COLORS.green;
}

// --- Progress bar ---
function progressBar(pct, width = 20, color = "") {
  pct = Math.max(0, Math.min(100, Math.floor(pct)));
  const filled = Math.round((pct * width) / 100);
  const empty = width - filled;
  const bar = "\u2593".repeat(filled) + "\u2591".repeat(empty);
  return color ? `${color}${bar}${COLORS.reset}` : bar;
}

// --- Time remaining ---
function timeRemaining(resetIso) {
  if (!resetIso || resetIso === "null") return "?";
  const diff = Math.floor((new Date(resetIso).getTime() - Date.now()) / 1000);
  if (diff <= 0) return "0m";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return `${hours}h${mins}m`;
  return `${mins}m`;
}

// --- OAuth token ---
// Priority: env var > credentials file > macOS Keychain
function getOAuthToken() {
  // 1. Environment variable (highest priority, same as Claude Code)
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return process.env.CLAUDE_CODE_OAUTH_TOKEN;
  }

  // 2. Credentials file (Linux/Windows primary, macOS sometimes)
  try {
    const credsPath = join(
      process.env.HOME || process.env.USERPROFILE || "",
      ".claude",
      ".credentials.json"
    );
    if (existsSync(credsPath)) {
      const creds = JSON.parse(readFileSync(credsPath, "utf-8"));
      const token =
        creds.claudeAiOauth?.accessToken ?? creds.accessToken ?? null;
      if (token) return token;
    }
  } catch {
    // fall through
  }

  // 3. macOS Keychain (macOS deletes the credentials file after login)
  if (process.platform === "darwin") {
    try {
      const credsJson = execSync(
        'security find-generic-password -s "Claude Code-credentials" -w',
        { stdio: ["pipe", "pipe", "pipe"] }
      ).toString();
      const creds = JSON.parse(credsJson);
      return creds.claudeAiOauth?.accessToken ?? creds.accessToken ?? null;
    } catch {
      // no keychain entry
    }
  }

  return null;
}

// --- Usage fetch + cache ---
const CACHE_MAX_AGE = 60;

async function fetchUsage(sessionId) {
  const cachePath = join(tmpdir(), `claude_usage_cache_${sessionId}.json`);

  if (existsSync(cachePath)) {
    const age = (Date.now() - statSync(cachePath).mtimeMs) / 1000;
    if (age < CACHE_MAX_AGE) {
      try {
        return JSON.parse(readFileSync(cachePath, "utf-8"));
      } catch {
        // corrupted cache, re-fetch
      }
    }
  }

  const token = getOAuthToken();
  if (!token) return null;

  try {
    const resp = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    const data = await resp.json();
    if (!data.five_hour) return null;
    writeFileSync(cachePath, JSON.stringify(data), { mode: 0o600 });
    return data;
  } catch {
    return null;
  }
}

// --- Git info ---
function getGitInfo(cwd) {
  if (!cwd) return null;
  try {
    let branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 3000,
    })
      .toString()
      .trim();
    if (branch === "HEAD") {
      branch = execSync("git rev-parse --short HEAD", {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 3000,
      })
        .toString()
        .trim();
    }
    const dirty = execSync("git status --porcelain --untracked-files=no", {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 3000,
    })
      .toString()
      .trim().length > 0;
    return { branch, dirty };
  } catch {
    return null;
  }
}

// --- Read stdin ---
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
let input;
try {
  input = JSON.parse(Buffer.concat(chunks).toString());
} catch {
  input = {};
}

// --- Parse input ---
const model = input.model?.display_name ?? "?";
const cost = input.cost?.total_cost_usd ?? 0;
const usedPct = Math.floor(input.context_window?.used_percentage ?? 0);
const dir = input.workspace?.current_dir ?? "";
const sessionId = input.session_id ?? "default";
const folder = dir ? basename(dir) : "";

// --- Line 1 ---
const sessionCost = cost.toFixed(4);
const folderStr = folder ? ` \u{1F4C1} ${folder}` : "";
const gitInfo = getGitInfo(dir);
let gitStr = "";
if (gitInfo) {
  const { branch, dirty } = gitInfo;
  const dirtyMark = dirty ? `${COLORS.purple}\u2739${COLORS.reset}` : "";
  gitStr = ` | ${dirtyMark}${COLORS.green}${branch}${COLORS.reset}`;
}
const line1 = `${COLORS.cyan}[${model}]${COLORS.reset}${folderStr}${gitStr} | ${COLORS.yellow}$${sessionCost}${COLORS.reset}`;

// --- Line 2 ---
const ctxColor = colorForPct(usedPct);
const ctxBar = progressBar(usedPct, 20, ctxColor);
let line2 = `${ctxBar} ctx ${usedPct}%`;

const usage = await fetchUsage(sessionId);
if (usage) {
  const sessUtil = Math.floor(usage.five_hour?.utilization ?? 0);
  const weekUtil = Math.floor(usage.seven_day?.utilization ?? 0);
  const sessBar = progressBar(sessUtil, 10, colorForPct(sessUtil));
  const weekBar = progressBar(weekUtil, 20, colorForPct(weekUtil));
  const sessTime = timeRemaining(usage.five_hour?.resets_at);
  const weekTime = timeRemaining(usage.seven_day?.resets_at);
  line2 += ` | sess: ${sessBar} ${sessUtil}% ${COLORS.dim}${sessTime}${COLORS.reset}`;
  line2 += ` | week: ${weekBar} ${weekUtil}% ${COLORS.dim}${weekTime}${COLORS.reset}`;
}

process.stdout.write(`${line1}\n${line2}\n`);
