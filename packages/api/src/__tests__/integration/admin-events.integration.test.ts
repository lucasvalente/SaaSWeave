import { describe, expect } from "vite-plus/test";

import { recordAudit, recordSecurityEvent } from "@saasweave/db";

import {
  createCallerFor,
  expectOrpcError,
  integrationIt,
  seedOrgWithOwner,
  seedPlatformAdmin
} from "./harness";

describe.sequential("Admin event filters", () => {
  integrationIt(
    "filters audit and security in SQL with validated date ranges and pagination",
    async () => {
      const a = await seedOrgWithOwner();
      const b = await seedOrgWithOwner();
      await seedPlatformAdmin(a.userId);
      const caller = await createCallerFor({ seed: a, userRole: "admin" });
      await recordAudit({
        actorId: a.userId,
        organizationId: a.organizationId,
        action: "test.action",
        targetType: "workspace"
      });
      await recordAudit({
        actorId: b.userId,
        organizationId: b.organizationId,
        action: "other.action",
        targetType: "user"
      });
      const rows = await caller.admin.security.audit({
        actor: a.userId,
        action: "test.action",
        workspace: a.organizationId,
        resource: "workspace",
        from: "2020-01-01T00:00:00.000Z",
        to: "2099-01-01T00:00:00.000Z"
      });
      expect(rows).toHaveLength(1);
      expect((await caller.admin.security.audit({ limit: 1, offset: 1 }))[0]?.id).not.toBe(
        (await caller.admin.security.audit({ limit: 1 }))[0]?.id
      );
      await recordSecurityEvent({
        type: "authentication.failure",
        severity: "critical",
        actorUserId: a.userId,
        metadata: { password: "sensitive-test-value" }
      });
      await recordSecurityEvent({
        type: "permission.denied",
        severity: "warning",
        actorUserId: b.userId
      });
      const events = await caller.admin.security.events({
        actor: a.userId,
        type: "authentication.failure",
        severity: "critical",
        from: "2020-01-01T00:00:00.000Z"
      });
      expect(events).toHaveLength(1);
      expect(JSON.stringify(events)).not.toContain("sensitive-test-value");
      await expectOrpcError(() => caller.admin.security.events({ limit: 101 }), "BAD_REQUEST");
      await expectOrpcError(() => caller.admin.security.audit({ offset: -1 }), "BAD_REQUEST");
      await expectOrpcError(
        () =>
          caller.admin.security.audit({
            from: "2099-01-01T00:00:00.000Z",
            to: "2020-01-01T00:00:00.000Z"
          }),
        "BAD_REQUEST"
      );
    }
  );
});
