# StockWave on NEAR: plan and task list (single source of truth)

Working name "StockWave" will be renamed; see the naming section at the bottom.

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
- [ ] Funding + status polling UI, then show the gift link
- [ ] Claim page `/g/[id]`: read `#k` locally, Google login, claim button, success screen
- [ ] Social login provider that yields an ed25519 key (Web3Auth/Privy, check NEAR support)
- [x] Vault contract `contracts/stockwave-vault` (Rust, near-sdk 5.15.1): register_gift, claim by function-call key, sender reclaim after expiry, pause, token allowlist, failed-payout restore. 14 unit tests pass.
- [ ] Verify vault payout call against the real intents contract on testnet (`mt_transfer` signature is [U]); deploy; delete full-access keys
- [ ] Wire backend: call `register_gift` once a gift is FUNDED (registrar key), `/api/relay` only if the fallback is needed
- [ ] Claim flow in the browser: sign `claim({recipient})` with the link key
- [x] Region gate: `/api/eligible`, US/CA blocked by IP header, `declaredEligible` required by `/api/gift` (451 if blocked)
- [x] Rate limits on quote, gift and WhatsApp share (429) and `Idempotency-Key` on `/api/gift`
- [x] Security test suite started: `npm test` (10 tests: region gate, rate limit, link parsing, bot privacy). Grow toward 40+
- [ ] Error and refund states, mobile check

## Sambit: WhatsApp, link sharing, extras

### WhatsApp bot (simple: onboarding + "who sent me a gift")
- [x] Bot brain `src/lib/whatsapp-bot.ts`: welcome/onboarding, `gifts` (who sent it, which wallet, amount, status), `stocks`, `help`
- [x] Webhook `/api/whatsapp/webhook`: Meta handshake, HMAC signature check, replies via `sendText`
- [x] Gifts can carry an optional `recipientPhone` (`/api/gift`), so the bot can list gifts per number
- [ ] Set up Meta WhatsApp Business app, verify token, app secret, point webhook at `/api/whatsapp/webhook`
- [ ] Persist gifts in a real DB (bot is useless after a restart with the in-memory store)
- [ ] Bot: "link my wallet" (map phone to the NEAR account after Google login) so `gifts` can also match by wallet
- [ ] Bot: send a "you got a gift" template message when a gift is created for a phone number (needs approved template)
- [ ] Note: the bot cannot send the claim key (it only lives in the sender's link), so it points people to that link

- [x] Starter code exists: `src/lib/gift-link.ts`, `src/lib/whatsapp.ts`, `/api/whatsapp/share`. Review and extend.
- [ ] **Share to WhatsApp button** on the gift-created screen: opens `wa.me` link with a ready message (works with no API keys). Also add copy-link and the native share sheet (`navigator.share`).
- [ ] Message copy: short, no jargon ("a share", not "token"), shows sender name, stock, amount
- [ ] **WhatsApp Business Cloud API** (optional, if time): register a Meta app, create and get approval for template `stockwave_gift_link`, wire `sendGiftTemplate`, add `/api/whatsapp/send` (rate limited, phone validation, never log the link)
- [ ] WhatsApp webhook `/api/whatsapp/webhook` (verify token handshake) for delivery status; optional "reply CLAIM" bot
- [ ] Link preview: Open Graph image for `/g/[id]` so WhatsApp shows "You've been given a stock" (do not put the key in the preview; the fragment is never sent anyway)
- [ ] `Referrer-Policy: no-referrer` and checks that the `#k=` key never reaches logs or analytics
- [ ] Notebook contract (`stockwave-notebook`) and public `/notebook` page
- [ ] "Return the favour" re-gift button
- [ ] Attack suite (target 40+): replay claim, wrong key, tampered link, XSS in note, relayer abuse, quote tampering

## Shared / last days

- [ ] Agent CLI (`stockwave send ...`), stretch (AGT track)
- [ ] README, diagram, 90-second demo video, repo public
- [ ] Submit well before 14 Nov 23:59 UTC. Post on X, tag @NEARProtocol and #NEARHackathon

## Cut order if behind
Agent CLI, then return-the-favour, then notebook contract (plain log page), then extra attack tests, then WhatsApp Cloud API (keep wa.me share).

## Naming
- [x] Name chosen: **StockWave** ("Send a share like you send a text"). Renamed across code, docs and contract.
