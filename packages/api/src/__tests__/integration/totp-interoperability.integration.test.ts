import { createRouterClient } from "@orpc/server";
import { describe, expect } from "vite-plus/test";

import { auth } from "@saasweave/auth/index";
import { connectRedis, getRedis } from "@saasweave/cache";
import { createLogger } from "@saasweave/logger/server";

import { createMfaAdminFixture } from "#@/__tests__/fixtures/totp";
import { integrationIt, seedOrgWithOwner } from "#@/__tests__/integration/harness";
import { hasFreshAdminStepUp } from "#@/lib/admin-step-up";
import { appRouter } from "#@/routers/index";

function createMfaCaller(fixture: Awaited<ReturnType<typeof createMfaAdminFixture>>) {
  return createRouterClient(appRouter, {
    context: () => {
      return {
        clientIp: "127.0.0.1",
        headers: fixture.headers,
        logger: createLogger({ operation: "api__totp_interoperability_test" }),
        session: fixture.authSession
      };
    }
  });
}

describe("TOTP interoperability", () => {
  integrationIt("accepts a current otplib code through Better Auth verification", async () => {
    const fixture = await createMfaAdminFixture();
    const response = await auth.api.verifyTOTP({
      asResponse: true,
      body: { code: await fixture.currentCode(), trustDevice: false },
      headers: fixture.headers
    });

    expect(response.ok).toBe(true);
  });

  integrationIt("rejects an invalid code through Better Auth verification", async () => {
    const fixture = await createMfaAdminFixture();
    const response = await auth.api.verifyTOTP({
      asResponse: true,
      body: { code: "000000", trustDevice: false },
      headers: fixture.headers
    });

    expect(response.ok).toBe(false);
  });

  integrationIt(
    "uses a Better Auth-verified code to authorize one protected role change",
    async () => {
      const fixture = await createMfaAdminFixture();
      const target = await seedOrgWithOwner();
      const caller = createMfaCaller(fixture);

      await caller.admin.auth.stepUp({ code: await fixture.currentCode() });

      expect(await hasFreshAdminStepUp(fixture.session.id, fixture.user.id)).toBe(true);
      await expect(
        caller.admin.users.setRoles({ id: target.userId, roles: ["platform_admin"] })
      ).resolves.toEqual({ ok: true });

      const redis = await connectRedis(getRedis());
      await redis?.del(`admin:step-up:${fixture.session.id}`);
    }
  );

  integrationIt("does not create a step-up proof for an invalid code", async () => {
    const fixture = await createMfaAdminFixture();
    const caller = createMfaCaller(fixture);
    const currentCode = await fixture.currentCode();
    const invalidCode = currentCode === "000000" ? "999999" : "000000";

    await expect(caller.admin.auth.stepUp({ code: invalidCode })).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
    expect(await hasFreshAdminStepUp(fixture.session.id, fixture.user.id)).toBe(false);

    const redis = await connectRedis(getRedis());
    await redis?.del(`admin:step-up:${fixture.session.id}`);
  });

  integrationIt(
    "expires only the step-up proof while the administrative session remains valid",
    async () => {
      const fixture = await createMfaAdminFixture();
      const target = await seedOrgWithOwner();
      const caller = createMfaCaller(fixture);
      await caller.admin.auth.stepUp({ code: await fixture.currentCode() });

      const redis = await connectRedis(getRedis());
      await redis?.del(`admin:step-up:${fixture.session.id}`);

      await expect(caller.admin.users.list({ limit: 1 })).resolves.toMatchObject({
        data: expect.any(Array)
      });
      await expect(
        caller.admin.users.setRoles({ id: target.userId, roles: ["platform_admin"] })
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "STEP_UP_REQUIRED" });
    }
  );

  integrationIt(
    "binds fresh step-up proof to the internal session ID, not just the user",
    async () => {
      const fixture = await createMfaAdminFixture();
      const sessionB = await fixture.createAdditionalSession();
      const targetA = await seedOrgWithOwner();
      const targetB = await seedOrgWithOwner();
      const callerA = createMfaCaller(fixture);
      const callerB = createRouterClient(appRouter, {
        context: () => {
          return {
            clientIp: "127.0.0.1",
            headers: sessionB.headers,
            logger: createLogger({ operation: "api__totp_session_b_test" }),
            session: sessionB.authSession
          };
        }
      });

      await callerA.admin.auth.stepUp({ code: await fixture.currentCode() });
      expect(fixture.session.id).not.toBe(sessionB.session.id);
      expect(await hasFreshAdminStepUp(fixture.session.id, fixture.user.id)).toBe(true);
      expect(await hasFreshAdminStepUp(sessionB.session.id, fixture.user.id)).toBe(false);
      await expect(
        callerA.admin.users.setRoles({ id: targetA.userId, roles: ["platform_admin"] })
      ).resolves.toEqual({ ok: true });
      await expect(
        callerB.admin.users.setRoles({ id: targetB.userId, roles: ["platform_admin"] })
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "STEP_UP_REQUIRED" });
    }
  );

  integrationIt(
    "rejects a revoked session before evaluating a residual step-up proof",
    async () => {
      const fixture = await createMfaAdminFixture();
      const target = await seedOrgWithOwner();
      const caller = createMfaCaller(fixture);
      await caller.admin.auth.stepUp({ code: await fixture.currentCode() });
      await caller.admin.sessions.revoke({ id: fixture.session.id });

      expect(await hasFreshAdminStepUp(fixture.session.id, fixture.user.id)).toBe(true);
      await expect(
        caller.admin.users.setRoles({ id: target.userId, roles: ["platform_admin"] })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
  );

  integrationIt(
    "revokes all sessions and does not let a new session inherit old step-up",
    async () => {
      const fixture = await createMfaAdminFixture();
      const sessionB = await fixture.createAdditionalSession();
      const target = await seedOrgWithOwner();
      const callerA = createMfaCaller(fixture);
      const callerB = createRouterClient(appRouter, {
        context: () => {
          return {
            clientIp: "127.0.0.1",
            headers: sessionB.headers,
            logger: createLogger({ operation: "api__totp_revoke_all_b_test" }),
            session: sessionB.authSession
          };
        }
      });
      await callerA.admin.auth.stepUp({ code: await fixture.currentCode() });
      await callerA.admin.sessions.revokeAll({ userId: fixture.user.id });

      expect(await hasFreshAdminStepUp(fixture.session.id, fixture.user.id)).toBe(true);
      await expect(callerA.admin.users.list({ limit: 1 })).rejects.toMatchObject({
        code: "UNAUTHORIZED"
      });
      await expect(callerB.admin.users.list({ limit: 1 })).rejects.toMatchObject({
        code: "UNAUTHORIZED"
      });

      const sessionC = await fixture.createAdditionalSession();
      const callerC = createRouterClient(appRouter, {
        context: () => {
          return {
            clientIp: "127.0.0.1",
            headers: sessionC.headers,
            logger: createLogger({ operation: "api__totp_revoke_all_c_test" }),
            session: sessionC.authSession
          };
        }
      });
      expect(await hasFreshAdminStepUp(sessionC.session.id, fixture.user.id)).toBe(false);
      await expect(
        callerC.admin.users.setRoles({ id: target.userId, roles: ["platform_admin"] })
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "STEP_UP_REQUIRED" });
    }
  );
});
