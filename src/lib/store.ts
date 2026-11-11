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

// ---------------------------------------------------------------------------
// KV adapter — uses Upstash Redis when env vars are set, falls back to in-memory.
// Swap only this section when you add a real DB; callers stay the same.
// ---------------------------------------------------------------------------

type KVAdapter = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  keys: (prefix: string) => Promise<string[]>;
};

function makeMemoryAdapter(): KVAdapter {
  const g = globalThis as unknown as { __stockwaveKV?: Map<string, unknown> };
  const store = (g.__stockwaveKV ??= new Map<string, unknown>());
  return {
    get: async (k) => store.get(k) ?? null,
    set: async (k, v) => void store.set(k, v),
    keys: async (prefix) => [...store.keys()].filter((k) => k.startsWith(prefix)),
  };
}

function makeUpstashAdapter(): KVAdapter {
  // Upstash REST API — no extra npm package needed: just fetch.
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  async function cmd<T>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(`${url}/${args.map(encodeURIComponent).join("/")}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { result: T };
    return body.result;
  }

  return {
    get: async (key) => {
      const raw = await cmd<string | null>("GET", key);
      return raw ? JSON.parse(raw) : null;
    },
    set: async (key, value) => {
      await cmd("SET", key, JSON.stringify(value));
    },
    keys: async (prefix) => {
      return cmd<string[]>("KEYS", `${prefix}*`);
    },
  };
}

const kv: KVAdapter =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? makeUpstashAdapter()
    : makeMemoryAdapter();

// ---------------------------------------------------------------------------
// Public interface (unchanged from before — callers don't need to know about KV)
// ---------------------------------------------------------------------------

export const newGiftId = () => randomBytes(9).toString("base64url");

export async function saveGift(gift: Gift): Promise<void> {
  await kv.set(`gift:${gift.id}`, gift);
  if (gift.recipientPhone) {
    // Secondary index: phone → list of gift ids (append with Set)
    const existing = ((await kv.get(`phone:${gift.recipientPhone}`)) as string[] | null) ?? [];
    if (!existing.includes(gift.id)) {
      await kv.set(`phone:${gift.recipientPhone}`, [...existing, gift.id]);
    }
  }
  await kv.set(`deposit:${gift.depositAddress}`, gift.id);
}

export async function getGift(id: string): Promise<Gift | undefined> {
  return ((await kv.get(`gift:${id}`)) as Gift | null) ?? undefined;
}

export async function findByDeposit(addr: string): Promise<Gift | undefined> {
  const id = (await kv.get(`deposit:${addr}`)) as string | null;
  return id ? getGift(id) : undefined;
}

export async function giftsForPhone(phone: string): Promise<Gift[]> {
  const ids = ((await kv.get(`phone:${phone}`)) as string[] | null) ?? [];
  const all = await Promise.all(ids.map(getGift));
  return (all.filter(Boolean) as Gift[])
    .filter((g) => g.status !== "FAILED")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// All gifts — used by the public notebook page. Fetches via the gift:* key pattern.
export async function getAllGifts(): Promise<Gift[]> {
  const keys = await kv.keys("gift:");
  const all = await Promise.all(keys.map((k) => kv.get(k) as Promise<Gift | null>));
  return all.filter(Boolean) as Gift[];
}

// Idempotency: same Idempotency-Key returns the original response instead of a second gift.
export async function getIdem(k: string): Promise<unknown> {
  return kv.get(`idem:${k}`);
}
export async function setIdem(k: string, v: unknown): Promise<void> {
  return kv.set(`idem:${k}`, v);
}
