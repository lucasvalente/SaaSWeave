import { mkdir, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

export type SnapshotFile = { path: string; content: string; encoding?: "utf8" };
export type BuilderSnapshot = { id: string; status?: string; source?: string; manifest: Record<string, unknown> };

const MAX_FILES = 2_000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;

function safeRelativePath(value: string): string {
  const parts = value.split("/");
  if (isAbsolute(value) || parts.some((part) =>
    !part || part === "." || part === ".." || /[<>:"\\|?*\u0000-\u001f]/u.test(part) ||
    /[. ]$/u.test(part) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/iu.test(part)
  )) throw new Error("INVALID_SNAPSHOT_PATH");
  return parts.join("/");
}

/**
 * Writes a persisted snapshot into a new private directory before runtime startup.
 * The caller must load the snapshot with tenant authorization and own the parent
 * directory exclusively; customer processes must not run during materialization.
 * Existing destinations (including symlinks) are never reused. On I/O failure,
 * the caller must discard the incomplete directory and must not start a runtime.
 */
export async function materializeBuilderSnapshot(snapshot: BuilderSnapshot, workspaceRoot: string): Promise<{ files: number; bytes: number }> {
  if (!snapshot.id?.trim() || (snapshot.status !== undefined && snapshot.status !== "committed") || snapshot.source === "draft") {
    throw new Error("SNAPSHOT_NOT_COMMITTED");
  }
  if (!snapshot.manifest || typeof snapshot.manifest !== "object" || Array.isArray(snapshot.manifest)) {
    throw new Error("INVALID_SNAPSHOT_MANIFEST");
  }
  const entries = Object.entries(snapshot.manifest);
  if (entries.length > MAX_FILES) throw new Error("SNAPSHOT_FILE_LIMIT_EXCEEDED");
  const files: SnapshotFile[] = [];
  const paths = new Set<string>();
  let total = 0;
  for (const [name, value] of entries) {
    const path = safeRelativePath(name);
    const entry = value && typeof value === "object" ? value as Record<string, unknown> : { content: value };
    if (typeof entry.content !== "string" || (entry.encoding !== undefined && entry.encoding !== "utf8")) throw new Error("INVALID_SNAPSHOT_FILE");
    const bytes = Buffer.byteLength(entry.content, "utf8");
    if (bytes > MAX_FILE_BYTES) throw new Error("SNAPSHOT_FILE_LIMIT_EXCEEDED");
    total += bytes;
    if (total > MAX_TOTAL_BYTES) throw new Error("SNAPSHOT_SIZE_LIMIT_EXCEEDED");
    const key = path.toLowerCase();
    if (paths.has(key)) throw new Error("SNAPSHOT_PATH_CONFLICT");
    paths.add(key);
    files.push({ path, content: entry.content });
  }
  for (const path of paths) {
    const parts = path.split("/");
    parts.pop();
    while (parts.length) {
      if (paths.has(parts.join("/"))) throw new Error("SNAPSHOT_PATH_CONFLICT");
      parts.pop();
    }
  }
  const root = resolve(workspaceRoot);
  // A canonical, service-owned parent prevents traversing pre-existing links.
  if (resolve(await realpath(dirname(root))) !== dirname(root)) throw new Error("INVALID_SNAPSHOT_ROOT");
  await mkdir(root, { mode: 0o700 });
  for (const file of files) {
    const destination = resolve(root, file.path);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await writeFile(destination, file.content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  }
  return { files: files.length, bytes: total };
}
