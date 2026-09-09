import { describe, expect, it } from "vite-plus/test";

import { isAllowedSupabasePublicUrl } from "#@/routers/console/project-supabase";

describe("Supabase public URL policy", () => {
  it("keeps production restricted to HTTPS", () => {
    expect(isAllowedSupabasePublicUrl("https://project.supabase.co", "production")).toBe(true);
    expect(isAllowedSupabasePublicUrl("http://127.0.0.1:54321", "production", false)).toBe(false);
  });

  it("permits only loopback HTTP for explicit local test execution", () => {
    expect(isAllowedSupabasePublicUrl("http://127.0.0.1:54321", "test", false)).toBe(true);
    expect(isAllowedSupabasePublicUrl("http://localhost:54321", "development")).toBe(true);
    expect(isAllowedSupabasePublicUrl("http://example.test", "test")).toBe(false);
  });

  it("allows loopback only under the explicit E2E override", () => {
    expect(isAllowedSupabasePublicUrl("http://127.0.0.1:54321", "production", true)).toBe(true);
  });
});
