import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

import { type auth } from "@saasweave/auth/index";

export type AuthState = {
  impersonatedBy: string | null;
  user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["user"] | null;
};

/**
 * This server function is meant to be called via authQueryOptions() in queries.ts,
 * which is used in the _auth layout route to protect all child routes under it (e.g. _auth/app/*)
 *
 * For securing server functions or API routes,
 * consider using authMiddleware from middleware.ts instead.
 */
export const $getAuthState = createServerFn({ method: "GET" }).handler(async () => _getAuthState());

export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
  const state = await _getAuthState();
  return state.user;
});

type GetUserServerQuery = {
  disableCookieCache?: boolean | undefined;
  disableRefresh?: boolean | undefined;
};

/**
 * Server-only util, meant to be used by the $getUser server function and auth middleware so logic can be shared with optional query params.
 *
 * For server app logic, consider using authMiddleware instead.
 */
export const _getAuthState = createServerOnlyFn(
  async (query?: GetUserServerQuery): Promise<AuthState> => {
    if (process.env.IS_BUILD === "true") return { impersonatedBy: null, user: null };
    const request = getRequest();
    const apiBaseUrl = process.env.INTERNAL_SERVER_URL ?? process.env.VITE_SERVER_URL;
    if (!apiBaseUrl) return { impersonatedBy: null, user: null };
    const endpoint = new URL("auth/get-session", `${apiBaseUrl.replace(/\/$/, "")}/`);
    if (query?.disableCookieCache) endpoint.searchParams.set("disableCookieCache", "true");
    if (query?.disableRefresh) endpoint.searchParams.set("disableRefresh", "true");

    // The browser talks to the API auth origin directly. In a split web/API
    // deployment, verify that same session at its canonical origin rather than
    // reinterpreting it in the SSR process.
    const response = await fetch(endpoint, {
      headers: request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie")! }
        : undefined
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) setResponseHeader("Set-Cookie", cookies);

    if (!response.ok) return { impersonatedBy: null, user: null };

    const session = (await response.json()) as {
      session?: { impersonatedBy?: string | null };
      user?: AuthState["user"];
    } | null;

    return {
      impersonatedBy: session?.session?.impersonatedBy ?? null,
      user: session?.user ?? null
    };
  }
);

/** @deprecated Use {@link _getAuthState} when impersonation state is needed. */
export const _getUser = createServerOnlyFn(async (query?: GetUserServerQuery) => {
  const state = await _getAuthState(query);
  return state.user;
});
