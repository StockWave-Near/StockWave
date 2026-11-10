# StockWave on NEAR

**Send a share like you send a text.**

Give a friend their first stock as a link. They sign in with Google, own a real tokenized share (Google, Apple, Tesla and more), and never see a wallet, seed phrase or gas fee.

Built for the NEAR Hackathon (development ends 14 Nov 2026, 23:59 UTC). Tracks: Real-World Money, Social Money, Open Innovation. Stretch: Agent Economy.

> Design idea comes from the author's earlier BNB Hack entry. All code in this repo is new and written for NEAR.

## How it works

```
 SENDER                                             FRIEND
 pick stock + amount ──► dry quote (no signing)
 pay USDC (any chain) ─► NEAR Intents 1Click ──► share lands in the StockWave vault (Intents balance)
 browser makes claim keypair; only the PUBLIC key goes to the server
 link = /g/<id>#k=<private key>   (fragment is never sent to any server)
 share link on WhatsApp / copy / native share
                                                    open link ► Google login ► Claim
                                                    link key calls vault.claim(recipient), vault pays gas
                                                    share is in the friend's account
```

Why NEAR:
1. **NEAR Intents (1Click)** is the payment and delivery rail: pay from any chain, receive an Ondo tokenized stock.
2. **Account from Google login**: the friend gets a real NEAR account with no wallet install.
3. **Function-call access keys**: the gift link carries a key that can only call `claim` on the vault, for that one gift. This is what makes the link non-custodial and gasless.
4. **Vault pays gas** (NEP-366 meta-transactions as fallback).
5. **Notebook contract** on NEAR records each gift so it can be returned one day ("return the favour", from the Tamil wedding-notebook custom).

## What is done

| Area | Status |
|---|---|
| Next.js 16 project, config, `.env.example` | done |
| 1Click client: tokens, quote, status, deposit submit (`src/lib/oneclick.ts`) | done |
| Stock config: GOOGL, AAPL, TSLA with real asset ids (`src/lib/stocks.ts`) | done |
| `GET /api/tokens` | done |
| `GET /api/status?depositAddress=` | done |
| `POST /api/quote` dry quote, server computes amounts, $2 to $100 | done, not yet working live (see below) |
| `POST /api/gift` real quote, returns deposit address, stores public key only | done |
| `GET /api/gift/[id]` public gift info and funding status | done |
| Gift link builder and parser, key kept in `#k=` fragment (`src/lib/gift-link.ts`) | done |
| WhatsApp share link builder `wa.me` and `POST /api/whatsapp/share` | done |
| WhatsApp Business Cloud API template sender (`sendGiftTemplate`) | code written, needs Meta setup |
| Vault contract (Rust): register, claim by link key, reclaim, pause, allowlist; 14 unit tests passing | done, testnet deploy pending |
| Architecture doc and task list (`ARCHITECTURE.md`, `PLAN.md`) | done |

## What is not done

- UI (create page, claim page): intentionally left for later.
- Claim flow in the browser, backend call to `register_gift`, Google login provider that yields a NEAR key.
- Vault testnet deploy and a check of the Intents `mt_transfer` payout call.
- Notebook contract and `/notebook` page, "Return the favour".
- Region gate and eligibility declaration (Ondo restrictions).
- Real database: gifts are in memory and vanish on restart (`src/lib/store.ts`).
- Rate limits, idempotency, attack test suite, agent CLI.

## Known issue

A dry quote USDC (NEAR) to GOOGLon returned `500 Internal server error` from 1Click on 10 Nov. Likely needs a 1Click API key (partners.near-intents.org) or the pair is not enabled yet. Check this first.

The stocks are `nep141:bnb-0x….omdep.near` assets: Ondo tokens held as NEAR Intents balances, so delivery uses `recipientType: INTENTS`.

## API

| Route | Body / query | Returns |
|---|---|---|
| `GET /api/tokens` | none | 1Click token list |
| `POST /api/quote` | `{ stock: "GOOGL"\|"AAPL"\|"TSLA", usd }` | dry quote |
| `POST /api/gift` | `{ stock, usd, note?, senderAccount, claimPublicKey }` | `{ id, depositAddress, quote }` |
| `GET /api/gift/[id]` | none | `{ id, stock, name, usd, note, status }` |
| `GET /api/status` | `?depositAddress=` | 1Click swap status |
| `POST /api/whatsapp/share` | `{ link, senderName?, stock?, usd?, phone? }` | `{ url }` for `wa.me` |

## Run it

```bash
cp .env.example .env.local   # fill ONECLICK_API_KEY, STOCKWAVE_VAULT_ACCOUNT, NEXT_PUBLIC_APP_URL
npm install
npm run dev
```

## Security rules

- The claim private key lives only in the URL fragment. Never log it or store it.
- The server re-derives every amount and recipient from its own record, never from the client.
- Notes are rendered as text only.
- Owner can pause the vault but cannot move a gift.

## Docs

- `ARCHITECTURE.md`: full design, fallbacks, security list, build plan, demo plan.
- `PLAN.md`: who does what (Ayush: UI, API fetching, flow. Sambit: WhatsApp, link sharing, extras).
