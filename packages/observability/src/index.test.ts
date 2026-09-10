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
      nested: {
        authorization: "Bearer secret-token-value",
        cookie: "session=abcdef123456",
        "set-cookie": "session=abcdef123456; Secure; HttpOnly",
        database_url: "postgresql://user:secret123@postgres:5432/autuax",
        redis_url: "redis://:supersecret@redis:6379/0",
      },
      array: [
        { secret: "hidden" },
        "connection string inside array: postgresql://admin:p@ssw0rd@localhost:5432/db",
        "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----",
      ],
    };

    const redacted = redactSensitiveData(payload) as Record<string, unknown>;
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.token).toBe("[REDACTED]");
    expect(redacted.cpf).toBe("[REDACTED]");
    expect(redacted.other).toContain("[REDACTED_CPF]");

    const nested = redacted.nested as Record<string, unknown>;
    expect(nested.authorization).toBe("[REDACTED]");
    expect(nested.cookie).toBe("[REDACTED]");
    expect(nested["set-cookie"]).toBe("[REDACTED]");
    expect(nested.database_url).toBe("[REDACTED]");
    expect(nested.redis_url).toBe("[REDACTED]");

    const array = redacted.array as unknown[];
    expect((array[0] as Record<string, unknown>).secret).toBe("[REDACTED]");
    expect(array[1]).toBe(
      "connection string inside array: postgresql://admin:[REDACTED]@localhost:5432/db",
    );
    expect(array[2]).toBe("[REDACTED_PRIVATE_KEY]");
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
