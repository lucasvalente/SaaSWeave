import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiClientError,
  TypedApiClient,
  createSuccessResponseSchema,
  errorResponseSchema,
  livenessResponseSchema,
  readinessResponseSchema,
  versionResponseSchema,
} from "./index";

describe("packages/contracts", () => {
  it("should validate standard error response format", () => {
    const errorPayload = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Campo obrigatório",
        requestId: "req-12345",
      },
    };
    const parsed = errorResponseSchema.safeParse(errorPayload);
    expect(parsed.success).toBe(true);
  });

  it("should reject invalid error code", () => {
    const invalidError = {
      error: {
        code: "INVALID_CODE_XYZ",
        message: "Erro desconhecido",
        requestId: "req-123",
      },
    };
    const parsed = errorResponseSchema.safeParse(invalidError);
    expect(parsed.success).toBe(false);
  });

  it("should validate standard success response format", () => {
    const schema = createSuccessResponseSchema(z.object({ name: z.string() }));
    const payload = {
      data: { name: "AUTUAX" },
      meta: { timestamp: "2026-09-10T12:00:00Z" },
    };
    const parsed = schema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("should validate liveness, readiness, and version responses", () => {
    const live = livenessResponseSchema.safeParse({
      data: { status: "ok", uptimeSeconds: 120, timestamp: new Date().toISOString() },
      meta: {},
    });
    expect(live.success).toBe(true);

    const ready = readinessResponseSchema.safeParse({
      data: {
        status: "ready",
        dependencies: {
          postgres: { status: "up", latencyMs: 2 },
          redis: { status: "up", latencyMs: 1 },
        },
        timestamp: new Date().toISOString(),
      },
      meta: {},
    });
    expect(ready.success).toBe(true);

    const version = versionResponseSchema.safeParse({
      data: { version: "0.1.0", environment: "development" },
      meta: {},
    });
    expect(version.success).toBe(true);
  });

  it("TypedApiClient handles successful and failed responses", async () => {
    const mockFetch = (async (url: string) => {
      if (url.endsWith("/health/live")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            data: { status: "ok", uptimeSeconds: 42, timestamp: "2026-09-10" },
            meta: {},
          }),
        };
      }
      return {
        ok: false,
        status: 503,
        headers: new Headers({ "x-request-id": "req-999" }),
        json: async () => ({
          error: {
            code: "DEPENDENCY_UNAVAILABLE",
            message: "Database down",
            requestId: "req-999",
          },
        }),
      };
    }) as unknown as typeof fetch;

    const client = new TypedApiClient({
      baseUrl: "http://localhost:4000",
      fetchFn: mockFetch,
    });

    const live = await client.getLiveness();
    expect(live.data.status).toBe("ok");

    await expect(client.getReadiness()).rejects.toThrow(ApiClientError);
  });
});
