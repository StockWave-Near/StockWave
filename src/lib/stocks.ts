// Main stocks for the demo. Asset ids come from GET /v0/tokens?ondoTokens=true (checked 10 Nov 2026).
// They are Ondo tokenized stocks held as NEAR Intents (omdep.near) balances; origin chain is BNB.
export const USDC_NEAR =
  "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
export const USDC_DECIMALS = 6;

export const STOCKS = {
  GOOGL: {
    symbol: "GOOGLon",
    name: "Google (Alphabet)",
    assetId: "nep141:bnb-0x091fc7778e6932d4009b087b191d1ee3bac5729a.omdep.near",
    decimals: 18,
  },
  AAPL: {
    symbol: "AAPLon",
    name: "Apple",
    assetId: "nep141:bnb-0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4.omdep.near",
    decimals: 18,
  },
  TSLA: {
    symbol: "TSLAon",
    name: "Tesla",
    assetId: "nep141:bnb-0x2494b603319d4d9f9715c9f4496d9e0364b59d93.omdep.near",
    decimals: 18,
  },
} as const;

export type StockKey = keyof typeof STOCKS;
export const isStockKey = (k: unknown): k is StockKey =>
  typeof k === "string" && Object.hasOwn(STOCKS, k);

// 1Click returns "No liquidity available" for swaps of about $5 or less (checked 13 Nov 2026:
// $5 fails, $6 and up quotes), so no gift or basket leg may be smaller than this.
export const MIN_USD = 6;
export const MAX_USD = 100; // demo cap
// Each basket leg is its own swap, so legs use the same floor.
export const MIN_LEG_USD = MIN_USD;

export function usdToUsdcUnits(usd: number): string {
  return String(Math.round(usd * 10 ** USDC_DECIMALS));
}
