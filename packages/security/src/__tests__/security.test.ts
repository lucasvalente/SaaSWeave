import { describe, expect, it } from "vite-plus/test";

import { assertTenantScope, sanitizeSecurityMetadata } from "@saasweave/security";
describe("security primitives", () => {
  it("redacts sensitive event metadata", () =>
    expect(sanitizeSecurityMetadata({ apiKey: "x", safe: "ok" })).toEqual({
      apiKey: "[redacted]",
      safe: "ok"
    }));
  it("preserves safe primitive metadata values", () =>
    expect(sanitizeSecurityMetadata({ text: "ok", count: 2, enabled: false, empty: null })).toEqual(
      {
        text: "ok",
        count: 2,
        enabled: false,
        empty: null
      }
    ));
  it("does not reveal a cross-tenant resource", () =>
    expect(() => assertTenantScope("org-a", "org-b")).toThrow("TENANT_SCOPE_VIOLATION"));
});
