import { copyFileSync, chmodSync, mkdirSync } from "fs";
import { CLAUDE_DIR, SCRIPT_SOURCE, SCRIPT_DEST } from "./paths.js";
import { checkDeps } from "./check-deps.js";
import { addStatusLine } from "./settings.js";

export function install() {
  // Platform guard
  if (process.platform !== "darwin") {
    console.error("Error: Only macOS is supported (requires Keychain & BSD date).");
    process.exit(1);
  }

  // Dependency check
  console.log("Checking dependencies...");
  const missing = checkDeps();
  if (missing.length > 0) {
    console.error(`Error: Missing required commands: ${missing.join(", ")}`);
    if (missing.includes("jq")) {
      console.error('  Install jq: brew install jq');
    }
    process.exit(1);
  }
  console.log("  All dependencies found.");

  // Copy script
  console.log("Installing statusline script...");
  mkdirSync(CLAUDE_DIR, { recursive: true });
  copyFileSync(SCRIPT_SOURCE, SCRIPT_DEST);
  chmodSync(SCRIPT_DEST, 0o755);
  console.log(`  Copied: ${SCRIPT_DEST}`);

  // Update settings
  console.log("Updating settings.json...");
  addStatusLine();

  console.log("\nDone! Restart Claude Code to see usage stats in the status line.");
}
