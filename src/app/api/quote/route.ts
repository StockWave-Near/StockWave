import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { oneClick } from "@/lib/oneclick";
import { config } from "@/lib/config";
import {
  MAX_USD, MIN_USD, STOCKS, USDC_NEAR, isStockKey, usdToUsdcUnits,
} from "@/lib/stocks";

// Dry quote only: nothing is signed or funded. Server computes every amount itself.
// Retries once on failure — 1Click can be intermittently slow.
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

  // Try up to 2 times — 1Click is occasionally slow on the first call.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const quote = await oneClick.quote(body);
      return Response.json({ stock: b.stock, usd: b.usd, quote });
    } catch (e) {
      if (attempt === 0) {
        // Small pause before retry.
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      console.error("quote failed after retry", e instanceof Error ? e.message : e);
      return Response.json({ error: "quote_unavailable" }, { status: 502 });
    }
  }

  return Response.json({ error: "quote_unavailable" }, { status: 502 });
}
