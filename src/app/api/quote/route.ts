import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { oneClick } from "@/lib/oneclick";
import { config } from "@/lib/config";
import {
  MAX_USD, MIN_USD, STOCKS, USDC_NEAR, isStockKey, usdToUsdcUnits,
} from "@/lib/stocks";

// In-process cache: last successful quote per stock key.
// Stale after 60s but still better than a hard error for the user.
const g = globalThis as unknown as {
  __quoteCache?: Map<string, { ts: number; quote: unknown }>;
};
const cache = (g.__quoteCache ??= new Map());
const CACHE_TTL_MS = 60_000;

export async function POST(request: Request) {
  if (!rateLimit(`quote:${clientIp(request.headers)}`, 30, 60_000)) return tooMany();

  const b = (await request.json().catch(() => null)) as { stock?: string; usd?: number } | null;
  if (!b || !isStockKey(b.stock) || typeof b.usd !== "number" ||
      !Number.isFinite(b.usd) || b.usd < MIN_USD || b.usd > MAX_USD) {
    return Response.json({ error: "bad_request", min: MIN_USD, max: MAX_USD }, { status: 400 });
  }

  const stock = STOCKS[b.stock];
  const body = {
    dry: true,
    swapType: "EXACT_INPUT" as const,
    slippageTolerance: 100,
    originAsset: USDC_NEAR,
    destinationAsset: stock.assetId,
    amount: usdToUsdcUnits(b.usd),
    depositType: "ORIGIN_CHAIN" as const,
    recipient: config.vaultAccount || "stockwave-vault.near",
    recipientType: "INTENTS" as const,
    refundTo: config.vaultAccount || "stockwave-vault.near",
    refundType: "ORIGIN_CHAIN" as const,
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
  };

  const cacheKey = `${b.stock}:${b.usd}`;

  // Try up to 3 times with short pauses.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const quote = await oneClick.quote(body);
      cache.set(cacheKey, { ts: Date.now(), quote });
      return Response.json({ stock: b.stock, usd: b.usd, quote });
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  // All attempts failed — return cached quote if fresh enough.
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.warn("quote: returning cached result after 3 failures", lastErr instanceof Error ? lastErr.message : lastErr);
    return Response.json({ stock: b.stock, usd: b.usd, quote: cached.quote, cached: true });
  }

  console.error("quote failed after 3 attempts, no cache", lastErr instanceof Error ? lastErr.message : lastErr);
  return Response.json({ error: "quote_unavailable" }, { status: 502 });
}
