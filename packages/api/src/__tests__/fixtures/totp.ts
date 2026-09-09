import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";
import { generate, generateSecret } from "otplib";

import { auth, type AuthSession } from "@saasweave/auth/index";
import { db } from "@saasweave/db";
import { platformRoleAssignment, session, user } from "@saasweave/db/schema";

/** Matches Better Auth 1.7.0-rc.1 twoFactor() defaults in this application. */
export const BETTER_AUTH_TOTP = {
  algorithm: "sha1" as const,
  digits: 6 as const,
  period: 30
};

export type MfaAdminFixture = {
  authSession: AuthSession;
  currentCode: (epoch?: number) => Promise<string>;
  headers: Headers;
  password: string;
  secret: string;
  session: { id: string; token: string };
  createAdditionalSession: () => Promise<
    Pick<MfaAdminFixture, "authSession" | "headers" | "session">
  >;
  user: { email: string; id: string; name: string };
};

function cookieHeaders(response: Response): Headers {
  const nodeHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = nodeHeaders.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
  const values = cookies
    .filter(Boolean)
    .map((value) => value.split(";")[0])
    .filter(Boolean);
  if (values.length === 0) {
    throw new Error("Better Auth did not return a session cookie for the test fixture.");
  }

  // Sign-in with MFA sets both the temporary two-factor cookie and, after
  // verification, the session cookie. Keep the complete response cookie jar.
  return new Headers({ cookie: values.join("; ") });
}

async function latestStoredSession(userId: string) {
  const [storedSession] = await db
    .select({
      id: session.id,
      userId: session.userId,
      token: session.token,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      updatedAt: session.updatedAt,
      activeOrganizationId: session.activeOrganizationId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.createdAt))
    .limit(1);
  if (!storedSession) throw new Error("Better Auth did not persist the MFA fixture session.");
  return storedSession;
}

function getTotpSecret(uri: string): string {
  const secret = new URL(uri).searchParams.get("secret");
  if (!secret) throw new Error("Better Auth enrollment did not return a TOTP secret.");
  return secret;
}

/** Test-only TOTP generator. It is never imported by production code. */
export async function generateTestTotpCode(
  secret: string,
  epoch = Date.now() / 1000
): Promise<string> {
  return generate({
    algorithm: BETTER_AUTH_TOTP.algorithm,
    digits: BETTER_AUTH_TOTP.digits,
    epoch,
    period: BETTER_AUTH_TOTP.period,
    secret
  });
}

/** Generates a Base32 secret for isolated fixture tests; it never writes or logs the value. */
export function generateTestTotpSecret(): string {
  return generateSecret();
}

/**
 * Enrolls a real Better Auth user through its endpoint, completes TOTP verification,
 * then grants a test-only platform role. The secret is obtained from the enrollment
 * URI and is used solely by this module's Node-side code generator.
 */
export async function createMfaAdminFixture(): Promise<MfaAdminFixture> {
  const email = `mfa-admin-${randomUUID()}@integration.test`;
  const password = `Test-${randomUUID()}`;
  const name = "MFA Integration Admin";

  const signUp = await auth.api.signUpEmail({
    asResponse: true,
    body: { email, name, password }
  });
  if (!signUp.ok) throw new Error("Better Auth sign-up failed while creating the MFA fixture.");

  const enrollmentHeaders = cookieHeaders(signUp);
  const enable = await auth.api.enableTwoFactor({
    asResponse: true,
    body: { method: "totp", password },
    headers: enrollmentHeaders
  });
  if (!enable.ok) throw new Error("Better Auth TOTP enrollment failed for the MFA fixture.");

  const enrollment = (await enable.json()) as { totpURI?: string };
  if (!enrollment.totpURI) throw new Error("Better Auth TOTP enrollment did not return a URI.");
  const secret = getTotpSecret(enrollment.totpURI);
  const code = await generateTestTotpCode(secret);
  const verification = await auth.api.verifyTOTP({
    asResponse: true,
    body: { code, trustDevice: false },
    headers: enrollmentHeaders
  });
  if (!verification.ok) throw new Error("Better Auth rejected the generated fixture TOTP.");

  const headers = cookieHeaders(verification);
  const [storedUser] = await db
    .select({ email: user.email, id: user.id, name: user.name })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!storedUser) throw new Error("Better Auth did not persist the MFA fixture user.");

  const storedSession = await latestStoredSession(storedUser.id);

  await db.update(user).set({ role: "admin" }).where(eq(user.id, storedUser.id));
  await db.insert(platformRoleAssignment).values({
    createdBy: storedUser.id,
    id: randomUUID(),
    role: "super_admin",
    userId: storedUser.id
  });

  const toAuthSession = (stored: Awaited<ReturnType<typeof latestStoredSession>>): AuthSession => {
    return {
      session: { ...stored, impersonatedBy: null },
      user: {
        banExpires: null,
        banReason: null,
        banned: false,
        createdAt: new Date(),
        email: storedUser.email,
        emailVerified: true,
        id: storedUser.id,
        image: null,
        name: storedUser.name,
        role: "admin",
        twoFactorEnabled: true,
        updatedAt: new Date()
      }
    };
  };

  const createAdditionalSession = async () => {
    const signIn = await auth.api.signInEmail({
      asResponse: true,
      body: { email, password }
    });
    if (!signIn.ok) {
      throw new Error("Better Auth sign-in failed while creating a second MFA session.");
    }
    const signInHeaders = cookieHeaders(signIn);
    const verify = await auth.api.verifyTOTP({
      asResponse: true,
      body: { code: await generateTestTotpCode(secret), trustDevice: false },
      headers: signInHeaders
    });
    if (!verify.ok) {
      throw new Error("Better Auth rejected TOTP while creating a second MFA session.");
    }
    const additionalHeaders = cookieHeaders(verify);
    const additionalSession = await latestStoredSession(storedUser.id);
    return {
      authSession: toAuthSession(additionalSession),
      headers: additionalHeaders,
      session: { id: additionalSession.id, token: additionalSession.token }
    };
  };

  return {
    authSession: toAuthSession(storedSession),
    currentCode: (epoch) => generateTestTotpCode(secret, epoch),
    headers,
    password,
    secret,
    session: { id: storedSession.id, token: storedSession.token },
    createAdditionalSession,
    user: storedUser
  };
}
