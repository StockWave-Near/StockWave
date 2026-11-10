# Moi on NEAR: task list

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
- [ ] Create flow UI `/`: stock picker, amount, note, dry-run preview ("you pay X, they get Y")
- [ ] Funding + status polling UI, then show the gift link
- [ ] Claim page `/g/[id]`: read `#k` locally, Google login, claim button, success screen
- [ ] Social login provider that yields an ed25519 key (Web3Auth/Privy, check NEAR support)
- [ ] Claim flow: vault function-call key (section 3b) or escrow + relayer fallback (3c); `/api/relay`
- [ ] Region gate `/api/eligible` + "not a US/Canada person" declaration
- [ ] Error and refund states, mobile check

## Sambit: WhatsApp, link sharing, extras

- [x] Starter code exists: `src/lib/gift-link.ts`, `src/lib/whatsapp.ts`, `/api/whatsapp/share`. Review and extend.
- [ ] **Share to WhatsApp button** on the gift-created screen: opens `wa.me` link with a ready message (works with no API keys). Also add copy-link and the native share sheet (`navigator.share`).
- [ ] Message copy: short, no jargon ("a share", not "token"), shows sender name, stock, amount
- [ ] **WhatsApp Business Cloud API** (optional, if time): register a Meta app, create and get approval for template `moi_gift_link`, wire `sendGiftTemplate`, add `/api/whatsapp/send` (rate limited, phone validation, never log the link)
- [ ] WhatsApp webhook `/api/whatsapp/webhook` (verify token handshake) for delivery status; optional "reply CLAIM" bot
- [ ] Link preview: Open Graph image for `/g/[id]` so WhatsApp shows "You've been given a stock" (do not put the key in the preview; the fragment is never sent anyway)
- [ ] `Referrer-Policy: no-referrer` and checks that the `#k=` key never reaches logs or analytics
- [ ] Notebook contract (`moi-notebook`) and public `/notebook` page
- [ ] "Return the favour" re-gift button
- [ ] Attack suite (target 40+): replay claim, wrong key, tampered link, XSS in note, relayer abuse, quote tampering

## Shared / last days

- [ ] Agent CLI (`moi send ...`), stretch (AGT track)
- [ ] README, diagram, 90-second demo video, repo public
- [ ] Submit well before 14 Nov 23:59 UTC. Post on X, tag @NEARProtocol and #NEARHackathon

## Cut order if behind
Agent CLI, then return-the-favour, then notebook contract (plain log page), then extra attack tests, then WhatsApp Cloud API (keep wa.me share).
