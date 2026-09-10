import { describe, expect, it } from "vitest";
import { createLogger, getMetricsRegistry, initTelemetry, redactSensitiveData } from "./index";

describe("packages/observability", () => {
  it("should redact sensitive fields like password, token, and brazilian CPF/CNH", () => {
    const payload = {
      user: "john_doe",
      password: "my_secret_password",
      token: "bearer_xyz",
      cpf: "123.456.789-00",
      cnh: "12345678901",
      other: "normal text with 123.456.789-00 inside",
    };

    const redacted = redactSensitiveData(payload) as Record<string, unknown>;
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.token).toBe("[REDACTED]");
    expect(redacted.cpf).toBe("[REDACTED]");
    expect(redacted.other).toContain("[REDACTED_CPF]");
  });

  it("should create logger with service identifier", () => {
    const logger = createLogger("api");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("should register metrics and produce Prometheus output", async () => {
    const metrics = getMetricsRegistry();
    metrics.httpRequestsTotal.inc({ method: "GET", route: "/health", status: "200" });
    metrics.databaseHealth.set(1);
    metrics.redisHealth.set(1);

    const output = await metrics.getMetrics();
    expect(output).toContain("http_requests_total");
    expect(output).toContain("database_health");
    expect(output).toContain("redis_health");
  });

  it("should initialize telemetry configuration", () => {
    const tel = initTelemetry();
    expect(tel.serviceName).toBeDefined();
  });
});
