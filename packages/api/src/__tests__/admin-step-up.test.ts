import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => {
  return {
    checkRateLimit: vi.fn(),
    connectRedis: vi.fn(),
    getRedis: vi.fn(),
    values: new Map<string, string>(),
    verifyTOTP: vi.fn()
  };
});

vi.mock("@saasweave/auth/index", () => {
  return { auth: { api: { verifyTOTP: mocks.verifyTOTP } } };
});
vi.mock("@saasweave/cache", () => {
  return {
    checkRateLimit: mocks.checkRateLimit,
    connectRedis: mocks.connectRedis,
    getRedis: mocks.getRedis
  };
});

import { hasFreshAdminStepUp, verifyAndRecordAdminStepUp } from "#@/lib/admin-step-up";

describe("admin step-up", () => {
  beforeEach(() => {
    mocks.values.clear();
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.getRedis.mockReturnValue({});
    mocks.connectRedis.mockResolvedValue({
      get: vi.fn((key: string) => mocks.values.get(key) ?? null),
      set: vi.fn((key: string, value: string) => {
        mocks.values.set(key, value);
      })
    });
    mocks.verifyTOTP.mockResolvedValue({ status: true });
  });

  it("records an official TOTP verification only for the current session", async () => {
    await expect(
      verifyAndRecordAdminStepUp({
        code: "123456",
        headers: new Headers(),
        sessionId: "session-a",
        userId: "admin",
        ip: "127.0.0.1"
      })
    ).resolves.toBe(true);
    expect(mocks.verifyTOTP).toHaveBeenCalledWith({
      body: { code: "123456", trustDevice: false },
      headers: expect.any(Headers)
    });
    await expect(hasFreshAdminStepUp("session-a", "admin")).resolves.toBe(true);
    await expect(hasFreshAdminStepUp("session-b", "admin")).resolves.toBe(false);
  });

  it("does not create proof when TOTP fails or the rate limit closes", async () => {
    mocks.verifyTOTP.mockRejectedValueOnce(new Error("invalid"));
    await expect(
      verifyAndRecordAdminStepUp({
        code: "000000",
        headers: new Headers(),
        sessionId: "session-a",
        userId: "admin",
        ip: "127.0.0.1"
      })
    ).resolves.toBe(false);
    await expect(hasFreshAdminStepUp("session-a", "admin")).resolves.toBe(false);
    mocks.checkRateLimit.mockResolvedValueOnce({ allowed: false });
    await expect(
      verifyAndRecordAdminStepUp({
        code: "000000",
        headers: new Headers(),
        sessionId: "session-a",
        userId: "admin",
        ip: "127.0.0.1"
      })
    ).resolves.toBe(false);
    expect(mocks.verifyTOTP).toHaveBeenCalledTimes(1);
  });

  it("fails closed when Redis is unavailable and expired values are absent", async () => {
    mocks.connectRedis.mockResolvedValueOnce(null);
    await expect(
      verifyAndRecordAdminStepUp({
        code: "123456",
        headers: new Headers(),
        sessionId: "session-a",
        userId: "admin",
        ip: "127.0.0.1"
      })
    ).resolves.toBe(false);
    mocks.connectRedis.mockResolvedValueOnce(null);
    await expect(hasFreshAdminStepUp("session-a", "admin")).resolves.toBe(false);
  });
});
