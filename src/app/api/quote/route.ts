import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { oneClick } from "@/lib/oneclick";
import { config } from "@/lib/config";
import {
  MAX_USD, MIN_USD, STOCKS, USDC_NEAR, isStockKey, usdToUsdcUnits,
} from "@/lib/stocks";

// Dry quote only: nothing is signed or funded. Server computes every amount itself.
export async function POST(request: Request) {
  if (!rateLimit(`quote:${clientIp(request.headers)}`, 20, 60_000)) return tooMany();
  const b = (await request.json().catch(() => null)) as { stock?: string; usd?: number } | null;
  if (!b || !isStockKey(b.stock) || typeof b.usd !== "number" ||
      !Number.isFinite(b.usd) || b.usd < MIN_USD || b.usd > MAX_USD) {
    return Response.json({ error: "bad_request", min: MIN_USD, max: MAX_USD }, { status: 400 });
  }
  const stock = STOCKS[b.stock];
  try {
    const quote = await oneClick.quote({
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100,
      originAsset: USDC_NEAR,
      destinationAsset: stock.assetId,
      amount: usdToUsdcUnits(b.usd),
      depositType: "ORIGIN_CHAIN",
      recipient: config.vaultAccount || "stockwave-vault.near",
      recipientType: "INTENTS",
      refundTo: config.vaultAccount || "stockwave-vault.near",
      refundType: "ORIGIN_CHAIN",
      deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    return Response.json({ stock: b.stock, usd: b.usd, quote });
  } catch {
    return Response.json({ error: "quote_unavailable" }, { status: 502 });
  }
}
