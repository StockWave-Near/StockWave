import { oneClick } from "@/lib/oneclick";
import { config } from "@/lib/config";
import { newGiftId, saveGift, getIdem, setIdem } from "@/lib/store";
import { checkEligibility } from "@/lib/eligibility";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import {
  MAX_USD, MIN_USD, STOCKS, USDC_NEAR, isStockKey, usdToUsdcUnits,
} from "@/lib/stocks";

const NEAR_ACCOUNT = /^[a-z0-9._-]{2,64}$/;
const PUBKEY = /^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/;

// Create a gift: real quote with refundTo = sender, returns the deposit address to pay.
// The browser generates the claim keypair and sends ONLY the public key.
export async function POST(request: Request) {
  if (!rateLimit(`gift:${clientIp(request.headers)}`, 5, 60_000)) return tooMany();
  const b = (await request.json().catch(() => null)) as {
    stock?: string; usd?: number; note?: string; recipientPhone?: string; declaredEligible?: boolean; senderAccount?: string; claimPublicKey?: string;
  } | null;
  if (!b || !isStockKey(b.stock) || typeof b.usd !== "number" || !Number.isFinite(b.usd) ||
      b.usd < MIN_USD || b.usd > MAX_USD ||
      typeof b.senderAccount !== "string" || !NEAR_ACCOUNT.test(b.senderAccount) ||
      typeof b.claimPublicKey !== "string" || !PUBKEY.test(b.claimPublicKey)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const elig = checkEligibility(request.headers, b.declaredEligible === true);
  if (!elig.eligible) {
    return Response.json({ error: elig.reason }, { status: elig.reason === "region_blocked" ? 451 : 400 });
  }
  const idemKey = request.headers.get("idempotency-key")?.slice(0, 100);
  if (idemKey) {
    const prev = await getIdem(`${b.senderAccount}:${idemKey}`);
    if (prev) return Response.json(prev);
  }
  if (!config.vaultAccount) {
    return Response.json({ error: "vault_not_configured" }, { status: 503 });
  }
  const phone = (b.recipientPhone ?? "").replace(/\D/g, "");
  if (b.recipientPhone !== undefined && !/^\d{8,15}$/.test(phone)) {
    return Response.json({ error: "bad_phone" }, { status: 400 });
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
    })) as { quote?: { depositAddress?: string; minAmountOut?: string; amountOut?: string } };
    const depositAddress = quote.quote?.depositAddress;
    if (!depositAddress) throw new Error("no deposit address");
    const id = newGiftId();
    await saveGift({
      id, stock: b.stock, usd: b.usd, note, senderAccount: b.senderAccount,
      recipientPhone: phone || undefined,
      claimPublicKey: b.claimPublicKey, depositAddress,
      amountOut: quote.quote?.minAmountOut ?? quote.quote?.amountOut,
      status: "AWAITING_DEPOSIT", createdAt: new Date().toISOString(),
    });
    const result = { id, depositAddress, quote };
    if (idemKey) await setIdem(`${b.senderAccount}:${idemKey}`, result);

    // Proactive WhatsApp notification — fire-and-forget, never blocks the response.
    // The claim link is built here but NOT stored; it only lives in the sender's browser.
    // We send it only if the sender explicitly provided a recipientPhone.
    if (phone && config.twilioAccountSid && config.twilioAuthToken) {
      const senderName = b.senderAccount.replace(/\.near$/, "");
      const stockName = STOCKS[b.stock].name;
      const notifyText =
        `${senderName} gifted you $${b.usd} of ${stockName} on StockWave 🎁\n` +
        `Ask them to share the gift link with you to claim — no wallet needed.`;
      // We intentionally do NOT include the claim link here because the private key
      // lives only in the sender's browser. The sender shares it themselves.
      const params = new URLSearchParams({
        From: `whatsapp:${config.twilioWhatsAppFrom}`,
        To: `whatsapp:+${phone}`,
        Body: notifyText,
      });
      const creds = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
      fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
        {
          method: "POST",
          headers: { authorization: `Basic ${creds}`, "content-type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }
      ).catch(() => { /* ignore — notification is best-effort */ });
    }

    return Response.json(result);
  } catch {
    return Response.json({ error: "gift_create_failed" }, { status: 502 });
  }
}
