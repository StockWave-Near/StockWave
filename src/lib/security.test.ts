/**
 * StockWave security test suite.
 * Run: npm test
 *
 * Target: 40+ attack scenarios, all refused.
 * Coverage areas:
 *   A. Region gate & eligibility
 *   B. Rate limiting
 *   C. Gift link parsing (XSS, truncation, tampering)
 *   D. Input validation (amounts, accounts, public keys, phones)
 *   E. WhatsApp share safety (key-leak, encoding)
 *   F. Bot privacy (key/address not exposed, per-phone isolation)
 *   G. Referrer / fragment safety (structural)
 *   H. Idempotency
 *   I. Store isolation
 */

import test from "node:test";
import assert from "node:assert/strict";
import { checkEligibility } from "./eligibility";
import { rateLimit } from "./rate-limit";
import { parseGiftHash, buildGiftLink } from "./gift-link";
import { handleBotMessage, shortAccount } from "./whatsapp-bot";
import { saveGift, giftsForPhone, getGift, getIdem, setIdem, newGiftId, type Gift } from "./store";
import { whatsappShareUrl } from "./whatsapp";
import { usdToUsdcUnits, MIN_USD, MAX_USD, isStockKey } from "./stocks";

// ─── helpers ──────────────────────────────────────────────────────────────────

const h = (c?: string) => new Headers(c ? { "x-vercel-ip-country": c } : {});
const cfH = (c: string) => new Headers({ "cf-ipcountry": c });

function makeGift(over: Partial<Gift> = {}): Gift {
  return {
    id: newGiftId(),
    stock: "TSLA",
    usd: 20,
    note: "",
    senderAccount: "alice.near",
    claimPublicKey: "ed25519:AAAA",
    depositAddress: `deposit-${Math.random()}`,
    status: "FUNDED",
    createdAt: new Date().toISOString(),
    ...over,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// A. REGION GATE & ELIGIBILITY
// ═══════════════════════════════════════════════════════════════════════════

test("A01 US blocked even with declaration", () => {
  assert.equal(checkEligibility(h("US"), true).reason, "region_blocked");
});

test("A02 CA blocked even with declaration", () => {
  assert.equal(checkEligibility(h("CA"), true).reason, "region_blocked");
});

test("A03 lowercase 'ca' still blocked", () => {
  assert.equal(checkEligibility(h("ca"), true).reason, "region_blocked");
});

test("A04 US blocked via Cloudflare header", () => {
  assert.equal(checkEligibility(cfH("US"), true).reason, "region_blocked");
});

test("A05 declaration is required even for allowed country", () => {
  assert.equal(checkEligibility(h("IN"), false).reason, "declaration_required");
});

test("A06 valid country + declaration is eligible", () => {
  assert.equal(checkEligibility(h("IN"), true).eligible, true);
});

test("A07 unknown country (no header) is allowed when declared", () => {
  assert.equal(checkEligibility(h(), true).eligible, true);
  assert.equal(checkEligibility(h(), true).country, null);
});

test("A08 forged 3-letter country code is ignored", () => {
  assert.equal(checkEligibility(h("USA"), true).country, null);
});

test("A09 forged numeric country string is ignored", () => {
  assert.equal(checkEligibility(h("123"), true).country, null);
});

test("A10 HTTP Headers API trims header values (space-padded US is treated as US)", () => {
  // The browser and server both normalize header values by stripping whitespace,
  // so " US" becomes "US" before it reaches our code. This is correct behavior —
  // we confirm it here so the expectation is documented.
  const result = checkEligibility(h(" US"), true);
  assert.equal(result.reason, "region_blocked", "trimmed ' US' should still be blocked");
});

// ═══════════════════════════════════════════════════════════════════════════
// B. RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

test("B01 rate limit allows up to the limit", () => {
  const k = `rl:${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(k, 3, 1000, 0), true, `call ${i + 1}`);
});

test("B02 rate limit blocks the next call over the limit", () => {
  const k = `rl:${Math.random()}`;
  for (let i = 0; i < 3; i++) rateLimit(k, 3, 1000, 0);
  assert.equal(rateLimit(k, 3, 1000, 10), false);
});

test("B03 rate limit resets after the window", () => {
  const k = `rl:${Math.random()}`;
  for (let i = 0; i < 3; i++) rateLimit(k, 3, 1000, 0);
  assert.equal(rateLimit(k, 3, 1000, 2000), true);
});

test("B04 different keys have independent counters", () => {
  const k1 = `rl:${Math.random()}`;
  const k2 = `rl:${Math.random()}`;
  for (let i = 0; i < 3; i++) rateLimit(k1, 3, 1000, 0);
  assert.equal(rateLimit(k1, 3, 1000, 10), false);
  assert.equal(rateLimit(k2, 3, 1000, 10), true);
});

test("B05 limit=1 allows exactly one call", () => {
  const k = `rl:${Math.random()}`;
  assert.equal(rateLimit(k, 1, 1000, 0), true);
  assert.equal(rateLimit(k, 1, 1000, 0), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// C. GIFT LINK PARSING — XSS, TAMPERING, TRUNCATION
// ═══════════════════════════════════════════════════════════════════════════

test("C01 valid key round-trips through build/parse", () => {
  const link = buildGiftLink("abc123", "ed25519:KEY");
  assert.equal(parseGiftHash(link.slice(link.indexOf("#"))), "ed25519:KEY");
});

test("C02 XSS in fragment is rejected", () => {
  assert.equal(parseGiftHash("#k=<script>alert(1)</script>"), null);
});

test("C03 empty key is rejected", () => {
  assert.equal(parseGiftHash("#k="), null);
});

test("C04 missing fragment is rejected", () => {
  assert.equal(parseGiftHash(""), null);
});

test("C05 fragment without k= is rejected", () => {
  assert.equal(parseGiftHash("#notakey"), null);
});

test("C06 key with SQL injection characters is rejected", () => {
  assert.equal(parseGiftHash("#k='; DROP TABLE gifts;--"), null);
});

test("C07 key with URL-encoded data is rejected (not in allowed charset)", () => {
  assert.equal(parseGiftHash("#k=%3Cscript%3E"), null);
});

test("C08 key with newline is rejected", () => {
  assert.equal(parseGiftHash("#k=abc\ndef"), null);
});

test("C09 key with space is rejected", () => {
  assert.equal(parseGiftHash("#k=abc def"), null);
});

test("C10 valid base58 key with colons and alphanumerics is accepted", () => {
  // This is what a real ed25519 NEAR key looks like.
  const key = "ed25519:3TQQ4VKBQS62QKJZ93VXT2nQJsGJVcLc4EvHHZ7mV6Rk";
  assert.equal(parseGiftHash(`#k=${key}`), key);
});

test("C11 link giftId is URL-encoded", () => {
  const link = buildGiftLink("ab/cd", "ed25519:KEY");
  assert.ok(!link.includes("/ab/cd"));
  assert.ok(link.includes(encodeURIComponent("ab/cd")));
});

// ═══════════════════════════════════════════════════════════════════════════
// D. INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

test("D01 usd converts to USDC base units without float drift at $20", () => {
  assert.equal(usdToUsdcUnits(20), "20000000");
});

test("D02 usd converts correctly at $2.50", () => {
  assert.equal(usdToUsdcUnits(2.5), "2500000");
});

test("D03 usd converts correctly at $0.01", () => {
  assert.equal(usdToUsdcUnits(0.01), "10000");
});

test("D04 MIN_USD is 6 (1Click has no liquidity at $5)", () => {
  assert.equal(MIN_USD, 6);
  assert.ok(5 < MIN_USD && 6 >= MIN_USD);
});

test("D05 MAX_USD is 100", () => {
  assert.equal(MAX_USD, 100);
});

test("D06 isStockKey accepts known keys", () => {
  assert.equal(isStockKey("GOOGL"), true);
  assert.equal(isStockKey("AAPL"), true);
  assert.equal(isStockKey("TSLA"), true);
});

test("D07 isStockKey rejects unknown tickers", () => {
  assert.equal(isStockKey("NVDA"), false);
  assert.equal(isStockKey(""), false);
  assert.equal(isStockKey(null), false);
  assert.equal(isStockKey(42), false);
});

test("D08 isStockKey rejects prototype-pollution attempt", () => {
  assert.equal(isStockKey("__proto__"), false);
  assert.equal(isStockKey("constructor"), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// E. WHATSAPP SHARE SAFETY — KEY-LEAK, ENCODING
// ═══════════════════════════════════════════════════════════════════════════

test("E01 share url starts with wa.me", () => {
  const u = whatsappShareUrl({ link: "https://x.test/g/1#k=abc" });
  assert.ok(u.startsWith("https://wa.me/"));
});

test("E02 share url encodes the gift link in the message", () => {
  const link = "https://x.test/g/1#k=SECRET";
  const u = whatsappShareUrl({ link });
  assert.ok(decodeURIComponent(u).includes(link), "link must appear in the message");
});

test("E03 the raw #k=SECRET does not appear unencoded outside the message param", () => {
  // The key may appear inside the encoded text= value, but must not appear raw in the URL
  // in a position that could become a new fragment or query param.
  const u = whatsappShareUrl({ link: "https://x.test/g/1#k=RAWSECRET" });
  const afterTextParam = u.slice(u.indexOf("text=") + 5);
  // Decoded value should contain the link (fine), but the URL itself before the text param
  // must not have an unencoded fragment.
  assert.ok(!u.slice(0, u.indexOf("text=")).includes("#"));
});

test("E04 sender name has .near suffix stripped in message", () => {
  const u = whatsappShareUrl({ link: "https://x.test/g/1#k=x", senderName: "alice.near" });
  const decoded = decodeURIComponent(u);
  assert.ok(decoded.includes("alice"), "name should appear");
  assert.ok(!decoded.includes("alice.near"), ".near suffix should be stripped");
});

test("E05 phone number is stripped of non-digits", () => {
  const u = whatsappShareUrl({ link: "https://x.test/g/1#k=x", phone: "+91 98765 43210" });
  assert.ok(u.startsWith("https://wa.me/919876543210?"));
});

test("E06 no phone produces an open wa.me link", () => {
  const u = whatsappShareUrl({ link: "https://x.test/g/1#k=x" });
  assert.ok(u.startsWith("https://wa.me/?text="));
});

test("E07 message says 'gifted', not 'token'", () => {
  const u = whatsappShareUrl({ link: "https://x.test/g/1#k=x", stock: "Tesla", usd: 20 });
  const decoded = decodeURIComponent(u);
  assert.ok(!decoded.toLowerCase().includes("token"), "jargon 'token' must not appear");
  assert.ok(decoded.toLowerCase().includes("gift"), "friendly 'gift' should appear");
});

// ═══════════════════════════════════════════════════════════════════════════
// F. BOT PRIVACY & PER-PHONE ISOLATION
// ═══════════════════════════════════════════════════════════════════════════

test("F01 bot shows only the caller's gifts", async () => {
  await saveGift(makeGift({ recipientPhone: "5551110001", note: "mine-f01" }));
  await saveGift(makeGift({ recipientPhone: "5552220001", note: "theirs-f01" }));
  const out = await handleBotMessage("5551110001", "gifts");
  assert.ok(out.includes("mine-f01"), "own gift must appear");
  assert.ok(!out.includes("theirs-f01"), "other phone's gift must not appear");
});

test("F02 phone with no gifts returns a helpful message", async () => {
  const out = await handleBotMessage("0000000000", "gifts");
  assert.ok(out.toLowerCase().includes("no gifts"));
});

test("F03 bot never prints the claim public key", async () => {
  await saveGift(makeGift({ recipientPhone: "5553330001", claimPublicKey: "SECRETPUBKEY" }));
  const out = await handleBotMessage("5553330001", "gifts");
  assert.ok(!out.includes("SECRETPUBKEY"), "claim key must never appear in bot output");
});

test("F04 bot never prints the deposit address", async () => {
  await saveGift(makeGift({ recipientPhone: "5554440001", depositAddress: "DEPOSITADDR-F04" }));
  const out = await handleBotMessage("5554440001", "gifts");
  assert.ok(!out.includes("DEPOSITADDR-F04"), "deposit address must never appear");
});

test("F05 bot handles unknown input gracefully", async () => {
  const out = await handleBotMessage("1", "asdf_xyz");
  assert.ok(out.toLowerCase().includes("help"), "unknown input should show help");
});

test("F06 bot handles empty input gracefully (shows welcome)", async () => {
  const out = await handleBotMessage("1", "");
  assert.ok(out.toLowerCase().includes("google") || out.toLowerCase().includes("hi"));
});

test("F07 shortAccount truncates long wallet names", () => {
  const long = "a".repeat(50) + ".near";
  const short = shortAccount(long);
  assert.ok(short.length < 25, `expected <25 chars, got ${short.length}`);
  assert.ok(short.includes("…"), "should include ellipsis");
});

test("F08 shortAccount leaves short names unchanged", () => {
  assert.equal(shortAccount("alice.near"), "alice.near");
});

test("F09 FAILED gifts are hidden from the bot listing", async () => {
  const phone = "5559990001";
  await saveGift(makeGift({ recipientPhone: phone, status: "FAILED", note: "failed-gift" }));
  const list = await giftsForPhone(phone);
  assert.ok(!list.some((g) => g.status === "FAILED"), "FAILED gifts must be filtered out");
});

test("F10 bot shows up to 10 gifts", async () => {
  const phone = "5558880001";
  for (let i = 0; i < 12; i++) {
    await saveGift(makeGift({ recipientPhone: phone }));
  }
  const out = await handleBotMessage(phone, "gifts");
  // Count how many numbered lines appear (1. 2. ... 10. but not 11. or 12.)
  const lines = out.match(/^\d+\./gm) ?? [];
  assert.ok(lines.length <= 10, `bot showed ${lines.length} items, expected ≤10`);
});

// ═══════════════════════════════════════════════════════════════════════════
// G. REFERRER / FRAGMENT STRUCTURAL SAFETY
// ═══════════════════════════════════════════════════════════════════════════

test("G01 gift link places key in fragment, not query string", () => {
  const link = buildGiftLink("id1", "ed25519:KEY");
  const url = new URL(link);
  assert.ok(!url.search.includes("KEY"), "key must not be in query string");
  assert.ok(url.hash.includes("KEY"), "key must be in fragment");
});

test("G02 gift link fragment is not part of the path", () => {
  const link = buildGiftLink("id1", "ed25519:KEY");
  const url = new URL(link);
  assert.ok(!url.pathname.includes("KEY"), "key must not be in pathname");
});

test("G03 giftId is not confused with the key", () => {
  const link = buildGiftLink("the-gift-id", "ed25519:THEKEY");
  assert.ok(link.includes("the-gift-id"), "gift id must be in URL");
  assert.ok(!link.includes("the-gift-id".toUpperCase()), "id casing is preserved");
});

// ═══════════════════════════════════════════════════════════════════════════
// H. IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════

test("H01 idempotency store round-trips a value", async () => {
  const k = `idem:${Math.random()}`;
  await setIdem(k, { result: "ok", id: "abc" });
  const v = await getIdem(k) as { result: string; id: string };
  assert.equal(v.result, "ok");
  assert.equal(v.id, "abc");
});

test("H02 missing idempotency key returns null", async () => {
  const v = await getIdem(`idem:missing-${Math.random()}`);
  assert.equal(v, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// I. STORE ISOLATION
// ═══════════════════════════════════════════════════════════════════════════

test("I01 saved gift can be retrieved by id", async () => {
  const g = makeGift();
  await saveGift(g);
  const loaded = await getGift(g.id);
  assert.ok(loaded, "gift should exist");
  assert.equal(loaded.id, g.id);
  assert.equal(loaded.usd, g.usd);
});

test("I02 unknown gift id returns undefined", async () => {
  const loaded = await getGift("definitely-does-not-exist-xyz");
  assert.equal(loaded, undefined);
});

test("I03 updating gift status persists", async () => {
  const g = makeGift({ status: "AWAITING_DEPOSIT" });
  await saveGift(g);
  g.status = "FUNDED";
  await saveGift(g);
  const loaded = await getGift(g.id);
  assert.equal(loaded?.status, "FUNDED");
});

test("I04 giftsForPhone returns only gifts for that phone", async () => {
  const phone = "9991112222";
  const other = "9993334444";
  await saveGift(makeGift({ recipientPhone: phone, note: "correct" }));
  await saveGift(makeGift({ recipientPhone: other, note: "wrong" }));
  const list = await giftsForPhone(phone);
  assert.ok(list.every((g) => g.recipientPhone === phone), "only the right phone's gifts");
});

test("I05 newGiftId generates unique ids", () => {
  const ids = new Set(Array.from({ length: 100 }, newGiftId));
  assert.equal(ids.size, 100, "ids should be unique");
});
