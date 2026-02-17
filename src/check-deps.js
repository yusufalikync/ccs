export function checkDeps() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 18) {
    return ["node>=18 (fetch API required)"];
  }
  return [];
}
