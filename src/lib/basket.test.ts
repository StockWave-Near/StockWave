/**
 * Basket tests. Run: npm test
 * Covers the cent split, basket validation, the multi-key link format and the store.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { BASKETS, basketLegAmounts, isBasketKey, isValidBasketUsd, minBasketUsd, splitUsd } from "./baskets";
import { buildBasketLink, parseBasketHash } from "./gift-link";
import { saveBasket, getBasket, newGiftId } from "./store";
import { MAX_USD, MIN_LEG_USD, STOCKS } from "./stocks";

const KEY = "ed25519:" + "1".repeat(87);
const sum = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) * 100);

test("every basket: weights add to 100 and every stock is sendable", () => {
  for (const b of Object.values(BASKETS)) {
    assert.equal(b.legs.reduce((s, l) => s + l.weight, 0), 100, b.key);
    for (const l of b.legs) assert.ok(Object.hasOwn(STOCKS, l.stock), `${b.key}:${l.stock}`);
    assert.equal(new Set(b.legs.map((l) => l.stock)).size, b.legs.length, `${b.key} duplicate stock`);
  }
});

test("splitUsd: parts always add up to the total, to the cent", () => {
  for (const total of [6, 7, 10, 10.01, 19.99, 20, 33.33, 50, 99.99, 100]) {
    for (const b of Object.values(BASKETS)) {
      const parts = splitUsd(total, b.legs.map((l) => l.weight));
      assert.equal(sum(parts), Math.round(total * 100), `${b.key} ${total}`);
      assert.ok(parts.every((p) => p > 0));
    }
  }
});

test("splitUsd: $10 over 34/33/33 gives 3.40 / 3.30 / 3.30", () => {
  assert.deepEqual(splitUsd(10, [34, 33, 33]), [3.4, 3.3, 3.3]);
});

test("splitUsd: remainder cents go to the first leg", () => {
  assert.deepEqual(splitUsd(10.01, [50, 50]), [5.01, 5]);
});

test("basketLegAmounts follows leg order and stock keys", () => {
  const legs = basketLegAmounts(BASKETS.bold, 10);
  assert.deepEqual(legs, [{ stock: "TSLA", usd: 6 }, { stock: "GOOGL", usd: 4 }]);
});

test("minimum total keeps every leg at or above the per-swap minimum", () => {
  for (const b of Object.values(BASKETS)) {
    const min = minBasketUsd(b);
    assert.ok(isValidBasketUsd(b, min));
    assert.ok(basketLegAmounts(b, min).every((l) => l.usd >= MIN_LEG_USD), `${b.key} leg under minimum`);
    assert.ok(!isValidBasketUsd(b, min - 0.5));
  }
});

test("isValidBasketUsd rejects junk and out-of-range totals", () => {
  const b = BASKETS.bigtech;
  for (const bad of [0, -5, NaN, Infinity, MAX_USD + 1, "20", null, undefined, {}, []]) {
    assert.equal(isValidBasketUsd(b, bad), false, String(bad));
  }
  assert.equal(isValidBasketUsd(b, MAX_USD), true);
});

test("isBasketKey rejects prototype keys and unknown names", () => {
  for (const bad of ["__proto__", "constructor", "toString", "", "BIGTECH", null, 1, {}]) {
    assert.equal(isBasketKey(bad), false, String(bad));
  }
  assert.equal(isBasketKey("bigtech"), true);
});

test("basket link round-trips and keeps keys in the fragment only", () => {
  const keys = [KEY, "ed25519:" + "2".repeat(87), "ed25519:" + "3".repeat(87)];
  const link = buildBasketLink("abc123", keys);
  const [path, frag] = link.split("#");
  assert.ok(path.endsWith("/b/abc123"));
  assert.ok(!path.includes("ed25519"));
  assert.deepEqual(parseBasketHash("#" + frag, 3), keys);
});

test("parseBasketHash refuses malformed, truncated and wrong-count fragments", () => {
  const two = `#k=${KEY},${KEY}`;
  assert.equal(parseBasketHash(two, 3), null);          // wrong count
  assert.ok(parseBasketHash(two, 2));
  for (const bad of [
    "", "#", "#k=", "#k=,", `#k=${KEY},`, `#k=,${KEY}`, `#k=${KEY},short`,
    `#k=<script>alert(1)</script>`, `#k=${KEY}&x=1`, `#k=${KEY} ,${KEY}`, "#k=ed25519:abc",
    `#k=${KEY},${"ed25519:".concat("1".repeat(200))}`,
  ]) {
    assert.equal(parseBasketHash(bad), null, JSON.stringify(bad));
  }
  assert.equal(parseBasketHash("#k=" + Array(11).fill(KEY).join(",")), null); // too many
});

test("store: basket saves and loads, unknown id is undefined", async () => {
  const id = newGiftId();
  await saveBasket({
    id, basketKey: "bigtech", name: "Big Tech Trio", usd: 30, note: "hi",
    senderAccount: "a.near", legIds: ["x", "y", "z"], createdAt: new Date().toISOString(),
  });
  assert.equal((await getBasket(id))?.legIds.length, 3);
  assert.equal(await getBasket("nope-" + id), undefined);
});
