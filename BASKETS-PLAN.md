# Baskets: gift several stocks with one link

Status: started 13 Nov 2026. Deadline 14 Nov 23:59 UTC. Owner: Ayush (UI/flow).

## Idea
Instead of one stock, the sender picks a ready-made **basket** (for example "Big Tech Trio": Google, Apple, Tesla) and a dollar amount. The friend opens **one link** and claims every stock in it with one tap.

## Design decision: a basket is N ordinary gifts
The vault contract only handles one token per claim key. Rather than change a deployed, tested contract, a basket is **one gift per stock** (a "leg"), each with its own claim key and its own 1Click quote and deposit address.

| Piece | How |
|---|---|
| Split | `splitUsd(usd, weights)` works in whole cents, remainder goes to the first leg. Total always equals what the sender typed |
| Legs | Each leg is a normal `Gift` with `basketId` set. Existing funding sync, `register_gift` and `claim` are reused unchanged |
| Keys | Browser makes one ed25519 keypair per leg. Link is `/b/<basketId>#k=<key1>,<key2>,<key3>`. Fragment never reaches the server, same as single gifts |
| Funding | Sender pays one small USDC deposit per leg. UI lists each leg with its amount, address and live status. Link appears when **every** leg is funded |
| Claim | `/b/<id>` page: sign in once, then call `/api/claim` once per leg. Each leg reports done or failed, failed legs can be retried |
| Vault | No change. Fewer risks, no redeploy |

### Why not one deposit?
1Click swaps one asset pair per quote, so one deposit can only buy one stock. One-tap funding (a single NEAR transaction with N `ft_transfer` actions to the different deposit addresses) is the next step, see "Later".

## Baskets shipped in v1 (only the 3 sendable stocks)
| Key | Name | Mix |
|---|---|---|
| `bigtech` | Big Tech Trio | Google 34, Apple 33, Tesla 33 |
| `steady` | Steady Duo | Google 50, Apple 50 |
| `bold` | Bold Duo | Tesla 60, Google 40 |

Minimum per leg is `MIN_LEG_USD` = $6. Real 1Click quotes on 13 Nov returned "No liquidity available" for $5 on Google, Apple and Tesla, and worked from $6. A basket's minimum is the smallest whole-dollar total where every leg still reaches $6 after the split ($19 for Big Tech Trio, because the 33% legs of $18 would be $5.94). A test checks this.

The single-gift minimum (`MIN_USD`) was raised to $6 for the same reason, and the $5 chip was removed. Maximum stays `MAX_USD` ($100) in total.

## Task list
- [x] Plan (this file)
- [x] `src/lib/baskets.ts`: definitions, `splitUsd`, validation
- [x] `Gift.basketId`, `Basket` type, `saveBasket` / `getBasket` in the store
- [x] `POST /api/basket`: validate, one real quote per leg, save legs and basket, return deposits
- [x] `GET /api/basket/[id]`: public info and per-leg status (syncs funding, never returns keys or deposit addresses)
- [x] Builder: "Single stock / Basket" switch, basket cards, split preview, funding list, ready screen
- [x] Claim page `/b/[id]`: one sign-in, claim all legs, per-leg result
- [x] `parseBasketHash` and basket tests in `src/lib/basket.test.ts`
- [ ] Try it against real 1Click with an API key (needs `ONECLICK_API_KEY`)
- [ ] Real claim of a 2-leg basket on testnet (needs funded vault and registrar)
- [ ] WhatsApp: bot lists baskets by phone (legs do not carry the phone number yet)
- [ ] Open Graph preview for `/b/[id]`
- [ ] Mobile check of the funding list and basket claim page

## Later (not in v1)
- One-tap funding: single NEAR transaction with one `ft_transfer` per leg.
- Custom baskets (sender picks stocks and weights) and ETF/bond baskets once those assets are enabled for sending.
- A "basket notebook" entry so the notebook page shows one line per basket.

## Risks
- A leg can fail while others succeed (refund or 1Click error). The basket link stays usable for funded legs. The UI says which leg failed. The sender's USDC for a failed leg is refunded by 1Click to `refundTo` (the sender).
- Several deposits are more steps for the sender. Fine for the demo; one-tap funding fixes it.
- Same rate limits and region gate as single gifts. Basket creation is limited to 3 per minute per IP because it makes one quote per leg.
