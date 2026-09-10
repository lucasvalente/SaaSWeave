import { describe, expect, it } from "vitest";
import { REDIS_NAMESPACES, formatRedisKey, foundationBootstrap } from "./index";

describe("packages/database", () => {
  it("should have foundation bootstrap schema table defined", () => {
    expect(foundationBootstrap).toBeDefined();
    expect(foundationBootstrap.phase.name).toBe("phase");
    expect(foundationBootstrap.status.name).toBe("status");
  });

  it("should format Redis keys with correct namespaces", () => {
    expect(formatRedisKey("session", "usr-123")).toBe("session:usr-123");
    expect(formatRedisKey("cache", "ait-999")).toBe("cache:ait-999");
    expect(formatRedisKey("lock", "proc-456")).toBe("lock:proc-456");
    expect(formatRedisKey("queue", "notifications")).toBe("queue:notifications");
    expect(formatRedisKey("rateLimit", "ip-1.1.1.1")).toBe("rate-limit:ip-1.1.1.1");
  });

  it("should contain all required Redis namespaces", () => {
    expect(REDIS_NAMESPACES).toHaveProperty("session");
    expect(REDIS_NAMESPACES).toHaveProperty("cache");
    expect(REDIS_NAMESPACES).toHaveProperty("lock");
    expect(REDIS_NAMESPACES).toHaveProperty("queue");
    expect(REDIS_NAMESPACES).toHaveProperty("rateLimit");
  });
});
