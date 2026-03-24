import { describe, expect, it } from "vitest";

import { checkRateLimit, rateLimitKey } from "./rate-limit";

describe("rate-limit", () => {
  it("bloqueia após o máximo no período (memória sem Upstash)", async () => {
    const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    try {
      const k = rateLimitKey("unit", `t-${Math.random()}`);
      expect((await checkRateLimit(k, { windowMs: 60_000, max: 2 })).ok).toBe(true);
      expect((await checkRateLimit(k, { windowMs: 60_000, max: 2 })).ok).toBe(true);
      expect((await checkRateLimit(k, { windowMs: 60_000, max: 2 })).ok).toBe(false);
    } finally {
      if (prevUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = prevUrl;
      if (prevToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    }
  });
});
