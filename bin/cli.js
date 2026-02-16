#!/usr/bin/env node

const command = process.argv[2];

switch (command) {
  case "install": {
    const { install } = await import("../src/install.js");
    install();
    break;
  }
  case "uninstall": {
    const { uninstall } = await import("../src/uninstall.js");
    uninstall();
    break;
  }
  case "status": {
    const { status } = await import("../src/status.js");
    status();
    break;
  }
  default:
    console.log(`claude-code-usage-statusline — Usage stats in Claude Code's status line

Usage:
  ccus install      Install the statusline script & configure settings.json
  ccus uninstall    Remove the script & clean up settings.json
  ccus status       Check if the statusline is active`);
    if (command && command !== "help" && command !== "--help" && command !== "-h") {
      process.exit(1);
    }
}
