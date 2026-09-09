import { afterEach, describe, expect, it, vi } from "vite-plus/test";
const state = vi.hoisted(() => {
  return {
    options: undefined as
      | { url: () => string; headers: () => Record<string, string>; fetch: typeof fetch }
      | undefined
  };
});
vi.mock("@orpc/client", () => {
  return { createORPCClient: vi.fn() };
});
vi.mock("@orpc/client/fetch", () => {
  return {
    RPCLink: class {
      constructor(options: NonNullable<typeof state.options>) {
        state.options = options;
      }
    }
  };
});
vi.mock("@tanstack/react-start/server", () => {
  return {
    getRequestHeaders: () =>
      new Headers({
        cookie: "session=fixture",
        authorization: "never-forward",
        "x-forwarded-for": "spoofed"
      })
  };
});
import "#@/client/server/build-stub";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("production SSR API transport", () => {
  it("uses the internal API and only forwards session cookies", () => {
    vi.stubEnv("INTERNAL_SERVER_URL", "http://server:5000/server");
    expect(state.options?.url()).toBe("http://server:5000/server/rpc");
    expect(state.options?.headers()).toEqual({ cookie: "session=fixture" });
  });
  it("blocks build-time network and allows runtime requests", async () => {
    const request = new Request("http://server:5000/server/rpc");
    const fetchSpy = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("IS_BUILD", "true");
    expect(() => state.options?.fetch(request)).toThrow("static prerendering");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.stubEnv("IS_BUILD", "false");
    await state.options?.fetch(request);
    expect(fetchSpy).toHaveBeenCalledWith(request, undefined);
  });
});
