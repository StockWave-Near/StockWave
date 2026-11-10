// Every Ondo tokenized asset available through NEAR Intents (1Click /v0/tokens?ondoTokens=true).
// Snapshot taken 10 Nov 2026: 28 assets, all `nep141:bnb-0x....omdep.near`. Prices are indicative.
export type OndoAsset = {
  ticker: string;
  name: string;
  category: "Stocks" | "ETFs" | "Bonds & cash" | "Portfolios";
  /** Logo image URL: brand SVG (Simple Icons CDN) for companies, Ondo token icon (CoinGecko) otherwise. */
  logo: string | null;
  color: string;
  price: number;
  assetId: string;
};

export const ONDO_SNAPSHOT_DATE = "10 Nov 2026";
export const SENDABLE = ["GOOGL", "AAPL", "TSLA"];

export const ONDO_CATALOG: OndoAsset[] = [
  {
    "ticker": "AAPL",
    "name": "Apple",
    "category": "Stocks",
    "color": "#1d1d1f",
    "price": 348.56,
    "assetId": "nep141:bnb-0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4.omdep.near",
    "logo": "https://cdn.simpleicons.org/apple/1d1d1f"
  },
  {
    "ticker": "AMZN",
    "name": "Amazon",
    "category": "Stocks",
    "color": "#FF9900",
    "price": 268.88,
    "assetId": "nep141:bnb-0x4553cfe1c09f37f38b12dc509f676964e392f8fc.omdep.near",
    "logo": "https://cdn.simpleicons.org/amazon/FF9900"
  },
  {
    "ticker": "CRCL",
    "name": "Circle",
    "category": "Stocks",
    "color": "#00A88F",
    "price": 64.16,
    "assetId": "nep141:bnb-0x992879cd8ce0c312d98648875b5a8d6d042cbf34.omdep.near",
    "logo": "https://cdn.simpleicons.org/circle/00A88F"
  },
  {
    "ticker": "GOOGL",
    "name": "Google (Alphabet Class A)",
    "category": "Stocks",
    "color": "#4285F4",
    "price": 287.29,
    "assetId": "nep141:bnb-0x091fc7778e6932d4009b087b191d1ee3bac5729a.omdep.near",
    "logo": "https://cdn.simpleicons.org/google/4285F4"
  },
  {
    "ticker": "HOOD",
    "name": "Robinhood",
    "category": "Stocks",
    "color": "#00C805",
    "price": 80.49,
    "assetId": "nep141:bnb-0x19601179a60f55ff6636f5d1a8b6671053bd60a8.omdep.near",
    "logo": "https://cdn.simpleicons.org/robinhood/00C805"
  },
  {
    "ticker": "INTC",
    "name": "Intel",
    "category": "Stocks",
    "color": "#0071C5",
    "price": 57.43,
    "assetId": "nep141:bnb-0xa528caaa2f96090e379d43f90834c75df54d6e74.omdep.near",
    "logo": "https://cdn.simpleicons.org/intel/0071C5"
  },
  {
    "ticker": "META",
    "name": "Meta Platforms",
    "category": "Stocks",
    "color": "#0866FF",
    "price": 641.77,
    "assetId": "nep141:bnb-0xd7df5863a3e742f0c767768cdfcb63f09e0422f6.omdep.near",
    "logo": "https://cdn.simpleicons.org/meta/0866FF"
  },
  {
    "ticker": "MRVL",
    "name": "Marvell Technology",
    "category": "Stocks",
    "color": "#A6192E",
    "price": 152.23,
    "assetId": "nep141:bnb-0x1501ec83ffef405b4331cc4f73277a40fb0c627d.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68560/large/mrvlon_160x160.png?1756105919"
  },
  {
    "ticker": "MSFT",
    "name": "Microsoft",
    "category": "Stocks",
    "color": "#00A4EF",
    "price": 543.82,
    "assetId": "nep141:bnb-0x6bfe75d1ad432050ea973c3a3dcd88f02e2444c3.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68625/large/msfton_160x160.png?1756130286"
  },
  {
    "ticker": "NVDA",
    "name": "Nvidia",
    "category": "Stocks",
    "color": "#76B900",
    "price": 167.74,
    "assetId": "nep141:bnb-0xa9ee28c80f960b889dfbd1902055218cba016f75.omdep.near",
    "logo": "https://cdn.simpleicons.org/nvidia/76B900"
  },
  {
    "ticker": "TSLA",
    "name": "Tesla",
    "category": "Stocks",
    "color": "#CC0000",
    "price": 376.29,
    "assetId": "nep141:bnb-0x2494b603319d4d9f9715c9f4496d9e0364b59d93.omdep.near",
    "logo": "https://cdn.simpleicons.org/tesla/CC0000"
  },
  {
    "ticker": "GLD",
    "name": "SPDR Gold Shares",
    "category": "ETFs",
    "color": "#C9A227",
    "price": 369.51,
    "assetId": "nep141:bnb-0xfa9a1e901085e269f6d428f79cd5252d8b919344.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/71467/large/gldon_160x160.png?1767891536"
  },
  {
    "ticker": "IAU",
    "name": "iShares Gold Trust",
    "category": "ETFs",
    "color": "#C9A227",
    "price": 75.61,
    "assetId": "nep141:bnb-0xcb2a0f46f67dc4c58a316f1c008edef5c2311795.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68653/large/iauon_160x160.png?1756156321"
  },
  {
    "ticker": "QQQ",
    "name": "Invesco QQQ (Nasdaq-100)",
    "category": "ETFs",
    "color": "#2C7BE5",
    "price": 672.38,
    "assetId": "nep141:bnb-0x0cde6936d305d5b34667fc46425e852efd73559a.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68654/large/qqqon_160x160.png?1756156339"
  },
  {
    "ticker": "SLV",
    "name": "iShares Silver Trust",
    "category": "ETFs",
    "color": "#7C8794",
    "price": 46.28,
    "assetId": "nep141:bnb-0x8b872732b07be325a8803cdb480d9d20b6f8d11b.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68651/large/slvon_160x160.png?1756156286"
  },
  {
    "ticker": "SPY",
    "name": "SPDR S&P 500 ETF",
    "category": "ETFs",
    "color": "#1F5FBF",
    "price": 751.09,
    "assetId": "nep141:bnb-0x6a708ead771238919d85930b5a0f10454e1c331a.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68655/large/spyon_160x160.png?1756156354"
  },
  {
    "ticker": "AGG",
    "name": "iShares Core US Aggregate Bond ETF",
    "category": "Bonds & cash",
    "color": "#3F7D58",
    "price": 96.92,
    "assetId": "nep141:bnb-0x08ce97f3d5cf11e577d091ab048bc5e2eae3fabb.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68561/large/aggon_160x160.png?1756105956"
  },
  {
    "ticker": "SGOV",
    "name": "iShares 0-3 Month Treasury ETF",
    "category": "Bonds & cash",
    "color": "#3F7D58",
    "price": 102.93,
    "assetId": "nep141:bnb-0xc008c5f579ec1450f20099c39f587547e27c7523.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/71432/large/sgovon_160x160.png?1767882893"
  },
  {
    "ticker": "TIP",
    "name": "iShares TIPS Bond ETF",
    "category": "Bonds & cash",
    "color": "#3F7D58",
    "price": 109.48,
    "assetId": "nep141:bnb-0x2ac26ec236df5d1d2ad1a6dd4e448a90e45dc35d.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68542/large/tipon_160x160.png?1756105129"
  },
  {
    "ticker": "TLT",
    "name": "iShares 20+ Year Treasury Bond ETF",
    "category": "Bonds & cash",
    "color": "#3F7D58",
    "price": 84.81,
    "assetId": "nep141:bnb-0xf69e40069ac227c11459e3f4e8a446b3401616b6.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68647/large/tlton_160x160.png?1756156198"
  },
  {
    "ticker": "USD",
    "name": "Ondo U.S. Dollar Token",
    "category": "Bonds & cash",
    "color": "#2C3A22",
    "price": 1,
    "assetId": "nep141:bnb-0x1f8955e640cbd9abc3c3bb408c9e2e1f5f20dfe6.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/68688/large/usdon_160x160.png?1756268513"
  },
  {
    "ticker": "BLKDIG",
    "name": "Ondo Diversified Growth (BlackRock)",
    "category": "Portfolios",
    "color": "#6B4FBB",
    "price": 4.78,
    "assetId": "nep141:bnb-0xe658c62195f32bc53226e7e2642e3d76b4382fb8.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/102178495/large/blkdigon_160x160.png?1790049763"
  },
  {
    "ticker": "BLKGRW",
    "name": "Ondo High Growth (BlackRock)",
    "category": "Portfolios",
    "color": "#6B4FBB",
    "price": 4.75,
    "assetId": "nep141:bnb-0xe4bd77247671746caa3119e9feaa146f8a4ee237.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/102178496/large/blkgrwon_160x160.png?1790049822"
  },
  {
    "ticker": "BLKHI",
    "name": "Ondo High Income (BlackRock)",
    "category": "Portfolios",
    "color": "#6B4FBB",
    "price": 4.96,
    "assetId": "nep141:bnb-0xf78155dc15b838b7577002bc53bbe1041ca48622.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/102178494/large/blkhion_160x160.png?1790049641"
  },
  {
    "ticker": "BRAIN",
    "name": "Ondo AI Leaders Portfolio",
    "category": "Portfolios",
    "color": "#6B4FBB",
    "price": 4.1,
    "assetId": "nep141:bnb-0x0574e53f8214d0402c8388b4402113a74354d1b0.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/102178491/large/brainon_160x160.png?1789709616"
  },
  {
    "ticker": "MAG7X",
    "name": "Ondo Magnificent 7 & Crypto Portfolio",
    "category": "Portfolios",
    "color": "#6B4FBB",
    "price": 5.16,
    "assetId": "nep141:bnb-0x50436ec45316a98e72b03ead5752e8543f11ec09.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/102178490/large/mag7xon_160x160.png?1789709376"
  },
  {
    "ticker": "YLD5",
    "name": "Ondo 5% Targeted Income Portfolio",
    "category": "Portfolios",
    "color": "#6B4FBB",
    "price": 4.99,
    "assetId": "nep141:bnb-0x0cfd1030e2431e0fa15d4cc3f3e43076fe93f8f9.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/102178492/large/brainon_160x160.png?1789709823"
  },
  {
    "ticker": "YLD8",
    "name": "Ondo 8% Targeted Income Portfolio",
    "category": "Portfolios",
    "color": "#6B4FBB",
    "price": 4.96,
    "assetId": "nep141:bnb-0x2f20d5dfbaffa3e6351e06b8b18059747cd7ee72.omdep.near",
    "logo": "https://coin-images.coingecko.com/coins/images/102178493/large/brainon_160x160.png?1789709953"
  }
];
