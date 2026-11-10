import { oneClick } from "@/lib/oneclick";
import { config } from "@/lib/config";
import { newGiftId, saveGift } from "@/lib/store";
import {
  MAX_USD, MIN_USD, STOCKS, USDC_NEAR, isStockKey, usdToUsdcUnits,
} from "@/lib/stocks";

const NEAR_ACCOUNT = /^[a-z0-9._-]{2,64}$/;
const PUBKEY = /^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/;

// Create a gift: real quote with refundTo = sender, returns the deposit address to pay.
// The browser generates the claim keypair and sends ONLY the public key.
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as {
    stock?: string; usd?: number; note?: string; senderAccount?: string; claimPublicKey?: string;
  } | null;
  if (!b || !isStockKey(b.stock) || typeof b.usd !== "number" || !Number.isFinite(b.usd) ||
      b.usd < MIN_USD || b.usd > MAX_USD ||
      typeof b.senderAccount !== "string" || !NEAR_ACCOUNT.test(b.senderAccount) ||
      typeof b.claimPublicKey !== "string" || !PUBKEY.test(b.claimPublicKey)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!config.vaultAccount) {
    return Response.json({ error: "vault_not_configured" }, { status: 503 });
  }
  const note = (b.note ?? "").slice(0, 140); // rendered as text only, never as HTML
  try {
    const quote = (await oneClick.quote({
      dry: false,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100,
      originAsset: USDC_NEAR,
      destinationAsset: STOCKS[b.stock].assetId,
      amount: usdToUsdcUnits(b.usd),
      depositType: "ORIGIN_CHAIN",
      recipient: config.vaultAccount,
      recipientType: "INTENTS",
      refundTo: b.senderAccount,
      refundType: "ORIGIN_CHAIN",
      deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
    })) as { quote?: { depositAddress?: string } };
    const depositAddress = quote.quote?.depositAddress;
    if (!depositAddress) throw new Error("no deposit address");
    const id = newGiftId();
    saveGift({
      id, stock: b.stock, usd: b.usd, note, senderAccount: b.senderAccount,
      claimPublicKey: b.claimPublicKey, depositAddress,
      status: "AWAITING_DEPOSIT", createdAt: new Date().toISOString(),
    });
    return Response.json({ id, depositAddress, quote });
  } catch {
    return Response.json({ error: "gift_create_failed" }, { status: 502 });
  }
}
