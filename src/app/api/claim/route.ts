import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { getGift, saveGift } from "@/lib/store";
import { parseGiftHash } from "@/lib/gift-link";

// POST /api/claim
// Called by the claim page after the friend signs in with Google.
// Body: { giftId, claimKey, recipientAccountId }
//
// Security model:
//   - claimKey is the ed25519 private key from the link fragment. We validate its format
//     but do NOT use it here for signing — the actual vault.claim() call (on-chain, signed
//     by the link key) will happen client-side once near-api-js is wired in.
//   - For the demo this endpoint marks the gift CLAIMED in the store so the UI advances.
//   - TODO (Ayush): once the vault is deployed, replace the store-only update with a
//     near-api-js call: sign vault.claim({recipient}) with the link key, submit to NEAR RPC.
//
// Rate limit: 10 attempts per IP per minute to slow brute-force key guessing.

const NEAR_ACCOUNT = /^[a-z0-9._-]{2,64}$/;
const PUBKEY_OR_PRIVKEY = /^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/;

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
  const keyValid = PUBKEY_OR_PRIVKEY.test(b.claimKey);
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

  // ── On-chain claim (TODO: wire near-api-js when vault is deployed) ──────────
  // const keyPair = nearApi.KeyPair.fromString(b.claimKey);
  // const account = await near.account(config.vaultAccount);
  // await account.functionCall({
  //   contractId: config.vaultAccount,
  //   methodName: "claim",
  //   args: { recipient: b.recipientAccountId },
  //   keyPair,          // signs as the vault's function-call key
  // });
  // ───────────────────────────────────────────────────────────────────────────

  // For now: mark as CLAIMED in the store so the UI can advance during the demo.
  gift.status = "CLAIMED";
  await saveGift(gift);

  return Response.json({
    ok: true,
    recipientAccountId: b.recipientAccountId,
    stock: gift.stock,
    usd: gift.usd,
    // TODO: return the NEAR tx hash once the on-chain call is wired.
  });
}
