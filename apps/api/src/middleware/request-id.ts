import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

export const requestIdMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const existingReqId = c.req.header("x-request-id");
  const requestId =
    existingReqId && existingReqId.trim().length > 0 ? existingReqId : `req_${crypto.randomUUID()}`;

  const existingCorrId = c.req.header("x-correlation-id");
  const correlationId =
    existingCorrId && existingCorrId.trim().length > 0 ? existingCorrId : requestId;

  c.set("requestId", requestId);
  c.set("correlationId", correlationId);

  c.res.headers.set("x-request-id", requestId);
  c.res.headers.set("x-correlation-id", correlationId);

  await next();
};
