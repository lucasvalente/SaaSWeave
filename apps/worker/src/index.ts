import { getEnv } from "@autuax/config";
import {
  checkDatabaseHealth,
  checkRedisHealth,
  closePostgresClient,
  closeRedisClient,
} from "@autuax/database";
import { createLogger, getMetricsRegistry } from "@autuax/observability";

const logger = createLogger("worker:daemon");
const metrics = getMetricsRegistry();

export async function initWorker() {
  const env = getEnv();
  logger.info("worker_starting", {
    meta: {
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
    },
  });

  const [dbHealth, redisHealth] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  if (dbHealth.status === "up") {
    metrics.databaseHealth.set(1);
    logger.info("worker_database_connected");
  } else {
    metrics.databaseHealth.set(0);
    logger.warn("worker_database_offline", { meta: { error: dbHealth.error } });
  }

  if (redisHealth.status === "up") {
    metrics.redisHealth.set(1);
    logger.info("worker_redis_connected");
  } else {
    metrics.redisHealth.set(0);
    logger.warn("worker_redis_offline", { meta: { error: redisHealth.error } });
  }

  metrics.workerHealth.set(1);
  logger.info("worker_operational", {
    meta: {
      status: "listening_for_future_queues",
    },
  });

  return {
    env,
    dbHealth,
    redisHealth,
  };
}

let isShuttingDown = false;
export async function shutdownWorker(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("worker_shutdown_initiated", { meta: { signal } });
  metrics.workerHealth.set(0);

  try {
    await Promise.allSettled([closePostgresClient(), closeRedisClient()]);
    logger.info("worker_shutdown_completed");
  } catch (err) {
    logger.error("worker_shutdown_error", { error: err });
  }
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  initWorker().catch((err) => {
    logger.error("worker_init_failed", { error: err });
  });

  process.on("SIGTERM", () => {
    shutdownWorker("SIGTERM").then(() => process.exit(0));
  });
  process.on("SIGINT", () => {
    shutdownWorker("SIGINT").then(() => process.exit(0));
  });
}
