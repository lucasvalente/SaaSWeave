import { getEnv } from "@autuax/config";
import type { SuccessResponse, VersionData } from "@autuax/contracts";
import { Hono } from "hono";

const versionRoute = new Hono();

versionRoute.get("/", (c) => {
  const env = getEnv();
  const data: VersionData = {
    version: env.APP_VERSION,
    environment: env.NODE_ENV,
  };

  return c.json<SuccessResponse<VersionData>>({
    data,
    meta: {},
  });
});

export { versionRoute };
