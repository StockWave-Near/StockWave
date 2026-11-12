import { Account, JsonRpcProvider, teraToGas, type KeyPairString } from "near-api-js";
import { config } from "./config";
import { oneClick } from "./oneclick";
import { saveGift, type Gift } from "./store";
import { STOCKS } from "./stocks";

const GIFT_TTL_NS = 30 * 24 * 3600 * 1e9; // sender can reclaim after 30 days

/** Registrar key (server-only). Must belong to the vault's `registrar` account. */
function registrar(): Account {
  const key = process.env.NEAR_REGISTRAR_PRIVATE_KEY;
  if (!key || !config.vaultAccount) throw new Error("vault registrar not configured");
  return new Account(config.vaultAccount, new JsonRpcProvider({ url: config.nearRpc }), key as KeyPairString);
}

/** vault.register_gift: records the gift and adds its link key as a claim-only access key. */
export async function registerGiftOnChain(gift: Gift, amountOut: string): Promise<void> {
  // Nanosecond precision is irrelevant for a 30-day expiry, so a double is fine here.
  const expiresAtNs = Date.now() * 1e6 + GIFT_TTL_NS;
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
    // A retry after a lost response finds the key already registered: that is success.
    if (!(e instanceof Error && e.message.includes("key already used"))) throw e;
  }
}

/**
 * Called whenever we look at a gift that is waiting for its swap. When 1Click reports
 * SUCCESS we register the gift on the vault FIRST, and only then mark it FUNDED, so a
 * FUNDED gift always has its claim key on-chain. On failure the gift stays
 * AWAITING_DEPOSIT and the next poll retries.
 */
export async function syncGiftFunding(gift: Gift): Promise<Gift> {
  if (gift.status !== "AWAITING_DEPOSIT") return gift;
  const s = await oneClick.status(gift.depositAddress);
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
      return gift;
    }
    gift.status = "FUNDED";
    await saveGift(gift);
  } else if (s.status === "REFUNDED" || s.status === "FAILED") {
    gift.status = s.status;
    await saveGift(gift);
  }
  return gift;
}
