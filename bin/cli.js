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
    if (command && command !== "help" && command !== "--help" && command !== "-h") {
      console.error(`Error: unknown command '${command}'`);
      process.exit(1);
    }
    console.log(`ccs-stats — Usage stats in Claude Code's status line

Usage:
  ccs install      Install the statusline script & configure settings.json
  ccs uninstall    Remove the script & clean up settings.json
  ccs status       Check if the statusline is active`);
}
