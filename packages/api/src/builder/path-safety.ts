import path from "node:path";
export function normalizeProjectPath(input: string): string {
  if (!input || input.includes("\0") || path.isAbsolute(input) || /^[a-zA-Z]:[\\/]/.test(input)) throw new Error("Invalid project path");
  const normalized = path.posix.normalize(input.replaceAll("\\", "/"));
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) throw new Error("Path escapes project root");
  return normalized.replace(/^\.\//, "");
}
