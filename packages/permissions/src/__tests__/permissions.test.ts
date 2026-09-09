import { describe, expect, it } from "vite-plus/test";

import { can, isPrivilegedPlatformRole, resolveEffectivePermissions } from "@saasweave/permissions";

describe("platform permissions", () => {
  it("unites grants across roles without implicit wildcard access", () => {
    expect(can(["support"], "users.write")).toBe(false);
    expect(can(["support", "engineering"], "feature_flags.write")).toBe(true);
    expect(resolveEffectivePermissions(["readonly"]).has("users.roles.manage")).toBe(false);
  });
  it("marks only sensitive operator roles as privileged", () => {
    expect(isPrivilegedPlatformRole("security")).toBe(true);
    expect(isPrivilegedPlatformRole("support")).toBe(false);
  });
});
