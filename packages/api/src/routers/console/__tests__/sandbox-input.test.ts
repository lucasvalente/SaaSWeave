// @ts-nocheck
import { describe, expect, it } from "vitest";
import { createSandboxPreviewInput } from "../sandbox";

describe("sandbox preview create input", () => {
  it("requires a committed snapshot identifier so callers cannot bypass the canonical preview lifecycle", () => {
    expect(createSandboxPreviewInput.safeParse({ projectId: "project-1" }).success).toBe(false);
    expect(createSandboxPreviewInput.parse({ projectId: "project-1", snapshotId: "snapshot-1" })).toEqual({
      projectId: "project-1",
      snapshotId: "snapshot-1",
    });
  });
});
