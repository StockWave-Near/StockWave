import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { getAllGifts } from "@/lib/store";

// Public notebook: returns all gifts (no private fields).
// Sorted newest-first; capped at 200 entries.
// Never returns depositAddress, claimPublicKey, or recipientPhone.
export async function GET(request: Request) {
  if (!rateLimit(`notebook:${clientIp(request.headers)}`, 30, 60_000)) return tooMany();

  const gifts = await getAllGifts();

  const safe = gifts
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200)
    .map(({ id, stock, usd, note, senderAccount, status, createdAt }) => ({
      id, stock, usd, note, senderAccount, status, createdAt,
    }));

  return Response.json(safe);
}
