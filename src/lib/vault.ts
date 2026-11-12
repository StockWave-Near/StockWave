import { Account, JsonRpcProvider, teraToGas, type KeyPairString } from "near-api-js";
import { config } from "./config";
import { oneClick, type SwapStatus } from "./oneclick";
import { saveGift, type Gift } from "./store";
import { STOCKS } from "./stocks";

const GIFT_TTL_NS = 30 * 24 * 3600 * 1e9; // 30 days in nanoseconds

/** Registrar account — signs register_gift on the vault. */
function registrar(): Account {
  const key = config.nearRegistrarKey;
  if (!key || !config.vaultAccount) throw new Error("vault registrar not configured");
  return new Account(
    config.vaultAccount,
    new JsonRpcProvider({ url: config.nearRpc }),
    key as KeyPairString,
  );
}

/** Call vault.register_gift once the swap has succeeded. */
export async function registerGiftOnChain(gift: Gift, amountOut: string): Promise<void> {
  const expiresAtNs = (Date.now() * 1e6 + GIFT_TTL_NS).toString();
  try {
    await registrar().callFunction({
      contractId: config.vaultAccount,
      methodName: "register_gift",
      args: {
        key: gift.claimPublicKey,
        sender: gift.senderAccount,
        token_id: STOCKS[gift.stock].assetId,
        amount: amountOut,
        expires_at_ns: expiresAtNs,
      },
      gas: teraToGas(50),
    });
  } catch (e) {
    // Idempotency: a retry after a lost response may find the key already registered.
    if (!(e instanceof Error && e.message.includes("key already used"))) throw e;
  }
}

type StatusResponse = { status: SwapStatus; swapDetails?: { amountOut?: string } };

/**
 * Called by /api/status and /api/gift/[id] after a 1Click poll.
 * Accepts the already-fetched status so we don't double-call the API.
 * When the swap succeeds: registers the gift on the vault, then marks it FUNDED.
 * On failure/refund: marks the gift accordingly.
 * Returns the (possibly mutated) gift.
 */
export async function syncGiftFunding(gift: Gift, statusRes?: StatusResponse): Promise<Gift> {
  if (gift.status !== "AWAITING_DEPOSIT") return gift;

  // Fetch status only if not already provided.
  const s: StatusResponse = statusRes ?? (await oneClick.status(gift.depositAddress) as StatusResponse);

  if (s.status === "SUCCESS") {
    const amountOut = s.swapDetails?.amountOut ?? gift.amountOut;
    if (!amountOut) {
      console.error("register_gift skipped: no swap output amount for gift", gift.id);
      return gift;
    }
    try {
      await registerGiftOnChain(gift, amountOut);
    } catch (e) {
      console.error("register_gift failed", gift.id, e instanceof Error ? e.message : e);
      return gift; // keep polling; vault registration will be retried
    }
    gift.status = "FUNDED";
    await saveGift(gift);
  } else if (s.status === "REFUNDED" || s.status === "FAILED") {
    gift.status = s.status;
    await saveGift(gift);
  }
  return gift;
}
