import { config } from "./config";

// The claim key lives in the URL fragment (#k=...). Fragments are never sent to servers,
// so Moi can't take the gift. Never log or store `privateKey`.

export function buildGiftLink(giftId: string, privateKey: string): string {
  return `${config.appUrl}/g/${encodeURIComponent(giftId)}#k=${privateKey}`;
}

export function parseGiftHash(hash: string): string | null {
  const m = /^#?k=([A-Za-z0-9:_\-+/=.]+)$/.exec(hash);
  return m ? m[1] : null;
}
