import { getEnv } from "@autuax/config";
import Redis from "ioredis";

export const REDIS_NAMESPACES = {
  session: "session:",
  cache: "cache:",
  lock: "lock:",
  queue: "queue:",
  rateLimit: "rate-limit:",
} as const;

export type RedisNamespace = keyof typeof REDIS_NAMESPACES;

export interface RedisHealthResult {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

let _redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!_redisClient) {
    const env = getEnv();
    _redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 2000),
      lazyConnect: true,
    });
  }
  return _redisClient;
}

export function formatRedisKey(namespace: RedisNamespace, key: string): string {
  return `${REDIS_NAMESPACES[namespace]}${key}`;
}

export async function checkRedisHealth(): Promise<RedisHealthResult> {
  const start = Date.now();
  try {
    const client = getRedisClient();
    if (client.status === "wait" || client.status === "close") {
      await client.connect();
    }
    const ping = await client.ping();
    if (ping === "PONG") {
      return {
        status: "up",
        latencyMs: Date.now() - start,
      };
    }
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: `Unexpected ping response: ${ping}`,
    };
  } catch (err: unknown) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Redis connection failed",
    };
  }
}

export async function closeRedisClient(): Promise<void> {
  if (_redisClient) {
    try {
      await _redisClient.quit();
    } catch {
      _redisClient.disconnect();
    } finally {
      _redisClient = null;
    }
  }
}
