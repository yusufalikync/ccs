import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CLAUDE_DIR = join(homedir(), ".claude");
export const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");
export const SCRIPT_DEST = join(CLAUDE_DIR, "statusline.js");
export const SCRIPT_SOURCE = join(__dirname, "..", "scripts", "statusline.js");
export const STATUSLINE_COMMAND = "node ~/.claude/statusline.js";
