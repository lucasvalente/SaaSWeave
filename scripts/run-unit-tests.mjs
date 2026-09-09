import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const env = { ...process.env };

env.NODE_ENV ||= "development";
env.DATABASE_URL ||= "postgresql://postgres:changeme@localhost:5432/saasweave_test";
env.BETTER_AUTH_SECRET ||= "unit-test-placeholder-secret-000000000000";

if (env.SKIP_REDIS_UNIT_TESTS === "1") {
  env.REDIS_URL = "";
  env.SKIP_REDIS_UNIT_TESTS = "1";
} else if (env.REDIS_URL) {
  const redisUrl = new URL(env.REDIS_URL);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(redisUrl.hostname))
    throw new Error("Unit tests require local Redis");
  redisUrl.pathname = "/15";
  env.REDIS_URL = redisUrl.toString();
}

if (!env.QUEUE_PREFIX || env.QUEUE_PREFIX === "saasweave") {
  env.QUEUE_PREFIX = `vitest-${process.pid}-${randomBytes(6).toString("hex")}`;
}

const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) throw new Error("pnpm must invoke this script so npm_execpath is available");

const result = spawnSync(process.execPath, [pnpmEntry, "exec", "vp", "run", "-r", "test:unit"], {
  env,
  stdio: "inherit"
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
