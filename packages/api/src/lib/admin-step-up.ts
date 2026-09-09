import { auth } from "@saasweave/auth/index";
import { checkRateLimit, connectRedis, getRedis } from "@saasweave/cache";

export const ADMIN_STEP_UP_TTL_SECONDS = 300;

function key(sessionId: string): string {
  return `admin:step-up:${sessionId}`;
}

export async function verifyAndRecordAdminStepUp(input: {
  code: string;
  headers: Headers;
  sessionId: string;
  userId: string;
  ip: string;
}): Promise<boolean> {
  const rate = await checkRateLimit(
    `admin-step-up:${input.userId}:${input.sessionId}:${input.ip}`,
    5,
    ADMIN_STEP_UP_TTL_SECONDS,
    { failureMode: "failClosed" }
  );
  if (!rate.allowed) return false;
  try {
    await auth.api.verifyTOTP({
      body: { code: input.code, trustDevice: false },
      headers: input.headers
    });
    const redis = await connectRedis(getRedis());
    if (!redis) return false;
    await redis.set(key(input.sessionId), input.userId, "EX", ADMIN_STEP_UP_TTL_SECONDS);
    return true;
  } catch {
    return false;
  }
}

export async function hasFreshAdminStepUp(sessionId: string, userId: string): Promise<boolean> {
  const redis = await connectRedis(getRedis());
  if (!redis) return false;
  return (await redis.get(key(sessionId))) === userId;
}
