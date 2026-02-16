import { execFileSync } from "child_process";

const REQUIRED = ["jq", "curl", "bc", "security"];

export function checkDeps() {
  const missing = [];
  for (const cmd of REQUIRED) {
    try {
      execFileSync("which", [cmd], { stdio: "pipe" });
    } catch {
      missing.push(cmd);
    }
  }
  return missing;
}
