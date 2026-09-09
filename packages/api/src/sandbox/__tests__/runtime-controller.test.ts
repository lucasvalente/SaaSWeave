// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import { HttpRuntimeControllerClient } from "../runtime-controller";

describe("runtime controller managed inventory", () => {
  it("accepts only normalized controller-managed runtime entries", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: "abc123", status: "running" },
      { id: "not a runtime id", status: "running" },
      { id: "def456", status: "unexpected" },
      { id: "789abc", status: "stopped", secrets: "must not matter" }
    ]), { status: 200 }));
    const client = new HttpRuntimeControllerClient("http://controller", fetcher);

    await expect(client.listManaged()).resolves.toEqual([
      { id: "abc123", status: "running" },
      { id: "789abc", status: "stopped" }
    ]);
    expect(fetcher).toHaveBeenCalledWith("http://controller/v1/runtimes");
  });

  it("fails closed when inventory payload is not an array", async () => {
    const client = new HttpRuntimeControllerClient("http://controller", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    await expect(client.listManaged()).rejects.toThrow("RUNTIME_CONTROLLER_UNAVAILABLE");
  });
});
