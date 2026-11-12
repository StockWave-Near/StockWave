import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { getGift, saveGift } from "@/lib/store";
import { config } from "@/lib/config";
import { Account, JsonRpcProvider, teraToGas, type KeyPairString } from "near-api-js";

// POST /api/claim
// Called by the claim page after the friend signs in with Google.
// Body: { giftId, claimKey, recipientAccountId }
//
// Security model:
//   - claimKey is the ed25519 private key from the link fragment. We validate its format
//     but do NOT use it here for signing — the actual vault.claim() call (on-chain, signed
//     by the link key) will happen client-side once near-api-js is wired in.
//   - For the demo this endpoint marks the gift CLAIMED in the store so the UI advances.
//   - On-chain: signs vault.claim({recipient}) with the link key via near-api-js.
//     near-api-js call: sign vault.claim({recipient}) with the link key, submit to NEAR RPC.
//
// Rate limit: 10 attempts per IP per minute to slow brute-force key guessing.

const NEAR_ACCOUNT = /^[a-z0-9._-]{2,64}$/;
// ed25519 secret keys are 64 bytes (~88 base58 chars).
const PRIVKEY = /^ed25519:[1-9A-HJ-NP-Za-km-z]{80,90}$/;

export async function POST(request: Request) {
  if (!rateLimit(`claim:${clientIp(request.headers)}`, 10, 60_000)) return tooMany();

  const b = (await request.json().catch(() => null)) as {
    giftId?: string;
    claimKey?: string;      // ed25519 private key from the link fragment
    recipientAccountId?: string; // NEAR account id from the social login
  } | null;

  if (
    !b ||
    typeof b.giftId !== "string" || b.giftId.length > 100 ||
    typeof b.claimKey !== "string" ||
    typeof b.recipientAccountId !== "string" || !NEAR_ACCOUNT.test(b.recipientAccountId)
  ) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // Validate key format (must look like an ed25519 key — not a XSS payload etc.)
  // parseGiftHash accepts the #k=... fragment form; here we have the bare key value.
  const keyValid = PRIVKEY.test(b.claimKey);
  if (!keyValid) {
    return Response.json({ error: "invalid_key" }, { status: 400 });
  }

  const gift = await getGift(b.giftId);
  if (!gift) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (gift.status === "CLAIMED") {
    return Response.json({ error: "already_claimed" }, { status: 409 });
  }
  if (gift.status !== "FUNDED") {
    return Response.json({ error: "not_ready", status: gift.status }, { status: 422 });
  }

  // On-chain claim: sign vault.claim({recipient}) with the gift's link key. The key is a
  // function-call key on the vault account limited to `claim`, so the vault pays the gas.
  if (!config.vaultAccount) {
    return Response.json({ error: "vault_not_configured" }, { status: 503 });
  }
  try {
    const provider = new JsonRpcProvider({ url: config.nearRpc });
    const account = new Account(config.vaultAccount, provider, b.claimKey as KeyPairString);
    const outcome = await account.callFunction({
      contractId: config.vaultAccount,
      methodName: "claim",
      args: { recipient: b.recipientAccountId },
      gas: teraToGas(100),
    });
    void outcome;
  } catch (e) {
    console.error("vault.claim failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "claim_failed" }, { status: 502 });
  }

  gift.status = "CLAIMED";
  await saveGift(gift);

  return Response.json({
    ok: true,
    recipientAccountId: b.recipientAccountId,
    stock: gift.stock,
    usd: gift.usd,
    vault: config.vaultAccount,
  });
}
