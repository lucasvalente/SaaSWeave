import { getEnv } from "@autuax/config";
import { closePostgresClient, closeRedisClient } from "@autuax/database";
import { createLogger } from "@autuax/observability";
import { createApp } from "./app";

const logger = createLogger("api:server");
const env = getEnv();
const app = createApp();

const port = env.API_PORT;

logger.info("server_starting", {
  meta: {
    port,
    environment: env.NODE_ENV,
    version: env.APP_VERSION,
  },
});

const server =
  typeof Bun !== "undefined"
    ? Bun.serve({
        fetch: app.fetch,
        port,
      })
    : null;

if (server) {
  logger.info("server_listening", {
    meta: {
      url: `http://localhost:${port}`,
    },
  });
}

// Graceful shutdown handling
let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("shutdown_initiated", { meta: { signal } });

  try {
    if (server) {
      server.stop();
    }
    await Promise.allSettled([closePostgresClient(), closeRedisClient()]);
    logger.info("shutdown_completed");
    process.exit(0);
  } catch (err) {
    logger.error("shutdown_error", { error: err });
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
