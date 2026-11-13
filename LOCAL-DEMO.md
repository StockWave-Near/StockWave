# Run StockWave locally and see the demo

```bash
cd moi
npm install
npm run dev -- -p 3100     # port 3000 is used by another project on this machine
```
Open http://localhost:3100. If styles look stale after a CSS change, stop the server, delete `.next`, start again.

## What works with no extra keys
- Landing page, the three stock cards, the 28-asset catalog, FAQ, footer. Check it at phone width too.
- **Single stock / Basket of stocks** switch, the three baskets and the live split ("Google $6.80 · Apple $6.60 · Tesla $6.60").
- Sign in with NEAR Auth (testnet).
- `/notebook`, and `npm test` (72 tests).

## What needs keys in `.env.local`
| Feature | Needs |
|---|---|
| Price preview, creating a gift or basket (real quote) | `ONECLICK_API_KEY` |
| Deposit address and funding status | same, and a real USDC payment on NEAR |
| Claim on-chain | `STOCKWAVE_VAULT_ACCOUNT`, `NEAR_REGISTRAR_PRIVATE_KEY`, vault funded with testnet NEAR (vault `18c48e5a...` had about 15 NEAR on 13 Nov) |
| Gifts that survive a restart | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (without them gifts live in memory) |
| WhatsApp bot and "you got a gift" message | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`; recipient must join the sandbox first |

## Demo script (about 90 seconds)
1. Landing page, pick Google, show the split-free single gift.
2. Switch to **Basket of stocks**, pick Big Tech Trio, $30, show the split.
3. Sign in, create the link, show the three deposit lines turning to "Funded".
4. Open the link in a private window, sign in, tap **Claim 3 shares**.
5. Show `/notebook` and the WhatsApp bot reply.

## Known limits to say out loud
- Swaps under about $6 get "No liquidity available" from 1Click (checked 13 Nov). Single gifts and each basket stock have a $6 minimum.
- A basket needs one USDC payment per stock until one-tap funding is built.
- Twilio is the sandbox: every recipient must send the join code first.
