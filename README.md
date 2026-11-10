<div align="center">

# StockWave

**Send a share like you send a text.**

Gift a friend their first stock as a link. They sign in with Google, own a real tokenized share, and never see a wallet, seed phrase or gas fee.

`NEAR Intents` · `Ondo tokenized stocks` · `Function-call access keys` · `WhatsApp` · `Next.js 16` · `Rust (near-sdk)`

</div>

> Built for the **NEAR Hackathon** (development ends 14 Nov 2026, 23:59 UTC). Tracks: Real-World Money, Social Money, Open Innovation. Stretch: Agent Economy.
> The product idea comes from the author's earlier BNB Hack entry. All code in this repository is new and written for NEAR.

---

## Table of contents

1. [The problem](#the-problem)
2. [How it works](#how-it-works)
3. [Why NEAR](#why-near)
4. [WhatsApp bot](#whatsapp-bot)
5. [Project status](#project-status)
6. [Architecture](#architecture)
7. [API reference](#api-reference)
8. [Smart contract](#smart-contract)
9. [Getting started](#getting-started)
10. [Security model](#security-model)
11. [Known issues and open questions](#known-issues-and-open-questions)
12. [Team and documentation](#team-and-documentation)

---

## The problem

Owning a stock for the first time is full of friction: a brokerage account, identity checks, a bank link. Crypto removes some of that but adds its own: wallets, seed phrases, gas. People who would happily receive a stock as a gift never get one because the first step is too hard.

## How it works

1. **Pick.** The sender chooses a stock (Google, Apple or Tesla) and an amount, and sees a dry-run preview of what the friend will receive. Nothing is signed yet.
2. **Pay.** The sender pays in USDC from any chain. NEAR Intents (the 1Click API) swaps it into an Ondo tokenized stock.
3. **Link.** The sender's browser generates a one-time claim keypair. Only the public key goes to the server. The private key is placed in the link fragment (`/g/<id>#k=...`), which browsers never send to any server.
4. **Share.** The sender shares the link over WhatsApp, copies it, or uses the phone's share sheet.
5. **Claim.** The friend opens the link, signs in with Google and taps Claim. The link's key calls the vault, the vault pays the gas, and the share lands in the friend's account.

```
 SENDER                                                  FRIEND
 pick stock + amount ─► dry quote (nothing signed)
 pay USDC (any chain) ─► NEAR Intents 1Click ─► share held by the StockWave vault
 browser creates claim keypair (public key only → server)
 link = /g/<id>#k=<private key>   (fragment never leaves the browser)
 share on WhatsApp / copy / share sheet
                                                         open link ─► Google login ─► Claim
                                                         link key calls vault.claim(recipient)
                                                         vault pays gas ─► share in friend's account
```

## Why NEAR

| NEAR capability | What it gives StockWave |
|---|---|
| **NEAR Intents (1Click)** | One payment and delivery rail: pay from any chain, receive a tokenized stock, no bridging for the user. |
| **Function-call access keys** | The gift link carries a key that can only call `claim` on the vault, for that single gift. This is what makes links non-custodial and gasless. EVM chains have no direct equivalent. |
| **Implicit accounts from social login** | The friend gets a real on-chain account from a Google sign-in, with no wallet install. |
| **Vault-paid gas** | The vault pays for the claim, bounded by a per-key allowance. NEP-366 meta-transactions are the fallback. |
| **On-chain notebook** (planned) | Each gift is recorded so it can be returned one day, inspired by the Tamil custom of writing wedding gifts in a family notebook. |

## WhatsApp bot

A simple bot for people who would rather not open a website. Its job is onboarding and answering one question: *who sent me a gift?*

| Message | Reply |
|---|---|
| `hi` | A three-line welcome in plain words and the list of commands. |
| `gifts` | Gifts sent to your number: sender wallet, amount, stock, status. Example: `1. $20 of Tesla from alice.near: ready to claim` |
| `stocks` | The stocks available (Google, Apple, Tesla). |
| `help` | The command list. |

The bot never holds or sends a claim key. The key exists only in the link the sender shared, so the bot points people back to that link. Incoming webhooks are verified with Meta's HMAC signature. Senders can also share a gift with a prefilled `wa.me` message, which needs no API keys.

## Project status

| Area | Status |
|---|---|
| Next.js 16 project, configuration, `.env.example` | Done |
| 1Click client: tokens, quote, status, deposit submit | Done |
| Stock configuration (GOOGL, AAPL, TSLA) with live asset ids | Done |
| API: tokens, status, dry quote, gift create, gift info | Done |
| Gift link builder and parser (key kept in the fragment) | Done |
| WhatsApp share link and `POST /api/whatsapp/share` | Done |
| WhatsApp bot logic and signed webhook | Done, needs a Meta app to go live |
| Vault contract (Rust) with 14 passing unit tests | Done, testnet deploy pending |
| Web UI: create page, claim page | Not started |
| Browser claim flow and Google login provider | Not started |
| Backend call to register a funded gift on the vault | Not started |
| Notebook contract and "Return the favour" | Not started |
| Region gate and eligibility declaration | Not started |
| Persistent database (gifts are in memory today) | Not started |
| Rate limits, idempotency, attack test suite | Not started |
| Agent CLI (stretch) | Not started |

The working checklist lives in [`PLAN.md`](./PLAN.md).

## Architecture

```
 Browser (Next.js)            Backend (Next.js route handlers)              External
 ┌────────────────┐           ┌─────────────────────────────────┐
 │ create / claim │──────────►│ /api/quote   dry quote          │──────►  1Click API
 │ pages (planned)│           │ /api/gift    real quote + record│──────►  (quote, status)
 └────────────────┘           │ /api/status  swap status        │
                              │ /api/whatsapp/share, /webhook   │──────►  WhatsApp Cloud API
                              └───────────────┬─────────────────┘
                                              │ register_gift (planned)
                                              ▼
                              ┌─────────────────────────────────┐
                              │ stockwave-vault (Rust contract) │──────►  NEAR Intents
                              │ claim by function-call key      │         (holds balances)
                              └─────────────────────────────────┘
```

```
src/
  app/api/            route handlers (quote, gift, status, tokens, whatsapp)
  lib/                1Click client, stock config, gift store, link helpers, WhatsApp, bot
contracts/
  stockwave-vault/    Rust smart contract and unit tests
ARCHITECTURE.md       full design, fallbacks, security list, build and demo plan
PLAN.md               task list and owners
```

## API reference

| Route | Request | Response |
|---|---|---|
| `GET /api/tokens` | none | 1Click token list |
| `POST /api/quote` | `{ stock: "GOOGL" \| "AAPL" \| "TSLA", usd }` | Dry quote. Amount limits: $2 to $100. |
| `POST /api/gift` | `{ stock, usd, note?, recipientPhone?, senderAccount, claimPublicKey }` | `{ id, depositAddress, quote }` |
| `GET /api/gift/[id]` | none | `{ id, stock, name, usd, note, status }` (never returns keys or deposit address) |
| `GET /api/status` | `?depositAddress=` | 1Click swap status |
| `POST /api/whatsapp/share` | `{ link, senderName?, stock?, usd?, phone? }` | `{ url }` for `wa.me` |
| `GET/POST /api/whatsapp/webhook` | Meta webhook | Handshake and bot replies |

## Smart contract

`contracts/stockwave-vault` is a Rust contract (near-sdk 5.15.1). Each gift is tied to one ed25519 public key, added to the vault as a function-call key limited to `claim`.

| Method | Caller | Behaviour |
|---|---|---|
| `register_gift` | Registrar (backend) | Records a funded gift and adds its `claim`-only key with a small gas allowance. |
| `claim(recipient)` | Link key | Removes the gift first, then pays out through the Intents contract. A failed payout restores the gift. |
| `reclaim(key)` | Original sender | Only after expiry. Returns the gift and deletes the key. |
| `set_paused`, `allow_token`, `disallow_token`, `set_registrar` | Owner | Operational controls. The owner cannot move or redirect a gift. |

There is no upgrade or migrate method.

```bash
cd contracts/stockwave-vault
cargo test          # 14 unit tests
cargo near build    # when ready to deploy
```

## Getting started

Requirements: Node.js 20 or newer, Rust 1.93 or newer (for the contract).

```bash
cp .env.example .env.local
npm install
npm run dev
```

| Variable | Purpose |
|---|---|
| `ONECLICK_API_KEY` | 1Click API key (partners.near-intents.org). Without it, higher fees apply. |
| `STOCKWAVE_VAULT_ACCOUNT` | NEAR account of the deployed vault. |
| `NEXT_PUBLIC_APP_URL` | Public base URL used to build gift links. |
| `NEAR_RPC_URL` | NEAR RPC endpoint. |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API credentials (optional). |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | Webhook handshake and signature verification (optional). |

## Security model

- The claim private key exists only in the link fragment. It is never sent to, logged by, or stored on the server.
- The server derives every amount, recipient and refund address from its own record, never from client input.
- Gift notes are rendered as text only.
- Only a gift's own key can release it, and only once. Only the sender can reclaim, and only after expiry.
- The vault owner can pause but cannot move a gift. A failed payout never loses a gift.
- Webhook requests are rejected unless their HMAC signature matches.
- A planned attack suite (replay, wrong key, link tampering, quote tampering, relayer abuse) is listed in `ARCHITECTURE.md`.

## Known issues and open questions

- **Live quote.** A dry quote from USDC (NEAR) to GOOGLon returned `500 Internal server error` from 1Click on 10 Nov 2026. It likely needs a 1Click API key, or the pair is not enabled yet. This is the first thing to resolve.
- **Delivery shape.** The stocks are Ondo tokens held as NEAR Intents balances (`nep141:bnb-0x….omdep.near`), so delivery uses `recipientType: INTENTS`.
- **Payout call.** The vault assumes the Intents contract exposes `mt_transfer` with 1 yoctoNEAR attached. This must be verified on testnet.
- **Eligibility.** Ondo tokenized stocks have regional restrictions (reportedly including the US and Canada). A region gate and clear wording are required before real use.
- **Not a brokerage.** Shares are tokenized assets, not a brokerage account.

## Team and documentation

| Person | Focus |
|---|---|
| Ayush | UI, API fetching and the core flow |
| Sambit | WhatsApp, link sharing and extras |

- [`ARCHITECTURE.md`](./ARCHITECTURE.md): full design, fallbacks, security list, build plan, demo plan
- [`PLAN.md`](./PLAN.md): task list and owners
