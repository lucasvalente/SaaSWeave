// @ts-nocheck
import { mkdtemp, readFile, readdir, realpath, symlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { materializeBuilderSnapshot } from "../snapshot-materializer";

async function fixture() {
  const parent = await realpath(await mkdtemp(join(tmpdir(), "sandbox-snapshot-")));
  return { parent, root: join(parent, "workspace") };
}
const snapshot = (manifest: Record<string, unknown>) => ({ id: "snap-1", source: "builder", manifest });

describe("sandbox snapshot materialization", () => {
  it("writes exact UTF-8 bytes and nested files from a persisted manifest", async () => {
    const { root } = await fixture();
    expect(await materializeBuilderSnapshot(snapshot({ "src/index.ts": { content: "olá" }, "empty": "" }), root)).toEqual({ files: 2, bytes: 4 });
    expect(await readFile(join(root, "src/index.ts"), "utf8")).toBe("olá");
  });
  it.each(["../escape", "/escape", "C:/escape", "a\\b", "a//b", "a/./b", "x:stream", "NUL.txt", "a. ", "a\0b"])("rejects unsafe path %s before writing", async (path) => {
    const { parent, root } = await fixture();
    await expect(materializeBuilderSnapshot(snapshot({ "valid": "ok", [path]: "bad" }), root)).rejects.toThrow("INVALID_SNAPSHOT_PATH");
    expect(await readdir(parent)).toEqual([]);
  });
  it.each(["draft", "pending", "failed"])("rejects uncommitted status %s", async (status) => {
    const { root } = await fixture();
    await expect(materializeBuilderSnapshot({ ...snapshot({}), status }, root)).rejects.toThrow("SNAPSHOT_NOT_COMMITTED");
  });
  it.each([
    { "a": "x", "a/b": "y" },
    { "A": "x", "a": "y" },
    { "bad": { content: "x", encoding: "base64" } },
    { "bad": { content: null } },
    { "large": "x".repeat(2 * 1024 * 1024 + 1) },
    Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [String(i), ""])),
    Object.fromEntries(Array.from({ length: 17 }, (_, i) => [String(i), "x".repeat(2 * 1024 * 1024)])),
  ])("rejects invalid manifests without partial writes", async (manifest) => {
    const { parent, root } = await fixture();
    await expect(materializeBuilderSnapshot(snapshot(manifest), root)).rejects.toThrow();
    expect(await readdir(parent)).toEqual([]);
  });
  it("does not reuse an existing directory or follow a root junction", async () => {
    const { parent, root } = await fixture();
    const outside = join(parent, "outside");
    await mkdir(outside);
    await symlink(outside, root, "junction");
    await expect(materializeBuilderSnapshot(snapshot({ "escape": "bad" }), root)).rejects.toThrow();
    expect(await readdir(outside)).toEqual([]);
  });
  it("allows only one concurrent materialization into a destination", async () => {
    const { root } = await fixture();
    const results = await Promise.allSettled(["first", "second"].map(content => materializeBuilderSnapshot(snapshot({ "file": content }), root)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(["first", "second"]).toContain(await readFile(join(root, "file"), "utf8"));
  });
});
