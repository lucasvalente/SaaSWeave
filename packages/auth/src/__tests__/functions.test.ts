import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
const fetchSession = vi.fn();
const getRequest = vi.fn();
const setResponseHeader = vi.fn();
vi.mock("@tanstack/react-start/server", () => {
  return {
    getRequest: () => getRequest(),
    setResponseHeader: (...args: unknown[]) => setResponseHeader(...args)
  };
});
import { _getAuthState, _getUser } from "#@/react/tanstack-start/functions";

describe("tanstack auth server functions", () => {
  beforeEach(() => {
    fetchSession.mockReset();
    setResponseHeader.mockReset();
    vi.stubGlobal("fetch", fetchSession);
    vi.stubEnv("IS_BUILD", "false");
    vi.stubEnv("INTERNAL_SERVER_URL", "http://api.internal/server");
    getRequest.mockReturnValue({
      headers: new Headers({ cookie: "session=test", authorization: "must-not-forward" })
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("returns API auth state and forwards refreshed cookies", async () => {
    fetchSession.mockResolvedValue(
      Response.json(
        { session: { impersonatedBy: "admin-1" }, user: { id: "user-1", name: "Ada" } },
        { headers: { "Set-Cookie": "session=refreshed; Path=/" } }
      )
    );
    await expect(_getAuthState()).resolves.toEqual({
      impersonatedBy: "admin-1",
      user: { id: "user-1", name: "Ada" }
    });
    expect(fetchSession).toHaveBeenCalledWith(
      new URL("http://api.internal/server/auth/get-session"),
      { headers: { cookie: "session=test" } }
    );
    expect(setResponseHeader).toHaveBeenCalledWith("Set-Cookie", ["session=refreshed; Path=/"]);
  });
  it("returns null for an absent or rejected session", async () => {
    fetchSession.mockResolvedValue(Response.json(null));
    await expect(_getAuthState()).resolves.toEqual({ impersonatedBy: null, user: null });
    fetchSession.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(_getAuthState()).resolves.toEqual({ impersonatedBy: null, user: null });
    expect(setResponseHeader).not.toHaveBeenCalled();
  });
  it("passes cache-bypass query parameters to the API", async () => {
    fetchSession.mockResolvedValue(Response.json({ session: {}, user: { id: "user-1" } }));
    await _getAuthState({ disableCookieCache: true, disableRefresh: true });
    expect(fetchSession).toHaveBeenCalledWith(
      new URL(
        "http://api.internal/server/auth/get-session?disableCookieCache=true&disableRefresh=true"
      ),
      { headers: { cookie: "session=test" } }
    );
  });
  it("returns only the user and skips network during static builds", async () => {
    fetchSession.mockResolvedValue(
      Response.json({ session: {}, user: { id: "user-2", email: "ada@example.com" } })
    );
    await expect(_getUser()).resolves.toEqual({ id: "user-2", email: "ada@example.com" });
    fetchSession.mockClear();
    vi.stubEnv("IS_BUILD", "true");
    await expect(_getUser()).resolves.toBeNull();
    expect(fetchSession).not.toHaveBeenCalled();
  });
});
