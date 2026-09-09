// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import { coordinatePreviewStart, previewStartKey } from "../preview-start-coordinator";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe("preview start concurrency and idempotency", () => {
  it("coalesces concurrent starts for the same workspace and project", async () => {
    const gate = deferred<{ id: string }>();
    const start = vi.fn(() => gate.promise);
    const key = previewStartKey("workspace-a", "project-a");

    const first = coordinatePreviewStart(key, start);
    const duplicate = coordinatePreviewStart(key, start);

    expect(start).toHaveBeenCalledTimes(1);
    expect(duplicate).toBe(first);

    gate.resolve({ id: "sandbox-a" });
    await expect(Promise.all([first, duplicate])).resolves.toEqual([
      { id: "sandbox-a" },
      { id: "sandbox-a" },
    ]);
  });

  it("does not coalesce different tenants or projects", async () => {
    const start = vi.fn(async (id: string) => ({ id }));

    const results = await Promise.all([
      coordinatePreviewStart(previewStartKey("workspace-a", "project-a"), () => start("one")),
      coordinatePreviewStart(previewStartKey("workspace-b", "project-a"), () => start("two")),
      coordinatePreviewStart(previewStartKey("workspace-a", "project-b"), () => start("three")),
    ]);

    expect(start).toHaveBeenCalledTimes(3);
    expect(results.map(({ id }) => id)).toEqual(["one", "two", "three"]);
  });

  it("releases the key after success so a later explicit start can revalidate state", async () => {
    const start = vi.fn(async () => ({ id: `sandbox-${start.mock.calls.length}` }));
    const key = previewStartKey("workspace-a", "project-a");

    const first = await coordinatePreviewStart(key, start);
    const second = await coordinatePreviewStart(key, start);

    expect(start).toHaveBeenCalledTimes(2);
    expect(first).not.toEqual(second);
  });

  it("releases the key after failure and permits an automatic retry", async () => {
    const key = previewStartKey("workspace-a", "project-a");
    await expect(coordinatePreviewStart(key, async () => {
      throw new Error("RUNTIME_UNAVAILABLE");
    })).rejects.toThrow("RUNTIME_UNAVAILABLE");

    await expect(coordinatePreviewStart(key, async () => ({ id: "retry" }))).resolves.toEqual({ id: "retry" });
  });
});
