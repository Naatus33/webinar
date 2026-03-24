import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const memoryStore = new Map<string, Bucket>();

export function rateLimitKey(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}

function checkRateLimitMemory(
  key: string,
  opts: { windowMs: number; max: number },
): { ok: boolean } {
  const now = Date.now();
  let b = memoryStore.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 1, resetAt: now + opts.windowMs };
    memoryStore.set(key, b);
    return { ok: true };
  }
  if (b.count >= opts.max) {
    return { ok: false };
  }
  b.count += 1;
  return { ok: true };
}

let redisSingleton: Redis | null = null;
const ratelimitByOpts = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisSingleton) {
    redisSingleton = new Redis({ url, token });
  }
  return redisSingleton;
}

function getUpstashRatelimiter(opts: { windowMs: number; max: number }): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${opts.max}:${opts.windowMs}`;
  let r = ratelimitByOpts.get(cacheKey);
  if (!r) {
    const sec = Math.max(1, Math.ceil(opts.windowMs / 1000));
    r = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(opts.max, `${sec} s`),
      prefix: `@upstash/ratelimit:${cacheKey}`,
    });
    ratelimitByOpts.set(cacheKey, r);
  }
  return r;
}

/**
 * Rate limit: Upstash Redis quando `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 * estão definidos; caso contrário, contador em memória (uma instância).
 */
export async function checkRateLimit(
  key: string,
  opts: { windowMs: number; max: number },
): Promise<{ ok: boolean }> {
  const upstash = getUpstashRatelimiter(opts);
  if (upstash) {
    const { success } = await upstash.limit(key);
    return { ok: success };
  }
  return checkRateLimitMemory(key, opts);
}
