import { beforeEach, describe, expect, it } from "vitest";
import { envSchema, getEnv, resetEnvCache } from "./index";

describe("packages/config", () => {
  beforeEach(() => {
    resetEnvCache();
  });

  it("should validate and provide default values", () => {
    const env = getEnv({});
    expect(env.NODE_ENV).toBe("development");
    expect(env.WEB_PORT).toBe(3000);
    expect(env.API_PORT).toBe(4000);
    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.REDIS_URL).toContain("redis://");
  });

  it("should parse custom valid environment variables", () => {
    const env = getEnv({
      NODE_ENV: "production",
      WEB_PORT: "8080",
      API_PORT: "8081",
      DATABASE_URL: "postgresql://custom:password@db.example.com:5432/custom_db",
      REDIS_URL: "redis://cache.example.com:6379",
      LOG_LEVEL: "warn",
      APP_VERSION: "1.0.0",
    });

    expect(env.NODE_ENV).toBe("production");
    expect(env.WEB_PORT).toBe(8080);
    expect(env.API_PORT).toBe(8081);
    expect(env.LOG_LEVEL).toBe("warn");
    expect(env.APP_VERSION).toBe("1.0.0");
  });

  it("should fail when database URL is not a valid URL", () => {
    expect(() =>
      envSchema.parse({
        DATABASE_URL: "not-a-valid-url",
      }),
    ).toThrow();
  });
});
