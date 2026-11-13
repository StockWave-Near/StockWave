import { config } from "./config";

// The claim key lives in the URL fragment (#k=...). Fragments are never sent to servers,
// so StockWave can't take the gift. Never log or store `privateKey`.

export function buildGiftLink(giftId: string, privateKey: string): string {
  return `${config.appUrl}/g/${encodeURIComponent(giftId)}#k=${privateKey}`;
}

export function parseGiftHash(hash: string): string | null {
  const m = /^#?k=([A-Za-z0-9:_\-+/=.]+)$/.exec(hash);
  return m ? m[1] : null;
}

// ── Baskets: one link, one claim key per stock ──────────────────────────────
// Link shape: /b/<basketId>#k=<key1>,<key2>,... (same order as the basket's legs).
const KEY = /^ed25519:[1-9A-HJ-NP-Za-km-z]{80,90}$/;

export function buildBasketLink(basketId: string, privateKeys: string[]): string {
  return `${config.appUrl}/b/${encodeURIComponent(basketId)}#k=${privateKeys.join(",")}`;
}

/** Returns the keys, or null if the fragment is missing, malformed or has the wrong count. */
export function parseBasketHash(hash: string, expectedKeys?: number): string[] | null {
  const m = /^#?k=([A-Za-z0-9:,]+)$/.exec(hash);
  if (!m) return null;
  const keys = m[1].split(",");
  if (keys.length < 1 || keys.length > 10 || !keys.every((k) => KEY.test(k))) return null;
  if (expectedKeys !== undefined && keys.length !== expectedKeys) return null;
  return keys;
}
