// @ts-nocheck
import { describe, expect, it } from "vitest";
import { previewIsolationHeaders, proxyPreviewRequest } from "../preview-gateway";

it("uses the configured web origin as the preview frame ancestor", () => {
  expect(previewIsolationHeaders("https://app.example.test")["Content-Security-Policy"]).toContain(
    "frame-ancestors 'self' https://app.example.test"
  );
});
describe("preview proxy", () => {
  it("strips cookies, credentials and routing metadata and adds isolation headers", async () => {
    const response = await proxyPreviewRequest("http://sandbox.local", new Request("http://preview.local", { headers: { cookie: "control=secret", authorization: "Bearer control-secret", host: "attacker.invalid", "x-forwarded-for": "10.0.0.1", "x-test": "ok" } }), 100, async (_url, init) => { expect(init.headers.get("cookie")).toBeNull(); expect(init.headers.get("authorization")).toBeNull(); expect(init.headers.get("host")).toBeNull(); expect(init.headers.get("x-forwarded-for")).toBeNull(); expect(init.headers.get("x-test")).toBe("ok"); return new Response("generated", { headers: { "set-cookie": "x=y", "x-upstream": "ok" } }); });
    expect(response.status).toBe(200); expect(response.headers.get("content-security-policy")).toContain("frame-ancestors"); expect(await response.text()).toBe("generated");
  });
});
