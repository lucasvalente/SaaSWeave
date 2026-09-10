import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WEB_PORT: z.coerce.number().default(3000),
  API_PORT: z.coerce.number().default(4000),
  WORKER_PORT: z.coerce.number().default(5000),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://autuax:autuax_dev_password@localhost:5432/autuax_dev"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  APP_VERSION: z.string().default("0.1.0"),
  OTEL_SERVICE_NAME: z.string().default("autuax-platform"),
  CORS_ORIGIN: z.string().default("https://app.zapdisparo.com"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(overrideEnv?: Record<string, string | undefined>): Env {
  if (overrideEnv) {
    return envSchema.parse(overrideEnv);
  }
  if (!_env) {
    const rawEnv = typeof process !== "undefined" && process.env ? process.env : {};
    _env = envSchema.parse(rawEnv);
  }
  return _env;
}

export function resetEnvCache(): void {
  _env = null;
}
