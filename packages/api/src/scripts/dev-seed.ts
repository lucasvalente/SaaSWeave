import { randomUUID } from "node:crypto";

// These checks intentionally run before importing any DB/auth module.
if (process.env.NODE_ENV === "production") throw new Error("Dev seed is forbidden in production");
if (process.env.NODE_ENV !== "development") throw new Error("Set NODE_ENV=development explicitly");
const databaseUrl = process.env.DATABASE_URL;
if (
  !databaseUrl ||
  !["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(databaseUrl).hostname)
)
  throw new Error("Dev seed requires a local database");
const password = process.env.DEV_SEED_PASSWORD;
if (!password || password.length < 16)
  throw new Error("Supply DEV_SEED_PASSWORD with at least 16 characters");

const { eq } = await import("drizzle-orm");
const { auth } = await import("@saasweave/auth/index");
const { db, recordAudit, recordSecurityEvent } = await import("@saasweave/db");
const { user, organization, member, platformRoleAssignment } = await import("@saasweave/db/schema");

async function seedUser(name: string) {
  const email = `${name}@admin-v1.local.test`;
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) return existing.id;
  const created = await auth.api.signUpEmail({ body: { email, name, password: password! } });
  await db
    .update(user)
    .set({ emailVerified: true, role: "user" })
    .where(eq(user.id, created.user.id));
  return created.user.id;
}
for (const role of [
  "super_admin",
  "platform_admin",
  "engineering",
  "security",
  "support",
  "readonly"
] as const) {
  const id = await seedUser(role);
  await db
    .insert(platformRoleAssignment)
    .values({ id: randomUUID(), role, userId: id })
    .onConflictDoNothing();
}
for (const suffix of ["a", "b"]) {
  const userId = await seedUser(`user-${suffix}`);
  const slug = `admin-v1-workspace-${suffix}`;
  const [existing] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  const id = existing?.id ?? randomUUID();
  if (!existing) {
    await db.insert(organization).values({
      id,
      name: `Workspace ${suffix.toUpperCase()}`,
      slug,
      createdAt: new Date(),
      subscriptionStatus: "active"
    });
    await db.insert(member).values({
      id: randomUUID(),
      userId,
      organizationId: id,
      role: "owner",
      createdAt: new Date()
    });
    await recordAudit({
      actorId: userId,
      organizationId: id,
      action: "dev.workspace_seeded",
      targetType: "workspace",
      targetLabel: id
    });
    await recordSecurityEvent({
      type: "authentication.failure",
      severity: "info",
      actorUserId: userId,
      organizationId: id,
      metadata: { fixture: "development seed" }
    });
  }
}
console.info(
  "Admin V1 development fixtures ready. Privileged users must enroll MFA in /app/security before opening Admin."
);
process.exit(0);
