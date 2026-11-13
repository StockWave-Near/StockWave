import { oneClick } from "@/lib/oneclick";
import { config } from "@/lib/config";
import { newGiftId, saveGift, saveBasket, getIdem, setIdem, type Gift } from "@/lib/store";
import { checkEligibility } from "@/lib/eligibility";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { STOCKS, USDC_NEAR, usdToUsdcUnits } from "@/lib/stocks";
import { BASKETS, basketLegAmounts, isBasketKey, isValidBasketUsd } from "@/lib/baskets";

const NEAR_ACCOUNT = /^[a-z0-9._-]{2,64}$/;
const PUBKEY = /^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/;

// Create a basket: one real quote per leg (each with refundTo = sender), then save every leg
// as an ordinary gift. The browser makes one claim keypair per leg and sends ONLY public keys.
export async function POST(request: Request) {
  // One quote per leg, so this is limited harder than a single gift.
  if (!rateLimit(`basket:${clientIp(request.headers)}`, 3, 60_000)) return tooMany();
  const b = (await request.json().catch(() => null)) as {
    basket?: string; usd?: number; note?: string; declaredEligible?: boolean;
    senderAccount?: string; claimPublicKeys?: unknown;
  } | null;
  if (!b || !isBasketKey(b.basket)) return Response.json({ error: "bad_request" }, { status: 400 });
  const def = BASKETS[b.basket];
  if (!isValidBasketUsd(def, b.usd) ||
      typeof b.senderAccount !== "string" || !NEAR_ACCOUNT.test(b.senderAccount) ||
      !Array.isArray(b.claimPublicKeys) || b.claimPublicKeys.length !== def.legs.length ||
      !b.claimPublicKeys.every((k) => typeof k === "string" && PUBKEY.test(k)) ||
      new Set(b.claimPublicKeys).size !== def.legs.length) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const usd = b.usd;
  const keys = b.claimPublicKeys as string[];
  const elig = checkEligibility(request.headers, b.declaredEligible === true);
  if (!elig.eligible) {
    return Response.json({ error: elig.reason }, { status: elig.reason === "region_blocked" ? 451 : 400 });
  }
  const idemKey = request.headers.get("idempotency-key")?.slice(0, 100);
  if (idemKey) {
    const prev = await getIdem(`${b.senderAccount}:basket:${idemKey}`);
    if (prev) return Response.json(prev);
  }
  if (!config.vaultAccount) return Response.json({ error: "vault_not_configured" }, { status: 503 });
  const note = (b.note ?? "").slice(0, 140);
  const amounts = basketLegAmounts(def, usd);

  try {
    // Quote every leg first. If any quote fails nothing is saved (an unpaid quote costs nothing).
    const quotes = await Promise.all(amounts.map((leg) =>
      oneClick.quote({
        dry: false,
        swapType: "EXACT_INPUT",
        slippageTolerance: 100,
        originAsset: USDC_NEAR,
        destinationAsset: STOCKS[leg.stock].assetId,
        amount: usdToUsdcUnits(leg.usd),
        depositType: "ORIGIN_CHAIN",
        recipient: config.vaultAccount,
        recipientType: "INTENTS",
        refundTo: b.senderAccount!,
        refundType: "ORIGIN_CHAIN",
        deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
      }) as Promise<{ quote?: { depositAddress?: string; minAmountOut?: string; amountOut?: string } }>,
    ));
    if (quotes.some((q) => !q.quote?.depositAddress)) throw new Error("no deposit address");

    const basketId = newGiftId();
    const createdAt = new Date().toISOString();
    const legs: Gift[] = amounts.map((leg, i) => ({
      id: newGiftId(), stock: leg.stock, usd: leg.usd, note, senderAccount: b.senderAccount!,
      claimPublicKey: keys[i], depositAddress: quotes[i].quote!.depositAddress!,
      amountOut: quotes[i].quote?.minAmountOut ?? quotes[i].quote?.amountOut,
      status: "AWAITING_DEPOSIT", createdAt, basketId,
    }));
    for (const leg of legs) await saveGift(leg);
    await saveBasket({
      id: basketId, basketKey: def.key, name: def.name, usd, note,
      senderAccount: b.senderAccount, legIds: legs.map((l) => l.id), createdAt,
    });
    const result = {
      id: basketId,
      legs: legs.map((l) => ({ giftId: l.id, stock: l.stock, usd: l.usd, depositAddress: l.depositAddress })),
    };
    if (idemKey) await setIdem(`${b.senderAccount}:basket:${idemKey}`, result);
    return Response.json(result);
  } catch {
    return Response.json({ error: "basket_create_failed" }, { status: 502 });
  }
}
