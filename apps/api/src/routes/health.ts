import type { LivenessData, ReadinessData, SuccessResponse } from "@autuax/contracts";
import { checkDatabaseHealth, checkRedisHealth } from "@autuax/database";
import { Hono } from "hono";

const healthRoute = new Hono();
const startTime = Date.now();

healthRoute.get("/", (c) => {
  return c.json<SuccessResponse<{ status: string }>>({
    data: { status: "ok" },
    meta: {},
  });
});

healthRoute.get("/live", (c) => {
  const data: LivenessData = {
    status: "ok",
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  };
  return c.json<SuccessResponse<LivenessData>>({
    data,
    meta: {},
  });
});

healthRoute.get("/ready", async (c) => {
  const [dbResult, redisResult] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const isReady = dbResult.status === "up" && redisResult.status === "up";
  const isInternal =
    c.req.query("internal") === "true" && c.req.header("x-internal-probe") === "true";

  const data: ReadinessData = {
    status: isReady ? "ready" : "unhealthy",
    ...(isInternal
      ? {
          dependencies: {
            postgres: dbResult,
            redis: redisResult,
          },
        }
      : {}),
    timestamp: new Date().toISOString(),
  };

  const statusHttp = isReady ? 200 : 503;
  return c.json<SuccessResponse<ReadinessData>>(
    {
      data,
      meta: {},
    },
    statusHttp,
  );
});

export { healthRoute };
