import { unlinkSync, existsSync } from "fs";
import { SCRIPT_DEST } from "./paths.js";
import { removeStatusLine } from "./settings.js";

export function uninstall() {
  // Remove script
  console.log("Removing statusline script...");
  if (existsSync(SCRIPT_DEST)) {
    unlinkSync(SCRIPT_DEST);
    console.log(`  Deleted: ${SCRIPT_DEST}`);
  } else {
    console.log("  Script not found — skipping.");
  }

  // Update settings
  console.log("Updating settings.json...");
  removeStatusLine();

  console.log("\nDone! Status line has been removed.");
}
