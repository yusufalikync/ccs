import { copyFileSync, chmodSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { CLAUDE_DIR, SCRIPT_SOURCE, SCRIPT_DEST } from "./paths.js";
import { checkDeps } from "./check-deps.js";
import { addStatusLine } from "./settings.js";

export function install() {
  // Dependency check
  console.log("Checking dependencies...");
  const missing = checkDeps();
  if (missing.length > 0) {
    console.error(`Error: Missing required: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("  All dependencies found.");

  // Clean up old bash script if present
  const oldScript = join(CLAUDE_DIR, "statusline.sh");
  if (existsSync(oldScript)) {
    unlinkSync(oldScript);
    console.log(`  Removed old script: ${oldScript}`);
  }

  // Copy script
  console.log("Installing statusline script...");
  mkdirSync(CLAUDE_DIR, { recursive: true });
  copyFileSync(SCRIPT_SOURCE, SCRIPT_DEST);
  if (process.platform !== "win32") {
    chmodSync(SCRIPT_DEST, 0o755);
  }
  console.log(`  Copied: ${SCRIPT_DEST}`);

  // Update settings
  console.log("Updating settings.json...");
  addStatusLine();

  console.log("\nDone! Restart Claude Code to see usage stats in the status line.");
}
