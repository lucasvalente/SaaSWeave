import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("apps/api integration", () => {
  const app = createApp();

  it("GET /health should return 200 with standard response", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ status: "ok" });
    expect(res.headers.get("x-request-id")).toBeDefined();
  });

  it("GET /health/live should return 200 with uptime", async () => {
    const res = await app.request("/health/live");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("ok");
    expect(typeof body.data.uptimeSeconds).toBe("number");
  });

  it("GET /health/ready returns status and dependency checks", async () => {
    const res = await app.request("/health/ready");
    // Depending on whether local postgres is running, status is either 200 (ready) or 503 (unhealthy)
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body.data).toHaveProperty("status");
    expect(body.data.dependencies).toHaveProperty("postgres");
    expect(body.data.dependencies).toHaveProperty("redis");
  });

  it("GET /version returns application version info", async () => {
    const res = await app.request("/version");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.version).toBe("0.1.0");
    expect(body.data.environment).toBeDefined();
  });

  it("GET /openapi.json returns valid OpenAPI 3.1 specification", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.openapi).toBe("3.1.0");
    expect(body.info.title).toBe("AUTUAX API");
    expect(body.paths).toHaveProperty("/health");
  });

  it("Propagates existing x-request-id and x-correlation-id", async () => {
    const customReqId = "custom-req-777";
    const customCorrId = "custom-corr-888";
    const res = await app.request("/health", {
      headers: {
        "x-request-id": customReqId,
        "x-correlation-id": customCorrId,
      },
    });
    expect(res.headers.get("x-request-id")).toBe(customReqId);
    expect(res.headers.get("x-correlation-id")).toBe(customCorrId);
  });

  it("Returns 404 with standard error format for non-existent route", async () => {
    const res = await app.request("/route-does-not-exist");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.requestId).toBeDefined();
  });
});
