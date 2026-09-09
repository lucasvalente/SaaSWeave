import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect } from "vite-plus/test";

import { connectRedis, getRedis } from "@saasweave/cache";
import { db } from "@saasweave/db";
import { platformRoleAssignment } from "@saasweave/db/schema";

import {
  createCallerFor,
  expectOrpcError,
  integrationIt,
  seedOrgWithOwner,
  seedPlatformAdmin
} from "./harness";

describe("Admin role concurrency", () => {
  integrationIt(
    "protects the legacy last super admin and rejects invalid role targets",
    async () => {
      const seed = await seedOrgWithOwner();
      await seedPlatformAdmin(seed.userId);
      const caller = await createCallerFor({ seed, userRole: "admin", mfaEnabled: true });
      const redis = await connectRedis(getRedis());
      if (!redis) throw new Error("Redis required for role policy fixture");
      await redis.set(`admin:step-up:${seed.sessionId}`, seed.userId, "EX", 300);
      try {
        await expectOrpcError(
          () => caller.admin.users.setRoles({ id: seed.userId, roles: ["support"] }),
          "CONFLICT"
        );
        await expectOrpcError(
          () => caller.admin.users.setRoles({ id: randomUUID(), roles: ["support"] }),
          "NOT_FOUND"
        );
        await expectOrpcError(
          () => caller.admin.users.setRoles({ id: seed.userId, roles: ["support", "support"] }),
          "BAD_REQUEST"
        );
      } finally {
        await redis.del(`admin:step-up:${seed.sessionId}`);
      }
    }
  );
  integrationIt(
    "preserves one super admin when two admins demote themselves concurrently",
    async () => {
      const seeds = await Promise.all([seedOrgWithOwner(), seedOrgWithOwner()]);
      const redis = await connectRedis(getRedis());
      if (!redis) throw new Error("Redis required for role policy fixture");
      const callers = await Promise.all(
        seeds.map(async (seed) => {
          await db
            .insert(platformRoleAssignment)
            .values({ id: randomUUID(), userId: seed.userId, role: "super_admin" });
          // Existing step-up policy is covered by the TOTP suite. This fixture isolates atomic role policy.
          await redis.set(`admin:step-up:${seed.sessionId}`, seed.userId, "EX", 300);
          return createCallerFor({ seed, mfaEnabled: true });
        })
      );
      try {
        const results = await Promise.allSettled(
          callers.map((caller, index) =>
            caller.admin.users.setRoles({ id: seeds[index]!.userId, roles: ["support"] })
          )
        );
        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
        const rejected = results.find((result) => result.status === "rejected");
        expect(rejected).toMatchObject({
          status: "rejected",
          reason: { code: "CONFLICT", message: "LAST_SUPER_ADMIN" }
        });
        const remaining = await db
          .select()
          .from(platformRoleAssignment)
          .where(eq(platformRoleAssignment.role, "super_admin"));
        expect(remaining).toHaveLength(1);
      } finally {
        for (const seed of seeds) await redis.del(`admin:step-up:${seed.sessionId}`);
      }
    }
  );
});
