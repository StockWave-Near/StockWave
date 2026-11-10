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
  claimPublicKey: string;
  depositAddress: string;
  status: "AWAITING_DEPOSIT" | "FUNDED" | "CLAIMED" | "REFUNDED" | "FAILED";
  createdAt: string;
};

const g = globalThis as unknown as { __moiGifts?: Map<string, Gift> };
const gifts = (g.__moiGifts ??= new Map<string, Gift>());

export const newGiftId = () => randomBytes(9).toString("base64url");
export const saveGift = (gift: Gift) => void gifts.set(gift.id, gift);
export const getGift = (id: string) => gifts.get(id);
export const findByDeposit = (addr: string) =>
  [...gifts.values()].find((x) => x.depositAddress === addr);
