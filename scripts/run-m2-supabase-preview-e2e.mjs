import { execFileSync, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const phase = process.argv[2];
const serverEnvironment = execFileSync(
  "docker",
  ["inspect", "saasweave-server", "--format", "{{range .Config.Env}}{{println .}}{{end}}"],
  { cwd: root, encoding: "utf8" }
);
const readEnv = (name) => {
  const line = serverEnvironment.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  if (!line) throw new Error(`M2_E2E_SERVER_ENV_MISSING:${name}`);
  return line.slice(name.length + 1);
};
const supabase = JSON.parse(
  execFileSync("cmd.exe", ["/d", "/s", "/c", "npx supabase status -o json"], {
    cwd: resolve(root, "work/supabase-integration"),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  })
);

const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: readEnv("DATABASE_URL").replace("@postgres:5432/", "@127.0.0.1:15433/"),
  BETTER_AUTH_SECRET: readEnv("BETTER_AUTH_SECRET"),
  REDIS_URL: "redis://127.0.0.1:6381",
  VITE_WEB_URL: "http://localhost:13000",
  VITE_SERVER_URL: "http://localhost:5000/server",
  E2E_BASE_URL: "http://localhost:13000",
  E2E_SERVER_URL: "http://localhost:5000/server",
  E2E_SKIP_WEB_SERVER: "1",
  M2_SUPABASE_URL_A: supabase.API_URL,
  M2_SUPABASE_URL_B: supabase.API_URL.replace("127.0.0.1", "localhost"),
  M2_SUPABASE_ANON_KEY: supabase.ANON_KEY
};
if (phase) env.M2_SUPABASE_E2E_PHASE = phase;

const logPath = process.env.M2_E2E_LOG_PATH;
const child = spawn(
  "cmd.exe",
  ["/d", "/s", "/c", "pnpm --filter @saasweave/web exec playwright test __e2e__/playwright/supabase-preview-ab.spec.ts --workers=1"],
  { cwd: root, env, stdio: logPath ? "pipe" : "inherit", windowsHide: true }
);
if (logPath) {
  const log = createWriteStream(logPath, { flags: "a" });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
}
child.on("exit", (code, signal) => process.exitCode = code ?? (signal ? 1 : 0));
