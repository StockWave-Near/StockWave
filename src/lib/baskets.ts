import { MAX_USD, MIN_LEG_USD, type StockKey } from "./stocks";

// A basket is a fixed mix of the stocks that can be sent today.
// Weights are whole percents and always add up to 100.
export type BasketLeg = { stock: StockKey; weight: number };
export type BasketDef = { key: string; name: string; tagline: string; legs: BasketLeg[] };

export const BASKETS: Record<string, BasketDef> = {
  bigtech: {
    key: "bigtech",
    name: "Big Tech Trio",
    tagline: "Google, Apple and Tesla in one gift",
    legs: [
      { stock: "GOOGL", weight: 34 },
      { stock: "AAPL", weight: 33 },
      { stock: "TSLA", weight: 33 },
    ],
  },
  steady: {
    key: "steady",
    name: "Steady Duo",
    tagline: "Google and Apple, split evenly",
    legs: [
      { stock: "GOOGL", weight: 50 },
      { stock: "AAPL", weight: 50 },
    ],
  },
  bold: {
    key: "bold",
    name: "Bold Duo",
    tagline: "Tesla-led, with Google",
    legs: [
      { stock: "TSLA", weight: 60 },
      { stock: "GOOGL", weight: 40 },
    ],
  },
};

export type BasketKey = keyof typeof BASKETS;
export const isBasketKey = (k: unknown): k is BasketKey =>
  typeof k === "string" && Object.hasOwn(BASKETS, k);

/**
 * Smallest whole-dollar total where every leg, after the cent split, is at or above the
 * per-swap minimum. (Just legs x $6 is not enough: $18 over 34/33/33 leaves a $5.94 leg.)
 */
export const minBasketUsd = (b: BasketDef): number => {
  for (let usd = b.legs.length * MIN_LEG_USD; usd <= MAX_USD; usd++) {
    if (splitUsd(usd, b.legs.map((l) => l.weight)).every((p) => p >= MIN_LEG_USD)) return usd;
  }
  return MAX_USD;
};

export const isValidBasketUsd = (b: BasketDef, usd: unknown): usd is number =>
  typeof usd === "number" && Number.isFinite(usd) && usd >= minBasketUsd(b) && usd <= MAX_USD;

/**
 * Split a dollar amount across weights in whole cents. The remainder goes to the first leg,
 * so the parts always add up to exactly the total the sender typed.
 */
export function splitUsd(usd: number, weights: number[]): number[] {
  const totalCents = Math.round(usd * 100);
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.floor((totalCents * w) / sum));
  parts[0] += totalCents - parts.reduce((a, b) => a + b, 0);
  return parts.map((c) => c / 100);
}

export function basketLegAmounts(b: BasketDef, usd: number): { stock: StockKey; usd: number }[] {
  const amounts = splitUsd(usd, b.legs.map((l) => l.weight));
  return b.legs.map((l, i) => ({ stock: l.stock, usd: amounts[i] }));
}
