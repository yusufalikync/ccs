import { existsSync } from "fs";
import { SCRIPT_DEST } from "./paths.js";
import { hasStatusLine } from "./settings.js";

export function status() {
  const scriptExists = existsSync(SCRIPT_DEST);
  const settingsOk = hasStatusLine();

  if (scriptExists && settingsOk) {
    console.log("Status: ACTIVE");
    console.log(`  Script: ${SCRIPT_DEST}`);
    console.log("  settings.json: statusLine configured");
  } else if (scriptExists && !settingsOk) {
    console.log("Status: PARTIAL");
    console.log(`  Script: ${SCRIPT_DEST} (exists)`);
    console.log("  settings.json: statusLine NOT configured");
    console.log('  Run "ccus install" to fix.');
  } else if (!scriptExists && settingsOk) {
    console.log("Status: PARTIAL");
    console.log("  Script: NOT found");
    console.log("  settings.json: statusLine configured (but script missing)");
    console.log('  Run "ccus install" to fix.');
  } else {
    console.log("Status: NOT INSTALLED");
    console.log('  Run "ccus install" to set up.');
  }
}
