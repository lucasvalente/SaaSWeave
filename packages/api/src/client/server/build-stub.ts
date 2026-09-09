import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { type RouterClient } from "@orpc/server";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { type AppRouter } from "#@/routers/index";

/** Production SSR forwards the request to the canonical API without importing DB/auth secrets. */
const link = new RPCLink({
  url: () => {
    const origin = process.env.INTERNAL_SERVER_URL ?? process.env.VITE_SERVER_URL;
    if (!origin) throw new Error("API URL is required for server rendering");
    return `${origin.replace(/\/$/, "")}/rpc`;
  },
  headers: () => {
    const cookie = getRequestHeaders().get("cookie");
    return cookie ? { cookie } : {};
  },
  fetch: (request, options) => {
    if (process.env.IS_BUILD === "true") {
      throw new Error("API requests are unavailable during static prerendering");
    }
    return fetch(request, options);
  }
});
export const client: RouterClient<AppRouter> = createORPCClient(link);
