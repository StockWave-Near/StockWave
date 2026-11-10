import { randomBytes } from "node:crypto";
import type { StockKey } from "./stocks";

// In-memory store for now (resets on restart). Swap for Upstash/Vercel KV behind this interface.
// NEVER store the claim private key; only the public key lives here.
export type Gift = {
  id: string;
  stock: StockKey;
  usd: number;
  note: string;
  senderAccount: string;
  /** Recipient WhatsApp number, digits only (E.164 without +). Optional. */
  recipientPhone?: string;
  claimPublicKey: string;
  depositAddress: string;
  status: "AWAITING_DEPOSIT" | "FUNDED" | "CLAIMED" | "REFUNDED" | "FAILED";
  createdAt: string;
};

const g = globalThis as unknown as { __stockwaveGifts?: Map<string, Gift> };
const gifts = (g.__stockwaveGifts ??= new Map<string, Gift>());

export const newGiftId = () => randomBytes(9).toString("base64url");
export const saveGift = (gift: Gift) => void gifts.set(gift.id, gift);
export const getGift = (id: string) => gifts.get(id);
export const findByDeposit = (addr: string) =>
  [...gifts.values()].find((x) => x.depositAddress === addr);
export const giftsForPhone = (phone: string) =>
  [...gifts.values()]
    .filter((x) => x.recipientPhone === phone && x.status !== "FAILED")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
