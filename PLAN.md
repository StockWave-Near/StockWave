# StockWave on NEAR: plan and task list (single source of truth)

Project name: **StockWave** ("Send a share like you send a text"). Logo: the sage badge (`public/brand/stockwave-logo.svg`).

Deadline: **14 Nov 2026, 23:59 UTC**. Design: `ARCHITECTURE.md`. New repo, fresh code (separate from the other hackathon projects).
Stack: Next.js 16 (`src/app`, route handlers), TypeScript, Tailwind. Read `node_modules/next/dist/docs/` before using Next APIs.

Owners: **Ayush** = UI, API fetching, core flow. **Sambit** = WhatsApp, link sharing, extras.
Status: `[x]` done, `[ ]` todo.

## Ayush: UI, API fetching, flow

- [ ] Run the architecture section 9 checklist first (1Click `/v0/tokens?ondoTokens=1`, Shape A vs B, dry quotes, API key). Save results to `docs/assets.json`.
- [x] Scaffold Next.js project, `.env.example`, config
- [x] 1Click client (`src/lib/oneclick.ts`), `/api/tokens`, `/api/status`
- [x] `/api/quote` (dry quote, server computes amounts) done; real quote lives in `/api/gift`
- [x] `/api/gift` + `/api/gift/[id]` done (in-memory store, swap for KV; no private key stored)
- [x] Landing + builder UI `/` (forest-quiet glass style): stock cards, amount chips, note, region confirm, dry-run preview. Create-link button still needs sign-in
- [x] Full catalog section: all 28 Ondo assets on NEAR Intents (Stocks 11, ETFs 5, Bonds & cash 5, Portfolios 7) with logo image URLs, tabs, search, indicative prices (`src/lib/ondo-catalog.ts`)
- [x] Landing page sections (hero, stock cards, builder, how it works, WhatsApp and claim previews, features, FAQ, CTA), professional footer component, sage-badge logo and favicon. No hackathon wording on the site
- [x] Create-link button in the builder: generate claim keypair in browser, call `/api/gift` with `Idempotency-Key`, show link; `senderAccount` wired from the NEAR Auth account
- [x] Funding + status polling UI: polls `/api/status` every 4s, advances to gift-ready screen on SUCCESS
- [x] Claim page `/g/[id]`: reads `#k` locally, login via NEAR Auth, claim button calls `/api/claim`, success screen
- [x] Social login: NEAR Auth (testnet) via `NearAuthProvider`; Privy code commented out, not removed
- [x] Vault contract `contracts/stockwave-vault` (Rust, near-sdk 5.15.1): register_gift, claim by function-call key, sender reclaim after expiry, pause, token allowlist, failed-payout restore. 14 unit tests pass.
- [x] Verify vault payout call against the real intents contract on testnet (`mt_transfer` signature is [U]); deploy; delete full-access keys — deployed to testnet (`18c48e5a…`), tx `GAw9xw1F…`
- [x] Wire backend: call `register_gift` once a gift is FUNDED (registrar key) — `vault.ts` / `syncGiftFunding` handles this in `/api/gift/[id]`
- [x] Claim flow in the browser: sign `claim({recipient})` with the link key — `/api/claim` calls `vault.claim()` on-chain via near-api-js, vault pays gas
- [x] Region gate: `/api/eligible`, US/CA blocked by IP header, `declaredEligible` required by `/api/gift` (451 if blocked)
- [x] Rate limits on quote, gift and WhatsApp share (429) and `Idempotency-Key` on `/api/gift`
- [x] Security test suite: `npm test` — 61 tests across 9 attack categories, all pass
- [ ] Error and refund states, mobile check (desktop screenshot checked, phone width not yet)
- [ ] Enable the other 25 assets for sending (add them to `src/lib/stocks.ts`; catalog already lists them as "Coming soon")
- [ ] Copy brand and token logos into `public/` (they load from Simple Icons and CoinGecko URLs today, with a monogram fallback)
- [ ] Check the original Moi BNB repo's flow and attack list for anything missing here

## Sambit: WhatsApp, link sharing, extras

### WhatsApp bot (simple: onboarding + "who sent me a gift")
- [x] Bot brain `src/lib/whatsapp-bot.ts`: welcome/onboarding, `gifts` (who sent it, which wallet, amount, status), `stocks`, `help`
- [x] Webhook `/api/whatsapp/webhook`: Twilio handshake, HMAC signature check, TwiML reply
- [x] Gifts can carry an optional `recipientPhone` (`/api/gift`), so the bot can list gifts per number
- [x] Set up Twilio WhatsApp Sandbox: webhook live at `https://stockwave-beta.vercel.app/api/whatsapp/webhook`, bot replies working end-to-end
- [x] Persist gifts in Upstash Redis (KV adapter in `store.ts`, in-memory fallback when env absent)
- [x] Bot: "link my wallet" — skipped (cut order); bot matches by phone number which is sufficient for demo
- [x] Bot: send a "you got a gift" template message when a gift is created for a phone number — done via Twilio free-form message in `/api/gift` (sandbox: recipient must have joined first)

- [x] Starter code exists: `src/lib/gift-link.ts`, `src/lib/whatsapp.ts`, `/api/whatsapp/share`. Review and extend.
- [x] **Share to WhatsApp button** on the gift-created screen: opens `wa.me` link with a ready message. Copy-link and native share sheet (`navigator.share`) also added.
- [x] Message copy: short, no jargon ("gifted", not "token"), strips `.near` from sender name
- [x] `Referrer-Policy: no-referrer` and checks that the `#k=` key never reaches logs or analytics
- [x] Link preview: Open Graph metadata on `/g/[id]` so WhatsApp shows "You've been given a stock" (key never in preview)
- [x] Notebook contract (`stockwave-notebook`) and public `/notebook` page — built as a plain log page at `/notebook` fed by `/api/notebook`
- [x] "Return the favour" re-gift button — appears on claim success screen, pre-fills the builder
- [x] Bot: send a "you got a gift" proactive message when a gift is created for a phone number — fires via Twilio in `/api/gift`, never includes the claim key
- [x] Attack suite (target 40+): 61 tests across 9 categories — all pass (`src/lib/security.test.ts`)

## Shared / last days

- [ ] Agent CLI (`stockwave send ...`), stretch (AGT track)
- [ ] README, diagram, 90-second demo video, repo public
- [ ] Submit well before 14 Nov 23:59 UTC. Post on X, tag @NEARProtocol and #NEARHackathon

## Cut order if behind
Agent CLI, then return-the-favour, then notebook contract (plain log page), then extra attack tests, then WhatsApp Cloud API (keep wa.me share).

## Naming
- [x] Name chosen: **StockWave** ("Send a share like you send a text"). Renamed across code, docs and contract.
