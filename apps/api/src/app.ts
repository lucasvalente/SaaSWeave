import { getEnv } from "@autuax/config";
import { createLogger, getMetricsRegistry } from "@autuax/observability";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { errorHandler } from "./middleware/error-handler";
import { requestIdMiddleware } from "./middleware/request-id";
import { healthRoute } from "./routes/health";
import { openapiRoute } from "./routes/openapi";
import { versionRoute } from "./routes/version";
import type { AppEnv } from "./types";

const logger = createLogger("api:http");
const metrics = getMetricsRegistry();

export function createApp() {
  const app = new Hono<AppEnv>();
  const env = getEnv();

  const allowedOrigins =
    env.NODE_ENV === "production"
      ? [env.CORS_ORIGIN]
      : [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:4000",
          "http://127.0.0.1:4000",
          env.CORS_ORIGIN,
        ];

  // Security baseline
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return allowedOrigins[0];
        if (allowedOrigins.includes(origin)) return origin;
        return null;
      },
      allowHeaders: ["Content-Type", "Authorization", "x-request-id", "x-correlation-id"],
      exposeHeaders: ["x-request-id", "x-correlation-id"],
      credentials: true,
    }),
  );

  // Request ID & Correlation ID propagation
  app.use("*", requestIdMiddleware);

  // Observability: Metrics & Structured Logging
  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const durationMs = Date.now() - start;
    const route = c.req.path;
    const method = c.req.method;
    const status = String(c.res.status);

    metrics.httpRequestsTotal.inc({ method, route, status });
    metrics.httpRequestDuration.observe({ method, route, status }, durationMs / 1000);

    if (c.res.status >= 400) {
      metrics.httpErrorsTotal.inc({ method, route, error_code: status });
    }

    logger.info("http.request", {
      requestId: c.get("requestId"),
      correlationId: c.get("correlationId"),
      durationMs,
      meta: {
        method,
        path: route,
        status: c.res.status,
      },
    });
  });

  // Central error handler
  app.onError(errorHandler);

  // Routes
  app.route("/health", healthRoute);
  app.route("/version", versionRoute);
  app.route("/", openapiRoute);

  // Metrics endpoint - restricted to internal scrapers in production
  app.get("/metrics", async (c) => {
    const isInternal =
      env.NODE_ENV !== "production" ||
      c.req.header("x-internal-probe") === "true" ||
      c.req.header("x-prometheus-scrape") === "true";

    if (!isInternal) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Metrics endpoint restricted to internal telemetry",
          },
        },
        403,
      );
    }

    const data = await metrics.getMetrics();
    return c.text(data, 200, {
      "Content-Type": metrics.getContentType(),
    });
  });

  // 404 handler
  app.notFound((c) => {
    const requestId = (c.get("requestId") as string) || "unknown";
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: `Route not found: ${c.req.method} ${c.req.path}`,
          requestId,
        },
      },
      404,
    );
  });

  return app;
}
