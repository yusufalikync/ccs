import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { SETTINGS_PATH, CLAUDE_DIR, STATUSLINE_COMMAND } from "./paths.js";

function backup(filePath) {
  if (!existsSync(filePath)) return;
  const timestamp = Date.now();
  const backupPath = `${filePath}.ccs-backup.${timestamp}`;
  writeFileSync(backupPath, readFileSync(filePath));
  console.log(`  Backup: ${backupPath}`);
}

function readSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
}

export function hasStatusLine() {
  const settings = readSettings();
  const cmd = settings?.statusLine?.command;
  return typeof cmd === "string" && cmd.includes("statusline.sh");
}

export function addStatusLine() {
  if (hasStatusLine()) {
    console.log("  settings.json already has statusLine — skipping.");
    return;
  }
  backup(SETTINGS_PATH);
  const settings = readSettings();
  settings.statusLine = {
    type: "command",
    command: STATUSLINE_COMMAND,
    padding: 2,
  };
  writeSettings(settings);
  console.log(`  Updated: ${SETTINGS_PATH}`);
}

export function removeStatusLine() {
  if (!hasStatusLine()) {
    console.log("  settings.json does not have statusLine — skipping.");
    return;
  }
  backup(SETTINGS_PATH);
  const settings = readSettings();
  delete settings.statusLine;
  writeSettings(settings);
  console.log(`  Removed statusLine from: ${SETTINGS_PATH}`);
}
