import { describe, expect, it } from "vitest";
import { initWorker, shutdownWorker } from "./index";

describe("apps/worker", () => {
  it("should initialize worker lifecycle and report status", async () => {
    const res = await initWorker();
    expect(res).toBeDefined();
    expect(res.env.APP_VERSION).toBe("0.1.0");
    expect(res.dbHealth).toHaveProperty("status");
    expect(res.redisHealth).toHaveProperty("status");
  });

  it("should handle graceful shutdown cleanly", async () => {
    let error: unknown = null;
    try {
      await shutdownWorker("TEST_SIGINT");
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
  });
});
