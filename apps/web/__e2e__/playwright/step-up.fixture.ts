import { randomUUID } from "node:crypto";

import postgres from "postgres";

import { createMfaAdminFixture } from "@saasweave/api/testing/totp";

type FixtureUser = { email: string; id: string; name: string; password: string };
export type StepUpFixture = {
  admin: FixtureUser & { secret: string };
  /** Session cookie minted by Better Auth, for browser tests outside the auth flow. */
  browserSessionToken: string;
  /** Canonical Better Auth session paired with browserSessionToken. */
  sessionId: string;
  createTarget: () => Promise<FixtureUser>;
  dispose: () => Promise<void>;
};

/** Uses the Better Auth enrollment fixture proven by the integration suite.
 * The browser receives no session from this setup and performs login itself. */
export async function createStepUpFixture(): Promise<StepUpFixture> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Playwright step-up fixtures.");
  const sql = postgres(databaseUrl, { max: 1 });
  const mfa = await createMfaAdminFixture();
  // Integration suites reset the shared database. Create an isolated
  // workspace for this browser fixture so the authenticated session always
  // resolves to a valid active organization.
  const organizationId = randomUUID();
  await sql`insert into organization (id, name, slug) values (${organizationId}, 'Playwright Workspace', ${`pw-${organizationId}`})`;
  await sql`insert into member (id, organization_id, user_id, role) values (${randomUUID()}, ${organizationId}, ${mfa.user.id}, 'owner')`;
  await sql`update session set active_organization_id=${organizationId} where id=${mfa.session.id}`;
  const browserSessionToken = mfa.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("better-auth.session_token="))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!browserSessionToken) throw new Error("Better Auth fixture did not return a browser session cookie.");
  const createdUsers = [mfa.user.id];

  return {
    admin: { ...mfa.user, password: mfa.password, secret: mfa.secret },
    browserSessionToken,
    sessionId: mfa.session.id,
    createTarget: async () => {
      const target = {
        email: `pw-stepup-target-${randomUUID()}@integration.test`,
        id: randomUUID(),
        name: "Playwright Role Target",
        password: "not-used-by-this-fixture"
      };
      await sql`insert into "user" (id, name, email, email_verified, role) values (${target.id}, ${target.name}, ${target.email}, false, 'user')`;
      createdUsers.push(target.id);
      return target;
    },
    dispose: async () => {
      await sql`delete from project where created_by = any(${createdUsers})`;
      await sql`delete from organization where id=${organizationId}`;
      await sql`delete from platform_role_assignment where user_id = any(${createdUsers})`;
      await sql`delete from "user" where id = any(${createdUsers})`;
      await sql.end({ timeout: 5 });
    }
  };
}
