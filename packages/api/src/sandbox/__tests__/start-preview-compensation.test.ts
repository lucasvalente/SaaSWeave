// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  stage: "install",
  removed: [] as string[],
  deleted: 0,
  stopped: [] as string[]
}));

vi.mock("drizzle-orm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("drizzle-orm")>()),
  and: (...values: unknown[]) => values,
  eq: (...values: unknown[]) => values,
  sql: (value: unknown) => value
}));
vi.mock("node:fs/promises", () => ({
  mkdtemp: vi.fn().mockResolvedValue("/tmp/preview-parent"),
  rm: vi.fn(async (path: string) => { state.removed.push(path); })
}));
vi.mock("node:os", () => ({ tmpdir: () => "/tmp" }));
vi.mock("node:crypto", () => ({ randomUUID: () => "sandbox-compensation" }));
vi.mock("../snapshot-materializer", () => ({
  materializeBuilderSnapshot: vi.fn(async () => {
    if (state.stage === "materialize") throw new Error("MATERIALIZE_FAILED");
    return { files: 1, bytes: 1 };
  })
}));
vi.mock("../health-supervisor", () => ({ probeSandboxHealth: vi.fn(async () => ({ healthy: state.stage !== "health", elapsedMs: 1 })) }));
vi.mock("../preview-start-coordinator", () => ({
  coordinatePreviewStart: (_key: string, start: () => unknown) => start(),
  previewStartKey: (workspaceId: string, projectId: string) => `${workspaceId}:${projectId}`
}));
vi.mock("@saasweave/db", () => {
  const snapshot = { builder_snapshot: { id: "snapshot-1", source: "committed", manifest: { "index.html": "ok" } } };
  const whereSnapshot = { limit: async () => [snapshot] };
  const selectSnapshot = { innerJoin: () => ({ where: () => whereSnapshot }) };
  const active = { limit: async () => [] };
  const tx = {
    execute: async () => undefined,
    select: () => ({ from: () => ({ where: () => active }) }),
    insert: () => ({ values: () => ({ returning: async () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => state.stage === "persist" ? [] : [{ id: "sandbox-compensation" }] }) }) })
  };
  return {
    project: { id: "id", workspaceId: "workspaceId" },
    sandboxSession: { id: "id", projectId: "projectId", workspaceId: "workspaceId", status: "status" },
    db: {
      select: () => ({ from: () => selectSnapshot }),
      transaction: async (callback: (value: typeof tx) => unknown) => callback(tx),
      delete: () => ({ where: async () => { state.deleted++; } })
    }
  };
});

import { startPreview } from "../start-preview";

function runtime() {
  return {
    create: vi.fn(async () => {
      if (state.stage === "create") throw new Error("CREATE_FAILED");
      return { id: "runtime-compensation", status: "running" as const };
    }),
    stop: vi.fn(async (id: string) => { state.stopped.push(id); }),
    inspectPublishedPort: vi.fn(async () => ({ hostIp: "127.0.0.1", hostPort: 49152, containerPort: 4173 })),
    exec: vi.fn(async (_id: string, command: string) => ({ exitCode: state.stage === command ? 1 : 0, stdout: "", stderr: "failed", timedOut: false, startedAt: "", finishedAt: "", durationMs: 0, truncated: false })),
    startProcess: vi.fn(async () => ({ alive: () => state.stage !== "dev", stdout: () => "", stderr: () => "failed", exitCode: () => 1, stop: () => undefined })),
    diagnose: vi.fn(async () => ({ listener4173: false }))
  };
}

describe("start preview failure compensation", () => {
  beforeEach(() => {
    state.stage = "install";
    state.removed = [];
    state.deleted = 0;
    state.stopped = [];
  });

  it.each(["materialize", "create", "install", "build", "dev", "health", "persist"])("removes temporary state and database state when %s fails", async (stage) => {
    state.stage = stage;
    const adapter = runtime();

    await expect(startPreview({ workspaceId: "workspace-1", projectId: "project-1", snapshotId: "snapshot-1", actorId: "actor-1" }, adapter as never)).rejects.toThrow();

    expect(state.removed).toEqual(["/tmp/preview-parent"]);
    expect(state.deleted).toBe(1);
    if (stage === "materialize" || stage === "create") expect(state.stopped).toEqual([]);
    else expect(state.stopped).toEqual(["runtime-compensation"]);
  });
});
