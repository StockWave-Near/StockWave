// Fixed-window in-memory rate limiter. Per instance only; use Redis/KV when scaling out.
const g = globalThis as unknown as { __stockwaveRL?: Map<string, { n: number; reset: number }> };
const hits = (g.__stockwaveRL ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const h = hits.get(key);
  if (!h || now >= h.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (now >= v.reset) hits.delete(k);
    return true;
  }
  if (h.n >= limit) return false;
  h.n += 1;
  return true;
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}

export const tooMany = () => Response.json({ error: "rate_limited" }, { status: 429 });
