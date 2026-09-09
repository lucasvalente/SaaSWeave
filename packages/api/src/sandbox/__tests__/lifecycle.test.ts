// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>
}));

vi.mock("drizzle-orm", () => ({
  and: (...values: unknown[]) => values,
  eq: (...values: unknown[]) => values,
  isNotNull: (value: unknown) => value,
  lt: (...values: unknown[]) => values,
  or: (...values: unknown[]) => values
}));

vi.mock("@saasweave/db", () => ({
  sandboxSession: {
    id: "id", expiresAt: "expiresAt", status: "status"
  },
  db: {
    select: () => ({ from: () => ({ where: async () => state.rows }) }),
    update: () => ({
      set: (value: Record<string, unknown>) => ({
        where: async () => { state.updates.push(value); }
      })
    })
  }
}));

import { cleanupExpiredSandboxes, reconcileSandboxSessions } from "../lifecycle";

describe("sandbox lifecycle cleanup and reconciliation", () => {
  beforeEach(() => {
    state.rows = [];
    state.updates = [];
  });

  it("stops expired runtimes and revokes stale preview readiness", async () => {
    const now = new Date("2026-09-08T12:00:00.000Z");
    state.rows = [{ id: "session-1", runtimeId: "runtime-1" }];
    const stop = vi.fn().mockRejectedValue(new Error("runtime already absent"));

    await expect(cleanupExpiredSandboxes({ stop } as never, now)).resolves.toBe(1);

    expect(stop).toHaveBeenCalledWith("runtime-1");
    expect(state.updates).toEqual([expect.objectContaining({
      status: "stopped",
      previewHostIp: null,
      previewHostPort: null,
      previewReadyAt: null,
      updatedAt: now,
      lastActivityAt: now
    })]);
  });

  it("reconciles a stopped remote runtime and clears its published endpoint", async () => {
    state.rows = [{ id: "session-2", runtimeId: "runtime-2", status: "running" }];
    const runtime = {
      stop: vi.fn(),
      inspect: vi.fn().mockResolvedValue({ id: "runtime-2", status: "stopped" })
    };

    await expect(reconcileSandboxSessions(runtime)).resolves.toBe(1);

    expect(state.updates).toEqual([expect.objectContaining({
      status: "stopped",
      previewHostIp: null,
      previewHostPort: null,
      previewReadyAt: null
    })]);
  });

  it("marks a missing runtime failed and revokes stale preview readiness", async () => {
    state.rows = [{ id: "session-3", runtimeId: "runtime-3", status: "running" }];
    const runtime = {
      stop: vi.fn(),
      inspect: vi.fn().mockRejectedValue(new Error("not found"))
    };

    await expect(reconcileSandboxSessions(runtime)).resolves.toBe(1);

    expect(state.updates).toEqual([expect.objectContaining({
      status: "failed",
      previewHostIp: null,
      previewHostPort: null,
      previewReadyAt: null
    })]);
  });

  it("fails a running row with no runtime id, including stale endpoint state", async () => {
    state.rows = [{ id: "session-lost-id", runtimeId: null, status: "running", previewHostIp: "127.0.0.1", previewHostPort: 49152, previewReadyAt: new Date() }];
    const inspect = vi.fn();

    await expect(reconcileSandboxSessions({ inspect } as never)).resolves.toBe(1);

    expect(inspect).not.toHaveBeenCalled();
    expect(state.updates).toEqual([expect.objectContaining({
      status: "failed", previewHostIp: null, previewHostPort: null, previewReadyAt: null
    })]);
  });

  it("revokes readiness and a stale mapping when a running runtime loses its published port", async () => {
    state.rows = [{ id: "session-port-lost", runtimeId: "runtime-port-lost", status: "running", previewContainerPort: 4173, previewHostIp: "127.0.0.1", previewHostPort: 49152, previewReadyAt: new Date() }];
    const runtime = {
      inspect: vi.fn().mockResolvedValue({ id: "runtime-port-lost", status: "running" }),
      inspectPublishedPort: vi.fn().mockResolvedValue(null)
    };

    await expect(reconcileSandboxSessions(runtime)).resolves.toBe(1);

    expect(runtime.inspectPublishedPort).toHaveBeenCalledWith("runtime-port-lost", 4173);
    expect(state.updates).toEqual([expect.objectContaining({
      previewHostIp: null, previewHostPort: null, previewReadyAt: null
    })]);
  });

  it("treats a controller interruption as a lost runtime and never retains Ready", async () => {
    state.rows = [{ id: "session-controller-down", runtimeId: "runtime-controller-down", status: "running", previewReadyAt: new Date() }];
    const runtime = { inspect: vi.fn().mockRejectedValue(new Error("RUNTIME_CONTROLLER_UNAVAILABLE")) };

    await expect(reconcileSandboxSessions(runtime)).resolves.toBe(1);

    expect(state.updates).toEqual([expect.objectContaining({
      status: "failed", previewHostIp: null, previewHostPort: null, previewReadyAt: null
    })]);
  });

  it("removes controller-managed runtimes which have no live persisted session", async () => {
    state.rows = [
      { id: "session-stopped", runtimeId: "runtime-already-stopped", status: "stopped" },
      { id: "session-running", runtimeId: "runtime-live", status: "running" }
    ];
    const runtime = {
      inspect: vi.fn().mockResolvedValue({ id: "runtime-live", status: "running" }),
      listManaged: vi.fn().mockResolvedValue([
        { id: "runtime-live", status: "running" },
        { id: "runtime-already-stopped", status: "running" },
        { id: "runtime-orphan", status: "running" }
      ]),
      stop: vi.fn().mockResolvedValue(undefined)
    };

    await expect(reconcileSandboxSessions(runtime)).resolves.toBe(2);

    expect(runtime.stop).toHaveBeenCalledTimes(2);
    expect(runtime.stop).toHaveBeenCalledWith("runtime-already-stopped");
    expect(runtime.stop).toHaveBeenCalledWith("runtime-orphan");
  });

  it("does not make a controller inventory failure destructive", async () => {
    state.rows = [{ id: "session-live", runtimeId: "runtime-live", status: "running" }];
    const runtime = {
      inspect: vi.fn().mockResolvedValue({ id: "runtime-live", status: "running" }),
      listManaged: vi.fn().mockRejectedValue(new Error("RUNTIME_CONTROLLER_UNAVAILABLE")),
      stop: vi.fn()
    };

    await expect(reconcileSandboxSessions(runtime)).resolves.toBe(0);
    expect(runtime.stop).not.toHaveBeenCalled();
  });

  it("does not mutate a healthy running session", async () => {
    state.rows = [{ id: "session-4", runtimeId: "runtime-4", status: "running" }];
    const runtime = {
      stop: vi.fn(),
      inspect: vi.fn().mockResolvedValue({ id: "runtime-4", status: "running" })
    };

    await expect(reconcileSandboxSessions(runtime)).resolves.toBe(0);
    expect(state.updates).toEqual([]);
  });
});
