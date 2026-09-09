/* eslint-disable jest/no-standalone-expect, jest/require-to-throw-message -- assertions run inside the integrationIt() wrapper */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect } from "vite-plus/test";

import { db } from "@saasweave/db";
import { platformRoleAssignment, user } from "@saasweave/db/schema";

import {
  createCallerFor,
  expectOrpcError,
  integrationIt,
  seedOrgWithOwner,
  seedPlatformAdmin
} from "./harness";

async function seedAdminCaller() {
  const seed = await seedOrgWithOwner({ email: "operator@integration.test" });
  await seedPlatformAdmin(seed.userId);
  return createCallerFor({ seed, userRole: "admin" });
}

async function assignRole(userId: string, role: "platform_admin" | "support"): Promise<void> {
  await db.insert(platformRoleAssignment).values({ id: randomUUID(), role, userId });
}

describe.sequential("admin users", () => {
  integrationIt("filters users in SQL by search, status, role, and MFA", async () => {
    const caller = await seedAdminCaller();
    const matching = await seedOrgWithOwner({ email: "matching-user@integration.test" });
    const suspended = await seedOrgWithOwner({ email: "suspended-user@integration.test" });
    const noMfa = await seedOrgWithOwner({ email: "no-mfa-user@integration.test" });
    await db
      .update(user)
      .set({ banned: null, twoFactorEnabled: null })
      .where(eq(user.id, noMfa.userId));
    await db
      .update(user)
      .set({ banned: true, twoFactorEnabled: true })
      .where(eq(user.id, suspended.userId));
    await db.update(user).set({ twoFactorEnabled: true }).where(eq(user.id, matching.userId));
    await assignRole(matching.userId, "support");
    await assignRole(suspended.userId, "support");

    const matchingResult = await caller.admin.users.list({
      limit: 25,
      mfa: true,
      role: "support",
      search: "matching-user",
      status: "active"
    });
    expect(matchingResult.data.map((entry) => entry.id)).toEqual([matching.userId]);

    const suspendedResult = await caller.admin.users.list({
      limit: 25,
      mfa: true,
      role: "support",
      status: "suspended"
    });
    expect(suspendedResult.data.map((entry) => entry.id)).toEqual([suspended.userId]);

    const noMfaResult = await caller.admin.users.list({
      limit: 25,
      mfa: false,
      status: "active",
      search: "no-mfa"
    });
    expect(noMfaResult.data.map((entry) => entry.id)).toEqual([noMfa.userId]);
  });

  integrationIt("uses createdAt ordering and cursor pagination", async () => {
    const caller = await seedAdminCaller();
    const first = await seedOrgWithOwner({ email: "ordered-first@integration.test" });
    const second = await seedOrgWithOwner({ email: "ordered-second@integration.test" });
    const base = new Date("2030-01-01T00:00:00.000Z");
    await db.update(user).set({ createdAt: base }).where(eq(user.id, first.userId));
    await db
      .update(user)
      .set({ createdAt: new Date("2030-01-02T00:00:00.000Z") })
      .where(eq(user.id, second.userId));

    const ascending = await caller.admin.users.list({
      limit: 1,
      search: "ordered-",
      sort: "createdAt.asc"
    });
    const descending = await caller.admin.users.list({
      limit: 1,
      search: "ordered-",
      sort: "createdAt.desc"
    });
    expect(ascending.data[0]?.id).toBe(first.userId);
    expect(descending.data[0]?.id).toBe(second.userId);
    expect(ascending.meta.nextCursor).toBe("1");

    const next = await caller.admin.users.list({
      cursor: ascending.meta.nextCursor ?? undefined,
      limit: 1,
      search: "ordered-",
      sort: "createdAt.asc"
    });
    expect(next.data[0]?.id).not.toBe(ascending.data[0]?.id);
  });

  integrationIt("enforces pagination and sort input boundaries", async () => {
    const caller = await seedAdminCaller();
    const seeded = await seedOrgWithOwner();
    await expect(caller.admin.users.list({ limit: 100 })).resolves.toBeDefined();
    await expectOrpcError(() => caller.admin.users.list({ limit: 101 }), "BAD_REQUEST");
    await expectOrpcError(() => caller.admin.users.list({ limit: -1 }), "BAD_REQUEST");
    await expectOrpcError(
      () => caller.admin.users.list({ cursor: "not-a-cursor", limit: 1 }),
      "BAD_REQUEST"
    );
    for (const sort of ["password", "random_sql", "__proto__"]) {
      await expectOrpcError(
        () => caller.admin.users.list({ limit: 1, sort: sort as "createdAt.asc" }),
        "BAD_REQUEST"
      );
    }
    for (const cursor of ["-1", "1.5", "2147483648", "999999999999999999999999999999"]) {
      await expectOrpcError(() => caller.admin.users.list({ cursor }), "BAD_REQUEST");
    }
    await expect(
      db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.id, seeded.userId), eq(user.email, seeded.email)))
    ).resolves.toHaveLength(1);
  });

  integrationIt("applies every combined filter before pagination", async () => {
    const caller = await seedAdminCaller();
    const fixtures = [];
    for (const [index, status, mfa, role] of [
      [0, false, true, "support"],
      [1, true, true, "support"],
      [2, false, false, "support"],
      [3, false, true, "platform_admin"]
    ] as const) {
      const seed = await seedOrgWithOwner({ email: `combination-${index}@integration.test` });
      await db
        .update(user)
        .set({ banned: status, twoFactorEnabled: mfa })
        .where(eq(user.id, seed.userId));
      await assignRole(seed.userId, role);
      fixtures.push(seed.userId);
    }
    const cases = [
      { filters: { status: "active", role: "support" }, expected: [fixtures[0], fixtures[2]] },
      { filters: { role: "support", mfa: true }, expected: [fixtures[0], fixtures[1]] },
      { filters: { status: "active", mfa: true }, expected: [fixtures[0], fixtures[3]] },
      { filters: { status: "active", role: "support", mfa: true }, expected: [fixtures[0]] },
      { filters: { role: "platform_admin" }, expected: [fixtures[3]] },
      { filters: { status: "suspended", mfa: true }, expected: [fixtures[1]] }
    ] as const;
    for (const entry of cases) {
      const result = await caller.admin.users.list({ search: "combination-", ...entry.filters });
      expect(result.data).toHaveLength(entry.expected.length);
      expect(result.data.map((row) => row.id)).toEqual(expect.arrayContaining([...entry.expected]));
    }
    const values = Array.from({ length: 101 }, (_, index) => {
      return {
        id: randomUUID(),
        name: `Bulk ${index}`,
        email: `bulk-${index}@integration.test`
      };
    });
    await db.insert(user).values(values);
    const page = await caller.admin.users.list({ search: "bulk-", limit: 100 });
    expect(page.data).toHaveLength(100);
    expect(page.meta.nextCursor).toBe("100");
    expect(
      (await caller.admin.users.list({ search: "bulk-", limit: 100, cursor: "100" })).data
    ).toHaveLength(1);
  });
});
