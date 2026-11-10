# StockWave on NEAR: architecture and build plan

Give a friend their first stock as a link. They sign in with Google, own a real tokenized share, and never see a wallet, seed phrase or gas fee.

Hackathon: development ends **14 Nov 2026, 23:59 UTC**. Today is 9 Nov, so there are about 5 days.
Tracks to tag: **Real-World Money (RWM)**, **Social Money (SOC)**, **Open Innovation (NEW)**. Stretch: **Agent Economy (AGT)** via the agent CLI.

Legend: **[V]** = verified from docs I read. **[U]** = unverified, check in the first 2 hours (see the checklist).

---

## 1. What we build

1. **Sender** picks a stock (Nvidia, Apple, QQQ and so on) and a dollar amount, and pays from any chain (USDC on NEAR is the demo path).
2. StockWave creates a **gift link**. The link carries a one-time claim key in the URL fragment (`#k=...`), so the server never sees it.
3. **Friend** opens the link, signs in with Google, and sees "You've been given $20 of Nvidia".
4. One tap on **Claim**. A relayer pays the gas. The tokenized share lands in the friend's account.
5. Every gift is written to the **StockWave notebook**, a small NEAR contract. This is the Tamil wedding idea: the gift is written down so it can be returned one day. A "Return the favour" button re-gifts.

What is different from the BNB version: Binance APIs are replaced by NEAR Intents (1Click) and Ondo stocks, b402 gas-wrapping is replaced by a NEAR meta-transaction relayer, and Google login comes from a social-login provider.

## 2. System diagram

```
 SENDER (browser)                                   FRIEND (browser)
 ┌──────────────────────┐                           ┌──────────────────────┐
 │ Next.js app          │                           │ Next.js claim page   │
 │ 1 pick stock+amount  │                           │ /g/<giftId>#k=<key>  │
 │ 2 dry quote + checks │                           │ 1 Google login       │
 │ 3 fund gift          │                           │ 2 claim (no gas)     │
 └─────────┬────────────┘                           └──────────┬───────────┘
           │                                                   │
           ▼                                                   ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ StockWave backend (Next.js route handlers / small Node service)              │
 │  /api/quote      → 1Click POST /v0/quote (dry:true, then dry:false)     │
 │  /api/gift       → create gift record, return link                       │
 │  /api/status     → 1Click GET /v0/status?depositAddress=...             │
 │  /api/relay      → submit NEP-366 DelegateAction (relayer pays gas)     │
 │  /api/eligible   → geo + sanctions-style region check                   │
 │  rate limits, idempotency, relayer spend cap                            │
 └───────┬───────────────────┬───────────────────────┬────────────────────┘
         │                   │                       │
         ▼                   ▼                       ▼
 ┌───────────────┐   ┌───────────────┐       ┌─────────────────────────┐
 │ NEAR Intents  │   │ NEAR RPC      │       │ stockwave-notebook.<you>.near │
 │ 1Click API    │   │ (FastNEAR /   │       │ (contract: gift log,    │
 │ quote/status  │   │  mainnet RPC) │       │  return-the-favour)     │
 │ Ondo stocks   │   │ account, ft,  │       └─────────────────────────┘
 └───────────────┘   │ tx submit     │
                     └───────────────┘
```

## 3. Port map from the BNB version (reference repo, updated after reading it)

Reference: `github.com/ramakrishnanhulk20/Moi` (MIT, created 7 Oct 2026). I read its README, `ARCHITECTURE.md` and file tree. The shape carries over; the chain-specific parts get rewritten for NEAR.

> **Eligibility warning.** The hackathon says "code written since the announcement counts" (announced before 1 Nov). That repo was created 7 Oct and last pushed 10 Oct, so it is pre-existing work. Start a **new repo** with fresh commits, port the ideas, and state in the README that the design comes from your BNB Hack entry. Do not paste the old repo in. If the rules page or HACKATHON.md says anything about prior work, follow it; if unclear, ask the organizers in Discord today.

| BNB version | NEAR version | Effort |
|---|---|---|
| `GiftVault.sol` (holds gift, claim by link key, sender reclaim after expiry, owner can pause but not move gifts) | `stockwave-vault` in **Rust (near-sdk)**: same invariants. Claim uses a **function-call access key** (section 4) | Medium: new language, small contract |
| Binance **RWA Data** (prices, market open) | `GET /v0/tokens` and dry quotes from 1Click: price, decimals | Low |
| Binance **Trading** (swap) | `POST /v0/quote` (1Click) | Low–medium |
| Binance **Transaction simulate** | `dry:true` quote + RPC checks of the user's balances and storage registration | Low |
| **b402** 5-cent gift wrap | 1Click `appFees` (basis points to StockWave's Intents account), or an x402-style payment check via OutLayer for the agent flow [U] | Low |
| **Binance Agentic Wallet** agent (`packages/agent`) | `stockwave` CLI that holds a NEAR key (or an OutLayer agent wallet [U]) and runs the same create-gift flow | Medium |
| **Privy** (Google/email → wallet) | Keep Privy if it supports NEAR [U]; else Web3Auth, or another provider that yields an ed25519 key | Medium: biggest unknown |
| Relayer wallet pays claim gas | **Vault account pays gas** through the function-call key's allowance. A relayer with NEP-366 stays as a fallback | Low (simpler than before) |
| `eligibility.ts` (region block, "I am not a US person" declaration) | Keep as is; re-check Ondo's terms [U] | Low |
| Upstash KV: claim records, locks, nonces, rate limits | Keep | Low |
| `core/http.ts` single dispatcher with caps and fixed error codes | Keep | Low |
| `docs/security/threat-model.md` (invariants C1–C50), `attacks/` scripts, 60-attack run | Port the invariants that still apply, rewrite the attack scripts for NEAR calls | Medium |
| Foundry tests (fuzz, invariant, reentrancy) | `near-workspaces` sandbox tests; NEAR has no reentrancy in the EVM sense, but async callbacks need their own tests (failed transfer, partial failure) | Medium |
| `uiMultiplier()` (dividends shown as shares) | Check how Ondo tokens report share ratios [U] | Low–medium |
| Next.js web, claim page, judge gifts page, docs page | Reuse layout and copy; swap wallet and chain calls | Medium |

What the BNB flow looks like (from its `ARCHITECTURE.md`), and the NEAR twin:

```
BNB:  quote → approve + swap → approve vault → createGift(token, amount, claimKey, expiry, note, keyProof)
      → wrap fee (402/b402) → link /g/{id}#{claimKey} → friend: Privy wallet signs claim → relayer calls claim

NEAR: quote(1Click) → swap lands in sender's NEAR account
      → vault.register_gift (payable: storage + key allowance; adds the link's function-call key)
      → token.ft_transfer_call(vault, amount, msg={gift_id, expiry, note}) → ft_on_transfer records the gift
      → link /g/{id}#{linkPrivateKey} → friend logs in → link key calls vault.claim(recipient)
      → vault storage-registers the friend on the token and ft_transfers the share
```

## 3b. NEAR-native design: claim with a function-call key

(Preferred design. Section 3c, the escrow-key idea, is the fallback.)

This is the classic NEAR linkdrop pattern, and it is the cleanest fit for "no gas, no wallet".

1. The sender's browser generates an ed25519 keypair. The **public key** is registered on the **vault account** as a **function-call access key** limited to `receiver_id = vault` and `method_names = ["claim"]`, with a small gas allowance. The **private key** goes in the link fragment (`#k=`), so the server never sees it.
2. The contract maps `public_key → gift`. In `claim`, it reads `env::signer_account_pk()` and releases **only that key's gift**. One key cannot touch another gift.
3. The friend's page signs a transaction *as the vault account* using the link key, calling `claim({ recipient })`. **The vault account pays the gas** out of its balance (bounded by the key's allowance), so the friend needs no NEAR and StockWave needs no relayer service.
4. In the same call, the vault runs `storage_deposit` for the recipient on the token contract if needed, then `ft_transfer`. A callback restores the gift if the transfer fails (same idea as the BNB vault's `after_ft_transfer` re-credit).
5. After the claim, the key is deleted (`DeleteKey`) so it cannot be reused.
6. The sender can `reclaim` after expiry (signed by the sender's own account). Expired keys are deleted then too.

Rules the contract must keep (port of the BNB invariants):
- Only the gift's link key can release it, and only once.
- Only the sender can reclaim, and only after expiry.
- Owner can pause and edit the token allowlist but **cannot move a gift**. No upgrade path (no deploy key left on the account after deploy; lock it by deleting full-access keys, and say so in the docs).
- Token allowlist is checked in `ft_on_transfer` (reject unknown tokens).
- A failed `ft_transfer` never loses the gift.
- The vault holds a gas treasury; an alert fires when it is low; per-key allowance limits drain.

Cost to plan for: each gift adds a key (small storage stake) and an allowance. Charge it to the sender in `register_gift` (attach about 0.05 NEAR), or subsidize it from the `appFees` income.

Open question [U]: which receiver interface the stocks use. If they are plain **NEP-141** tokens on NEAR, use `ft_on_transfer` and `ft_transfer`. If they only exist as **NEP-245** balances inside the Intents verifier contract, the vault implements `mt_on_transfer` and claims by calling the verifier's transfer. The vault design stays the same. Settle this with the section 9 checklist.

## 3c. Fallback: escrow-key claim (use if the vault route is blocked)

A friend with no wallet has no NEAR account when the sender buys the stock. Use the **claim-link escrow** pattern.

1. Backend or sender's browser generates an **ed25519 keypair per gift**. The public key is registered as the gift's *escrow account* (an implicit NEAR account derived from the public key, or an Intents account with that id).
2. The 1Click quote sends the stock to that escrow account (`recipient` = escrow account id).
3. The **private key goes only in the link fragment**. Fragments are not sent to servers, so StockWave cannot take the gift. Say so in the pitch ("non-custodial gift links").
4. On claim, the friend's Google-derived account is the destination. The escrow key signs a **DelegateAction** (NEP-366) that transfers the token to the friend. The **relayer** wraps it in a transaction and pays gas. The friend and the escrow account never hold NEAR.
5. The relayer also does `storage_deposit` for the friend on the token contract if needed.

Two possible shapes. Pick one after the checklist in section 9:

- **Shape A, on-chain token (nep141 on NEAR).** If the Ondo token has a normal NEAR contract, the escrow implicit account holds it and the flow above works with `ft_transfer`.
- **Shape B, inside Intents (nep245 in the verifier contract).** If stocks only live as Intents balances, use `recipientType: INTENTS` with the escrow account id. Claiming means a signed **transfer intent** from the escrow account to the friend's account id, submitted by the relayer. Keep the same link design.

Fallback if both fail within 4 hours: skip the escrow key. Make the friend log in first, then have the sender's quote use `recipientType: INTENTS` and the friend's account as `recipient`. The link flow becomes "sender invites, friend logs in, sender (or a pending-gift page) funds". It is less magical but still works.

## 4. Components

### 4.1 Frontend (Next.js + TypeScript)
- `/` create gift: stock picker, amount, note, "pay with" (USDC on NEAR; optional origin chain).
- `/g/[id]` claim page: reads `#k` locally, Google login, shows gift, claim button, success screen with a "Return the favour" button.
- `/notebook` public page listing gifts (sender, hashed recipient label, asset, amount, note, date). It shows the notebook idea.
- Tailwind for UI. Keep the claim page to one screen. No jargon: "share", not "token".

### 4.2 Social login
- **Web3Auth** or **Privy** (Google → ed25519 key → NEAR account). [U] Confirm which supports NEAR directly today; if neither does, derive an ed25519 key from the Google session in the provider's MPC and use its public key as an implicit account.
- Do not use anything deprecated. If a NEAR-native option (a wallet with email/Google login) is simple to embed, use that.

### 4.3 Backend
- Next.js route handlers on Vercel, or a small Fastify service if the relayer needs a long-lived process.
- Stores gift records in SQLite / Vercel KV: `{ id, escrowAccountId, depositAddress, status, assetId, amountIn, createdAt, claimedAt }`. **Never store the private key.**
- Relayer account `stockwave-relayer.near` with a small NEAR balance and a daily spend cap.

### 4.4 StockWave notebook contract (Rust or TypeScript near-sdk-js)
- `record_gift(sender, escrow_account, asset, amount_usd, note_hash)`; `mark_claimed(gift_id, recipient)`; `get_gifts(from, limit)`.
- Optional `return_gift(prev_gift_id)` links a new gift to the one that inspired it ("returned one day").
- Small and deployable in a day. If time is short, make it log-only (events via `env::log_str`) and skip storage.

### 4.5 Agent mode (stretch, AGT track)
- A `stockwave` CLI or MCP tool: `stockwave send --to-link --stock NVDA --usd 20`, which calls the same backend and prints the link. Demo it once in the video: an agent sends a gift from the terminal.

## 5. APIs and protocols

| Piece | What for | Status |
|---|---|---|
| **1Click API** `https://1click.chaindefuser.com` | `GET /v0/tokens` (find Ondo asset ids), `POST /v0/quote`, `GET /v0/status`, `POST /v0/deposit/submit` | [V] endpoints exist |
| `GET /v0/tokens?ondoTokens=...` | Lists Ondo tokenized stocks. The docs mention the query param but give no token list | [U] call it and save the result |
| Quote fields | `dry`, `swapType: EXACT_INPUT`, `slippageTolerance` (bps), `originAsset`, `destinationAsset`, `amount` (base units string), `depositType`, `recipient`, `recipientType` (`DESTINATION_CHAIN` / `INTENTS`), `refundTo`, `refundType`, `deadline`, `referral`, `appFees` | [V] |
| Asset id format | `nep141:<chain>-<address>.omft.near` | [V] examples |
| Status values | `PENDING_DEPOSIT`, `PROCESSING`, `SUCCESS`, `REFUNDED`, `FAILED`, others | [V] |
| API key | `X-API-Key`. Without it an extra 0.25% fee applies. With a key: 0.20%, or 0.01% for stablecoin pairs. Get one at partners.near-intents.org | [V] |
| `appFees` | StockWave's "wrap fee" (like the 5 cent b402 wrap). Basis points to an Intents account | [V] |
| **Ondo stocks on NEAR Intents** | 20 products at launch (Tesla, Nvidia, Apple, Microsoft, Amazon, QQQ, SLV, IAU, ...) | Announced 22 Sep 2026 (news); exact list [U] |
| **Eligibility** | Reports say US and Canada users are blocked | [U] read Ondo terms; add a region gate and warning |
| **NEP-366** meta-transactions | Relayer pays gas via `DelegateAction` | NEAR standard |
| **NEP-141** `ft_transfer`, `storage_deposit` | Move Shape A tokens and register accounts | NEAR standard |
| **NEP-245** | Multi-token balances in the Intents verifier (Shape B) | [U] |
| NEAR RPC | FastNEAR or the public mainnet RPC. Use two providers with failover | standard |

**Price display.** Use the dry quote (`amountOutUsd`, `amountOut`) so what the sender sees equals what the swap will do. Show a "this is a tokenized share, not a brokerage account" line.

**Dry run before anyone signs.** (This is the BNB "Transaction simulate" equivalent.) Before funding: (1) `dry:true` quote; (2) check the destination token and escrow account exist; (3) check the sender balance; (4) show "you will pay X, they will receive Y".

## 6. Data flow, step by step

**Create**
1. Sender picks NVDA, $20. Frontend calls `/api/quote` → 1Click `dry:true`.
2. Frontend shows price, fee, ETA.
3. Frontend generates the escrow keypair locally, derives the escrow account id.
4. `/api/quote` calls 1Click `dry:false` with `recipient = escrow`, `refundTo = sender`. Response gives `depositAddress`.
5. Sender sends USDC to `depositAddress` (wallet pop-up, or QR code for other chains). Frontend calls `/v0/deposit/submit` with the tx hash.
6. Frontend polls `/api/status` until `SUCCESS`. Then it writes the gift to the notebook contract and shows the link `https://stockwave.example/g/<id>#k=<escrowPrivateKey>`.

**Claim**
1. Friend opens the link. The page reads `#k`, checks the escrow account balance via RPC (is the stock there?).
2. Friend logs in with Google. Page derives the friend's account id.
3. Page builds a DelegateAction (escrow key signs): `storage_deposit` + `ft_transfer` to friend (Shape A) or a transfer intent (Shape B).
4. `/api/relay` wraps and submits. On success, calls `mark_claimed`.
5. Success screen shows the share in the friend's account, with "Return the favour".

**Refund path.** If the link is never claimed, the sender can reclaim after N days (needs the sender to keep the key, so offer "save to my account" in the create step) and 1Click refunds go to `refundTo` if the swap fails. Show both clearly.

## 7. Security and the "60 attacks" suite

Port your BNB attack list. Write each as an automated test and show the pass count in the demo ("N attacks, all refused").

- Replay a claim after it succeeded; claim with a wrong key; claim from two tabs at once.
- Relayer abuse: calls for unrelated contracts, huge gas, a flood of requests (allowlist methods, per-IP and per-gift limits, daily cap).
- Link tampering: truncated fragment, swapped gift id, XSS in the note field.
- Quote tampering: change `amount`, `recipient` or `refundTo` between dry and real quote (server re-derives everything from its own gift record).
- Region gate bypass attempts (VPN is out of scope; say so).
- Fragment leak: confirm the key never appears in logs, analytics, referrer headers (`Referrer-Policy: no-referrer`).
- Dust or fee-grief: tiny amounts below minimum (reject).

## 8. Tech stack

Next.js 15 + TypeScript + Tailwind, `near-api-js` (or `@near-js/*`), the social-login SDK, Vitest for the attack suite, Playwright for one end-to-end run, near-sdk (Rust) or near-sdk-js for the notebook contract, Vercel for hosting, FastNEAR RPC. You already have working Next.js scaffolding in `snipe-proof-meme-launch/` that you can copy the project setup from.

## 9. First-2-hours verification checklist (do this before writing features)

1. `curl "https://1click.chaindefuser.com/v0/tokens?ondoTokens=1"`. Does it list NVDA, AAPL, QQQ? Save the ids to `docs/assets.json`.
2. Is the stock a NEAR `nep141` contract, or only an Intents balance? (Decides Shape A vs B.)
3. Dry quote USDC (NEAR) → NVDA with `recipientType: DESTINATION_CHAIN`, then with `INTENTS`, and a recipient that is an implicit account id. Which are accepted?
4. Apply for a 1Click API key (partners.near-intents.org).
5. Pick the social-login provider and confirm it yields a NEAR-usable ed25519 key.
6. Read Ondo's eligibility terms: which countries, any KYC step for the receiver. Decide the on-screen wording.
7. Buy $2 of a stock on mainnet by hand to confirm the whole path works.

## 10. Build plan (9–14 Nov)

| Day | Goal | Done when |
|---|---|---|
| **Mon 9 Nov** | Checklist above. Scaffold app and repo. Quote + status API routes working with a dry quote in the UI | You have one real $2 swap on mainnet and the asset ids saved |
| **Tue 10 Nov** | Create flow end to end: escrow key, real quote, deposit, status polling, link | A link exists whose escrow account holds a stock |
| **Wed 11 Nov** | Claim flow: social login, DelegateAction, relayer, storage deposit | A second browser claims the stock with no NEAR in the account |
| **Thu 12 Nov** | Notebook contract, notebook page, region gate, error and refund states, the attack suite (aim for 40+) | Attack suite green; failed paths show friendly messages |
| **Fri 13 Nov** | Polish UI, mobile check, agent CLI (stretch), README, architecture diagram, record the demo | Demo video recorded; repo public |
| **Sat 14 Nov** | Post on X, submit form **well before 23:59 UTC**, tag @NEARProtocol and #NEARHackathon | Submission confirmation received |

Cut order if behind: agent CLI → return-the-favour → notebook contract (use a plain log page) → extra attack tests.

## 11. Demo plan (90 seconds)

1. **0:00** One-line pitch over the StockWave create page: "Give a friend their first Nvidia share as a link."
2. **0:10** Pick NVDA, $20. Show the dry-run line: "You pay 20.04 USDC, they receive about 0.14 NVDA, nothing is signed yet."
3. **0:25** Pay, watch the status tick to success, copy the link.
4. **0:40** Open the link in a **clean browser profile** on a phone-sized window. Sign in with Google. Press Claim. No wallet install, no gas prompt.
5. **0:55** Show the share in the new account and the entry on the public notebook page.
6. **1:05** Two seconds on the Tamil explanation: the notebook is how the gift can be returned one day. Press "Return the favour".
7. **1:15** Show the attack suite: "60 attacks, all refused" (terminal screenshot).
8. **1:25** If built: agent sends a gift from the terminal. End on the repo link.

Post on X: the video, one sentence on the problem, one on how NEAR Intents + Ondo + meta-transactions make it work, tag @NEARProtocol and #NEARHackathon. Say "built at NEAR HACKATHON".

## 12. Submission copy (draft, 20–2,000 characters)

> StockWave lets anyone give a friend their first stock as a link. The sender picks a company and an amount; the friend opens the link, signs in with Google, and owns a tokenized share, with no wallet app, seed phrase or gas. Built on NEAR: NEAR Intents' 1Click API routes payment from any chain into Ondo's tokenized stocks, gift links use a one-time escrow key kept in the URL fragment so StockWave never holds funds, and a NEP-366 relayer pays gas at claim time. A small NEAR contract, the "StockWave notebook", records each gift so it can be returned one day, from the Tamil custom of writing wedding gifts in a family notebook. Includes a 60-test attack suite, a dry-run preview before anyone signs, and an agent CLI for sending gifts from the terminal.

Edit it to match what is actually built. Do not claim features you cut.

## 13. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Stocks not deliverable to a social-login account | Core flow breaks | Shape A/B/fallback in section 3; test on day 1 |
| Region restrictions | Some recipients blocked | Region gate, honest messaging, demo from an eligible region |
| 1Click quote expires or minimums too high | Failed demo | Pre-fund a backup gift; keep amounts above the minimum |
| Social-login provider lacks NEAR support | Claim flow stalls | Derive implicit account from provider key; or use a NEAR-native wallet login |
| Reused BNB code does not count | Eligibility | Write fresh code; reuse only ideas and the attack list |
| Mainnet funds at risk | Money loss | Small amounts, relayer cap, separate demo wallets |

## 14. What I need from you

- A NEAR mainnet wallet with ~$30 of USDC and ~2 NEAR for the relayer and tests.
- A 1Click API key (apply today).
- A Google OAuth client or the social-login provider's app id.
- A domain or Vercel project name.
- Your NEAR wallet address for the submission form and your team size.
- A decision on Shape A or B after the checklist, and the StockWave BNB repo link so I can copy the attack list.

## 15. Update 10 Nov: what the live API showed, and why this is a NEAR project

Checked against `GET /v0/tokens?ondoTokens=true` on 10 Nov 2026:
- Main stocks: **GOOGLon, AAPLon, TSLAon** (also NVDA, MSFT, AMZN, META, QQQ, SPY and more). Ids are in `src/lib/stocks.ts`.
- They are `nep141:bnb-0x….omdep.near` assets: Ondo tokens that originate on BNB Chain and are held as **balances inside NEAR Intents**. So this is **Shape B**: the share is not a plain NEP-141 on NEAR; it lives in the Intents account of whoever owns it. Use `recipientType: INTENTS`.
- A dry quote USDC(NEAR) → GOOGLon returned `500 Internal server error`, with and without ms in the deadline. Probably needs an API key or the pair is not enabled yet. **Still unverified, check first thing.**

Why NEAR is doing real work (the pitch):
1. **NEAR Intents** is the only payment and delivery rail: pay in USDC from any chain, receive the stock as an Intents balance, no bridges for the user.
2. **NEAR accounts from Google login** (implicit ed25519 account) give the friend a real on-chain account with no wallet install.
3. **Function-call access keys** are native to NEAR. The gift link carries one; it can only call `claim` on the vault. This is what makes "no gas, no wallet, non-custodial link" possible, and it has no equivalent on EVM.
4. **Vault pays gas** (or NEP-366 meta-transactions as fallback).
5. **Notebook contract** on NEAR records gifts for "return the favour".
6. Agent track: the `stockwave` CLI sends gifts through the same APIs.

### Update 10 Nov (evening): full Ondo list and UI

- 28 Ondo assets are available through NEAR Intents: 11 stocks (AAPL, AMZN, CRCL, GOOGL, HOOD, INTC, META, MRVL, MSFT, NVDA, TSLA), 5 ETFs (GLD, IAU, QQQ, SLV, SPY), 5 bonds and cash (AGG, SGOV, TIP, TLT, USDon), 7 portfolios (MAG7X, BRAIN, YLD5, YLD8, BLKHI, BLKDIG, BLKGRW). All are `nep141:bnb-0x....omdep.near`. Snapshot in `src/lib/ondo-catalog.ts`.
- Only GOOGL, AAPL and TSLA are accepted by the API for now; the rest show as "Coming soon".
- UI built: landing page, gift builder with dry-run preview, full catalog, FAQ, footer, sage-badge logo. Still open: create-link flow, funding screen, claim page.
- Region gate, rate limits, idempotency and a first security test suite are in place (`npm test`).
