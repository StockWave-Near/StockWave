import test from "node:test";
import assert from "node:assert/strict";
import { checkEligibility } from "./eligibility";
import { rateLimit } from "./rate-limit";
import { parseGiftHash, buildGiftLink } from "./gift-link";
import { handleBotMessage, shortAccount } from "./whatsapp-bot";
import { saveGift, giftsForPhone, type Gift } from "./store";
import { whatsappShareUrl } from "./whatsapp";
import { usdToUsdcUnits } from "./stocks";

const h = (c?: string) => new Headers(c ? { "x-vercel-ip-country": c } : {});

test("US and CA are blocked even with a declaration", () => {
  assert.equal(checkEligibility(h("US"), true).reason, "region_blocked");
  assert.equal(checkEligibility(h("ca"), true).reason, "region_blocked");
});
test("declaration is required", () => {
  assert.equal(checkEligibility(h("IN"), false).reason, "declaration_required");
  assert.equal(checkEligibility(h("IN"), true).eligible, true);
});
test("forged country header value is ignored", () => {
  assert.equal(checkEligibility(h("USA"), true).country, null);
});

test("rate limit blocks after the limit and resets", () => {
  const k = `t:${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(k, 3, 1000, 0), true);
  assert.equal(rateLimit(k, 3, 1000, 10), false);
  assert.equal(rateLimit(k, 3, 1000, 2000), true);
});

test("link fragment round-trips and rejects junk", () => {
  const link = buildGiftLink("abc", "ed25519:KEY");
  assert.equal(parseGiftHash(link.slice(link.indexOf("#"))), "ed25519:KEY");
  assert.equal(parseGiftHash("#k=<script>alert(1)</script>"), null);
  assert.equal(parseGiftHash("#k="), null);
  assert.equal(parseGiftHash(""), null);
});

test("usd converts to USDC base units without float drift", () => {
  assert.equal(usdToUsdcUnits(20), "20000000");
  assert.equal(usdToUsdcUnits(2.5), "2500000");
});

test("whatsapp share url encodes the message and carries the link", () => {
  const u = whatsappShareUrl({ link: "https://x.test/g/1#k=abc", stock: "Tesla", usd: 20 });
  assert.ok(u.startsWith("https://wa.me/?text="));
  assert.ok(decodeURIComponent(u).includes("https://x.test/g/1#k=abc"));
});

const gift = (over: Partial<Gift>): Gift => ({
  id: Math.random().toString(36), stock: "TSLA", usd: 20, note: "", senderAccount: "alice.near",
  claimPublicKey: "k", depositAddress: "d", status: "FUNDED", createdAt: new Date().toISOString(), ...over,
});

test("bot shows only the caller's gifts", () => {
  saveGift(gift({ recipientPhone: "111", note: "mine" }));
  saveGift(gift({ recipientPhone: "222", note: "theirs" }));
  const out = handleBotMessage("111", "gifts");
  assert.ok(out.includes("mine") && !out.includes("theirs"));
  assert.equal(giftsForPhone("333").length, 0);
});
test("bot never prints a claim key or deposit address", () => {
  saveGift(gift({ recipientPhone: "444", claimPublicKey: "SECRETKEY", depositAddress: "DEPOSITADDR" }));
  const out = handleBotMessage("444", "gifts");
  assert.ok(!out.includes("SECRETKEY") && !out.includes("DEPOSITADDR"));
});
test("bot handles unknown input and long wallet names", () => {
  assert.ok(handleBotMessage("1", "asdf").includes("help"));
  assert.ok(shortAccount("a".repeat(64) + ".near").length < 25);
});
